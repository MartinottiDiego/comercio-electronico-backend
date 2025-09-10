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
      
      const rawBody = (ctx.request.body as any)[Symbol.for('unparsedBody')];
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          stripeConfig.webhookSecret
        );
      } catch (signatureError) {
        console.error('❌ [WEBHOOK] Signature verification failed:', signatureError.message);
        event = ctx.request.body as any;
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
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;
        case 'refund.updated':
          await this.handleRefundUpdated(event.data.object);
          break;
        case 'charge.dispute.created':
          await this.handleChargeDisputeCreated(event.data.object);
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

  async createPaymentRecord(orderId: number, session: any, userId: string | null, receiptUrl?: string) {
    try {

      // Usar el servicio unificado para crear el payment
      const payment = await strapi.service('api::payment.payment').createPaymentWithStripeData(
        session,
        orderId,
        userId,
        receiptUrl
      );
      
      return payment;
    } catch (error) {
      console.error('❌ [WEBHOOK] Error creating payment record:', error);
      return null;
    }
  },

  async updateOrderStatus(orderId: number, orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed') {
    try {
      await strapi.entityService.update('api::order.order', orderId, {
        data: { orderStatus }
      });
    } catch (error) {
      console.error(`❌ Error updating order orderStatus:`, error);
    }
  },

  // Funciones auxiliares para manejar eventos de webhook
  async handleCheckoutSessionCompleted(session: any) {
    try {

      // Intentar obtener el receipt_url desde la API de Stripe usando la documentación oficial
      let receiptUrl = session.receipt_url || session.payment_intent?.receipt_url;
      
      if (!receiptUrl && session.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
          
          // Según la documentación: usar paymentIntent.latest_charge
          if ((paymentIntent as any).latest_charge) {
            const charge = await stripe.charges.retrieve((paymentIntent as any).latest_charge);
            receiptUrl = charge.receipt_url;
          } else {
            // Fallback: intentar con charges.data si existe
            if ((paymentIntent as any).charges && (paymentIntent as any).charges.data && (paymentIntent as any).charges.data.length > 0) {
              const charge = (paymentIntent as any).charges.data[0];
              receiptUrl = charge.receipt_url;
            }
          }
          
          // Si aún no hay receipt_url, usar la URL del dashboard como fallback
          if (!receiptUrl) {
            receiptUrl = `https://dashboard.stripe.com/test/payments/${session.payment_intent}`;
          }
        } catch (error) {
          console.error('Error fetching receipt URL from Stripe API:', error);
          // Como último recurso, crear una URL de recibo personalizada
          receiptUrl = `https://dashboard.stripe.com/test/payments/${session.payment_intent}`;
        }
      }

      // 1. Validar datos de la sesión
      const sessionValidation = this.validateSessionData(session);
      if (!sessionValidation.isValid) {
        console.error('❌ Session validation failed:', sessionValidation.errors);
        throw new Error(`Session validation failed: ${sessionValidation.errors.join(', ')}`);
      }
      
      // 2. Obtener line_items de Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      
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
      
      // 4. Crear mapeo de productos desde items_summary si no hay validated_items
      let productMapping: Array<{productId: string, quantity: number, reservationId: string | null}> = [];
      
      if (validatedItems.length === 0 && metadata.items_summary) {
        const itemsSummary = metadata.items_summary.split(',');
        
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
        } catch (error) {
          console.error('❌ Error with shipping address:', error);
        }
      }
      
      if (billingAddress && billingAddress.id) {
        try {
          billingAddressId = billingAddress.id;
        } catch (error) {
          console.error('❌ Error with billing address:', error);
        }
      }
      
      // 7. Crear la orden usando el servicio unificado
      const order = await strapi.service('api::order.order').createOrderWithStripeData(
        session,
        userId,
        {
          shipping: shippingAddressId,
          billing: billingAddressId
        }
      );
      
      // 8. Procesar cada producto individualmente
      let processedItems = 0;
      let failedItems = 0;
      
      for (let i = 0; i < lineItems.data.length; i++) {
        const item = lineItems.data[i];
        
        // Obtener el mapeo correspondiente para este item
        const productMappingItem = productMapping[i];
        if (!productMappingItem) {
          console.error(`❌ No product mapping found for item ${i + 1}`);
          failedItems++;
          continue;
        }
        
        let productId = productMappingItem.productId;

        // Si productId es un string (documentId), convertirlo al ID numérico de Strapi
        if (typeof productId === 'string' && isNaN(parseInt(productId))) {
          const numericProductId = await this.getProductIdByDocumentId(productId);
          if (numericProductId) {
            productId = numericProductId;
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
        
        // 9. Actualizar reservas de stock si existen
        const reservationId = productMappingItem.reservationId;
        if (reservationId) {
          try {
            const numericReservationId = await this.getStockReservationIdByReservationId(reservationId);
            if (numericReservationId) {
              await strapi.entityService.update('api::stock-reservation.stock-reservation', parseInt(numericReservationId), {
                data: {
                  status: 'confirmed'
                }
              });
            } else {
              // Reserva no encontrada, continuar sin confirmarla
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
        
        try {
          const orderItem = await strapi.entityService.create('api::order-item.order-item', {
            data: orderItemData
          });
          
          processedItems++;
        } catch (error) {
          console.error('❌ Error creating order item:', error);
          failedItems++;
        }
      }
      
      // 11. Crear registro de pago usando el servicio unificado
      
      const payment = await this.createPaymentRecord(order.id, session, userId, receiptUrl);
      
      if (!payment) {
        console.error('❌ [WEBHOOK] Failed to create payment record');
        throw new Error('Failed to create payment record');
      }
      
      console.log('✅ [WEBHOOK] Payment record created successfully:', payment.id);

      // Actualizar estado de la orden
      await strapi.entityService.update('api::order.order', order.id, {
        data: {
          orderStatus: 'confirmed',
          paymentStatus: 'paid'
        }
      });

      // Procesar sesión de checkout
      if (session.mode === 'checkout.session.completed') {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        
        // Validar items y crear mapeo de productos
        const validatedItems = lineItems.data.filter(item => 
          item.price && item.quantity && item.quantity > 0
        );

        const reservationIds = validatedItems.map(item => 
          item.price?.metadata?.reservationId
        ).filter(Boolean);

        // Crear mapeo de productos desde el resumen
        const itemsSummary = validatedItems.map(item => ({
          productId: item.price?.metadata?.productId,
          quantity: item.quantity || 0,
          price: (item.amount_total || 0) / 100
        }));

        const productMapping = itemsSummary.reduce((acc, item) => {
          if (item.productId) {
            acc[item.productId] = {
              quantity: item.quantity,
              price: item.price
            };
          }
          return acc;
        }, {} as Record<string, { quantity: number; price: number }>);
      }
      
      return order;
      
    } catch (error) {
      console.error('❌ Error processing checkout session:', error);
      throw error;
    }
  },

  async handlePaymentIntentSucceeded(paymentIntent: any) {
  },

  async handlePaymentIntentFailed(paymentIntent: any) {
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

  /**
   * Manejar evento de reembolso completado
   */
  async handleChargeRefunded(charge: any) {
    try {
      // Buscar el pago original
      const payments = await strapi.entityService.findMany('api::payment.payment', {
        filters: {
          paymentIntentId: charge.payment_intent
        },
        populate: ['order']
      });
      
      if (payments.length === 0) {
        console.warn('⚠️ No payment found for refunded charge:', charge.id);
        return;
      }
      
      const payment = payments[0];
      
      // Buscar el reembolso en nuestra base de datos
      const refunds = await strapi.entityService.findMany('api::refund.refund', {
        filters: {
          payment: {
            id: payment.id
          },
          status: {
            $in: ['processing', 'pending']
          }
        }
      }) as any[];
      
      // Actualizar todos los reembolsos encontrados
      for (const refund of refunds) {
        const updatedRefund = await strapi.entityService.update('api::refund.refund', refund.id, {
          data: {
            status: 'completed',
            processedAt: new Date(),
            metadata: {
              ...(refund.metadata as any || {}),
              stripeChargeId: charge.id,
              stripeRefundId: charge.refunds.data[0]?.id,
              completedAt: new Date().toISOString(),
              webhookProcessed: true
            }
          },
          populate: {
            order: { populate: { user: true } },
            payment: true,
            user: true
          }
        });
        
        // Crear notificación de reembolso completado
        try {
          const refundService = strapi.service('api::refund.refund');
          await refundService.createRefundNotifications(updatedRefund, 'completed');

        } catch (notificationError) {
          console.error('⚠️ Error creando notificación desde webhook:', notificationError);
        }
      }
      
      // Actualizar el estado del pago
      const totalRefunded = charge.amount_refunded;
      const isFullyRefunded = totalRefunded >= charge.amount;
      
      await strapi.entityService.update('api::payment.payment', payment.id, {
        data: {
          paymentStatus: isFullyRefunded ? 'refunded' : ('partially_refunded' as any),
          gatewayResponse: {
            ...(payment.gatewayResponse as any || {}),
            refundedAmount: totalRefunded / 100,
            lastRefundAt: new Date().toISOString()
          }
        }
      });
      
      // Actualizar el estado de la orden si es reembolso completo
      if (isFullyRefunded && (payment as any).order) {
        await strapi.service('api::order.order').updateOrderStatus((payment as any).order.id, 'refunded');
      }
      
    } catch (error) {
      console.error('❌ Error handling charge refunded:', error);
    }
  },

  /**
   * Manejar evento de actualización de reembolso
   */
  async handleRefundUpdated(refundObject: any) {
    try {
      const refunds = await strapi.entityService.findMany('api::refund.refund', {
        filters: {
          $or: [
            {
              metadata: {
                $contains: refundObject.id
              }
            },
            {
              refundId: {
                $contains: refundObject.metadata?.refundId
              }
            }
          ]
        }
      });
      
      if (refunds.length === 0) {
        console.warn('⚠️ No refund found for Stripe refund:', refundObject.id);
        return;
      }
      
      const refund = refunds[0];
      let newStatus = refund.refundStatus;
      
      switch (refundObject.status) {
        case 'succeeded':
          newStatus = 'completed';
          break;
        case 'failed':
          newStatus = 'failed';
          break;
        case 'pending':
          newStatus = 'processing';
          break;
      }
      
      await strapi.entityService.update('api::refund.refund', refund.id, {
        data: {
          refundStatus: newStatus,
          metadata: {
            ...(refund.metadata as any || {}),
            stripeRefundId: refundObject.id,
            stripeStatus: refundObject.status,
            stripeUpdatedAt: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error handling refund updated:', error);
    }
  },

  /**
   * Manejar evento de disputa creada
   */
  async handleChargeDisputeCreated(dispute: any) {
    try {
      const payments = await strapi.entityService.findMany('api::payment.payment', {
        filters: {
          paymentIntentId: dispute.payment_intent
        },
        populate: ['order']
      });
      
      if (payments.length === 0) {
        console.warn('⚠️ No payment found for disputed charge:', dispute.charge);
        return;
      }
      
      const payment = payments[0];
      
      await strapi.entityService.update('api::payment.payment', payment.id, {
        data: {
          paymentStatus: 'disputed' as any,
          gatewayResponse: {
            ...(payment.gatewayResponse as any || {}),
            dispute: {
              disputeId: dispute.id,
              reason: dispute.reason,
              amount: dispute.amount / 100,
              status: dispute.status
            },
            disputedAt: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error handling charge dispute created:', error);
    }
  }
};