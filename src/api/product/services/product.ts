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
        populate: ['thumbnail', 'Media', 'store', 'categories']
      });

      if (!product) {
        return {
          isValid: false,
          error: 'Producto no encontrado'
        };
      }

      // Verificar stock
      if (product.stock < quantity) {
        return {
          isValid: false,
          error: `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`
        };
      }

      // Verificar que el producto esté publicado
      if (!product.publishedAt) {
        return {
          isValid: false,
          error: 'Producto no disponible'
        };
      }

      return {
        isValid: true,
        product,
        price: product.price,
        variant: null // Por ahora no manejamos variantes
      };
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
  }
}));
