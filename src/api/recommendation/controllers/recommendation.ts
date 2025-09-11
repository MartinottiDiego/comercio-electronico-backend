
import { RecommendationRunner } from '../services/recommendation-runner.service';
import { recommendationConfig } from '../services/recommendation-config.service';

export default ({ strapi }: { strapi: any }) => ({
  async run(ctx) {
    try {
      const { scope = 'single', userIds, strategy, topK, recencyDays } = ctx.request.body;
      const user = ctx.state.user;

      if (!['single', 'all', 'segment'].includes(scope)) {
        return ctx.badRequest('Invalid scope. Must be: single, all, or segment');
      }

      if (scope === 'all' && user.role?.type !== 'admin') {
        return ctx.forbidden('Only admins can run recommendations for all users');
      }

      if (scope === 'segment' && (!userIds || !Array.isArray(userIds))) {
        return ctx.badRequest('userIds array is required for segment scope');
      }

      const runner = new RecommendationRunner(strapi);

      const context: any = {
        config: recommendationConfig.getConfig()
      };

      if (strategy) {
        context.config.strategy = strategy;
      }
      if (topK) {
        context.config.topK = topK;
      }
      if (recencyDays) {
        context.config.recencyDays = recencyDays;
      }

      let result;
      switch (scope) {
        case 'single':
          result = await runner.runForUser(user.id, context);
          break;
        case 'all':
          result = await runner.runForAllUsers(context);
          break;
        case 'segment':
          result = await runner.runForSegment(userIds, context);
          break;
      }
      ctx.body = {
        success: result.success,
        message: result.success ? 'Recommendations generated successfully' : 'Recommendation generation failed',
        data: {
          totalUsers: result.totalUsers,
          successfulUsers: result.successfulUsers,
          failedUsers: result.failedUsers,
          executionTime: result.executionTime,
          nodeResults: result.nodeResults,
          errors: result.errors
        },
        metadata: {
          scope,
          strategy: context.config.strategy,
          topK: context.config.topK,
          recencyDays: context.config.recencyDays,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      strapi.log.error('Recommendation run error:', error);
      ctx.internalServerError('Failed to run recommendation engine');
    }
  },

  async getMyRecommendations(ctx) {
    try {
      const { userId, strategy, limit = 12 } = ctx.query;

      if (!userId) {
        return ctx.badRequest('userId is required');
      }

      const filters: any = {
        user: {
          id: userId
        }
      };

      if (strategy) {
        filters.strategy = strategy;
      }

      const recommendations = await strapi.documents('api::recommendation.recommendation').findMany({
        filters,
        populate: {
          user: true
        },
        sort: { generatedAt: 'desc' },
        limit: 1
      });

      if (recommendations.length === 0) {
        // Si no hay recomendaciones, generar algunas básicas
        strapi.log.info('No recommendations found, generating basic ones for user:', userId);
        const basicRecommendations = await this.generateBasicRecommendations(userId);
        if (basicRecommendations) {
          strapi.log.info('Basic recommendations generated successfully:', basicRecommendations.id);
          return ctx.body = {
            success: true,
            data: {
              id: basicRecommendations.id,
              strategy: basicRecommendations.strategy,
              generatedAt: basicRecommendations.generatedAt,
              ttl: basicRecommendations.ttl,
              items: basicRecommendations.items,
              totalItems: basicRecommendations.items.length,
              context: basicRecommendations.context,
              metadata: basicRecommendations.metadata
            }
          };
        }
        strapi.log.error('Failed to generate basic recommendations for user:', userId);
        return ctx.notFound('No recommendations found for this user');
      }

      const recommendation = recommendations[0];
      const items = recommendation.items || [];
      const limitedItems = limit ? items.slice(0, parseInt(limit)) : items;

      ctx.body = {
        success: true,
        data: {
          id: recommendation.id,
          strategy: recommendation.strategy,
          generatedAt: recommendation.generatedAt,
          ttl: recommendation.ttl,
          items: limitedItems,
          totalItems: items.length,
          context: recommendation.context,
          metadata: recommendation.metadata
        }
      };

    } catch (error) {
      strapi.log.error('Get my recommendations error:', error);
      ctx.internalServerError('Failed to get recommendations');
    }
  },

  async find(ctx) {
    try {
      const user = ctx.state.user;
      const { userId, strategy, limit = 50, offset = 0 } = ctx.query;

      if (user.role?.type !== 'admin') {
        return ctx.forbidden('Only admins can access this endpoint');
      }

      const filters: any = {};
      if (userId) {
        filters.user = {
          id: userId
        };
      }
      if (strategy) {
        filters.strategy = strategy;
      }

      const recommendations = await strapi.documents('api::recommendation.recommendation').findMany({
        filters,
        populate: {
          user: {
            populate: {
              profile: true
            }
          }
        },
        sort: { generatedAt: 'desc' },
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const total = await strapi.documents('api::recommendation.recommendation').count({
        filters
      });

      ctx.body = {
        success: true,
        data: recommendations.map(rec => ({
          id: rec.id,
          userId: rec.user.id,
          userName: rec.user.profile?.firstName || rec.user.username,
          strategy: rec.strategy,
          generatedAt: rec.generatedAt,
          ttl: rec.ttl,
          itemCount: rec.items?.length || 0,
          context: rec.context,
          metadata: rec.metadata
        })),
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      };

    } catch (error) {
      strapi.log.error('Find recommendations error:', error);
      ctx.internalServerError('Failed to find recommendations');
    }
  },

  async feedback(ctx) {
    try {
      const user = ctx.state.user;
      const { recommendationId, productId, useful, reason } = ctx.request.body;

      if (!recommendationId || !productId || typeof useful !== 'boolean') {
        return ctx.badRequest('recommendationId, productId, and useful are required');
      }

      const recommendation = await strapi.documents('api::recommendation.recommendation').findOne({
        documentId: recommendationId,
        populate: {
          user: true
        }
      });

      if (!recommendation) {
        return ctx.notFound('Recommendation not found');
      }

      if (recommendation.user.id !== user.id) {
        return ctx.forbidden('This recommendation does not belong to you');
      }

      const feedbackData = {
        recommendation: recommendationId,
        product: productId,
        useful,
        reason,
        user: user.id,
        submittedAt: new Date().toISOString()
      };

      const updatedMetadata = {
        ...recommendation.metadata,
        feedback: {
          ...recommendation.metadata?.feedback,
          [productId]: {
            useful,
            reason,
            submittedAt: feedbackData.submittedAt
          }
        }
      };

      await strapi.documents('api::recommendation.recommendation').update({
        documentId: recommendationId,
        data: {
          metadata: updatedMetadata
        }
      });

      ctx.body = {
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          recommendationId,
          productId,
          useful,
          reason
        }
      };

    } catch (error) {
      strapi.log.error('Recommendation feedback error:', error);
      ctx.internalServerError('Failed to submit feedback');
    }
  },

  async track(ctx) {
    try {
      const user = ctx.state.user;
      const { userId, productId, action, context, sessionId, metadata } = ctx.request.body;

      strapi.log.info('Track request:', { userId, userFromToken: user?.id, action, context });

      if (!userId || !action || !context) {
        return ctx.badRequest('userId, action, and context are required');
      }

      if (!user) {
        return ctx.unauthorized('User not authenticated');
      }

      // Convert both to string for comparison
      if (String(userId) !== String(user.id)) {
        return ctx.forbidden('You can only track your own behavior');
      }

      const behaviorData = {
        user: user.id,
        product: productId,
        action,
        context,
        sessionId,
        metadata: {
          ...metadata,
          trackedAt: new Date().toISOString()
        }
      };

      try {
        if (action === 'view' && productId) {
          await strapi.documents('api::activity-product-view.activity-product-view').create({
            data: {
              user: user.id,
              product: productId,
              timestamp: new Date().toISOString(),
              sessionId,
              context,
              metadata: behaviorData.metadata
            }
          });
        }

        await strapi.documents('api::user-behavior.user-behavior').create({
          data: {
            userId: String(user.id),
            product: productId,
            action,
            context,
            sessionId,
            timestamp: new Date().toISOString(),
            metadata: behaviorData.metadata
          }
        });
      } catch (dbError) {
        strapi.log.error('Database error in track:', dbError);
        // Continue even if database operations fail
      }

      ctx.body = {
        success: true,
        message: 'Behavior tracked successfully',
        data: {
          userId,
          productId,
          action,
          context,
          sessionId
        }
      };

    } catch (error) {
      strapi.log.error('Track behavior error:', error);
      ctx.internalServerError('Failed to track behavior');
    }
  },

  async generateBasic(ctx) {
    try {
      const { userId } = ctx.request.body;

      if (!userId) {
        return ctx.badRequest('userId is required');
      }

      const basicRecommendations = await this.generateBasicRecommendations(userId);
      
      ctx.body = {
        success: true,
        message: 'Basic recommendations generated successfully',
        data: basicRecommendations
      };

    } catch (error) {
      strapi.log.error('Generate basic recommendations error:', error);
      ctx.internalServerError('Failed to generate basic recommendations');
    }
  },

  async generateBasicRecommendations(userId) {
    try {
      // Obtener productos populares (con más stock y rating alto)
      const products = await strapi.documents('api::product.product').findMany({
        filters: {
          stock: { $gt: 0 },
          rating: { $gte: 3 }
        },
        populate: {
          categories: true,
          Media: true,
          thumbnail: true
        },
        sort: { rating: 'desc' },
        limit: 12
      });

      if (products.length === 0) {
        return null;
      }


      // Crear recomendaciones básicas
      const recommendations = products.map((product, index) => {
        const imageUrl = product.thumbnail?.url || product.Media?.url || null;
        
        const recommendation = {
          product: {
            id: product.id,
            title: product.title,
            price: product.price,
            rating: product.rating,
            slug: product.slug || `producto-${product.id}`,
            description: product.description || '',
            image: imageUrl, // Campo singular para compatibilidad
            images: imageUrl ? [{
              id: product.thumbnail?.id || product.Media?.id || 1,
              url: imageUrl,
              alternativeText: product.thumbnail?.alternativeText || product.Media?.alternativeText || product.title || 'Producto'
            }] : [],
            category: product.categories && product.categories.length > 0 ? {
              id: product.categories[0].id,
              name: product.categories[0].name
            } : null,
            store: product.store ? {
              id: product.store.id,
              name: product.store.name
            } : null
          },
          score: 0.8 - (index * 0.05), // Score decreciente
          rationale: `Producto popular con rating ${product.rating}/5`,
          algorithm: 'basic_popularity'
        };
        
        return recommendation;
      });

      // Guardar en la base de datos
      const recommendationData = {
        user: userId,
        items: recommendations,
        strategy: 'content', // Usar 'content' en lugar de 'basic'
        context: { source: 'popular_products' },
        generatedAt: new Date().toISOString(),
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 días
        metadata: {
          totalProducts: products.length,
          generatedAt: new Date().toISOString()
        }
      };

      const created = await strapi.documents('api::recommendation.recommendation').create({
        data: recommendationData
      });

      return {
        id: created.id,
        strategy: 'content',
        generatedAt: recommendationData.generatedAt,
        ttl: recommendationData.ttl,
        items: recommendations,
        context: recommendationData.context,
        metadata: recommendationData.metadata
      };

    } catch (error) {
      strapi.log.error('Error generating basic recommendations:', error);
      return null;
    }
  },

  async getPublicRecommendations(ctx) {
    try {
      const { context = 'home', limit = 10 } = ctx.query;

      // Obtener productos populares basados en rating y stock
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          stock: { $gt: 0 },
          rating: { $gte: 3 },
          publishedAt: { $notNull: true }
        },
        populate: ['Media', 'thumbnail', 'categories', 'store'],
        sort: [
          { rating: 'desc' },
          { reviewCount: 'desc' },
          { createdAt: 'desc' }
        ],
        limit: parseInt(limit)
      });

      // Si no hay suficientes productos con rating alto, obtener los más recientes
      if (products.length < parseInt(limit)) {
        const additionalProducts = await strapi.entityService.findMany('api::product.product', {
          filters: {
            stock: { $gt: 0 },
            publishedAt: { $notNull: true },
            id: { $notIn: products.map((p: any) => p.id) }
          },
          populate: ['Media', 'thumbnail', 'categories', 'store'],
          sort: { createdAt: 'desc' },
          limit: parseInt(limit) - products.length
        });
        products.push(...additionalProducts);
      }

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
          } : null,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0
        };
      });

      ctx.body = {
        data: transformedProducts,
        message: {
          title: "Productos destacados",
          subtitle: "Los más populares y mejor valorados"
        },
        context: context,
        count: transformedProducts.length,
        algorithm: 'popularity'
      };
    } catch (error) {
      strapi.log.error('Error in getPublicRecommendations:', error);
      ctx.internalServerError('Error getting public recommendations');
    }
  }
});
