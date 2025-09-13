/**
 * stock-alert controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::stock-alert.stock-alert', ({ strapi }) => ({
  /**
   * Obtener alertas de stock para una tienda específica
   */
  async getStoreAlerts(ctx) {
    try {
      const { storeId } = ctx.params;
      const { status = 'active' } = ctx.query;

      if (!storeId) {
        return ctx.badRequest('Store ID es requerido');
      }

      const alerts = await strapi.service('api::stock-alert.stock-alert').getStoreStockAlerts(storeId, status);

      return {
        data: alerts,
        meta: {
          total: alerts.length,
          status
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo alertas de tienda:', error);
      return ctx.internalServerError('Error obteniendo alertas de stock');
    }
  },

  /**
   * Verificar stock de todos los productos
   */
  async checkAllStock(ctx) {
    try {
      const result = await strapi.service('api::stock-alert.stock-alert').checkAllProductsStock();
      
      return {
        data: result,
        message: 'Verificación de stock completada'
      };
    } catch (error) {
      console.error('❌ Error verificando stock:', error);
      return ctx.internalServerError('Error verificando stock de productos');
    }
  },

  /**
   * Verificar stock de un producto específico
   */
  async checkProductStock(ctx) {
    try {
      const { productId } = ctx.params;

      if (!productId) {
        return ctx.badRequest('Product ID es requerido');
      }

      const product = await strapi.db.query('api::product.product').findOne({
        where: { id: productId },
        populate: ['store', 'store.owner']
      });

      if (!product) {
        return ctx.notFound('Producto no encontrado');
      }

      const result = await strapi.service('api::stock-alert.stock-alert').checkProductStock(product);

      return {
        data: result,
        message: 'Verificación de stock del producto completada'
      };
    } catch (error) {
      console.error('❌ Error verificando stock del producto:', error);
      return ctx.internalServerError('Error verificando stock del producto');
    }
  },

  /**
   * Marcar alerta como reconocida
   */
  async acknowledgeAlert(ctx) {
    try {
      const { id } = ctx.params;
      const { userId } = ctx.request.body;

      if (!id) {
        return ctx.badRequest('Alert ID es requerido');
      }

      if (!userId) {
        return ctx.badRequest('User ID es requerido');
      }

      const alert = await strapi.service('api::stock-alert.stock-alert').acknowledgeAlert(id, userId);

      return {
        data: alert,
        message: 'Alerta marcada como reconocida'
      };
    } catch (error) {
      console.error('❌ Error reconociendo alerta:', error);
      return ctx.internalServerError('Error reconociendo alerta');
    }
  },

  /**
   * Descartar alerta
   */
  async dismissAlert(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Alert ID es requerido');
      }

      const alert = await strapi.service('api::stock-alert.stock-alert').dismissAlert(id);

      return {
        data: alert,
        message: 'Alerta descartada'
      };
    } catch (error) {
      console.error('❌ Error descartando alerta:', error);
      return ctx.internalServerError('Error descartando alerta');
    }
  },

  /**
   * Obtener estadísticas de alertas de stock
   */
  async getStockAlertStats(ctx) {
    try {
      const { storeId } = ctx.params;

      if (!storeId) {
        return ctx.badRequest('Store ID es requerido');
      }

      // Obtener estadísticas por estado
      const [active, acknowledged, resolved, dismissed] = await Promise.all([
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, stockStatus: 'active' }
        }),
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, stockStatus: 'acknowledged' }
        }),
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, stockStatus: 'resolved' }
        }),
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, stockStatus: 'dismissed' }
        })
      ]);

      // Obtener estadísticas por tipo de alerta
      const [lowStock, criticalStock, outOfStock] = await Promise.all([
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, alertType: 'low_stock', stockStatus: 'active' }
        }),
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, alertType: 'critical_stock', stockStatus: 'active' }
        }),
        strapi.db.query('api::stock-alert.stock-alert').count({
          where: { store: storeId, alertType: 'out_of_stock', stockStatus: 'active' }
        })
      ]);

      return {
        data: {
          byStatus: {
            active,
            acknowledged,
            resolved,
            dismissed,
            total: active + acknowledged + resolved + dismissed
          },
          byType: {
            lowStock,
            criticalStock,
            outOfStock,
            total: lowStock + criticalStock + outOfStock
          }
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de alertas:', error);
      return ctx.internalServerError('Error obteniendo estadísticas de alertas');
    }
  }
}));

