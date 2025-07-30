export default {
  routes: [
    {
      method: 'GET',
      path: '/recommendations',
      handler: 'index.getRecommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/recommendations/track',
      handler: 'index.trackBehavior',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/cart',
      handler: 'index.getCartRecommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/product',
      handler: 'index.getProductRecommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/category',
      handler: 'index.getCategoryRecommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/home',
      handler: 'index.getHomeRecommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/recommendations/checkout',
      handler: 'index.getCheckoutRecommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/recommendations/cache',
      handler: 'index.clearCache',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
}; 