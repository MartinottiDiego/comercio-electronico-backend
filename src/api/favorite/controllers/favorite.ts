import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::favorite.favorite', ({ strapi }) => ({
  /**
   * Obtener favoritos del usuario autenticado o por sessionId para anónimos
   */
  async find(ctx) {
    const { user } = ctx.state;
    const { sessionId } = ctx.query;

    // Si hay usuario autenticado, buscar por usuario
    if (user) {
      const entries = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { user: user.id },
        populate: {
          product: {
            populate: ['Media', 'thumbnail', 'categories', 'store', 'variants']
          }
        }
      });
      
      return { data: entries };
    }

    // Si no hay usuario pero hay sessionId, buscar por sesión
    if (sessionId) {
      const entries = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { sessionId, user: null },
        populate: {
          product: {
            populate: ['Media', 'thumbnail', 'categories', 'store', 'variants']
          }
        }
      });
      
      return { data: entries };
    }

    return { data: [] };
  },

  /**
   * Agregar producto a favoritos
   */
  async create(ctx) {
    const { user } = ctx.state;
    const { productId, sessionId } = ctx.request.body;

    // Validaciones
    if (!productId) {
      return ctx.badRequest('Product ID is required');
    }

    // Verificar que el producto existe
    const product = await strapi.entityService.findOne('api::product.product', productId as string);
    if (!product) {
      return ctx.notFound('Product not found');
    }

    const data: any = {
      product: product.id, // Usar el documentId del producto
    };

    // Si hay usuario autenticado
    if (user) {
      data.user = user.id;
      
      // Verificar si ya existe este producto en favoritos del usuario
      const existingEntry = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { 
          user: user.id,
          product: { id: { $eq: product.id } } // Usar el documentId del producto
        }
      });

      if (existingEntry.length > 0) {
        return ctx.conflict('Product already in favorites');
      }
    } else if (sessionId) {
      // Usuario anónimo
      data.sessionId = sessionId;
      
      // Verificar si ya existe este producto en favoritos anónimos
      const existingEntry = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { 
          sessionId,
          user: null,
          product: { id: { $eq: product.id } } // Usar el documentId del producto
        }
      });

      if (existingEntry.length > 0) {
        return ctx.conflict('Product already in favorites');
      }
    } else {
      return ctx.badRequest('User must be authenticated or provide sessionId');
    }

    // Crear nueva entrada
    const entry = await strapi.entityService.create('api::favorite.favorite', {
      data,
      populate: {
        product: {
          populate: ['Media', 'thumbnail', 'categories', 'store', 'variants']
        }
      }
    });

    return { data: entry };
  },

  /**
   * Eliminar producto de favoritos
   */
  async delete(ctx) {
    const { id } = ctx.params;
    const { user } = ctx.state;

    // Verificar ownership
    const favoriteItem = await strapi.entityService.findOne('api::favorite.favorite', id, {
      populate: ['user']
    });
    if (!favoriteItem) {
      return ctx.notFound('Favorite item not found');
    }

    // Solo el propietario puede eliminar
    if (user && (favoriteItem as any).user?.id !== user.id) {
      return ctx.forbidden('Cannot delete other user\'s favorite');
    }

    await strapi.entityService.delete('api::favorite.favorite', id);
    return { data: { id } };
  },

  /**
   * Eliminar por productId (más conveniente para el frontend)
   */
  async deleteByProduct(ctx) {
    const { user } = ctx.state;
    const { productId, sessionId } = ctx.request.body;

    if (!productId) {
      return ctx.badRequest('Product ID is required');
    }

    // Primero buscar el producto para obtener su documentId
    const product = await strapi.entityService.findOne('api::product.product', productId as string);
    if (!product) {
      return ctx.notFound('Product not found');
    }

    let filters: any = { product: { id: { $eq: product.id } } }; // Usar el documentId del producto

    if (user) {
      filters.user = user.id;
    } else if (sessionId) {
      filters.sessionId = sessionId;
      filters.user = null;
    } else {
      return ctx.badRequest('User must be authenticated or provide sessionId');
    }

    // Buscar el item a eliminar
    const favoriteItems = await strapi.entityService.findMany('api::favorite.favorite', {
      filters
    });

    if (favoriteItems.length === 0) {
      return ctx.notFound('Favorite item not found');
    }

    // Eliminar el primer item encontrado (debería ser único)
    await strapi.entityService.delete('api::favorite.favorite', favoriteItems[0].id);
    
    return { data: { productId, deleted: true } };
  },

  /**
   * Verificar si un producto está en favoritos
   */
  async check(ctx) {
    const { user } = ctx.state;
    const { productId, sessionId } = ctx.query;

    if (!productId) {
      return ctx.badRequest('Product ID is required');
    }

    // Primero buscar el producto para obtener su documentId
    const product = await strapi.entityService.findOne('api::product.product', productId as string);
    if (!product) {
      return { data: { isFavorite: false } };
    }

    let filters: any = { product: { id: { $eq: product.id } } }; // Usar el documentId del producto

    if (user) {
      filters.user = user.id;
    } else if (sessionId) {
      filters.sessionId = sessionId;
      filters.user = null;
    } else {
      return { data: { isFavorite: false } };
    }

    const favoriteItems = await strapi.entityService.findMany('api::favorite.favorite', {
      filters
    });

    return { data: { isFavorite: favoriteItems.length > 0 } };
  },

  /**
   * Migrar favoritos anónimos a usuario autenticado
   */
  async migrate(ctx) {
    const { user } = ctx.state;
    const { sessionId } = ctx.request.body;

    if (!user) {
      return ctx.unauthorized('User must be authenticated');
    }

    if (!sessionId) {
      return ctx.badRequest('SessionId is required');
    }

    // Obtener items de favoritos anónimos
    const anonItems = await strapi.entityService.findMany('api::favorite.favorite', {
      filters: { sessionId, user: null },
      populate: ['product']
    });

    let migratedCount = 0;

    for (const item of anonItems) {
      // Verificar si ya existe este producto en favoritos del usuario
      const existingUserItem = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { 
          user: user.id,
          product: (item as any).product?.id
        }
      });

      if (existingUserItem.length > 0) {
        // Ya existe, eliminar item anónimo
        await strapi.entityService.delete('api::favorite.favorite', item.id);
      } else {
        // Transferir ownership del item anónimo al usuario
        await strapi.entityService.update('api::favorite.favorite', item.id, {
          data: { user: user.id, sessionId: null }
        });
      }
      
      migratedCount++;
    }

    return { 
      data: { 
        message: `Migrated ${migratedCount} items from anonymous favorites to user favorites`,
        migratedCount 
      } 
    };
  },

  /**
   * Limpiar favoritos del usuario
   */
  async clear(ctx) {
    const { user } = ctx.state;
    const { sessionId } = ctx.request.body;

    let deletedCount = 0;

    if (user) {
      // Limpiar favoritos del usuario autenticado
      const userItems = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { user: user.id }
      });

      for (const item of userItems) {
        await strapi.entityService.delete('api::favorite.favorite', item.id);
        deletedCount++;
      }
    } else if (sessionId) {
      // Limpiar favoritos anónimos
      const anonItems = await strapi.entityService.findMany('api::favorite.favorite', {
        filters: { sessionId, user: null }
      });

      for (const item of anonItems) {
        await strapi.entityService.delete('api::favorite.favorite', item.id);
        deletedCount++;
      }
    }

    return { 
      data: { 
        message: `Cleared ${deletedCount} items from favorites`,
        clearedCount: deletedCount 
      } 
    };
  }
})); 