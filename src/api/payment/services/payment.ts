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
  }
})); 