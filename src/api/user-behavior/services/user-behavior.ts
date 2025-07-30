// import { Strapi } from '@strapi/strapi';

export default class UserBehaviorService {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  async trackBehavior(data: {
    userId: string;
    productId?: number;
    action: string;
    context: string;
    sessionId?: string;
    metadata?: any;
  }) {
    try {
      const behaviorData = {
        userId: data.userId,
        product: data.productId,
        action: data.action,
        context: data.context,
        sessionId: data.sessionId,
        timestamp: new Date(),
        metadata: data.metadata || {}
      };

      const result = await this.strapi.entityService.create('api::user-behavior.user-behavior', {
        data: behaviorData
      });

      return result;
    } catch (error) {
      console.error('Error tracking user behavior:', error);
      throw error;
    }
  }

  async getUserBehavior(userId: string, limit = 50) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        limit,
        populate: ['product']
      });

      return behaviors;
    } catch (error) {
      console.error('Error getting user behavior:', error);
      return [];
    }
  }

  async getUserViewedProducts(userId: string, limit = 10) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          userId,
          action: 'view'
        },
        orderBy: { timestamp: 'desc' },
        limit,
        populate: ['product']
      });

      // Get unique products with their view counts
      const productViews = new Map();
      behaviors.forEach(behavior => {
        if (behavior.product) {
          const productId = behavior.product.id;
          if (productViews.has(productId)) {
            productViews.set(productId, productViews.get(productId) + 1);
          } else {
            productViews.set(productId, 1);
          }
        }
      });

      // Convert to array and sort by view count
      return Array.from(productViews.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, limit)
        .map(([productId]) => parseInt(productId as string));
    } catch (error) {
      console.error('Error getting user viewed products:', error);
      return [];
    }
  }

  async getUserPreferredCategories(userId: string, limit = 5) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          userId,
          action: { $in: ['view', 'purchase', 'add_to_cart'] }
        },
        orderBy: { timestamp: 'desc' },
        limit: 100,
        populate: ['product']
      });

      // Count category interactions
      const categoryCounts = new Map();
      behaviors.forEach(behavior => {
        if (behavior.product && behavior.product.category) {
          const categoryId = behavior.product.category.id;
          const currentCount = categoryCounts.get(categoryId) || 0;
          categoryCounts.set(categoryId, currentCount + 1);
        }
      });

      // Sort by count and return top categories
      return Array.from(categoryCounts.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, limit)
        .map(([categoryId]) => parseInt(categoryId as string));
    } catch (error) {
      console.error('Error getting user preferred categories:', error);
      return [];
    }
  }

  async getFrequentlyBoughtTogether(productId: number, limit = 5) {
    try {
      // Get all purchases that include this product
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          action: 'purchase',
          product: productId
        },
        orderBy: { timestamp: 'desc' },
        limit: 100
      });

      // Get all products bought by users who bought this product
      const userIds = [...new Set(behaviors.map(b => b.userId))];
      const relatedPurchases = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          action: 'purchase',
          userId: { $in: userIds },
          product: { $ne: productId }
        },
        orderBy: { timestamp: 'desc' },
        limit: 200,
        populate: ['product']
      });

      // Count co-occurrences
      const productCounts = new Map();
      relatedPurchases.forEach(behavior => {
        if (behavior.product) {
          const productId = behavior.product.id;
          productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
        }
      });

      // Sort by count and return top products
      return Array.from(productCounts.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, limit)
        .map(([productId]) => parseInt(productId as string));
    } catch (error) {
      console.error('Error getting frequently bought together:', error);
      return [];
    }
  }

  async getPopularProducts(limit = 10) {
    try {
      const behaviors = await this.strapi.db.query('api::user-behavior.user-behavior').findMany({
        where: { 
          action: { $in: ['view', 'purchase', 'add_to_cart'] }
        },
        orderBy: { timestamp: 'desc' },
        limit: 500,
        populate: ['product']
      });

      // Count product interactions
      const productCounts = new Map();
      behaviors.forEach(behavior => {
        if (behavior.product) {
          const productId = behavior.product.id;
          productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
        }
      });

      // Sort by count and return top products
      return Array.from(productCounts.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, limit)
        .map(([productId]) => parseInt(productId as string));
    } catch (error) {
      console.error('Error getting popular products:', error);
      return [];
    }
  }

  async cleanupOldBehaviors(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.strapi.db.query('api::user-behavior.user-behavior').deleteMany({
        where: {
          timestamp: { $lt: cutoffDate }
        }
      });

      return result;
    } catch (error) {
      console.error('Error cleaning up old behaviors:', error);
      throw error;
    }
  }
} 