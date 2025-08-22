/**
 * payment service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::payment.payment', ({ strapi }) => ({
  /**
   * Crear un registro de pago con todos los campos necesarios
   */
  async createPaymentWithStripeData(stripeData: any, orderId: number, userId?: string | null) {
    try {
      const paymentData = {
        paymentIntentId: stripeData.payment_intent || stripeData.id || `pi_${Date.now()}`,
        checkoutSessionId: stripeData.id,
        amount: stripeData.amount_total / 100,
        currency: stripeData.currency?.toUpperCase() || 'EUR',
        paymentStatus: (stripeData.payment_status === 'paid' ? 'completed' : 'pending') as 'completed' | 'pending',
        method: 'stripe' as 'stripe',
        date: new Date(),
        customerEmail: stripeData.customer_email || stripeData.customer_details?.email,
        customerName: stripeData.customer_details?.name || stripeData.customer_email || 'Cliente',
        fee: 0, // Stripe cobra comisiones, pero no las tenemos aquí
        netAmount: stripeData.amount_total / 100, // Por defecto igual al amount
        gatewayResponse: {
          stripe_session_id: stripeData.id,
          stripe_payment_intent: stripeData.payment_intent,
          stripe_customer_id: stripeData.customer,
          payment_status: stripeData.payment_status,
          amount_total: stripeData.amount_total,
          currency: stripeData.currency,
          created_at: stripeData.created,
          metadata: stripeData.metadata || {},
          customer_details: stripeData.customer_details || {}
        },
        metadata: stripeData.metadata || {},
        order: orderId,
        ...(userId && { user: userId })
      };

      console.log('🔵 [Payment Service] Creating payment with data:', JSON.stringify(paymentData, null, 2));

      const payment = await strapi.entityService.create('api::payment.payment', {
        data: paymentData
      });

      console.log('✅ [Payment Service] Payment created successfully:', payment.id);
      return payment;
    } catch (error) {
      console.error('❌ [Payment Service] Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Actualizar el estado de un pago
   */
  async updatePaymentStatus(paymentId: number, status: string, additionalData?: any) {
    try {
      const updateData: any = { status };
      
      if (additionalData) {
        updateData.gatewayResponse = {
          ...additionalData,
          updatedAt: new Date().toISOString()
        };
      }

      const payment = await strapi.entityService.update('api::payment.payment', paymentId, {
        data: updateData
      });

      console.log(`✅ [Payment Service] Payment ${paymentId} status updated to: ${status}`);
      return payment;
    } catch (error) {
      console.error(`❌ [Payment Service] Error updating payment status:`, error);
      throw error;
    }
  }
})); 