import * as cron from 'node-cron';
// import type { Strapi } from '@strapi/strapi';
import { RecommendationRunner } from './recommendation-runner.service';
import { recommendationConfig } from './recommendation-config.service';

export class RecommendationCronService {
  private strapi: any;
  private runner: RecommendationRunner;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.runner = new RecommendationRunner(strapi);
  }

  /**
   * Initialize and start all cron jobs
   */
  async initialize(): Promise<void> {
    const config = recommendationConfig.getConfig();
    
    console.log('[RecommendationCron] Initializing cron jobs...');
    console.log(`[RecommendationCron] Daily cron: ${config.cronDaily}`);
    console.log(`[RecommendationCron] Weekly cron: ${config.cronWeekly}`);

    // Daily job - quick recommendations for active users
    this.scheduleDailyJob();
    
    // Weekly job - comprehensive recommendations for all users
    this.scheduleWeeklyJob();

    console.log('[RecommendationCron] Cron jobs initialized successfully');
  }

  /**
   * Schedule daily recommendation job
   */
  private scheduleDailyJob(): void {
    const config = recommendationConfig.getConfig();
    
    const dailyJob = cron.schedule(config.cronDaily, async () => {
      if (this.isRunning) {
        console.log('[RecommendationCron] Daily job skipped - another job is running');
        return;
      }

      console.log('[RecommendationCron] Starting daily recommendation job');
      await this.executeDailyJob();
    }, {
      timezone: 'UTC'
    });

    this.jobs.set('daily', dailyJob);
    dailyJob.start();
  }

  /**
   * Schedule weekly recommendation job
   */
  private scheduleWeeklyJob(): void {
    const config = recommendationConfig.getConfig();
    
    const weeklyJob = cron.schedule(config.cronWeekly, async () => {
      if (this.isRunning) {
        console.log('[RecommendationCron] Weekly job skipped - another job is running');
        return;
      }

      console.log('[RecommendationCron] Starting weekly recommendation job');
      await this.executeWeeklyJob();
    }, {
      timezone: 'UTC'
    });

    this.jobs.set('weekly', weeklyJob);
    weeklyJob.start();
  }

  /**
   * Execute daily job - quick recommendations for active users
   */
  private async executeDailyJob(): Promise<void> {
    this.isRunning = true;
    const startTime = new Date();

    try {
      // Get active users (logged in within last 7 days)
      const activeUsers = await this.getActiveUsers(7);
      
      if (activeUsers.length === 0) {
        console.log('[RecommendationCron] No active users found for daily job');
        return;
      }

      console.log(`[RecommendationCron] Daily job: Processing ${activeUsers.length} active users`);

      // Run recommendations for active users
      const result = await this.runner.runForSegment(activeUsers, {
        config: {
          ...recommendationConfig.getConfig(),
          topK: 8, // Fewer recommendations for daily job
          recencyDays: 30 // Shorter recency window
        }
      });

      // Log results
      this.logJobResults('daily', result, startTime);

      // Store job execution log
      await this.logJobExecution('daily', result, activeUsers.length);

    } catch (error) {
      console.error('[RecommendationCron] Daily job failed:', error);
      await this.logJobError('daily', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute weekly job - comprehensive recommendations for all users
   */
  private async executeWeeklyJob(): Promise<void> {
    this.isRunning = true;
    const startTime = new Date();

    try {
      // Get all users
      const allUsers = await this.getAllUsers();
      
      if (allUsers.length === 0) {
        console.log('[RecommendationCron] No users found for weekly job');
        return;
      }

      console.log(`[RecommendationCron] Weekly job: Processing ${allUsers.length} users`);

      // Run comprehensive recommendations for all users
      const result = await this.runner.runForAllUsers({
        config: {
          ...recommendationConfig.getConfig(),
          topK: 12, // Full recommendations for weekly job
          recencyDays: 90 // Full recency window
        }
      });

      // Log results
      this.logJobResults('weekly', result, startTime);

      // Store job execution log
      await this.logJobExecution('weekly', result, allUsers.length);

    } catch (error) {
      console.error('[RecommendationCron] Weekly job failed:', error);
      await this.logJobError('weekly', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get active users (logged in within specified days)
   */
  private async getActiveUsers(days: number): Promise<string[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const users = await this.strapi.documents('plugin::users-permissions.user').findMany({
        filters: {
          lastLoginAt: {
            $gte: cutoffDate.toISOString()
          }
        },
        limit: 1000 // Limit to prevent memory issues
      });

      return users.map(user => user.id.toString());
    } catch (error) {
      console.error('[RecommendationCron] Error getting active users:', error);
      return [];
    }
  }

  /**
   * Get all users
   */
  private async getAllUsers(): Promise<string[]> {
    try {
      const users = await this.strapi.documents('plugin::users-permissions.user').findMany({
        limit: 5000 // Reasonable limit
      });

      return users.map(user => user.id.toString());
    } catch (error) {
      console.error('[RecommendationCron] Error getting all users:', error);
      return [];
    }
  }

  /**
   * Log job execution results
   */
  private logJobResults(jobType: string, result: any, startTime: Date): void {
    const executionTime = Date.now() - startTime.getTime();
    
    console.log(`[RecommendationCron] ${jobType} job completed:`);
    console.log(`  - Execution time: ${executionTime}ms`);
    console.log(`  - Total users: ${result.totalUsers}`);
    console.log(`  - Successful: ${result.successfulUsers}`);
    console.log(`  - Failed: ${result.failedUsers}`);
    console.log(`  - Success rate: ${result.totalUsers > 0 ? (result.successfulUsers / result.totalUsers * 100).toFixed(2) : 0}%`);
    
    if (result.errors.length > 0) {
      console.log(`  - Errors: ${result.errors.length}`);
      result.errors.forEach((error: string, index: number) => {
        console.log(`    ${index + 1}. ${error}`);
      });
    }
  }

  /**
   * Log job execution to database
   */
  private async logJobExecution(jobType: string, result: any, userCount: number): Promise<void> {
    try {
      // You might want to create a content-type for job logs
      // For now, we'll just log to console
      console.log(`[RecommendationCron] Job execution logged: ${jobType} - ${userCount} users processed`);
    } catch (error) {
      console.error('[RecommendationCron] Error logging job execution:', error);
    }
  }

  /**
   * Log job error
   */
  private async logJobError(jobType: string, error: any): Promise<void> {
    try {
      console.error(`[RecommendationCron] Job error logged: ${jobType} - ${error.message}`);
    } catch (logError) {
      console.error('[RecommendationCron] Error logging job error:', logError);
    }
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(jobType: 'daily' | 'weekly'): Promise<void> {
    if (this.isRunning) {
      throw new Error('Another job is currently running');
    }

    console.log(`[RecommendationCron] Manually triggering ${jobType} job`);

    switch (jobType) {
      case 'daily':
        await this.executeDailyJob();
        break;
      case 'weekly':
        await this.executeWeeklyJob();
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    console.log('[RecommendationCron] Stopping all cron jobs...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`[RecommendationCron] Stopped ${name} job`);
    }
    
    this.jobs.clear();
  }

  /**
   * Get job status
   */
  getStatus(): { isRunning: boolean; jobs: string[] } {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys())
    };
  }
}
