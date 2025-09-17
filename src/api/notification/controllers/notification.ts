/**
 * notification controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::notification.notification', ({ strapi }) => ({
  // Método sync para sincronizar notificaciones del usuario
  async sync(ctx) {
    try {
      const { userEmail } = ctx.request.body;
      
      if (!userEmail) {
        return ctx.badRequest('userEmail es requerido');
      }

      // Obtener notificaciones del usuario
      const notifications = await strapi.entityService.findMany('api::notification.notification', {
        filters: {
          recipientEmail: userEmail
        },
        sort: { createdAt: 'desc' },
        limit: 50,
        populate: ['order']
      });

      // Contar notificaciones no leídas
      const unreadCount = await strapi.entityService.count('api::notification.notification', {
        filters: {
          recipientEmail: userEmail,
          notificationStatus: 'unread'
        }
      });

      const result = {
        success: true,
        notifications: notifications || [],
        unreadCount,
        lastSync: new Date().toISOString()
      };

      return result;
      
    } catch (error) {
      console.error('Error en sync de notificaciones:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  // Método find personalizado
  async find(ctx) {
    try {
      const result = await super.find(ctx);
      return result;
    } catch (error) {
      console.error('Error en find de notificaciones:', error);
      throw error;
    }
  },

  // Método para marcar notificación como leída
  async markAsRead(ctx) {
    try {
      const { id } = ctx.params;
      const { userEmail } = ctx.request.body;
      
      if (!id) {
        return ctx.badRequest('ID de notificación es requerido');
      }
      
      if (!userEmail) {
        return ctx.badRequest('userEmail es requerido');
      }

      // Verificar que la notificación pertenece al usuario
      const notification = await strapi.entityService.findOne('api::notification.notification', id);
      
      if (!notification || notification.recipientEmail !== userEmail) {
        return ctx.notFound('Notificación no encontrada');
      }

      // Marcar como leída
      const updatedNotification = await strapi.entityService.update('api::notification.notification', id, {
        data: {
          notificationStatus: 'read',
          readAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        notification: updatedNotification
      };
      
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  }
})); 