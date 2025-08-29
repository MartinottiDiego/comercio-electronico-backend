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

      return {
        success: true,
        notifications: notifications || [],
        unreadCount,
        lastSync: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error en sync de notificaciones:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  }
})); 