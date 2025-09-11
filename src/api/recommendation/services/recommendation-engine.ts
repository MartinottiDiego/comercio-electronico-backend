// import { Strapi } from '@strapi/strapi';

export default class RecommendationEngine {
  private strapi: any;
  private userBehaviorService: any;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.userBehaviorService = new (require('../../user-behavior/services/user-behavior').default)(strapi);
  }

  async getRecommendations(userId: string, context: string, limit = 10) {
    try {
      // Check cache first
      const cached = await this.getCachedRecommendation(userId, context);
      if (cached) {
        return cached;
      }

      let recommendations = [];
      let algorithm = 'popularity';

      switch (context) {
        case 'cart':
          recommendations = await this.getCartRecommendations(userId, limit);
          algorithm = 'collaborative';
          break;
        case 'product_detail':
          recommendations = await this.getProductDetailRecommendations(userId, limit);
          algorithm = 'content_based';
          break;
        case 'category':
          recommendations = await this.getCategoryRecommendations(userId, limit);
          algorithm = 'content_based';
          break;
        case 'home':
          recommendations = await this.getHomeRecommendations(userId, limit);
          algorithm = 'hybrid';
          break;
        case 'search':
          recommendations = await this.getSearchRecommendations(userId, limit);
          algorithm = 'content_based';
          break;
        case 'checkout':
          recommendations = await this.getCheckoutRecommendations(userId, limit);
          algorithm = 'collaborative';
          break;
        default:
          recommendations = await this.getFallbackRecommendations(limit);
          algorithm = 'popularity';
      }

      // Cache the recommendations
      await this.cacheRecommendation(userId, context, recommendations, algorithm);

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getCartRecommendations(userId: string, limit = 6) {
    try {
      const cartItems = await this.getUserCartItems(userId);
      if (cartItems.length === 0) {
        return await this.getFallbackRecommendations(limit);
      }

      const recommendations = [];
      for (const item of cartItems) {
        const similar = await this.getSimilarProducts(item.productId, limit / 2);
        recommendations.push(...similar);
      }

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting cart recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getProductDetailRecommendations(userId: string, limit = 6, productId?: number) {
    try {
      if (!productId) {
        return await this.getFallbackRecommendations(limit);
      }

      const recommendations = [];
      
      // Get similar products
      const similar = await this.getSimilarProducts(productId, limit / 2);
      recommendations.push(...similar);

      // Get "frequently bought together"
      const boughtTogether = await this.userBehaviorService.getFrequentlyBoughtTogether(productId, limit / 2);
      if (boughtTogether.length > 0) {
        const products = await this.strapi.entityService.findMany('api::product.product', {
          filters: { id: { $in: boughtTogether } },
          populate: ['images', 'category', 'store']
        });
        recommendations.push(...products);
      }

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting product detail recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getCategoryRecommendations(userId: string, limit = 12, categoryId?: number) {
    try {
      const filters: any = {};
      if (categoryId) {
        filters.category = categoryId;
      }

      const products = await this.strapi.entityService.findMany('api::product.product', {
        filters,
        populate: ['images', 'category', 'store'],
        sort: { createdAt: 'desc' },
        limit
      });

      return products;
    } catch (error) {
      console.error('Error getting category recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getHomeRecommendations(userId: string, limit = 12) {
    try {
      const recommendations = [];

      // Get personalized recommendations
      const personalized = await this.getPersonalizedProducts(userId, limit / 2);
      recommendations.push(...personalized);

      // Get popular products
      const popular = await this.getPopularRecommendations(limit / 2);
      recommendations.push(...popular);

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting home recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getSearchRecommendations(userId: string, limit = 8) {
    try {
      const recentSearches = await this.getRecentSearches(userId);
      if (recentSearches.length === 0) {
        return await this.getFallbackRecommendations(limit);
      }

      const recommendations = [];
      for (const search of recentSearches) {
        const products = await this.getSearchBasedProducts(search, limit / 2);
        recommendations.push(...products);
      }

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting search recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getCheckoutRecommendations(userId: string, limit = 4) {
    try {
      const recommendations = [];

      // Get "frequently bought together" for items in cart
      const cartItems = await this.getUserCartItems(userId);
      for (const item of cartItems) {
        const boughtTogether = await this.userBehaviorService.getFrequentlyBoughtTogether(item.productId, 2);
        if (boughtTogether.length > 0) {
          const products = await this.strapi.entityService.findMany('api::product.product', {
            filters: { id: { $in: boughtTogether } },
            populate: ['images', 'category', 'store']
          });
          recommendations.push(...products);
        }
      }

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting checkout recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getSimilarProducts(productId: number, limit = 6) {
    try {
      const product = await this.strapi.entityService.findOne('api::product.product', productId, {
        populate: ['category', 'store']
      });

      if (!product) return [];

      const filters: any = {};
      if (product.category) {
        filters.category = product.category.id;
      }
      filters.id = { $ne: productId };

      const similar = await this.strapi.entityService.findMany('api::product.product', {
        filters,
        populate: ['images', 'category', 'store'],
        sort: { createdAt: 'desc' },
        limit
      });

      return similar;
    } catch (error) {
      console.error('Error getting similar products:', error);
      return [];
    }
  }

  async getOtherUsersViewed(productId: number, limit = 6) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          action: 'view',
          product: productId
        },
        orderBy: { timestamp: 'desc' },
        limit: 50
      });

      const userIds = [...new Set(behaviors.map(b => b.userId))];
      if (userIds.length === 0) return [];

      const otherViews = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          action: 'view',
          userId: { $in: userIds },
          product: { $ne: productId }
        },
        orderBy: { timestamp: 'desc' },
        limit: 100,
        populate: ['product']
      });

      // Count product views
      const productCounts = new Map();
      otherViews.forEach(behavior => {
        if (behavior.product) {
          const productId = behavior.product.id;
          productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
        }
      });

      // Get top viewed products
      const topProductIds = Array.from(productCounts.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, limit)
        .map(([productId]) => parseInt(productId as string));

      if (topProductIds.length === 0) return [];

      return await this.strapi.entityService.findMany('api::product.product', {
        filters: { id: { $in: topProductIds } },
        populate: ['images', 'category', 'store']
      });
    } catch (error) {
      console.error('Error getting other users viewed:', error);
      return [];
    }
  }

  async getPopularRecommendations(limit = 10) {
    try {
      const popularProductIds = await this.userBehaviorService.getPopularProducts(limit);
      if (popularProductIds.length === 0) {
        return await this.getFallbackRecommendations(limit);
      }

      return await this.strapi.entityService.findMany('api::product.product', {
        filters: { id: { $in: popularProductIds } },
        populate: ['images', 'category', 'store']
      });
    } catch (error) {
      console.error('Error getting popular recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  async getUserPreferences(userId: string) {
    try {
      const behaviors = await this.userBehaviorService.getUserBehavior(userId, 100);
      const preferences = {
        categories: await this.userBehaviorService.getUserPreferredCategories(userId),
        viewedProducts: await this.userBehaviorService.getUserViewedProducts(userId),
        totalInteractions: behaviors.length
      };
      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { categories: [], viewedProducts: [], totalInteractions: 0 };
    }
  }

  async getPersonalizedProducts(userId: string, limit = 6) {
    try {
      const preferences = await this.getUserPreferences(userId);
      const recommendations = [];

      // Get products from preferred categories
      if (preferences.categories.length > 0) {
        const categoryProducts = await this.strapi.entityService.findMany('api::product.product', {
          filters: { category: { $in: preferences.categories } },
          populate: ['images', 'category', 'store'],
          sort: { createdAt: 'desc' },
          limit: limit / 2
        });
        recommendations.push(...categoryProducts);
      }

      // Get similar products to previously viewed
      if (preferences.viewedProducts.length > 0) {
        const similarProducts = await this.getSimilarProducts(preferences.viewedProducts[0], limit / 2);
        recommendations.push(...similarProducts);
      }

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting personalized products:', error);
      return [];
    }
  }

  async getUserCartItems(userId: string) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          userId,
          action: 'add_to_cart'
        },
        orderBy: { timestamp: 'desc' },
        limit: 10,
        populate: ['product']
      });

      return behaviors.map(b => ({
        productId: b.product?.id,
        quantity: 1
      })).filter(item => item.productId);
    } catch (error) {
      console.error('Error getting user cart items:', error);
      return [];
    }
  }

  async getRecentSearches(userId: string, limit = 5) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          userId,
          action: 'search'
        },
        orderBy: { timestamp: 'desc' },
        limit
      });

      return behaviors.map(b => b.context).filter(Boolean);
    } catch (error) {
      console.error('Error getting recent searches:', error);
      return [];
    }
  }

  async getSearchBasedProducts(searchTerm: string, limit = 6) {
    try {
      const products = await this.strapi.entityService.findMany('api::product.product', {
        filters: {
          $or: [
            { title: { $containsi: searchTerm } },
            { description: { $containsi: searchTerm } }
          ]
        },
        populate: ['images', 'category', 'store'],
        sort: { createdAt: 'desc' },
        limit
      });

      return products;
    } catch (error) {
      console.error('Error getting search based products:', error);
      return [];
    }
  }

  async getCheckoutProducts(userId: string, limit = 4) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          userId,
          action: 'purchase'
        },
        orderBy: { timestamp: 'desc' },
        limit: 20,
        populate: ['product']
      });

      const purchasedProductIds = behaviors.map(b => b.product?.id).filter(Boolean);
      if (purchasedProductIds.length === 0) return [];

      const recommendations = [];
      for (const productId of purchasedProductIds.slice(0, 3)) {
        const boughtTogether = await this.userBehaviorService.getFrequentlyBoughtTogether(productId, 2);
        if (boughtTogether.length > 0) {
          const products = await this.strapi.entityService.findMany('api::product.product', {
            filters: { id: { $in: boughtTogether } },
            populate: ['images', 'category', 'store']
          });
          recommendations.push(...products);
        }
      }

      // Remove duplicates and limit
      const uniqueRecommendations = Array.from(new Set(recommendations.map(r => r.id)))
        .map(id => recommendations.find(r => r.id === id))
        .slice(0, limit);

      return uniqueRecommendations;
    } catch (error) {
      console.error('Error getting checkout products:', error);
      return [];
    }
  }

  async getCachedRecommendation(userId: string, context: string) {
    try {
      const cached = await this.strapi.db.query('api::recommendation.recommendation').findOne({
        where: { 
          userId,
          context,
          expiresAt: { $gt: new Date() }
        }
      });

      if (cached && cached.recommendedProducts) {
        const productIds = cached.recommendedProducts.map((p: any) => p.id);
        return await this.strapi.entityService.findMany('api::product.product', {
          filters: { id: { $in: productIds } },
          populate: ['images', 'category', 'store']
        });
      }

      return null;
    } catch (error) {
      console.error('Error getting cached recommendation:', error);
      return null;
    }
  }

  async cacheRecommendation(userId: string, context: string, products: any[], algorithm: string) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

      await this.strapi.entityService.create('api::recommendation.recommendation', {
        data: {
          userId,
          context,
          recommendedProducts: products,
          algorithm,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Error caching recommendation:', error);
    }
  }

  getContextMessage(context: string, productId?: number) {
    const messages = {
      cart: {
        title: "Productos similares",
        subtitle: "Basado en tu carrito actual"
      },
      product_detail: {
        title: "Otros usuarios también vieron",
        subtitle: "Productos relacionados"
      },
      category: {
        title: "Más productos de esta categoría",
        subtitle: "Explora nuestra selección"
      },
      home: {
        title: "Recomendados para ti",
        subtitle: "Basado en tus preferencias"
      },
      search: {
        title: "Resultados relacionados",
        subtitle: "Basado en tu búsqueda"
      },
      checkout: {
        title: "Completar tu compra",
        subtitle: "Productos que podrían interesarte"
      }
    };

    return messages[context as keyof typeof messages] || {
      title: "Productos recomendados",
      subtitle: "Basado en tu actividad"
    };
  }

  async getFallbackRecommendations(limit = 10) {
    try {
      return await this.strapi.entityService.findMany('api::product.product', {
        populate: ['images', 'category', 'store'],
        sort: { createdAt: 'desc' },
        limit
      });
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  async trackUserBehavior(data: {
    userId: string;
    productId?: number;
    action: string;
    context: string;
    sessionId?: string;
    metadata?: any;
  }) {
    try {
      await this.userBehaviorService.trackBehavior(data);
    } catch (error) {
      console.error('Error tracking user behavior:', error);
    }
  }
} 