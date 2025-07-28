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

  // Método para liberar stock reservado
  async releaseStock(reservationId: string) {
    try {
      // En una implementación real, aquí liberarías la reserva
      console.log(`Liberando stock para reserva: ${reservationId}`);
      return {
        success: true,
        message: 'Stock liberado'
      };
    } catch (error) {
      console.error('Error liberando stock:', error);
      return {
        success: false,
        error: 'Error interno liberando stock'
      };
    }
  },

  // Método para confirmar reserva de stock (usado cuando el pago es exitoso)
  async confirmStockReservation(reservationId: string) {
    try {
      // En una implementación real, aquí confirmarías la reserva y reducirías el stock
      console.log(`Confirmando reserva de stock: ${reservationId}`);
      
      // Por ahora, simplemente logueamos que se confirmó
      // En una implementación real, aquí:
      // 1. Buscarías la reserva en la base de datos
      // 2. Reducirías el stock del producto
      // 3. Marcarías la reserva como confirmada
      
      return {
        success: true,
        message: 'Reserva de stock confirmada'
      };
    } catch (error) {
      console.error('Error confirmando reserva de stock:', error);
      return {
        success: false,
        error: 'Error interno confirmando reserva de stock'
      };
    }
  },

  // Método para limpiar reservas expiradas (cron job)
  async cleanupExpiredReservations() {
    try {
      // Por ahora, simplemente logueamos que se ejecutó
      // En una implementación real, aquí buscarías reservas expiradas y las liberarías
      console.log('🧹 Ejecutando limpieza de reservas expiradas...');
      
      // Aquí podrías implementar la lógica real:
      // 1. Buscar reservas expiradas en la base de datos
      // 2. Liberar el stock de esas reservas
      // 3. Eliminar las reservas expiradas
      
      return {
        success: true,
        message: 'Limpieza de reservas completada',
        cleanedCount: 0 // Por ahora no limpiamos nada
      };
    } catch (error) {
      console.error('Error en limpieza de reservas:', error);
      return {
        success: false,
        error: 'Error interno en limpieza de reservas'
      };
    }
  }
}));
