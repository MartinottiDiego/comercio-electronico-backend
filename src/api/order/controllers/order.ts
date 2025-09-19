/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  // Método para obtener órdenes de un usuario específico
  async getUserOrders(ctx) {
    try {
      const { user } = ctx.state;
      const userId = user.id;

      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: { user: userId },
        populate: ['order_items', 'order_items.product', 'order_items.product.Media', 'order_items.product.thumbnail']
      });

      return ctx.send({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      return ctx.internalServerError('Error obteniendo órdenes del usuario');
    }
  },

  // Método para obtener una orden específica
  async getOrderById(ctx) {
    try {
      const { documentId } = ctx.params;
      const { user } = ctx.state;

      const order = await strapi.entityService.findOne('api::order.order', documentId, {
        populate: ['order_items', 'order_items.product', 'order_items.product.Media', 'order_items.product.thumbnail']
      });

      if (!order) {
        return ctx.notFound('Orden no encontrada');
      }

      // Verificar que el usuario solo pueda ver sus propias órdenes
      if ((order as any).user !== user.id && user.role?.name !== 'admin') {
        return ctx.forbidden('No tienes permisos para ver esta orden');
      }

      return ctx.send({
        success: true,
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