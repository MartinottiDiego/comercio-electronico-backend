import { InsightTrigger } from './insights-automation-service';

export interface InsightData {
  type: 'sales' | 'inventory' | 'user_behavior' | 'marketing' | 'product' | 'trend' | 'growth' | 'revenue' | 'engagement' | 'conversion' | 'user_registration' | 'store_activity' | 'top_products' | 'category_trends';
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
   * Genera insights de crecimiento (globales para admin)
   */
  static async generateGrowthInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Nuevos usuarios registrados hoy
      const newUsersToday = await this.getNewUsersToday();
      const newUsersYesterday = await this.getNewUsersYesterday();
      
      if (newUsersToday > 0) {
        const growthPercent = newUsersYesterday > 0 ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100 : 0;
        
        insights.push({
          type: 'user_registration',
          title: 'Nuevos usuarios registrados',
          description: `${newUsersToday} usuarios nuevos se registraron hoy${growthPercent > 0 ? ` (+${growthPercent.toFixed(1)}% vs ayer)` : growthPercent < 0 ? ` (${growthPercent.toFixed(1)}% vs ayer)` : ''}.`,
          severity: newUsersToday >= 20 ? 'low' : newUsersToday >= 10 ? 'medium' : 'high',
          category: 'Crecimiento de Usuarios',
          data: {
            newUsersToday,
            newUsersYesterday,
            growthPercent,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Mantener estrategias de marketing efectivas',
            'Analizar canales de adquisición',
            'Optimizar proceso de registro',
            'Considerar campañas de retención'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: newUsersToday >= 20 ? 2 : newUsersToday >= 10 ? 3 : 4,
          actionRequired: newUsersToday < 5
        });
      }

      // Nuevas tiendas registradas
      const newStoresThisWeek = await this.getNewStoresThisWeek();
      if (newStoresThisWeek > 0) {
        insights.push({
          type: 'store_activity',
          title: 'Nuevas tiendas registradas',
          description: `${newStoresThisWeek} nuevas tiendas se registraron esta semana.`,
          severity: 'low',
          category: 'Crecimiento de Tiendas',
          data: {
            newStoresThisWeek,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Dar la bienvenida a las nuevas tiendas',
            'Ofrecer onboarding personalizado',
            'Proporcionar recursos de ayuda',
            'Monitorear su actividad inicial'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: 2,
          actionRequired: false
        });
      }

    } catch (error) {
      console.error('Error generando insights de crecimiento:', error);
    }

    return insights;
  }

  /**
   * Genera insights de ingresos (globales para admin)
   */
  static async generateRevenueInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Ingresos del día
      const todayRevenue = await this.getTodayRevenue();
      const yesterdayRevenue = await this.getYesterdayRevenue();
      
      if (todayRevenue > 0) {
        const growthPercent = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
        
        insights.push({
          type: 'revenue',
          title: 'Ingresos del día',
          description: `Ingresos de hoy: $${todayRevenue.toLocaleString()}${growthPercent > 0 ? ` (+${growthPercent.toFixed(1)}% vs ayer)` : growthPercent < 0 ? ` (${growthPercent.toFixed(1)}% vs ayer)` : ''}.`,
          severity: growthPercent > 20 ? 'low' : growthPercent > 0 ? 'medium' : growthPercent < -20 ? 'high' : 'medium',
          category: 'Ingresos',
          data: {
            todayRevenue,
            yesterdayRevenue,
            growthPercent,
            timestamp: new Date().toISOString()
          },
          recommendations: growthPercent > 0 ? [
            'Mantener estrategias exitosas',
            'Analizar factores de crecimiento',
            'Preparar para mayor demanda'
          ] : [
            'Revisar estrategias de marketing',
            'Analizar competencia',
            'Considerar promociones'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: Math.abs(growthPercent) > 20 ? 3 : 2,
          actionRequired: growthPercent < -30
        });
      }

      // Venta más alta del día
      const highestSale = await this.getHighestSaleToday();
      if (highestSale) {
        insights.push({
          type: 'sales',
          title: 'Venta más alta del día',
          description: `Venta más alta: $${highestSale.amount.toLocaleString()} - ${highestSale.productName} (${highestSale.storeName}).`,
          severity: 'low',
          category: 'Ventas Destacadas',
          data: {
            amount: highestSale.amount,
            productName: highestSale.productName,
            storeName: highestSale.storeName,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Analizar factores de éxito del producto',
            'Considerar promociones similares',
            'Replicar estrategias exitosas'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: 2,
          actionRequired: false
        });
      }

    } catch (error) {
      console.error('Error generando insights de ingresos:', error);
    }

    return insights;
  }

  /**
   * Genera insights de engagement (globales para admin)
   */
  static async generateEngagementInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Usuarios activos
      const activeUsers = await this.getActiveUsersToday();
      const totalUsers = await this.getTotalUsers();
      const activePercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      
      if (activeUsers > 0) {
        insights.push({
          type: 'engagement',
          title: 'Usuarios activos hoy',
          description: `${activeUsers} usuarios activos (${activePercentage.toFixed(1)}% del total).`,
          severity: activePercentage > 30 ? 'low' : activePercentage > 15 ? 'medium' : 'high',
          category: 'Engagement',
          data: {
            activeUsers,
            totalUsers,
            activePercentage,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Mantener contenido atractivo',
            'Implementar notificaciones push',
            'Crear campañas de re-engagement',
            'Analizar comportamiento de usuarios activos'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: activePercentage > 30 ? 2 : activePercentage > 15 ? 3 : 4,
          actionRequired: activePercentage < 10
        });
      }

      // Productos más buscados
      const topSearchedProducts = await this.getTopSearchedProducts();
      if (topSearchedProducts.length > 0) {
        insights.push({
          type: 'top_products',
          title: 'Productos más buscados',
          description: `Productos más buscados: ${topSearchedProducts.slice(0, 3).map(p => p.name).join(', ')}.`,
          severity: 'low',
          category: 'Interés de Usuarios',
          data: {
            topProducts: topSearchedProducts.slice(0, 5),
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Asegurar stock de productos populares',
            'Optimizar descripciones y SEO',
            'Considerar promociones especiales',
            'Analizar tendencias de búsqueda'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: 2,
          actionRequired: false
        });
      }

    } catch (error) {
      console.error('Error generando insights de engagement:', error);
    }

    return insights;
  }

  /**
   * Genera insights de conversión (globales para admin)
   */
  static async generateConversionInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Tasa de conversión
      const conversionRate = await this.getConversionRate();
      const averageConversionRate = await this.getAverageConversionRate();
      
      if (conversionRate > 0) {
        const improvement = conversionRate - averageConversionRate;
        
        insights.push({
          type: 'conversion',
          title: 'Tasa de conversión mejorada',
          description: `Tasa de conversión actual: ${conversionRate.toFixed(2)}%${improvement > 0 ? ` (+${improvement.toFixed(2)}% vs promedio)` : improvement < 0 ? ` (${improvement.toFixed(2)}% vs promedio)` : ''}.`,
          severity: improvement > 0.5 ? 'low' : improvement > 0 ? 'medium' : improvement < -0.5 ? 'high' : 'medium',
          category: 'Conversión',
          data: {
            currentRate: conversionRate,
            averageRate: averageConversionRate,
            improvement,
            timestamp: new Date().toISOString()
          },
          recommendations: improvement > 0 ? [
            'Mantener estrategias exitosas',
            'Analizar factores de mejora',
            'Replicar en otras áreas'
          ] : [
            'Revisar proceso de checkout',
            'Optimizar UX del carrito',
            'Implementar A/B testing',
            'Mejorar descripciones de productos'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: Math.abs(improvement) > 0.5 ? 3 : 2,
          actionRequired: improvement < -1.0
        });
      }

      // Carritos recuperados
      const recoveredCarts = await this.getRecoveredCartsToday();
      if (recoveredCarts > 0) {
        insights.push({
          type: 'conversion',
          title: 'Carritos abandonados recuperados',
          description: `${recoveredCarts} carritos abandonados fueron recuperados hoy.`,
          severity: 'low',
          category: 'Recuperación de Ventas',
          data: {
            recoveredCarts,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Mantener estrategias de recuperación',
            'Optimizar timing de recordatorios',
            'Mejorar ofertas de recuperación',
            'Analizar factores de éxito'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: 2,
          actionRequired: false
        });
      }

    } catch (error) {
      console.error('Error generando insights de conversión:', error);
    }

    return insights;
  }

  /**
   * Genera insights de tendencias de categorías (globales para admin)
   */
  static async generateCategoryTrendsInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      // Categoría trending
      const trendingCategory = await this.getTrendingCategory();
      if (trendingCategory) {
        insights.push({
          type: 'category_trends',
          title: 'Categoría en tendencia',
          description: `La categoría "${trendingCategory.name}" está en tendencia con un crecimiento del ${trendingCategory.growthPercent.toFixed(1)}% en búsquedas.`,
          severity: 'low',
          category: 'Tendencias de Mercado',
          data: {
            categoryName: trendingCategory.name,
            growthPercent: trendingCategory.growthPercent,
            searchCount: trendingCategory.searchCount,
            timestamp: new Date().toISOString()
          },
          recommendations: [
            'Promocionar productos de esta categoría',
            'Asegurar stock suficiente',
            'Crear contenido relacionado',
            'Considerar campañas específicas'
          ],
          scope: 'global',
          targetType: 'admin',
          priority: 2,
          actionRequired: false
        });
      }

    } catch (error) {
      console.error('Error generando insights de tendencias:', error);
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
        // Ventas del día por tienda
        const todaySales = await this.getStoreSalesToday(store.id);
        const yesterdaySales = await this.getStoreSalesYesterday(store.id);
        
        if (todaySales > 0) {
          const growthPercent = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
          
          insights.push({
            type: 'sales',
            title: 'Ventas del día',
            description: `${store.name}: $${todaySales.toLocaleString()} en ventas${growthPercent > 0 ? ` (+${growthPercent.toFixed(1)}% vs ayer)` : growthPercent < 0 ? ` (${growthPercent.toFixed(1)}% vs ayer)` : ''}.`,
            severity: growthPercent > 20 ? 'low' : growthPercent > 0 ? 'medium' : growthPercent < -20 ? 'high' : 'medium',
            category: 'Ventas por Tienda',
            data: {
              storeId: store.id,
              storeName: store.name,
              todaySales,
              yesterdaySales,
              growthPercent,
              timestamp: new Date().toISOString()
            },
            recommendations: growthPercent > 0 ? [
              'Mantener estrategias exitosas',
              'Analizar productos más vendidos',
              'Considerar promociones adicionales'
            ] : [
              'Revisar estrategia de marketing',
              'Analizar competencia local',
              'Considerar promociones especiales'
            ],
            scope: 'store',
            targetType: 'store',
            targetId: store.id,
            priority: Math.abs(growthPercent) > 20 ? 3 : 2,
            actionRequired: growthPercent < -30
          });
        }
      }

    } catch (error) {
      console.error('Error generando insights de ventas:', error);
    }

    return insights;
  }

  /**
   * Genera insights de inventario (específicos por tienda)
   */
  static async generateInventoryInsights(trigger: InsightTrigger): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    try {
      const stores = await this.getAllStores();
      
      for (const store of stores) {
        // Productos con stock bajo
        const lowStockProducts = await this.getLowStockProducts(store.id, trigger.conditions.lowStockThreshold);
        
        if (lowStockProducts.length > 0) {
          const criticalProducts = lowStockProducts.filter(p => p.stock <= trigger.conditions.criticalStockThreshold);
          
          insights.push({
            type: 'inventory',
            title: criticalProducts.length > 0 ? 'Stock crítico en productos' : 'Stock bajo en productos',
            description: `${store.name}: ${lowStockProducts.length} productos con stock bajo (${criticalProducts.length} críticos).`,
            severity: criticalProducts.length > 0 ? 'high' : 'medium',
            category: 'Gestión de Inventario',
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
              'Reabastecer productos críticos',
              'Contactar proveedores',
              'Ajustar alertas de stock',
              'Revisar demanda vs. stock'
            ],
            scope: 'store',
            targetType: 'store',
            targetId: store.id,
            priority: criticalProducts.length > 0 ? 4 : 3,
            actionRequired: true
          });
        }
      }

    } catch (error) {
      console.error('Error generando insights de inventario:', error);
    }

    return insights;
  }

  // Métodos auxiliares (implementaciones mock por ahora)
  private static async getNewUsersToday(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 25) + 5;
  }

  private static async getNewUsersYesterday(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 20) + 3;
  }

  private static async getNewStoresThisWeek(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 5) + 1;
  }

  private static async getTodayRevenue(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 50000) + 10000;
  }

  private static async getYesterdayRevenue(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 45000) + 8000;
  }

  private static async getHighestSaleToday(): Promise<{amount: number, productName: string, storeName: string} | null> {
    // Mock implementation - en producción consultar la BD
    const products = ['iPhone 15 Pro', 'MacBook Air', 'Samsung Galaxy S24', 'iPad Pro', 'AirPods Pro'];
    const stores = ['TechStore', 'ElectroMax', 'GadgetHub', 'DigitalWorld'];
    
    if (Math.random() > 0.3) {
      return {
        amount: Math.floor(Math.random() * 2000) + 500,
        productName: products[Math.floor(Math.random() * products.length)],
        storeName: stores[Math.floor(Math.random() * stores.length)]
      };
    }
    return null;
  }

  private static async getActiveUsersToday(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 200) + 50;
  }

  private static async getTotalUsers(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 1000) + 500;
  }

  private static async getTopSearchedProducts(): Promise<Array<{name: string, searchCount: number}>> {
    // Mock implementation - en producción consultar la BD
    const products = ['iPhone', 'Laptop', 'Zapatos', 'Camiseta', 'Auriculares', 'Reloj', 'Mochila', 'Gafas'];
    return products.map(name => ({
      name,
      searchCount: Math.floor(Math.random() * 100) + 10
    })).sort((a, b) => b.searchCount - a.searchCount);
  }

  private static async getConversionRate(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.random() * 5 + 2; // 2-7%
  }

  private static async getAverageConversionRate(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.random() * 4 + 2.5; // 2.5-6.5%
  }

  private static async getRecoveredCartsToday(): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 15) + 3;
  }

  private static async getTrendingCategory(): Promise<{name: string, growthPercent: number, searchCount: number} | null> {
    // Mock implementation - en producción consultar la BD
    const categories = ['Electrónicos', 'Ropa', 'Hogar', 'Deportes', 'Libros', 'Juguetes'];
    
    if (Math.random() > 0.4) {
      return {
        name: categories[Math.floor(Math.random() * categories.length)],
        growthPercent: Math.random() * 50 + 10, // 10-60%
        searchCount: Math.floor(Math.random() * 200) + 50
      };
    }
    return null;
  }

  private static async getAllStores(): Promise<Array<{id: string, name: string}>> {
    // Mock implementation - en producción consultar la BD
    return [
      { id: 'store-1', name: 'TechStore' },
      { id: 'store-2', name: 'ElectroMax' },
      { id: 'store-3', name: 'GadgetHub' },
      { id: 'store-4', name: 'DigitalWorld' }
    ];
  }

  private static async getStoreSalesToday(storeId: string): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 10000) + 1000;
  }

  private static async getStoreSalesYesterday(storeId: string): Promise<number> {
    // Mock implementation - en producción consultar la BD
    return Math.floor(Math.random() * 9000) + 800;
  }

  private static async getLowStockProducts(storeId: string, threshold: number): Promise<Array<{id: string, name: string, stock: number}>> {
    // Mock implementation - en producción consultar la BD
    if (Math.random() > 0.6) {
      return [
        { id: 'prod-1', name: 'Producto A', stock: Math.floor(Math.random() * threshold) },
        { id: 'prod-2', name: 'Producto B', stock: Math.floor(Math.random() * threshold) }
      ];
    }
    return [];
  }
}