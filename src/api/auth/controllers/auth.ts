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

      // Generar token de reset
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Guardar el token en el usuario
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { resetPasswordToken: resetToken }
      });
      
      // Usar el EmailService principal
      const { EmailService } = require('../../../lib/email-service');
      const emailService = EmailService.getInstance();
      
      // Crear notificación para email de reset
      const resetNotification = {
        recipientEmail: user.email,
        title: '🔐 Restablecer Contraseña - WaaZaar',
        message: `Hola ${user.username || user.email}, has solicitado restablecer tu contraseña. Haz clic en el enlace para continuar.`,
        actionUrl: `/reset-password?token=${resetToken}`,
        actionText: 'Restablecer Contraseña',
        priority: 'high'
      };
      
      await emailService.sendNotificationEmail(resetNotification);

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
        return ctx.badRequest('Contraseña, confirmación y token son requeridos');
      }

      if (password !== passwordConfirmation) {
        return ctx.badRequest('Las contraseñas no coinciden');
      }

      if (password.length < 6) {
        return ctx.badRequest('La contraseña debe tener al menos 6 caracteres');
      }

      // Buscar usuario por token
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { resetPasswordToken: token }
      });

      if (!user) {
        return ctx.badRequest('Token inválido o expirado');
      }

      // Actualizar contraseña y eliminar token
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { 
          password: password,
          resetPasswordToken: null 
        }
      });

      strapi.log.info(`Contraseña restablecida para usuario: ${user.email}`);

      return ctx.send({
        message: 'Contraseña restablecida exitosamente'
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
});