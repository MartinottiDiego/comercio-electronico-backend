
import { BaseNode, NodeContext, NodeResult } from './base-node.service';

export interface FavoriteData {
  userId: string;
  productId: string;
  addedAt: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface UserFavoriteSummary {
  userId: string;
  totalFavorites: number;
  uniqueProducts: number;
  lastFavoriteDate: Date;
  favorites: FavoriteData[];
  productFavoriteCounts: Record<string, number>;
  categoryFavoriteCounts: Record<string, number>;
}

export class IngestFavoritesNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'IngestFavorites');
  }

  async execute(context: NodeContext): Promise<NodeResult<UserFavoriteSummary[]>> {
    this.log('Starting favorites ingestion');
    
    try {
      const { result: favoriteData, executionTime } = await this.measureExecutionTime(async () => {
        return await this.extractFavoriteData(context);
      });

      this.log(`Processed ${favoriteData.length} users with favorite data in ${executionTime}ms`);

      return this.createSuccessResult(favoriteData, {
        processedCount: favoriteData.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in favorites ingestion: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to ingest favorites: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async extractFavoriteData(context: NodeContext): Promise<UserFavoriteSummary[]> {
    const { userIds, startDate, endDate } = context;
    
    // Calculate date range
    const fromDate = startDate || new Date(0); // Get all favorites if no start date
    const toDate = endDate || new Date();

    this.log(`Extracting favorites from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Build query filters
    const favoriteFilters: any = {
      createdAt: {
        $gte: fromDate.toISOString(),
        $lte: toDate.toISOString()
      }
    };

    if (userIds && userIds.length > 0) {
      favoriteFilters.user = {
        id: {
          $in: userIds
        }
      };
    }

    // Fetch favorites with related data
    const favorites = await this.strapi.documents('api::favorite.favorite').findMany({
      filters: favoriteFilters,
      populate: {
        user: true,
        product: {
          populate: {
            categories: true
          }
        }
      }
    });

    this.log(`Found ${favorites.length} favorites to process`);

    // Group favorites by user
    const userFavorites = new Map<string, FavoriteData[]>();

    for (const favorite of favorites) {
      if (favorite.user && favorite.product) {
        const userId = favorite.user.id.toString();
        
        if (!userFavorites.has(userId)) {
          userFavorites.set(userId, []);
        }

        const favoriteData: FavoriteData = {
          userId,
          productId: favorite.product.id.toString(),
          addedAt: new Date(favorite.createdAt),
          sessionId: favorite.sessionId,
          metadata: favorite.metadata
        };

        userFavorites.get(userId)!.push(favoriteData);
      }
    }

    // Convert to UserFavoriteSummary format
    const userSummaries: UserFavoriteSummary[] = [];

    for (const [userId, favorites] of userFavorites) {
      const productFavoriteCounts: Record<string, number> = {};
      const categoryFavoriteCounts: Record<string, number> = {};
      let uniqueProducts = new Set<string>();

      for (const favorite of favorites) {
        productFavoriteCounts[favorite.productId] = (productFavoriteCounts[favorite.productId] || 0) + 1;
        uniqueProducts.add(favorite.productId);

        // Note: We would need to fetch product categories here for categoryFavoriteCounts
        // For now, we'll leave it empty to avoid additional queries
      }

      const lastFavoriteDate = Math.max(...favorites.map(f => f.addedAt.getTime()));
      
      userSummaries.push({
        userId,
        totalFavorites: favorites.length,
        uniqueProducts: uniqueProducts.size,
        lastFavoriteDate: new Date(lastFavoriteDate),
        favorites,
        productFavoriteCounts,
        categoryFavoriteCounts
      });
    }

    this.log(`Generated summaries for ${userSummaries.length} users`);
    return userSummaries;
  }
}
