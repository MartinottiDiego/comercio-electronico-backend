/**
 * store service
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::store.store', ({ strapi }) => ({
  async getStoreOwnerEmail(storeId: number): Promise<string | null> {
    try {
      const store = await strapi.db.query('api::store.store').findOne({
        where: { id: storeId },
        populate: {
          owner: {
            fields: ['email']
          }
        }
      });

      if (store && store.owner) {
        return store.owner.email;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo email del dueño de la tienda:', error);
      return null;
    }
  },

  async getStoreOwnerByEmail(ownerEmail: string): Promise<any | null> {
    try {
      const store = await strapi.db.query('api::store.store').findOne({
        where: {
          owner: {
            email: ownerEmail
          }
        },
        populate: {
          owner: {
            fields: ['id', 'email', 'username']
          }
        }
      });

      return store;
    } catch (error) {
      console.error('Error obteniendo tienda por email del dueño:', error);
      return null;
    }
  }
}));
