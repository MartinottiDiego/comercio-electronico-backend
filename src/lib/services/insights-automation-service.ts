import * as cron from 'node-cron';
import { InsightsGenerators, InsightData } from './insights-generators';
import { insightsNotificationService } from './insights-notification-service';

export interface InsightTrigger {
  id: string;
  name: string;
  description: string;
  schedule: string; // Cron expression
  enabled: boolean;
  insightType: 'sales' | 'inventory' | 'user_behavior' | 'marketing' | 'product' | 'trend' | 'growth' | 'revenue' | 'engagement' | 'conversion' | 'user_registration' | 'store_activity' | 'top_products' | 'category_trends';
  scope: 'global' | 'store' | 'user';
  targetType: 'admin' | 'store' | 'user';
  conditions: any; // Condiciones específicas para cada trigger
  lastRun?: Date;
  nextRun?: Date;
}

export interface InsightGenerationResult {
  success: boolean;
  insightsCreated: number;
  errors: string[];
  executionTime: number;
}

export class InsightsAutomationService {
  private static instance: InsightsAutomationService;
  private triggers: Map<string, InsightTrigger> = new Map();
  private isInitialized = false;
  private strapi: any;

  private constructor() {}

  public static getInstance(): InsightsAutomationService {
    if (!InsightsAutomationService.instance) {
      InsightsAutomationService.instance = new InsightsAutomationService();
    }
    return InsightsAutomationService.instance;
  }

  /**
   * Inicializa el sistema de automatización de insights
   */
  public async initialize(strapiInstance: any): Promise<void> {
    if (this.isInitialized) {

      return;
    }

    try {

      
      // Guardar la instancia de Strapi
      this.strapi = strapiInstance;
      
      // Cargar triggers desde la base de datos o configuración
      await this.loadTriggers();
      
      // Programar todos los triggers
      await this.scheduleAllTriggers();
      
      this.isInitialized = true;

    } catch (error) {
      console.error('❌ [INSIGHTS AUTOMATION] Error inicializando sistema:', error);
      throw error;
    }
  }

  /**
   * Carga los triggers desde la configuración
   */
  private async loadTriggers(): Promise<void> {
    const defaultTriggers: InsightTrigger[] = [
      // Triggers para Admin Dashboard (Globales) - Enfocados en el negocio
      {
        id: 'daily-growth-insights',
        name: 'Insights de Crecimiento Diario',
        description: 'Genera insights sobre crecimiento de usuarios y tiendas cada día',
        schedule: '0 9 * * *', // Cada día a las 9:00 AM
        enabled: true,
        insightType: 'growth',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          minNewUsers: 5,
          minNewStores: 1
        }
      },
      {
        id: 'daily-revenue-insights',
        name: 'Insights de Ingresos Diarios',
        description: 'Genera insights sobre ingresos y ventas destacadas cada día',
        schedule: '0 18 * * *', // Cada día a las 6:00 PM
        enabled: true,
        insightType: 'revenue',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          minRevenue: 1000,
          minSaleAmount: 500
        }
      },
      {
        id: 'engagement-insights',
        name: 'Insights de Engagement',
        description: 'Genera insights sobre engagement de usuarios cada 6 horas',
        schedule: '0 */6 * * *', // Cada 6 horas
        enabled: true,
        insightType: 'engagement',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          minActiveUsers: 10,
          minSearchCount: 5
        }
      },
      {
        id: 'conversion-insights',
        name: 'Insights de Conversión',
        description: 'Genera insights sobre conversión y recuperación de carritos cada 4 horas',
        schedule: '0 */4 * * *', // Cada 4 horas
        enabled: true,
        insightType: 'conversion',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          minConversionRate: 1.0,
          minRecoveredCarts: 1
        }
      },
      {
        id: 'category-trends-insights',
        name: 'Insights de Tendencias de Categorías',
        description: 'Genera insights sobre categorías en tendencia cada 12 horas',
        schedule: '0 */12 * * *', // Cada 12 horas
        enabled: true,
        insightType: 'category_trends',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          minGrowthPercent: 10,
          minSearchCount: 20
        }
      },

      // Triggers para Store Dashboard (Específicos por tienda)
      {
        id: 'store-sales-insights',
        name: 'Insights de Ventas por Tienda',
        description: 'Genera insights sobre ventas específicas de cada tienda cada 2 horas',
        schedule: '0 */2 * * *', // Cada 2 horas
        enabled: true,
        insightType: 'sales',
        scope: 'store',
        targetType: 'store',
        conditions: {
          minSales: 100,
          comparisonPeriodHours: 24
        }
      },
      {
        id: 'store-inventory-insights',
        name: 'Insights de Inventario por Tienda',
        description: 'Genera insights sobre inventario de cada tienda cada 4 horas',
        schedule: '0 */4 * * *', // Cada 4 horas
        enabled: true,
        insightType: 'inventory',
        scope: 'store',
        targetType: 'store',
        conditions: {
          lowStockThreshold: 10,
          criticalStockThreshold: 5
        }
      }
    ];

    // Cargar triggers en el mapa
    for (const trigger of defaultTriggers) {
      this.triggers.set(trigger.id, trigger);
    }


  }

  /**
   * Programa todos los triggers activos
   */
  private async scheduleAllTriggers(): Promise<void> {
    for (const [triggerId, trigger] of this.triggers) {
      if (trigger.enabled) {
        await this.scheduleTrigger(trigger);
      }
    }
  }

  /**
   * Programa un trigger específico
   */
  private async scheduleTrigger(trigger: InsightTrigger): Promise<void> {
    try {
      const task = cron.schedule(trigger.schedule, async () => {
        try {

          await this.executeTrigger(trigger);
        } catch (error) {
          console.error(`❌ [INSIGHTS AUTOMATION] Error ejecutando trigger ${trigger.name}:`, error);
        }
      }, {
        timezone: 'America/Argentina/Buenos_Aires'
      });

      task.start();
      
      // Calcular próxima ejecución
      const nextRun = this.calculateNextRun(trigger.schedule);
      trigger.nextRun = nextRun;
      

    } catch (error) {
      console.error(`❌ [INSIGHTS AUTOMATION] Error programando trigger ${trigger.name}:`, error);
    }
  }

  /**
   * Ejecuta un trigger específico
   */
  private async executeTrigger(trigger: InsightTrigger): Promise<InsightGenerationResult> {
    const startTime = Date.now();
    const result: InsightGenerationResult = {
      success: true,
      insightsCreated: 0,
      errors: [],
      executionTime: 0
    };

    try {


      // Verificar que strapi esté disponible antes de ejecutar
      if (!this.strapi || !this.strapi.entityService) {
        throw new Error('Strapi no está disponible. El sistema puede no estar completamente inicializado.');
      }

      // Actualizar última ejecución
      trigger.lastRun = new Date();

      // Ejecutar generador específico según el tipo
      switch (trigger.insightType) {
        case 'growth':
          result.insightsCreated = await this.generateGrowthInsights(trigger);
          break;
        case 'revenue':
          result.insightsCreated = await this.generateRevenueInsights(trigger);
          break;
        case 'engagement':
          result.insightsCreated = await this.generateEngagementInsights(trigger);
          break;
        case 'conversion':
          result.insightsCreated = await this.generateConversionInsights(trigger);
          break;
        case 'category_trends':
          result.insightsCreated = await this.generateCategoryTrendsInsights(trigger);
          break;
        case 'sales':
          result.insightsCreated = await this.generateSalesInsights(trigger);
          break;
        case 'inventory':
          result.insightsCreated = await this.generateInventoryInsights(trigger);
          break;
        default:
          throw new Error(`Tipo de insight no soportado: ${trigger.insightType}`);
      }

      // Calcular próxima ejecución
      trigger.nextRun = this.calculateNextRun(trigger.schedule);



    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Error desconocido');
      console.error(`❌ [INSIGHTS AUTOMATION] Error en trigger ${trigger.name}:`, error);
      
      // Si es un error de strapi no disponible, intentar reintentar más tarde
      if (error instanceof Error && error.message.includes('Strapi no está disponible')) {

        // Programar reintento en 5 minutos
        setTimeout(async () => {
          try {
            await this.executeTrigger(trigger);
          } catch (retryError) {
            console.error(`❌ [INSIGHTS AUTOMATION] Error en reintento de trigger ${trigger.name}:`, retryError);
          }
        }, 5 * 60 * 1000); // 5 minutos
      }
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Genera insights de crecimiento
   */
  private async generateGrowthInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateGrowthInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de ingresos
   */
  private async generateRevenueInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateRevenueInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de engagement
   */
  private async generateEngagementInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateEngagementInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de conversión
   */
  private async generateConversionInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateConversionInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de tendencias de categorías
   */
  private async generateCategoryTrendsInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateCategoryTrendsInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de inventario
   */
  private async generateInventoryInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateInventoryInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de ventas
   */
  private async generateSalesInsights(trigger: InsightTrigger): Promise<number> {

    const insights = await InsightsGenerators.generateSalesInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Guarda los insights generados en la base de datos
   */
  private async saveInsights(insights: InsightData[]): Promise<number> {
    let savedCount = 0;
    
    for (const insightData of insights) {
      try {
        // Verificar que strapi esté disponible
        if (!this.strapi || !this.strapi.entityService) {
          console.error(`❌ [INSIGHTS AUTOMATION] Strapi no disponible para guardar insight: ${insightData.title}`);
          continue;
        }

        await this.strapi.entityService.create('api::insight.insight', {
          data: {
            type: insightData.type,
            title: insightData.title,
            description: insightData.description,
            severity: insightData.severity,
            category: insightData.category,
            data: insightData.data,
            recommendations: insightData.recommendations,
            scope: insightData.scope,
            targetType: insightData.targetType,
            targetId: insightData.targetId,
            priority: insightData.priority,
            actionRequired: insightData.actionRequired,
            isRead: false,
            timestamp: new Date()
          }
        });
        savedCount++;


        // Enviar notificaciones para insights importantes
        if (insightData.severity === 'critical' || insightData.severity === 'high') {
          await insightsNotificationService.notifyInsight(insightData);
        }

      } catch (error) {
        console.error(`❌ [INSIGHTS AUTOMATION] Error guardando insight "${insightData.title}":`, error);
      }
    }
    
    return savedCount;
  }

  /**
   * Calcula la próxima ejecución basada en la expresión cron
   */
  private calculateNextRun(cronExpression: string): Date {
    // Implementación simplificada - en producción usar una librería como 'cron-parser'
    const now = new Date();
    const nextRun = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos por defecto
    return nextRun;
  }

  /**
   * Obtiene el estado de todos los triggers
   */
  public getTriggersStatus(): InsightTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Habilita/deshabilita un trigger
   */
  public async toggleTrigger(triggerId: string, enabled: boolean): Promise<boolean> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return false;
    }

    trigger.enabled = enabled;
    
    if (enabled) {
      await this.scheduleTrigger(trigger);
    }

    return true;
  }

  /**
   * Ejecuta un trigger manualmente
   */
  public async executeTriggerManually(triggerId: string): Promise<InsightGenerationResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger no encontrado: ${triggerId}`);
    }

    return await this.executeTrigger(trigger);
  }

  /**
   * Detiene el sistema de automatización
   */
  public stop(): void {

    cron.getTasks().forEach(task => task.stop());
    this.isInitialized = false;
  }
}

export const insightsAutomationService = InsightsAutomationService.getInstance();
