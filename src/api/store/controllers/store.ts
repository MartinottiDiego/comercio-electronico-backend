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
      console.log('[StoresSlider] Query params:', ctx.query);
      
      const { limit = '8', populate = 'image,products' } = ctx.query;
      
      // Validar límite
      const validatedLimit = Math.min(Math.max(parseInt(limit as string) || 8, 1), 20);
      console.log('[StoresSlider] Límite validado:', validatedLimit);
      
      // Obtener stores top-rated
      const stores = await strapi.service('api::store.store').getTopRated({
        limit: validatedLimit,
        populate: populate as string,
      });

      console.log('[StoresSlider] Stores obtenidos del service:', stores.length);

      const response = {
        data: stores,
        meta: {
          pagination: {
            page: 1,
            pageSize: validatedLimit,
            pageCount: 1,
            total: stores.length,
          },
        },
      };

      console.log('[StoresSlider] Respuesta final:', {
        totalStores: stores.length,
        meta: response.meta
      });

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
}));
