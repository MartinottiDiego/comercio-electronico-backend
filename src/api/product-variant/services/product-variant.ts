/**
 * product-variant service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::product-variant.product-variant', ({ strapi }) => ({
  
  /**
   * Calcular stock disponible de una variante
   */
  async calculateAvailableStock(variantId: string | number): Promise<number> {
    try {
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId);
      
      if (!variant) {
        return 0;
      }
      
      return variant.stock - (variant.reservedStock || 0);
    } catch (error) {
      console.error('Error calculating available stock:', error);
      return 0;
    }
  },

  /**
   * Actualizar stock disponible de una variante
   */
  async updateAvailableStock(variantId: string | number): Promise<void> {
    try {
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId);
      
      if (variant) {
        const availableStock = variant.stock - (variant.reservedStock || 0);
        
        await strapi.entityService.update('api::product-variant.product-variant', variantId, {
          data: { availableStock }
        });
      }
    } catch (error) {
      console.error('Error updating available stock:', error);
    }
  },

  /**
   * Reservar stock de una variante
   */
  async reserveStock(variantId: string | number, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId);
      
      if (!variant) {
        return { success: false, error: 'Variante no encontrada' };
      }
      
      const currentReserved = variant.reservedStock || 0;
      const availableStock = variant.stock - currentReserved;
      
      if (availableStock < quantity) {
        return { 
          success: false, 
          error: `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${quantity}` 
        };
      }
      
      const newReservedStock = currentReserved + quantity;
      const newAvailableStock = variant.stock - newReservedStock;
      
      await strapi.entityService.update('api::product-variant.product-variant', variantId, {
        data: {
          reservedStock: newReservedStock,
          availableStock: newAvailableStock
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error reserving stock:', error);
      return { success: false, error: 'Error interno reservando stock' };
    }
  },

  /**
   * Liberar stock reservado de una variante
   */
  async releaseStock(variantId: string | number, quantity: number): Promise<void> {
    try {
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId);
      
      if (variant) {
        const currentReserved = variant.reservedStock || 0;
        const newReservedStock = Math.max(0, currentReserved - quantity);
        const newAvailableStock = variant.stock - newReservedStock;
        
        await strapi.entityService.update('api::product-variant.product-variant', variantId, {
          data: {
            reservedStock: newReservedStock,
            availableStock: newAvailableStock
          }
        });
      }
    } catch (error) {
      console.error('Error releasing stock:', error);
    }
  },

  /**
   * Confirmar stock reservado (convertir reserva en venta)
   */
  async confirmStock(variantId: string | number, quantity: number): Promise<void> {
    try {
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId);
      
      if (variant) {
        const currentReserved = variant.reservedStock || 0;
        const newReservedStock = Math.max(0, currentReserved - quantity);
        const newStock = variant.stock - quantity;
        const newAvailableStock = newStock - newReservedStock;
        
        await strapi.entityService.update('api::product-variant.product-variant', variantId, {
          data: {
            stock: newStock,
            reservedStock: newReservedStock,
            availableStock: newAvailableStock
          }
        });
        
        // Actualizar stock total del producto
        if ((variant as any).product) {
          await strapi.service('api::product.product').updateProductStock((variant as any).product.id || (variant as any).product);
        }
      }
    } catch (error) {
      console.error('Error confirming stock:', error);
    }
  },

  /**
   * Obtener todas las variantes de un producto
   */
  async getProductVariants(productId: string | number): Promise<any[]> {
    try {
      return await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { product: productId as any },
        populate: ['images'],
        sort: { createdAt: 'asc' }
      });
    } catch (error) {
      console.error('Error getting product variants:', error);
      return [];
    }
  },

  /**
   * Calcular stock total de un producto basado en sus variantes
   */
  async calculateProductTotalStock(productId: string | number): Promise<number> {
    try {
      const variants = await this.getProductVariants(productId);
      return variants.reduce((total, variant) => total + (variant.stock || 0), 0);
    } catch (error) {
      console.error('Error calculating product total stock:', error);
      return 0;
    }
  },

  /**
   * Validar que las variantes de un producto sean consistentes
   */
  async validateProductVariants(productId: string | number, expectedTotalStock?: number): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const variants = await this.getProductVariants(productId);
      const errors: string[] = [];
      
      // Verificar SKUs únicos
      const skus = variants.map(v => v.sku);
      const uniqueSkus = new Set(skus);
      if (skus.length !== uniqueSkus.size) {
        errors.push('SKUs duplicados encontrados en las variantes');
      }
      
      // Verificar que todas las variantes tengan atributos
      variants.forEach((variant, index) => {
        if (!variant.attributes || Object.keys(variant.attributes).length === 0) {
          errors.push(`Variante ${index + 1}: Atributos requeridos`);
        }
        if (!variant.sku || variant.sku.trim() === '') {
          errors.push(`Variante ${index + 1}: SKU requerido`);
        }
        if (variant.stock < 0) {
          errors.push(`Variante ${index + 1}: Stock no puede ser negativo`);
        }
      });
      
      // Verificar stock total si se proporciona
      if (expectedTotalStock !== undefined) {
        const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        if (totalStock !== expectedTotalStock) {
          errors.push(`Stock total inconsistente. Esperado: ${expectedTotalStock}, Calculado: ${totalStock}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating product variants:', error);
      return {
        isValid: false,
        errors: ['Error interno validando variantes']
      };
    }
  }
}));
