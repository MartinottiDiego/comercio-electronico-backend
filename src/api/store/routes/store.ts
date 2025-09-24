/**
 * store router
 */

export default {
  routes: [
    // Rutas CRUD básicas
    {
      method: 'GET',
      path: '/stores',
      handler: 'store.find',
      config: {
        auth: false,
        description: 'Obtiene todas las tiendas',
        tag: {
          plugin: 'store',
          name: 'Stores',
          actionType: 'find',
        },
      },
    },
    // Ruta para top-rated stores (debe ir antes de /stores/:id)
    {
      method: 'GET',
      path: '/stores/top-rated',
      handler: 'store.getTopRated',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/stores/:id',
      handler: 'store.findOne',
      config: {
        auth: false,
        description: 'Obtiene una tienda por ID',
        tag: {
          plugin: 'store',
          name: 'Store',
          actionType: 'findOne',
        },
      },
    },
    {
      method: 'POST',
      path: '/stores',
      handler: 'store.create',
      config: {
        auth: false,
        description: 'Crea una nueva tienda',
        tag: {
          plugin: 'store',
          name: 'Store',
          actionType: 'create',
        },
      },
    },
    {
      method: 'PUT',
      path: '/stores/:id',
      handler: 'store.update',
      config: {
        auth: false,
        description: 'Actualiza una tienda',
        tag: {
          plugin: 'store',
          name: 'Store',
          actionType: 'update',
        },
      },
    },
    {
      method: 'DELETE',
      path: '/stores/:id',
      handler: 'store.delete',
      config: {
        auth: false,
        description: 'Elimina una tienda',
        tag: {
          plugin: 'store',
          name: 'Store',
          actionType: 'delete',
        },
      },
    },
    // Rutas para gestión de estados de tiendas
    {
      method: 'PUT',
      path: '/stores/:id/approve',
      handler: 'store.approveStore',
      config: {
        auth: false,
        description: 'Aprueba una tienda',
        tag: {
          plugin: 'store',
          name: 'Store Management',
          actionType: 'update',
        },
      },
    },
    {
      method: 'PUT',
      path: '/stores/:id/reject',
      handler: 'store.rejectStore',
      config: {
        auth: false,
        description: 'Rechaza una tienda',
        tag: {
          plugin: 'store',
          name: 'Store Management',
          actionType: 'update',
        },
      },
    },
    {
      method: 'PUT',
      path: '/stores/:id/block',
      handler: 'store.blockStore',
      config: {
        auth: false,
        description: 'Bloquea una tienda',
        tag: {
          plugin: 'store',
          name: 'Store Management',
          actionType: 'update',
        },
      },
    },
    // ===== NUEVAS RUTAS PARA GESTIÓN DE TIENDA =====
    {
      method: 'GET',
      path: '/stores/:id/products',
      handler: 'store.getStoreProducts',
      config: {
        auth: false, // Sin autenticación por ahora
        description: 'Obtiene productos de una tienda específica',
        tag: {
          plugin: 'store',
          name: 'Store Products',
          actionType: 'find',
        },
      },
    },
    {
      method: 'GET',
      path: '/stores/:id/orders',
      handler: 'store.getStoreOrders',
      config: {
        auth: false, // Sin autenticación por ahora
        description: 'Obtiene pedidos de una tienda específica',
        tag: {
          plugin: 'store',
          name: 'Store Orders',
          actionType: 'find',
        },
      },
    },
    {
      method: 'GET',
      path: '/stores/:id/analytics',
      handler: 'store.getStoreAnalytics',
      config: {
        auth: false, // Sin autenticación por ahora
        description: 'Obtiene analytics de una tienda específica',
        tag: {
          plugin: 'store',
          name: 'Store Analytics',
          actionType: 'find',
        },
      },
    },
    {
      method: 'GET',
      path: '/stores/:id/notifications',
      handler: 'store.getStoreNotifications',
      config: {
        auth: false, // Sin autenticación por ahora
        description: 'Obtiene notificaciones de una tienda específica',
        tag: {
          plugin: 'store',
          name: 'Store Notifications',
          actionType: 'find',
        },
      },
    },
    {
      method: 'GET',
      path: '/stores/:id/reviews',
      handler: 'store.getStoreReviews',
      config: {
        auth: false, // Sin autenticación por ahora
        description: 'Obtiene reseñas de productos de una tienda específica',
        tag: {
          plugin: 'store',
          name: 'Store Reviews',
          actionType: 'find',
        },
      },
    },
  ],
};
