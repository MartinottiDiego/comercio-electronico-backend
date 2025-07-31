/**
 * push-subscription controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::push-subscription.push-subscription', ({ strapi }) => ({
  async create(ctx) {
    try {
      const { subscription, userAgent } = ctx.request.body;
      
      if (!subscription || !subscription.endpoint) {
        return ctx.badRequest('Subscription data is required');
      }

      // Get current user
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('User not authenticated');
      }

      // Check if subscription already exists
      const existingSubscription = await strapi.db.query('api::push-subscription.push-subscription').findOne({
        where: { endpoint: subscription.endpoint, user: user.id }
      });

      if (existingSubscription) {
        // Update existing subscription
        const updated = await strapi.db.query('api::push-subscription.push-subscription').update({
          where: { id: existingSubscription.id },
          data: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent,
            isActive: true,
            lastUsed: new Date(),
            subscriptionData: subscription
          }
        });

        return ctx.send({ success: true, message: 'Subscription updated', data: updated });
      }

      // Create new subscription
      const newSubscription = await strapi.db.query('api::push-subscription.push-subscription').create({
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user: user.id,
          userAgent,
          isActive: true,
          lastUsed: new Date(),
          subscriptionData: subscription
        }
      });

      return ctx.send({ success: true, message: 'Subscription created', data: newSubscription });
    } catch (error) {
      console.error('Error creating push subscription:', error);
      return ctx.internalServerError('Error creating subscription');
    }
  },

  async delete(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('User not authenticated');
      }

      // Delete all subscriptions for the user
      await strapi.db.query('api::push-subscription.push-subscription').deleteMany({
        where: { user: user.id }
      });

      return ctx.send({ success: true, message: 'All subscriptions deleted' });
    } catch (error) {
      console.error('Error deleting push subscriptions:', error);
      return ctx.internalServerError('Error deleting subscriptions');
    }
  },

  async stats(ctx) {
    try {
      const PushNotificationService = require('../../../lib/services/push-notification-service').PushNotificationService;
      const stats = await PushNotificationService.getInstance().getSubscriptionStats();
      return ctx.send(stats);
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return ctx.internalServerError('Error getting stats');
    }
  }
})); 