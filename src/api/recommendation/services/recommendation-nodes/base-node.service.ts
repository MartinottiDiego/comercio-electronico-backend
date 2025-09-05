// import type { Strapi } from '@strapi/strapi';

export interface NodeContext {
  userId?: string;
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
  config: any;
  metadata?: Record<string, any>;
}

export interface NodeResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processedCount?: number;
    executionTime?: number;
    nodeName: string;
  };
}

export abstract class BaseNode {
  protected strapi: any;
  protected nodeName: string;

  constructor(strapi: any, nodeName: string) {
    this.strapi = strapi;
    this.nodeName = nodeName;
  }

  abstract execute(context: NodeContext): Promise<NodeResult>;

  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.nodeName}] ${level.toUpperCase()}: ${message}`);
  }

  protected async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const executionTime = Date.now() - startTime;
      return { result, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw { error, executionTime };
    }
  }

  protected createSuccessResult<T>(
    data: T,
    metadata?: Partial<NodeResult['metadata']>
  ): NodeResult<T> {
    return {
      success: true,
      data,
      metadata: {
        nodeName: this.nodeName,
        ...metadata
      }
    };
  }

  protected createErrorResult(
    error: string,
    metadata?: Partial<NodeResult['metadata']>
  ): NodeResult {
    return {
      success: false,
      error,
      metadata: {
        nodeName: this.nodeName,
        ...metadata
      }
    };
  }
}
