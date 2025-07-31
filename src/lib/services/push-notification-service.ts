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
      console.log('✅ Notificación push enviada:', { statusCode: result.statusCode, headers: result.headers });
      return result.statusCode === 200;
    } catch (error: any) {
      console.error('❌ Error enviando notificación push:', error);
      if (error.statusCode === 410) {
        console.log('🔄 Suscripción expirada, marcando como inactiva');
        await this.markSubscriptionAsInactive(subscription.endpoint);
      }
      return false;
    }
  }

  async sendPushNotificationToMultiple(subscriptions: PushSubscription[], data: PushNotificationData): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      subscriptions.map(sub => this.sendPushNotification(sub, data))
    );
    
    const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - success;
    
    console.log(`📱 Notificaciones push enviadas: ${success} exitosas, ${failed} fallidas`);
    return { success, failed };
  }

  async sendPushNotificationToUser(userId: string | number, data: PushNotificationData): Promise<boolean> {
    try {
      const subscriptions = await strapi.db.query('api::push-subscription.push-subscription').findMany({
        where: { user: userId, isActive: true }
      });

      if (subscriptions.length === 0) {
        console.log(`⚠️ Usuario ${userId} no tiene suscripciones push activas`);
        return false;
      }

      const pushSubscriptions: PushSubscription[] = subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }));

      const result = await this.sendPushNotificationToMultiple(pushSubscriptions, data);
      return result.success > 0;
    } catch (error) {
      console.error('❌ Error enviando notificación push a usuario:', error);
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

      console.log(`📱 Notificaciones push enviadas a rol ${role}: ${totalSuccess} exitosas, ${totalFailed} fallidas`);
      return { success: totalSuccess, failed: totalFailed };
    } catch (error) {
      console.error('❌ Error enviando notificación push a rol:', error);
      return { success: 0, failed: 0 };
    }
  }

  private async markSubscriptionAsInactive(endpoint: string): Promise<void> {
    try {
      await strapi.db.query('api::push-subscription.push-subscription').updateMany({
        where: { endpoint },
        data: { isActive: false }
      });
      console.log('✅ Suscripción marcada como inactiva:', endpoint);
    } catch (error) {
      console.error('❌ Error marcando suscripción como inactiva:', error);
    }
  }

  async cleanupInactiveSubscriptions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await strapi.db.query('api::push-subscription.push-subscription').deleteMany({
        where: {
          isActive: false,
          updatedAt: { $lt: cutoffDate }
        }
      });

      console.log(`🗑️ ${result.count} suscripciones inactivas eliminadas`);
      return result.count;
    } catch (error) {
      console.error('❌ Error limpiando suscripciones inactivas:', error);
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
      console.error('❌ Error obteniendo estadísticas de suscripciones:', error);
      return { total: 0, active: 0, inactive: 0, byRole: {} };
    }
  }
} 