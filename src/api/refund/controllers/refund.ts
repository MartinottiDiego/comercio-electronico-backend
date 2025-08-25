/**
 * refund controller
 */

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::refund.refund', ({ strapi }) => ({
  /**
   * Crear una nueva solicitud de reembolso
   */
  async createRefundRequest(ctx) {
    try {
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      const { orderId, productId, reason, description, amount, quantity } = ctx.request.body;

      if (!orderId || !reason || !amount) {
        return ctx.badRequest('orderId, reason y amount son requeridos');
      }

      const result = await strapi.service('api::refund.refund').createRefundRequest(
        user.id,
        orderId,
        { reason, description, amount, productId, quantity }
      );

      return ctx.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating refund request:', error);
      return ctx.internalServerError('Error creando solicitud de reembolso');
    }
  },

  /**
   * Obtener reembolsos por tienda
   */
  async getStoreRefunds(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Debes estar autenticado');
      }

      const { storeId } = ctx.params;
      const { status, page = 1, limit = 10 } = ctx.query as any;

      const refundService = strapi.service('api::refund.refund');
      const result = await refundService.getStoreRefunds({
        storeId: storeId || user.email,
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      ctx.body = {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting store refunds:', error);
      ctx.throw(500, 'Error al obtener reembolsos de la tienda');
    }
  },

  /**
   * Obtener reembolsos de un usuario
   */
  async getUserRefunds(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Debes estar autenticado');
      }

      const { status, page = 1, limit = 10 } = ctx.query as any;

      const refundService = strapi.service('api::refund.refund');
      const result = await refundService.getUserRefunds({
        userId: user.id,
        userEmail: user.email,
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      ctx.body = {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting user refunds:', error);
      ctx.throw(500, 'Error al obtener reembolsos del usuario');
    }
  },

  /**
   * Actualizar estado de reembolso (para tiendas/admins)
   */
  async updateRefundStatus(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Debes estar autenticado');
      }

      const { id } = ctx.params;
      const { status, comment, processAutomatically = true } = ctx.request.body as any;

      if (!status) {
        return ctx.badRequest('El estado es requerido');
      }

      const refundService = strapi.service('api::refund.refund');
      const result = await refundService.updateRefundStatus({
        refundId: id,
        newStatus: status,
        updatedBy: user,
        comment,
        processAutomatically
      });

      ctx.body = {
        success: true,
        data: result,
        message: 'Estado actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error updating refund status:', error);
      ctx.throw(400, error.message || 'Error al actualizar estado del reembolso');
    }
  },

  /**
   * Obtener estadísticas de reembolsos
   */
  async getRefundAnalytics(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Debes estar autenticado');
      }

      const { storeId, startDate, endDate } = ctx.query as any;

      const refundService = strapi.service('api::refund.refund');
      const analytics = await refundService.getRefundAnalytics({
        storeId: storeId || user.email,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      ctx.body = {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('Error getting refund analytics:', error);
      ctx.throw(500, 'Error al obtener estadísticas de reembolsos');
    }
  },

  /**
   * Procesar reembolso manualmente
   */
  async processRefund(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Debes estar autenticado');
      }

      const { id } = ctx.params;
      const { force = false } = ctx.request.body as any;

      const refundService = strapi.service('api::refund.refund');
      const result = await refundService.processRefundWithStripe({
        refundId: id,
        processedBy: user,
        force
      });

      ctx.body = {
        success: true,
        data: result,
        message: 'Reembolso procesado exitosamente'
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      ctx.throw(400, error.message || 'Error al procesar reembolso');
    }
  }
})); 