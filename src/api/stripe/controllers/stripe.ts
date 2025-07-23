import { Context } from 'koa';
import { stripe, stripeConfig } from '../../../../config/stripe';

export default {
  /**
   * Crear sesión de checkout
   */
  async createCheckoutSession(ctx: Context) {
    try {
      const { items, customerEmail, successUrl, cancelUrl, metadata } = ctx.request.body;
      
      console.log('[Stripe Controller] Items recibidos:', items);
      console.log('[Stripe Controller] Metadata recibida:', metadata);
      
      // Extraer direcciones del metadata
      let shippingAddress = null;
      let billingAddress = null;
      
      if (metadata?.shipping_address) {
        try {
          shippingAddress = JSON.parse(metadata.shipping_address);
          console.log('[Stripe Controller] Shipping address:', shippingAddress);
        } catch (error) {
          console.error('[Stripe Controller] Error parsing shipping address:', error);
        }
      }
      
      if (metadata?.billing_address) {
        try {
          billingAddress = JSON.parse(metadata.billing_address);
          console.log('[Stripe Controller] Billing address:', billingAddress);
        } catch (error) {
          console.error('[Stripe Controller] Error parsing billing address:', error);
        }
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return ctx.badRequest('Items are required and must be an array');
      }

      if (!customerEmail) {
        return ctx.badRequest('Customer email is required');
      }

      if (!successUrl || !cancelUrl) {
        return ctx.badRequest('Success and cancel URLs are required');
      }

            // Crear o buscar cliente en Stripe
      let customer;
      try {
        // Buscar cliente existente por email
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1,
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          console.log('[Stripe Controller] Cliente existente encontrado:', customer.id);
        } else {
          // Crear nuevo cliente
          customer = await stripe.customers.create({
            email: customerEmail,
            name: shippingAddress ? `${shippingAddress.firstName} ${shippingAddress.lastName}` : undefined,
            phone: shippingAddress?.phone,
            address: shippingAddress ? {
              line1: shippingAddress.addressLine1,
              line2: shippingAddress.addressLine2 || undefined,
              city: shippingAddress.city,
              state: shippingAddress.state || undefined,
              postal_code: shippingAddress.postalCode,
              country: shippingAddress.country,
            } : undefined,
            shipping: shippingAddress ? {
              name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
              address: {
                line1: shippingAddress.addressLine1,
                line2: shippingAddress.addressLine2 || undefined,
                city: shippingAddress.city,
                state: shippingAddress.state || undefined,
                postal_code: shippingAddress.postalCode,
                country: shippingAddress.country,
              },
            } : undefined,
            metadata: {
              user_id: metadata?.user_id || '',
              source: 'strapi-ecommerce',
            },
          });
          console.log('[Stripe Controller] Nuevo cliente creado:', customer.id);
        }
      } catch (error) {
        console.error('[Stripe Controller] Error creando/buscando cliente:', error);
        // Continuar sin cliente si hay error
      }

      // Validar y reservar stock para todos los items
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const validatedItems = [];
      const reservationIds = [];

      for (const item of items) {
        console.log(`[Stripe Controller] Validando item:`, item);
        
        // Validar producto usando el servicio
        const validation = await strapi.service('api::product.product').validateProduct(
          item.productId || item.id,
          item.variantId,
          item.quantity
        );

        if (!validation.isValid) {
          return ctx.badRequest(`Error en producto: ${validation.error}`);
        }

        // Reservar stock
        const reservation = await strapi.service('api::product.product').reserveStock(
          item.productId || item.id,
          item.variantId || null,
          item.quantity,
          sessionId,
          metadata?.user_id
        );

        if (!reservation.success) {
          return ctx.badRequest(`Error reservando stock: ${reservation.error}`);
        }

        reservationIds.push(reservation.reservationId);
        
        // Agregar item validado con datos reales
        validatedItems.push({
          ...item,
          name: validation.product.title,
          price: validation.price,
          image: validation.product.image?.url || validation.product.thumbnail?.url,
          description: validation.product.description,
          productId: validation.product.documentId,
          variantId: validation.variant?.documentId,
          reservationId: reservation.reservationId
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: validatedItems.map((item: any) => {
          const productName = item.name;
          const productImage = item.image;
          const productDescription = item.description;
          
          // Verificar si la imagen es accesible públicamente
          let finalImage = productImage;
          if (productImage && productImage.includes('127.0.0.1:1337')) {
            console.log(`[Stripe Controller] Imagen local detectada: ${productImage}`);
            finalImage = undefined;
          }
          
          console.log(`[Stripe Controller] Creando line item para:`, {
            name: productName,
            image: finalImage,
            description: productDescription,
            price: item.price,
            quantity: item.quantity
          });
          
          return {
            price_data: {
              currency: stripeConfig.currency,
              product_data: {
                name: productName,
                images: finalImage ? [finalImage] : undefined,
                description: productDescription || undefined,
              },
              unit_amount: Math.round(item.price * 100), // Convertir a centavos
            },
            quantity: item.quantity,
          };
        }),
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customer?.id, // Usar el cliente creado
        customer_email: customer ? undefined : customerEmail, // Solo usar email si no hay cliente
        metadata: {
          ...metadata,
          reservation_ids: JSON.stringify(reservationIds),
          validated_items: JSON.stringify(validatedItems),
          session_id: sessionId
        },
        allow_promotion_codes: true,
        // Configurar recolección de direcciones
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'ES', 'DE', 'FR', 'IT', 'AR'],
        },
        // No crear cliente automáticamente ya que lo creamos manualmente
        customer_creation: customer ? undefined : 'always',
      });

      ctx.body = {
        success: true,
        session: {
          id: session.id,
          url: session.url,
          amount_total: session.amount_total,
          currency: session.currency,
          status: session.status,
          payment_status: session.payment_status,
          customer_email: session.customer_email,
          metadata: session.metadata,
        },
      };
    } catch (error) {
      console.error('Error in createCheckoutSession:', error);
      ctx.throw(500, 'Failed to create checkout session');
    }
  },

  /**
   * Crear Payment Intent
   */
  async createPaymentIntent(ctx: Context) {
    try {
      const { amount, currency, customerEmail, metadata } = ctx.request.body;

      if (!amount || amount <= 0) {
        return ctx.badRequest('Valid amount is required');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir a centavos
        currency: currency || stripeConfig.currency,
        metadata: metadata || {},
        receipt_email: customerEmail,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      ctx.body = {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        },
      };
    } catch (error) {
      console.error('Error in createPaymentIntent:', error);
      ctx.throw(500, 'Failed to create payment intent');
    }
  },

  /**
   * Recuperar sesión de checkout
   */
  async retrieveCheckoutSession(ctx: Context) {
    try {
      const { sessionId } = ctx.params;

      if (!sessionId) {
        return ctx.badRequest('Session ID is required');
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer'],
      });

      ctx.body = {
        success: true,
        session: {
          id: session.id,
          url: session.url,
          amount_total: session.amount_total,
          currency: session.currency,
          status: session.status,
          payment_status: session.payment_status,
          customer_email: session.customer_email,
          metadata: session.metadata,
        },
      };
    } catch (error) {
      console.error('Error in retrieveCheckoutSession:', error);
      ctx.throw(500, 'Failed to retrieve checkout session');
    }
  },

  /**
   * Recuperar Payment Intent
   */
  async retrievePaymentIntent(ctx: Context) {
    try {
      const { paymentIntentId } = ctx.params;

      if (!paymentIntentId) {
        return ctx.badRequest('Payment Intent ID is required');
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      ctx.body = {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        },
      };
    } catch (error) {
      console.error('Error in retrievePaymentIntent:', error);
      ctx.throw(500, 'Failed to retrieve payment intent');
    }
  },

  /**
   * Crear cliente
   */
  async createCustomer(ctx: Context) {
    try {
      const { email, name } = ctx.request.body;

      if (!email) {
        return ctx.badRequest('Email is required');
      }

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'strapi-ecommerce',
        },
      });

      ctx.body = {
        success: true,
        customer,
      };
    } catch (error) {
      console.error('Error in createCustomer:', error);
      ctx.throw(500, 'Failed to create customer');
    }
  },

  /**
   * Crear reembolso
   */
  async createRefund(ctx: Context) {
    try {
      const { paymentIntentId, amount, reason } = ctx.request.body;

      if (!paymentIntentId) {
        return ctx.badRequest('Payment Intent ID is required');
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as any,
      });

      ctx.body = {
        success: true,
        refund,
      };
    } catch (error) {
      console.error('Error in createRefund:', error);
      ctx.throw(500, 'Failed to create refund');
    }
  },

  /**
   * Webhook de Stripe
   */
  async webhook(ctx: Context) {
    try {
      const signature = ctx.request.headers['stripe-signature'] as string;
      const payload = ctx.request.body;

      if (!signature) {
        return ctx.badRequest('Stripe signature is required');
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeConfig.webhookSecret
      );

      // Manejar diferentes tipos de eventos
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      ctx.body = { received: true };
    } catch (error) {
      console.error('Error in webhook:', error);
      ctx.throw(400, 'Webhook error');
    }
  },

  // Funciones auxiliares para manejar eventos de webhook
  async handleCheckoutSessionCompleted(session: any) {
    console.log('Checkout session completed:', session.id);
    // Aquí puedes actualizar el estado de la orden en tu base de datos
  },

  async handlePaymentIntentSucceeded(paymentIntent: any) {
    console.log('Payment intent succeeded:', paymentIntent.id);
    // Aquí puedes actualizar el estado del pago en tu base de datos
  },

  async handlePaymentIntentFailed(paymentIntent: any) {
    console.log('Payment intent failed:', paymentIntent.id);
    // Aquí puedes manejar el pago fallido
  },

  async handleInvoicePaymentSucceeded(invoice: any) {
    console.log('Invoice payment succeeded:', invoice.id);
    // Para suscripciones
  },

  async handleInvoicePaymentFailed(invoice: any) {
    console.log('Invoice payment failed:', invoice.id);
    // Para suscripciones
  },
}; 