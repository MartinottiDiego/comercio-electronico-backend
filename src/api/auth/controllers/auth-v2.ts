import nodemailer from 'nodemailer';

export default ({ strapi }: { strapi: any }) => ({
  async forgotPassword(ctx: any) {
    try {
      const { email } = ctx.request.body;
      
      if (!email) {
        return ctx.badRequest('Email es requerido');
      }

      // Buscar usuario por email
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Por seguridad, no revelar si el email existe o no
        return ctx.send({
          message: 'Si el email existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.'
        });
      }

      // Generar token de reset
      const resetToken = this.generateResetToken();
      
      // Guardar el token en el usuario
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { resetPasswordToken: resetToken }
      });
      
      // Enviar email
      await this.sendResetPasswordEmail(user, resetToken);

      strapi.log.info(`Email de reset enviado a: ${user.email}`);

      return ctx.send({
        message: 'Si el email existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.'
      });

    } catch (error) {
      strapi.log.error('Error en forgotPassword:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  async resetPassword(ctx: any) {
    try {
      const { password, passwordConfirmation, token } = ctx.request.body;

      if (!password || !passwordConfirmation || !token) {
        return ctx.badRequest('Todos los campos son requeridos');
      }

      if (password !== passwordConfirmation) {
        return ctx.badRequest('Las contraseñas no coinciden');
      }

      // Buscar usuario por token
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { resetPasswordToken: token }
      });

      if (!user) {
        return ctx.badRequest('Token inválido o expirado');
      }

      // Actualizar contraseña
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { 
          password: password,
          resetPasswordToken: null // Limpiar token
        }
      });

      strapi.log.info(`Contraseña actualizada para usuario: ${user.email}`);

      return ctx.send({
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error en resetPassword:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  generateResetToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  },

  async sendResetPasswordEmail(user: any, resetToken: string) {
    try {
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

      const mailOptions = {
        from: `"WaaZaar" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Restablecer Contraseña - WaaZaar',
        html: html,
        replyTo: process.env.SMTP_USER,
      };

      const info = await transporter.sendMail(mailOptions);
      
      strapi.log.info('Email enviado exitosamente:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      strapi.log.error('Error enviando email:', error);
      throw error;
    }
  },
});
