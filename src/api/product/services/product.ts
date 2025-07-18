/**
 * product service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  // Método para recalcular rating y reviewCount de un producto
  async updateProductStats(productId: string) {
    try {
      // Obtener todas las reviews aprobadas del producto
      const reviews = await strapi.entityService.findMany('api::review.review', {
        filters: {
          product: { id: productId },
          status: 'approved'
        },
        fields: ['rating']
      });

      // Calcular estadísticas
      const totalReviews = reviews.length;
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating as any), 0);
      const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

      // Actualizar el producto
      await strapi.entityService.update('api::product.product', productId, {
        data: {
          rating: Math.round(averageRating * 10) / 10,
          reviewCount: totalReviews
        } as any
      });

      strapi.log.info(`✅ Updated product ${productId}: rating=${averageRating}, count=${totalReviews}`);
    } catch (error) {
      strapi.log.error(`❌ Error updating product stats for ${productId}:`, error);
    }
  },

  // Sobrescribir el método create para incluir estadísticas iniciales
  async create(params) {
    const result = await super.create(params);
    // Inicializar estadísticas
    await this.updateProductStats(result.id);
    return result;
  },

  // Sobrescribir el método update
  async update(params) {
    const result = await super.update(params);
    // Recalcular estadísticas si es necesario
    await this.updateProductStats(params.id);
    return result;
  }
}));
