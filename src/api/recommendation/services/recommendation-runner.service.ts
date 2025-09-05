// import type { Strapi } from '@strapi/strapi';
import { recommendationConfig } from './recommendation-config.service';
import { IngestOrdersNode } from './recommendation-nodes/ingest-orders.service';
import { IngestViewsNode } from './recommendation-nodes/ingest-views.service';
import { IngestFavoritesNode } from './recommendation-nodes/ingest-favorites.service';
import { FeatureBuilderNode } from './recommendation-nodes/feature-builder.service';
import { StrategyNode } from './recommendation-nodes/strategy.service';
import { RankerNode } from './recommendation-nodes/ranker.service';
import { PersistenceNode } from './recommendation-nodes/persistence.service';
import { NotifyNode } from './recommendation-nodes/notify.service';

export interface RunnerContext {
  userId?: string;
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
  config: any;
  metadata?: Record<string, any>;
}

export interface RunnerResult {
  success: boolean;
  totalUsers: number;
  successfulUsers: number;
  failedUsers: number;
  executionTime: number;
  nodeResults: {
    [nodeName: string]: {
      success: boolean;
      executionTime: number;
      processedCount?: number;
      error?: string;
    };
  };
  errors: string[];
  metadata: {
    startTime: Date;
    endTime: Date;
    config: any;
  };
}

export class RecommendationRunner {
  private strapi: any;
  private nodes: {
    ingestOrders: IngestOrdersNode;
    ingestViews: IngestViewsNode;
    ingestFavorites: IngestFavoritesNode;
    featureBuilder: FeatureBuilderNode;
    strategy: StrategyNode;
    ranker: RankerNode;
    persistence: PersistenceNode;
    notify: NotifyNode;
  };

  constructor(strapi: any) {
    this.strapi = strapi;
    this.initializeNodes();
  }

  private initializeNodes(): void {
    this.nodes = {
      ingestOrders: new IngestOrdersNode(this.strapi),
      ingestViews: new IngestViewsNode(this.strapi),
      ingestFavorites: new IngestFavoritesNode(this.strapi),
      featureBuilder: new FeatureBuilderNode(this.strapi),
      strategy: new StrategyNode(this.strapi),
      ranker: new RankerNode(this.strapi),
      persistence: new PersistenceNode(this.strapi),
      notify: new NotifyNode(this.strapi)
    };
  }

  async run(context: RunnerContext): Promise<RunnerResult> {
    const startTime = new Date();
    const config = recommendationConfig.getConfig();
    
    console.log(`[RecommendationRunner] Starting recommendation engine execution`);
    console.log(`[RecommendationRunner] Strategy: ${config.strategy}, TopK: ${config.topK}, RecencyDays: ${config.recencyDays}`);

    const runnerContext: RunnerContext = {
      ...context,
      config,
      metadata: {
        ...context.metadata,
        startTime: startTime.toISOString()
      }
    };

    const nodeResults: RunnerResult['nodeResults'] = {};
    const errors: string[] = [];
    let totalUsers = 0;
    let successfulUsers = 0;
    let failedUsers = 0;

    try {
      const validation = recommendationConfig.validateConfig();
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      console.log(`[RecommendationRunner] Executing IngestOrders node`);
      const ordersResult = await this.nodes.ingestOrders.execute(runnerContext);
      nodeResults.ingestOrders = {
        success: ordersResult.success,
        executionTime: ordersResult.metadata?.executionTime || 0,
        processedCount: ordersResult.metadata?.processedCount,
        error: ordersResult.error
      };

      if (!ordersResult.success) {
        throw new Error(`IngestOrders failed: ${ordersResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        ingestOrders: ordersResult
      };

      console.log(`[RecommendationRunner] Executing IngestViews node`);
      const viewsResult = await this.nodes.ingestViews.execute(runnerContext);
      nodeResults.ingestViews = {
        success: viewsResult.success,
        executionTime: viewsResult.metadata?.executionTime || 0,
        processedCount: viewsResult.metadata?.processedCount,
        error: viewsResult.error
      };

      if (!viewsResult.success) {
        throw new Error(`IngestViews failed: ${viewsResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        ingestViews: viewsResult
      };

      console.log(`[RecommendationRunner] Executing IngestFavorites node`);
      const favoritesResult = await this.nodes.ingestFavorites.execute(runnerContext);
      nodeResults.ingestFavorites = {
        success: favoritesResult.success,
        executionTime: favoritesResult.metadata?.executionTime || 0,
        processedCount: favoritesResult.metadata?.processedCount,
        error: favoritesResult.error
      };

      if (!favoritesResult.success) {
        throw new Error(`IngestFavorites failed: ${favoritesResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        ingestFavorites: favoritesResult
      };

      console.log(`[RecommendationRunner] Executing FeatureBuilder node`);
      const featuresResult = await this.nodes.featureBuilder.execute(runnerContext);
      nodeResults.featureBuilder = {
        success: featuresResult.success,
        executionTime: featuresResult.metadata?.executionTime || 0,
        processedCount: featuresResult.metadata?.processedCount,
        error: featuresResult.error
      };

      if (!featuresResult.success) {
        throw new Error(`FeatureBuilder failed: ${featuresResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        featureBuilder: featuresResult
      };

      console.log(`[RecommendationRunner] Executing Strategy node`);
      const strategyResult = await this.nodes.strategy.execute(runnerContext);
      nodeResults.strategy = {
        success: strategyResult.success,
        executionTime: strategyResult.metadata?.executionTime || 0,
        processedCount: strategyResult.metadata?.processedCount,
        error: strategyResult.error
      };

      if (!strategyResult.success) {
        throw new Error(`Strategy failed: ${strategyResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        strategy: strategyResult
      };

      console.log(`[RecommendationRunner] Executing Ranker node`);
      const rankerResult = await this.nodes.ranker.execute(runnerContext);
      nodeResults.ranker = {
        success: rankerResult.success,
        executionTime: rankerResult.metadata?.executionTime || 0,
        processedCount: rankerResult.metadata?.processedCount,
        error: rankerResult.error
      };

      if (!rankerResult.success) {
        throw new Error(`Ranker failed: ${rankerResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        ranker: rankerResult
      };

      console.log(`[RecommendationRunner] Executing Persistence node`);
      const persistenceResult = await this.nodes.persistence.execute(runnerContext);
      nodeResults.persistence = {
        success: persistenceResult.success,
        executionTime: persistenceResult.metadata?.executionTime || 0,
        processedCount: persistenceResult.metadata?.processedCount,
        error: persistenceResult.error
      };

      if (!persistenceResult.success) {
        throw new Error(`Persistence failed: ${persistenceResult.error}`);
      }

      runnerContext.metadata = {
        ...runnerContext.metadata,
        persistence: persistenceResult
      };

      if (config.enableNotifications) {
        console.log(`[RecommendationRunner] Executing Notify node`);
        const notifyResult = await this.nodes.notify.execute(runnerContext);
        nodeResults.notify = {
          success: notifyResult.success,
          executionTime: notifyResult.metadata?.executionTime || 0,
          processedCount: notifyResult.metadata?.processedCount,
          error: notifyResult.error
        };

        if (!notifyResult.success) {
          console.warn(`[RecommendationRunner] Notify failed: ${notifyResult.error}`);
          errors.push(`Notify failed: ${notifyResult.error}`);
        }

        runnerContext.metadata = {
          ...runnerContext.metadata,
          notify: notifyResult
        };
      }

      totalUsers = featuresResult.data?.length || 0;
      successfulUsers = totalUsers;
      failedUsers = 0;

    } catch (error) {
      console.error(`[RecommendationRunner] Execution failed: ${error}`);
      errors.push(error.toString());
      failedUsers = totalUsers;
      successfulUsers = 0;
    }

    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    const result: RunnerResult = {
      success: errors.length === 0,
      totalUsers,
      successfulUsers,
      failedUsers,
      executionTime,
      nodeResults,
      errors,
      metadata: {
        startTime,
        endTime,
        config
      }
    };

    console.log(`[RecommendationRunner] Execution completed in ${executionTime}ms`);
    console.log(`[RecommendationRunner] Users processed: ${successfulUsers}/${totalUsers}`);
    console.log(`[RecommendationRunner] Errors: ${errors.length}`);

    return result;
  }

  async runForUser(userId: string, options: Partial<RunnerContext> = {}): Promise<RunnerResult> {
    return this.run({
      userId,
      userIds: [userId],
      config: recommendationConfig.getConfig(),
      ...options
    });
  }

  async runForAllUsers(options: Partial<RunnerContext> = {}): Promise<RunnerResult> {
    return this.run({
      config: recommendationConfig.getConfig(),
      ...options
    });
  }

  async runForSegment(userIds: string[], options: Partial<RunnerContext> = {}): Promise<RunnerResult> {
    return this.run({
      userIds,
      config: recommendationConfig.getConfig(),
      ...options
    });
  }
}
