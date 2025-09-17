/**
 * stock-alert service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::stock-alert.stock-alert', ({ strapi }) => ({
  /**
   * Verificar stock de todos los productos y crear alertas
   */
  async checkAllProductsStock() {
    try {
      // Obtener todos los productos con sus tiendas
      const products = await strapi.db.query('api::product.product').findMany({
        where: { 
          $or: [
            { active: true },
            { active: null } // Incluir productos sin campo active definido
          ]
        },
        populate: ['store', 'store.owner']
      });

      let alertsCreated = 0;
      let alertsUpdated = 0;

      for (const product of products) {
        if (!product.store) continue;

        const result = await this.checkProductStock(product);
        if (result.created) alertsCreated++;
        if (result.updated) alertsUpdated++;
      }

      return {
        success: true,
        alertsCreated,
        alertsUpdated,
        totalProducts: products.length
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verificar stock de un producto específico
   */
  async checkProductStock(product) {
    try {
      const { id: productId, stock, title, store } = product;
      
      // Obtener configuración de umbral para esta tienda
      const threshold = await this.getStoreStockThreshold(store.id);
      
      // Determinar tipo de alerta
      let alertType = null;
      if (stock === 0) {
        alertType = 'out_of_stock';
      } else if (stock <= threshold.critical) {
        alertType = 'critical_stock';
      } else if (stock <= threshold.low) {
        alertType = 'low_stock';
      }

      // Si no hay alerta necesaria, verificar si hay alertas activas para resolver
      if (!alertType) {
        return await this.resolveActiveAlerts(productId);
      }

      // Buscar alerta activa existente para este producto
      const existingAlert = await strapi.db.query('api::stock-alert.stock-alert').findOne({
        where: {
          product: productId,
          stockStatus: 'active'
        }
      });

      if (existingAlert) {
        // Actualizar alerta existente si el tipo cambió
        if (existingAlert.alertType !== alertType) {
          await strapi.db.query('api::stock-alert.stock-alert').update({
            where: { id: existingAlert.id },
            data: {
              currentStock: stock,
              alertType,
              notificationSent: false,
              notificationSentAt: null
            }
          });
          
          // Enviar notificación actualizada
          await this.sendStockAlertNotification(product, alertType, stock, threshold);
          
          return { created: false, updated: true };
        }
        return { created: false, updated: false };
      }

      // Crear nueva alerta
      await strapi.db.query('api::stock-alert.stock-alert').create({
        data: {
          product: productId,
          store: store.id,
          currentStock: stock,
          threshold: threshold.low,
          alertType,
          stockStatus: 'active',
          notificationSent: false
        }
      });

      // Enviar notificación
      await this.sendStockAlertNotification(product, alertType, stock, threshold);

      return { created: true, updated: false };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Resolver alertas activas cuando el stock se recupera
   */
  async resolveActiveAlerts(productId) {
    try {
      const activeAlerts = await strapi.db.query('api::stock-alert.stock-alert').findMany({
        where: {
          product: productId,
          stockStatus: 'active'
        }
      });

      for (const alert of activeAlerts) {
        await strapi.db.query('api::stock-alert.stock-alert').update({
          where: { id: alert.id },
          data: {
            stockStatus: 'resolved',
            resolvedAt: new Date()
          }
        });
      }

      return { created: false, updated: activeAlerts.length > 0 };
    } catch (error) {
      return { created: false, updated: false };
    }
  },

  /**
   * Obtener configuración de umbrales para una tienda
   */
  async getStoreStockThreshold(storeId) {
    try {
      // Por ahora, usar umbrales por defecto
      // En el futuro, esto podría venir de configuración de la tienda
      return {
        low: 10,
        critical: 5
      };
    } catch (error) {
      return { low: 10, critical: 5 };
    }
  },

  /**
   * Enviar notificación de alerta de stock
   */
  async sendStockAlertNotification(product, alertType, currentStock, threshold) {
    try {
      const { title, store } = product;
      const storeOwner = store.owner;

      if (!storeOwner?.email) {
        return;
      }

      // Determinar mensaje según tipo de alerta
      let message = '';
      let priority = 'normal';
      
      switch (alertType) {
        case 'out_of_stock':
          message = `El producto "${title}" se ha quedado sin stock.`;
          priority = 'urgent';
          break;
        case 'critical_stock':
          message = `El producto "${title}" tiene stock crítico (${currentStock} unidades). Umbral: ${threshold.critical}`;
          priority = 'high';
          break;
        case 'low_stock':
          message = `El producto "${title}" tiene stock bajo (${currentStock} unidades). Umbral: ${threshold.low}`;
          priority = 'normal';
          break;
      }

      // Crear notificación usando el servicio existente
      const notificationService = strapi.service('api::notification.notification');
      
      await notificationService.createNotification({
        type: 'stock_alert',
        title: `Alerta de Stock: ${title}`,
        message,
        priority,
        recipientEmail: storeOwner.email,
        recipientRole: 'tienda',
        actionUrl: `/dashboard/productos`,
        actionText: 'Ver Productos'
      });

      // Marcar notificación como enviada
      const alertsToUpdate = await strapi.db.query('api::stock-alert.stock-alert').findMany({
        where: {
          product: product.id,
          stockStatus: 'active',
          notificationSent: false
        }
      });

      for (const alert of alertsToUpdate) {
        await strapi.db.query('api::stock-alert.stock-alert').update({
          where: { id: alert.id },
          data: {
            notificationSent: true,
            notificationSentAt: new Date()
          }
        });
      }

    } catch (error) {
      }
  },

  /**
   * Obtener alertas de stock para una tienda
   */
  async getStoreStockAlerts(storeId, status = 'active') {
    try {
      return await strapi.db.query('api::stock-alert.stock-alert').findMany({
        where: {
          store: storeId,
          stockStatus: status
        },
        populate: ['product', 'acknowledgedBy'],
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Marcar alerta como reconocida
   */
  async acknowledgeAlert(alertId, userId) {
    try {
      return await strapi.db.query('api::stock-alert.stock-alert').update({
        where: { id: alertId },
        data: {
          stockStatus: 'acknowledged',
          acknowledgedAt: new Date(),
          acknowledgedBy: userId
        }
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Descartar alerta
   */
  async dismissAlert(alertId) {
    try {
      return await strapi.db.query('api::stock-alert.stock-alert').update({
        where: { id: alertId },
        data: {
          stockStatus: 'dismissed'
        }
      });
    } catch (error) {
      throw error;
    }
  }
}));
