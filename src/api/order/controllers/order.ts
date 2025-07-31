/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  // Método para obtener órdenes de un usuario específico
  async getUserOrders(ctx) {
    try {
      const { userId } = ctx.params;
      const { page = '1', pageSize = '10' } = ctx.query;
      
      console.log(`🔍 Buscando órdenes para usuario: ${userId}`);
      
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          user: userId
        },
        populate: ['order_items', 'shipping_address', 'billing_address'],
        sort: { createdAt: 'desc' },
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });
      
      console.log(`✅ Encontradas ${orders.length} órdenes para usuario ${userId}`);
      
      return {
        data: orders,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(orders.length / parseInt(pageSize as string)),
            total: orders.length
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo órdenes del usuario:', error);
      ctx.throw(500, 'Error interno del servidor');
    }
  },

  // Método para obtener una orden específica
  async getOrderById(ctx) {
    try {
      const { id } = ctx.params;
      
      console.log(`🔍 Buscando orden: ${id}`);
      
      const order = await strapi.entityService.findOne('api::order.order', id, {
        populate: ['order_items', 'shipping_address', 'billing_address', 'user']
      });
      
      if (!order) {
        return ctx.notFound('Orden no encontrada');
      }
      
      console.log(`✅ Orden encontrada: ${order.orderNumber}`);
      
      return {
        data: order
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error);
      ctx.throw(500, 'Error interno del servidor');
    }
  }
})); 