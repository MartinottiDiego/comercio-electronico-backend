/**
 * product service
 */

import { factories } from '@strapi/strapi';

interface ProductValidationResult {
  isValid: boolean;
  product?: any;
  variant?: any;
  price: number;
  availableStock: number;
  error?: string;
}

interface StockReservationResult {
  success: boolean;
  reservationId?: string;
  error?: string;
}

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  /**
   * Validar producto y obtener datos reales de la DB
   */
  async validateProduct(
    productId: string,
    variantId?: string,
    quantity: number = 1
  ): Promise<ProductValidationResult> {
    try {
      // Buscar producto por id (asumiendo que productId es el id real)
      const product = await strapi.entityService.findMany('api::product.product', {
        filters: {
          id: productId
        },
        populate: {
          variants: true,
          category: true,
          store: true
        }
      });

      if (!product || product.length === 0) {
        return {
          isValid: false,
          price: 0,
          availableStock: 0,
          error: 'Producto no encontrado'
        };
      }

      const productData = product[0];
      let variantData = null;
      let finalPrice = productData.price;
      let availableStock = productData.stock;

      // Si tiene variantes, buscar la variante específica
      if (variantId && productData.hasVariants) {
        const variant = await strapi.entityService.findMany('api::product-variant.product-variant', {
          filters: {
            id: variantId,
            product: {
              id: productData.id
            },
            isActive: true
          }
        });

        if (!variant || variant.length === 0) {
          return {
            isValid: false,
            price: 0,
            availableStock: 0,
            error: 'Variante no encontrada'
          };
        }

        variantData = variant[0];
        finalPrice = variantData.price;
        availableStock = variantData.stock - variantData.reservedStock;
      }

      // Validar stock disponible
      if (availableStock < quantity) {
        return {
          isValid: false,
          price: finalPrice,
          availableStock,
          error: `Stock insuficiente. Disponible: ${availableStock}`
        };
      }

      return {
        isValid: true,
        product: productData,
        variant: variantData,
        price: finalPrice,
        availableStock
      };
    } catch (error) {
      console.error('Error validating product:', error);
      return {
        isValid: false,
        price: 0,
        availableStock: 0,
        error: 'Error interno del servidor'
      };
    }
  },

  /**
   * Reservar stock temporalmente
   */
  async reserveStock(
    productId: string,
    variantId: string | null,
    quantity: number,
    sessionId: string,
    userId?: string,
    timeoutMinutes: number = 15
  ): Promise<StockReservationResult> {
    try {
      // Validar producto primero
      const validation = await this.validateProduct(productId, variantId || undefined, quantity);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

      // Crear reserva
      const reservation = await strapi.entityService.create('api::stock-reservation.stock-reservation', {
        data: {
          reservationId,
          sessionId,
          userId,
          product: validation.product?.id,
          variant: validation.variant?.id,
          quantity,
          status: 'reserved',
          expiresAt,
          metadata: {
            originalPrice: validation.price,
            originalStock: validation.availableStock
          }
        }
      });

      // Actualizar stock reservado en producto/variante
      if (validation.variant) {
        await strapi.entityService.update('api::product-variant.product-variant', validation.variant.id, {
          data: {
            reservedStock: (validation.variant.reservedStock || 0) + quantity,
            availableStock: validation.variant.stock - ((validation.variant.reservedStock || 0) + quantity)
          }
        });
      } else {
        // Para productos sin variantes, actualizar el stock del producto
        await strapi.entityService.update('api::product.product', validation.product.id, {
          data: {
            stock: validation.product.stock - quantity
          }
        });
      }

      return {
        success: true,
        reservationId
      };
    } catch (error) {
      console.error('Error reserving stock:', error);
      return {
        success: false,
        error: 'Error al reservar stock'
      };
    }
  },

  /**
   * Confirmar reserva de stock (usado en webhook)
   */
  async confirmStockReservation(reservationId: string): Promise<boolean> {
    try {
      const reservation = await strapi.entityService.findMany('api::stock-reservation.stock-reservation', {
        filters: {
          reservationId,
          status: 'reserved'
        },
        populate: {
          product: true,
          variant: true
        }
      });

      if (!reservation || reservation.length === 0) {
        return false;
      }

      const reservationData = reservation[0];

      // Actualizar estado de la reserva
      await strapi.entityService.update('api::stock-reservation.stock-reservation', reservationData.id, {
        data: {
          status: 'confirmed',
          confirmedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error confirming stock reservation:', error);
      return false;
    }
  },

  /**
   * Liberar reserva de stock
   */
  async releaseStockReservation(reservationId: string): Promise<boolean> {
    try {
      const reservation = await strapi.entityService.findMany('api::stock-reservation.stock-reservation', {
        filters: {
          reservationId,
          status: 'reserved'
        },
        populate: {
          product: true,
          variant: true
        }
      });

      if (!reservation || reservation.length === 0) {
        return false;
      }

      const reservationData = reservation[0];

      // Actualizar estado de la reserva
      await strapi.entityService.update('api::stock-reservation.stock-reservation', reservationData.id, {
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });

      // Restaurar stock
      const reservationWithRelations = reservationData as any;
      if (reservationWithRelations.variant) {
        await strapi.entityService.update('api::product-variant.product-variant', reservationWithRelations.variant.id, {
          data: {
            reservedStock: (reservationWithRelations.variant.reservedStock || 0) - reservationData.quantity,
            availableStock: reservationWithRelations.variant.stock - ((reservationWithRelations.variant.reservedStock || 0) - reservationData.quantity)
          }
        });
      } else if (reservationWithRelations.product) {
        await strapi.entityService.update('api::product.product', reservationWithRelations.product.id, {
          data: {
            stock: reservationWithRelations.product.stock + reservationData.quantity
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error releasing stock reservation:', error);
      return false;
    }
  },

  /**
   * Limpiar reservas expiradas (cron job)
   */
  async cleanupExpiredReservations(): Promise<void> {
    try {
      const expiredReservations = await strapi.entityService.findMany('api::stock-reservation.stock-reservation', {
        filters: {
          status: 'reserved',
          expiresAt: {
            $lt: new Date()
          }
        },
        populate: {
          product: true,
          variant: true
        }
      });

      for (const reservation of expiredReservations) {
        await this.releaseStockReservation(reservation.reservationId);
      }

      console.log(`Cleaned up ${expiredReservations.length} expired reservations`);
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }
  }
}));
