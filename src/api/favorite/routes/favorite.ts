export default {
  routes: [
    // Rutas estándar CRUD
    {
      method: 'GET',
      path: '/favorites',
      handler: 'favorite.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/favorites',
      handler: 'favorite.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/favorites/:id',
      handler: 'favorite.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Rutas personalizadas
    {
      method: 'POST',
      path: '/favorites/delete-by-product',
      handler: 'favorite.deleteByProduct',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/favorites/check',
      handler: 'favorite.check',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/favorites/migrate',
      handler: 'favorite.migrate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/favorites/clear',
      handler: 'favorite.clear',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 