/**
 * product router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Rutas básicas de Strapi
    {
      method: 'GET',
      path: '/products',
      handler: 'product.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/products/:id',
      handler: 'product.findOne',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/products',
      handler: 'product.create',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/products/:id',
      handler: 'product.update',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/products/:id',
      handler: 'product.delete',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    
    // Rutas personalizadas
    {
      method: 'POST',
      path: '/products/with-variants',
      handler: 'product.createProductWithVariants',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/products/store/:storeId',
      handler: 'product.getStoreProducts',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/products/:id/with-variants',
      handler: 'product.updateProductWithVariants',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
