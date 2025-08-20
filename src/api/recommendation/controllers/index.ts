export default ({ strapi }: { strapi: any }) => {
  return {
    async getRecommendations(ctx: any) {
      try {
        const { userId, context, limit = 10 } = ctx.query;

        if (!userId || !context) {
          return ctx.badRequest('userId and context are required');
        }

        // Por ahora, retornamos productos básicos para probar
        const products = await strapi.entityService.findMany('api::product.product', {
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit)
        });

        // Transformar los productos para que sean compatibles con el frontend
        const transformedProducts = products.map(product => {
          // Manejar imágenes correctamente
          let images = [];
          if (product.Media && product.Media.url) {
            images.push({
              id: product.Media.id || 1,
              url: product.Media.url,
              alternativeText: product.Media.alternativeText || product.title || 'Producto'
            });
          } else if (product.thumbnail && product.thumbnail.url) {
            images.push({
              id: product.thumbnail.id || 1,
              url: product.thumbnail.url,
              alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
            });
          }

          return {
            id: product.id,
            title: product.title || product.name || `Producto ${product.id}`,
            description: product.description || '',
            price: product.price || 0,
            slug: product.slug || `producto-${product.id}`,
            images: images,
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          };
        });

        return {
          data: transformedProducts,
          message: {
            title: "Productos recomendados",
            subtitle: "Basado en tu actividad"
          },
          context,
          count: transformedProducts.length
        };
      } catch (error) {
        console.error('Error in getRecommendations:', error);
        return ctx.internalServerError('Error getting recommendations');
      }
    },

    async trackBehavior(ctx: any) {
      try {
        const { userId, productId, action, context, sessionId, metadata } = ctx.request.body;



        if (!userId || !action || !context) {
          return ctx.badRequest('userId, action, and context are required');
        }

        // Convertir userId a string si es necesario y sanitizarlo
        let userIdString = String(userId).trim();
        
        // Si el userId es muy largo (como un JWT o token), usar solo los primeros caracteres
        if (userIdString.length > 255) {
          userIdString = userIdString.substring(0, 255);
        }
        
        // Preparar datos para crear el comportamiento
        const behaviorData: any = {
          userId: userIdString,
          action,
          context,
          sessionId: sessionId || null,
          timestamp: new Date(),
          metadata: metadata || {}
        };

        // Solo agregar product si productId está presente y es válido
        if (productId && !isNaN(parseInt(productId))) {
          behaviorData.product = parseInt(productId);
        }

        // Verificar si el content type existe
        const contentType = strapi.getModel('api::user-behavior.user-behavior');
        if (!contentType) {
          return ctx.internalServerError('Content type not found');
        }

        // Por ahora, solo registramos el comportamiento básico
        const result = await strapi.entityService.create('api::user-behavior.user-behavior', {
          data: behaviorData
        });



        return { success: true, message: 'Behavior tracked successfully' };
      } catch (error) {
        console.error('Error in trackBehavior:', error);
        return ctx.internalServerError('Error tracking behavior');
      }
    },

    async getCartRecommendations(ctx: any) {
      try {
        const { userId, limit = 6 } = ctx.query;

        if (!userId) {
          return ctx.badRequest('userId is required');
        }

        const products = await strapi.entityService.findMany('api::product.product', {
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit)
        });

        // Transformar los productos para que sean compatibles con el frontend
        const transformedProducts = products.map(product => {
          // Manejar imágenes correctamente
          let images = [];
          if (product.Media && product.Media.url) {
            images.push({
              id: product.Media.id || 1,
              url: product.Media.url,
              alternativeText: product.Media.alternativeText || product.title || 'Producto'
            });
          } else if (product.thumbnail && product.thumbnail.url) {
            images.push({
              id: product.thumbnail.id || 1,
              url: product.thumbnail.url,
              alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
            });
          }

          return {
            id: product.id,
            title: product.title || product.name || `Producto ${product.id}`,
            description: product.description || '',
            price: product.price || 0,
            slug: product.slug || `producto-${product.id}`,
            images: images,
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          };
        });

        return {
          data: transformedProducts,
          message: {
            title: "Productos similares",
            subtitle: "Basado en tu carrito actual"
          },
          context: 'cart',
          count: transformedProducts.length
        };
      } catch (error) {
        console.error('Error in getCartRecommendations:', error);
        return ctx.internalServerError('Error getting cart recommendations');
      }
    },

    async getProductRecommendations(ctx: any) {
      try {
        const { userId, productId, limit = 6 } = ctx.query;

        if (!userId || !productId) {
          return ctx.badRequest('userId and productId are required');
        }

        const products = await strapi.entityService.findMany('api::product.product', {
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit)
        });

        // Transformar los productos para que sean compatibles con el frontend
        const transformedProducts = products.map(product => {
          // Manejar imágenes correctamente
          let images = [];
          if (product.Media && product.Media.url) {
            images.push({
              id: product.Media.id || 1,
              url: product.Media.url,
              alternativeText: product.Media.alternativeText || product.title || 'Producto'
            });
          } else if (product.thumbnail && product.thumbnail.url) {
            images.push({
              id: product.thumbnail.id || 1,
              url: product.thumbnail.url,
              alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
            });
          }

          return {
            id: product.id,
            title: product.title || product.name || `Producto ${product.id}`,
            description: product.description || '',
            price: product.price || 0,
            slug: product.slug || `producto-${product.id}`,
            images: images,
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          };
        });

        return {
          data: transformedProducts,
          message: {
            title: "Otros usuarios también vieron",
            subtitle: "Productos relacionados"
          },
          context: 'product_detail',
          count: transformedProducts.length
        };
      } catch (error) {
        console.error('Error in getProductRecommendations:', error);
        return ctx.internalServerError('Error getting product recommendations');
      }
    },

    async getCategoryRecommendations(ctx: any) {
      try {
        const { userId, categoryId, limit = 12 } = ctx.query;

        if (!userId) {
          return ctx.badRequest('userId is required');
        }

        const filters: any = {};
        if (categoryId) {
          filters.category = parseInt(categoryId);
        }

        const products = await strapi.entityService.findMany('api::product.product', {
          filters,
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit)
        });

        // Transformar los productos para que sean compatibles con el frontend
        const transformedProducts = products.map(product => {
          // Manejar imágenes correctamente
          let images = [];
          if (product.Media && product.Media.url) {
            images.push({
              id: product.Media.id || 1,
              url: product.Media.url,
              alternativeText: product.Media.alternativeText || product.title || 'Producto'
            });
          } else if (product.thumbnail && product.thumbnail.url) {
            images.push({
              id: product.thumbnail.id || 1,
              url: product.thumbnail.url,
              alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
            });
          }

          return {
            id: product.id,
            title: product.title || product.name || `Producto ${product.id}`,
            description: product.description || '',
            price: product.price || 0,
            slug: product.slug || `producto-${product.id}`,
            images: images,
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          };
        });

        return {
          data: transformedProducts,
          message: {
            title: "Más productos de esta categoría",
            subtitle: "Explora nuestra selección"
          },
          context: 'category',
          count: transformedProducts.length
        };
      } catch (error) {
        console.error('Error in getCategoryRecommendations:', error);
        return ctx.internalServerError('Error getting category recommendations');
      }
    },

    async getHomeRecommendations(ctx: any) {
      try {
        const { userId, limit = 12 } = ctx.query;

        if (!userId) {
          return ctx.badRequest('userId is required');
        }

        const products = await strapi.entityService.findMany('api::product.product', {
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit)
        });

        // Transformar los productos para que sean compatibles con el frontend
        const transformedProducts = products.map(product => {
          // Manejar imágenes correctamente
          let images = [];
          if (product.Media && product.Media.url) {
            images.push({
              id: product.Media.id || 1,
              url: product.Media.url,
              alternativeText: product.Media.alternativeText || product.title || 'Producto'
            });
          } else if (product.thumbnail && product.thumbnail.url) {
            images.push({
              id: product.thumbnail.id || 1,
              url: product.thumbnail.url,
              alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
            });
          }

          return {
            id: product.id,
            title: product.title || product.name || `Producto ${product.id}`,
            description: product.description || '',
            price: product.price || 0,
            slug: product.slug || `producto-${product.id}`,
            images: images,
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          };
        });

        return {
          data: transformedProducts,
          message: {
            title: "Recomendados para ti",
            subtitle: "Basado en tus preferencias"
          },
          context: 'home',
          count: transformedProducts.length
        };
      } catch (error) {
        console.error('Error in getHomeRecommendations:', error);
        return ctx.internalServerError('Error getting home recommendations');
      }
    },

    async getCheckoutRecommendations(ctx: any) {
      try {
        const { userId, limit = 4 } = ctx.query;

        if (!userId) {
          return ctx.badRequest('userId is required');
        }

        const products = await strapi.entityService.findMany('api::product.product', {
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit)
        });

        // Transformar los productos para que sean compatibles con el frontend
        const transformedProducts = products.map(product => {
          // Manejar imágenes correctamente
          let images = [];
          if (product.Media && product.Media.url) {
            images.push({
              id: product.Media.id || 1,
              url: product.Media.url,
              alternativeText: product.Media.alternativeText || product.title || 'Producto'
            });
          } else if (product.thumbnail && product.thumbnail.url) {
            images.push({
              id: product.thumbnail.id || 1,
              url: product.thumbnail.url,
              alternativeText: product.thumbnail.alternativeText || product.title || 'Producto'
            });
          }

          return {
            id: product.id,
            title: product.title || product.name || `Producto ${product.id}`,
            description: product.description || '',
            price: product.price || 0,
            slug: product.slug || `producto-${product.id}`,
            images: images,
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          };
        });

        return {
          data: transformedProducts,
          message: {
            title: "Completar tu compra",
            subtitle: "Productos que podrían interesarte"
          },
          context: 'checkout',
          count: transformedProducts.length
        };
      } catch (error) {
        console.error('Error in getCheckoutRecommendations:', error);
        return ctx.internalServerError('Error getting checkout recommendations');
      }
    },

    async clearCache(ctx: any) {
      try {
        const { userId, context } = ctx.query;

        if (!userId || !context) {
          return ctx.badRequest('userId and context are required');
        }

        await strapi.db.query('api::recommendation.recommendation').deleteMany({
          where: { userId, context }
        });

        return { success: true, message: 'Cache cleared successfully' };
      } catch (error) {
        console.error('Error in clearCache:', error);
        return ctx.internalServerError('Error clearing cache');
      }
    }
  };
}; 