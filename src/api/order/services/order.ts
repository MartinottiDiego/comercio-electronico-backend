/**
 * order service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::order.order', ({ strapi }) => ({
  // Métodos básicos sin notificaciones por ahora
  async createOrder(orderData) {
    try {
      const order = await strapi.entityService.create('api::order.order', { 
        data: orderData
      });
      
      console.log('🛒 Orden creada:', order.id);
      
      // TODO: Implementar notificaciones cuando se resuelvan los errores de tipos
      
      return order;
    } catch (error) {
      console.error('❌ Error creando orden:', error);
      throw error;
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      const order = await strapi.entityService.update('api::order.order', orderId, {
        data: { status: newStatus }
      });
      
      console.log(`📦 Estado de orden actualizado: ${orderId} -> ${newStatus}`);
      
      return order;
    } catch (error) {
      console.error('❌ Error actualizando estado de orden:', error);
      throw error;
    }
  },

  async confirmPayment(orderId, paymentData) {
    try {
      const order = await strapi.entityService.update('api::order.order', orderId, {
        data: { 
          paymentStatus: 'paid'
        }
      });
      
      console.log(`💳 Pago confirmado para orden: ${orderId}`);
      
      return order;
    } catch (error) {
      console.error('❌ Error confirmando pago:', error);
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