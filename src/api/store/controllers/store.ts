/**
 * store controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::store.store', ({ strapi }) => ({
  // Método existente extendido
  async find(ctx) {
    // Lógica existente del core controller
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  // Nuevo método para top-rated stores
  async getTopRated(ctx) {
    try {
      console.log('[StoresSlider] Controller getTopRated iniciado');
      console.log('[StoresSlider] Query params:', ctx.query);
      
      const { limit = '8', populate = 'image,products' } = ctx.query;
      
      // Validar límite
      const validatedLimit = Math.min(Math.max(parseInt(limit as string) || 8, 1), 20);
      console.log('[StoresSlider] Límite validado:', validatedLimit);
      
      // Obtener stores top-rated
      const stores = await strapi.service('api::store.store').getTopRated({
        limit: validatedLimit,
        populate: populate as string,
      });

      console.log('[StoresSlider] Stores obtenidos del service:', stores.length);

      const response = {
        data: stores,
        meta: {
          pagination: {
            page: 1,
            pageSize: validatedLimit,
            pageCount: 1,
            total: stores.length,
          },
        },
      };

      console.log('[StoresSlider] Respuesta final:', {
        totalStores: stores.length,
        meta: response.meta
      });

      return response;
    } catch (error) {
      console.error('[StoresSlider] Error en controller getTopRated:', error);
      return ctx.internalServerError('Error obteniendo tiendas destacadas');
    }
  },
}));
