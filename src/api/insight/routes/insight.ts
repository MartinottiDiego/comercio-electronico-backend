export default {
  routes: [
    {
      method: 'POST',
      path: '/insights',
      handler: 'insight.createInsight',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/insights/generate/:storeId',
      handler: 'insight.generateInsights',
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
      handler: 'insight.getStoreInsights',
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
      handler: 'insight.markAsRead',
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
      handler: 'insight.markMultipleAsRead',
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
      handler: 'insight.getInsightsStats',
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
      handler: 'insight.cleanupOldInsights',
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
      path: '/insights/dashboard',
      handler: 'insight.getDashboardInsights',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/insights/admin/dashboard',
      handler: 'insight.getAdminDashboardInsights',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/insights/store/:storeId/dashboard',
      handler: 'insight.getStoreDashboardInsights',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
}; 