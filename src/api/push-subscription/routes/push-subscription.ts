/**
 * push-subscription router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::push-subscription.push-subscription', {
  config: {
    find: {
      auth: {
        scope: ['api::push-subscription.push-subscription.find']
      }
    },
    findOne: {
      auth: {
        scope: ['api::push-subscription.push-subscription.findOne']
      }
    },
    create: {
      auth: {
        scope: ['api::push-subscription.push-subscription.create']
      }
    },
    update: {
      auth: {
        scope: ['api::push-subscription.push-subscription.update']
      }
    },
    delete: {
      auth: {
        scope: ['api::push-subscription.push-subscription.delete']
      }
    },
  },
  only: ['find', 'findOne', 'create', 'update', 'delete'],
}); 