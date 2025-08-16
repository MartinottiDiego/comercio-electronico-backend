import nodemailer from 'nodemailer';

export default ({ strapi }: { strapi: any }) => ({
  // ENDPOINT PERSONALIZADO para reset de contraseña
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

      // Generar nuestro propio token de reset (ya que el método no existe en Strapi v5)
      const resetToken = this.generateResetToken();
      
      // Guardar el token en el usuario
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { resetPasswordToken: resetToken }
      });
      
      // ENVIAR EMAIL CON NODEMAILER DIRECTO
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

  // ENDPOINT PERSONALIZADO para reset de contraseña
  async resetPassword(ctx: any) {
    try {
      const { password, passwordConfirmation, token } = ctx.request.body;

      if (!password || !passwordConfirmation || !token) {
        return ctx.badRequest('Todos los campos son requeridos');
      }

      if (password !== passwordConfirmation) {
        return ctx.badRequest('Las contraseñas no coinciden');
      }

      // Buscar usuario por token de reset
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { resetPasswordToken: token }
      });

      if (!user) {
        return ctx.badRequest('Token inválido o expirado');
      }

      // Usar el servicio nativo de Strapi para actualizar la contraseña (esto la hashea automáticamente)
      await strapi.plugins['users-permissions'].services.user.edit(user.id, {
        password: password,
        resetPasswordToken: null // Limpiar token
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

  // ENDPOINT PERSONALIZADO para cambiar contraseña desde el perfil
  async changePasswordFromProfile(ctx: any) {
    try {
      const { newPassword } = ctx.request.body;
      const userId = ctx.state.user.id; // ID del usuario autenticado

      if (!newPassword) {
        return ctx.badRequest('Nueva contraseña es requerida');
      }

      if (newPassword.length < 6) {
        return ctx.badRequest('La contraseña debe tener al menos 6 caracteres');
      }

      // Actualizar contraseña usando el servicio nativo de Strapi
      await strapi.plugins['users-permissions'].services.user.edit(userId, {
        password: newPassword
      });

      strapi.log.info(`Contraseña actualizada para usuario ID: ${userId}`);

      return ctx.send({
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error en changePasswordFromProfile:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  // MÉTODO PRIVADO para enviar email con Nodemailer
  async sendResetPasswordEmail(user: any, resetToken: string) {
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

      // Configurar opciones del email
      const mailOptions = {
        from: `"WaaZaar" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Restablecer Contraseña - WaaZaar',
        html: html,
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

   // MÉTODO PRIVADO para generar token de reset
   generateResetToken(): string {
     const crypto = require('crypto');
     return crypto.randomBytes(32).toString('hex');
   },
 });
