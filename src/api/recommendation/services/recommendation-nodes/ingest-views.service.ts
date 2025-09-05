
import { BaseNode, NodeContext, NodeResult } from './base-node.service';

export interface ViewData {
  userId: string;
  productId: string;
  timestamp: Date;
  dwell: number;
  sessionId?: string;
  context?: string;
}

export interface UserViewSummary {
  userId: string;
  totalViews: number;
  uniqueProducts: number;
  averageDwell: number;
  lastViewDate: Date;
  views: ViewData[];
  productViewCounts: Record<string, number>;
  categoryViewCounts: Record<string, number>;
}

export class IngestViewsNode extends BaseNode {
  constructor(strapi: any) {
    super(strapi, 'IngestViews');
  }

  async execute(context: NodeContext): Promise<NodeResult<UserViewSummary[]>> {
    this.log('Starting view ingestion');
    
    try {
      const { result: viewData, executionTime } = await this.measureExecutionTime(async () => {
        return await this.extractViewData(context);
      });

      this.log(`Processed ${viewData.length} users with view data in ${executionTime}ms`);

      return this.createSuccessResult(viewData, {
        processedCount: viewData.length,
        executionTime
      });

    } catch (error) {
      this.log(`Error in view ingestion: ${error}`, 'error');
      return this.createErrorResult(
        `Failed to ingest views: ${error}`,
        { executionTime: error.executionTime }
      );
    }
  }

  private async extractViewData(context: NodeContext): Promise<UserViewSummary[]> {
    const { userIds, startDate, endDate, config } = context;
    
    // Calculate date range
    const recencyDate = new Date();
    recencyDate.setDate(recencyDate.getDate() - config.recencyDays);
    const fromDate = startDate || recencyDate;
    const toDate = endDate || new Date();

    this.log(`Extracting views from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Build query filters for user-behavior
    const behaviorFilters: any = {
      action: 'view',
      timestamp: {
        $gte: fromDate.toISOString(),
        $lte: toDate.toISOString()
      }
    };

    if (userIds && userIds.length > 0) {
      behaviorFilters.userId = {
        $in: userIds
      };
    }

    // Fetch view data from user-behavior
    const behaviors = await this.strapi.documents('api::user-behavior.user-behavior').findMany({
      filters: behaviorFilters,
      populate: {
        product: {
          populate: {
            categories: true
          }
        }
      }
    });

    this.log(`Found ${behaviors.length} view behaviors`);

    // Also fetch from activity-product-view if it exists
    let activityViews: any[] = [];
    try {
      const activityFilters: any = {
        timestamp: {
          $gte: fromDate.toISOString(),
          $lte: toDate.toISOString()
        }
      };

      if (userIds && userIds.length > 0) {
        activityFilters.user = {
          id: {
            $in: userIds
          }
        };
      }

      activityViews = await this.strapi.documents('api::activity-product-view.activity-product-view').findMany({
        filters: activityFilters,
        populate: {
          product: {
            populate: {
              categories: true
            }
          }
        }
      });

      this.log(`Found ${activityViews.length} activity views`);
    } catch (error) {
      this.log('Activity-product-view not available, using only user-behavior data');
    }

    // Combine and deduplicate view data
    const allViews: ViewData[] = [];

    // Process user-behavior data
    for (const behavior of behaviors) {
      if (behavior.product) {
        allViews.push({
          userId: behavior.userId,
          productId: behavior.product.id.toString(),
          timestamp: new Date(behavior.timestamp),
          dwell: 0, // user-behavior doesn't have dwell time
          sessionId: behavior.sessionId,
          context: behavior.context
        });
      }
    }

    // Process activity-product-view data
    for (const activity of activityViews) {
      if (activity.product) {
        allViews.push({
          userId: activity.user.id.toString(),
          productId: activity.product.id.toString(),
          timestamp: new Date(activity.timestamp),
          dwell: activity.dwell || 0,
          sessionId: activity.sessionId,
          context: activity.context
        });
      }
    }

    // Deduplicate views (same user, same product, within 1 hour)
    const deduplicatedViews = this.deduplicateViews(allViews);

    this.log(`Deduplicated to ${deduplicatedViews.length} unique views`);

    // Group views by user
    const userViews = new Map<string, ViewData[]>();

    for (const view of deduplicatedViews) {
      if (!userViews.has(view.userId)) {
        userViews.set(view.userId, []);
      }
      userViews.get(view.userId)!.push(view);
    }

    // Convert to UserViewSummary format
    const userSummaries: UserViewSummary[] = [];

    for (const [userId, views] of userViews) {
      const productViewCounts: Record<string, number> = {};
      const categoryViewCounts: Record<string, number> = {};
      let totalDwell = 0;
      let uniqueProducts = new Set<string>();

      for (const view of views) {
        productViewCounts[view.productId] = (productViewCounts[view.productId] || 0) + 1;
        uniqueProducts.add(view.productId);
        totalDwell += view.dwell;

        // Note: We would need to fetch product categories here for categoryViewCounts
        // For now, we'll leave it empty to avoid additional queries
      }

      const lastViewDate = Math.max(...views.map(v => v.timestamp.getTime()));
      const averageDwell = views.length > 0 ? totalDwell / views.length : 0;
      
      userSummaries.push({
        userId,
        totalViews: views.length,
        uniqueProducts: uniqueProducts.size,
        averageDwell,
        lastViewDate: new Date(lastViewDate),
        views,
        productViewCounts,
        categoryViewCounts
      });
    }

    this.log(`Generated summaries for ${userSummaries.length} users`);
    return userSummaries;
  }

  private deduplicateViews(views: ViewData[]): ViewData[] {
    const deduplicated: ViewData[] = [];
    const seen = new Set<string>();

    // Sort by timestamp to process chronologically
    const sortedViews = views.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const view of sortedViews) {
      const key = `${view.userId}-${view.productId}`;
      const lastSeen = seen.has(key);
      
      if (!lastSeen) {
        deduplicated.push(view);
        seen.add(key);
      } else {
        // Check if this view is more than 1 hour after the last one
        const lastView = deduplicated[deduplicated.length - 1];
        const timeDiff = view.timestamp.getTime() - lastView.timestamp.getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (timeDiff > oneHour) {
          deduplicated.push(view);
        }
      }
    }

    return deduplicated;
  }
}
