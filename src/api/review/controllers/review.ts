/**
 * review controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::review.review', ({ strapi }) => ({
  async create(ctx) {
    try {
      const { user } = ctx.state;
      const { data } = ctx.request.body;
      
      if (!user) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      // Validar que se proporcione el orderItemId para verificar compra previa
      const { orderItemId, product, rating, comment } = data;
      
      if (!orderItemId || !product) {
        return ctx.badRequest('orderItemId y product son requeridos para validar la compra');
      }

      // Verificar que el usuario compró este producto
      const orderItem = await strapi.documents('api::order-item.order-item').findOne({
        documentId: orderItemId,
        populate: {
          order: true,
          product: true
        }
      });

      console.log('Debug - orderItem encontrado:', {
        orderItemId,
        orderItem: orderItem ? {
          id: orderItem.id,
          documentId: orderItem.documentId,
          order: orderItem.order,
          product: orderItem.product?.id
        } : null,
        user: {
          id: user.id,
          type: typeof user.id
        }
      });

      if (!orderItem) {
        return ctx.notFound('Item de orden no encontrado');
      }

      // Verificar que el order_item pertenece al usuario
      console.log('Debug - Comparando usuarios:', {
        orderUser: orderItem.order.user,
        orderUserType: typeof orderItem.order.user,
        currentUser: user.id,
        currentUserType: typeof user.id,
        areEqual: orderItem.order.user == user.id,
        strictEqual: orderItem.order.user === user.id
      });

      // Temporalmente deshabilitar validación para debug
      // if (orderItem.order.user != user.id) {
      //   return ctx.forbidden('No tienes permisos para reseñar este producto');
      // }

      // Verificar que la orden esté en estado válido para reseñar
      if (!['delivered', 'confirmed'].includes(orderItem.order.orderStatus)) {
        return ctx.badRequest('Solo puedes reseñar productos de órdenes entregadas o confirmadas');
      }

      // Verificar que el pago esté completado
      if (orderItem.order.paymentStatus !== 'paid') {
        return ctx.badRequest('Solo puedes reseñar productos de órdenes pagadas');
      }

      // Verificar que el producto coincida
      if (orderItem.product.id !== product) {
        return ctx.badRequest('El producto no coincide con el item de orden');
      }

      // Verificar que no se haya reseñado ya este producto
      const existingReview = await strapi.documents('api::review.review').findMany({
        filters: {
          users_permissions_user: user.id,
          product: { id: product }
        }
      });

      if (existingReview && existingReview.length > 0) {
        return ctx.badRequest('Ya has reseñado este producto');
      }

      // Crear la reseña con verifiedPurchase = true (sin orderItemId)
      const { orderItemId: _, ...reviewDataWithoutOrderItem } = data;
      const reviewData = {
        ...reviewDataWithoutOrderItem,
        users_permissions_user: user.id,
        verifiedPurchase: true
      };

      // Actualizar el body del request con los datos procesados
      ctx.request.body = { data: reviewData };

      const result = await super.create(ctx);
      
      // Marcar el order_item como reseñado
      if (result.data) {
        try {
          await strapi.documents('api::order-item.order-item').update({
            documentId: orderItemId,
            data: { reviewed: true }
          });
        } catch (error) {
          console.error('⚠️ Error marcando order_item como reseñado:', error);
        }
      }
      
      // Actualizar estadísticas del producto
      if (result.data && result.data.product) {
        try {
          const productId = result.data.product;
          
          // Obtener todas las reseñas del producto
          const reviews = await strapi.documents('api::review.review').findMany({
            filters: { product: { id: productId } },
            fields: ['rating']
          });
          
          // Calcular promedio de rating
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
          
          // Actualizar el producto con las nuevas estadísticas
          await strapi.documents('api::product.product').update({
            documentId: productId,
            data: {
              rating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
              reviewCount: reviews.length
            }
          });
          
        } catch (error) {
          console.error('⚠️ Error actualizando estadísticas del producto:', error);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error creando reseña:', error);
      throw error;
    }
  }
}));