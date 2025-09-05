
export interface RecommendationConfig {
  topK: number;
  recencyDays: number;
  strategy: 'cooccurrence' | 'content' | 'hybrid';
  weightPurchase: number;
  weightView: number;
  weightFavorite: number;
  cronDaily: string;
  cronWeekly: string;
  excludeRecentPurchaseDays: number;
  batchSize: number;
  cacheTtl: number;
  maxNotificationsPerUser: number;
  notificationCooldownHours: number;
  enableNotifications: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
}

class RecommendationConfigService {
  private config: RecommendationConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): RecommendationConfig {
    return {
      topK: parseInt(process.env.RECS_TOPK || '12'),
      recencyDays: parseInt(process.env.RECS_RECENCY_DAYS || '90'),
      strategy: (process.env.RECS_STRATEGY as 'cooccurrence' | 'content' | 'hybrid') || 'hybrid',
      weightPurchase: parseFloat(process.env.RECS_WEIGHT_PURCHASE || '0.6'),
      weightView: parseFloat(process.env.RECS_WEIGHT_VIEW || '0.3'),
      weightFavorite: parseFloat(process.env.RECS_WEIGHT_FAVORITE || '0.1'),
      cronDaily: process.env.RECS_CRON_DAILY || '0 3 * * *',
      cronWeekly: process.env.RECS_CRON_WEEKLY || '0 2 * * 0',
      excludeRecentPurchaseDays: parseInt(process.env.RECS_EXCLUDE_RECENT_PURCHASE_DAYS || '14'),
      batchSize: parseInt(process.env.RECS_BATCH_SIZE || '100'),
      cacheTtl: parseInt(process.env.RECS_CACHE_TTL || '86400'),
      maxNotificationsPerUser: parseInt(process.env.RECS_MAX_NOTIFICATIONS_PER_USER || '3'),
      notificationCooldownHours: parseInt(process.env.RECS_NOTIFICATION_COOLDOWN_HOURS || '24'),
      enableNotifications: process.env.RECS_ENABLE_NOTIFICATIONS === 'true',
      enableEmailNotifications: process.env.RECS_ENABLE_EMAIL_NOTIFICATIONS === 'true',
      enablePushNotifications: process.env.RECS_ENABLE_PUSH_NOTIFICATIONS === 'true',
    };
  }

  getConfig(): RecommendationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<RecommendationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  validateWeights(): boolean {
    const { weightPurchase, weightView, weightFavorite } = this.config;
    const total = weightPurchase + weightView + weightFavorite;
    return Math.abs(total - 1.0) < 0.01;
  }

  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.config.topK <= 0) {
      errors.push('topK must be greater than 0');
    }
    
    if (this.config.recencyDays <= 0) {
      errors.push('recencyDays must be greater than 0');
    }
    
    if (!['cooccurrence', 'content', 'hybrid'].includes(this.config.strategy)) {
      errors.push('strategy must be one of: cooccurrence, content, hybrid');
    }
    
    if (!this.validateWeights()) {
      errors.push('Weights must sum to 1.0');
    }
    
    if (this.config.batchSize <= 0) {
      errors.push('batchSize must be greater than 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const recommendationConfig = new RecommendationConfigService();
