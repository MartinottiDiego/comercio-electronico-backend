/**
 * product-variant router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product-variant.product-variant', {
  config: {
    find: {
      middlewares: []
    },
    findOne: {
      middlewares: []
    },
    create: {
      middlewares: []
    },
    update: {
      middlewares: []
    },
    delete: {
      middlewares: []
    }
  }
});
