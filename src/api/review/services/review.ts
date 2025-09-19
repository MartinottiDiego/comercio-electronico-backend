/**
 * review service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::review.review', ({ strapi }) => ({
  // Método para actualizar estadísticas del producto después de cambios en reviews
  async updateProductStats(productId: string) {
    try {
      const productService = strapi.service('api::product.product');
      await productService.updateProductStats(productId);
    } catch (error) {
      strapi.log.error('Error updating product stats:', error);
    }
  }
}));