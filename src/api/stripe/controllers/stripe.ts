import { Context } from 'koa';
import { stripe, stripeConfig } from '../../../../config/stripe';

export default {
  /**
   * Crear sesión de checkout
   */
  async createCheckoutSession(ctx: Context) {
    try {
      const { items, customerEmail, successUrl, cancelUrl, metadata } = ctx.request.body as any;
      
      // Extraer direcciones del metadata
      let shippingAddress = null;
      let billingAddress = null;
      
      if (metadata?.shipping_address) {
        try {
          shippingAddress = JSON.parse(metadata.shipping_address);
        } catch (error) {
          console.error('[Stripe Controller] Error parsing shipping address:', error);
        }
      }
      
      if (metadata?.billing_address) {
        try {
          billingAddress = JSON.parse(metadata.billing_address);
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
          let finalImage = undefined;
          if (productImage) {
            // Solo usar imágenes que sean URLs públicas accesibles
            if (productImage.startsWith('http') && 
                !productImage.includes('localhost') && 
                !productImage.includes('127.0.0.1') &&
                !productImage.includes('192.168.') &&
                !productImage.includes('10.') &&
                !productImage.includes('172.')) {
              finalImage = productImage;
            } else {
              // console.log(`[Stripe Controller] Imagen local detectada, omitiendo: ${productImage}`);
            }
          }
          
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
          // Simplificar validated_items para evitar exceder el límite de 500 caracteres
          items_count: validatedItems.length.toString(),
          session_id: sessionId,
          // Solo incluir información esencial de los items
          items_summary: validatedItems.map(item => ({
            id: item.productId,
            qty: item.quantity,
            price: item.price
          })).map(item => `${item.id}:${item.qty}`).join(',')
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
      const { amount, currency, customerEmail, metadata } = ctx.request.body as any;

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
      const { email, name } = ctx.request.body as any;

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
      const { paymentIntentId, amount, reason } = ctx.request.body as any;

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
      const payload = ctx.request.body as any;

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
          // Evento no manejado
          break;
      }

      ctx.body = { received: true };
    } catch (error) {
      console.error('❌ [WEBHOOK] Error in webhook:', error);
      console.error('❌ [WEBHOOK] Error stack:', error.stack);
      ctx.throw(400, 'Webhook error');
    }
  },

  // Funciones auxiliares para manejar eventos de webhook
  async handleCheckoutSessionCompleted(session: any) {
    try {
      // Extraer datos de la sesión
      const metadata = session.metadata;
      const customerEmail = session.customer_email;
      const amountTotal = session.amount_total;
      const currency = session.currency;
      const paymentStatus = session.payment_status;
      const sessionId = metadata?.session_id;

      // Parsear direcciones del metadata
      let shippingAddress = null;
      let billingAddress = null;
      let userId = null;

      if (metadata?.shipping_address) {
        try {
          shippingAddress = JSON.parse(metadata.shipping_address);
        } catch (error) {
          console.error('Error parsing shipping address:', error);
        }
      }

      if (metadata?.billing_address) {
        try {
          billingAddress = JSON.parse(metadata.billing_address);
        } catch (error) {
          console.error('Error parsing billing address:', error);
        }
      }

      if (metadata?.user_id) {
        userId = metadata.user_id;
      }

      // Buscar o crear usuario
      let user = null;
      if (userId) {
        try {
          user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
        } catch (error) {
          console.error('Error finding user:', error);
        }
      }

      if (!user && customerEmail) {
        try {
          const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
            filters: { email: customerEmail },
            limit: 1
          });
          if (users.length > 0) {
            user = users[0];
          }
        } catch (error) {
          console.error('Error finding user by email:', error);
        }
      }

      // Crear la orden
      const order = await strapi.service('api::order.order').createOrder({
        orderNumber: `ORD-${Date.now()}`,
        total: session.amount_total / 100,
        currency: session.currency,
        orderStatus: 'pending',
        paymentStatus: 'pending',
        user: user ? user.id : null,
        shipping: shippingAddress,
        billing: billingAddress
      });

      // Crear el payment usando el servicio unificado
      const payment = await strapi.service('api::payment.payment').createPaymentWithStripeData(
        session,
        order.id,
        user ? user.id : null
      );

      // Crear order_items basado en los metadatos
      if (metadata?.items_summary) {
        try {
          const itemsSummary = metadata.items_summary;
          
          const items = itemsSummary.split(',').map(item => {
            const [productId, qty] = item.split(':');
            return { productId, quantity: parseInt(qty) };
          });

          // Procesar cada item individualmente usando el índice del lineItems de Stripe
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const stripeItem = session.line_items?.data?.[i];
            
            // Buscar el producto por documentId primero, luego por id
            let product = null;
            
            try {
              // Intentar buscar por documentId usando query raw
              const productsByDocumentId = await strapi.db.query('api::product.product').findMany({
                where: { documentId: item.productId },
                limit: 1
              });
              
              if (productsByDocumentId.length > 0) {
                product = productsByDocumentId[0];
              } else {
                // Si no se encuentra por documentId, intentar por id
                product = await strapi.entityService.findOne('api::product.product', item.productId);
              }
            } catch (error) {
              console.error(`Error finding product ${item.productId}:`, error);
            }
           
            if (product) {
              // Mejorar la lógica de obtención de imagen
              let productImage = null;
              if (product.Media && product.Media.url) {
                productImage = product.Media.url;
              } else if (product.thumbnail && product.thumbnail.url) {
                productImage = product.thumbnail.url;
              } else if (product.image && product.image.url) {
                productImage = product.image.url;
              } else if (product.photos && product.photos.length > 0 && product.photos[0].url) {
                productImage = product.photos[0].url;
              } else if (product.images && product.images.length > 0 && product.images[0].url) {
                productImage = product.images[0].url;
              }
              
              // Normalizar la URL de la imagen si es local
              if (productImage && productImage.startsWith('/uploads/')) {
                productImage = `http://localhost:1337${productImage}`;
              }
              
              const orderItemData: any = {
                data: {
                  name: product.title || product.name || `Producto ${product.id}`,
                  quantity: item.quantity,
                  unitPrice: stripeItem?.amount_total ? stripeItem.amount_total / 100 : 0,
                  totalPrice: stripeItem?.amount_total ? (stripeItem.amount_total / 100) * item.quantity : 0,
                  image: productImage,
                  product: product.id,
                  order: order.id
                }
              };

              await strapi.entityService.create('api::order-item.order-item', orderItemData);
            }
          }
        } catch (error) {
          console.error('Error processing items summary:', error);
        }
      }

      return order;
    } catch (error) {
      console.error('Error processing checkout session:', error);
      throw error;
    }
  },

  async handlePaymentIntentSucceeded(paymentIntent: any) {
    try {
      // Procesar pago exitoso
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await strapi.service('api::order.order').updateOrderStatus(orderId, 'confirmed');
        await strapi.service('api::payment.payment').updatePaymentStatus(orderId, 'completed');
      }
    } catch (error) {
      console.error('Error handling payment intent succeeded:', error);
    }
  },

  async handlePaymentIntentFailed(paymentIntent: any) {
    try {
      // Procesar pago fallido
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await strapi.service('api::order.order').updateOrderStatus(orderId, 'failed');
        await strapi.service('api::payment.payment').updatePaymentStatus(orderId, 'failed');
      }
    } catch (error) {
      console.error('Error handling payment intent failed:', error);
    }
  },

  async handleInvoicePaymentSucceeded(invoice: any) {
    try {
      // Procesar factura pagada
      const orderId = invoice.metadata?.orderId;
      if (orderId) {
        await strapi.service('api::order.order').updateOrderStatus(orderId, 'confirmed');
      }
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
    }
  },

  async handleInvoicePaymentFailed(invoice: any) {
    try {
      // Procesar factura fallida
      const orderId = invoice.metadata?.orderId;
      if (orderId) {
        await strapi.service('api::order.order').updateOrderStatus(orderId, 'failed');
      }
    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
    }
  },
}; 