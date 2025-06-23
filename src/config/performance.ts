// 性能优化配置

export const PerformanceConfig = {
  // RSS 抓取配置
  rss: {
    // 请求超时时间（毫秒）
    timeout: 10000,
    // 重试次数
    retryCount: 3,
    // 重试间隔（毫秒）
    retryDelay: 1000,
    // 最大文章数量（避免内存溢出）
    maxArticles: 100,
    // 用户代理
    userAgent: 'NodeSeeker RSS Bot 1.0'
  },

  // 数据库配置
  database: {
    // 查询超时时间（毫秒）
    queryTimeout: 5000,
    // 批量操作大小
    batchSize: 50,
    // 连接池大小（D1 自动管理）
    maxConnections: 10,
    // 数据保留天数
    dataRetentionDays: 30
  },

  // Telegram 配置
  telegram: {
    // API 请求超时时间（毫秒）
    timeout: 8000,
    // 重试次数
    retryCount: 2,
    // 重试间隔（毫秒）
    retryDelay: 500,
    // 消息发送间隔（避免频率限制）
    messageInterval: 100,
    // 最大消息长度
    maxMessageLength: 4096
  },

  // 缓存配置
  cache: {
    // RSS 缓存时间（秒）
    rssCacheTtl: 300, // 5分钟
    // API 响应缓存时间（秒）
    apiCacheTtl: 60, // 1分钟
    // 静态资源缓存时间（秒）
    staticCacheTtl: 86400 // 24小时
  },

  // 速率限制配置
  rateLimit: {
    // API 请求限制（每分钟）
    apiRequestsPerMinute: 200,
    // Telegram 消息限制（每分钟）
    telegramMessagesPerMinute: 30,
    // RSS 抓取限制（每小时）
    rssRequestsPerHour: 12
  },

  // 内存优化配置
  memory: {
    // 最大处理文章数（单次）
    maxProcessingArticles: 50,
    // 垃圾回收阈值
    gcThreshold: 0.8,
    // 大对象阈值（字节）
    largeObjectThreshold: 1024 * 1024 // 1MB
  },

  // 错误处理配置
  errorHandling: {
    // 最大错误重试次数
    maxRetries: 3,
    // 错误重试间隔（毫秒）
    retryDelay: 1000,
    // 错误日志级别
    logLevel: 'error',
    // 是否发送错误通知
    sendErrorNotifications: true
  },

  // 监控配置
  monitoring: {
    // 性能指标收集间隔（毫秒）
    metricsInterval: 60000, // 1分钟
    // 日志保留天数
    logRetentionDays: 7,
    // 是否启用详细日志
    verboseLogging: false,
    // 关键指标阈值
    thresholds: {
      responseTime: 5000, // 5秒
      errorRate: 0.05, // 5%
      memoryUsage: 0.8 // 80%
    }
  }
};

// 环境特定配置
export const getEnvironmentConfig = (environment: string) => {
  const baseConfig = PerformanceConfig;

  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        rss: {
          ...baseConfig.rss,
          timeout: 15000, // 生产环境更长的超时时间
          maxArticles: 200
        },
        database: {
          ...baseConfig.database,
          dataRetentionDays: 90 // 生产环境保留更长时间
        },
        monitoring: {
          ...baseConfig.monitoring,
          verboseLogging: false,
          logRetentionDays: 30
        }
      };

    case 'development':
      return {
        ...baseConfig,
        rss: {
          ...baseConfig.rss,
          timeout: 5000,
          maxArticles: 20
        },
        monitoring: {
          ...baseConfig.monitoring,
          verboseLogging: true,
          logRetentionDays: 3
        }
      };

    default:
      return baseConfig;
  }
};

// 性能监控工具
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  // 开始计时
  startTimer(name: string): void {
    this.startTimes.set(name, Date.now());
  }

  // 结束计时并记录
  endTimer(name: string): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(name);

    // 记录指标
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(duration);

    // 保持最近100个值
    if (values.length > 100) {
      values.shift();
    }

    return duration;
  }

  // 获取平均值
  getAverage(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return 0;
    }

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // 获取最大值
  getMax(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return 0;
    }

    return Math.max(...values);
  }

  // 获取最小值
  getMin(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return 0;
    }

    return Math.min(...values);
  }

  // 获取所有指标
  getAllMetrics(): Record<string, { avg: number; max: number; min: number; count: number }> {
    const result: Record<string, { avg: number; max: number; min: number; count: number }> = {};

    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[name] = {
          avg: this.getAverage(name),
          max: this.getMax(name),
          min: this.getMin(name),
          count: values.length
        };
      }
    }

    return result;
  }

  // 清除指标
  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 性能装饰器
export function measurePerformance(name: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTimer(name);
      try {
        const result = await method.apply(this, args);
        const duration = performanceMonitor.endTimer(name);
        console.log(`${name} completed in ${duration}ms`);
        return result;
      } catch (error) {
        performanceMonitor.endTimer(name);
        throw error;
      }
    };

    return descriptor;
  };
}

// 内存使用监控
export function getMemoryUsage(): { used: number; total: number; percentage: number } {
  // Cloudflare Workers 没有直接的内存监控 API
  // 这里返回模拟数据，实际使用中可以通过其他方式监控
  return {
    used: 0,
    total: 128 * 1024 * 1024, // 128MB 默认限制
    percentage: 0
  };
}

// 健康检查
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  metrics: Record<string, any>;
}> {
  const checks: Record<string, boolean> = {};
  
  // RSS 源检查
  try {
    const response = await fetch('https://rss.nodeseek.com/', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    checks.rssSource = response.ok;
  } catch {
    checks.rssSource = false;
  }

  // 内存检查
  const memory = getMemoryUsage();
  checks.memory = memory.percentage < 0.9;

  // 性能指标检查
  const metrics = performanceMonitor.getAllMetrics();
  checks.performance = Object.values(metrics).every(m => m.avg < 5000);

  // 确定整体状态
  const healthyChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.values(checks).length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (healthyChecks === totalChecks) {
    status = 'healthy';
  } else if (healthyChecks >= totalChecks * 0.7) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    checks,
    metrics: {
      performance: metrics,
      memory: memory,
      timestamp: new Date().toISOString()
    }
  };
}
