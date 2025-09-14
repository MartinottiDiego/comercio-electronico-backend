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
    },
    {
      method: 'POST',
      path: '/products/with-variants',
      handler: 'product.createWithVariants',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/products/:id/with-variants',
      handler: 'product.updateWithVariants',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};

