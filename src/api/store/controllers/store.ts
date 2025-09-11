/**
 * store controller
 */

import { factories } from '@strapi/strapi'
import { StoreStatus, STORE_STATUS_CONFIG } from '../../../types/store-status'

export default factories.createCoreController('api::store.store', ({ strapi }) => ({
  // Método existente extendido
  async find(ctx) {
    // Lógica existente del core controller
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  // Nuevo método para top-rated stores
  async getTopRated(ctx) {
    try {
      console.log('[StoresSlider] Controller getTopRated iniciado');
      
      // Obtener todas las stores primero para probar
      const allStores = await strapi.entityService.findMany('api::store.store', {
        populate: ['image'],
        limit: 8,
      });

      console.log('[StoresSlider] Stores obtenidas:', allStores.length);

      const response = {
        data: allStores,
        meta: {
          pagination: {
            page: 1,
            pageSize: 8,
            pageCount: 1,
            total: allStores.length,
          },
        },
      };

      return response;
    } catch (error) {
      console.error('[StoresSlider] Error en controller getTopRated:', error);
      return ctx.internalServerError('Error obteniendo tiendas destacadas');
    }
  },

  // Método para aprobar una tienda
  async approveStore(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar autenticación manualmente
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('Token de autenticación requerido');
      }

      const token = authHeader.substring(7);
      const userService = strapi.plugin('users-permissions').service('jwt');
      const payload = await userService.verify(token);
      
      if (!payload || !payload.id) {
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', payload.id);
      
      if (!user) {
        return ctx.unauthorized('Usuario no encontrado');
      }

      if (user.blocked || !user.confirmed) {
        return ctx.unauthorized('Usuario bloqueado o no confirmado');
      }

      // Obtener información de la tienda y su propietario
      const store = await strapi.db.query('api::store.store').findOne({
        where: { documentId: id },
        populate: ['owner']
      });

      if (!store || !store.owner) {
        return ctx.notFound('Tienda o propietario no encontrado');
      }

      // Actualizar tienda con estado aprobado
      const updatedStore = await strapi.db.query('api::store.store').update({
        where: { documentId: id },
        data: {
          storeStatus: StoreStatus.APPROVED,
          verified: STORE_STATUS_CONFIG[StoreStatus.APPROVED].verified,
          active: true,
          rejectionReason: null, // Limpiar el motivo de rechazo
        },
      });

      // Enviar notificación al propietario de la tienda
      try {
        const notificationService = strapi.service('api::notification.notification');
        await notificationService.createNotification({
          type: 'store_approval',
          title: '¡Tu tienda ha sido aprobada!',
          message: `¡Felicitaciones! Tu tienda "${store.name}" ha sido aprobada y ya está activa en WaaZaar.`,
          priority: 'high',
          recipientEmail: store.owner.email,
          recipientRole: 'tienda',
          actionUrl: '/dashboard/tienda',
          actionText: 'Ver mi tienda'
        });
      } catch (notificationError) {
        console.error('Error enviando notificación de aprobación:', notificationError);
        // No fallar la operación si la notificación falla
      }

      return {
        data: {
          id: updatedStore.id,
          attributes: {
            ...updatedStore,
            storeStatus: updatedStore.storeStatus,
            verified: updatedStore.verified,
            blocked: updatedStore.blocked,
            active: updatedStore.active,
            rejectionReason: updatedStore.rejectionReason,
          }
        }
      };
    } catch (error) {
      console.error('Error aprobando tienda:', error);
      return ctx.internalServerError('Error aprobando tienda');
    }
  },

  // Método para rechazar una tienda
  async rejectStore(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar autenticación manualmente
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('Token de autenticación requerido');
      }

      const token = authHeader.substring(7);
      const userService = strapi.plugin('users-permissions').service('jwt');
      const payload = await userService.verify(token);
      
      if (!payload || !payload.id) {
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', payload.id);
      
      if (!user) {
        return ctx.unauthorized('Usuario no encontrado');
      }

      if (user.blocked || !user.confirmed) {
        return ctx.unauthorized('Usuario bloqueado o no confirmado');
      }

      // Obtener motivo de rechazo del body
      const { rejectionReason } = ctx.request.body || {};

      // Obtener información de la tienda y su propietario
      const store = await strapi.db.query('api::store.store').findOne({
        where: { documentId: id },
        populate: ['owner']
      });

      if (!store || !store.owner) {
        return ctx.notFound('Tienda o propietario no encontrado');
      }
      // Actualizar tienda con estado rechazado
      const updatedStore = await strapi.db.query('api::store.store').update({
        where: { documentId: id },
        data: {
          storeStatus: StoreStatus.REJECTED,
          verified: STORE_STATUS_CONFIG[StoreStatus.REJECTED].verified,
          active: false,
          rejectionReason: rejectionReason || null,
        },
      });

      // Enviar notificación al propietario de la tienda
      try {
        const notificationService = strapi.service('api::notification.notification');
        await notificationService.createNotification({
          type: 'store_rejection',
          title: 'Tu tienda ha sido rechazada',
          message: `Tu tienda "${store.name}" ha sido rechazada. Motivo: ${rejectionReason || 'No especificado'}`,
          priority: 'high',
          recipientEmail: store.owner.email,
          recipientRole: 'tienda',
          actionUrl: '/dashboard/tienda',
          actionText: 'Ver detalles'
        });
      } catch (notificationError) {
        console.error('Error enviando notificación de rechazo:', notificationError);
        // No fallar la operación si la notificación falla
      }

      return {
        data: {
          id: updatedStore.id,
          attributes: {
            ...updatedStore,
            storeStatus: updatedStore.storeStatus,
            verified: updatedStore.verified,
            blocked: updatedStore.blocked,
            active: updatedStore.active,
            rejectionReason: updatedStore.rejectionReason,
          }
        }
      };
    } catch (error) {
      console.error('Error rechazando tienda:', error);
      return ctx.internalServerError('Error rechazando tienda');
    }
  },

  // Método para bloquear una tienda
  async blockStore(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar autenticación manualmente
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('Token de autenticación requerido');
      }

      const token = authHeader.substring(7);
      const userService = strapi.plugin('users-permissions').service('jwt');
      const payload = await userService.verify(token);
      
      if (!payload || !payload.id) {
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', payload.id);
      
      if (!user) {
        return ctx.unauthorized('Usuario no encontrado');
      }

      if (user.blocked || !user.confirmed) {
        return ctx.unauthorized('Usuario bloqueado o no confirmado');
      }

      // Actualizar tienda con estado bloqueado
      const updatedStore = await strapi.db.query('api::store.store').update({
        where: { documentId: id },
        data: {
          storeStatus: StoreStatus.BLOCKED,
          verified: STORE_STATUS_CONFIG[StoreStatus.BLOCKED].verified,
          blocked: STORE_STATUS_CONFIG[StoreStatus.BLOCKED].blocked,
          active: false,
        },
      });

      return {
        data: {
          id: updatedStore.id,
          attributes: {
            ...updatedStore,
            storeStatus: updatedStore.storeStatus,
            verified: updatedStore.verified,
            blocked: updatedStore.blocked,
            active: updatedStore.active,
          }
        }
      };
    } catch (error) {
      console.error('Error bloqueando tienda:', error);
      return ctx.internalServerError('Error bloqueando tienda');
    }
  },

  // Método para obtener métricas de una store específica
  async getStoreMetrics(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID de store requerido');
      }

      const storeId = parseInt(id);
      
      if (isNaN(storeId)) {
        return ctx.badRequest('ID de store inválido');
      }

      // Verificar autenticación
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('Token de autorización requerido');
      }

      const token = authHeader.substring(7);
      const userService = strapi.plugin('users-permissions').service('jwt');
      const payload = await userService.verify(token);
      
      if (!payload || !payload.id) {
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', payload.id);
      
      if (!user) {
        return ctx.unauthorized('Usuario no encontrado');
      }

      if (user.blocked || !user.confirmed) {
        return ctx.unauthorized('Usuario bloqueado o no confirmado');
      }

      // Verificar que el usuario tenga acceso a esta store
      const store = await strapi.entityService.findOne('api::store.store', storeId, {
        populate: ['owner']
      });

      if (!store) {
        return ctx.notFound('Store no encontrada');
      }

      // Verificar que el usuario sea el dueño de la store o admin
      const userRole = await strapi.entityService.findOne('plugin::users-permissions.role', (user as any).role?.id || 0);
      const isAdmin = userRole?.name === 'admin';
      const isOwner = (store as any).owner?.id === user.id;
      
      if (!isAdmin && !isOwner) {
        return ctx.forbidden('No tienes acceso a esta store');
      }

      // Obtener el servicio de store
      const storeService = strapi.service('api::store.store');
      
      if (!storeService) {
        return ctx.internalServerError('Servicio de store no disponible');
      }

      // Calcular métricas
      const result = await storeService.calculateStoreMetrics(storeId);

      if (!result.success) {
        return ctx.internalServerError(result.error);
      }

      return ctx.send({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('[StoreController] Error interno obteniendo métricas:', error);
      return ctx.internalServerError('Error interno obteniendo métricas de la store');
    }
  },
}));
