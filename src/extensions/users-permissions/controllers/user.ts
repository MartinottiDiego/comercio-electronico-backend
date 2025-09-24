export default () => ({
  // Restaurar usuario eliminado lógicamente
  async restore(ctx: any) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID de usuario requerido');
      }

      // Verificar que el usuario existe y está eliminado
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id }
      });

      if (!user) {
        return ctx.notFound('Usuario no encontrado');
      }

      if (!user.deletedAt) {
        return ctx.badRequest('El usuario no está eliminado');
      }

      // Restaurar usuario (eliminar deletedAt y desbloquear)
      const restoredUser = await strapi.query('plugin::users-permissions.user').update({
        where: { id },
        data: { 
          deletedAt: null,
          blocked: false
        }
      });

      strapi.log.info(`Usuario ${id} restaurado exitosamente`);

      return ctx.send({
        success: true,
        data: restoredUser,
        message: 'Usuario restaurado exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error restaurando usuario:', error);
      return ctx.internalServerError('Error restaurando usuario');
    }
  },

  // Buscar usuarios eliminados lógicamente
  async findDeleted(ctx: any) {
    try {
      const { page = 1, pageSize = 10, search, role } = ctx.query;
      const offset = (page - 1) * pageSize;

      // Construir filtros
      const where: any = {
        deletedAt: { $notNull: true }
      };

      if (search) {
        where.$or = [
          { username: { $containsi: search } },
          { email: { $containsi: search } }
        ];
      }

      if (role && role !== 'all') {
        where.role = role;
      }

      // Obtener usuarios eliminados
      const users = await strapi.query('plugin::users-permissions.user').findMany({
        where,
        populate: ['role', 'profile'],
        limit: pageSize,
        offset,
        orderBy: { deletedAt: 'desc' }
      });

      // Contar total
      const total = await strapi.query('plugin::users-permissions.user').count({
        where
      });

      return ctx.send({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });

    } catch (error) {
      strapi.log.error('Error obteniendo usuarios eliminados:', error);
      return ctx.internalServerError('Error obteniendo usuarios eliminados');
    }
  },

  // Eliminar usuario lógicamente (sobrescribir el método delete por defecto)
  async delete(ctx: any) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('ID de usuario requerido');
      }

      // Verificar que el usuario existe
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id }
      });

      if (!user) {
        return ctx.notFound('Usuario no encontrado');
      }

      if (user.deletedAt) {
        return ctx.badRequest('El usuario ya está eliminado');
      }

      // Eliminar lógicamente (marcar deletedAt y bloquear)
      const deletedUser = await strapi.query('plugin::users-permissions.user').update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          blocked: true
        }
      });

      strapi.log.info(`Usuario ${id} eliminado lógicamente`);

      return ctx.send({
        success: true,
        data: { id },
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      strapi.log.error('Error eliminando usuario:', error);
      return ctx.internalServerError('Error eliminando usuario');
    }
  }
});
