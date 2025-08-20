import nodemailer from 'nodemailer';

export default () => ({
  async send(options: any) {
    try {
      // Crear transportador de Nodemailer
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Configurar opciones del email
      const mailOptions = {
        from: `"WaaZaar" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject || 'Notificación de WaaZaar',
        html: options.html || options.text,
        replyTo: process.env.SMTP_USER,
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      
      strapi.log.info('Email enviado exitosamente:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      strapi.log.error('Error enviando email:', error);
      throw error;
    }
  },

  // Método para enviar email de reset de contraseña
  async sendResetPasswordEmail(user: any, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Restablecer Contraseña - WaaZaar</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #28a745;">🔐 Restablecer Contraseña</h1>
              <p>¡Hola ${user.username}!</p>
              <p>Has solicitado restablecer tu contraseña en WaaZaar.</p>
              <p>Haz clic en el enlace de abajo para continuar:</p>
              <a href="${resetUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
                  🔑 Restablecer Contraseña
              </a>
              <p>O copia y pega este enlace: ${resetUrl}</p>
              <p>Este enlace expirará en 24 horas.</p>
          </div>
      </body>
      </html>
    `;

    return this.send({
      to: user.email,
      subject: 'Restablecer Contraseña - WaaZaar',
      html: html,
    });
  },

  // Método para enviar email de confirmación
  async sendConfirmationEmail(user: any, confirmationToken: string) {
    const confirmationUrl = `${process.env.FRONTEND_URL}/email-confirmation?token=${confirmationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Confirmar Cuenta - WaaZaar</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #007bff;">🎉 ¡Bienvenido a WaaZaar!</h1>
              <p>¡Hola ${user.username}!</p>
              <p>Tu cuenta ha sido creada exitosamente.</p>
              <p>Haz clic en el enlace de abajo para confirmar tu cuenta:</p>
              <a href="${confirmationUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
                  ✅ Confirmar Mi Cuenta
              </a>
              <p>O copia y pega este enlace: ${confirmationUrl}</p>
          </div>
      </body>
      </html>
    `;

    return this.send({
      to: user.email,
      subject: 'Confirmar Cuenta - WaaZaar',
      html: html,
    });
  },
});
