
import { BaseNode, NodeContext, NodeResult } from './base-node.service';
import { UserFeatures, ProductFeatures } from './feature-builder.service';

export interface RecommendationItem {
  productId: string;
  score: number;
  rationale: string;
  strategy: 'cooccurrence' | 'content' | 'hybrid';
}

export interface StrategyResult {
  userId: string;
  recommendations: RecommendationItem[];
  strategy: 'cooccurrence' | 'content' | 'hybrid';
  metadata: {
    totalProductsConsidered: number;
    executionTime: number;
    strategyParams: any;
  };
}

export class StrategyNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'Strategy');
  }

  async execute(context: NodeContext): Promise<NodeResult<StrategyResult[]>> {
    this.log('Starting strategy execution');
    
    try {
      const { result: strategyResults, executionTime } = await this.measureExecutionTime(async () => {
        return await this.executeStrategy(context);
      });

      this.log(`Generated recommendations for ${strategyResults.length} users in ${executionTime}ms`);

      return this.createSuccessResult(strategyResults, {
        processedCount: strategyResults.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in strategy execution: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to execute strategy: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async executeStrategy(context: NodeContext): Promise<StrategyResult[]> {
    const { data: userFeatures } = context.metadata?.featureBuilder || {};
    const { config } = context;

    if (!userFeatures) {
      throw new Error('Missing user features for strategy execution');
    }

    this.log(`Executing ${config.strategy} strategy for ${userFeatures.length} users`);

    const results: StrategyResult[] = [];

    for (const userFeature of userFeatures) {
      const result = await this.generateRecommendationsForUser(userFeature, config);
      results.push(result);
    }

    return results;
  }

  private async generateRecommendationsForUser(
    userFeature: UserFeatures,
    config: any
  ): Promise<StrategyResult> {
    const startTime = Date.now();
    
    // Get all available products (excluding those already purchased recently)
    const availableProducts = await this.getAvailableProducts(userFeature, config);
    
    let recommendations: RecommendationItem[] = [];

    switch (config.strategy) {
      case 'cooccurrence':
        recommendations = await this.cooccurrenceStrategy(userFeature, availableProducts, config);
        break;
      case 'content':
        recommendations = await this.contentBasedStrategy(userFeature, availableProducts, config);
        break;
      case 'hybrid':
        recommendations = await this.hybridStrategy(userFeature, availableProducts, config);
        break;
      default:
        throw new Error(`Unknown strategy: ${config.strategy}`);
    }

    recommendations.sort((a, b) => b.score - a.score);
    recommendations = recommendations.slice(0, config.topK);

    const executionTime = Date.now() - startTime;

    return {
      userId: userFeature.userId,
      recommendations,
      strategy: config.strategy,
      metadata: {
        totalProductsConsidered: availableProducts.length,
        executionTime,
        strategyParams: {
          topK: config.topK,
          weights: config.strategy === 'hybrid' ? {
            purchase: config.weightPurchase,
            view: config.weightView,
            favorite: config.weightFavorite
          } : undefined
        }
      }
    };
  }

  private async getAvailableProducts(
    userFeature: UserFeatures,
    config: any
  ): Promise<any[]> {
    const products = await this.strapi.documents('api::product.product').findMany({
      filters: {
        stock: {
          $gt: 0
        }
      },
      populate: {
        categories: true
      }
    });

    const recentPurchaseThreshold = new Date();
    recentPurchaseThreshold.setDate(recentPurchaseThreshold.getDate() - config.excludeRecentPurchaseDays);

    const recentlyPurchasedProducts = new Set(
      Object.values(userFeature.productFeatures)
        .filter((pf: ProductFeatures) => pf.recencyBuy < config.excludeRecentPurchaseDays)
        .map((pf: ProductFeatures) => pf.productId)
    );

    return products.filter(product => 
      !recentlyPurchasedProducts.has(product.id.toString())
    );
  }

  private async cooccurrenceStrategy(
    userFeature: UserFeatures,
    availableProducts: any[],
    config: any
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];
    const userProductIds = Object.keys(userFeature.productFeatures);

    for (const product of availableProducts) {
      const productId = product.id.toString();
      let score = 0;
      let rationale = '';

      // Calculate co-occurrence score
      for (const userProductId of userProductIds) {
        const userProductFeatures = userFeature.productFeatures[userProductId];
        const coPurchaseCount = userProductFeatures.coPurchasePairs[productId] || 0;
        
        if (coPurchaseCount > 0) {
          // Weight by frequency of purchase of the source product
          const weightedScore = coPurchaseCount * userProductFeatures.freqBuy;
          score += weightedScore;
          rationale += `Co-purchased with ${userProductId} (${coPurchaseCount}x), `;
        }
      }

      if (score > 0) {
        recommendations.push({
          productId,
          score,
          rationale: rationale.slice(0, -2), // Remove trailing comma
          strategy: 'cooccurrence'
        });
      }
    }

    return recommendations;
  }

  private async contentBasedStrategy(
    userFeature: UserFeatures,
    availableProducts: any[],
    config: any
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];

    for (const product of availableProducts) {
      const productId = product.id.toString();
      let score = 0;
      let rationale = '';

      // Category matching
      const productCategories = product.categories?.map((c: any) => c.id.toString()) || [];
      const userCategoryPreferences = userFeature.categoryPreferences;
      
      for (const categoryId of productCategories) {
        const categoryScore = userCategoryPreferences[categoryId] || 0;
        score += categoryScore * 0.4; // 40% weight for category matching
        if (categoryScore > 0) {
          rationale += `Category match (${categoryScore}), `;
        }
      }

      // Brand matching
      if (product.brand && userFeature.brandPreferences[product.brand]) {
        const brandScore = userFeature.brandPreferences[product.brand];
        score += brandScore * 0.3; // 30% weight for brand matching
        rationale += `Brand match (${brandScore}), `;
      }

      // Price preference matching
      const priceBucket = this.getPriceBucket(product.price);
      const priceScore = userFeature.pricePreferences[priceBucket] || 0;
      score += priceScore * 0.2; // 20% weight for price matching
      if (priceScore > 0) {
        rationale += `Price preference match (${priceBucket}), `;
      }

      // Product quality (rating and review count)
      const qualityScore = (product.rating || 0) * Math.log10(Math.max(product.reviewCount || 1, 1));
      score += qualityScore * 0.1; // 10% weight for quality
      if (qualityScore > 0) {
        rationale += `Quality score (${qualityScore.toFixed(2)}), `;
      }

      if (score > 0) {
        recommendations.push({
          productId,
          score,
          rationale: rationale.slice(0, -2), // Remove trailing comma
          strategy: 'content'
        });
      }
    }

    return recommendations;
  }

  private async hybridStrategy(
    userFeature: UserFeatures,
    availableProducts: any[],
    config: any
  ): Promise<RecommendationItem[]> {
    // Get recommendations from both strategies
    const cooccurrenceRecs = await this.cooccurrenceStrategy(userFeature, availableProducts, config);
    const contentRecs = await this.contentBasedStrategy(userFeature, availableProducts, config);

    // Create maps for quick lookup
    const cooccurrenceMap = new Map(cooccurrenceRecs.map(r => [r.productId, r]));
    const contentMap = new Map(contentRecs.map(r => [r.productId, r]));

    // Combine scores
    const combinedRecommendations: RecommendationItem[] = [];
    const allProductIds = new Set([...cooccurrenceMap.keys(), ...contentMap.keys()]);

    for (const productId of allProductIds) {
      const cooccurrenceRec = cooccurrenceMap.get(productId);
      const contentRec = contentMap.get(productId);

      const cooccurrenceScore = cooccurrenceRec?.score || 0;
      const contentScore = contentRec?.score || 0;

      // Normalize scores (simple min-max normalization)
      const normalizedCooccurrenceScore = this.normalizeScore(cooccurrenceScore, cooccurrenceRecs);
      const normalizedContentScore = this.normalizeScore(contentScore, contentRecs);

      // Apply weights
      const finalScore = 
        normalizedCooccurrenceScore * config.weightPurchase +
        normalizedContentScore * config.weightView +
        (userFeature.productFeatures[productId]?.favFlag ? 1 : 0) * config.weightFavorite;

      let rationale = '';
      if (cooccurrenceRec) {
        rationale += `Co-occurrence: ${cooccurrenceRec.rationale}; `;
      }
      if (contentRec) {
        rationale += `Content: ${contentRec.rationale}; `;
      }
      if (userFeature.productFeatures[productId]?.favFlag) {
        rationale += `Favorite flag; `;
      }

      if (finalScore > 0) {
        combinedRecommendations.push({
          productId,
          score: finalScore,
          rationale: rationale.slice(0, -2), // Remove trailing semicolon and space
          strategy: 'hybrid'
        });
      }
    }

    return combinedRecommendations;
  }

  private normalizeScore(score: number, allRecs: RecommendationItem[]): number {
    if (allRecs.length === 0) return 0;
    
    const scores = allRecs.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    if (maxScore === minScore) return 0.5; // If all scores are the same, return middle value
    
    return (score - minScore) / (maxScore - minScore);
  }

  private getPriceBucket(price: number): string {
    if (price < 50) return 'low';
    if (price < 200) return 'medium';
    if (price < 500) return 'high';
    return 'premium';
  }
}
