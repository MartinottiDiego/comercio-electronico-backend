/**
 * product-variant API
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/product-variants',
      handler: 'product-variant.find',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/product-variants/:id',
      handler: 'product-variant.findOne',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/product-variants',
      handler: 'product-variant.create',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/product-variants/:id',
      handler: 'product-variant.update',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/product-variants/:id',
      handler: 'product-variant.delete',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};
