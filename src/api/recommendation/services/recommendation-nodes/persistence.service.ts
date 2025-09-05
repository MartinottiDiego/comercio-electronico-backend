
import { BaseNode, NodeContext, NodeResult } from './base-node.service';
import { RankingResult, RankedRecommendation } from './ranker.service';

export interface PersistenceResult {
  userId: string;
  recommendationsStored: number;
  strategy: string;
  generatedAt: Date;
  ttl: number;
  metadata: {
    executionTime: number;
    upserted: boolean;
    previousRecommendationsDeleted: number;
  };
}

export class PersistenceNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'Persistence');
  }

  async execute(context: NodeContext): Promise<NodeResult<PersistenceResult[]>> {
    this.log('Starting persistence of recommendations');
    
    try {
      const { result: persistenceResults, executionTime } = await this.measureExecutionTime(async () => {
        return await this.persistRecommendations(context);
      });

      this.log(`Persisted recommendations for ${persistenceResults.length} users in ${executionTime}ms`);

      return this.createSuccessResult(persistenceResults, {
        processedCount: persistenceResults.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in persistence: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to persist recommendations: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async persistRecommendations(context: NodeContext): Promise<PersistenceResult[]> {
    const { data: rankingResults } = context.metadata?.ranker || {};
    const { config } = context;

    if (!rankingResults) {
      throw new Error('Missing ranking results for persistence');
    }

    this.log(`Persisting recommendations for ${rankingResults.length} users`);

    const results: PersistenceResult[] = [];

    for (const rankingResult of rankingResults) {
      const result = await this.persistUserRecommendations(rankingResult, config);
      results.push(result);
    }

    return results;
  }

  private async persistUserRecommendations(
    rankingResult: RankingResult,
    config: any
  ): Promise<PersistenceResult> {
    const startTime = Date.now();
    const userId = rankingResult.userId;
    const strategy = rankingResult.recommendations[0]?.strategy || 'hybrid';
    const generatedAt = new Date();
    const ttl = config.cacheTtl || 86400; // 24 hours default

    // Convert ranked recommendations to storage format
    const items = this.convertToStorageFormat(rankingResult.recommendations);
    
    // Create context with aggregated signals
    const context = this.createContext(rankingResult, config);

    // Check if user has existing recommendations for this strategy
    const existingRecommendations = await this.findExistingRecommendations(userId, strategy);

    let upserted = false;
    let previousRecommendationsDeleted = 0;

    if (existingRecommendations.length > 0) {
      // Delete existing recommendations for this user and strategy
      await this.deleteExistingRecommendations(existingRecommendations);
      previousRecommendationsDeleted = existingRecommendations.length;
      this.log(`Deleted ${previousRecommendationsDeleted} existing recommendations for user ${userId}`);
    }

    // Create new recommendation record
    const recommendationData = {
      user: userId,
      items,
      strategy,
      context,
      generatedAt: generatedAt.toISOString(),
      ttl,
      metadata: {
        totalConsidered: rankingResult.metadata.totalConsidered,
        filteredOut: rankingResult.metadata.filteredOut,
        finalCount: rankingResult.metadata.finalCount,
        filters: rankingResult.metadata.filters
      }
    };

    try {
      await this.strapi.documents('api::recommendation.recommendation').create({
        data: recommendationData
      });
      
      upserted = true;
      this.log(`Created new recommendation for user ${userId} with ${items.length} items`);
    } catch (error) {
      this.log(`Error creating recommendation for user ${userId}: ${error}`, 'error');
      throw error;
    }

    const executionTime = Date.now() - startTime;

    return {
      userId,
      recommendationsStored: items.length,
      strategy,
      generatedAt,
      ttl,
      metadata: {
        executionTime,
        upserted,
        previousRecommendationsDeleted
      }
    };
  }

  private convertToStorageFormat(recommendations: RankedRecommendation[]): any[] {
    return recommendations.map(rec => ({
      product: rec.productId,
      score: rec.normalizedScore,
      rationale: rec.rationale,
      strategy: rec.strategy,
      productDetails: {
        title: rec.product?.title,
        price: rec.price,
        brand: rec.brand,
        thumbnail: rec.product?.thumbnail,
        rating: rec.product?.rating,
        reviewCount: rec.product?.reviewCount,
        stock: rec.stock,
        availability: rec.availability
      },
      categories: rec.categories
    }));
  }

  private createContext(rankingResult: RankingResult, config: any): any {
    return {
      strategy: rankingResult.recommendations[0]?.strategy || 'hybrid',
      config: {
        topK: config.topK,
        recencyDays: config.recencyDays,
        excludeRecentPurchaseDays: config.excludeRecentPurchaseDays,
        weights: config.strategy === 'hybrid' ? {
          purchase: config.weightPurchase,
          view: config.weightView,
          favorite: config.weightFavorite
        } : undefined
      },
      processing: {
        totalConsidered: rankingResult.metadata.totalConsidered,
        filteredOut: rankingResult.metadata.filteredOut,
        finalCount: rankingResult.metadata.finalCount,
        filters: rankingResult.metadata.filters
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async findExistingRecommendations(userId: string, strategy: string): Promise<any[]> {
    try {
      const recommendations = await this.strapi.documents('api::recommendation.recommendation').findMany({
        filters: {
          user: {
            id: userId
          },
          strategy
        }
      });

      return recommendations;
    } catch (error) {
      this.log(`Error finding existing recommendations: ${error}`, 'warn');
      return [];
    }
  }

  private async deleteExistingRecommendations(recommendations: any[]): Promise<void> {
    for (const rec of recommendations) {
      try {
        await this.strapi.documents('api::recommendation.recommendation').delete({
          documentId: rec.id
        });
      } catch (error) {
        this.log(`Error deleting recommendation ${rec.id}: ${error}`, 'warn');
      }
    }
  }
}
