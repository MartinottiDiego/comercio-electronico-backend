/**
 * custom product routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/products/popular',
      handler: 'product.getPopularProducts',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/products/featured',
      handler: 'product.getFeaturedProducts',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};

