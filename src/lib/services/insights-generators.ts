import { InsightTrigger } from './insights-automation-service';

export interface InsightData {
  type: 'sales' | 'inventory' | 'user_behavior' | 'marketing' | 'product' | 'trend' | 'system' | 'performance' | 'security';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  data: any;
  recommendations: string[];
  scope: 'global' | 'store' | 'user';
  targetType: 'admin' | 'store' | 'user';
  targetId?: string;
  priority: number;
  actionRequired: boolean;
}

export class InsightsGenerators {
  /**
   * Genera insights de sistema (globales para admin)
   */
  static async generateSystemInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Verificar uso de disco
      const diskUsage = await this.getDiskUsage();
      if (diskUsage > trigger.conditions.diskUsageThreshold) {
        insights.push({
          type: 'system',
          title: 'Uso de disco elevado',
          description: `El uso de disco ha alcanzado el ${diskUsage}%, superando el umbral del ${trigger.conditions.diskUsageThreshold}%.`,
          severity: diskUsage > 95 ? 'critical' : diskUsage > 90 ? 'high' : 'medium',
          category: 'System Health',
          data: {
            currentUsage: diskUsage,
            threshold: trigger.conditions.diskUsageThreshold,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Limpiar archivos temporales',
            'Archivar logs antiguos',
            'Considerar expansión de almacenamiento'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: diskUsage > 95 ? 5 : diskUsage > 90 ? 4 : 3,
          actionRequired: diskUsage > 90
        });
      }

      // Verificar conexiones de base de datos
      const dbConnections = await this.getDatabaseConnections();
      if (dbConnections > trigger.conditions.databaseConnectionsThreshold) {
        insights.push({
          type: 'system',
          title: 'Conexiones de BD elevadas',
          description: `Las conexiones activas a la base de datos (${dbConnections}) superan el umbral del ${trigger.conditions.databaseConnectionsThreshold}%.`,
          severity: dbConnections > 95 ? 'critical' : 'high',
          category: 'Database',
          data: {
            currentConnections: dbConnections,
            threshold: trigger.conditions.databaseConnectionsThreshold,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Revisar conexiones no cerradas',
            'Optimizar consultas lentas',
            'Considerar pool de conexiones'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: dbConnections > 95 ? 5 : 4,
          actionRequired: true
        });
      }

    } catch (error) {
      console.error('Error generando insights de sistema:', error);
    }

    return insights;
  }

  /**
   * Genera insights de rendimiento (globales para admin)
   */
  static async generatePerformanceInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Verificar tiempo de respuesta promedio
      const avgResponseTime = await this.getAverageResponseTime();
      if (avgResponseTime > trigger.conditions.responseTimeThreshold) {
        insights.push({
          type: 'performance',
          title: 'Tiempo de respuesta lento',
          description: `El tiempo promedio de respuesta (${avgResponseTime}ms) supera el umbral de ${trigger.conditions.responseTimeThreshold}ms.`,
          severity: avgResponseTime > trigger.conditions.responseTimeThreshold * 2 ? 'critical' : 'high',
          category: 'Performance',
          data: {
            avgResponseTime,
            threshold: trigger.conditions.responseTimeThreshold,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Optimizar consultas de base de datos',
            'Implementar caching',
            'Revisar índices de BD',
            'Considerar escalado horizontal'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: avgResponseTime > trigger.conditions.responseTimeThreshold * 2 ? 5 : 4,
          actionRequired: true
        });
      }

      // Verificar uso de memoria
      const memoryUsage = await this.getMemoryUsage();
      if (memoryUsage > trigger.conditions.memoryUsageThreshold) {
        insights.push({
          type: 'performance',
          title: 'Uso de memoria elevado',
          description: `El uso de memoria (${memoryUsage}%) supera el umbral del ${trigger.conditions.memoryUsageThreshold}%.`,
          severity: memoryUsage > 95 ? 'critical' : 'high',
          category: 'Performance',
          data: {
            memoryUsage,
            threshold: trigger.conditions.memoryUsageThreshold,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Revisar memory leaks',
            'Optimizar uso de memoria',
            'Considerar escalado vertical'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: memoryUsage > 95 ? 5 : 4,
          actionRequired: true
        });
      }

    } catch (error) {
      console.error('Error generando insights de rendimiento:', error);
    }

    return insights;
  }

  /**
   * Genera insights de seguridad (globales para admin)
   */
  static async generateSecurityInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Verificar intentos de login fallidos
      const failedLogins = await this.getFailedLoginAttempts();
      if (failedLogins > trigger.conditions.failedLoginThreshold) {
        insights.push({
          type: 'security',
          title: 'Múltiples intentos de login fallidos',
          description: `Se detectaron ${failedLogins} intentos de login fallidos en los últimos 5 minutos, superando el umbral de ${trigger.conditions.failedLoginThreshold}.`,
          severity: failedLogins > trigger.conditions.failedLoginThreshold * 3 ? 'critical' : 'high',
          category: 'Security',
          data: {
            failedAttempts: failedLogins,
            threshold: trigger.conditions.failedLoginThreshold,
            timeWindow: '5 minutes',
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Implementar rate limiting',
            'Revisar logs de seguridad',
            'Considerar bloqueo temporal de IPs',
            'Verificar intentos de ataque'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: failedLogins > trigger.conditions.failedLoginThreshold * 3 ? 5 : 4,
          actionRequired: true
        });
      }

      // Verificar IPs sospechosas
      const suspiciousIPs = await this.getSuspiciousIPs();
      if (suspiciousIPs > trigger.conditions.suspiciousIpThreshold) {
        insights.push({
          type: 'security',
          title: 'Actividad de IPs sospechosas',
          description: `Se detectaron ${suspiciousIPs} IPs diferentes con actividad sospechosa en los últimos 5 minutos.`,
          severity: 'high',
          category: 'Security',
          data: {
            suspiciousIPs,
            threshold: trigger.conditions.suspiciousIpThreshold,
            timeWindow: '5 minutes',
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Revisar logs de acceso',
            'Implementar geoblocking',
            'Considerar WAF',
            'Monitorear actividad'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: 4,
          actionRequired: true
        });
      }

    } catch (error) {
      console.error('Error generando insights de seguridad:', error);
    }

    return insights;
  }

  /**
   * Genera insights de inventario (específicos por tienda)
   */
  static async generateInventoryInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Obtener todas las tiendas
      const stores = await this.getAllStores();
      
      for (const store of stores) {
        // Verificar productos con stock bajo
        const lowStockProducts = await this.getLowStockProducts(store.id, trigger.conditions.lowStockThreshold);
        
        if (lowStockProducts.length > 0) {
          const criticalProducts = lowStockProducts.filter(p => p.stock <= trigger.conditions.criticalStockThreshold);
          
          insights.push({
            type: 'inventory',
            title: criticalProducts.length > 0 ? 'Stock crítico en productos' : 'Stock bajo en productos',
            description: `${lowStockProducts.length} productos tienen stock bajo (${criticalProducts.length} críticos). Se requiere reabastecimiento.`,
            severity: criticalProducts.length > 0 ? 'critical' : 'high',
            category: 'Inventory',
            data: {
              storeId: store.id,
              storeName: store.name,
              lowStockProducts: lowStockProducts.length,
              criticalProducts: criticalProducts.length,
              products: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name,
                stock: p.stock,
                threshold: trigger.conditions.lowStockThreshold
              })),
              timestamp: new Date().toISOString()
            },
            recommendations: [
              'Reabastecer productos críticos inmediatamente',
              'Contactar proveedores',
              'Ajustar alertas de stock',
              'Revisar demanda vs. stock'
            ],
            scope: 'store',
            targetType: 'store',
            targetId: store.id,
            priority: criticalProducts.length > 0 ? 5 : 4,
            actionRequired: true
          });
        }
      }

    } catch (error) {
      console.error('Error generando insights de inventario:', error);
    }

    return insights;
  }

  /**
   * Genera insights de ventas (específicos por tienda)
   */
  static async generateSalesInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      const stores = await this.getAllStores();
      
      for (const store of stores) {
        // Analizar ventas de las últimas 24 horas
        const currentSales = await this.getStoreSales(store.id, 24);
        const previousSales = await this.getStoreSales(store.id, 48, 24);
        
        if (currentSales.length >= trigger.conditions.minSalesForAnalysis) {
          const currentTotal = currentSales.reduce((sum, sale) => sum + sale.amount, 0);
          const previousTotal = previousSales.reduce((sum, sale) => sum + sale.amount, 0);
          
          const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
          
          if (Math.abs(changePercent) > 20) { // Cambio significativo
            insights.push({
              type: 'sales',
              title: changePercent > 0 ? 'Aumento significativo en ventas' : 'Disminución significativa en ventas',
              description: `Las ventas ${changePercent > 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(changePercent).toFixed(1)}% comparado con el período anterior.`,
              severity: Math.abs(changePercent) > 50 ? 'high' : 'medium',
              category: 'Sales',
              data: {
                storeId: store.id,
                storeName: store.name,
                currentPeriod: {
                  total: currentTotal,
                  orders: currentSales.length,
                  period: '24 hours'
                },
                previousPeriod: {
                  total: previousTotal,
                  orders: previousSales.length,
                  period: '24 hours'
                },
                changePercent,
                timestamp: new Date().toISOString()
              },
              recommendations: changePercent > 0 ? [
                'Mantener estrategia actual',
                'Considerar promociones adicionales',
                'Analizar productos más vendidos',
                'Preparar para mayor demanda'
              ] : [
                'Revisar estrategia de marketing',
                'Analizar competencia',
                'Considerar promociones',
                'Revisar precios'
              ],
              scope: 'store',
              targetType: 'store',
              targetId: store.id,
              priority: Math.abs(changePercent) > 50 ? 4 : 3,
              actionRequired: changePercent < -30
            });
          }
        }
      }

    } catch (error) {
      console.error('Error generando insights de ventas:', error);
    }

    return insights;
  }

  /**
   * Genera insights de comportamiento de usuario (específicos por tienda)
   */
  static async generateUserBehaviorInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      const stores = await this.getAllStores();
      
      for (const store of stores) {
        // Analizar abandono de carrito
        const cartAbandonment = await this.getCartAbandonmentRate(store.id, trigger.conditions.analysisPeriodHours);
        
        if (cartAbandonment.rate > 60) { // Más del 60% de abandono
          insights.push({
            type: 'user_behavior',
            title: 'Alto abandono de carrito',
            description: `El ${cartAbandonment.rate.toFixed(1)}% de los usuarios están abandonando sus carritos sin completar la compra.`,
            severity: cartAbandonment.rate > 80 ? 'high' : 'medium',
            category: 'User Behavior',
            data: {
              storeId: store.id,
              storeName: store.name,
              abandonmentRate: cartAbandonment.rate,
              totalCarts: cartAbandonment.total,
              completedCarts: cartAbandonment.completed,
              abandonedCarts: cartAbandonment.abandoned,
              period: `${trigger.conditions.analysisPeriodHours} hours`,
              timestamp: new Date().toISOString()
            },
            recommendations: [
              'Implementar recordatorios por email',
              'Simplificar proceso de checkout',
              'Ofrecer descuentos por abandono',
              'Revisar UX del carrito',
              'Implementar exit-intent popups'
            ],
            scope: 'store',
            targetType: 'store',
            targetId: store.id,
            priority: cartAbandonment.rate > 80 ? 4 : 3,
            actionRequired: cartAbandonment.rate > 70
          });
        }
      }

    } catch (error) {
      console.error('Error generando insights de comportamiento:', error);
    }

    return insights;
  }

  /**
   * Genera insights de productos (específicos por tienda)
   */
  static async generateProductInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      const stores = await this.getAllStores();
      
      for (const store of stores) {
        // Analizar productos más y menos vendidos
        const productPerformance = await this.getProductPerformance(store.id, trigger.conditions.analysisPeriodHours);
        
        if (productPerformance.length >= trigger.conditions.minProductsForAnalysis) {
          const topProducts = productPerformance.slice(0, 3);
          const bottomProducts = productPerformance.slice(-3);
          
          // Insight para productos top
          insights.push({
            type: 'product',
            title: 'Productos con mejor rendimiento',
            description: `Los productos más vendidos en las últimas ${trigger.conditions.analysisPeriodHours} horas: ${topProducts.map(p => p.name).join(', ')}.`,
            severity: 'low',
            category: 'Product Performance',
            data: {
              storeId: store.id,
              storeName: store.name,
              topProducts: topProducts.map(p => ({
                id: p.id,
                name: p.name,
                sales: p.sales,
                revenue: p.revenue
              })),
              period: `${trigger.conditions.analysisPeriodHours} hours`,
              timestamp: new Date().toISOString()
            },
            recommendations: [
              'Mantener stock de productos top',
              'Considerar promociones adicionales',
              'Analizar factores de éxito',
              'Replicar estrategias exitosas'
            ],
            scope: 'store',
            targetType: 'store',
            targetId: store.id,
            priority: 2,
            actionRequired: false
          });

          // Insight para productos con bajo rendimiento
          if (bottomProducts.some(p => p.sales === 0)) {
            insights.push({
              type: 'product',
              title: 'Productos sin ventas',
              description: `${bottomProducts.filter(p => p.sales === 0).length} productos no han tenido ventas en las últimas ${trigger.conditions.analysisPeriodHours} horas.`,
              severity: 'medium',
              category: 'Product Performance',
              data: {
                storeId: store.id,
                storeName: store.name,
                noSalesProducts: bottomProducts.filter(p => p.sales === 0).map(p => ({
                  id: p.id,
                  name: p.name,
                  daysWithoutSales: p.daysWithoutSales
                })),
                period: `${trigger.conditions.analysisPeriodHours} hours`,
                timestamp: new Date().toISOString()
              },
              recommendations: [
                'Revisar precios de productos sin ventas',
                'Considerar promociones',
                'Mejorar descripciones',
                'Revisar posicionamiento',
                'Considerar descuentos'
              ],
              scope: 'store',
              targetType: 'store',
              targetId: store.id,
              priority: 3,
              actionRequired: true
            });
          }
        }
      }

    } catch (error) {
      console.error('Error generando insights de productos:', error);
    }

    return insights;
  }

  /**
   * Genera insights de tendencias (globales para admin)
   */
  static async generateTrendInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Analizar tendencias globales de ventas
      const currentOrders = await this.getGlobalOrders(trigger.conditions.trendPeriodHours);
      const previousOrders = await this.getGlobalOrders(trigger.conditions.trendPeriodHours * 2, trigger.conditions.trendPeriodHours);
      
      if (currentOrders.length >= trigger.conditions.minOrdersForAnalysis) {
        const currentTotal = currentOrders.reduce((sum, order) => sum + order.amount, 0);
        const previousTotal = previousOrders.reduce((sum, order) => sum + order.amount, 0);
        
        const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
        
        if (Math.abs(changePercent) > 15) { // Tendencia significativa
          insights.push({
            type: 'trend',
            title: changePercent > 0 ? 'Tendencia positiva en ventas globales' : 'Tendencia negativa en ventas globales',
            description: `Las ventas globales ${changePercent > 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(changePercent).toFixed(1)}% en las últimas ${trigger.conditions.trendPeriodHours} horas.`,
            severity: Math.abs(changePercent) > 30 ? 'high' : 'medium',
            category: 'Market Trends',
            data: {
              currentPeriod: {
                total: currentTotal,
                orders: currentOrders.length,
                period: `${trigger.conditions.trendPeriodHours} hours`
              },
              previousPeriod: {
                total: previousTotal,
                orders: previousOrders.length,
                period: `${trigger.conditions.trendPeriodHours} hours`
              },
              changePercent,
              timestamp: new Date().toISOString()
            },
            recommendations: changePercent > 0 ? [
              'Mantener estrategias exitosas',
              'Preparar para mayor demanda',
              'Analizar factores de crecimiento',
              'Considerar expansión'
            ] : [
              'Revisar estrategias de marketing',
              'Analizar competencia',
              'Considerar promociones globales',
              'Revisar precios de mercado'
            ],
            scope: 'global',
            targetType: 'admin',
            priority: Math.abs(changePercent) > 30 ? 4 : 3,
            actionRequired: changePercent < -20
          });
        }
      }

    } catch (error) {
      console.error('Error generando insights de tendencias:', error);
    }

    return insights;
  }

  // Métodos auxiliares (implementaciones mock por ahora)
  private static async getDiskUsage(): Promise<number> {
    // Mock implementation - en producción usar fs.stat
    return Math.random() * 100;
  }

  private static async getDatabaseConnections(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 100);
  }

  private static async getAverageResponseTime(): Promise<number> {
    // Mock implementation - en producción usar métricas reales
    return Math.random() * 5000;
  }

  private static async getMemoryUsage(): Promise<number> {
    // Mock implementation - en producción usar process.memoryUsage()
    return Math.random() * 100;
  }

  private static async getFailedLoginAttempts(): Promise<number> {
    // Mock implementation - en producción consultar logs
    return Math.floor(Math.random() * 20);
  }

  private static async getSuspiciousIPs(): Promise<number> {
    // Mock implementation - en producción consultar logs
    return Math.floor(Math.random() * 10);
  }

  private static async getAllStores(): Promise<Array<{id: string, name: string}>> {
    // Mock implementation - en producción consultar la BD
    return [
      { id: 'store-1', name: 'Tienda Principal' },
      { id: 'store-2', name: 'Tienda Secundaria' }
    ];
  }

  private static async getLowStockProducts(storeId: string, threshold: number): Promise<Array<{id: string, name: string, stock: number}>> {
    // Mock implementation - en producción consultar la BD
    return [
      { id: 'prod-1', name: 'Producto A', stock: Math.floor(Math.random() * threshold) },
      { id: 'prod-2', name: 'Producto B', stock: Math.floor(Math.random() * threshold) }
    ];
  }

  private static async getStoreSales(storeId: string, hours: number, offsetHours: number = 0): Promise<Array<{amount: number}>> {
    // Mock implementation - en producción consultar la BD
    const count = Math.floor(Math.random() * 20);
    return Array.from({ length: count }, () => ({ amount: Math.random() * 1000 }));
  }

  private static async getCartAbandonmentRate(storeId: string, hours: number): Promise<{rate: number, total: number, completed: number, abandoned: number}> {
    // Mock implementation - en producción consultar la BD
    const total = Math.floor(Math.random() * 100) + 50;
    const completed = Math.floor(total * (0.3 + Math.random() * 0.4));
    const abandoned = total - completed;
    return {
      rate: (abandoned / total) * 100,
      total,
      completed,
      abandoned
    };
  }

  private static async getProductPerformance(storeId: string, hours: number): Promise<Array<{id: string, name: string, sales: number, revenue: number, daysWithoutSales: number}>> {
    // Mock implementation - en producción consultar la BD
    return [
      { id: 'prod-1', name: 'Producto A', sales: Math.floor(Math.random() * 50), revenue: Math.random() * 5000, daysWithoutSales: 0 },
      { id: 'prod-2', name: 'Producto B', sales: Math.floor(Math.random() * 30), revenue: Math.random() * 3000, daysWithoutSales: 0 },
      { id: 'prod-3', name: 'Producto C', sales: 0, revenue: 0, daysWithoutSales: Math.floor(Math.random() * 10) }
    ];
  }

  private static async getGlobalOrders(hours: number, offsetHours: number = 0): Promise<Array<{amount: number}>> {
    // Mock implementation - en producción consultar la BD
    const count = Math.floor(Math.random() * 100) + 50;
    return Array.from({ length: count }, () => ({ amount: Math.random() * 2000 }));
  }
}

