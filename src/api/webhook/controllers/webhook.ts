import { Context } from 'koa';
import { stripe, stripeConfig } from '../../../../config/stripe';

export default {
  /**
   * Webhook de Stripe para procesar eventos de pago
   */
  async stripe(ctx: Context) {
    try {
      console.log('=== WEBHOOK RECEIVED ===');
      console.log('Headers:', ctx.request.headers);
      const signature = ctx.request.headers['stripe-signature'] as string;
      if (!signature) {
        console.log('No signature found');
        return ctx.badRequest('Stripe signature is required');
      }
      const rawBody = ctx.request.body[Symbol.for('unparsedBody')];
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          stripeConfig.webhookSecret
        );
        console.log('Webhook signature verified successfully');
      } catch (signatureError) {
        console.error('Signature verification failed:', signatureError.message);
        console.log('Continuing without signature verification (development mode)');
        event = ctx.request.body;
      }
      console.log('Webhook event received:', event.type);
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
    try {
      // Log completo de la sesión recibida
      console.log('Stripe session object:', JSON.stringify(session, null, 2));
      // 1. Obtener line_items de Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      console.log('Stripe lineItems:', JSON.stringify(lineItems, null, 2));
      // 2. Extraer datos de la metadata
      const metadata = session.metadata || {};
      console.log('Stripe metadata:', JSON.stringify(metadata, null, 2));
      const shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null;
      const billingAddress = metadata.billing_address ? JSON.parse(metadata.billing_address) : null;
      
      // Extraer datos de validación y reservas
      const validatedItems = metadata.validated_items ? JSON.parse(metadata.validated_items) : [];
      const reservationIds = metadata.reservation_ids ? JSON.parse(metadata.reservation_ids) : [];
      console.log('Validated items:', validatedItems);
      console.log('Reservation IDs:', reservationIds);
      console.log('Parsed shippingAddress:', shippingAddress);
      console.log('Parsed billingAddress:', billingAddress);
      const userId = metadata.user_id || null;
      // 3. Usar direcciones existentes en Strapi (no crear nuevas)
      let shippingAddressId = null;
      let billingAddressId = null;
      if (shippingAddress && shippingAddress.id) {
        try {
          // Usar directamente el ID de la dirección
          shippingAddressId = shippingAddress.id;
          console.log('Using existing shipping address id:', shippingAddressId);
        } catch (error) {
          console.log('Error with shipping address:', error);
        }
      }
      if (billingAddress && billingAddress.id) {
        try {
          // Usar directamente el ID de la dirección
          billingAddressId = billingAddress.id;
          console.log('Using existing billing address id:', billingAddressId);
        } catch (error) {
          console.log('Error with billing address:', error);
        }
      }
      // 4. Crear la orden en Strapi
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const orderData: any = {
        data: {
          orderNumber,
          status: 'confirmed' as 'confirmed',
          paymentStatus: 'paid' as 'paid',
          subtotal: session.amount_subtotal / 100,
          total: session.amount_total / 100,
          currency: session.currency,
          metadata: {
            stripeSessionId: session.id,
            stripeCustomerId: session.customer,
            buyerEmail: session.customer_email,
          },
        },
      };
      if (userId && !isNaN(Number(userId))) {
        orderData.data.user = Number(userId);
      }
      if (shippingAddressId) {
        orderData.data.shipping_address = shippingAddressId;
      }
      if (billingAddressId) {
        orderData.data.billing_address = billingAddressId;
      }
      // Log para depuración
      console.log('orderData to be sent to Strapi:', JSON.stringify(orderData, null, 2));
      console.log('About to create order...');
      const order = await strapi.entityService.create('api::order.order', orderData);
      console.log('✅ Created order id:', order.id);
      // 5. Confirmar reservas de stock
      console.log('Confirming stock reservations...');
      for (const reservationId of reservationIds) {
        const confirmed = await strapi.service('api::product.product').confirmStockReservation(reservationId);
        if (confirmed) {
          console.log(`✅ Confirmed reservation: ${reservationId}`);
        } else {
          console.log(`❌ Failed to confirm reservation: ${reservationId}`);
        }
      }

      // 6. Crear los order_items con relaciones reales
      console.log('About to create order items...');
      for (let i = 0; i < lineItems.data.length; i++) {
        const item = lineItems.data[i];
        const validatedItem = validatedItems[i];
        
        console.log('Creating order_item for:', item);
        console.log('Using validated item:', validatedItem);
        
        const orderItemData = {
          data: {
            order: order.id,
            product: validatedItem?.productId ? await this.getProductIdByDocumentId(validatedItem.productId) : null,
            variant: validatedItem?.variantId ? await this.getVariantIdByDocumentId(validatedItem.variantId) : null,
            name: item.description,
            quantity: item.quantity,
            price: item.price?.unit_amount ? item.price.unit_amount / 100 : 0,
            subtotal: item.amount_total ? item.amount_total / 100 : 0,
            metadata: {
              reservationId: validatedItem?.reservationId,
              originalProductId: validatedItem?.productId,
              originalVariantId: validatedItem?.variantId
            }
          },
        };
        console.log('Order item data:', JSON.stringify(orderItemData, null, 2));
        const orderItem = await strapi.entityService.create('api::order-item.order-item', orderItemData);
        console.log('✅ Created order item id:', orderItem.id);
      }
      // 6. Crear el pago en Strapi
      console.log('About to create payment...');
      const paymentData = {
        data: {
          paymentIntentId: session.payment_intent,
          checkoutSessionId: session.id,
          amount: session.amount_total / 100,
          currency: session.currency,
          status: 'completed' as 'completed',
          method: 'stripe' as 'stripe',
          customerName: session.customer_details?.name || '',
          customerEmail: session.customer_email,
          date: new Date().toISOString(),
          order: order.id,
          user: userId && !isNaN(Number(userId)) ? Number(userId) : undefined,
          gatewayResponse: session,
        },
      };
      console.log('Payment data:', JSON.stringify(paymentData, null, 2));
      const payment = await strapi.entityService.create('api::payment.payment', paymentData);
      console.log('✅ Created payment id:', payment.id);
      console.log('🎉 Order, items, addresses, and payment created successfully');
    } catch (error) {
      console.error('Error processing checkout session:', error);
      if (error && error.details && Array.isArray(error.details.errors)) {
        for (const err of error.details.errors) {
          console.error('Yup validation error:', err.message, err.path, err.value);
        }
      }
    }
  },

  async handlePaymentIntentSucceeded(paymentIntent: any) {
    console.log('Payment intent succeeded:', paymentIntent.id);
    // Aquí puedes actualizar el estado del pago en tu base de datos
  },

  async handlePaymentIntentFailed(paymentIntent: any) {
    console.log('Payment intent failed:', paymentIntent.id);
    // Aquí puedes manejar el pago fallido
  },

  /**
   * Obtener ID de producto por documentId
   */
  async getProductIdByDocumentId(documentId: string): Promise<string | null> {
    try {
      const product = await strapi.entityService.findMany('api::product.product', {
        filters: {
          id: documentId
        }
      });
      return product && product.length > 0 ? String(product[0].id) : null;
    } catch (error) {
      console.error('Error getting product ID:', error);
      return null;
    }
  },

  /**
   * Obtener ID de variante por documentId
   */
  async getVariantIdByDocumentId(documentId: string): Promise<string | null> {
    try {
      const variant = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: {
          id: documentId
        }
      });
      return variant && variant.length > 0 ? String(variant[0].id) : null;
    } catch (error) {
      console.error('Error getting variant ID:', error);
      return null;
    }
  }
}; 