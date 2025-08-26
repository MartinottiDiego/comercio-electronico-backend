/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  // Método para obtener órdenes de un usuario específico
  async getUserOrders(ctx) {
    try {
      const { user } = ctx.state;
      const userId = user.id;

      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: { user: userId },
        populate: ['order_items', 'order_items.product', 'order_items.product.images']
      });

      return ctx.send({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      return ctx.internalServerError('Error obteniendo órdenes del usuario');
    }
  },

  // Método para obtener una orden específica
  async getOrderById(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;

      const order = await strapi.entityService.findOne('api::order.order', id, {
        populate: ['order_items', 'order_items.product', 'order_items.product.images']
      });

      if (!order) {
        return ctx.notFound('Orden no encontrada');
      }

      // Verificar que el usuario solo pueda ver sus propias órdenes
      if ((order as any).user !== user.id && user.role?.name !== 'admin') {
        return ctx.forbidden('No tienes permisos para ver esta orden');
      }

      return ctx.send({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error getting order by id:', error);
      return ctx.internalServerError('Error obteniendo la orden');
    }
  }
})); 