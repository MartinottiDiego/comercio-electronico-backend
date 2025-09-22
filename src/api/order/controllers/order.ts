/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  // Método para actualizar el estado de una orden
  async updateOrderStatus(ctx) {
    try {
      
      const { documentId } = ctx.params;
      const { orderStatus, notes } = ctx.request.body;
      const { user } = ctx.state;

      if (!orderStatus) {
        return ctx.badRequest('El estado de la orden es requerido');
      }

      // Si no hay usuario autenticado, saltar verificación de permisos
      if (!user) {
        
        try {
          // Primero obtener el ID numérico usando documentId
          const order = await strapi.db.connection('orders')
            .where('document_id', documentId)
            .select('id', 'order_status')
            .first();
            
          if (!order) {
            return ctx.notFound('Orden no encontrada');
          }
          
          
           // Usar el servicio para actualizar (esto creará las notificaciones)
           const orderService = strapi.service('api::order.order');
           const updatedOrder = await orderService.updateOrderStatus(order.id, orderStatus, notes);
          
          
          return ctx.send({
            data: updatedOrder,
            message: 'Estado de la orden actualizado exitosamente'
          });
        } catch (error) {
          console.error('Error updating order:', error);
          return ctx.internalServerError('Error actualizando el estado de la orden: ' + error.message);
        }
      }

      // Primero obtener el ID numérico usando documentId
      const orderRecord = await strapi.db.connection('orders')
        .where('document_id', documentId)
        .select('id')
        .first();
        
      if (!orderRecord) {
        return ctx.notFound('Orden no encontrada');
      }

      // Obtener la orden para verificar permisos
      const order = await strapi.entityService.findOne('api::order.order', orderRecord.id, {
        populate: ['order_items.product.store']
      });

      if (!order) {
        return ctx.notFound('Orden no encontrada');
      }

      // Obtener el usuario con sus tiendas pobladas
      const userWithStores = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['stores']
      });

      // Verificar que el usuario sea el dueño de la tienda o admin
      const orderItems = (order as any).order_items;
      
      
      const isStoreOwner = orderItems?.some((item: any) => 
        item.product?.store?.owner === user.id || 
        (userWithStores as any)?.stores?.some((store: any) => store.id === item.product?.store?.id)
      );
      
      if (!isStoreOwner && user.role?.name !== 'admin') {
        return ctx.forbidden('No tienes permisos para actualizar esta orden');
      }

       // Usar el servicio para actualizar (esto creará las notificaciones)
       const orderService = strapi.service('api::order.order');
       const updatedOrder = await orderService.updateOrderStatus(order.id, orderStatus, notes);

      return ctx.send({
        data: updatedOrder,
        message: 'Estado de la orden actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error updating order status:', error);
      return ctx.internalServerError('Error actualizando el estado de la orden');
    }
  },

  // Método para obtener órdenes de un usuario específico
  async getUserOrders(ctx) {
    try {
      const { user } = ctx.state;
      const userId = user.id;

      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: { user: userId },
        populate: ['order_items.product', 'payments'],
        sort: { createdAt: 'desc' }
      });

      return ctx.send({
        data: orders
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      return ctx.internalServerError('Error obteniendo las órdenes del usuario');
    }
  },

  // Método para obtener una orden específica por ID
  async getOrderById(ctx) {
    try {
      const { documentId } = ctx.params;
      const { user } = ctx.state;

      const order = await strapi.entityService.findOne('api::order.order', documentId, {
        populate: ['user', 'order_items.product', 'payments', 'billing_address', 'shipping_address']
      });

      if (!order) {
        return ctx.notFound('Orden no encontrada');
      }

      // Verificar que el usuario sea el dueño de la orden o admin
      if ((order as any).user?.id !== user.id && user.role?.name !== 'admin') {
        return ctx.forbidden('No tienes permisos para ver esta orden');
      }

      return ctx.send({
        data: order
      });
    } catch (error) {
      console.error('Error getting order by id:', error);
      return ctx.internalServerError('Error obteniendo la orden');
    }
  },

  // Método para obtener productos comprados pendientes de review
  async getPurchasedProductsPendingReviews(ctx) {
    try {
      const { user } = ctx.state;
      const userId = user.id;

      // Obtener órdenes del usuario que estén entregadas o confirmadas
      const orders = await strapi.documents('api::order.order').findMany({
        filters: { 
          user: userId,
          orderStatus: { $in: ['delivered', 'confirmed'] },
          paymentStatus: 'paid'
        },
        populate: {
          order_items: {
            populate: {
              product: {
                populate: {
                  Media: true,
                  thumbnail: true
                }
              }
            }
          }
        }
      });

      // Filtrar productos que no han sido reseñados
      const pendingReviewProducts = [];
      
      for (const order of orders) {
        if (order.order_items && Array.isArray(order.order_items)) {
          for (const orderItem of order.order_items) {
            // Solo incluir si no ha sido reseñado
            if (!orderItem.reviewed && orderItem.product) {
              // Verificar si ya existe una review para este producto por este usuario
              const existingReview = await strapi.documents('api::review.review').findMany({
                filters: {
                  users_permissions_user: userId,
                  product: { id: orderItem.product.id }
                }
              });

              // Solo agregar si no existe review
              if (!existingReview || existingReview.length === 0) {
                pendingReviewProducts.push({
                  orderItemId: orderItem.id,
                  product: orderItem.product,
                  orderNumber: order.orderNumber,
                  purchaseDate: order.createdAt,
                  quantity: orderItem.quantity,
                  price: orderItem.price
                });
              }
            }
          }
        }
      }

      // Ordenar por fecha de compra (más recientes primero)
      pendingReviewProducts.sort((a, b) => 
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      );

      return ctx.send({
        success: true,
        data: pendingReviewProducts,
        count: pendingReviewProducts.length
      });
    } catch (error) {
      console.error('Error getting purchased products pending reviews:', error);
      return ctx.internalServerError('Error obteniendo productos pendientes de review');
    }
  }
}));