export default (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('Token de autenticación requerido');
      }

      const token = authHeader.substring(7);

      const userService = strapi.plugin('users-permissions').service('jwt');
      const payload = await userService.verify(token);
      
      if (!payload || !payload.id) {
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', payload.id);
      
      if (!user) {
        return ctx.unauthorized('Usuario no encontrado');
      }

      if (user.blocked || !user.confirmed) {
        return ctx.unauthorized('Usuario bloqueado o no confirmado');
      }

      ctx.state.user = user;

      await next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return ctx.unauthorized('Token inválido o expirado');
      }
      
      throw error;
    }
  };
};
