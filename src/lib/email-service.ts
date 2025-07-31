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
      this.transporter = require('nodemailer').createTransporter({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      });
    } else {
      // Usar SMTP tradicional
      this.transporter = require('nodemailer').createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
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
    const statusColor = notification.priority === 'high' ? '#ff4444' : 
                       notification.priority === 'urgent' ? '#cc0000' : '#007bff';
    
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