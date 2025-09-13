import { insightsAutomationService } from './lib/services/insights-automation-service';
import { RecommendationEngineService } from './api/recommendation/services/recommendation-engine.service';
import cron from 'node-cron';

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

    // Inicializar cron job para verificación de stock
    try {
      // Programar el cron job (cada 30 minutos)
      cron.schedule('*/30 * * * *', async () => {
        try {
          console.log('🔄 [CRON] Iniciando verificación automática de stock...');
          
          const startTime = Date.now();
          
          // Ejecutar verificación de stock
          const result = await strapi.service('api::stock-alert.stock-alert').checkAllProductsStock();
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          console.log(`✅ [CRON] Verificación de stock completada en ${duration}ms:`, {
            alertsCreated: result.alertsCreated,
            alertsUpdated: result.alertsUpdated,
            totalProducts: result.totalProducts
          });
          
          // Log de estadísticas
          if (result.alertsCreated > 0 || result.alertsUpdated > 0) {
            console.log(`📊 [CRON] Estadísticas de alertas:`, {
              nuevas: result.alertsCreated,
              actualizadas: result.alertsUpdated,
              productos_verificados: result.totalProducts
            });
          }
          
        } catch (error) {
          console.error('❌ [CRON] Error en verificación automática de stock:', error);
          
          // En caso de error, intentar al menos logear qué productos tienen stock bajo
          try {
            const lowStockProducts = await strapi.db.query('api::product.product').findMany({
              where: {
                $or: [
                  { active: true },
                  { active: null }
                ],
                stock: { $lte: 10 }
              },
              select: ['id', 'title', 'stock'],
              populate: ['store']
            });
            
            if (lowStockProducts.length > 0) {
              console.warn(`⚠️ [CRON] Productos con stock bajo detectados:`, 
                lowStockProducts.map(p => `${p.title} (${p.stock} unidades)`)
              );
            }
          } catch (fallbackError) {
            console.error('❌ [CRON] Error en verificación de respaldo:', fallbackError);
          }
        }
      }, {
        timezone: "America/Argentina/Buenos_Aires"
      });
      
      console.log('✅ [BOOTSTRAP] Cron job de verificación de stock programado correctamente');
      
    } catch (error) {
      console.error('❌ [BOOTSTRAP] Error inicializando cron job de stock:', error);
    }

    // Inicializar sistema de notificaciones
    // initializeNotificationSystem();
  },
};
