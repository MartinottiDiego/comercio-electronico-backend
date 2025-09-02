import { Context } from 'koa';
import { insightsAutomationService } from '../../../lib/services/insights-automation-service';

export default {
  /**
   * Obtiene el estado de todos los triggers de automatización
   */
  async getTriggersStatus(ctx: Context) {
    try {
      const triggers = insightsAutomationService.getTriggersStatus();
      
      ctx.body = {
        success: true,
        data: {
          triggers,
          total: triggers.length,
          enabled: triggers.filter(t => t.enabled).length,
          disabled: triggers.filter(t => !t.enabled).length
        }
      };
    } catch (error) {
      console.error('Error obteniendo estado de triggers:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  },

  /**
   * Habilita o deshabilita un trigger específico
   */
  async toggleTrigger(ctx: Context) {
    try {
      const { triggerId } = ctx.params;
      const { enabled } = ctx.request.body;

      if (typeof enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'El campo "enabled" debe ser un booleano'
        };
        return;
      }

      const success = await insightsAutomationService.toggleTrigger(triggerId, enabled);
      
      if (!success) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Trigger no encontrado'
        };
        return;
      }

      ctx.body = {
        success: true,
        message: `Trigger ${enabled ? 'habilitado' : 'deshabilitado'} correctamente`
      };
    } catch (error) {
      console.error('Error modificando trigger:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  },

  /**
   * Ejecuta un trigger manualmente
   */
  async executeTrigger(ctx: Context) {
    try {
      const { triggerId } = ctx.params;
      
      const result = await insightsAutomationService.executeTriggerManually(triggerId);
      
      ctx.body = {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error ejecutando trigger:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      };
    }
  },

  /**
   * Obtiene estadísticas de la automatización
   */
  async getAutomationStats(ctx: Context) {
    try {
      const triggers = insightsAutomationService.getTriggersStatus();
      
      const stats = {
        total: triggers.length,
        enabled: triggers.filter(t => t.enabled).length,
        disabled: triggers.filter(t => !t.enabled).length,
        byType: {
          system: triggers.filter(t => t.insightType === 'system').length,
          performance: triggers.filter(t => t.insightType === 'performance').length,
          security: triggers.filter(t => t.insightType === 'security').length,
          inventory: triggers.filter(t => t.insightType === 'inventory').length,
          sales: triggers.filter(t => t.insightType === 'sales').length,
          user_behavior: triggers.filter(t => t.insightType === 'user_behavior').length,
          product: triggers.filter(t => t.insightType === 'product').length,
          trend: triggers.filter(t => t.insightType === 'trend').length
        },
        byScope: {
          global: triggers.filter(t => t.scope === 'global').length,
          store: triggers.filter(t => t.scope === 'store').length,
          user: triggers.filter(t => t.scope === 'user').length
        },
        byTarget: {
          admin: triggers.filter(t => t.targetType === 'admin').length,
          store: triggers.filter(t => t.targetType === 'store').length,
          user: triggers.filter(t => t.targetType === 'user').length
        }
      };

      ctx.body = {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de automatización:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }
};
