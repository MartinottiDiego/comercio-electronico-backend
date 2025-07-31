export interface Insight {
  id: string;
  type: 'sales' | 'inventory' | 'user_behavior' | 'marketing' | 'product' | 'trend';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  data: any;
  recommendations: string[];
  timestamp: Date;
  storeId?: string;
  isRead: boolean;
  actionRequired: boolean;
  priority: number;
}

export interface InsightData {
  salesInsights: Insight[];
  inventoryInsights: Insight[];
  userBehaviorInsights: Insight[];
  marketingInsights: Insight[];
  productInsights: Insight[];
  trendInsights: Insight[];
}

export default class InsightsService {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  // Generar todos los insights para una tienda
  async generateStoreInsights(storeId: string): Promise<InsightData> {
    try {
      const [
        salesInsights,
        inventoryInsights,
        userBehaviorInsights,
        marketingInsights,
        productInsights,
        trendInsights
      ] = await Promise.all([
        this.generateSalesInsights(storeId),
        this.generateInventoryInsights(storeId),
        this.generateUserBehaviorInsights(storeId),
        this.generateMarketingInsights(storeId),
        this.generateProductInsights(storeId),
        this.generateTrendInsights(storeId)
      ]);

      return {
        salesInsights,
        inventoryInsights,
        userBehaviorInsights,
        marketingInsights,
        productInsights,
        trendInsights
      };
    } catch (error) {
      console.error('Error generating store insights:', error);
      throw error;
    }
  }

  // Insights de ventas
  async generateSalesInsights(storeId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Obtener ventas de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentSales = await this.strapi.db.query('api::order.order').findMany({
        where: {
          storeId,
          createdAt: { $gte: thirtyDaysAgo },
          status: 'completed'
        },
        populate: ['products', 'user']
      });

      const previousPeriodSales = await this.strapi.db.query('api::order.order').findMany({
        where: {
          storeId,
          createdAt: { 
            $gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
            $lt: thirtyDaysAgo
          },
          status: 'completed'
        }
      });

      // Calcular métricas
      const currentRevenue = recentSales.reduce((sum, sale) => sum + sale.total, 0);
      const previousRevenue = previousPeriodSales.reduce((sum, sale) => sum + sale.total, 0);
      const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Insight: Cambio en ventas
      if (Math.abs(revenueChange) > 10) {
        insights.push({
          id: `sales-${Date.now()}`,
          type: 'sales',
          title: revenueChange > 0 ? '¡Ventas en aumento!' : 'Atención: Ventas en descenso',
          description: `Las ventas han ${revenueChange > 0 ? 'aumentado' : 'disminuido'} un ${Math.abs(revenueChange).toFixed(1)}% comparado con el período anterior.`,
          severity: revenueChange > 0 ? 'low' : 'high',
          category: 'Revenue',
          data: { currentRevenue, previousRevenue, revenueChange },
          recommendations: revenueChange > 0 
            ? ['Mantén las estrategias actuales', 'Considera aumentar el inventario de productos populares']
            : ['Revisa los precios de la competencia', 'Analiza las campañas de marketing', 'Considera ofertas especiales'],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: revenueChange < -20,
          priority: revenueChange < 0 ? 3 : 1
        });
      }

      // Insight: Productos más vendidos
      const productSales = new Map();
      recentSales.forEach(sale => {
        sale.products.forEach((product: any) => {
          const productId = product.id;
          if (productSales.has(productId)) {
            productSales.set(productId, productSales.get(productId) + product.quantity);
          } else {
            productSales.set(productId, product.quantity);
          }
        });
      });

      const topProducts = Array.from(productSales.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3);

      if (topProducts.length > 0) {
        insights.push({
          id: `top-products-${Date.now()}`,
          type: 'sales',
          title: 'Productos más vendidos del mes',
          description: `Los productos más populares han sido: ${topProducts.map(([id, qty]) => `ID ${id} (${qty} unidades)`).join(', ')}`,
          severity: 'low',
          category: 'Product Performance',
          data: { topProducts },
          recommendations: [
            'Mantén buen stock de estos productos',
            'Considera crear bundles con estos productos',
            'Usa estos productos en campañas de marketing'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: false,
          priority: 2
        });
      }

      // Insight: Horarios pico de ventas
      const salesByHour = new Array(24).fill(0);
      recentSales.forEach(sale => {
        const hour = new Date(sale.createdAt).getHours();
        salesByHour[hour]++;
      });

      const peakHour = salesByHour.indexOf(Math.max(...salesByHour));
      if (salesByHour[peakHour] > 5) {
        insights.push({
          id: `peak-hours-${Date.now()}`,
          type: 'sales',
          title: 'Horario pico de ventas identificado',
          description: `La mayoría de las ventas ocurren a las ${peakHour}:00 horas.`,
          severity: 'low',
          category: 'Timing',
          data: { peakHour, salesByHour },
          recommendations: [
            'Programa campañas de marketing para este horario',
            'Considera ofertas especiales en este momento',
            'Asegúrate de tener soporte disponible'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: false,
          priority: 2
        });
      }

    } catch (error) {
      console.error('Error generating sales insights:', error);
    }

    return insights;
  }

  // Insights de inventario
  async generateInventoryInsights(storeId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      const products = await this.strapi.db.query('api::product.product').findMany({
        where: { store: storeId },
        populate: ['category']
      });

      // Insight: Stock bajo
      const lowStockProducts = products.filter(product => product.stock <= 5 && product.stock > 0);
      if (lowStockProducts.length > 0) {
        insights.push({
          id: `low-stock-${Date.now()}`,
          type: 'inventory',
          title: 'Productos con stock bajo',
          description: `${lowStockProducts.length} productos tienen stock bajo (5 unidades o menos).`,
          severity: 'high',
          category: 'Inventory',
          data: { lowStockProducts: lowStockProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock })) },
          recommendations: [
            'Reabastece estos productos urgentemente',
            'Considera aumentar el stock mínimo',
            'Comunica a los clientes sobre disponibilidad limitada'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: true,
          priority: 4
        });
      }

      // Insight: Productos sin stock
      const outOfStockProducts = products.filter(product => product.stock === 0);
      if (outOfStockProducts.length > 0) {
        insights.push({
          id: `out-of-stock-${Date.now()}`,
          type: 'inventory',
          title: 'Productos agotados',
          description: `${outOfStockProducts.length} productos están completamente agotados.`,
          severity: 'critical',
          category: 'Inventory',
          data: { outOfStockProducts: outOfStockProducts.map(p => ({ id: p.id, name: p.name })) },
          recommendations: [
            'Reabastece inmediatamente estos productos',
            'Considera desactivar temporalmente la venta',
            'Notifica a los clientes interesados cuando vuelva el stock'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: true,
          priority: 5
        });
      }

      // Insight: Productos estancados (sin ventas en 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = await this.strapi.db.query('api::order.order').findMany({
        where: {
          storeId,
          createdAt: { $gte: thirtyDaysAgo },
          status: 'completed'
        },
        populate: ['products']
      });

      const soldProductIds = new Set();
      recentOrders.forEach(order => {
        order.products.forEach((product: any) => {
          soldProductIds.add(product.id);
        });
      });

      const stagnantProducts = products.filter(product => 
        !soldProductIds.has(product.id) && product.stock > 0
      );

      if (stagnantProducts.length > 0) {
        insights.push({
          id: `stagnant-products-${Date.now()}`,
          type: 'inventory',
          title: 'Productos sin ventas recientes',
          description: `${stagnantProducts.length} productos no han tenido ventas en los últimos 30 días.`,
          severity: 'medium',
          category: 'Inventory',
          data: { stagnantProducts: stagnantProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock })) },
          recommendations: [
            'Considera ofertas especiales para estos productos',
            'Revisa si los precios son competitivos',
            'Evalúa si estos productos siguen siendo relevantes'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: false,
          priority: 3
        });
      }

    } catch (error) {
      console.error('Error generating inventory insights:', error);
    }

    return insights;
  }

  // Insights de comportamiento de usuario
  async generateUserBehaviorInsights(storeId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Obtener comportamientos de los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: {
          createdAt: { $gte: sevenDaysAgo }
        },
        populate: ['product', 'user']
      });

      // Filtrar comportamientos relacionados con productos de esta tienda
      const storeBehaviors = behaviors.filter(behavior => {
        if (behavior.product && behavior.product.store === storeId) {
          return true;
        }
        return false;
      });

      // Insight: Productos más vistos
      const productViews = new Map();
      storeBehaviors.forEach(behavior => {
        if (behavior.action === 'view' && behavior.product) {
          const productId = behavior.product.id;
          if (productViews.has(productId)) {
            productViews.set(productId, productViews.get(productId) + 1);
          } else {
            productViews.set(productId, 1);
          }
        }
      });

      const mostViewedProducts = Array.from(productViews.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3);

      if (mostViewedProducts.length > 0) {
        insights.push({
          id: `most-viewed-${Date.now()}`,
          type: 'user_behavior',
          title: 'Productos más consultados',
          description: `Los productos más vistos esta semana son: ${mostViewedProducts.map(([id, views]) => `ID ${id} (${views} vistas)`).join(', ')}`,
          severity: 'low',
          category: 'User Engagement',
          data: { mostViewedProducts },
          recommendations: [
            'Destaca estos productos en la página principal',
            'Considera crear contenido específico para estos productos',
            'Evalúa si los precios son competitivos'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: false,
          priority: 2
        });
      }

      // Insight: Tasa de conversión de vistas a compras
      const viewActions = storeBehaviors.filter(b => b.action === 'view');
      const purchaseActions = storeBehaviors.filter(b => b.action === 'purchase');
      
      if (viewActions.length > 0) {
        const conversionRate = (purchaseActions.length / viewActions.length) * 100;
        
        if (conversionRate < 5) {
          insights.push({
            id: `low-conversion-${Date.now()}`,
            type: 'user_behavior',
            title: 'Tasa de conversión baja',
            description: `Solo el ${conversionRate.toFixed(1)}% de las vistas se convierten en compras.`,
            severity: 'high',
            category: 'Conversion',
            data: { conversionRate, totalViews: viewActions.length, totalPurchases: purchaseActions.length },
            recommendations: [
              'Revisa los precios de la competencia',
              'Mejora las descripciones de productos',
              'Considera ofertas especiales',
              'Optimiza las imágenes de productos'
            ],
            timestamp: new Date(),
            storeId,
            isRead: false,
            actionRequired: true,
            priority: 4
          });
        }
      }

    } catch (error) {
      console.error('Error generating user behavior insights:', error);
    }

    return insights;
  }

  // Insights de marketing
  async generateMarketingInsights(storeId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Obtener datos de campañas y promociones
      const recentOrders = await this.strapi.db.query('api::order.order').findMany({
        where: {
          storeId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        populate: ['user']
      });

      // Insight: Nuevos vs clientes recurrentes
      const customerOrders = new Map();
      recentOrders.forEach(order => {
        const customerEmail = order.buyerEmail;
        if (customerOrders.has(customerEmail)) {
          customerOrders.set(customerEmail, customerOrders.get(customerEmail) + 1);
        } else {
          customerOrders.set(customerEmail, 1);
        }
      });

      const newCustomers = Array.from(customerOrders.values()).filter(count => count === 1).length;
      const returningCustomers = Array.from(customerOrders.values()).filter(count => count > 1).length;
      const totalCustomers = customerOrders.size;

      if (totalCustomers > 0) {
        const newCustomerRate = (newCustomers / totalCustomers) * 100;
        
        if (newCustomerRate > 80) {
          insights.push({
            id: `new-customers-${Date.now()}`,
            type: 'marketing',
            title: 'Alto porcentaje de nuevos clientes',
            description: `${newCustomerRate.toFixed(1)}% de las ventas son de nuevos clientes.`,
            severity: 'medium',
            category: 'Customer Acquisition',
            data: { newCustomerRate, newCustomers, returningCustomers, totalCustomers },
            recommendations: [
              'Implementa estrategias de retención',
              'Crea programas de fidelización',
              'Ofrece descuentos para segundas compras'
            ],
            timestamp: new Date(),
            storeId,
            isRead: false,
            actionRequired: false,
            priority: 3
          });
        } else if (newCustomerRate < 20) {
          insights.push({
            id: `returning-customers-${Date.now()}`,
            type: 'marketing',
            title: 'Excelente retención de clientes',
            description: `${(100 - newCustomerRate).toFixed(1)}% de las ventas son de clientes recurrentes.`,
            severity: 'low',
            category: 'Customer Retention',
            data: { newCustomerRate, newCustomers, returningCustomers, totalCustomers },
            recommendations: [
              'Mantén las estrategias de fidelización',
              'Considera programas de referidos',
              'Expande a nuevos mercados'
            ],
            timestamp: new Date(),
            storeId,
            isRead: false,
            actionRequired: false,
            priority: 1
          });
        }
      }

    } catch (error) {
      console.error('Error generating marketing insights:', error);
    }

    return insights;
  }

  // Insights de productos
  async generateProductInsights(storeId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      const products = await this.strapi.db.query('api::product.product').findMany({
        where: { store: storeId },
        populate: ['category', 'reviews']
      });

      // Insight: Productos sin reviews
      const productsWithoutReviews = products.filter(product => 
        !product.reviews || product.reviews.length === 0
      );

      if (productsWithoutReviews.length > 0) {
        insights.push({
          id: `no-reviews-${Date.now()}`,
          type: 'product',
          title: 'Productos sin reseñas',
          description: `${productsWithoutReviews.length} productos no tienen reseñas de clientes.`,
          severity: 'medium',
          category: 'Product Quality',
          data: { productsWithoutReviews: productsWithoutReviews.map(p => ({ id: p.id, name: p.name })) },
          recommendations: [
            'Solicita reseñas a clientes satisfechos',
            'Ofrece incentivos por dejar reseñas',
            'Mejora las descripciones de productos'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: false,
          priority: 3
        });
      }

      // Insight: Productos con malas reseñas
      const productsWithBadReviews = products.filter(product => {
        if (!product.reviews || product.reviews.length === 0) return false;
        const avgRating = product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / product.reviews.length;
        return avgRating < 3;
      });

      if (productsWithBadReviews.length > 0) {
        insights.push({
          id: `bad-reviews-${Date.now()}`,
          type: 'product',
          title: 'Productos con reseñas bajas',
          description: `${productsWithBadReviews.length} productos tienen una calificación promedio menor a 3 estrellas.`,
          severity: 'high',
          category: 'Product Quality',
          data: { productsWithBadReviews: productsWithBadReviews.map(p => ({ id: p.id, name: p.name })) },
          recommendations: [
            'Revisa y mejora la calidad de estos productos',
            'Analiza las reseñas negativas para identificar problemas',
            'Considera retirar productos problemáticos'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: true,
          priority: 4
        });
      }

    } catch (error) {
      console.error('Error generating product insights:', error);
    }

    return insights;
  }

  // Insights de tendencias
  async generateTrendInsights(storeId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Obtener datos de los últimos 14 días para comparar con los 14 días anteriores
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const recentSales = await this.strapi.db.query('api::order.order').findMany({
        where: {
          storeId,
          createdAt: { $gte: fourteenDaysAgo },
          status: 'completed'
        },
        populate: ['products']
      });

      const previousPeriodSales = await this.strapi.db.query('api::order.order').findMany({
        where: {
          storeId,
          createdAt: { 
            $gte: new Date(fourteenDaysAgo.getTime() - 14 * 24 * 60 * 60 * 1000),
            $lt: fourteenDaysAgo
          },
          status: 'completed'
        },
        populate: ['products']
      });

      // Analizar tendencias por categoría
      const recentCategorySales = new Map();
      const previousCategorySales = new Map();

      recentSales.forEach(sale => {
        sale.products.forEach((product: any) => {
          const category = product.category?.name || 'Sin categoría';
          recentCategorySales.set(category, (recentCategorySales.get(category) || 0) + product.quantity);
        });
      });

      previousPeriodSales.forEach(sale => {
        sale.products.forEach((product: any) => {
          const category = product.category?.name || 'Sin categoría';
          previousCategorySales.set(category, (previousCategorySales.get(category) || 0) + product.quantity);
        });
      });

      // Identificar categorías en tendencia
      const trendingCategories = [];
      for (const [category, recentSales] of recentCategorySales) {
        const previousSales = previousCategorySales.get(category) || 0;
        if (previousSales > 0) {
          const growth = ((recentSales - previousSales) / previousSales) * 100;
          if (growth > 50) {
            trendingCategories.push({ category, growth, recentSales });
          }
        }
      }

      if (trendingCategories.length > 0) {
        insights.push({
          id: `trending-categories-${Date.now()}`,
          type: 'trend',
          title: 'Categorías en tendencia',
          description: `${trendingCategories.length} categorías están experimentando un crecimiento significativo: ${trendingCategories.map(t => `${t.category} (+${t.growth.toFixed(1)}%)`).join(', ')}`,
          severity: 'low',
          category: 'Trends',
          data: { trendingCategories },
          recommendations: [
            'Aumenta el inventario de estas categorías',
            'Crea campañas específicas para estas categorías',
            'Considera agregar más productos en estas categorías'
          ],
          timestamp: new Date(),
          storeId,
          isRead: false,
          actionRequired: false,
          priority: 2
        });
      }

    } catch (error) {
      console.error('Error generating trend insights:', error);
    }

    return insights;
  }

  // Guardar insights en la base de datos
  async saveInsights(insights: Insight[]): Promise<void> {
    try {
      for (const insight of insights) {
        await this.strapi.entityService.create('api::insight.insight', {
          data: {
            ...insight,
            timestamp: insight.timestamp.toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error saving insights:', error);
      throw error;
    }
  }

  // Obtener insights para una tienda
  async getStoreInsights(storeId: string, limit = 50): Promise<Insight[]> {
    try {
      const insights = await this.strapi.db.query('api::insight.insight').findMany({
        where: { storeId },
        orderBy: { timestamp: 'desc' },
        limit
      });

      return insights.map(insight => ({
        ...insight,
        timestamp: new Date(insight.timestamp)
      }));
    } catch (error) {
      console.error('Error getting store insights:', error);
      return [];
    }
  }

  // Marcar insight como leído
  async markInsightAsRead(insightId: string): Promise<void> {
    try {
      await this.strapi.entityService.update('api::insight.insight', insightId, {
        data: { isRead: true }
      });
    } catch (error) {
      console.error('Error marking insight as read:', error);
      throw error;
    }
  }

  // Eliminar insights antiguos (más de 30 días)
  async cleanupOldInsights(daysOld = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await this.strapi.db.query('api::insight.insight').deleteMany({
        where: {
          timestamp: { $lt: cutoffDate.toISOString() }
        }
      });
    } catch (error) {
      console.error('Error cleaning up old insights:', error);
    }
  }
} 