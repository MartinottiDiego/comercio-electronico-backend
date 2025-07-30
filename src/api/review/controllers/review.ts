/**
 * review controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::review.review', ({ strapi }) => ({
  async create(ctx) {
    try {
      // Crear la reseña usando el controlador por defecto
      const result = await super.create(ctx);
      
      // Actualizar estadísticas del producto
      if (result.data && result.data.product) {
        try {
          const productId = result.data.product;
          
          // Obtener todas las reseñas del producto
          const reviews = await strapi.entityService.findMany('api::review.review', {
            filters: { product: productId },
            fields: ['rating']
          });
          
          // Calcular promedio de rating
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
          
          // Actualizar el producto con las nuevas estadísticas
          await strapi.entityService.update('api::product.product', productId, {
            data: {
              rating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
              reviewCount: reviews.length
            }
          });
          
          console.log(`✅ Producto ${productId} actualizado: rating=${averageRating}, count=${reviews.length}`);
        } catch (error) {
          console.error('⚠️ Error actualizando estadísticas del producto:', error);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error creando reseña:', error);
      throw error;
    }
  }
})); 