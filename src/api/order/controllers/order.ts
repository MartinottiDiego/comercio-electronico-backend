/**
 * order controller
 */

import { factories } from '@strapi/strapi'
import { Context } from 'koa';

export default {
  /**
   * Obtener órdenes de un usuario específico
   */
  async getUserOrders(ctx: Context) {
    try {
      const { userId } = ctx.params;
      
      if (!userId) {
        return ctx.badRequest('User ID is required');
      }

      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          user: {
            id: {
              $eq: userId
            }
          }
        },
        populate: {
          order_items: true,
          shipping_address: true,
          billing_address: true,
          payments: true,
          user: {
            populate: ['profile']
          }
        },
        sort: { createdAt: 'desc' }
      });

      ctx.body = {
        success: true,
        data: orders
      };
    } catch (error) {
      console.error('Error getting user orders:', error);
      ctx.throw(500, 'Failed to get user orders');
    }
  },

  /**
   * Obtener una orden específica con todos sus detalles
   */
  async getOrderById(ctx: Context) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      const order = await strapi.entityService.findOne('api::order.order', id, {
        populate: {
          order_items: {
            populate: ['product']
          },
          shipping_address: true,
          billing_address: true,
          payments: true,
          user: {
            populate: ['profile']
          }
        }
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      ctx.body = {
        success: true,
        data: order
      };
    } catch (error) {
      console.error('Error getting order:', error);
      ctx.throw(500, 'Failed to get order');
    }
  }
}; 