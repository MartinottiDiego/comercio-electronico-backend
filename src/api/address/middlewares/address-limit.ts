/**
 * Middleware para limitar el número de direcciones por usuario
 */

export default (config, { strapi }) => {
  return async (ctx, next) => {
    // Solo aplicar límite en operaciones de creación
    if (ctx.method === 'POST' && ctx.request.url.includes('/api/addresses')) {
      const userId = ctx.state.user?.id;
      
      if (userId) {
        try {
          // Contar direcciones existentes del usuario
          const existingAddresses = await strapi.entityService.findMany('api::address.address', {
            filters: {
              users_permissions_user: userId,
              isActive: true
            }
          });

          const MAX_ADDRESSES_PER_USER = 5;
          
          if (existingAddresses.length >= MAX_ADDRESSES_PER_USER) {
            return ctx.badRequest('Has alcanzado el límite máximo de direcciones permitidas. Elimina una dirección existente para agregar una nueva.');
          }
        } catch (error) {
          console.error('Error checking address limit:', error);
          // En caso de error, permitir la creación para no bloquear al usuario
        }
      }
    }

    await next();
  };
};
