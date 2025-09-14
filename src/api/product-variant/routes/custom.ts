/**
 * custom product-variant routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/product-variants/product/:productId',
      handler: 'product-variant.findByProduct',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/product-variants/validate-purchase',
      handler: 'product-variant.validateForPurchase',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};
