/**
 * product controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  async getPopularProducts(ctx: any) {
    try {
      const { limit = '10' } = ctx.query;

      // Obtener productos populares basados en rating y reviewCount
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          stock: { $gt: 0 },
          rating: { $gte: 3 },
          publishedAt: { $notNull: true }
        },
        populate: ['Media', 'thumbnail', 'categories', 'store'],
        sort: [
          { rating: 'desc' },
          { reviewCount: 'desc' },
          { createdAt: 'desc' }
        ],
        limit: parseInt(limit as string)
      });

      // Si no hay suficientes productos con rating alto, obtener los más recientes
      if (products.length < parseInt(limit as string)) {
        const additionalProducts = await strapi.entityService.findMany('api::product.product', {
          filters: {
            stock: { $gt: 0 },
            publishedAt: { $notNull: true },
            id: { $notIn: products.map((p: any) => p.id) }
          },
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit as string) - products.length
        });
        products.push(...additionalProducts);
      }

      // Transformar los productos para que sean compatibles con el frontend
      const transformedProducts = products.map((product: any) => {
        // Manejar imágenes correctamente
        let images: any[] = [];
        if (product.Media && product.Media.url) {
          images.push({
            id: product.Media.id || 1,
            url: product.Media.url,
            alternativeText: product.Media.alternativeText || product.title || 'Producto'
          });
        } else if (product.thumbnail && product.thumbnail.url) {
          images.push({
            id: product.thumbnail.id || 1,
            url: product.thumbnail.url,
            alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
          });
        }

        return {
          id: product.id,
          title: product.title || `Producto ${product.id}`,
          description: product.description || '',
          price: product.price || 0,
          slug: product.slug || `producto-${product.id}`,
          images: images,
          category: product.categories && product.categories.length > 0 ? {
            id: product.categories[0].id,
            name: product.categories[0].name
          } : null,
          store: product.store ? {
            id: product.store.id,
            name: product.store.name
          } : null,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0
        };
      });

      ctx.body = {
        data: transformedProducts,
        message: {
          title: "Productos más populares",
          subtitle: "Los mejor valorados por nuestros clientes"
        },
        count: transformedProducts.length
      };
    } catch (error) {
      console.error('Error in getPopularProducts:', error);
      ctx.internalServerError('Error getting popular products');
    }
  },

  async getFeaturedProducts(ctx: any) {
    try {
      const { limit = '10' } = ctx.query;

      // Obtener productos destacados (con rating alto y en stock)
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          stock: { $gt: 0 },
          rating: { $gte: 4 },
          publishedAt: { $notNull: true }
        },
        populate: ['Media', 'thumbnail', 'categories', 'store'],
        sort: [
          { rating: 'desc' },
          { reviewCount: 'desc' }
        ],
        limit: parseInt(limit as string)
      });

      // Transformar los productos
      const transformedProducts = products.map((product: any) => {
        let images: any[] = [];
        if (product.Media && product.Media.url) {
          images.push({
            id: product.Media.id || 1,
            url: product.Media.url,
            alternativeText: product.Media.alternativeText || product.title || 'Producto'
          });
        } else if (product.thumbnail && product.thumbnail.url) {
          images.push({
            id: product.thumbnail.id || 1,
            url: product.thumbnail.url,
            alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
          });
        }

        return {
          id: product.id,
          title: product.title || `Producto ${product.id}`,
          description: product.description || '',
          price: product.price || 0,
          slug: product.slug || `producto-${product.id}`,
          images: images,
          category: product.categories && product.categories.length > 0 ? {
            id: product.categories[0].id,
            name: product.categories[0].name
          } : null,
          store: product.store ? {
            id: product.store.id,
            name: product.store.name
          } : null,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0
        };
      });

      ctx.body = {
        data: transformedProducts,
        message: {
          title: "Productos destacados",
          subtitle: "Nuestra selección premium"
        },
        count: transformedProducts.length
      };
    } catch (error) {
      console.error('Error in getFeaturedProducts:', error);
      ctx.internalServerError('Error getting featured products');
    }
  },

  /**
   * Crear producto con variantes
   */
  async createWithVariants(ctx: any) {
    try {
      const { productData, variants } = ctx.request.body;


      if (!productData) {
        return ctx.badRequest('Datos del producto requeridos');
      }

      // Validar datos del producto
      if (!productData.title || !productData.description || productData.price === undefined) {
        return ctx.badRequest('Título, descripción y precio son requeridos');
      }

      // Si tiene variantes, validar que todas tengan los campos requeridos
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          if (!variant.sku || !variant.name || variant.price === undefined || variant.stock === undefined) {
            return ctx.badRequest('Todas las variantes deben tener SKU, nombre, precio y stock');
          }
        }

        // Validar SKUs únicos
        const skus = variants.map((v: any) => v.sku);
        const uniqueSkus = new Set(skus);
        if (skus.length !== uniqueSkus.size) {
          return ctx.badRequest('Los SKUs de las variantes deben ser únicos');
        }
      }

      // Crear el producto con variantes usando el service
      const result = await strapi.service('api::product.product').createProductWithVariants(
        productData,
        variants || []
      );

      return {
        data: result,
        message: 'Producto creado exitosamente'
      };
    } catch (error) {
      console.error('Error creating product with variants:', error);
      return ctx.internalServerError('Error interno creando producto con variantes');
    }
  },

  /**
   * Actualizar producto con variantes
   */
  async updateWithVariants(ctx: any) {
    try {
      const { id } = ctx.params;
      const { productData, variants } = ctx.request.body;

      if (!productData) {
        return ctx.badRequest('Datos del producto requeridos');
      }

      // Verificar que el producto existe
      const existingProduct = await strapi.entityService.findOne('api::product.product', id);
      if (!existingProduct) {
        return ctx.notFound('Producto no encontrado');
      }

      // Si tiene variantes, validar que todas tengan los campos requeridos
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          if (!variant.sku || !variant.name || variant.price === undefined || variant.stock === undefined) {
            return ctx.badRequest('Todas las variantes deben tener SKU, nombre, precio y stock');
          }
        }

        // Validar SKUs únicos
        const skus = variants.map((v: any) => v.sku);
        const uniqueSkus = new Set(skus);
        if (skus.length !== uniqueSkus.size) {
          return ctx.badRequest('Los SKUs de las variantes deben ser únicos');
        }
      }

      // Actualizar el producto con variantes usando el service
      const result = await strapi.service('api::product.product').updateProductWithVariants(
        id,
        productData,
        variants || []
      );

      return {
        data: result,
        message: 'Producto actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error updating product with variants:', error);
      return ctx.internalServerError('Error interno actualizando producto con variantes');
    }
  }
}));
