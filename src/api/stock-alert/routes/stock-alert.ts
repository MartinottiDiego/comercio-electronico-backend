/**
 * Custom stock-alert routes for Strapi v5
 */

export default {
  routes: [
    // Rutas CRUD estándar
    {
      method: 'GET',
      path: '/stock-alerts',
      handler: 'api::stock-alert.stock-alert.find'
    },
    {
      method: 'GET',
      path: '/stock-alerts/:id',
      handler: 'api::stock-alert.stock-alert.findOne'
    },
    {
      method: 'POST',
      path: '/stock-alerts',
      handler: 'api::stock-alert.stock-alert.create'
    },
    {
      method: 'PUT',
      path: '/stock-alerts/:id',
      handler: 'api::stock-alert.stock-alert.update'
    },
    {
      method: 'DELETE',
      path: '/stock-alerts/:id',
      handler: 'api::stock-alert.stock-alert.delete'
    },
    
    // Rutas personalizadas
    {
      method: 'GET',
      path: '/stock-alerts/store/:storeId',
      handler: 'api::stock-alert.stock-alert.getStoreAlerts'
    },
    {
      method: 'POST',
      path: '/stock-alerts/check-all',
      handler: 'api::stock-alert.stock-alert.checkAllStock'
    },
    {
      method: 'POST',
      path: '/stock-alerts/check-product/:productId',
      handler: 'api::stock-alert.stock-alert.checkProductStock'
    },
    {
      method: 'PUT',
      path: '/stock-alerts/:id/acknowledge',
      handler: 'api::stock-alert.stock-alert.acknowledgeAlert'
    },
    {
      method: 'PUT',
      path: '/stock-alerts/:id/dismiss',
      handler: 'api::stock-alert.stock-alert.dismissAlert'
    },
    {
      method: 'GET',
      path: '/stock-alerts/store/:storeId/stats',
      handler: 'api::stock-alert.stock-alert.getStockAlertStats'
    }
  ]
};

