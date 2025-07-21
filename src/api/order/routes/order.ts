/**
 * order router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    {
      method: 'GET',
      path: '/orders/user/:userId',
      handler: 'order.getUserOrders',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/:id',
      handler: 'order.getOrderById',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 