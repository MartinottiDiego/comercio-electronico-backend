/**
 * Custom notification routes for Strapi v5
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/notifications/sync',
      handler: 'api::notification.notification.sync',
      config: {
        auth: {
          scope: ['api::notification.notification.find']
        }
      }
    }
  ]
};
