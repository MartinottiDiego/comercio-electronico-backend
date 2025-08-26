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
    // Inicializar cron jobs para limpieza automática
    // cron.schedule('0 2 * * *', async () => {
    //   try {
    //     await cleanupExpiredStockReservations();
    //   } catch (error) {
    //     console.error('Error en cron job de limpieza:', error);
    //   }
    // });

    // Inicializar sistema de notificaciones
    // initializeNotificationSystem();
  },
};
