// Email service para enviar notificaciones por email
// Usa Nodemailer con Resend o SMTP tradicional

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: any;
  private useResend: boolean;

  private constructor() {
    this.useResend = process.env.EMAIL_PROVIDER === 'resend';
    
    if (this.useResend) {
      // Usar Resend
      this.transporter = require('nodemailer').createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      });
    } else {
      // Usar SMTP tradicional (Gmail configurado)
      this.transporter = require('nodemailer').createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for port 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // diego.mrtinotti.dev@gmail.com
          pass: process.env.SMTP_PASS, // App password configurado
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendNotificationEmail(notification: any): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: notification.recipientEmail,
        subject: notification.title,
        html: this.generateNotificationHTML(notification),
        text: this.generateNotificationText(notification),
      };

      const info = await this.transporter.sendMail(emailData);
      console.log(`📧 Email enviado a ${notification.recipientEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  }

  private generateNotificationHTML(notification: any): string {
    const statusColor = notification.priority === 'high' ? '#28a745' : 
                       notification.priority === 'urgent' ? '#dc3545' : '#007bff';
    
    // Template especial para reset de contraseña
    if (notification.title.includes('Restablecer Contraseña')) {
      return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>${notification.title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; }
            .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px 20px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; padding: 15px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; transition: background 0.3s; }
            .button:hover { background: #218838; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🔐 ${notification.title}</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por tu seguridad.
              </div>
              
              ${notification.actionUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${notification.actionUrl}" class="button">
                    🔑 ${notification.actionText || 'Restablecer Contraseña'}
                  </a>
                </div>
                <p style="font-size: 14px; color: #666; word-break: break-all;">
                  O copia y pega este enlace: <br>
                  <strong>${process.env.FRONTEND_URL || 'http://localhost:3000'}${notification.actionUrl}</strong>
                </p>
              ` : ''}
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no será modificada.
              </p>
            </div>
            <div class="footer">
              <p>Este es un email automático del sistema WaaZaar.</p>
              <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
    
    // Template general para otras notificaciones
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 10px 20px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${process.env.FRONTEND_URL}${notification.actionUrl}" class="button">${notification.actionText || 'Ver más'}</a>` : ''}
          </div>
          <div class="footer">
            <p>Este es un email automático del sistema de notificaciones.</p>
            <p>Fecha: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateNotificationText(notification: any): string {
    return `
${notification.title}

${notification.message}

${notification.actionUrl ? `Acción: ${process.env.FRONTEND_URL}${notification.actionUrl}` : ''}

---
Fecha: ${new Date().toLocaleString()}
Sistema de notificaciones automáticas
    `;
  }

  async sendOrderConfirmationEmail(order: any, user: any): Promise<boolean> {
    const notification = {
      recipientEmail: user.email,
      title: `✅ Orden confirmada #${order.orderNumber}`,
      message: `Tu orden ha sido confirmada y está siendo procesada. Total: $${order.total}`,
      actionUrl: `/orders/${order.id}`,
      actionText: 'Ver orden',
      priority: 'normal'
    };
    
    return this.sendNotificationEmail(notification);
  }

  async sendNewSaleEmail(order: any, storeEmail: string): Promise<boolean> {
    const notification = {
      recipientEmail: storeEmail,
      title: `🛒 Nueva venta #${order.orderNumber}`,
      message: `Has recibido una nueva orden. Revisa los detalles en tu panel de administración.`,
      actionUrl: `/admin/orders/${order.id}`,
      actionText: 'Ver orden',
      priority: 'high'
    };
    
    return this.sendNotificationEmail(notification);
  }

  async sendOrderStatusEmail(order: any, newStatus: string, user: any): Promise<boolean> {
    const statusMessages = {
      'confirmed': 'Tu orden ha sido confirmada',
      'shipped': 'Tu orden ha sido enviada',
      'delivered': 'Tu orden ha sido entregada',
      'cancelled': 'Tu orden ha sido cancelada'
    };
    
    const notification = {
      recipientEmail: user.email,
      title: `📦 Estado actualizado: ${newStatus}`,
      message: `${statusMessages[newStatus] || `Tu orden ha cambiado a estado: ${newStatus}`}`,
      actionUrl: `/orders/${order.id}`,
      actionText: 'Ver orden',
      priority: 'normal'
    };
    
    return this.sendNotificationEmail(notification);
  }

  /**
   * Enviar email para solicitud de reembolso creada (para tienda)
   */
  async sendRefundRequestEmail(refund: any, order: any, customer: any, storeEmail: string): Promise<boolean> {
    const notification = {
      recipientEmail: storeEmail,
      title: `🔄 Nueva Solicitud de Reembolso - Pedido #${order.orderNumber}`,
      message: `${customer.firstName} ${customer.lastName} ha solicitado un reembolso de €${refund.amount} para el pedido #${order.orderNumber}. Motivo: ${this.getReasonLabel(refund.reason)}. Revisa la solicitud en tu dashboard.`,
      actionUrl: `/dashboard/reembolsos`,
      actionText: 'Revisar Solicitud',
      priority: 'high'
    };
    
    return this.sendNotificationEmail(notification);
  }

  /**
   * Enviar email para actualización de estado de reembolso (para cliente)
   */
  async sendRefundStatusUpdateEmail(refund: any, order: any, customer: any): Promise<boolean> {
    const statusMessages = {
      'completed': `¡Excelente noticia! Tu reembolso de €${refund.amount} ha sido procesado exitosamente.`,
      'rejected': `Lamentablemente, tu solicitud de reembolso ha sido rechazada por la tienda.`,
      'processing': `Tu solicitud de reembolso ha sido aprobada y está siendo procesada.`,
      'failed': `Hubo un problema al procesar tu reembolso. Contactaremos contigo pronto.`
    };

    const statusEmojis = {
      'completed': '✅',
      'rejected': '❌',
      'processing': '🔄',
      'failed': '⚠️'
    };

    const emoji = statusEmojis[refund.status] || 'ℹ️';
    const message = statusMessages[refund.status] || `Tu reembolso ha cambiado a estado: ${refund.status}`;
    
    const notification = {
      recipientEmail: customer.email,
      title: `${emoji} Actualización de Reembolso - Pedido #${order.orderNumber}`,
      message: message,
      actionUrl: `/historial-compras`,
      actionText: 'Ver Historial',
      priority: refund.status === 'completed' ? 'high' : 'normal'
    };
    
    return this.sendNotificationEmail(notification);
  }

  /**
   * Enviar email especializado para reembolso completado
   */
  async sendRefundCompletedEmail(refund: any, order: any, customer: any): Promise<boolean> {
    const notification = {
      recipientEmail: customer.email,
      title: `✅ ¡Reembolso Completado! - Pedido #${order.orderNumber}`,
      message: `Tu reembolso de €${refund.amount} ha sido procesado exitosamente. El dinero será devuelto a tu método de pago original en un plazo de 3-5 días hábiles.`,
      actionUrl: `/historial-compras`,
      actionText: 'Ver Detalles',
      priority: 'high'
    };
    
    return this.sendNotificationEmail(notification);
  }

  /**
   * Método principal para enviar emails de reembolso
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<boolean> {
    try {
      const { to, subject, template, data } = options;
      
      switch (template) {
        case 'refund-request-created':
          return this.sendRefundRequestEmail(data.refund, data.order, data.customer, to);
        
        case 'refund-status-updated':
          return this.sendRefundStatusUpdateEmail(data.refund, data.order, data.customer);
        
        case 'refund-completed':
          return this.sendRefundCompletedEmail(data.refund, data.order, data.customer);
        
        default:
          // Fallback a notificación genérica
          const notification = {
            recipientEmail: to,
            title: subject,
            message: JSON.stringify(data),
            priority: 'normal'
          };
          return this.sendNotificationEmail(notification);
      }
    } catch (error) {
      console.error('❌ Error enviando email de reembolso:', error);
      return false;
    }
  }

  /**
   * Obtener label del motivo de reembolso
   */
  private getReasonLabel(reason: string): string {
    const reasons: Record<string, string> = {
      'defective_product': 'Producto defectuoso',
      'wrong_size': 'Talla incorrecta',
      'not_as_described': 'No coincide con la descripción',
      'damaged': 'Producto dañado en el envío',
      'wrong_item': 'Producto incorrecto recibido',
      'quality_issue': 'Problema de calidad',
      'change_mind': 'Cambié de opinión',
      'duplicate': 'Pedido duplicado',
      'fraudulent': 'Pedido fraudulento',
      'requested_by_customer': 'Solicitado por el cliente',
      'other': 'Otro motivo'
    };
    
    return reasons[reason] || reason;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Conexión de email verificada');
      return true;
    } catch (error) {
      console.error('❌ Error verificando conexión de email:', error);
      return false;
    }
  }
} 