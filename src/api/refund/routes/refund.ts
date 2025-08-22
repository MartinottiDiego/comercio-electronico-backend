/**
 * refund router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Rutas públicas para autenticados
    {
      method: 'POST',
      path: '/refunds/request',
      handler: 'refund.createRefundRequest',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/refunds/user',
      handler: 'refund.getUserRefunds',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/refunds/store/:storeId?',
      handler: 'refund.getStoreRefunds',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/refunds/:id/status',
      handler: 'refund.updateRefundStatus',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/refunds/:id/process',
      handler: 'refund.processRefund',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/refunds/analytics',
      handler: 'refund.getRefundAnalytics',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 