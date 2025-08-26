export default ({ strapi }: { strapi: Strapi }) => {
  // Registrar las rutas personalizadas
  strapi.server.routes([
    {
      method: 'POST',
      path: '/api/refunds/request',
      handler: 'refund.createRefundRequest',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/api/refunds/user',
      handler: 'refund.getUserRefunds',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/api/refunds/store/:storeId?',
      handler: 'refund.getStoreRefunds',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/api/refunds/:id/status',
      handler: 'refund.updateRefundStatus',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/api/refunds/:id/process',
      handler: 'refund.processRefund',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/api/refunds/analytics',
      handler: 'refund.getRefundAnalytics',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
  ]);
};



