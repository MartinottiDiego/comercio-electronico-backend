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
  },

  // Sobrescribir create para actualizar estadísticas
  async create(params) {
    const result = await super.create(params);
    
    // Actualizar estadísticas del producto
    if (params.data?.product) {
      await this.updateProductStats(params.data.product);
    }
    
    return result;
  },

  // Sobrescribir update para actualizar estadísticas
  async update(params) {
    const result = await super.update(params);
    
    // Actualizar estadísticas del producto
    if (params.data?.product) {
      await this.updateProductStats(params.data.product);
    }
    
    return result;
  },

  // Sobrescribir delete para actualizar estadísticas
  async delete(params) {
    // Obtener el producto antes de eliminar
    const review = await strapi.entityService.findOne('api::review.review', params.id, { populate: ['product'] });
    const productId = (review as any)?.product?.id;
    
    const result = await super.delete(params);
    
    // Actualizar estadísticas del producto
    if (productId) {
      await this.updateProductStats(productId);
    }
    
    return result;
  }
})); 