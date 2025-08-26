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
  async updateOrderStatus(orderId: string | number, orderStatus: string) {
    try {
      const order = await strapi.entityService.update('api::order.order', orderId, {
        data: { orderStatus: orderStatus as any }
      });

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  async confirmPayment(orderId: string | number) {
    try {
      const order = await strapi.entityService.update('api::order.order', orderId, {
        data: {
          paymentStatus: 'paid'
        }
      });

      return order;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
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