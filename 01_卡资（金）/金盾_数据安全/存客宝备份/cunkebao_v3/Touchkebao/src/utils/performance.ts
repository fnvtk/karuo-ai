/**
 * 性能监控工具
 * 用于测量和记录性能指标
 */

/**
 * 性能测量结果
 */
export interface PerformanceResult {
  name: string;
  duration: number; // 毫秒
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 性能监控类
 */
class PerformanceMonitor {
  private results: PerformanceResult[] = [];
  private maxResults = 1000; // 最多保存1000条记录

  /**
   * 测量函数执行时间
   */
  measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>,
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const end = performance.now();
      this.record(name, end - start, metadata);
      return result;
    } catch (error) {
      const end = performance.now();
      this.record(name, end - start, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * 异步测量函数执行时间
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      this.record(name, end - start, metadata);
      return result;
    } catch (error) {
      const end = performance.now();
      this.record(name, end - start, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * 记录性能结果
   */
  private record(
    name: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    const result: PerformanceResult = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.results.push(result);

    // 限制结果数量
    if (this.results.length > this.maxResults) {
      this.results.shift();
    }

    // 开发环境下输出到控制台
    if (import.meta.env.DEV) {
      const color = duration > 100 ? "🔴" : duration > 50 ? "🟡" : "🟢";
      console.log(
        `${color} [Performance] ${name}: ${duration.toFixed(2)}ms`,
        metadata || "",
      );
    }
  }

  /**
   * 获取性能统计
   */
  getStats(name?: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
    results: PerformanceResult[];
  } {
    const filtered = name
      ? this.results.filter(r => r.name === name)
      : this.results;

    if (filtered.length === 0) {
      return {
        count: 0,
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        results: [],
      };
    }

    const durations = filtered.map(r => r.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / filtered.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      count: filtered.length,
      total,
      average,
      min,
      max,
      results: filtered,
    };
  }

  /**
   * 获取所有结果
   */
  getAllResults(): PerformanceResult[] {
    return [...this.results];
  }

  /**
   * 清空结果
   */
  clear(): void {
    this.results = [];
  }

  /**
   * 导出结果（用于分析）
   */
  export(): string {
    return JSON.stringify(this.results, null, 2);
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能测量装饰器（用于类方法）
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    if (typeof originalMethod === "function") {
      descriptor.value = function (...args: any[]) {
        return performanceMonitor.measure(methodName, () =>
          originalMethod.apply(this, args),
        );
      };
    }

    return descriptor;
  };
}

/**
 * 性能测量Hook（用于React组件）
 * 注意：需要在React组件中使用，需要导入React
 */
export function usePerformanceMeasure(name: string) {
  // 注意：这个Hook需要在React组件中使用
  // 由于可能造成循环依赖，建议在组件中直接使用performanceMonitor.measure
  const startRef = { current: performance.now() };

  // 返回清理函数
  return () => {
    if (startRef.current !== null) {
      const duration = performance.now() - startRef.current;
      performanceMonitor.record(name, duration);
    }
  };
}
