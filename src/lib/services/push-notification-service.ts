import webpush from 'web-push';

interface PushNotificationData {
  title: string;
  message: string;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidKeys: { publicKey: string; privateKey: string; };

  private constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!publicKey || !privateKey) {
      console.warn('⚠️ VAPID keys no configuradas. Las notificaciones push no funcionarán.');
      this.vapidKeys = { publicKey: 'dummy-public-key', privateKey: 'dummy-private-key' };
    } else {
      this.vapidKeys = { publicKey, privateKey };
      webpush.setVapidDetails('mailto:notifications@waazaar.com', publicKey, privateKey);
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async sendPushNotification(subscription: PushSubscription, data: PushNotificationData): Promise<boolean> {
    try {
      const payload = JSON.stringify({
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        priority: data.priority || 'normal',
        icon: data.icon || '/placeholder-logo.png',
        badge: data.badge || '/placeholder-logo.png',
        tag: data.tag || 'waazaar-notification',
        data: data.data || {},
        timestamp: new Date().toISOString()
      });

      const result = await webpush.sendNotification(subscription, payload);
      if (result.statusCode === 200) {
        // Marcar suscripción como activa si no lo está
        return true;
      } else if (result.statusCode === 410) {
        // Suscripción expirada, marcarla como inactiva
        return false;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  async sendPushNotificationToMultiple(subscriptions: PushSubscription[], data: PushNotificationData): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      subscriptions.map(sub => this.sendPushNotification(sub, data))
    );
    
    const totalSuccess = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const totalFailed = results.length - totalSuccess;

    return {
      success: totalSuccess,
      failed: totalFailed
    };
  }

  async sendPushNotificationToUser(userId: string | number, data: PushNotificationData): Promise<boolean> {
    try {
      const subscriptions = await strapi.db.query('api::push-subscription.push-subscription').findMany({
        where: { user: userId, isActive: true }
      });

      if (subscriptions.length === 0) {
        return false;
      }

      const pushSubscriptions: PushSubscription[] = subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }));

      const result = await this.sendPushNotificationToMultiple(pushSubscriptions, data);
      return result.success > 0;
    } catch (error) {
      console.error('Error sending push notification to user:', error);
      return false;
    }
  }

  async sendPushNotificationToRole(role: 'comprador' | 'tienda' | 'admin', data: PushNotificationData): Promise<{ success: number; failed: number }> {
    try {
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: { role },
        populate: ['pushSubscriptions']
      });

      let totalSuccess = 0;
      let totalFailed = 0;

      for (const user of users) {
        const activeSubscriptions = user.pushSubscriptions?.filter(sub => sub.isActive) || [];
        
        if (activeSubscriptions.length > 0) {
          const pushSubscriptions: PushSubscription[] = activeSubscriptions.map(sub => ({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }));

          const result = await this.sendPushNotificationToMultiple(pushSubscriptions, data);
          totalSuccess += result.success;
          totalFailed += result.failed;
        }
      }

      return { success: totalSuccess, failed: totalFailed };
    } catch (error) {
      console.error('Error sending push notification to role:', error);
      return { success: 0, failed: 0 };
    }
  }

  async markSubscriptionAsInactive(endpoint: string): Promise<void> {
    try {
      // Buscar suscripciones por endpoint y marcarlas como inactivas
      const subscriptions = await strapi.entityService.findMany('api::push-subscription.push-subscription', {
        filters: { endpoint }
      });
      
      for (const subscription of subscriptions) {
        await strapi.entityService.update('api::push-subscription.push-subscription', subscription.id, {
          data: { isActive: false }
        });
      }
    } catch (error) {
      console.error('Error marking subscription as inactive:', error);
    }
  }

  async cleanupInactiveSubscriptions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const expiredSubscriptions = await strapi.entityService.findMany('api::push-subscription.push-subscription', {
        filters: {
          isActive: false,
          updatedAt: { $lt: cutoffDate }
        }
      });

      let deletedCount = 0;
      for (const subscription of expiredSubscriptions) {
        await strapi.entityService.delete('api::push-subscription.push-subscription', subscription.id);
        deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up inactive subscriptions:', error);
      return 0;
    }
  }

  async getSubscriptionStats(): Promise<{ total: number; active: number; inactive: number; byRole: Record<string, number> }> {
    try {
      const [total, active, inactive] = await Promise.all([
        strapi.db.query('api::push-subscription.push-subscription').count(),
        strapi.db.query('api::push-subscription.push-subscription').count({ where: { isActive: true } }),
        strapi.db.query('api::push-subscription.push-subscription').count({ where: { isActive: false } })
      ]);

      const usersWithSubscriptions = await strapi.db.query('plugin::users-permissions.user').findMany({
        populate: ['pushSubscriptions']
      });

      const byRole: Record<string, number> = {};
      usersWithSubscriptions.forEach(user => {
        const activeSubs = user.pushSubscriptions?.filter(sub => sub.isActive).length || 0;
        if (activeSubs > 0) {
          byRole[user.role] = (byRole[user.role] || 0) + activeSubs;
        }
      });

      return { total, active, inactive, byRole };
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return { total: 0, active: 0, inactive: 0, byRole: {} };
    }
  }
} 