// import type { Strapi } from '@strapi/strapi';
import { RecommendationRunner } from './recommendation-runner.service';
import { RecommendationCronService } from './recommendation-cron.service';
import { recommendationConfig } from './recommendation-config.service';

export class RecommendationEngineService {
  private strapi: any;
  private runner: RecommendationRunner;
  private cronService: RecommendationCronService;
  private isInitialized = false;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.runner = new RecommendationRunner(strapi);
    this.cronService = new RecommendationCronService(strapi);
  }

  /**
   * Initialize the recommendation engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[RecommendationEngine] Already initialized');
      return;
    }

    try {
      console.log('[RecommendationEngine] Initializing recommendation engine...');

      // Validate configuration
      const validation = recommendationConfig.validateConfig();
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize cron service
      await this.cronService.initialize();

      this.isInitialized = true;
      console.log('[RecommendationEngine] Recommendation engine initialized successfully');

    } catch (error) {
      console.error('[RecommendationEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get the recommendation runner
   */
  getRunner(): RecommendationRunner {
    return this.runner;
  }

  /**
   * Get the cron service
   */
  getCronService(): RecommendationCronService {
    return this.cronService;
  }

  /**
   * Get engine status
   */
  getStatus(): {
    initialized: boolean;
    cronStatus: { isRunning: boolean; jobs: string[] };
    config: any;
  } {
    return {
      initialized: this.isInitialized,
      cronStatus: this.cronService.getStatus(),
      config: recommendationConfig.getConfig()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: any): void {
    recommendationConfig.updateConfig(updates);
    console.log('[RecommendationEngine] Configuration updated');
  }

  /**
   * Shutdown the recommendation engine
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log('[RecommendationEngine] Shutting down recommendation engine...');
    
    // Stop cron jobs
    this.cronService.stopAll();
    
    this.isInitialized = false;
    console.log('[RecommendationEngine] Recommendation engine shut down successfully');
  }
}
