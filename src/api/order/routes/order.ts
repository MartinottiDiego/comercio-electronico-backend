/**
 * order router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Ruta personalizada para obtener órdenes del usuario
    {
      method: 'GET',
      path: '/orders/user',
      handler: 'order.getUserOrders',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    // Ruta personalizada para obtener una orden específica
    {
      method: 'GET',
      path: '/orders/:documentId/detail',
      handler: 'order.getOrderById',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    // Rutas estándar de Strapi
    {
      method: 'GET',
      path: '/orders',
      handler: 'order.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/:documentId',
      handler: 'order.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/orders',
      handler: 'order.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:documentId',
      handler: 'order.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/orders/:documentId',
      handler: 'order.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ]
}; 