
import { BaseNode, NodeContext, NodeResult } from './base-node.service';
import { UserPurchaseSummary } from './ingest-orders.service';
import { UserViewSummary } from './ingest-views.service';
import { UserFavoriteSummary } from './ingest-favorites.service';

export interface ProductFeatures {
  productId: string;
  freqBuy: number;
  recencyBuy: number;
  coPurchasePairs: Record<string, number>;
  viewDwell: number;
  viewRecency: number;
  favFlag: boolean;
  categories: string[];
  brand?: string;
  priceBucket: string;
  rating: number;
  reviewCount: number;
}

export interface UserFeatures {
  userId: string;
  totalPurchases: number;
  totalViews: number;
  totalFavorites: number;
  avgOrderValue: number;
  purchaseFrequency: number;
  viewFrequency: number;
  favoriteFrequency: number;
  categoryPreferences: Record<string, number>;
  brandPreferences: Record<string, number>;
  pricePreferences: Record<string, number>;
  productFeatures: Record<string, ProductFeatures>;
}

export class FeatureBuilderNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'FeatureBuilder');
  }

  async execute(context: NodeContext): Promise<NodeResult<UserFeatures[]>> {
    this.log('Starting feature building');
    
    try {
      const { result: features, executionTime } = await this.measureExecutionTime(async () => {
        return await this.buildFeatures(context);
      });

      this.log(`Generated features for ${features.length} users in ${executionTime}ms`);

      return this.createSuccessResult(features, {
        processedCount: features.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in feature building: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to build features: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async buildFeatures(context: NodeContext): Promise<UserFeatures[]> {
    const { data: purchaseData } = context.metadata?.ingestOrders || {};
    const { data: viewData } = context.metadata?.ingestViews || {};
    const { data: favoriteData } = context.metadata?.ingestFavorites || {};

    if (!purchaseData || !viewData || !favoriteData) {
      throw new Error('Missing ingested data for feature building');
    }

    this.log(`Building features from ${purchaseData.length} purchase summaries, ${viewData.length} view summaries, ${favoriteData.length} favorite summaries`);

    // Create maps for quick lookup
    const purchaseMap = new Map<string, UserPurchaseSummary>(purchaseData.map((p: UserPurchaseSummary) => [p.userId, p]));
    const viewMap = new Map<string, UserViewSummary>(viewData.map((v: UserViewSummary) => [v.userId, v]));
    const favoriteMap = new Map<string, UserFavoriteSummary>(favoriteData.map((f: UserFavoriteSummary) => [f.userId, f]));

    // Get all unique user IDs
    const allUserIds = new Set([
      ...purchaseData.map((p: UserPurchaseSummary) => p.userId),
      ...viewData.map((v: UserViewSummary) => v.userId),
      ...favoriteData.map((f: UserFavoriteSummary) => f.userId)
    ]);

    // Build co-purchase matrix
    const coPurchaseMatrix = this.buildCoPurchaseMatrix(purchaseData);

    // Fetch product details for all products
    const productDetails = await this.fetchProductDetails(allUserIds, purchaseMap, viewMap, favoriteMap);

    const userFeatures: UserFeatures[] = [];

    for (const userId of allUserIds) {
      const purchaseSummary = purchaseMap.get(userId);
      const viewSummary = viewMap.get(userId);
      const favoriteSummary = favoriteMap.get(userId);

      const userFeature = await this.buildUserFeatures(
        userId,
        purchaseSummary,
        viewSummary,
        favoriteSummary,
        coPurchaseMatrix,
        productDetails
      );

      userFeatures.push(userFeature);
    }

    return userFeatures;
  }

  private buildCoPurchaseMatrix(purchaseData: UserPurchaseSummary[]): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();

    for (const userData of purchaseData) {
      const productIds = userData.purchases.map(p => p.productId);
      
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const product1 = productIds[i];
          const product2 = productIds[j];
          
          // Add both directions
          this.addCoPurchase(matrix, product1, product2);
          this.addCoPurchase(matrix, product2, product1);
        }
      }
    }

    return matrix;
  }

  private addCoPurchase(matrix: Map<string, Map<string, number>>, product1: string, product2: string): void {
    if (!matrix.has(product1)) {
      matrix.set(product1, new Map());
    }
    
    const productMap = matrix.get(product1)!;
    productMap.set(product2, (productMap.get(product2) || 0) + 1);
  }

  private async fetchProductDetails(
    userIds: Set<string>,
    purchaseMap: Map<string, UserPurchaseSummary>,
    viewMap: Map<string, UserViewSummary>,
    favoriteMap: Map<string, UserFavoriteSummary>
  ): Promise<Map<string, any>> {
    // Collect all unique product IDs
    const productIds = new Set<string>();
    
    for (const userId of userIds) {
      const purchaseSummary = purchaseMap.get(userId);
      const viewSummary = viewMap.get(userId);
      const favoriteSummary = favoriteMap.get(userId);

      if (purchaseSummary) {
        purchaseSummary.purchases.forEach(p => productIds.add(p.productId));
      }
      if (viewSummary) {
        viewSummary.views.forEach(v => productIds.add(v.productId));
      }
      if (favoriteSummary) {
        favoriteSummary.favorites.forEach(f => productIds.add(f.productId));
      }
    }

    // Fetch product details
    const products = await this.strapi.documents('api::product.product').findMany({
      filters: {
        id: {
          $in: Array.from(productIds)
        }
      },
      populate: {
        categories: true
      }
    });

    return new Map(products.map(p => [p.id.toString(), p]));
  }

  private async buildUserFeatures(
    userId: string,
    purchaseSummary: UserPurchaseSummary | undefined,
    viewSummary: UserViewSummary | undefined,
    favoriteSummary: UserFavoriteSummary | undefined,
    coPurchaseMatrix: Map<string, Map<string, number>>,
    productDetails: Map<string, any>
  ): Promise<UserFeatures> {
    const productFeatures: Record<string, ProductFeatures> = {};
    const categoryPreferences: Record<string, number> = {};
    const brandPreferences: Record<string, number> = {};
    const pricePreferences: Record<string, number> = {};

    // Process purchase data
    if (purchaseSummary) {
      for (const purchase of purchaseSummary.purchases) {
        const productId = purchase.productId;
        const product = productDetails.get(productId);
        
        if (product) {
          const features = this.buildProductFeatures(
            productId,
            purchase,
            purchaseSummary,
            viewSummary,
            favoriteSummary,
            coPurchaseMatrix,
            product
          );
          
          productFeatures[productId] = features;

          // Update preferences
          this.updatePreferences(categoryPreferences, product.categories?.map((c: any) => c.id.toString()) || []);
          if (product.brand) {
            brandPreferences[product.brand] = (brandPreferences[product.brand] || 0) + 1;
          }
          this.updatePricePreferences(pricePreferences, product.price);
        }
      }
    }

    // Process view data
    if (viewSummary) {
      for (const view of viewSummary.views) {
        const productId = view.productId;
        const product = productDetails.get(productId);
        
        if (product && !productFeatures[productId]) {
          const features = this.buildProductFeatures(
            productId,
            undefined,
            purchaseSummary,
            viewSummary,
            favoriteSummary,
            coPurchaseMatrix,
            product
          );
          
          productFeatures[productId] = features;
        }
      }
    }

    // Process favorite data
    if (favoriteSummary) {
      for (const favorite of favoriteSummary.favorites) {
        const productId = favorite.productId;
        const product = productDetails.get(productId);
        
        if (product && !productFeatures[productId]) {
          const features = this.buildProductFeatures(
            productId,
            undefined,
            purchaseSummary,
            viewSummary,
            favoriteSummary,
            coPurchaseMatrix,
            product
          );
          
          productFeatures[productId] = features;
        }
      }
    }

    // Calculate user-level features
    const totalPurchases = purchaseSummary?.totalPurchases || 0;
    const totalViews = viewSummary?.totalViews || 0;
    const totalFavorites = favoriteSummary?.totalFavorites || 0;
    const avgOrderValue = purchaseSummary ? purchaseSummary.totalSpent / Math.max(purchaseSummary.totalPurchases, 1) : 0;
    
    // Calculate frequencies (per day)
    const daysSinceFirstActivity = this.calculateDaysSinceFirstActivity(purchaseSummary, viewSummary, favoriteSummary);
    const purchaseFrequency = daysSinceFirstActivity > 0 ? totalPurchases / daysSinceFirstActivity : 0;
    const viewFrequency = daysSinceFirstActivity > 0 ? totalViews / daysSinceFirstActivity : 0;
    const favoriteFrequency = daysSinceFirstActivity > 0 ? totalFavorites / daysSinceFirstActivity : 0;

    return {
      userId,
      totalPurchases,
      totalViews,
      totalFavorites,
      avgOrderValue,
      purchaseFrequency,
      viewFrequency,
      favoriteFrequency,
      categoryPreferences,
      brandPreferences,
      pricePreferences,
      productFeatures
    };
  }

  private buildProductFeatures(
    productId: string,
    purchase: any,
    purchaseSummary: UserPurchaseSummary | undefined,
    viewSummary: UserViewSummary | undefined,
    favoriteSummary: UserFavoriteSummary | undefined,
    coPurchaseMatrix: Map<string, Map<string, number>>,
    product: any
  ): ProductFeatures {
    // Frequency of purchase
    const freqBuy = purchase ? purchase.quantity : 0;
    
    // Recency of purchase (days since last purchase)
    const recencyBuy = purchase ? 
      Math.max(0, (Date.now() - purchase.purchasedAt.getTime()) / (1000 * 60 * 60 * 24)) : 
      Infinity;

    // Co-purchase pairs
    const coPurchasePairs = coPurchaseMatrix.get(productId) || new Map();
    const coPurchaseObj: Record<string, number> = {};
    for (const [otherProduct, count] of coPurchasePairs) {
      coPurchaseObj[otherProduct] = count;
    }

    // View features
    const viewData = viewSummary?.views.filter(v => v.productId === productId) || [];
    const viewDwell = viewData.length > 0 ? 
      viewData.reduce((sum, v) => sum + v.dwell, 0) / viewData.length : 0;
    const viewRecency = viewData.length > 0 ?
      Math.max(0, (Date.now() - Math.max(...viewData.map(v => v.timestamp.getTime()))) / (1000 * 60 * 60 * 24)) :
      Infinity;

    // Favorite flag
    const favFlag = favoriteSummary?.favorites.some(f => f.productId === productId) || false;

    // Product attributes
    const categories = product.categories?.map((c: any) => c.id.toString()) || [];
    const brand = product.brand;
    const priceBucket = this.getPriceBucket(product.price);
    const rating = product.rating || 0;
    const reviewCount = product.reviewCount || 0;

    return {
      productId,
      freqBuy,
      recencyBuy,
      coPurchasePairs: coPurchaseObj,
      viewDwell,
      viewRecency,
      favFlag,
      categories,
      brand,
      priceBucket,
      rating,
      reviewCount
    };
  }

  private getPriceBucket(price: number): string {
    if (price < 50) return 'low';
    if (price < 200) return 'medium';
    if (price < 500) return 'high';
    return 'premium';
  }

  private updatePreferences(preferences: Record<string, number>, items: string[]): void {
    for (const item of items) {
      preferences[item] = (preferences[item] || 0) + 1;
    }
  }

  private updatePricePreferences(preferences: Record<string, number>, price: number): void {
    const bucket = this.getPriceBucket(price);
    preferences[bucket] = (preferences[bucket] || 0) + 1;
  }

  private calculateDaysSinceFirstActivity(
    purchaseSummary: UserPurchaseSummary | undefined,
    viewSummary: UserViewSummary | undefined,
    favoriteSummary: UserFavoriteSummary | undefined
  ): number {
    const dates: Date[] = [];
    
    if (purchaseSummary?.lastPurchaseDate) {
      dates.push(purchaseSummary.lastPurchaseDate);
    }
    if (viewSummary?.lastViewDate) {
      dates.push(viewSummary.lastViewDate);
    }
    if (favoriteSummary?.lastFavoriteDate) {
      dates.push(favoriteSummary.lastFavoriteDate);
    }

    if (dates.length === 0) return 1;

    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const now = new Date();
    return Math.max(1, (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
  }
}
