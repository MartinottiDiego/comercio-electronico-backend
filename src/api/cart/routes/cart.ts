export default {
  routes: [
    // Rutas estándar CRUD
    {
      method: 'GET',
      path: '/carts',
      handler: 'cart.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/carts',
      handler: 'cart.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/carts/:id',
      handler: 'cart.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/carts/:id',
      handler: 'cart.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Rutas personalizadas
    {
      method: 'POST',
      path: '/carts/migrate',
      handler: 'cart.migrate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/carts/clear',
      handler: 'cart.clear',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 