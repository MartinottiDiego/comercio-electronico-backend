import { PushNotificationService } from './push-notification-service';
import { InsightData } from './insights-generators';

export interface InsightNotificationConfig {
  enabled: boolean;
  criticalOnly: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  webhookUrl?: string;
}

export class InsightsNotificationService {
  private static instance: InsightsNotificationService;
  private pushService: PushNotificationService;
  private config: InsightNotificationConfig;

  private constructor() {
    this.pushService = PushNotificationService.getInstance();
    this.config = {
      enabled: true,
      criticalOnly: false,
      pushNotifications: true,
      emailNotifications: false
    };
  }

  public static getInstance(): InsightsNotificationService {
    if (!InsightsNotificationService.instance) {
      InsightsNotificationService.instance = new InsightsNotificationService();
    }
    return InsightsNotificationService.instance;
  }

  /**
   * Configura las opciones de notificación
   */
  public configure(config: Partial<InsightNotificationConfig>): void {
    this.config = { ...this.config, ...config };

  }

  /**
   * Envía notificaciones para un insight generado
   */
  public async notifyInsight(insight: InsightData): Promise<void> {
    if (!this.config.enabled) {

      return;
    }

    if (this.config.criticalOnly && !['critical', 'high'].includes(insight.severity)) {

      return;
    }

    try {

      // Enviar notificación push
      if (this.config.pushNotifications) {
        await this.sendPushNotification(insight);
      }

      // Enviar notificación por email
      if (this.config.emailNotifications) {
        await this.sendEmailNotification(insight);
      }

      // Enviar webhook
      if (this.config.webhookUrl) {
        await this.sendWebhookNotification(insight);
      }

    } catch (error) {
      }
  }

  /**
   * Envía notificación push
   */
  private async sendPushNotification(insight: InsightData): Promise<void> {
    try {
      // Obtener suscripciones activas según el target
      const subscriptions = await this.getActiveSubscriptions(insight.targetType, insight.targetId);
      
      if (subscriptions.length === 0) {

        return;
      }

      const notificationData = {
        title: this.getNotificationTitle(insight),
        message: insight.description,
        actionUrl: this.getActionUrl(insight),
        priority: this.getNotificationPriority(insight.severity),
        icon: this.getNotificationIcon(insight.type),
        badge: this.getNotificationBadge(insight.severity),
        tag: `insight-${insight.type}`,
        data: {
          insightId: insight.type,
          type: insight.type,
          severity: insight.severity,
          scope: insight.scope,
          targetType: insight.targetType,
          targetId: insight.targetId
        }
      };

      // Enviar a todas las suscripciones
      for (const subscription of subscriptions) {
        try {
          await this.pushService.sendPushNotification(subscription, notificationData);
        } catch (error) {
          }
      }

    } catch (error) {
      }
  }

  /**
   * Envía notificación por email
   */
  private async sendEmailNotification(insight: InsightData): Promise<void> {
    try {
      // Obtener emails de destinatarios según el target
      const recipients = await this.getEmailRecipients(insight.targetType, insight.targetId);
      
      if (recipients.length === 0) {

        return;
      }

      const emailData = {
        to: recipients,
        subject: this.getEmailSubject(insight),
        html: this.getEmailTemplate(insight),
        text: this.getEmailText(insight)
      };

      // Enviar email usando el servicio existente
      await strapi.plugins['email'].services.email.send(emailData);

    } catch (error) {
      }
  }

  /**
   * Envía notificación por webhook
   */
  private async sendWebhookNotification(insight: InsightData): Promise<void> {
    try {
      const webhookData = {
        type: 'insight_generated',
        insight: {
          type: insight.type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          category: insight.category,
          scope: insight.scope,
          targetType: insight.targetType,
          targetId: insight.targetId,
          priority: insight.priority,
          actionRequired: insight.actionRequired,
          data: insight.data,
          recommendations: insight.recommendations,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(this.config.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Strapi-Insights-Automation/1.0'
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }

    } catch (error) {
      }
  }

  /**
   * Obtiene suscripciones activas según el target
   */
  private async getActiveSubscriptions(targetType: string, targetId?: string): Promise<any[]> {
    try {
      // Obtener suscripciones activas
      const subscriptions = await strapi.entityService.findMany('api::push-subscription.push-subscription', {
        filters: {
          isActive: true
        },
        populate: ['user']
      });

      // Por ahora, retornar todas las suscripciones activas
      // TODO: Implementar filtrado por target cuando las relaciones estén correctamente configuradas

      return subscriptions;

    } catch (error) {
      console.error('Error obteniendo suscripciones:', error);
      return [];
    }
  }

  /**
   * Obtiene destinatarios de email según el target
   */
  private async getEmailRecipients(targetType: string, targetId?: string): Promise<string[]> {
    try {
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          blocked: false,
          confirmed: true
        }
      });

      // Por ahora, retornar emails de todos los usuarios activos
      // TODO: Implementar filtrado por target cuando las relaciones estén correctamente configuradas
      const emails = users
        .map(user => user.email)
        .filter(Boolean);

      return emails;

    } catch (error) {
      console.error('Error obteniendo destinatarios de email:', error);
      return [];
    }
  }

  /**
   * Genera el título de la notificación
   */
  private getNotificationTitle(insight: InsightData): string {
    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '💡'
    };

    return `${severityEmoji[insight.severity]} ${insight.title}`;
  }

  /**
   * Genera la URL de acción
   */
  private getActionUrl(insight: InsightData): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    if (insight.targetType === 'admin') {
      return `${baseUrl}/admin`;
    } else if (insight.targetType === 'store') {
      return `${baseUrl}/dashboard/insights`;
    } else {
      return `${baseUrl}/dashboard`;
    }
  }

  /**
   * Obtiene la prioridad de la notificación
   */
  private getNotificationPriority(severity: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'normal';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  /**
   * Obtiene el icono de la notificación
   */
  private getNotificationIcon(type: string): string {
    const icons = {
      system: '⚙️',
      performance: '🚀',
      security: '🔒',
      inventory: '📦',
      sales: '💰',
      user_behavior: '👥',
      product: '🛍️',
      trend: '📈',
      marketing: '📢'
    };
    return icons[type] || '💡';
  }

  /**
   * Obtiene el badge de la notificación
   */
  private getNotificationBadge(severity: string): string {
    return severity === 'critical' ? '🚨' : '💡';
  }

  /**
   * Genera el asunto del email
   */
  private getEmailSubject(insight: InsightData): string {
    const severityText = {
      critical: 'CRÍTICO',
      high: 'ALTO',
      medium: 'MEDIO',
      low: 'BAJO'
    };

    return `[${severityText[insight.severity]}] ${insight.title}`;
  }

  /**
   * Genera el template HTML del email
   */
  private getEmailTemplate(insight: InsightData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${insight.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .severity { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
          .critical { background: #dc3545; color: white; }
          .high { background: #fd7e14; color: white; }
          .medium { background: #ffc107; color: black; }
          .low { background: #28a745; color: white; }
          .content { background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
          .recommendations { background: #e9ecef; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .recommendations ul { margin: 0; padding-left: 20px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${insight.title}</h1>
            <span class="severity ${insight.severity}">${insight.severity.toUpperCase()}</span>
            <p><strong>Categoría:</strong> ${insight.category}</p>
          </div>
          
          <div class="content">
            <p>${insight.description}</p>
            
            ${insight.recommendations.length > 0 ? `
              <div class="recommendations">
                <h3>Recomendaciones:</h3>
                <ul>
                  ${insight.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Este insight fue generado automáticamente por el sistema de análisis.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera el texto plano del email
   */
  private getEmailText(insight: InsightData): string {
    return `
${insight.title}
${insight.severity.toUpperCase()} - ${insight.category}

${insight.description}

${insight.recommendations.length > 0 ? `
Recomendaciones:
${insight.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

---
Este insight fue generado automáticamente por el sistema de análisis.
Timestamp: ${new Date().toISOString()}
    `.trim();
  }
}

export const insightsNotificationService = InsightsNotificationService.getInstance();
