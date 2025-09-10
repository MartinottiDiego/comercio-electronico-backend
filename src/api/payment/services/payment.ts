/**
 * payment service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::payment.payment', ({ strapi }) => ({
  /**
   * Crear un registro de pago con todos los campos necesarios
   */
  async createPayment(paymentData: any) {
    try {
      const payment = await strapi.entityService.create('api::payment.payment', {
        data: paymentData
      });

      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Actualizar el estado de un pago
   */
  async updatePaymentStatus(paymentId: string | number, status: string) {
    try {
      const payment = await strapi.entityService.update('api::payment.payment', paymentId, {
        data: { paymentStatus: status as any }
      });

      return payment;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  /**
   * Crear un pago con datos de Stripe
   */
  async createPaymentWithStripeData(session: any, orderId: number, userId?: string | null, receiptUrl?: string) {
    try {

                const paymentData = {
                  paymentIntentId: session.payment_intent,
                  checkoutSessionId: session.id,
                  amount: session.amount_total / 100,
                  currency: session.currency?.toUpperCase() || 'EUR',
                  paymentStatus: (session.payment_status === 'paid' ? 'completed' : 'pending') as 'completed' | 'pending' | 'processing' | 'failed' | 'refunded' | 'partially_refunded' | 'disputed',
                  method: 'stripe' as 'stripe' | 'paypal' | 'bank_transfer' | 'cash',
                  fee: session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0,
                  netAmount: session.amount_total / 100 - (session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0),
                  customerName: session.customer_details?.name || null,
                  customerEmail: session.customer_details?.email || null,
                  date: new Date(session.created * 1000),
                  gatewayResponse: session,
                  metadata: session.metadata || {},
                  receiptUrl: receiptUrl || session.receipt_url || session.payment_intent?.receipt_url || null,
                  order: orderId,
                  ...(userId && { user: userId })
                };

      const payment = await strapi.entityService.create('api::payment.payment', {
        data: paymentData
      });
      return payment;
    } catch (error) {
      console.error('❌ [Payment Service] Error creating payment with Stripe data:', error);
      throw error;
    }
  }
})); 