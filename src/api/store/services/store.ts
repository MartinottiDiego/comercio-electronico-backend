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
  },

  // Nuevo método para obtener stores top-rated
  async getTopRated({ limit = 8, populate = 'image,products' }) {
    try {
      console.log('[StoresSlider] Iniciando getTopRated con límite:', limit);
      
      // Construir query para Strapi v5 - usar where en lugar de filters
      const query = {
        where: {
          rating: {
            $gt: 0, // Solo stores con rating > 0
          },
          verified: {
            $eq: true, // Solo stores verificados
          },
        },
        orderBy: {
          rating: 'desc', // Ordenar por rating descendente
        },
        limit,
        populate: {
          image: {
            fields: ['url', 'alternativeText', 'width', 'height'],
          },
          products: {
            fields: ['id', 'title'],
            limit: 5, // Solo primeros 5 productos para performance
          },
        },
      };

      console.log('[StoresSlider] Query construida:', JSON.stringify(query, null, 2));

      const stores = await strapi.db.query('api::store.store').findMany(query);
      
      console.log('[StoresSlider] Tiendas encontradas:', stores.length);
      if (stores.length > 0) {
        console.log('[StoresSlider] Primera tienda:', {
          id: stores[0].id,
          name: stores[0].name,
          rating: stores[0].rating,
          verified: stores[0].verified
        });
      }
      
      // Normalizar respuesta
      const normalizedStores = stores.map(store => ({
        id: store.id,
        attributes: {
          name: store.name,
          slug: store.slug,
          description: store.description,
          rating: store.rating,
          verified: store.verified,
          specialty: store.specialty,
          location: store.location,
          image: store.image,
          products: store.products,
        },
      }));

      console.log('[StoresSlider] Respuesta normalizada:', normalizedStores.length, 'tiendas');
      return normalizedStores;
    } catch (error) {
      console.error('[StoresSlider] Error in getTopRated service:', error);
      throw new Error('Error obteniendo tiendas destacadas');
    }
  },
}));
