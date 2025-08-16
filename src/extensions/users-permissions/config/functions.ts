import { StrapiPlugin } from '../types';

export default (plugin: StrapiPlugin) => {
  // Personalizar el envío de emails
  plugin.controllers.auth.forgotPassword = async (ctx: any) => {
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
      const resetToken = await strapi.plugins['users-permissions'].services.user.generateResetPasswordToken(user);
      
      // Enviar email
      await strapi.plugins['users-permissions'].services.email.send({
        to: user.email,
        subject: 'Restablecer Contraseña - WaaZaar',
        template: 'forgot-password',
        data: {
          user: user,
          url: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      });

      return ctx.send({
        message: 'Si el email existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.'
      });

    } catch (error) {
      strapi.log.error('Error en forgotPassword:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  };

  // Personalizar el reset de contraseña
  plugin.controllers.auth.resetPassword = async (ctx: any) => {
    try {
      const { password, passwordConfirmation, token } = ctx.request.body;

      if (!password || !passwordConfirmation || !token) {
        return ctx.badRequest('Todos los campos son requeridos');
      }

      if (password !== passwordConfirmation) {
        return ctx.badRequest('Las contraseñas no coinciden');
      }

      // Validar y resetear contraseña
      const user = await strapi.plugins['users-permissions'].services.user.resetPassword({
        token,
        password
      });

      if (!user) {
        return ctx.badRequest('Token inválido o expirado');
      }

      return ctx.send({
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error en resetPassword:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  };

  return plugin;
};
