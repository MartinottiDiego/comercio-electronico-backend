
import { BaseNode, NodeContext, NodeResult } from './base-node.service';
import { PersistenceResult } from './persistence.service';

export interface NotificationResult {
  userId: string;
  notificationsSent: number;
  channels: string[];
  metadata: {
    executionTime: number;
    rateLimited: boolean;
    errors: string[];
  };
}

export class NotifyNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'Notify');
  }

  async execute(context: NodeContext): Promise<NodeResult<NotificationResult[]>> {
    this.log('Starting notification sending');
    
    try {
      const { result: notificationResults, executionTime } = await this.measureExecutionTime(async () => {
        return await this.sendNotifications(context);
      });

      this.log(`Sent notifications for ${notificationResults.length} users in ${executionTime}ms`);

      return this.createSuccessResult(notificationResults, {
        processedCount: notificationResults.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in notification sending: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to send notifications: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async sendNotifications(context: NodeContext): Promise<NotificationResult[]> {
    const { data: persistenceResults } = context.metadata?.persistence || {};
    const { config } = context;

    if (!persistenceResults) {
      this.log('No persistence results found, skipping notifications');
      return [];
    }

    this.log(`Sending notifications for ${persistenceResults.length} users`);

    const results: NotificationResult[] = [];

    for (const persistenceResult of persistenceResults) {
      const result = await this.sendUserNotifications(persistenceResult, config);
      results.push(result);
    }

    return results;
  }

  private async sendUserNotifications(
    persistenceResult: PersistenceResult,
    config: any
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    const userId = persistenceResult.userId;
    const channels: string[] = [];
    const errors: string[] = [];
    let notificationsSent = 0;
    let rateLimited = false;

    try {
      // Check rate limiting
      const canSendNotification = await this.checkRateLimit(userId, config);
      
      if (!canSendNotification) {
        rateLimited = true;
        this.log(`Rate limited for user ${userId}`);
        return {
          userId,
          notificationsSent: 0,
          channels: [],
          metadata: {
            executionTime: Date.now() - startTime,
            rateLimited: true,
            errors: ['Rate limited']
          }
        };
      }

      // Get user details
      const user = await this.getUserDetails(userId);
      if (!user) {
        errors.push('User not found');
        return {
          userId,
          notificationsSent: 0,
          channels: [],
          metadata: {
            executionTime: Date.now() - startTime,
            rateLimited: false,
            errors
          }
        };
      }

      // Send email notification
      if (config.enableEmailNotifications) {
        try {
          await this.sendEmailNotification(user, persistenceResult);
          channels.push('email');
          notificationsSent++;
        } catch (error) {
          errors.push(`Email notification failed: ${error}`);
        }
      }

      // Send push notification
      if (config.enablePushNotifications) {
        try {
          await this.sendPushNotification(user, persistenceResult);
          channels.push('push');
          notificationsSent++;
        } catch (error) {
          errors.push(`Push notification failed: ${error}`);
        }
      }

      // Update rate limiting
      await this.updateRateLimit(userId, config);

    } catch (error) {
      errors.push(`General notification error: ${error}`);
    }

    const executionTime = Date.now() - startTime;

    return {
      userId,
      notificationsSent,
      channels,
      metadata: {
        executionTime,
        rateLimited,
        errors
      }
    };
  }

  private async checkRateLimit(userId: string, config: any): Promise<boolean> {
    try {
      // Check if user has exceeded notification limits
      const recentNotifications = await this.strapi.documents('api::notification.notification').findMany({
        filters: {
          user: {
            id: userId
          },
          type: 'promotion', // Assuming recommendation notifications are promotion type
          createdAt: {
            $gte: new Date(Date.now() - config.notificationCooldownHours * 60 * 60 * 1000).toISOString()
          }
        }
      });

      return recentNotifications.length < config.maxNotificationsPerUser;
    } catch (error) {
      this.log(`Error checking rate limit: ${error}`, 'warn');
      return true; // Allow if we can't check
    }
  }

  private async getUserDetails(userId: string): Promise<any> {
    try {
      const user = await this.strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId,
        populate: {
          profile: true
        }
      });

      return user;
    } catch (error) {
      this.log(`Error fetching user details: ${error}`, 'warn');
      return null;
    }
  }

  private async sendEmailNotification(user: any, persistenceResult: PersistenceResult): Promise<void> {
    const emailService = this.strapi.plugin('email').service('email');
    
    const subject = 'Nuevas recomendaciones para ti';
    const html = this.generateEmailTemplate(user, persistenceResult);

    await emailService.send({
      to: user.email,
      subject,
      html
    });

    this.log(`Email notification sent to ${user.email}`);
  }

  private async sendPushNotification(user: any, persistenceResult: PersistenceResult): Promise<void> {
    // This would integrate with your push notification service
    // For now, we'll just log it
    this.log(`Push notification would be sent to user ${user.id}`);
    
    // Example implementation:
    // const pushService = this.strapi.plugin('push-notifications').service('push');
    // await pushService.send({
    //   userId: user.id,
    //   title: 'Nuevas recomendaciones',
    //   body: `Tenemos ${persistenceResult.recommendationsStored} productos recomendados para ti`,
    //   data: {
    //     type: 'recommendations',
    //     strategy: persistenceResult.strategy
    //   }
    // });
  }

  private generateEmailTemplate(user: any, persistenceResult: PersistenceResult): string {
    const userName = user.profile?.firstName || user.username || 'Usuario';
    const productCount = persistenceResult.recommendationsStored;
    const strategy = persistenceResult.strategy;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nuevas recomendaciones</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>¡Hola ${userName}!</h2>
        <p>Tenemos ${productCount} productos recomendados especialmente para ti.</p>
        <p>Estas recomendaciones se generaron usando nuestra estrategia ${strategy} y están basadas en tus preferencias y comportamiento de compra.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/recommendations" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver recomendaciones
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Si no deseas recibir estas notificaciones, puedes desactivarlas en tu perfil.
        </p>
      </body>
      </html>
    `;
  }

  private async updateRateLimit(userId: string, config: any): Promise<void> {
    try {
      // Create a notification record to track rate limiting
      await this.strapi.documents('api::notification.notification').create({
        data: {
          type: 'promotion',
          title: 'Nuevas recomendaciones disponibles',
          message: 'Tenemos nuevas recomendaciones personalizadas para ti',
          priority: 'normal',
          notificationStatus: 'unread',
          user: userId,
          recipientEmail: '', // Will be populated by the system
          recipientRole: 'comprador',
          metadata: {
            source: 'recommendation_engine',
            strategy: 'auto_generated'
          }
        }
      });
    } catch (error) {
      this.log(`Error updating rate limit: ${error}`, 'warn');
    }
  }
}
