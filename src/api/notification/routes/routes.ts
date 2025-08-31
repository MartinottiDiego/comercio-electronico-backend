/**
 * Custom notification routes for Strapi v5
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'api::notification.notification.find'
    },
    {
      method: 'GET',
      path: '/notifications/:id',
      handler: 'api::notification.notification.findOne'
    },
    {
      method: 'POST',
      path: '/notifications',
      handler: 'api::notification.notification.create'
    },
    {
      method: 'PUT',
      path: '/notifications/:id',
      handler: 'api::notification.notification.update'
    },
    {
      method: 'DELETE',
      path: '/notifications/:id',
      handler: 'api::notification.notification.delete'
    },
    {
      method: 'POST',
      path: '/notifications/sync',
      handler: 'api::notification.notification.sync'
    }
  ]
};
