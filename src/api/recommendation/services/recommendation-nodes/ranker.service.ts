
import { BaseNode, NodeContext, NodeResult } from './base-node.service';
import { StrategyResult, RecommendationItem } from './strategy.service';

export interface RankedRecommendation {
  productId: string;
  score: number;
  normalizedScore: number;
  rationale: string;
  strategy: 'cooccurrence' | 'content' | 'hybrid';
  product?: any;
  availability: boolean;
  stock: number;
  price: number;
  brand?: string;
  categories: string[];
}

export interface RankingResult {
  userId: string;
  recommendations: RankedRecommendation[];
  metadata: {
    totalConsidered: number;
    filteredOut: number;
    finalCount: number;
    executionTime: number;
    filters: {
      stockFilter: number;
      availabilityFilter: number;
      businessRulesFilter: number;
    };
  };
}

export class RankerNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'Ranker');
  }

  async execute(context: NodeContext): Promise<NodeResult<RankingResult[]>> {
    this.log('Starting ranking and filtering');
    
    try {
      const { result: rankingResults, executionTime } = await this.measureExecutionTime(async () => {
        return await this.rankRecommendations(context);
      });

      this.log(`Ranked recommendations for ${rankingResults.length} users in ${executionTime}ms`);

      return this.createSuccessResult(rankingResults, {
        processedCount: rankingResults.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in ranking: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to rank recommendations: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async rankRecommendations(context: NodeContext): Promise<RankingResult[]> {
    const { data: strategyResults } = context.metadata?.strategy || {};
    const { config } = context;

    if (!strategyResults) {
      throw new Error('Missing strategy results for ranking');
    }

    this.log(`Ranking recommendations for ${strategyResults.length} users`);

    const results: RankingResult[] = [];

    for (const strategyResult of strategyResults) {
      const result = await this.rankUserRecommendations(strategyResult, config);
      results.push(result);
    }

    return results;
  }

  private async rankUserRecommendations(
    strategyResult: StrategyResult,
    config: any
  ): Promise<RankingResult> {
    const startTime = Date.now();
    let totalConsidered = strategyResult.recommendations.length;
    let filteredOut = 0;
    const filters = {
      stockFilter: 0,
      availabilityFilter: 0,
      businessRulesFilter: 0
    };

    // Step 1: Normalize scores
    const normalizedRecs = this.normalizeScores(strategyResult.recommendations);

    // Step 2: Fetch product details for filtering
    const productIds = normalizedRecs.map(r => r.productId);
    const products = await this.fetchProductDetails(productIds);

    // Step 3: Apply business rules and filters
    const filteredRecs = await this.applyBusinessRules(normalizedRecs, products, config, filters);

    // Step 4: Create final ranked recommendations
    const rankedRecs = await this.createRankedRecommendations(filteredRecs, products);

    // Step 5: Final sorting and limiting
    rankedRecs.sort((a, b) => b.normalizedScore - a.normalizedScore);
    const finalRecs = rankedRecs.slice(0, config.topK);

    filteredOut = totalConsidered - finalRecs.length;

    const executionTime = Date.now() - startTime;

    return {
      userId: strategyResult.userId,
      recommendations: finalRecs,
      metadata: {
        totalConsidered,
        filteredOut,
        finalCount: finalRecs.length,
        executionTime,
        filters
      }
    };
  }

  private normalizeScores(recommendations: RecommendationItem[]): RecommendationItem[] {
    if (recommendations.length === 0) return recommendations;

    const scores = recommendations.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // If all scores are the same, return as-is
    if (maxScore === minScore) {
      return recommendations.map(r => ({ ...r, score: 0.5 }));
    }

    // Min-max normalization to [0, 1]
    return recommendations.map(r => ({
      ...r,
      score: (r.score - minScore) / (maxScore - minScore)
    }));
  }

  private async fetchProductDetails(productIds: string[]): Promise<Map<string, any>> {
    if (productIds.length === 0) return new Map();

    const products = await this.strapi.documents('api::product.product').findMany({
      filters: {
        id: {
          $in: productIds
        }
      },
      populate: {
        categories: true
      }
    });

    return new Map(products.map(p => [p.id.toString(), p]));
  }

  private async applyBusinessRules(
    recommendations: RecommendationItem[],
    products: Map<string, any>,
    config: any,
    filters: any
  ): Promise<RecommendationItem[]> {
    const filtered: RecommendationItem[] = [];

    for (const rec of recommendations) {
      const product = products.get(rec.productId);
      
      if (!product) {
        filters.availabilityFilter++;
        continue;
      }

      // Stock filter
      if (product.stock <= 0) {
        filters.stockFilter++;
        continue;
      }

      // Additional business rules
      if (this.shouldExcludeProduct(product, config)) {
        filters.businessRulesFilter++;
        continue;
      }

      filtered.push(rec);
    }

    return filtered;
  }

  private shouldExcludeProduct(product: any, config: any): boolean {
    // Exclude products with very low ratings (optional business rule)
    if (product.rating && product.rating < 2.0) {
      return true;
    }

    // Exclude products with very few reviews (optional business rule)
    if (product.reviewCount && product.reviewCount < 3) {
      return true;
    }

    // Add more business rules as needed
    // For example: exclude certain categories, brands, price ranges, etc.

    return false;
  }

  private async createRankedRecommendations(
    recommendations: RecommendationItem[],
    products: Map<string, any>
  ): Promise<RankedRecommendation[]> {
    const ranked: RankedRecommendation[] = [];

    for (const rec of recommendations) {
      const product = products.get(rec.productId);
      
      if (!product) continue;

      ranked.push({
        productId: rec.productId,
        score: rec.score,
        normalizedScore: rec.score, // Already normalized
        rationale: rec.rationale,
        strategy: rec.strategy,
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          thumbnail: product.thumbnail,
          brand: product.brand,
          rating: product.rating,
          reviewCount: product.reviewCount
        },
        availability: product.stock > 0,
        stock: product.stock,
        price: product.price,
        brand: product.brand,
        categories: product.categories?.map((c: any) => c.id.toString()) || []
      });
    }

    return ranked;
  }
}
