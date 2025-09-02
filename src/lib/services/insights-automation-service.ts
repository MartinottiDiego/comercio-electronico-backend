import * as cron from 'node-cron';
import { InsightsGenerators, InsightData } from './insights-generators';
import { insightsNotificationService } from './insights-notification-service';

export interface InsightTrigger {
  id: string;
  name: string;
  description: string;
  schedule: string; // Cron expression
  enabled: boolean;
  insightType: 'sales' | 'inventory' | 'user_behavior' | 'marketing' | 'product' | 'trend' | 'system' | 'performance' | 'security';
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
      console.log('🔄 [INSIGHTS AUTOMATION] Sistema ya inicializado');
      return;
    }

    try {
      console.log('🚀 [INSIGHTS AUTOMATION] Inicializando sistema de automatización...');
      
      // Guardar la instancia de Strapi
      this.strapi = strapiInstance;
      
      // Cargar triggers desde la base de datos o configuración
      await this.loadTriggers();
      
      // Programar todos los triggers
      await this.scheduleAllTriggers();
      
      this.isInitialized = true;
      console.log('✅ [INSIGHTS AUTOMATION] Sistema inicializado correctamente');
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
      // Triggers para Admin Dashboard (Globales)
      {
        id: 'system-performance-check',
        name: 'Verificación de Rendimiento del Sistema',
        description: 'Monitorea el rendimiento del sistema cada 15 minutos',
        schedule: '*/15 * * * *', // Cada 15 minutos
        enabled: true,
        insightType: 'performance',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          responseTimeThreshold: 2000, // ms
          memoryUsageThreshold: 80, // %
          cpuUsageThreshold: 80 // %
        }
      },
      {
        id: 'security-monitoring',
        name: 'Monitoreo de Seguridad',
        description: 'Detecta intentos de login fallidos y actividad sospechosa',
        schedule: '*/5 * * * *', // Cada 5 minutos
        enabled: true,
        insightType: 'security',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          failedLoginThreshold: 10, // intentos por minuto
          suspiciousIpThreshold: 5 // IPs diferentes en 5 minutos
        }
      },
      {
        id: 'system-health-check',
        name: 'Verificación de Salud del Sistema',
        description: 'Verifica la salud general del sistema cada hora',
        schedule: '0 * * * *', // Cada hora
        enabled: true,
        insightType: 'system',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          diskUsageThreshold: 85, // %
          databaseConnectionsThreshold: 80 // %
        }
      },
      {
        id: 'sales-trend-analysis',
        name: 'Análisis de Tendencias de Ventas',
        description: 'Analiza tendencias de ventas globales cada 6 horas',
        schedule: '0 */6 * * *', // Cada 6 horas
        enabled: true,
        insightType: 'trend',
        scope: 'global',
        targetType: 'admin',
        conditions: {
          minOrdersForAnalysis: 10,
          trendPeriodHours: 24
        }
      },

      // Triggers para Store Dashboard (Específicos por tienda)
      {
        id: 'inventory-low-stock-check',
        name: 'Verificación de Stock Bajo',
        description: 'Verifica productos con stock bajo cada 30 minutos',
        schedule: '*/30 * * * *', // Cada 30 minutos
        enabled: true,
        insightType: 'inventory',
        scope: 'store',
        targetType: 'store',
        conditions: {
          lowStockThreshold: 10, // unidades
          criticalStockThreshold: 5 // unidades
        }
      },
      {
        id: 'store-sales-analysis',
        name: 'Análisis de Ventas por Tienda',
        description: 'Analiza ventas específicas de cada tienda cada 2 horas',
        schedule: '0 */2 * * *', // Cada 2 horas
        enabled: true,
        insightType: 'sales',
        scope: 'store',
        targetType: 'store',
        conditions: {
          minSalesForAnalysis: 5,
          comparisonPeriodHours: 24
        }
      },
      {
        id: 'user-behavior-analysis',
        name: 'Análisis de Comportamiento de Usuarios',
        description: 'Analiza comportamiento de usuarios por tienda cada 4 horas',
        schedule: '0 */4 * * *', // Cada 4 horas
        enabled: true,
        insightType: 'user_behavior',
        scope: 'store',
        targetType: 'store',
        conditions: {
          minUsersForAnalysis: 10,
          analysisPeriodHours: 24
        }
      },
      {
        id: 'product-performance-analysis',
        name: 'Análisis de Rendimiento de Productos',
        description: 'Analiza rendimiento de productos por tienda cada 6 horas',
        schedule: '0 */6 * * *', // Cada 6 horas
        enabled: true,
        insightType: 'product',
        scope: 'store',
        targetType: 'store',
        conditions: {
          minProductsForAnalysis: 5,
          analysisPeriodHours: 48
        }
      }
    ];

    // Cargar triggers en el mapa
    for (const trigger of defaultTriggers) {
      this.triggers.set(trigger.id, trigger);
    }

    console.log(`📋 [INSIGHTS AUTOMATION] Cargados ${defaultTriggers.length} triggers`);
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
          console.log(`🔄 [INSIGHTS AUTOMATION] Ejecutando trigger: ${trigger.name}`);
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
      
      console.log(`⏰ [INSIGHTS AUTOMATION] Trigger programado: ${trigger.name} - Próxima ejecución: ${nextRun.toISOString()}`);
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
      console.log(`🎯 [INSIGHTS AUTOMATION] Ejecutando: ${trigger.name}`);

      // Verificar que strapi esté disponible antes de ejecutar
      if (!this.strapi || !this.strapi.entityService) {
        throw new Error('Strapi no está disponible. El sistema puede no estar completamente inicializado.');
      }

      // Actualizar última ejecución
      trigger.lastRun = new Date();

      // Ejecutar generador específico según el tipo
      switch (trigger.insightType) {
        case 'system':
          result.insightsCreated = await this.generateSystemInsights(trigger);
          break;
        case 'performance':
          result.insightsCreated = await this.generatePerformanceInsights(trigger);
          break;
        case 'security':
          result.insightsCreated = await this.generateSecurityInsights(trigger);
          break;
        case 'inventory':
          result.insightsCreated = await this.generateInventoryInsights(trigger);
          break;
        case 'sales':
          result.insightsCreated = await this.generateSalesInsights(trigger);
          break;
        case 'user_behavior':
          result.insightsCreated = await this.generateUserBehaviorInsights(trigger);
          break;
        case 'product':
          result.insightsCreated = await this.generateProductInsights(trigger);
          break;
        case 'trend':
          result.insightsCreated = await this.generateTrendInsights(trigger);
          break;
        default:
          throw new Error(`Tipo de insight no soportado: ${trigger.insightType}`);
      }

      // Calcular próxima ejecución
      trigger.nextRun = this.calculateNextRun(trigger.schedule);

      console.log(`✅ [INSIGHTS AUTOMATION] Trigger completado: ${trigger.name} - Insights creados: ${result.insightsCreated}`);

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Error desconocido');
      console.error(`❌ [INSIGHTS AUTOMATION] Error en trigger ${trigger.name}:`, error);
      
      // Si es un error de strapi no disponible, intentar reintentar más tarde
      if (error instanceof Error && error.message.includes('Strapi no está disponible')) {
        console.log(`🔄 [INSIGHTS AUTOMATION] Reintentando trigger ${trigger.name} en 5 minutos...`);
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
   * Genera insights de sistema
   */
  private async generateSystemInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`🔧 [INSIGHTS AUTOMATION] Generando insights de sistema...`);
    const insights = await InsightsGenerators.generateSystemInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de rendimiento
   */
  private async generatePerformanceInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`⚡ [INSIGHTS AUTOMATION] Generando insights de rendimiento...`);
    const insights = await InsightsGenerators.generatePerformanceInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de seguridad
   */
  private async generateSecurityInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`🔒 [INSIGHTS AUTOMATION] Generando insights de seguridad...`);
    const insights = await InsightsGenerators.generateSecurityInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de inventario
   */
  private async generateInventoryInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`📦 [INSIGHTS AUTOMATION] Generando insights de inventario...`);
    const insights = await InsightsGenerators.generateInventoryInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de ventas
   */
  private async generateSalesInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`💰 [INSIGHTS AUTOMATION] Generando insights de ventas...`);
    const insights = await InsightsGenerators.generateSalesInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de comportamiento de usuario
   */
  private async generateUserBehaviorInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`👥 [INSIGHTS AUTOMATION] Generando insights de comportamiento de usuario...`);
    const insights = await InsightsGenerators.generateUserBehaviorInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de productos
   */
  private async generateProductInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`🛍️ [INSIGHTS AUTOMATION] Generando insights de productos...`);
    const insights = await InsightsGenerators.generateProductInsights(trigger);
    return await this.saveInsights(insights);
  }

  /**
   * Genera insights de tendencias
   */
  private async generateTrendInsights(trigger: InsightTrigger): Promise<number> {
    console.log(`📈 [INSIGHTS AUTOMATION] Generando insights de tendencias...`);
    const insights = await InsightsGenerators.generateTrendInsights(trigger);
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
        console.log(`✅ [INSIGHTS AUTOMATION] Insight guardado: ${insightData.title}`);

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
    console.log('🛑 [INSIGHTS AUTOMATION] Deteniendo sistema de automatización...');
    cron.getTasks().forEach(task => task.stop());
    this.isInitialized = false;
  }
}

export const insightsAutomationService = InsightsAutomationService.getInstance();
