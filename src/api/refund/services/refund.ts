/**
 * refund service - Sistema robusto de reembolsos
 */

import { factories } from '@strapi/strapi';
import { stripe } from '../../../../config/stripe';

export default factories.createCoreService('api::refund.refund', ({ strapi }) => ({
  /**
   * Crear una nueva solicitud de reembolso con validaciones completas
   */
  async createRefundRequest(userId: string | number, orderId: string | number, refundData: any) {
    try {
      // 1. Verificar que la orden existe y pertenece al usuario
      const order = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: ['payments', 'user']
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }

      // Verificar permisos del usuario - la orden puede tener user como ID o como objeto populado
      const orderUserId = (order as any).user?.id || (order as any).user;
      if (orderUserId != userId) { // Usar == en lugar de !== para comparar string vs number
        throw new Error('No tienes permisos para solicitar reembolso de esta orden');
      }

      // 2. Verificar que hay un pago válido
      const validPayment = (order as any).payments?.[0] || (order as any).payment;

      if (!validPayment) {
        throw new Error('No se encontró un pago válido para esta orden');
      }

      // 3. Verificar que no existe ya un reembolso para esta orden
      const existingRefund = await strapi.entityService.findMany('api::refund.refund', {
        filters: { order: orderId as any }
      });

      if (existingRefund.length > 0) {
        throw new Error('Ya existe una solicitud de reembolso para esta orden');
      }

      // 4. Crear el reembolso
      const refund = await strapi.entityService.findOne('api::refund.refund', (await strapi.entityService.create('api::refund.refund', {
        data: {
          order: orderId,
          user: userId,
          amount: refundData.amount,
          reason: refundData.reason,
          description: refundData.description,
          refundStatus: 'pending',
          payment: validPayment,
          currency: 'EUR',
          refundId: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
        }
      })).id, {
        populate: {
          order: { 
            populate: { 
              user: true, 
              order_items: { 
                populate: { 
                  product: { 
                    populate: { 
                      store: true 
                    } 
                  } 
                } 
              } 
            } 
          },
          user: true
        }
      });

      // 5. Enviar notificaciones por email y crear notificaciones en BD
      try {
        await this.sendRefundNotification(refund, 'request_created');
        console.log('📧 Email de solicitud de reembolso enviado exitosamente');
        
        // Crear notificación en base de datos para el frontend
        await this.createRefundNotifications(refund, 'request_created');
        console.log('📱 Notificaciones de reembolso creadas en BD exitosamente');
      } catch (notificationError) {
        console.error('⚠️ Error enviando notificaciones de reembolso:', notificationError);
        // No fallar si las notificaciones fallan, solo logear el error
      }

      return refund;
    } catch (error) {
      console.error('Error creating refund request:', error);
      throw error;
    }
  },

  /**
   * Validar elegibilidad para reembolso
   */
  async validateRefundEligibility(order: any, productId?: string, amount?: number) {
    try {
      // 1. Verificar estado de la orden (usar order_status que es el campo real en la BD)
      const orderStatus = order.orderStatus || order.status;
      if (!['delivered', 'completed'].includes(orderStatus)) {
        return {
          eligible: false,
          reason: 'La orden debe estar entregada para solicitar un reembolso'
        };
      }

      // 2. Verificar tiempo límite (7 días desde entrega o desde la última actualización)
      let referenceDate: Date;
      
      if (order.deliveredAt) {
        // Si hay fecha de entrega, usarla
        referenceDate = new Date(order.deliveredAt);
      } else if (orderStatus === 'delivered') {
        // Si el estado es 'delivered' pero no hay fecha, usar la fecha de actualización
        referenceDate = new Date(order.updatedAt);
      } else {
        // Fallback a la fecha de creación
        referenceDate = new Date(order.createdAt);
      }
      
      const daysSinceDelivery = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceDelivery > 7) {
        return {
          eligible: false,
          reason: `El período para solicitar reembolsos ha expirado (${daysSinceDelivery} días desde la entrega)`
        };
      }

      // 3. Verificar monto si se especifica
      if (amount && amount > order.total) {
        return {
          eligible: false,
          reason: 'El monto de reembolso no puede ser mayor al total de la orden'
        };
      }

      return {
        eligible: true,
        daysSinceDelivery,
        maxRefundAmount: order.total,
        daysRemaining: 7 - daysSinceDelivery
      };
    } catch (error) {
      console.error('Error validating refund eligibility:', error);
      return {
        eligible: false,
        reason: 'Error al validar elegibilidad para reembolso'
      };
    }
  },

  /**
   * Actualizar estado de reembolso
   */
  async updateRefundStatus(params: {
    refundId: string;
    newStatus: string;
    updatedBy: any;
    comment?: string;
    processAutomatically?: boolean;
  }) {
    const { refundId, newStatus, updatedBy, comment, processAutomatically = true } = params;

    try {
      const refund = await strapi.entityService.findOne('api::refund.refund', refundId, {
        populate: {
          order: { populate: { user: true } },
          payment: true,
          user: true
        }
      });

      if (!refund) {
        throw new Error('Reembolso no encontrado');
      }

      // Validar transición de estado
      const validTransitions = this.getValidStatusTransitions(refund.refundStatus);
      if (!validTransitions.includes(newStatus)) {
        throw new Error(`Transición de estado inválida: ${refund.refundStatus} -> ${newStatus}`);
      }

      const currentMetadata = (refund.metadata as any) || {};
      let updateData: any = {
        refundStatus: newStatus,
        metadata: {
          ...currentMetadata,
          statusHistory: [
            ...(currentMetadata.statusHistory || []),
            {
              status: newStatus,
              updatedBy: updatedBy.id,
              comment,
              timestamp: new Date().toISOString()
            }
          ]
        }
      };

      // Si se está aprobando, procesar con Stripe
      if (newStatus === 'processing' && processAutomatically) {
        try {
          const stripeResult = await this.processRefundWithStripe({
            refundId,
            processedBy: updatedBy
          });
          
          updateData.refundStatus = 'completed';
          updateData.processedAt = new Date();
          updateData.processedBy = updatedBy.id;
          updateData.metadata = {
            ...updateData.metadata,
            stripeRefundId: stripeResult.stripeRefundId
          };
          
          // Si se completó exitosamente, enviar notificación de completado
          const finalStatus = 'completed';
        } catch (stripeError) {
          console.error('Error processing with Stripe:', stripeError);
          updateData.refundStatus = 'failed';
          updateData.metadata = {
            ...updateData.metadata,
            stripeError: stripeError.message
          };
        }
      }

      const updatedRefund = await strapi.entityService.update('api::refund.refund', refundId, {
        data: updateData,
        populate: {
          order: { populate: { user: true } },
          payment: true,
          user: true
        }
      });

      // Enviar notificaciones por email y crear notificaciones en BD
      await this.sendRefundNotification(updatedRefund, 'status_updated');
      
      // Crear notificación en base de datos para el frontend
      try {
        // Si el reembolso se completó, enviar notificación especial
        if (newStatus === 'completed') {
          await this.createRefundNotifications(updatedRefund, 'completed');
          console.log('📱 Notificación de reembolso completado creada en BD');
        } else {
          await this.createRefundNotifications(updatedRefund, 'status_updated');
          console.log('📱 Notificación de actualización de estado creada en BD');
        }
      } catch (notificationError) {
        console.error('⚠️ Error creando notificación de actualización:', notificationError);
      }
      
      return updatedRefund;
    } catch (error) {
      console.error('Error updating refund status:', error);
      throw error;
    }
  },

  /**
   * Procesar reembolso con Stripe
   */
  async processRefundWithStripe(params: {
    refundId: string;
    processedBy: any;
    force?: boolean;
  }) {
    const { refundId, processedBy, force = false } = params;

    try {
      const refund = await strapi.entityService.findOne('api::refund.refund', refundId, {
        populate: {
          payment: true,
          order: true
        }
      }) as any;

      if (!refund) {
        throw new Error('Reembolso no encontrado');
      }

      const payment = refund.payment;
      if (!payment || !payment.paymentIntentId) {
        throw new Error('No se encontró Payment Intent válido para este reembolso');
      }

      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.paymentIntentId,
        amount: Math.round(refund.amount * 100),
        reason: this.mapReasonToStripe(refund.reason) as any,
        metadata: {
          refundId: refund.refundId,
          orderId: refund.order?.orderNumber || 'N/A',
          processedBy: processedBy.email
        }
      });

      return {
        stripeRefundId: stripeRefund.id,
        stripeStatus: stripeRefund.status
      };
    } catch (error) {
      console.error('Error processing refund with Stripe:', error);
      throw error;
    }
  },

  /**
   * Obtener reembolsos de una tienda
   */
  async getStoreRefunds(params: {
    storeId: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { storeId, status, page, limit } = params;

    try {
      const filters: any = {
        order: {
          order_items: {
            product: {
              store: {
                email: storeId
              }
            }
          }
        }
      };

      if (status) {
        filters.refundStatus = status;
      }

      const refunds = await strapi.entityService.findMany('api::refund.refund', {
        filters,
        populate: {
          order: {
            populate: {
              user: true,
              order_items: {
                populate: {
                  product: true
                }
              }
            }
          },
          payment: true,
          user: true
        },
        sort: { createdAt: 'desc' },
        start: (page - 1) * limit,
        limit
      });

      const total = await strapi.entityService.count('api::refund.refund', { filters });

      return {
        data: refunds,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting store refunds:', error);
      throw error;
    }
  },

  /**
   * Obtener reembolsos de un usuario
   */
  async getUserRefunds(params: {
    userId: number;
    userEmail: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { userId, status, page, limit } = params;

    try {
      const filters: any = { user: userId };
      
      if (status) {
        filters.refundStatus = status;
      }

      const refunds = await strapi.entityService.findMany('api::refund.refund', {
        filters,
        populate: {
          order: {
            populate: {
              order_items: {
                populate: {
                  product: true
                }
              }
            }
          },
          payment: true
        },
        sort: { createdAt: 'desc' },
        start: (page - 1) * limit,
        limit
      });

      const total = await strapi.entityService.count('api::refund.refund', { filters });

      return {
        data: refunds,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user refunds:', error);
      throw error;
    }
  },

  /**
   * Obtener analytics de reembolsos
   */
  async getRefundAnalytics(params: {
    storeId: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { storeId, startDate, endDate } = params;

    try {
      const filters: any = {
        order: {
          order_items: {
            product: {
              store: {
                email: storeId
              }
            }
          }
        }
      };

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = startDate;
        if (endDate) filters.createdAt.$lte = endDate;
      }

      const refunds = await strapi.entityService.findMany('api::refund.refund', {
        filters,
        populate: ['order']
      }) as any[];

      const totalRefunds = refunds.length;
      const pendingRefunds = refunds.filter(r => r.refundStatus === 'pending').length;
      const completedRefunds = refunds.filter(r => r.refundStatus === 'completed').length;
      const rejectedRefunds = refunds.filter(r => r.refundStatus === 'rejected').length;
      const totalRefundAmount = refunds
        .filter(r => r.refundStatus === 'completed')
        .reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

      const refundsByReason = refunds.reduce((acc, refund) => {
        acc[refund.reason] = (acc[refund.reason] || 0) + 1;
        return acc;
      }, {});

      return {
        summary: {
          totalRefunds,
          pendingRefunds,
          completedRefunds,
          rejectedRefunds,
          totalRefundAmount,
          averageRefundAmount: completedRefunds > 0 ? totalRefundAmount / completedRefunds : 0,
          approvalRate: (completedRefunds + rejectedRefunds) > 0 ? (completedRefunds / (completedRefunds + rejectedRefunds)) * 100 : 0
        },
        breakdowns: {
          byReason: refundsByReason
        }
      };
    } catch (error) {
      console.error('Error getting refund analytics:', error);
      throw error;
    }
  },

  /**
   * Enviar notificaciones de reembolso
   */
  async sendRefundNotification(refund: any, type: string) {
    try {
      // Usar el servicio de email
      const { EmailService } = require('../../../lib/email-service');
      const emailService = EmailService.getInstance();
      
      switch (type) {
        case 'request_created':
          // Obtener datos completos del usuario
          const userWithProfile = await strapi.entityService.findOne('plugin::users-permissions.user', refund.user.id, {
            populate: ['profile']
          });
          
          // 1. Enviar email de confirmación al usuario que solicitó el reembolso
          await emailService.sendRefundRequestConfirmationToUser(
            refund,
            refund.order,
            userWithProfile
          );
          
          // 2. Enviar email de notificación a la tienda
          // Obtener el email del owner de la tienda
          const store = refund.order?.order_items?.[0]?.product?.store;
          
          if (!store) {
            console.error('❌ No se pudo obtener la tienda del producto');
            return;
          }
          
          // Hacer una consulta separada para obtener la tienda con su owner
          const storeWithOwner = await strapi.entityService.findOne('api::store.store', store.id, {
            populate: ['owner']
          }) as any;
          
          if (!storeWithOwner?.owner) {
            console.error('❌ La tienda no tiene owner asignado');
            return;
          }
          
          // Obtener el email del owner de la tienda
          const storeOwner = await strapi.entityService.findOne('plugin::users-permissions.user', storeWithOwner.owner.id, {
            fields: ['email']
          });
          
          if (!storeOwner || !storeOwner.email) {
            console.error('❌ No se pudo obtener el email del owner de la tienda');
            return;
          }
          
          await emailService.sendRefundRequestNotificationToStore(
            refund,
            refund.order,
            userWithProfile,
            storeOwner.email
          );
          break;
          
        case 'status_updated':
          // Notificar al cliente
          await emailService.sendRefundStatusUpdateEmail(
            refund,
            refund.order,
            refund.user
          );
          break;
          
        case 'completed':
          // Notificar reembolso completado
          await emailService.sendRefundCompletedEmail(
            refund,
            refund.order,
            refund.user
          );
          break;
      }
      
    } catch (error) {
      console.error('Error sending refund notification:', error);
      // No fallar si el email falla, solo logear el error
    }
  },

  /**
   * Crear notificaciones en base de datos para el frontend
   */
  async createRefundNotifications(refund: any, type: string) {
    try {
      const notificationService = strapi.service('api::notification.notification');
      
      switch (type) {
        case 'request_created':
          // 1. Notificación para el usuario que solicitó el reembolso
          await notificationService.createNotification({
            type: 'refund_requested',
            title: `🔄 Solicitud de Reembolso Creada`,
            message: `Has solicitado un reembolso de €${refund.amount} para el pedido #${refund.order?.orderNumber}. Tu solicitud está siendo revisada.`,
            recipientEmail: refund.user?.email,
            recipientRole: 'comprador',
            actionUrl: `/historial-compras`,
            actionText: 'Ver Historial',
            priority: 'normal'
          });
          
          // 2. Notificación para la tienda
          const store = refund.order?.order_items?.[0]?.product?.store;
          
          if (store) {
            // Hacer una consulta separada para obtener la tienda con su owner (igual que en sendRefundNotification)
            const storeWithOwner = await strapi.entityService.findOne('api::store.store', store.id, {
              populate: ['owner']
            }) as any;
            
            if (storeWithOwner?.owner) {
              // Obtener el email del owner de la tienda
              const storeOwner = await strapi.entityService.findOne('plugin::users-permissions.user', storeWithOwner.owner.id, {
                fields: ['email']
              });
              
              if (storeOwner?.email) {
                              await notificationService.createNotification({
                type: 'refund_requested',
                title: `🔄 Nueva Solicitud de Reembolso`,
                message: `El usuario ${refund.user?.email} ha solicitado un reembolso de €${refund.amount} para el pedido #${refund.order?.orderNumber}.`,
                recipientEmail: storeOwner.email,
                recipientRole: 'tienda',
                actionUrl: `/dashboard/reembolsos`,
                actionText: 'Revisar Solicitud',
                priority: 'high'
              });
                console.log('✅ [RefundService] Notificación para la tienda creada exitosamente');
              } else {
                console.error('❌ [RefundService] No se pudo obtener el email del owner de la tienda');
              }
            } else {
              console.error('❌ [RefundService] La tienda no tiene owner asignado');
            }
          } else {
            console.error('❌ [RefundService] No se pudo obtener la tienda del producto');
          }
          break;
          
        case 'status_updated':
          // Notificación de actualización de estado para el usuario
          const statusMessages = {
            'completed': `✅ Tu reembolso de €${refund.amount} ha sido procesado exitosamente.`,
            'rejected': `❌ Tu solicitud de reembolso ha sido rechazada.`,
            'processing': `🔄 Tu solicitud de reembolso ha sido aprobada y está siendo procesada.`,
            'failed': `⚠️ Hubo un problema al procesar tu reembolso.`
          };
          
          await notificationService.createNotification({
            type: 'refund_requested',
            title: `📊 Actualización de Reembolso`,
            message: statusMessages[refund.refundStatus] || `Tu reembolso ha cambiado a estado: ${refund.refundStatus}`,
            recipientEmail: refund.user?.email,
            recipientRole: 'comprador',
            actionUrl: `/historial-compras`,
            actionText: 'Ver Historial',
            priority: refund.refundStatus === 'completed' ? 'high' : 'normal'
          });
          break;
          
        case 'completed':
          // Notificación de reembolso completado
          await notificationService.createNotification({
            type: 'refund_approved',
            title: `✅ ¡Reembolso Completado!`,
            message: `Tu reembolso de €${refund.amount} ha sido procesado exitosamente. El dinero será devuelto en 3-5 días hábiles.`,
            recipientEmail: refund.user?.email,
            recipientRole: 'comprador',
            actionUrl: `/historial-compras`,
            actionText: 'Ver Detalles',
            priority: 'high'
          });
          break;
      }
      
    } catch (error) {
      console.error('Error creating refund notifications:', error);
      // No fallar si las notificaciones fallan
    }
  },

  /**
   * Obtener transiciones válidas de estado
   */
  getValidStatusTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      'pending': ['processing', 'rejected'],
      'processing': ['completed', 'failed'],
      'completed': [],
      'failed': ['processing'],
      'rejected': [],
      'cancelled': []
    };

    return transitions[currentStatus] || [];
  },

  /**
   * Mapear razón de reembolso a Stripe
   */
  mapReasonToStripe(reason: string): string {
    const mapping: Record<string, string> = {
      'duplicate': 'duplicate',
      'fraudulent': 'fraudulent',
      'requested_by_customer': 'requested_by_customer',
      'defective_product': 'requested_by_customer',
      'wrong_size': 'requested_by_customer',
      'damaged': 'requested_by_customer',
      'not_as_described': 'requested_by_customer',
      'other': 'requested_by_customer'
    };

    return mapping[reason] || 'requested_by_customer';
  }
}));
