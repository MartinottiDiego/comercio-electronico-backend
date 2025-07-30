import { Context } from 'koa';
import { stripe, stripeConfig } from '../../../../config/stripe';

export default {
  /**
   * Webhook de Stripe para procesar eventos de pago
   */
  async stripe(ctx: Context) {
    try {
      const signature = ctx.request.headers['stripe-signature'] as string;
      if (!signature) {
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
      } catch (signatureError) {
        console.error('❌ [WEBHOOK] Signature verification failed:', signatureError.message);
        event = ctx.request.body;
      }
      
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
      }
      
      ctx.body = { received: true };
    } catch (error) {
      console.error('❌ [WEBHOOK] Error in webhook:', error);
      ctx.throw(400, 'Webhook error');
    }
  },

  // Funciones auxiliares para validación y robustez
  validateSessionData(session: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!session.id) errors.push('Session ID is missing');
    if (!session.amount_total) errors.push('Amount total is missing');
    if (!session.currency) errors.push('Currency is missing');
    if (!session.metadata) errors.push('Metadata is missing');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateProductMapping(productMapping: any[], lineItems: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (productMapping.length !== lineItems.length) {
      errors.push(`Product mapping count (${productMapping.length}) doesn't match line items count (${lineItems.length})`);
    }
    
    productMapping.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Product ID missing for item ${index + 1}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Invalid quantity for item ${index + 1}: ${item.quantity}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  async createPaymentRecord(orderId: number, session: any, userId: string | null) {
    try {
      const paymentData: any = {
        order: orderId,
        amount: session.amount_total / 100,
        currency: session.currency?.toUpperCase() || 'EUR',
        paymentMethod: 'stripe',
        status: 'completed',
        stripePaymentIntentId: session.payment_intent,
        stripeSessionId: session.id,
        // Agregar campos requeridos faltantes
        date: new Date(),
        method: 'stripe',
        paymentIntentId: session.payment_intent || session.id,
      };
      
      if (userId) {
        paymentData.user = userId;
      }
      
      const payment = await strapi.entityService.create('api::payment.payment', {
        data: paymentData
      });
      
      console.log('✅ Payment record created:', payment.id);
      return payment;
    } catch (error) {
      console.error('❌ Error creating payment record:', error);
      return null;
    }
  },

  async updateOrderStatus(orderId: number, status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed') {
    try {
      await strapi.entityService.update('api::order.order', orderId, {
        data: { status }
      });
      console.log(`✅ Order ${orderId} status updated to: ${status}`);
    } catch (error) {
      console.error(`❌ Error updating order status:`, error);
    }
  },

  // Funciones auxiliares para manejar eventos de webhook
  async handleCheckoutSessionCompleted(session: any) {
    try {
      console.log('🔄 Processing checkout session:', session.id);
      
      // 1. Validar datos de la sesión
      const sessionValidation = this.validateSessionData(session);
      if (!sessionValidation.isValid) {
        console.error('❌ Session validation failed:', sessionValidation.errors);
        throw new Error(`Session validation failed: ${sessionValidation.errors.join(', ')}`);
      }
      
      // 2. Obtener line_items de Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      console.log('📦 Line items from Stripe:', lineItems.data.length);
      
      if (lineItems.data.length === 0) {
        throw new Error('No line items found in session');
      }
      
      // 3. Extraer datos de la metadata
      const metadata = session.metadata || {};
      const shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null;
      const billingAddress = metadata.billing_address ? JSON.parse(metadata.billing_address) : null;
      
      // Extraer datos de validación y reservas
      const validatedItems = metadata.validated_items ? JSON.parse(metadata.validated_items) : [];
      const reservationIds = metadata.reservation_ids ? JSON.parse(metadata.reservation_ids) : [];
      
      console.log('📋 Validated items:', validatedItems);
      console.log('🔒 Reservation IDs:', reservationIds);
      
      // 4. Crear mapeo de productos desde items_summary si no hay validated_items
      let productMapping: Array<{productId: string, quantity: number, reservationId: string | null}> = [];
      
      if (validatedItems.length === 0 && metadata.items_summary) {
        const itemsSummary = metadata.items_summary.split(',');
        console.log('📝 Creating product mapping from summary:', itemsSummary);
        
        itemsSummary.forEach((item: string, index: number) => {
          const [productId, quantity] = item.split(':');
          productMapping.push({
            productId: productId.trim(),
            quantity: parseInt(quantity) || 1,
            reservationId: reservationIds[index] || null
          });
        });
      } else {
        // Usar validated_items si existen
        productMapping = validatedItems.map((item: any, index: number) => ({
          productId: item.productId,
          quantity: item.quantity || 1,
          reservationId: item.reservationId || reservationIds[index] || null
        }));
      }
      
      console.log('🗺️ Product mapping created:', productMapping);
      
      // 5. Validar el mapeo de productos
      const mappingValidation = this.validateProductMapping(productMapping, lineItems.data);
      if (!mappingValidation.isValid) {
        console.error('❌ Product mapping validation failed:', mappingValidation.errors);
        throw new Error(`Product mapping validation failed: ${mappingValidation.errors.join(', ')}`);
      }
      
      const userId = metadata.user_id || null;
      
      // 6. Usar direcciones existentes en Strapi (no crear nuevas)
      let shippingAddressId = null;
      let billingAddressId = null;
      
      if (shippingAddress && shippingAddress.id) {
        try {
          shippingAddressId = shippingAddress.id;
          console.log('📮 Shipping address ID:', shippingAddressId);
        } catch (error) {
          console.error('❌ Error with shipping address:', error);
        }
      }
      
      if (billingAddress && billingAddress.id) {
        try {
          billingAddressId = billingAddress.id;
          console.log('📮 Billing address ID:', billingAddressId);
        } catch (error) {
          console.error('❌ Error with billing address:', error);
        }
      }
      
      // 7. Crear la orden
      const orderData: any = {
        stripeSessionId: session.id,
        totalAmount: session.amount_total / 100,
        currency: session.currency,
        status: 'pending',
        paymentStatus: 'paid',
        shippingAddress: shippingAddressId,
        billingAddress: billingAddressId,
        // Agregar campos requeridos faltantes
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subtotal: session.amount_total / 100,
        total: session.amount_total / 100, // Agregar el campo total requerido
      };
      
      if (userId) {
        orderData.user = userId;
      }
      
      console.log('📋 Creating order with data:', orderData);
      
      const order = await strapi.entityService.create('api::order.order', {
        data: orderData
      });
      
      console.log('✅ Order created successfully:', order.id);
      
      // 8. Procesar cada producto individualmente
      let processedItems = 0;
      let failedItems = 0;
      
      for (let i = 0; i < lineItems.data.length; i++) {
        const item = lineItems.data[i];
        console.log(`🛍️ Processing item ${i + 1}/${lineItems.data.length}:`, item.description);
        
        // Obtener el mapeo correspondiente para este item
        const productMappingItem = productMapping[i];
        if (!productMappingItem) {
          console.error(`❌ No product mapping found for item ${i + 1}`);
          failedItems++;
          continue;
        }
        
        let productId = productMappingItem.productId;
        console.log('🔍 Original productId:', productId);

        // Si productId es un string (documentId), convertirlo al ID numérico de Strapi
        if (typeof productId === 'string' && isNaN(parseInt(productId))) {
          console.log('🔄 Converting documentId to numeric ID:', productId);
          const numericProductId = await this.getProductIdByDocumentId(productId);
          if (numericProductId) {
            productId = numericProductId;
            console.log('✅ Converted to numeric ID:', productId);
          } else {
            console.error('❌ Could not find product with documentId:', productId);
            failedItems++;
            continue;
          }
        }
        
        // Obtener el producto con sus imágenes
        const product = await strapi.entityService.findOne('api::product.product', productId, {
          populate: ['thumbnail', 'Media']
        });
        
        if (!product) {
          console.error('❌ Product not found with ID:', productId);
          failedItems++;
          continue;
        }
        
        console.log('✅ Product found:', product.title);
        
        // 9. Actualizar reservas de stock si existen
        const reservationId = productMappingItem.reservationId;
        if (reservationId) {
          console.log('🔒 Processing stock reservation:', reservationId);
          try {
            const numericReservationId = await this.getStockReservationIdByReservationId(reservationId);
            if (numericReservationId) {
              await strapi.entityService.update('api::stock-reservation.stock-reservation', parseInt(numericReservationId), {
                data: {
                  status: 'confirmed'
                }
              });
              console.log('✅ Stock reservation confirmed:', reservationId);
            } else {
              console.log('⚠️ Stock reservation not found by reservationId:', reservationId);
            }
          } catch (error) {
            console.error('❌ Error confirming stock reservation:', reservationId, error);
          }
        }
        
        // 10. Crear order item
        const orderItemData = {
          order: order.id,
          product: productId,
          quantity: item.quantity,
          unitPrice: item.amount_total / 100,
          totalPrice: item.amount_total / 100,
          image: this.normalizeProductImage(product),
          productName: product.title,
          productSlug: product.slug,
          // Agregar campos requeridos faltantes
          price: item.amount_total / 100,
          name: product.title,
          subtotal: item.amount_total / 100,
        };
        
        console.log('📦 Creating order item:', orderItemData);
        
        try {
          const orderItem = await strapi.entityService.create('api::order-item.order-item', {
            data: orderItemData
          });
          
          console.log('✅ Order item created:', orderItem.id);
          processedItems++;
        } catch (error) {
          console.error('❌ Error creating order item:', error);
          failedItems++;
        }
      }
      
      // 11. Crear registro de pago
      await this.createPaymentRecord(parseInt(order.id.toString()), session, userId);
      
      // 12. Actualizar estado de la orden
      if (failedItems === 0) {
        await this.updateOrderStatus(parseInt(order.id.toString()), 'confirmed');
      } else if (processedItems > 0) {
        await this.updateOrderStatus(parseInt(order.id.toString()), 'processing');
      } else {
        await this.updateOrderStatus(parseInt(order.id.toString()), 'failed');
      }
      
      console.log(`🎉 Checkout session processed successfully! Processed: ${processedItems}, Failed: ${failedItems}`);
      return order;
      
    } catch (error) {
      console.error('❌ Error processing checkout session:', error);
      throw error;
    }
  },

  async handlePaymentIntentSucceeded(paymentIntent: any) {
    console.log('Payment intent succeeded:', paymentIntent.id);
  },

  async handlePaymentIntentFailed(paymentIntent: any) {
    console.log('Payment intent failed:', paymentIntent.id);
  },

  async getProductIdByDocumentId(documentId: string): Promise<string | null> {
    try {
      const product = await strapi.db.query('api::product.product').findOne({
        where: { documentId },
        select: ['id']
      });
      return product ? product.id.toString() : null;
    } catch (error) {
      console.error('Error finding product by documentId:', error);
      return null;
    }
  },

  async getVariantIdByDocumentId(documentId: string): Promise<string | null> {
    try {
      const variant = await strapi.db.query('api::product-variant.product-variant').findOne({
        where: { documentId },
        select: ['id']
      });
      return variant ? variant.id.toString() : null;
    } catch (error) {
      console.error('Error finding variant by documentId:', error);
      return null;
    }
  },

  async getStockReservationIdByReservationId(reservationId: string): Promise<string | null> {
    try {
      const reservation = await strapi.db.query('api::stock-reservation.stock-reservation').findOne({
        where: { reservationId },
        select: ['id']
      });
      return reservation ? reservation.id.toString() : null;
    } catch (error) {
      console.error('Error finding stock reservation by reservationId:', error);
      return null;
    }
  },

  normalizeProductImage(product: any): string {
    if (!product) return '';
    
    // Priorizar thumbnail sobre Media
    if ((product as any).thumbnail) {
      return this.normalizeStrapiImageUrl((product as any).thumbnail);
    }
    
    if ((product as any).Media && (product as any).Media.length > 0) {
      return this.normalizeStrapiImageUrl((product as any).Media[0]);
    }
    
    return '';
  },

  normalizeStrapiImageUrl(imageUrl: any): string {
    if (!imageUrl) return '';
    
    if (typeof imageUrl === 'string') {
      return imageUrl.startsWith('http') ? imageUrl : `${process.env.STRAPI_URL || 'http://localhost:1337'}${imageUrl}`;
    }
    
    if (imageUrl.url) {
      return imageUrl.url.startsWith('http') ? imageUrl.url : `${process.env.STRAPI_URL || 'http://localhost:1337'}${imageUrl.url}`;
    }
    
    if (imageUrl.formats) {
      if (imageUrl.formats.thumbnail) {
        return this.normalizeStrapiImageUrl(imageUrl.formats.thumbnail);
      }
      if (imageUrl.formats.small) {
        return this.normalizeStrapiImageUrl(imageUrl.formats.small);
      }
      if (imageUrl.formats.medium) {
        return this.normalizeStrapiImageUrl(imageUrl.formats.medium);
      }
      if (imageUrl.formats.large) {
        return this.normalizeStrapiImageUrl(imageUrl.formats.large);
      }
    }
    
    return '';
  },
};