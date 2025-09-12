/**
 * store controller
 */

import { factories } from '@strapi/strapi'
import { StoreStatus, STORE_STATUS_CONFIG } from '../../../types/store-status'

export default factories.createCoreController('api::store.store', ({ strapi }) => ({
  // Método personalizado para crear stores
  async create(ctx) {
    try {
      const { data } = ctx.request.body;
      
      if (!data) {
        return ctx.badRequest('Datos requeridos');
      }

      // Verificar autenticación
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

      // Generar nombre y slug únicos basados en el nombre original
      let baseName = data.name;
      let baseSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      let finalName = baseName;
      let slug = baseSlug;
      let counter = 1;
      
      // Verificar que tanto el nombre como el slug sean únicos
      while (true) {
        const existingStore = await strapi.db.query('api::store.store').findOne({
          where: { 
            $or: [
              { name: finalName },
              { slug: slug }
            ]
          }
        });
        
        if (!existingStore) {
          break; // Tanto nombre como slug son únicos
        }
        
        finalName = `${baseName} ${counter}`;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Preparar datos de la tienda
      const storeData: any = {
        name: finalName, // Usar nombre único
        description: data.description,
        specialty: data.specialty,
        location: data.location,
        slug: slug, // Enviar slug único
        owner: user.id, // Usar el ID numérico del usuario
        storeStatus: 'pending',
        verified: false,
        active: false,
        blocked: false
      };

      // Agregar imagen solo si existe y es un número válido
      if (data.image && typeof data.image === 'number') {
        storeData.image = data.image;
      }

      console.log('=== DEBUG store creation ===');
      console.log('Original name:', data.name);
      console.log('Final name:', finalName);
      console.log('Generated slug:', slug);
      console.log('storeData:', JSON.stringify(storeData, null, 2));

      // Crear la tienda usando la API de Strapi 5
      console.log('=== ANTES DE CREAR ===');
      const store = await strapi.entityService.create('api::store.store', {
        data: storeData,
        populate: { owner: true, image: true }
      });
      console.log('=== DESPUÉS DE CREAR ===');

      return { data: store };
    } catch (error) {
      console.error('Error creando tienda:', error);
      
      // Mostrar detalles del error de validación
      if (error.name === 'YupValidationError') {
        console.error("=== YUP VALIDATION ERROR DETECTED ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        
        if (error.details && error.details.errors) {
          console.error("Number of errors:", error.details.errors.length);
          error.details.errors.forEach((err: any, index: number) => {
            console.error(`=== ERROR ${index + 1} ===`);
            console.error("Path:", err.path);
            console.error("Message:", err.message);
            console.error("Value:", err.value);
            console.error("Type:", err.type);
            console.error("Full error object:", JSON.stringify(err, null, 2));
          });
        }
        
        return ctx.badRequest(`Error de validación: ${error.message}`);
      }
      
      return ctx.internalServerError('Error creando tienda');
    }
  },

  // Método existente extendido
  async find(ctx) {
    // Lógica existente del core controller
    const data = await strapi.entityService.findMany('api::store.store', {
      ...ctx.query,
      populate: ['image']
    });
    return { data };
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
}));
