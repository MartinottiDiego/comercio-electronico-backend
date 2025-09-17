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
        founded: data.founded, // Incluir fecha de founded del frontend
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

      // Crear la tienda usando la API de Strapi 5
      
      const store = await strapi.entityService.create('api::store.store', {
        data: storeData,
        populate: { owner: true, image: true }
      });

      // Enviar notificación y email a todos los admins sobre la nueva tienda pendiente
      try {
        const notificationService = strapi.service('api::notification.notification');
        const { findAdminUsers } = require('../../../lib/helpers/admin-users');
        
        // Buscar todos los usuarios con rol admin
        const adminUsers = await findAdminUsers();
        
        if (adminUsers.length === 0) {
          // Continuar con la creación de la tienda aunque no haya admins
        }
        
        // Enviar notificación a cada admin
        const notificationPromises = adminUsers.map(adminUser => 
          notificationService.createNotification({
            type: 'store_pending',
            title: 'Nueva tienda pendiente de aprobación',
            message: `La tienda "${store.name}" de ${user.email} está esperando aprobación. Especialidad: ${store.specialty || 'No especificada'}`,
            priority: 'high',
            recipientEmail: adminUser.email,
            recipientRole: 'admin',
            actionUrl: `/admin/tiendas/${store.documentId}`,
            actionText: 'Revisar tienda'
          })
        );
        
        await Promise.all(notificationPromises);
        } catch (notificationError) {
        // No fallar la operación si la notificación falla
      }

      // Enviar notificación y email al usuario confirmando que su tienda será revisada
      try {
        const notificationService = strapi.service('api::notification.notification');
        
        await notificationService.createNotification({
          type: 'store_pending',
          title: 'Tu tienda está siendo revisada',
          message: `Hemos recibido tu solicitud de tienda "${store.name}". Nuestro equipo la está revisando y te notificaremos en 1-3 días hábiles.`,
          priority: 'normal',
          recipientEmail: user.email,
          recipientRole: 'tienda',
          actionUrl: '/dashboard/tienda',
          actionText: 'Ver estado de mi tienda'
        });
      } catch (notificationError) {
        console.error('Error enviando notificación de confirmación al usuario:', notificationError);
        // No fallar la operación si la notificación falla
      }

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
    try {
      // ✅ ARREGLAR: Parsear manualmente el query string para obtener el email
      const queryString = ctx.request.url.split('?')[1] || '';
      const urlParams = new URLSearchParams(queryString);
      
      // Buscar el parámetro de filtro de email del owner
      let ownerEmail = null;
      for (const [key, value] of urlParams.entries()) {
        if (key.includes('owner') && key.includes('email') && key.includes('$eq')) {
          ownerEmail = value;
          break;
        }
      }
      
      if (ownerEmail) {
        // Si hay filtro por email, buscar la tienda del usuario específico
        const user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { email: ownerEmail },
          populate: ['profile']
        });
        
        if (!user) {
          return { data: [] };
        }
        
        const stores = await strapi.entityService.findMany('api::store.store', {
          filters: {
            owner: user.id
          },
          populate: ['image', 'owner']
        });
        
        return { data: stores };
      }
      
      // Si no hay filtro por email, devolver todas las tiendas (para admin)
      const data = await strapi.entityService.findMany('api::store.store', {
        ...ctx.query,
        populate: ['image', 'owner']
      });
      return { data };
    } catch (error) {
      console.error('Error en find stores:', error);
      return ctx.badRequest('Error al obtener tiendas');
    }
  },

  // Nuevo método para top-rated stores
  async getTopRated(ctx) {
    try {

      // Obtener todas las stores primero para probar
      const allStores = await strapi.entityService.findMany('api::store.store', {
        populate: ['image'],
        limit: 8,
      });

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

      // Actualizar el rol del propietario de la tienda a 'tienda' en su profile
      try {
        await strapi.db.query('api::profile.profile').update({
          where: { users_permissions_user: store.owner.id },
          data: {
            roleUser: 'tienda' // Cambiar el rol del usuario a 'tienda' en el profile
          }
        });
        } catch (roleUpdateError) {
        // No fallar la operación si la actualización del rol falla
      }

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

      // Enviar notificación de confirmación a todos los admins
      try {
        const notificationService = strapi.service('api::notification.notification');
        const { findAdminUsers } = require('../../../lib/helpers/admin-users');
        
        const adminUsers = await findAdminUsers();
        
        if (adminUsers.length > 0) {
          const notificationPromises = adminUsers.map(adminUser => 
            notificationService.createNotification({
              type: 'system',
              title: 'Tienda aprobada exitosamente',
              message: `La tienda "${store.name}" ha sido aprobada y está ahora activa en la plataforma.`,
              priority: 'normal',
              recipientEmail: adminUser.email,
              recipientRole: 'admin',
              actionUrl: `/admin/tiendas/${store.documentId}`,
              actionText: 'Ver tienda'
            })
          );
          
          await Promise.all(notificationPromises);
          }
      } catch (notificationError) {
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

      // Revertir el rol del propietario de la tienda a 'comprador' en su profile
      try {
        await strapi.db.query('api::profile.profile').update({
          where: { users_permissions_user: store.owner.id },
          data: {
            roleUser: 'comprador' // Revertir el rol del usuario a 'comprador' en el profile
          }
        });
        } catch (roleUpdateError) {
        // No fallar la operación si la actualización del rol falla
      }

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

      // Enviar notificación de confirmación a todos los admins
      try {
        const notificationService = strapi.service('api::notification.notification');
        const { findAdminUsers } = require('../../../lib/helpers/admin-users');
        
        const adminUsers = await findAdminUsers();
        
        if (adminUsers.length > 0) {
          const notificationPromises = adminUsers.map(adminUser => 
            notificationService.createNotification({
              type: 'system',
              title: 'Tienda rechazada',
              message: `La tienda "${store.name}" ha sido rechazada. Motivo: ${rejectionReason || 'No especificado'}`,
              priority: 'normal',
              recipientEmail: adminUser.email,
              recipientRole: 'admin',
              actionUrl: `/admin/tiendas/${store.documentId}`,
              actionText: 'Ver tienda'
            })
          );
          
          await Promise.all(notificationPromises);
          }
      } catch (notificationError) {
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

  // ===== NUEVOS MÉTODOS PARA GESTIÓN DE TIENDA =====

  // Obtener productos de una tienda específica
  async getStoreProducts(ctx) {
    try {
      const { id } = ctx.params;
      const { page = 1, pageSize = 25, search, category, sortBy = 'createdAt', sortOrder = 'desc' } = ctx.query;

      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar que la tienda existe
      const store = await strapi.entityService.findOne('api::store.store', id);
      if (!store) {
        return ctx.notFound('Tienda no encontrada');
      }

      // Construir filtros
      const filters: any = {
        store: id
      };

      if (search) {
        filters.$or = [
          { title: { $containsi: search } },
          { description: { $containsi: search } },
          { sku: { $containsi: search } }
        ];
      }

      if (category) {
        filters.categories = { name: { $containsi: category } };
      }

      // Construir ordenamiento
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';

      // Obtener productos con paginación
      const products = await strapi.entityService.findMany('api::product.product', {
        filters,
        sort,
        populate: ['thumbnail', 'Media', 'categories', 'store'],
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });

      // Obtener total para paginación
      const total = await strapi.db.query('api::product.product').count({
        where: filters
      });

      return {
        data: products,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          }
        }
      };
    } catch (error) {
      console.error('Error obteniendo productos de tienda:', error);
      return ctx.internalServerError('Error obteniendo productos de la tienda');
    }
  },

  // Obtener pedidos de una tienda específica
  async getStoreOrders(ctx) {
    try {
      const { id } = ctx.params;
      const { 
        page = 1, 
        pageSize = 25, 
        status, 
        paymentStatus, 
        dateFrom, 
        dateTo,
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = ctx.query;

      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar que la tienda existe
      const store = await strapi.entityService.findOne('api::store.store', id);
      if (!store) {
        return ctx.notFound('Tienda no encontrada');
      }

      // Construir filtros
      const filters: any = {
        order_items: {
          product: {
            store: id
          }
        }
      };

      if (status) {
        filters.orderStatus = status;
      }

      if (paymentStatus) {
        filters.paymentStatus = paymentStatus;
      }

      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) {
          filters.createdAt.$gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          filters.createdAt.$lte = new Date(dateTo as string);
        }
      }

      // Construir ordenamiento
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';

      // Obtener pedidos con paginación
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters,
        sort,
        populate: [
          'user',
          'order_items',
          'order_items.product',
          'order_items.product.store',
          'payments'
        ],
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });

      // Obtener total para paginación
      const total = await strapi.db.query('api::order.order').count({
        where: filters
      });

      return {
        data: orders,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          }
        }
      };
    } catch (error) {
      console.error('Error obteniendo pedidos de tienda:', error);
      return ctx.internalServerError('Error obteniendo pedidos de la tienda');
    }
  },

  // Obtener analytics de una tienda
  async getStoreAnalytics(ctx) {
    try {
      const { id } = ctx.params;
      const { period = '30d', groupBy = 'day' } = ctx.query; // period: 7d, 30d, 90d, 1y | groupBy: hour, day, week, month, year
      
      // Validar groupBy
      const validGroupBy = ['hour', 'day', 'week', 'month', 'year'];
      const selectedGroupBy = validGroupBy.includes(groupBy as string) ? groupBy as string : 'day';

      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar que la tienda existe
      const store = await strapi.entityService.findOne('api::store.store', id);
      if (!store) {
        return ctx.notFound('Tienda no encontrada');
      }

      // Calcular fechas según el período
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Obtener estadísticas de productos
      const totalProducts = await strapi.db.query('api::product.product').count({
        where: { store: id }
      });

      const activeProducts = await strapi.db.query('api::product.product').count({
        where: { 
          store: id,
          stock: { $gt: 0 }
        }
      });

      const lowStockProducts = await strapi.db.query('api::product.product').count({
        where: { 
          store: id,
          stock: { $lte: 5, $gt: 0 }
        }
      });

      const outOfStockProducts = await strapi.db.query('api::product.product').count({
        where: { 
          store: id,
          stock: 0
        }
      });

      // Obtener estadísticas de pedidos
      const totalOrders = await strapi.db.query('api::order.order').count({
        where: {
          order_items: {
            product: {
              store: id
            }
          },
          createdAt: { $gte: startDate }
        }
      });

      const completedOrders = await strapi.db.query('api::order.order').count({
        where: {
          order_items: {
            product: {
              store: id
            }
          },
          paymentStatus: 'paid', // Cambiar a paymentStatus para consistencia
          createdAt: { $gte: startDate }
        }
      });

      const pendingOrders = await strapi.db.query('api::order.order').count({
        where: {
          order_items: {
            product: {
              store: id
            }
          },
          orderStatus: { $in: ['pending', 'confirmed', 'processing', 'shipped'] },
          createdAt: { $gte: startDate }
        }
      });

      // Obtener ingresos totales - incluir pedidos pagados (no solo entregados)
      const ordersWithTotals = await strapi.db.query('api::order.order').findMany({
        where: {
          order_items: {
            product: {
              store: id
            }
          },
          paymentStatus: 'paid', // Cambiar a paymentStatus en lugar de orderStatus
          createdAt: { $gte: startDate }
        },
        select: ['total']
      });

      const totalRevenue = ordersWithTotals.reduce((sum, order) => sum + (order.total || 0), 0);

      // Obtener ventas por día para gráfico - usar órdenes en lugar de pagos
      // Obtener órdenes pagadas que contienen productos de esta tienda
      const ordersWithPayments = await strapi.db.query('api::order.order').findMany({
        where: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate },
          order_items: {
            product: {
              store: id
            }
          }
        },
        populate: {
          payments: true,
          order_items: {
            populate: {
              product: true
            }
          }
        }
      });

      // Función helper para agrupar fechas según el tipo de agrupación
      const groupDateByType = (date: Date, groupType: string): string => {
        const d = new Date(date);
        
        switch (groupType) {
          case 'hour':
            return d.toISOString().slice(0, 13) + ':00:00'; // YYYY-MM-DDTHH:00:00
          case 'day':
            return d.toISOString().slice(0, 10); // YYYY-MM-DD
          case 'week':
            // Obtener el lunes de la semana
            const monday = new Date(d);
            monday.setDate(d.getDate() - d.getDay() + 1);
            return monday.toISOString().slice(0, 10);
          case 'month':
            return d.toISOString().slice(0, 7); // YYYY-MM
          case 'year':
            return d.toISOString().slice(0, 4); // YYYY
          default:
            return d.toISOString().slice(0, 10);
        }
      };

      // Agrupar ventas según el tipo de agrupación
      const salesData = ordersWithPayments.map(order => {
        // Usar la fecha del pago más reciente, o la fecha de creación de la orden como fallback
        const paymentDate = order.payments && order.payments.length > 0 
          ? order.payments[order.payments.length - 1].date 
          : order.createdAt;
        
        return {
          date: groupDateByType(new Date(paymentDate), selectedGroupBy),
          amount: order.total || 0
        };
      });

      // Agrupar ventas por período
      const salesByPeriod: { [key: string]: number } = {};
      salesData.forEach(sale => {
        const period = sale.date;
        salesByPeriod[period] = (salesByPeriod[period] || 0) + sale.amount;
      });

      // Obtener productos más vendidos - incluir pedidos pagados
      const topProducts = await strapi.db.query('api::order-item.order-item').findMany({
        where: {
          order: {
            paymentStatus: 'paid', // Cambiar a paymentStatus
            createdAt: { $gte: startDate }
          },
          product: {
            store: id
          }
        },
        populate: ['product'],
        select: ['quantity', 'subtotal']
      });

      // Agrupar productos vendidos
      const productSales: { [key: string]: { quantity: number, revenue: number, product: any } } = {};
      topProducts.forEach(item => {
        if (item.product) {
          const productId = item.product.id;
          if (!productSales[productId]) {
            productSales[productId] = {
              quantity: 0,
              revenue: 0,
              product: item.product
            };
          }
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += item.subtotal;
        }
      });

      const topSellingProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      return {
        data: {
          period,
          dateRange: {
            from: startDate,
            to: now
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            lowStock: lowStockProducts,
            outOfStock: outOfStockProducts
          },
          orders: {
            total: totalOrders,
            completed: completedOrders,
            pending: pendingOrders,
            completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
          },
          revenue: {
            total: totalRevenue,
            averageOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0
          },
          charts: {
            sales: Object.entries(salesByPeriod).map(([period, amount]) => ({
              period,
              amount
            })),
            groupBy: selectedGroupBy
          },
          topProducts: topSellingProducts
        }
      };
    } catch (error) {
      console.error('Error obteniendo analytics de tienda:', error);
      return ctx.internalServerError('Error obteniendo analytics de la tienda');
    }
  },

  // Obtener notificaciones de una tienda
  async getStoreNotifications(ctx) {
    try {
      const { id } = ctx.params;
      const { page = 1, pageSize = 25, type, unreadOnly = false } = ctx.query;

      if (!id) {
        return ctx.badRequest('ID de tienda requerido');
      }

      // Verificar que la tienda existe y obtener el owner
      const store = await strapi.entityService.findOne('api::store.store', id, {
        populate: ['owner']
      });
      if (!store) {
        return ctx.notFound('Tienda no encontrada');
      }

      // Construir filtros
      const filters: any = {
        recipientRole: 'tienda',
        $or: [
          { user: (store as any).owner?.id },
          { recipientEmail: (store as any).owner?.email }
        ]
      };

      if (type) {
        filters.type = type;
      }

      if (unreadOnly === 'true') {
        filters.notificationStatus = 'unread';
      }

      // Obtener notificaciones con paginación
      const notifications = await strapi.entityService.findMany('api::notification.notification', {
        filters,
        sort: { createdAt: 'desc' },
        populate: ['user', 'order'],
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });

      // Obtener total para paginación
      const total = await strapi.db.query('api::notification.notification').count({
        where: filters
      });

      // Obtener contador de no leídas
      const unreadCount = await strapi.db.query('api::notification.notification').count({
        where: {
          ...filters,
          notificationStatus: 'unread'
        }
      });

      return {
        data: notifications,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          },
          unreadCount
        }
      };
    } catch (error) {
      console.error('Error obteniendo notificaciones de tienda:', error);
      return ctx.internalServerError('Error obteniendo notificaciones de la tienda');
    }
  },
}));
