/**
 * order router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::order.order', {
  config: {
    find: {
      policies: [],
      middlewares: [],
    },
    findOne: {
      policies: [],
      middlewares: [],
    },
    create: {
      policies: [],
      middlewares: [],
    },
    update: {
      policies: [],
      middlewares: [],
    },
    delete: {
      policies: [],
      middlewares: [],
    },
  },
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  except: [],
  prefix: '',
}); 