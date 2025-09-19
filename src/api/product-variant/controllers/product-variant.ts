/**
 * product-variant controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product-variant.product-variant', ({ strapi }) => ({
  
  /**
   * Crear variante con validaciones
   */
  async create(ctx: any) {
    try {
      const { data } = ctx.request.body;
      
      // Validar que el producto existe
      if (data.product) {
        const product = await strapi.entityService.findOne('api::product.product', data.product, {
          populate: ['variants']
        });
        
        if (!product) {
          return ctx.badRequest('Producto no encontrado');
        }
        
        // Validar SKU único
        const existingVariant = await strapi.entityService.findMany('api::product-variant.product-variant', {
          filters: { sku: data.sku }
        });
        
        if (existingVariant.length > 0) {
          return ctx.badRequest('El SKU ya existe');
        }
        
        // Calcular availableStock
        data.availableStock = data.stock - (data.reservedStock || 0);
      }
      
      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          ...data,
          availableStock: data.stock - (data.reservedStock || 0)
        },
        populate: ['product', 'images']
      });
      
      // Actualizar stock total del producto si tiene variantes
      if ((variant as any).product) {
        await strapi.service('api::product.product').updateProductStock((variant as any).product.id || (variant as any).product);
      }
      
      return { data: variant };
    } catch (error) {
      console.error('Error creating product variant:', error);
      return ctx.internalServerError('Error interno creando variante');
    }
  },

  /**
   * Actualizar variante
   */
  async update(ctx: any) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      
      // Calcular availableStock
      data.availableStock = data.stock - (data.reservedStock || 0);
      
      const variant = await strapi.entityService.update('api::product-variant.product-variant', id, {
        data,
        populate: ['product', 'images']
      });
      
      // Actualizar stock total del producto
      if ((variant as any).product) {
        await strapi.service('api::product.product').updateProductStock((variant as any).product.id || (variant as any).product);
      }
      
      return { data: variant };
    } catch (error) {
      console.error('Error updating product variant:', error);
      return ctx.internalServerError('Error interno actualizando variante');
    }
  },

  /**
   * Eliminar variante
   */
  async delete(ctx: any) {
    try {
      const { id } = ctx.params;
      
      // Obtener la variante para saber a qué producto pertenece
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', id, {
        populate: ['product']
      });
      
      if (!variant) {
        return ctx.notFound('Variante no encontrada');
      }
      
      // Eliminar la variante
      await strapi.entityService.delete('api::product-variant.product-variant', id);
      
      // Actualizar stock total del producto
      if ((variant as any).product) {
        await strapi.service('api::product.product').updateProductStock((variant as any).product.id || (variant as any).product);
      }
      
      return { data: { id } };
    } catch (error) {
      console.error('Error deleting product variant:', error);
      return ctx.internalServerError('Error interno eliminando variante');
    }
  },

  /**
   * Obtener variantes de un producto
   */
  async findByProduct(ctx: any) {
    try {
      const { productId } = ctx.params;
      
      const variants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { product: productId as any },
        populate: ['product', 'images'],
        sort: { createdAt: 'asc' }
      });
      
      return { data: variants };
    } catch (error) {
      console.error('Error fetching product variants:', error);
      return ctx.internalServerError('Error interno obteniendo variantes');
    }
  },

  /**
   * Validar variante para compra
   */
  async validateForPurchase(ctx: any) {
    try {
      const { variantId, quantity } = ctx.request.body;
      
      const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId, {
        populate: ['product']
      });
      
      if (!variant) {
        return ctx.badRequest('Variante no encontrada');
      }
      
      if (!variant.isActive) {
        return ctx.badRequest('Variante no disponible');
      }
      
      if (variant.availableStock < quantity) {
        return ctx.badRequest(`Stock insuficiente. Disponible: ${variant.availableStock}, Solicitado: ${quantity}`);
      }
      
      return {
        data: {
          isValid: true,
          variant,
          availableStock: variant.availableStock,
          price: variant.price
        }
      };
    } catch (error) {
      console.error('Error validating variant for purchase:', error);
      return ctx.internalServerError('Error interno validando variante');
    }
  }
}));
