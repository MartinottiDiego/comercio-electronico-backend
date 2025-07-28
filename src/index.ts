

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    // Cron job para limpiar reservas expiradas cada 5 minutos
    setInterval(async () => {
      try {
                    await strapi.service('api::product.product').cleanupExpiredReservations();
      } catch (error) {
        console.error('Error in cleanup cron job:', error);
      }
    }, 5 * 60 * 1000); // 5 minutos

    console.log('🕐 Stock reservation cleanup cron job started');
  },
};
