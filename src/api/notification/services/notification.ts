/**
 * notification service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::notification.notification', ({ strapi }) => ({
  async createNotification(data) {
    try {
      const notification = await strapi.entityService.create('api::notification.notification', {
        data: {
          type: data.type || 'system',
          title: data.title,
          message: data.message,
          priority: data.priority || 'normal',
          notificationStatus: 'unread',
          recipientEmail: data.recipientEmail,
          recipientRole: data.recipientRole || 'comprador',
          actionUrl: data.actionUrl,
          actionText: data.actionText
        }
      });

      // Notificación creada exitosamente

      // Intentar enviar email (sin bloquear si falla)
      try {
        await this.sendEmailNotification(notification);
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError);
      }

      // Intentar enviar push notification (sin bloquear si falla)
      try {
        await this.sendPushNotification(notification);
      } catch (pushError) {
        console.error('❌ Error enviando push notification:', pushError);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      throw error;
    }
  },

  async sendEmailNotification(notification) {
    try {
      const { EmailService } = require('../../../lib/email-service');
      const emailService = EmailService.getInstance();
      const emailSent = await emailService.sendNotificationEmail(notification);
      
      if (emailSent) {
        await strapi.entityService.update('api::notification.notification', notification.id, {
          data: { isEmailSent: true, emailSentAt: new Date() }
        });
        // Email enviado exitosamente
      }
      
      return emailSent;
    } catch (error) {
      console.error('❌ Error en sendEmailNotification:', error);
      return false;
    }
  },

  async sendPushNotification(notification) {
    try {
      const { PushNotificationService } = require('../../../lib/services/push-notification-service');
      const pushService = PushNotificationService.getInstance();
      
      // Buscar usuario por email
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: notification.recipientEmail }
      });

      if (!user) {
        console.log(`⚠️ Usuario no encontrado para push notification: ${notification.recipientEmail}`);
        return false;
      }

      const pushData = {
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        priority: notification.priority,
        icon: '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
        tag: `notification-${notification.id}`,
        data: {
          notificationId: notification.id,
          type: notification.type
        }
      };

      const success = await pushService.sendPushNotificationToUser(user.id, pushData);
      
      if (success) {
        // Push notification enviada exitosamente
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error en sendPushNotification:', error);
      return false;
    }
  },

  async notifyOrderCreated(order, user) {
    return await this.createNotification({
      type: 'order_created',
      title: `🛒 Orden creada #${order.orderNumber || order.id}`,
      message: `Tu orden ha sido creada exitosamente. Total: $${order.total || 'N/A'}`,
      priority: 'normal',
      recipientEmail: user.email,
      recipientRole: 'comprador',
      actionUrl: `/orders/${order.id}`,
      actionText: 'Ver orden'
    });
  },

  async notifyNewSale(order, storeOwnerEmail) {
    return await this.createNotification({
      type: 'new_sale',
      title: `💰 Nueva venta #${order.orderNumber || order.id}`,
      message: `Has recibido una nueva venta. Revisa los detalles en tu panel.`,
      priority: 'high',
      recipientEmail: storeOwnerEmail,
      recipientRole: 'tienda',
      actionUrl: `/admin/orders/${order.id}`,
      actionText: 'Ver orden'
    });
  },

  async notifyNewSaleWithDetails(saleData) {
    const { orderId, buyerEmail, total, products, storeOwnerEmail } = saleData;
    
    return await this.createNotification({
      type: 'new_sale',
      title: `💰 Nueva venta #${orderId}`,
      message: `Has recibido una nueva venta por €${total.toFixed(2)}. Revisa los detalles en tu panel.`,
      priority: 'high',
      recipientEmail: storeOwnerEmail,
      recipientRole: 'tienda',
      actionUrl: `/dashboard/orders/${orderId}`,
      actionText: 'Ver orden',
      metadata: {
        orderId,
        buyerEmail,
        total,
        products
      }
    });
  },

  async notifyOrderStatusChange(order, newStatus, user) {
    const statusMessages = {
      'confirmed': 'Tu orden ha sido confirmada',
      'shipped': 'Tu orden ha sido enviada',
      'delivered': 'Tu orden ha sido entregada',
      'cancelled': 'Tu orden ha sido cancelada'
    };

    return await this.createNotification({
      type: 'order_status_change',
      title: `📦 Estado actualizado: ${newStatus}`,
      message: statusMessages[newStatus] || `Tu orden ha cambiado a estado: ${newStatus}`,
      priority: 'normal',
      recipientEmail: user.email,
      recipientRole: 'comprador',
      actionUrl: `/orders/${order.id}`,
      actionText: 'Ver orden'
    });
  },

  async notifyPaymentReceived(order, storeEmail) {
    return await this.createNotification({
      type: 'payment_received',
      title: `💳 Pago recibido #${order.orderNumber || order.id}`,
      message: `Has recibido un pago por tu venta. Revisa los detalles.`,
      priority: 'high',
      recipientEmail: storeEmail,
      recipientRole: 'tienda',
      actionUrl: `/admin/orders/${order.id}`,
      actionText: 'Ver orden'
    });
  },

  async getUserNotifications(userEmail, limit = 50) {
    return await strapi.entityService.findMany('api::notification.notification', {
      filters: { recipientEmail: userEmail },
      sort: { createdAt: 'desc' },
      limit
    });
  },

  async markAsRead(notificationId) {
    return await strapi.entityService.update('api::notification.notification', notificationId, {
      data: { 
        notificationStatus: 'read',
        readAt: new Date()
      }
    });
  },

  async getUnreadCount(userEmail) {
    const notifications = await strapi.entityService.findMany('api::notification.notification', {
      filters: { 
        recipientEmail: userEmail,
        notificationStatus: 'unread'
      }
    });
    
    return notifications.length;
  },

  async cleanupOldNotifications(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldNotifications = await strapi.entityService.findMany('api::notification.notification', {
      filters: {
        createdAt: {
          $lt: cutoffDate
        }
      }
    });

    let deletedCount = 0;
    for (const notification of oldNotifications) {
      await strapi.entityService.delete('api::notification.notification', notification.id);
      deletedCount++;
    }

    // Notificaciones antiguas eliminadas
    return deletedCount;
  }
})); 