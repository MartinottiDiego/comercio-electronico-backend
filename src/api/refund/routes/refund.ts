/**
 * refund router
 */

export default {
  routes: [
    // Rutas públicas para autenticados
    {
      method: 'POST',
      path: '/refunds/request',
      handler: 'refund.createRefundRequest',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    {
      method: 'GET',
      path: '/refunds/user',
      handler: 'refund.getUserRefunds',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    {
      method: 'GET',
      path: '/refunds/store/:storeId?',
      handler: 'refund.getStoreRefunds',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    {
      method: 'PUT',
      path: '/refunds/:id/status',
      handler: 'refund.updateRefundStatus',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    {
      method: 'POST',
      path: '/refunds/:id/process',
      handler: 'refund.processRefund',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    {
      method: 'GET',
      path: '/refunds/analytics',
      handler: 'refund.getRefundAnalytics',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    // Ruta de prueba para email (solo desarrollo)
    {
      method: 'POST',
      path: '/refunds/test-email',
      handler: 'refund.testEmail',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::refund.auth'], // Usar middleware personalizado
      },
    },
    // Ruta de prueba para verificar relaciones
    {
      method: 'GET',
      path: '/refunds/test-relations',
      handler: 'refund.testRefundRelations',
      config: {
        auth: false, // Sin autenticación para pruebas
        policies: [],
        middlewares: []
      }
    },
  ],
};
