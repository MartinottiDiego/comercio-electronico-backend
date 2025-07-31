export default {
  routes: [
    {
      method: 'POST',
      path: '/insights/generate/:storeId',
      handler: 'insights.generateInsights',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/insights/store/:storeId',
      handler: 'insights.getStoreInsights',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/insights/:id/read',
      handler: 'insights.markAsRead',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/insights/mark-multiple-read',
      handler: 'insights.markMultipleAsRead',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/insights/stats/:storeId',
      handler: 'insights.getInsightsStats',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/insights/cleanup',
      handler: 'insights.cleanupOldInsights',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: []
      }
    }
  ]
}; 