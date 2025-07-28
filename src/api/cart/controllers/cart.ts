import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  /**
   * Obtener carrito del usuario autenticado o por sessionId para anónimos
   */
  async find(ctx) {
    const { user } = ctx.state;
    const { sessionId } = ctx.query;

    // Si hay usuario autenticado, buscar por usuario
    if (user) {
      const entries = await strapi.entityService.findMany('api::cart.cart', {
        filters: { user: user.id },
        populate: {
          product: {
            populate: ['Media', 'thumbnail', 'categories', 'store']
          },
          variant: true
        }
      });
      
      return { data: entries };
    }

    // Si no hay usuario pero hay sessionId, buscar por sesión
    if (sessionId) {
      const entries = await strapi.entityService.findMany('api::cart.cart', {
        filters: { sessionId, user: null },
        populate: {
          product: {
            populate: ['Media', 'thumbnail', 'categories', 'store']
          },
          variant: true
        }
      });
      
      return { data: entries };
    }

    return { data: [] };
  },

  /**
   * Agregar producto al carrito
   */
  async create(ctx) {
    const { user } = ctx.state;
    const { productId, quantity = 1, variantId, sessionId } = ctx.request.body;

    // Validaciones
    if (!productId) {
      return ctx.badRequest('Product ID is required');
    }

    // Obtener el producto para guardar el precio actual
    const product = await strapi.entityService.findOne('api::product.product', productId);
    if (!product) {
      return ctx.notFound('Product not found');
    }

    const data: any = {
      product: productId,
      quantity,
      priceAtTime: product.price,
    };

    // Si hay usuario autenticado
    if (user) {
      data.user = user.id;
      
      // Verificar si ya existe este producto en el carrito del usuario
      const existingEntry = await strapi.entityService.findMany('api::cart.cart', {
        filters: { 
          user: user.id,
          product: productId,
          ...(variantId && { variant: variantId })
        }
      });

      if (existingEntry.length > 0) {
        // Actualizar cantidad existente
        const updated = await strapi.entityService.update('api::cart.cart', existingEntry[0].id, {
          data: { quantity: existingEntry[0].quantity + quantity }
        });
        return { data: updated };
      }
    } else if (sessionId) {
      // Usuario anónimo
      data.sessionId = sessionId;
      
      // Verificar si ya existe este producto en el carrito anónimo
      const existingEntry = await strapi.entityService.findMany('api::cart.cart', {
        filters: { 
          sessionId,
          user: null,
          product: productId,
          ...(variantId && { variant: variantId })
        }
      });

      if (existingEntry.length > 0) {
        // Actualizar cantidad existente
        const updated = await strapi.entityService.update('api::cart.cart', existingEntry[0].id, {
          data: { quantity: existingEntry[0].quantity + quantity }
        });
        return { data: updated };
      }
    } else {
      return ctx.badRequest('User must be authenticated or provide sessionId');
    }

    if (variantId) {
      data.variant = variantId;
    }

    // Crear nueva entrada
    const entry = await strapi.entityService.create('api::cart.cart', {
      data,
      populate: {
        product: {
          populate: ['Media', 'thumbnail', 'categories', 'store']
        },
        variant: true
      }
    });

    return { data: entry };
  },

  /**
   * Actualizar cantidad de producto en carrito
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { user } = ctx.state;
    const { quantity } = ctx.request.body;

    if (!quantity || quantity < 1) {
      return ctx.badRequest('Valid quantity is required');
    }

    // Verificar ownership
    const cartItem = await strapi.entityService.findOne('api::cart.cart', id, {
      populate: ['user']
    });
    if (!cartItem) {
      return ctx.notFound('Cart item not found');
    }

    // Solo el propietario puede actualizar
    if (user && (cartItem as any).user?.id !== user.id) {
      return ctx.forbidden('Cannot update other user\'s cart');
    }

    const updated = await strapi.entityService.update('api::cart.cart', id, {
      data: { quantity },
      populate: {
        product: {
          populate: ['Media', 'thumbnail', 'categories', 'store']
        },
        variant: true
      }
    });

    return { data: updated };
  },

  /**
   * Eliminar producto del carrito
   */
  async delete(ctx) {
    const { id } = ctx.params;
    const { user } = ctx.state;

    // Verificar ownership
    const cartItem = await strapi.entityService.findOne('api::cart.cart', id, {
      populate: ['user']
    });
    if (!cartItem) {
      return ctx.notFound('Cart item not found');
    }

    // Solo el propietario puede eliminar
    if (user && (cartItem as any).user?.id !== user.id) {
      return ctx.forbidden('Cannot delete other user\'s cart item');
    }

    await strapi.entityService.delete('api::cart.cart', id);
    return { data: { id } };
  },

  /**
   * Migrar carrito anónimo a usuario autenticado
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

    // Obtener items del carrito anónimo
    const anonItems = await strapi.entityService.findMany('api::cart.cart', {
      filters: { sessionId, user: null },
      populate: ['product', 'variant']
    });

    let migratedCount = 0;

    for (const item of anonItems) {
      // Verificar si ya existe este producto en el carrito del usuario
      const existingUserItem = await strapi.entityService.findMany('api::cart.cart', {
        filters: { 
          user: user.id,
          product: (item as any).product?.id,
          ...((item as any).variant && { variant: (item as any).variant.id })
        }
      });

      if (existingUserItem.length > 0) {
        // Sumar las cantidades
        await strapi.entityService.update('api::cart.cart', existingUserItem[0].id, {
          data: { quantity: existingUserItem[0].quantity + item.quantity }
        });
        
        // Eliminar item anónimo
        await strapi.entityService.delete('api::cart.cart', item.id);
      } else {
        // Transferir ownership del item anónimo al usuario
        await strapi.entityService.update('api::cart.cart', item.id, {
          data: { user: user.id, sessionId: null }
        });
      }
      
      migratedCount++;
    }

    return { 
      data: { 
        message: `Migrated ${migratedCount} items from anonymous cart to user cart`,
        migratedCount 
      } 
    };
  },

  /**
   * Limpiar carrito del usuario (después de compra)
   */
  async clear(ctx) {
    const { user } = ctx.state;
    const { sessionId } = ctx.request.body;

    let deletedCount = 0;

    if (user) {
      // Limpiar carrito del usuario autenticado
      const userItems = await strapi.entityService.findMany('api::cart.cart', {
        filters: { user: user.id }
      });

      for (const item of userItems) {
        await strapi.entityService.delete('api::cart.cart', item.id);
        deletedCount++;
      }
    } else if (sessionId) {
      // Limpiar carrito anónimo
      const anonItems = await strapi.entityService.findMany('api::cart.cart', {
        filters: { sessionId, user: null }
      });

      for (const item of anonItems) {
        await strapi.entityService.delete('api::cart.cart', item.id);
        deletedCount++;
      }
    }

    return { 
      data: { 
        message: `Cleared ${deletedCount} items from cart`,
        clearedCount: deletedCount 
      } 
    };
  }
})); 