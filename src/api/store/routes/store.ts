/**
 * store router
 */

export default {
  routes: [
    // Ruta para top-rated stores
    {
      method: 'GET',
      path: '/stores/top-rated',
      handler: 'store.getTopRated',
      config: {
        auth: false, // Endpoint público
        policies: ['api::store.ensure-public-access'],
        middlewares: ['api::store.normalize-store-response'],
        description: 'Obtiene las tiendas con mayor rating para el slider del home',
        tag: {
          plugin: 'store',
          name: 'Top Rated Stores',
          actionType: 'find',
        },
      },
    },
  ],
};
