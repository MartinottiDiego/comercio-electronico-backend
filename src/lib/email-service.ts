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
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for port 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // diego.mrtinotti.dev@gmail.com
          pass: process.env.SMTP_PASS, // App password configurado
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        debug: process.env.NODE_ENV === 'development', // Habilitar debug en desarrollo
        logger: process.env.NODE_ENV === 'development' // Habilitar logs en desarrollo
      };

      

      this.transporter = require('nodemailer').createTransport(smtpConfig);
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

      // Añadir información del remitente
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@waazaar.com';
      
      

      const info = await this.transporter.sendMail({
        ...emailData,
        from: `"WaaZaar" <${fromEmail}>`,
        replyTo: fromEmail
      });

      

      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', {
        error: error.message,
        code: error.code,
        command: error.command,
        to: notification.recipientEmail,
        subject: notification.title
      });
      
      // Log detallado del error
      if (error.response) {
        console.error('📧 Respuesta del servidor SMTP:', error.response);
      }
      
      throw error;
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
                         .button { display: inline-block; padding: 15px 30px; background: #28a745; color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; border: 2px solid #28a745; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
             .button:hover { background: #218838; border-color: #218838; }
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
                   <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}${notification.actionUrl}" class="button">
                     🔑 ${notification.actionText || 'Restablecer Contraseña'}
                   </a>
                 </div>
                 <p style="text-align: center; margin: 30px 0;">
                   O copia y pega este enlace: <br>
                   <strong>${process.env.FRONTEND_URL || 'http://localhost:3001'}${notification.actionUrl}</strong>
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
                     .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white !important; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold; font-size: 16px; border: 2px solid #007bff; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
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
            ${notification.actionUrl ? `<a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}${notification.actionUrl}" class="button">${notification.actionText || 'Ver más'}</a>` : ''}
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

${notification.actionUrl ? `Acción: ${process.env.FRONTEND_URL || 'http://localhost:3001'}${notification.actionUrl}` : ''}

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
   * Enviar email de confirmación al usuario que solicitó el reembolso
   */
  async sendRefundRequestConfirmationToUser(refund: any, order: any, customer: any): Promise<boolean> {
    // Obtener nombre del usuario de diferentes fuentes posibles
    let customerName = 'Cliente';
    if (customer?.profile?.firstName && customer?.profile?.lastName) {
      customerName = `${customer.profile.firstName} ${customer.profile.lastName}`;
    } else if (customer?.firstName && customer?.lastName) {
      customerName = `${customer.firstName} ${customer.lastName}`;
    } else if (customer?.username) {
      customerName = customer.username;
    } else if (customer?.email) {
      customerName = customer.email.split('@')[0]; // Usar parte del email como nombre
    }
    
    // Obtener información del producto
    const productName = order?.order_items?.[0]?.product?.title || 'Producto';
    const storeName = order?.order_items?.[0]?.product?.store?.name || 'Tienda';
    
    const notification = {
      recipientEmail: customer.email,
      title: `🔄 Solicitud de Reembolso Confirmada - Pedido #${order.orderNumber}`,
      message: `Hola ${customerName}, hemos recibido tu solicitud de reembolso de €${refund.amount} para el producto "${productName}" de ${storeName}. Tu solicitud está siendo revisada por la tienda y pronto recibirás una notificación sobre el estado. Motivo: ${this.getReasonLabel(refund.reason)}.`,
      actionUrl: `/historial-compras`,
      actionText: 'Ver Historial',
      priority: 'normal'
    };
    
    return this.sendNotificationEmail(notification);
  }

  /**
   * Enviar email de notificación a la tienda sobre nueva solicitud de reembolso
   */
  async sendRefundRequestNotificationToStore(refund: any, order: any, customer: any, storeEmail: string): Promise<boolean> {
    // Obtener nombre del usuario de diferentes fuentes posibles
    let customerName = 'Cliente';
    if (customer?.profile?.firstName && customer?.profile?.lastName) {
      customerName = `${customer.profile.firstName} ${customer.profile.lastName}`;
    } else if (customer?.firstName && customer?.lastName) {
      customerName = `${customer.firstName} ${customer.lastName}`;
    } else if (customer?.username) {
      customerName = customer.username;
    } else if (customer?.email) {
      customerName = customer.email.split('@')[0]; // Usar parte del email como nombre
    }
    
    // Obtener información del producto
    const productName = order?.order_items?.[0]?.product?.title || 'Producto';
    const storeName = order?.order_items?.[0]?.product?.store?.name || 'Tienda';
    
    const notification = {
      recipientEmail: storeEmail,
      title: `🔄 Nueva Solicitud de Reembolso - Pedido #${order.orderNumber}`,
      message: `Hola ${storeName}, el usuario ${customerName} (${customer.email}) ha solicitado un reembolso de €${refund.amount} para el producto "${productName}" del pedido #${order.orderNumber}. Motivo: ${this.getReasonLabel(refund.reason)}. Revisa la solicitud en tu dashboard.`,
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
   * Método para enviar emails personalizados con HTML/texto
   */
  async sendCustomEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<boolean> {
    try {
      const { to, subject, html, text } = options;
      
      const emailData: EmailData = {
        to,
        subject,
        html: html || text || '',
        text: text || this.stripHtml(html || '')
      };

      // Añadir información del remitente
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@waazaar.com';
      const fromName = 'WaaZaar';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: fromEmail,
      };

      if (this.useResend) {
        // Usar Resend
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const { data, error } = await resend.emails.send({
          from: `"${fromName}" <${fromEmail}>`,
          to: [emailData.to],
          subject: emailData.subject,
          html: emailData.html,
        });

        if (error) {
          console.error('❌ Error enviando email con Resend:', error);
          return false;
        }

        console.log('✅ Email enviado exitosamente con Resend:', data?.id);
        return true;
      } else {
        // Usar SMTP tradicional
        const info = await this.transporter.sendMail(mailOptions);
        console.log('✅ Email enviado exitosamente:', info.messageId);
        return true;
      }
    } catch (error) {
      console.error('❌ Error enviando email personalizado:', error);
      return false;
    }
  }

  /**
   * Método auxiliar para convertir HTML a texto plano
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Método principal para enviar emails de reembolso
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    data?: any;
  }): Promise<boolean> {
    try {
      const { to, subject, html, text, template, data } = options;
      
      // Si se proporciona HTML o texto directamente, enviar email personalizado
      if (html || text) {
        return await this.sendCustomEmail({ to, subject, html, text });
      }
      
      // Si no, usar el sistema de templates existente
      if (!template) {
        throw new Error('Debe proporcionar template o html/text');
      }
      
      switch (template) {
        case 'refund-request-created':
          // Para solicitudes de reembolso, enviar tanto al usuario como a la tienda
          await this.sendRefundRequestConfirmationToUser(data.refund, data.order, data.customer);
          
          // Obtener el email del owner de la tienda
          const store = data.order?.order_items?.[0]?.product?.store;
          
          if (!store || !store.owner) {
            console.error('❌ No se pudo obtener la tienda o su owner');
            return false;
          }
          
          // Obtener el email del owner de la tienda
          const storeOwner = await strapi.entityService.findOne('plugin::users-permissions.user', store.owner.id, {
            fields: ['email']
          });
          
          if (!storeOwner || !storeOwner.email) {
            console.error('❌ No se pudo obtener el email del owner de la tienda');
            return false;
          }
          
          return this.sendRefundRequestNotificationToStore(data.refund, data.order, data.customer, storeOwner.email);
        
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
      return true;
    } catch (error) {
      console.error('Error verifying email connection:', error);
      return false;
    }
  }
} 