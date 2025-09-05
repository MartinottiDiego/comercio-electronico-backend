import { insightsAutomationService } from './lib/services/insights-automation-service';
import { RecommendationEngineService } from './api/recommendation/services/recommendation-engine.service';

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
  async bootstrap({ strapi }) {

    try {
      // Inicializar sistema de automatización de insights
      await insightsAutomationService.initialize(strapi);

    } catch (error) {
      console.error('❌ [BOOTSTRAP] Error inicializando automatización de insights:', error);
    }

    try {
      // Inicializar motor de recomendaciones
      const recommendationEngine = new RecommendationEngineService(strapi);
      await recommendationEngine.initialize();
      
      // Hacer el servicio disponible globalmente
      strapi.recommendationEngine = recommendationEngine;
      
      console.log('✅ [BOOTSTRAP] Motor de recomendaciones inicializado correctamente');

    } catch (error) {
      console.error('❌ [BOOTSTRAP] Error inicializando motor de recomendaciones:', error);
    }

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
