
import { BaseNode, NodeContext, NodeResult } from './base-node.service';

export interface PurchaseData {
  userId: string;
  productId: string;
  quantity: number;
  price: number;
  purchasedAt: Date;
  orderId: string;
  categories?: string[];
  brand?: string;
}

export interface UserPurchaseSummary {
  userId: string;
  totalPurchases: number;
  uniqueProducts: number;
  totalSpent: number;
  lastPurchaseDate: Date;
  purchases: PurchaseData[];
  categoryDistribution: Record<string, number>;
  brandDistribution: Record<string, number>;
}

export class IngestOrdersNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'IngestOrders');
  }

  async execute(context: NodeContext): Promise<NodeResult<UserPurchaseSummary[]>> {
    this.log('Starting order ingestion');
    
    try {
      const { result: purchaseData, executionTime } = await this.measureExecutionTime(async () => {
        return await this.extractPurchaseData(context);
      });

      this.log(`Processed ${purchaseData.length} users with purchase data in ${executionTime}ms`);

      return this.createSuccessResult(purchaseData, {
        processedCount: purchaseData.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in order ingestion: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to ingest orders: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async extractPurchaseData(context: NodeContext): Promise<UserPurchaseSummary[]> {
    const { userIds, startDate, endDate, config } = context;
    
    // Calculate date range
    const recencyDate = new Date();
    recencyDate.setDate(recencyDate.getDate() - config.recencyDays);
    const fromDate = startDate || recencyDate;
    const toDate = endDate || new Date();

    this.log(`Extracting orders from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Build query filters
    const orderFilters: any = {
      createdAt: {
        $gte: fromDate.toISOString(),
        $lte: toDate.toISOString()
      },
      orderStatus: {
        $in: ['confirmed', 'processing', 'shipped', 'delivered']
      },
      paymentStatus: {
        $in: ['paid', 'partially_refunded']
      }
    };

    if (userIds && userIds.length > 0) {
      orderFilters.user = {
        id: {
          $in: userIds
        }
      };
    }

    // Fetch orders with order items and related data
    const orders = await this.strapi.documents('api::order.order').findMany({
      filters: orderFilters,
      populate: {
        user: true,
        order_items: {
          populate: {
            product: {
              populate: {
                categories: true
              }
            }
          }
        }
      }
    });

    this.log(`Found ${orders.length} orders to process`);

    // Group purchases by user
    const userPurchases = new Map<string, PurchaseData[]>();

    for (const order of orders) {
      const userId = order.user.id.toString();
      
      if (!userPurchases.has(userId)) {
        userPurchases.set(userId, []);
      }

      for (const orderItem of order.order_items || []) {
        if (orderItem.product) {
          const purchaseData: PurchaseData = {
            userId,
            productId: orderItem.product.id.toString(),
            quantity: orderItem.quantity,
            price: parseFloat(orderItem.price),
            purchasedAt: new Date(order.createdAt),
            orderId: order.id.toString(),
            categories: orderItem.product.categories?.map((cat: any) => cat.id.toString()) || [],
            brand: orderItem.product.brand
          };

          userPurchases.get(userId)!.push(purchaseData);
        }
      }
    }

    // Convert to UserPurchaseSummary format
    const userSummaries: UserPurchaseSummary[] = [];

    for (const [userId, purchases] of userPurchases) {
      const categoryDistribution: Record<string, number> = {};
      const brandDistribution: Record<string, number> = {};
      let totalSpent = 0;
      let uniqueProducts = new Set<string>();

      for (const purchase of purchases) {
        totalSpent += purchase.price * purchase.quantity;
        uniqueProducts.add(purchase.productId);

        // Count categories
        for (const categoryId of purchase.categories || []) {
          categoryDistribution[categoryId] = (categoryDistribution[categoryId] || 0) + 1;
        }

        // Count brands
        if (purchase.brand) {
          brandDistribution[purchase.brand] = (brandDistribution[purchase.brand] || 0) + 1;
        }
      }

      const lastPurchaseDate = Math.max(...purchases.map(p => p.purchasedAt.getTime()));
      
      userSummaries.push({
        userId,
        totalPurchases: purchases.length,
        uniqueProducts: uniqueProducts.size,
        totalSpent,
        lastPurchaseDate: new Date(lastPurchaseDate),
        purchases,
        categoryDistribution,
        brandDistribution
      });
    }

    this.log(`Generated summaries for ${userSummaries.length} users`);
    return userSummaries;
  }
}
