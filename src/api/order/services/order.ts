/**
 * order service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::order.order', ({ strapi }) => ({
  /**
   * Crear una orden con todos los campos necesarios
   */
  async createOrderWithStripeData(stripeData: any, userId?: string | null, addresses?: any) {
    try {
      const orderData = {
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderStatus: 'pending' as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed',
        paymentStatus: stripeData.payment_status === 'paid' ? 'paid' : 'pending' as 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded',
        subtotal: stripeData.amount_total / 100,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: stripeData.amount_total / 100,
        currency: stripeData.currency?.toUpperCase() || 'EUR',
        shippingMethod: 'Standard',
        trackingNumber: null,
        estimatedDelivery: null,
        notes: '',
        customerNotes: '',
        metadata: stripeData.metadata || {},
        stripeSessionId: stripeData.id,
        totalAmount: stripeData.amount_total / 100,
        ...(userId && { user: userId }),
        ...(addresses?.shipping && { shipping_address: addresses.shipping }),
        ...(addresses?.billing && { billing_address: addresses.billing })
      };

      const order = await strapi.entityService.create('api::order.order', {
        data: orderData
      });

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Actualizar el estado de una orden
   */
  async updateOrderStatus(orderId: string | number, orderStatus: string, notes?: string) {
    try {
      let numericId = orderId;
      
      // Si es un documentId (string), obtener el ID numérico
      if (typeof orderId === 'string') {
        const order = await strapi.db.connection('orders')
          .where('document_id', orderId)
          .select('id')
          .first();
          
        if (!order) {
          throw new Error('Order not found');
        }
        
        numericId = order.id;
      }

      // Obtener la orden actual para comparar estados
      const currentOrder = await strapi.entityService.findOne('api::order.order', numericId, {
        populate: ['user', 'order_items.product.store.owner']
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      const previousStatus = currentOrder.orderStatus;
      
      // Actualizar el estado
      const updateData: any = { orderStatus: orderStatus as any };
      if (notes) {
        updateData.notes = notes;
      }
      
      const order = await strapi.entityService.update('api::order.order', numericId, {
        data: updateData,
        populate: ['user', 'order_items', 'order_items.product', 'order_items.product.store']
      });

      // Crear notificaciones si el estado cambió
      if (previousStatus !== orderStatus) {
        // Usar la orden actualizada que incluye el mensaje de cancelación
        await this.createOrderStatusNotifications(order, orderStatus, previousStatus);
      }

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Crear notificaciones para cambios de estado de órdenes
   */
  async createOrderStatusNotifications(order: any, newStatus: string, previousStatus: string) {
    try {
      const notificationService = strapi.service('api::notification.notification');
      
      // Obtener información del comprador
      const buyer = order.user;
      if (!buyer) return;

      // Obtener información de la tienda (primera tienda de los productos)
      const firstOrderItem = order.order_items?.[0];
      const store = firstOrderItem?.product?.store;
      const storeOwner = store?.owner;

      // Mapear estados a tipos de notificación
      const statusNotificationMap = {
        'confirmed': {
          type: 'order_confirmed',
          title: '✅ Pedido confirmado',
          message: `Tu pedido #${order.orderNumber} ha sido confirmado y está siendo procesado.`,
          priority: 'normal'
        },
        'processing': {
          type: 'order_confirmed',
          title: '🔄 Pedido en procesamiento',
          message: `Tu pedido #${order.orderNumber} está siendo preparado para el envío.`,
          priority: 'normal'
        },
        'shipped': {
          type: 'order_shipped',
          title: '📦 Pedido enviado',
          message: `¡Tu pedido #${order.orderNumber} ha sido enviado! ${order.trackingNumber ? `Número de seguimiento: ${order.trackingNumber}` : ''}`,
          priority: 'high'
        },
        'delivered': {
          type: 'order_delivered',
          title: '🎉 Pedido entregado',
          message: `¡Tu pedido #${order.orderNumber} ha sido entregado exitosamente!`,
          priority: 'high'
        },
        'cancelled': {
          type: 'order_cancelled',
          title: '❌ Pedido cancelado',
          message: `Tu pedido #${order.orderNumber} ha sido cancelado. ${order.notes ? `Motivo: ${order.notes}` : ''}`,
          priority: 'high'
        }
      };

      const notificationConfig = statusNotificationMap[newStatus];
      if (!notificationConfig) return;

      // Crear notificación para el comprador
      await notificationService.createNotification({
        type: notificationConfig.type,
        title: notificationConfig.title,
        message: notificationConfig.message,
        priority: notificationConfig.priority,
        recipientEmail: buyer.email,
        recipientRole: 'comprador',
        actionUrl: `/mi-espacio?section=compras#${order.id}`,
        actionText: 'Ver pedido',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          previousStatus,
          newStatus,
          total: order.total,
          currency: order.currency
        }
      });

      // Solo crear notificaciones para el comprador
      // El dueño de la tienda ya sabe que está cambiando el estado

    } catch (error) {
      // No fallar la operación si las notificaciones fallan
    }
  },

  async confirmPayment(orderId: string | number) {
    try {
      // Obtener la orden actual
      const currentOrder = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: ['user', 'order_items.product.store.owner']
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Actualizar el estado de pago
      const order = await strapi.entityService.update('api::order.order', orderId, {
        data: {
          paymentStatus: 'paid'
        }
      });

      // Crear notificaciones de confirmación de pago
      await this.createPaymentConfirmationNotifications(currentOrder);

      return order;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  },

  /**
   * Crear notificaciones para confirmación de pago
   */
  async createPaymentConfirmationNotifications(order: any) {
    try {
      const notificationService = strapi.service('api::notification.notification');
      
      // Obtener información del comprador
      const buyer = order.user;
      if (!buyer) return;

      // Obtener información de la tienda
      const firstOrderItem = order.order_items?.[0];
      const store = firstOrderItem?.product?.store;
      const storeOwner = store?.owner;

      // Crear notificación para el comprador
      await notificationService.createNotification({
        type: 'payment_received',
        title: '✅ Pago confirmado',
        message: `Tu pago de €${order.total} ha sido procesado exitosamente. Tu pedido #${order.orderNumber} está siendo preparado.`,
        priority: 'high',
        recipientEmail: buyer.email,
        recipientRole: 'comprador',
        actionUrl: `/mi-espacio?section=compras#${order.id}`,
        actionText: 'Ver pedido',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          currency: order.currency,
          paymentStatus: 'paid'
        }
      });

      // Crear notificación para la tienda
      if (storeOwner) {
        await notificationService.createNotification({
          type: 'new_sale',
          title: '💰 Nueva venta confirmada',
          message: `¡Nueva venta! Pedido #${order.orderNumber} por €${order.total} - Pago confirmado.`,
          priority: 'high',
          recipientEmail: storeOwner.email,
          recipientRole: 'tienda',
          actionUrl: `/dashboard/pedidos`,
          actionText: 'Ver pedidos',
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            buyerEmail: buyer.email,
            amount: order.total,
            currency: order.currency,
            storeId: store.id,
            paymentStatus: 'paid'
          }
        });
      }

      } catch (error) {
      // No fallar la operación si las notificaciones fallan
    }
  },

  async generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  },

  async getUserOrders(userId, limit = 50) {
    return await strapi.entityService.findMany('api::order.order', {
      filters: { user: userId },
      sort: { createdAt: 'desc' },
      limit
    });
  },

  async calculateOrderTotals(orderItems) {
    let subtotal = 0;
    let tax = 0;
    let shipping = 0;
    
    for (const item of orderItems) {
      subtotal += (item.price * item.quantity);
    }
    
    tax = subtotal * 0.16; // 16% IVA
    shipping = 100; // Costo fijo de envío
    
    const total = subtotal + tax + shipping;
    
    return {
      subtotal,
      tax,
      shipping,
      total
    };
  }
})); 