import { PerformanceConfig } from '../config/performance';

export interface QueryMetrics {
  queryType: string;
  duration: number;
  timestamp: number;
  parameters?: any;
  resultCount?: number;
  cacheHit?: boolean;
}

export interface SystemMetrics {
  memoryUsage: number;
  cacheSize: number;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: QueryMetrics[];
}

export class PerformanceMonitor {
  private queryMetrics: QueryMetrics[] = [];
  private readonly MAX_METRICS = 1000; // 保留最近1000次查询记录
  private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms以上认为是慢查询

  /**
   * 记录查询性能指标
   */
  recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // 保持数组大小在限制内
    if (this.queryMetrics.length > this.MAX_METRICS) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS);
    }

    // 记录慢查询
    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`慢查询检测: ${metrics.queryType} 耗时 ${metrics.duration}ms`, {
        parameters: metrics.parameters,
        timestamp: new Date(metrics.timestamp).toISOString()
      });
    }
  }

  /**
   * 创建查询计时器
   */
  startTimer(queryType: string, parameters?: any): (resultCount?: number, cacheHit?: boolean) => void {
    const startTime = Date.now();
    
    return (resultCount?: number, cacheHit: boolean = false) => {
      const duration = Date.now() - startTime;
      this.recordQuery({
        queryType,
        duration,
        timestamp: startTime,
        parameters,
        resultCount,
        cacheHit
      });
    };
  }

  /**
   * 获取系统性能指标
   */
  getSystemMetrics(): SystemMetrics {
    const recentQueries = this.queryMetrics.filter(
      m => Date.now() - m.timestamp < 60000 // 最近1分钟
    );

    const totalDuration = recentQueries.reduce((sum, m) => sum + m.duration, 0);
    const averageQueryTime = recentQueries.length > 0 ? totalDuration / recentQueries.length : 0;

    const slowQueries = this.queryMetrics
      .filter(m => m.duration > this.SLOW_QUERY_THRESHOLD)
      .slice(-20); // 最近20个慢查询

    return {
      memoryUsage: this.getMemoryUsage(),
      cacheSize: this.getCacheSize(),
      queryCount: recentQueries.length,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowQueries
    };
  }

  /**
   * 获取查询统计信息
   */
  getQueryStats(timeWindow: number = 300000): {
    totalQueries: number;
    cacheHitRate: number;
    slowQueryCount: number;
    queryTypeBreakdown: Record<string, number>;
  } {
    const windowStart = Date.now() - timeWindow;
    const relevantQueries = this.queryMetrics.filter(
      m => m.timestamp >= windowStart
    );

    const cacheHits = relevantQueries.filter(m => m.cacheHit).length;
    const cacheHitRate = relevantQueries.length > 0 ? cacheHits / relevantQueries.length : 0;

    const slowQueryCount = relevantQueries.filter(
      m => m.duration > this.SLOW_QUERY_THRESHOLD
    ).length;

    const queryTypeBreakdown: Record<string, number> = {};
    relevantQueries.forEach(m => {
      queryTypeBreakdown[m.queryType] = (queryTypeBreakdown[m.queryType] || 0) + 1;
    });

    return {
      totalQueries: relevantQueries.length,
      cacheHitRate: Math.round(cacheHitRate * 100 * 100) / 100, // 保留2位小数
      slowQueryCount,
      queryTypeBreakdown
    };
  }

  /**
   * 清理旧的性能指标
   */
  cleanup(): void {
    const cutoff = Date.now() - 3600000; // 保留1小时内的数据
    this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * 获取内存使用情况（估算）
   */
  private getMemoryUsage(): number {
    // 简单的内存使用估算
    return this.queryMetrics.length * 200; // 每条记录约200字节
  }

  /**
   * 获取缓存大小（需要从外部传入）
   */
  private getCacheSize(): number {
    // 这里应该从缓存服务获取实际大小
    return 0;
  }

  /**
   * 获取性能建议
   */
  getPerformanceRecommendations(): string[] {
    const stats = this.getQueryStats();
    const systemMetrics = this.getSystemMetrics();
    const recommendations: string[] = [];

    // 缓存命中率建议
    if (stats.cacheHitRate < 50) {
      recommendations.push('缓存命中率较低，建议检查缓存策略和TTL设置');
    }

    // 平均查询时间建议
    if (systemMetrics.averageQueryTime > 50) {
      recommendations.push('平均查询时间较长，建议优化查询语句或添加索引');
    }

    // 慢查询建议
    if (stats.slowQueryCount > stats.totalQueries * 0.1) {
      recommendations.push('慢查询比例较高，建议检查数据库索引和查询优化');
    }

    // 查询频率建议
    if (stats.totalQueries > 1000) {
      recommendations.push('查询频率较高，建议增加缓存时间或实现查询合并');
    }

    if (recommendations.length === 0) {
      recommendations.push('系统性能表现良好');
    }

    return recommendations;
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 查询性能装饰器
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryType: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const endTimer = performanceMonitor.startTimer(queryType, args);
    
    try {
      const result = await fn(...args);
      const resultCount = Array.isArray(result) ? result.length : 1;
      endTimer(resultCount, false);
      return result;
    } catch (error) {
      endTimer(0, false);
      throw error;
    }
  }) as T;
}

/**
 * 缓存性能装饰器
 */
export function withCacheMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryType: string,
  fn: T,
  cacheGetter: (...args: any[]) => any,
  cacheSetter: (key: string, value: any) => void
): T {
  return (async (...args: any[]) => {
    const cacheKey = JSON.stringify(args);
    const cached = cacheGetter(...args);
    
    if (cached !== null) {
      const endTimer = performanceMonitor.startTimer(queryType, args);
      endTimer(Array.isArray(cached) ? cached.length : 1, true);
      return cached;
    }

    const endTimer = performanceMonitor.startTimer(queryType, args);
    
    try {
      const result = await fn(...args);
      const resultCount = Array.isArray(result) ? result.length : 1;
      endTimer(resultCount, false);
      
      cacheSetter(cacheKey, result);
      return result;
    } catch (error) {
      endTimer(0, false);
      throw error;
    }
  }) as T;
} 