/**
 * notification router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::notification.notification', {
  config: {
    find: {
      auth: {
        scope: ['api::notification.notification.find']
      }
    },
    findOne: {
      auth: {
        scope: ['api::notification.notification.findOne']
      }
    },
    create: {
      auth: {
        scope: ['api::notification.notification.create']
      }
    },
    update: {
      auth: {
        scope: ['api::notification.notification.update']
      }
    },
    delete: {
      auth: {
        scope: ['api::notification.notification.delete']
      }
    },
  },
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  except: [],
  prefix: '',
}); 