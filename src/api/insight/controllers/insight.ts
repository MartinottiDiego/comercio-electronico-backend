import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::insight.insight', ({ strapi }) => ({
  // Generar insights para una tienda
  async generateInsights(ctx: Context) {
    try {
      const { storeId } = ctx.params;
      
      if (!storeId) {
        return ctx.badRequest('storeId es requerido');
      }

      const insightsService = strapi.service('api::insight.insight');
      const insightsData = await insightsService.generateStoreInsights(storeId as string);

      // Guardar todos los insights generados
      const allInsights = [
        ...insightsData.salesInsights,
        ...insightsData.inventoryInsights,
        ...insightsData.userBehaviorInsights,
        ...insightsData.marketingInsights,
        ...insightsData.productInsights,
        ...insightsData.trendInsights
      ];

      if (allInsights.length > 0) {
        await insightsService.saveInsights(allInsights);
      }

      return {
        success: true,
        data: {
          totalInsights: allInsights.length,
          insights: insightsData,
          summary: {
            sales: insightsData.salesInsights.length,
            inventory: insightsData.inventoryInsights.length,
            userBehavior: insightsData.userBehaviorInsights.length,
            marketing: insightsData.marketingInsights.length,
            product: insightsData.productInsights.length,
            trend: insightsData.trendInsights.length
          }
        }
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      return ctx.internalServerError('Error generando insights');
    }
  },

  // Obtener insights de una tienda
  async getStoreInsights(ctx: Context) {
    try {
      const { storeId } = ctx.params;
      const { limit = 50, type, severity, unreadOnly = false } = ctx.query;
      
      if (!storeId) {
        return ctx.badRequest('storeId es requerido');
      }

      const insightsService = strapi.service('api::insight.insight');
      let insights = await insightsService.getStoreInsights(storeId as string, parseInt(limit as string));

      // Filtrar por tipo si se especifica
      if (type) {
        insights = insights.filter(insight => insight.type === type);
      }

      // Filtrar por severidad si se especifica
      if (severity) {
        insights = insights.filter(insight => insight.severity === severity);
      }

      // Filtrar solo no leídos si se especifica
      if (unreadOnly === 'true') {
        insights = insights.filter(insight => !insight.isRead);
      }

      // Ordenar por prioridad y fecha
      insights.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      return {
        success: true,
        data: {
          insights,
          total: insights.length,
          summary: {
            total: insights.length,
            unread: insights.filter(i => !i.isRead).length,
            critical: insights.filter(i => i.severity === 'critical').length,
            high: insights.filter(i => i.severity === 'high').length,
            medium: insights.filter(i => i.severity === 'medium').length,
            low: insights.filter(i => i.severity === 'low').length
          }
        }
      };
    } catch (error) {
      console.error('Error getting store insights:', error);
      return ctx.internalServerError('Error obteniendo insights');
    }
  },

  // Marcar insight como leído
  async markAsRead(ctx: Context) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID del insight es requerido');
      }

      const insightsService = strapi.service('api::insight.insight');
      await insightsService.markInsightAsRead(id as string);

      return {
        success: true,
        message: 'Insight marcado como leído'
      };
    } catch (error) {
      console.error('Error marking insight as read:', error);
      return ctx.internalServerError('Error marcando insight como leído');
    }
  },

  // Marcar múltiples insights como leídos
  async markMultipleAsRead(ctx: Context) {
    try {
      const { ids } = ctx.request.body as any;
      
      if (!ids || !Array.isArray(ids)) {
        return ctx.badRequest('Array de IDs es requerido');
      }

      const insightsService = strapi.service('api::insight.insight');
      
      for (const id of ids) {
        await insightsService.markInsightAsRead(id);
      }

      return {
        success: true,
        message: `${ids.length} insights marcados como leídos`
      };
    } catch (error) {
      console.error('Error marking multiple insights as read:', error);
      return ctx.internalServerError('Error marcando insights como leídos');
    }
  },

  // Obtener estadísticas de insights
  async getInsightsStats(ctx: Context) {
    try {
      const { storeId } = ctx.params;
      
      if (!storeId) {
        return ctx.badRequest('storeId es requerido');
      }

      const insightsService = strapi.service('api::insight.insight');
      const insights = await insightsService.getStoreInsights(storeId as string, 1000);

      const stats = {
        total: insights.length,
        unread: insights.filter(i => !i.isRead).length,
        actionRequired: insights.filter(i => i.actionRequired).length,
        byType: {
          sales: insights.filter(i => i.type === 'sales').length,
          inventory: insights.filter(i => i.type === 'inventory').length,
          user_behavior: insights.filter(i => i.type === 'user_behavior').length,
          marketing: insights.filter(i => i.type === 'marketing').length,
          product: insights.filter(i => i.type === 'product').length,
          trend: insights.filter(i => i.type === 'trend').length
        },
        bySeverity: {
          critical: insights.filter(i => i.severity === 'critical').length,
          high: insights.filter(i => i.severity === 'high').length,
          medium: insights.filter(i => i.severity === 'medium').length,
          low: insights.filter(i => i.severity === 'low').length
        },
        byPriority: {
          priority1: insights.filter(i => i.priority === 1).length,
          priority2: insights.filter(i => i.priority === 2).length,
          priority3: insights.filter(i => i.priority === 3).length,
          priority4: insights.filter(i => i.priority === 4).length,
          priority5: insights.filter(i => i.priority === 5).length
        }
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting insights stats:', error);
      return ctx.internalServerError('Error obteniendo estadísticas de insights');
    }
  },

  // Obtener insights para el dashboard admin (todas las tiendas)
  async getDashboardInsights(ctx: Context) {
    try {
      const { limit = 50, unreadOnly = false, severity, type } = ctx.query;
      
      // Obtener insights directamente de la base de datos
      const insights = await strapi.db.query('api::insight.insight').findMany({
        orderBy: { timestamp: 'desc' },
        limit: parseInt(limit as string) || 50
      });

      let filteredInsights = insights.map(insight => ({
        ...insight,
        timestamp: new Date(insight.timestamp)
      }));

      // Filtrar por tipo si se especifica
      if (type) {
        filteredInsights = filteredInsights.filter(insight => insight.type === type);
      }

      // Filtrar por severidad si se especifica
      if (severity) {
        filteredInsights = filteredInsights.filter(insight => insight.severity === severity);
      }

      // Filtrar solo no leídos si se especifica
      if (unreadOnly === 'true') {
        filteredInsights = filteredInsights.filter(insight => !insight.isRead);
      }

      // Ordenar por prioridad y fecha
      filteredInsights.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      return ctx.send({
        success: true,
        data: {
          insights: filteredInsights,
          total: filteredInsights.length,
          summary: {
            total: filteredInsights.length,
            unread: filteredInsights.filter(i => !i.isRead).length,
            critical: filteredInsights.filter(i => i.severity === 'critical').length,
            high: filteredInsights.filter(i => i.severity === 'high').length,
            medium: filteredInsights.filter(i => i.severity === 'medium').length,
            low: filteredInsights.filter(i => i.severity === 'low').length
          }
        }
      });
    } catch (error) {
      console.error('Error getting dashboard insights:', error);
      return ctx.internalServerError('Error obteniendo insights del dashboard');
    }
  },

  // Obtener insights para el dashboard admin (globales)
  async getAdminDashboardInsights(ctx: Context) {
    try {
      const { limit = 50, type, severity, unreadOnly = false } = ctx.query;
      
      // Obtener insights globales (scope: 'global' y targetType: 'admin')
      // También excluir insights de tipo inventory, sales, user_behavior que son para tiendas
      let insights = await strapi.db.query('api::insight.insight').findMany({
        where: {
          scope: 'global',
          targetType: 'admin',
          type: {
            $notIn: ['inventory', 'sales', 'user_behavior', 'marketing', 'product']
          }
        },
        orderBy: { timestamp: 'desc' },
        limit: parseInt(limit as string)
      });

      // Filtrar por tipo si se especifica
      if (type) {
        insights = insights.filter(insight => insight.type === type);
      }

      // Filtrar por severidad si se especifica
      if (severity) {
        insights = insights.filter(insight => insight.severity === severity);
      }

      // Filtrar solo no leídos si se especifica
      if (unreadOnly === 'true') {
        insights = insights.filter(insight => !insight.isRead);
      }

      // Calcular resumen
      const summary = {
        total: insights.length,
        unread: insights.filter(i => !i.isRead).length,
        critical: insights.filter(i => i.severity === 'critical').length,
        high: insights.filter(i => i.severity === 'high').length,
        medium: insights.filter(i => i.severity === 'medium').length,
        low: insights.filter(i => i.severity === 'low').length
      };

      return {
        success: true,
        data: {
          insights,
          total: insights.length,
          summary
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard insights:', error);
      return ctx.internalServerError('Error obteniendo insights del admin');
    }
  },

  // Obtener insights para el dashboard de tienda (específicos)
  async getStoreDashboardInsights(ctx: Context) {
    try {
      const { storeId } = ctx.params;
      const { limit = 50, type, severity, unreadOnly = false } = ctx.query;
      
      if (!storeId) {
        return ctx.badRequest('storeId es requerido');
      }

      // Obtener insights específicos de la tienda
      let insights = await strapi.db.query('api::insight.insight').findMany({
        where: {
          $or: [
            { scope: 'store', targetId: storeId },
            { storeId: storeId }
          ]
        },
        orderBy: { timestamp: 'desc' },
        limit: parseInt(limit as string)
      });

      // Filtrar por tipo si se especifica
      if (type) {
        insights = insights.filter(insight => insight.type === type);
      }

      // Filtrar por severidad si se especifica
      if (severity) {
        insights = insights.filter(insight => insight.severity === severity);
      }

      // Filtrar solo no leídos si se especifica
      if (unreadOnly === 'true') {
        insights = insights.filter(insight => !insight.isRead);
      }

      // Calcular resumen
      const summary = {
        total: insights.length,
        unread: insights.filter(i => !i.isRead).length,
        critical: insights.filter(i => i.severity === 'critical').length,
        high: insights.filter(i => i.severity === 'high').length,
        medium: insights.filter(i => i.severity === 'medium').length,
        low: insights.filter(i => i.severity === 'low').length
      };

      return {
        success: true,
        data: {
          insights,
          total: insights.length,
          summary
        }
      };
    } catch (error) {
      console.error('Error getting store dashboard insights:', error);
      return ctx.internalServerError('Error obteniendo insights de la tienda');
    }
  },

  // Limpiar insights antiguos
  async cleanupOldInsights(ctx: Context) {
    try {
      const { daysOld = 30 } = ctx.query;
      
      const insightsService = strapi.service('api::insight.insight');
      await insightsService.cleanupOldInsights(parseInt(daysOld as string));

      return {
        success: true,
        message: `Insights de más de ${daysOld} días eliminados`
      };
    } catch (error) {
      console.error('Error cleaning up old insights:', error);
      return ctx.internalServerError('Error limpiando insights antiguos');
    }
  },

  // Crear un insight manualmente (para desarrollo/pruebas)
  async createInsight(ctx: Context) {
    try {
      const insightData = ctx.request.body;
      
      if (!insightData.data || !insightData.data.type || !insightData.data.title || !insightData.data.description || !insightData.data.severity || !insightData.data.category) {
        return ctx.badRequest('Faltan campos requeridos: type, title, description, severity, category');
      }

      const insight = await strapi.entityService.create('api::insight.insight', {
        data: insightData.data
      });

      return {
        success: true,
        data: insight
      };
    } catch (error) {
      console.error('Error creating insight:', error);
      return ctx.internalServerError('Error creando insight');
    }
  }
}));