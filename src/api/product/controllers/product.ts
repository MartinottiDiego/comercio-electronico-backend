/**
 * product controller
 */

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  /**
   * Crear producto con variantes
   */
  async createProductWithVariants(ctx: Context) {
    try {
      const { productData, variants } = ctx.request.body;

      // Validar datos del producto
      if (!productData.name || !productData.description || !productData.price) {
        return ctx.badRequest('Datos del producto incompletos');
      }

      // Validar variantes si existen
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          if (!variant.sku || !variant.name || !variant.price || !variant.stock) {
            return ctx.badRequest('Datos de variante incompletos');
          }
        }
      }

      // Crear el producto base
      const productPayload = {
        data: {
          ...productData,
          hasVariants: variants && variants.length > 0,
          active: false, // Producto inactivo hasta aprobación
          verified: false,
        }
      };

      const product = await strapi.entityService.create('api::product.product', productPayload);

      // Crear variantes si existen
      if (variants && variants.length > 0) {
        for (const variantData of variants) {
          const variantPayload = {
            data: {
              ...variantData,
              product: product.id,
              availableStock: variantData.stock,
            }
          };

          await strapi.entityService.create('api::product-variant.product-variant', variantPayload);
        }
      }

      // Obtener el producto con variantes populadas
      const productWithVariants = await strapi.entityService.findOne('api::product.product', product.id, {
        populate: {
          variants: true,
          category: true,
          store: true,
          images: true,
          thumbnail: true
        }
      });

      ctx.body = {
        success: true,
        data: productWithVariants
      };
    } catch (error) {
      console.error('Error creating product with variants:', error);
      ctx.throw(500, 'Error al crear el producto');
    }
  },

  /**
   * Obtener productos de una tienda específica
   */
  async getStoreProducts(ctx: Context) {
    try {
      const { storeId } = ctx.params;

      if (!storeId) {
        return ctx.badRequest('Store ID is required');
      }

      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          store: {
            id: {
              $eq: storeId
            }
          }
        },
        populate: {
          variants: true,
          category: true,
          images: true,
          thumbnail: true
        },
        sort: { createdAt: 'desc' }
      });

      ctx.body = {
        success: true,
        data: products
      };
    } catch (error) {
      console.error('Error getting store products:', error);
      ctx.throw(500, 'Error al obtener productos');
    }
  },

  /**
   * Actualizar producto con variantes
   */
  async updateProductWithVariants(ctx: Context) {
    try {
      const { id } = ctx.params;
      const { productData, variants } = ctx.request.body;

      if (!id) {
        return ctx.badRequest('Product ID is required');
      }

      // Actualizar producto base
      const productPayload = {
        data: {
          ...productData,
          hasVariants: variants && variants.length > 0,
        }
      };

      await strapi.entityService.update('api::product.product', id, productPayload);

      // Actualizar variantes si existen
      if (variants && variants.length > 0) {
        // Eliminar variantes existentes
        const existingVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
          filters: {
            product: {
              id: {
                $eq: id
              }
            }
          }
        });

        for (const variant of existingVariants) {
          await strapi.entityService.delete('api::product-variant.product-variant', variant.id);
        }

        // Crear nuevas variantes
        for (const variantData of variants) {
          const variantPayload = {
            data: {
              ...variantData,
              product: id,
              availableStock: variantData.stock,
            }
          };

          await strapi.entityService.create('api::product-variant.product-variant', variantPayload);
        }
      }

      // Obtener producto actualizado
      const updatedProduct = await strapi.entityService.findOne('api::product.product', id, {
        populate: {
          variants: true,
          category: true,
          store: true,
          images: true,
          thumbnail: true
        }
      });

      ctx.body = {
        success: true,
        data: updatedProduct
      };
    } catch (error) {
      console.error('Error updating product with variants:', error);
      ctx.throw(500, 'Error al actualizar el producto');
    }
  }
}));
