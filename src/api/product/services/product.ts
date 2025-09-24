/**
 * product service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  // Método para validar un producto antes de la compra
  async validateProduct(productId: string | number, variantId?: string | number, quantity: number = 1) {
    try {
      // Obtener el producto
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['thumbnail', 'Media', 'store', 'categories', 'variants']
      });

      if (!product) {
        return {
          isValid: false,
          error: 'Producto no encontrado'
        };
      }

      // Si tiene variantes, validar la variante específica
      if (product.hasVariants && variantId) {
        const variant = await strapi.entityService.findOne('api::product-variant.product-variant', variantId, {
          populate: ['product']
        });

        if (!variant) {
          return {
            isValid: false,
            error: 'Variante no encontrada'
          };
        }

        if (!variant.isActive) {
          return {
            isValid: false,
            error: 'Variante no disponible'
          };
        }

        if (variant.availableStock < quantity) {
          return {
            isValid: false,
            error: `Stock insuficiente. Disponible: ${variant.availableStock}, Solicitado: ${quantity}`
          };
        }

        return {
          isValid: true,
          product,
          price: variant.price,
          variant: variant
        };
      } else if (product.hasVariants && !variantId) {
        return {
          isValid: false,
          error: 'Este producto requiere selección de variante'
        };
      } else {
        // Producto sin variantes
        if (product.stock < quantity) {
          return {
            isValid: false,
            error: `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`
          };
        }

        return {
          isValid: true,
          product,
          price: product.price,
          variant: null
        };
      }

      // Verificar que el producto esté publicado
      if (!product.publishedAt) {
        return {
          isValid: false,
          error: 'Producto no disponible'
        };
      }
    } catch (error) {
      console.error('Error validando producto:', error);
      return {
        isValid: false,
        error: 'Error interno validando producto'
      };
    }
  },

  // Método para reservar stock temporalmente
  async reserveStock(productId: string | number, variantId: string | number | null, quantity: number, sessionId: string, userId?: string) {
    try {
      // Por ahora, simplemente verificamos que hay stock disponible
      // En una implementación real, aquí crearías una reserva temporal
      const product = await strapi.entityService.findOne('api::product.product', productId);
      
      if (!product) {
        return {
          success: false,
          error: 'Producto no encontrado'
        };
      }

      if (product.stock < quantity) {
        return {
          success: false,
          error: `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`
        };
      }

      // Generar un ID de reserva temporal
      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      return {
        success: true,
        reservationId,
        message: 'Stock reservado temporalmente'
      };
    } catch (error) {
      console.error('Error reservando stock:', error);
      return {
        success: false,
        error: 'Error interno reservando stock'
      };
    }
  },

  /**
   * Actualizar stock de un producto por compra/reembolso
   */
  async updateProductStockByTransaction(productId: string | number, quantityChange: number, operation: 'decrease' | 'increase' = 'decrease'): Promise<{ success: boolean; newStock?: number; error?: string }> {
    try {
      // Buscar producto por documentId primero, luego por id
      let product = null;
      
      if (typeof productId === 'string' && productId.length > 10) {
        // Es un documentId
        const productsByDocumentId = await strapi.db.query('api::product.product').findMany({
          where: { documentId: productId },
          limit: 1
        });
        
        if (productsByDocumentId.length > 0) {
          product = productsByDocumentId[0];
        }
      }
      
      if (!product) {
        // Buscar por id numérico
        product = await strapi.entityService.findOne('api::product.product', productId);
      }
      
      if (!product) {
        return {
          success: false,
          error: 'Producto no encontrado'
        };
      }
      
      const currentStock = product.stock || 0;
      let newStock: number;
      
      if (operation === 'decrease') {
        newStock = currentStock - quantityChange;
        if (newStock < 0) {
          return {
            success: false,
            error: `Stock insuficiente. Disponible: ${currentStock}, Solicitado: ${quantityChange}`
          };
        }
      } else {
        newStock = currentStock + quantityChange;
      }
      
      // Actualizar el stock del producto
      await strapi.entityService.update('api::product.product', product.id, {
        data: { stock: newStock }
      });
      
      console.log(`Stock actualizado para producto ${productId}: ${currentStock} -> ${newStock} (${operation} ${quantityChange})`);
      
      return {
        success: true,
        newStock: newStock
      };
    } catch (error) {
      console.error('Error actualizando stock:', error);
      return {
        success: false,
        error: 'Error interno actualizando stock'
      };
    }
  },

  async releaseStockReservation(reservationId: string): Promise<void> {
    try {
      const reservation = await strapi.entityService.findOne('api::stock-reservation.stock-reservation', reservationId);
      
      if (reservation) {
        // Liberar el stock reservado
        await strapi.entityService.update('api::product.product', (reservation as any).product.id, {
          data: {
            stock: (reservation as any).product.stock + reservation.quantity
          }
        });

        // Eliminar la reserva
        await strapi.entityService.delete('api::stock-reservation.stock-reservation', reservationId);
      }
    } catch (error) {
      console.error('Error releasing stock reservation:', error);
    }
  },

  async confirmStockReservation(reservationId: string): Promise<void> {
    try {
      const reservation = await strapi.entityService.findOne('api::stock-reservation.stock-reservation', reservationId);
      
      if (reservation) {
        // Marcar la reserva como confirmada
        await strapi.entityService.update('api::stock-reservation.stock-reservation', reservationId, {
          data: {
            status: 'pending' as any
          }
        });
      }
    } catch (error) {
      console.error('Error confirming stock reservation:', error);
    }
  },

  async cleanupExpiredReservations(): Promise<void> {
    try {
      const now = new Date();
      const expiredReservations = await strapi.entityService.findMany('api::stock-reservation.stock-reservation', {
        filters: {
          expiresAt: { $lt: now },
          status: 'pending' as any
        }
      });

      for (const reservation of expiredReservations) {
        await this.releaseStockReservation(reservation.id.toString());
      }
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }
  },

  // Método para actualizar el stock total de un producto basado en sus variantes
  async updateProductStock(productId: string | number): Promise<void> {
    try {
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['variants']
      });

      if (!product) {
        return;
      }

      // Si el producto tiene variantes, calcular el stock total
      if (product.hasVariants && (product as any).variants && (product as any).variants.length > 0) {
        const totalStock = (product as any).variants.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0);
        
        // Actualizar el stock del producto principal
        await strapi.entityService.update('api::product.product', productId, {
          data: { stock: totalStock }
        });
      }
    } catch (error) {
      console.error('Error updating product stock:', error);
    }
  },

  // Método para crear producto con variantes
  async createProductWithVariants(productData: any, variantsData: any[]): Promise<any> {
    try {
      // Generar SKU automático para el producto principal si no se proporciona
      let productSKU = productData.sku || this.generateProductSKU(productData.title);
      
      // Verificar si el SKU ya existe y generar uno nuevo si es necesario
      let attempts = 0;
      while (attempts < 5) {
        const existingProduct = await strapi.entityService.findMany('api::product.product', {
          filters: { sku: productSKU },
          limit: 1
        });
        
        if (existingProduct.length === 0) {
          break; // SKU único encontrado
        }
        
        // Generar nuevo SKU
        productSKU = this.generateProductSKU(productData.title);
        attempts++;
      }

      // 1. Separar campos de media del resto de datos
      const { Media, thumbnail, ...productDataWithoutMedia } = productData;

      // 2. Crear el producto principal sin campos de media
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          ...productDataWithoutMedia,
          sku: productSKU,
          hasVariants: variantsData.length > 0
        }
      });

      // 3. Actualizar el producto con las relaciones de media si existen
      const updateData: any = {};
      
      // Filtrar imágenes vacías
      if (Media && Media.length > 0) {
        const validMedia = Media.filter((mediaId: any) => mediaId && mediaId.toString().trim() !== '');
        if (validMedia.length > 0) {
          updateData.Media = validMedia;
        }
      }
      
      if (thumbnail && thumbnail.toString().trim() !== '') {
        updateData.thumbnail = thumbnail;
      }

      // Solo actualizar si hay datos válidos
      if (Object.keys(updateData).length > 0) {
        await strapi.entityService.update('api::product.product', product.id, {
          data: updateData
        });

      }

      // 4. Obtener el producto final con todas las relaciones
      const finalProduct = await strapi.entityService.findOne('api::product.product', product.id, {
        populate: {
          Media: true,
          thumbnail: true,
          categories: true
        }
      });

      // 2. Crear las variantes si existen
      if (variantsData.length > 0) {
        const createdVariants = [];
        
        for (const variantData of variantsData) {
          const variant = await strapi.entityService.create('api::product-variant.product-variant', {
            data: {
              ...variantData,
              product: product.id,
              availableStock: variantData.stock - (variantData.reservedStock || 0)
            }
          });
          createdVariants.push(variant);
        }

        // 3. Actualizar el stock total del producto
        const totalStock = variantsData.reduce((sum, v) => sum + (v.stock || 0), 0);
        await strapi.entityService.update('api::product.product', product.id, {
          data: { stock: totalStock }
        });

        // 4. Validar consistencia
        const validation = await strapi.service('api::product-variant.product-variant').validateProductVariants(
          product.id, 
          totalStock
        );

        if (!validation.isValid) {
          console.warn('Advertencias de validación:', validation.errors);
        }

        return {
          product: {
            ...finalProduct,
            stock: totalStock
          },
          variants: createdVariants
        };
      }

      return { product: finalProduct, variants: [] };
    } catch (error) {
      console.error('Error creating product with variants:', error);
      throw error;
    }
  },

  // Método para actualizar producto con variantes
  async updateProductWithVariants(productId: string | number, productData: any, variantsData: any[]): Promise<any> {
    try {
      // 1. Actualizar el producto principal
      const updatedProduct = await strapi.entityService.update('api::product.product', productId, {
        data: {
          ...productData,
          hasVariants: variantsData.length > 0
        }
      });

      // 2. Eliminar variantes existentes
      const existingVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { product: productId as any }
      });

      for (const variant of existingVariants) {
        await strapi.entityService.delete('api::product-variant.product-variant', variant.id);
      }

      // 3. Crear nuevas variantes
      const createdVariants = [];
      if (variantsData.length > 0) {
        for (const variantData of variantsData) {
          const variant = await strapi.entityService.create('api::product-variant.product-variant', {
            data: {
              ...variantData,
              product: productId,
              availableStock: variantData.stock - (variantData.reservedStock || 0)
            }
          });
          createdVariants.push(variant);
        }

        // 4. Actualizar el stock total del producto
        const totalStock = variantsData.reduce((sum, v) => sum + (v.stock || 0), 0);
        await strapi.entityService.update('api::product.product', productId, {
          data: { stock: totalStock }
        });
      } else {
        // Sin variantes, mantener el stock del producto
        await strapi.entityService.update('api::product.product', productId, {
          data: { stock: productData.stock || 0 }
        });
      }

      return {
        product: updatedProduct,
        variants: createdVariants
      };
    } catch (error) {
      console.error('Error updating product with variants:', error);
      throw error;
    }
  },

  // Método para generar SKU automático para productos
  generateProductSKU(productTitle: string): string {
    const base = productTitle
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4);
    
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    return `PROD-${base}-${timestamp}-${random}`;
  }
}));
