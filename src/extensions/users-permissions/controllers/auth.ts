export default () => ({
  // SOBRESCRIBIR COMPLETAMENTE el método forgotPassword
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

      // Generar token de reset usando el servicio nativo de Strapi
      const resetToken = await strapi.plugins['users-permissions'].services.user.generateResetPasswordToken(user);
      
      // Enviar email usando NUESTRO servicio personalizado
      const emailService = strapi.plugin('users-permissions').service('email');
      await emailService.sendResetPasswordEmail(user, resetToken);

      strapi.log.info(`Email de reset enviado a: ${user.email}`);

      return ctx.send({
        message: 'Si el email existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.'
      });

    } catch (error) {
      strapi.log.error('Error en forgotPassword:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  // SOBRESCRIBIR COMPLETAMENTE el método resetPassword
  async resetPassword(ctx: any) {
    try {
      const { password, passwordConfirmation, token } = ctx.request.body;

      if (!password || !passwordConfirmation || !token) {
        return ctx.badRequest('Todos los campos son requeridos');
      }

      if (password !== passwordConfirmation) {
        return ctx.badRequest('Las contraseñas no coinciden');
      }

      // Validar y resetear contraseña usando el servicio nativo de Strapi
      const user = await strapi.plugins['users-permissions'].services.user.resetPassword({
        token,
        password
      });

      if (!user) {
        return ctx.badRequest('Token inválido o expirado');
      }

      strapi.log.info(`Contraseña actualizada para usuario: ${user.email}`);

      return ctx.send({
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error en resetPassword:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  // SOBRESCRIBIR COMPLETAMENTE el método emailConfirmation
  async emailConfirmation(ctx: any) {
    try {
      const { confirmation } = ctx.query;

      if (!confirmation) {
        return ctx.badRequest('Token de confirmación requerido');
      }

      // Confirmar email usando el servicio nativo de Strapi
      const user = await strapi.plugins['users-permissions'].services.user.confirmEmail(confirmation);

      if (!user) {
        return ctx.badRequest('Token de confirmación inválido o expirado');
      }

      strapi.log.info(`Email confirmado para usuario: ${user.email}`);

      return ctx.send({
        message: 'Email confirmado exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error en emailConfirmation:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },
});











