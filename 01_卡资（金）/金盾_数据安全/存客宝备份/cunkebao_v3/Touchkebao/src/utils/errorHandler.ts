/**
 * 错误处理工具
 * 统一处理应用中的错误，包括错误记录、错误上报、错误恢复等
 */

import { captureError, captureMessage } from "./sentry";
import { performanceMonitor } from "./performance";

/**
 * 错误类型
 */
export enum ErrorType {
  NETWORK = "network",
  API = "api",
  VALIDATION = "validation",
  PERMISSION = "permission",
  UNKNOWN = "unknown",
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  type?: ErrorType;
  severity?: ErrorSeverity;
  component?: string;
  action?: string;
  userId?: number;
  metadata?: Record<string, any>;
}

/**
 * 错误处理结果
 */
export interface ErrorHandleResult {
  handled: boolean;
  recoverable: boolean;
  message?: string;
  retry?: () => Promise<void>;
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private readonly MAX_ERROR_COUNT = 10; // 同一错误最多记录10次
  private readonly ERROR_WINDOW = 60000; // 1分钟内的错误计数窗口

  /**
   * 处理错误
   */
  handleError(
    error: Error | string,
    context?: ErrorContext,
  ): ErrorHandleResult {
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorKey = `${errorMessage}_${context?.component || "unknown"}`;

    // 检查错误频率（防止错误风暴）
    const count = this.errorCounts.get(errorKey) || 0;
    if (count >= this.MAX_ERROR_COUNT) {
      console.warn(`错误频率过高，已忽略: ${errorKey}`);
      return {
        handled: false,
        recoverable: false,
        message: "错误频率过高，已自动忽略",
      };
    }

    // 更新错误计数
    this.errorCounts.set(errorKey, count + 1);
    setTimeout(() => {
      const currentCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, Math.max(0, currentCount - 1));
    }, this.ERROR_WINDOW);

    // 记录错误
    const errorObj =
      typeof error === "string" ? new Error(error) : error;

    console.error("错误处理:", errorObj, context);

    // 性能监控：记录错误（使用measure方法）
    performanceMonitor.measure(
      `ErrorHandler.${context?.type || ErrorType.UNKNOWN}`,
      () => {
        // 错误已记录，这里只是用于性能监控
      },
      {
        error: errorMessage,
        severity: context?.severity || ErrorSeverity.MEDIUM,
        component: context?.component,
        action: context?.action,
        ...context?.metadata,
      },
    );

    // 根据错误类型处理
    const result = this.handleErrorByType(errorObj, context);

    // 发送到Sentry（根据严重程度）
    if (
      context?.severity === ErrorSeverity.HIGH ||
      context?.severity === ErrorSeverity.CRITICAL
    ) {
      try {
        captureError(errorObj, {
          tags: {
            type: context?.type || ErrorType.UNKNOWN,
            severity: context?.severity || ErrorSeverity.MEDIUM,
            component: context?.component || "unknown",
          },
          extra: {
            action: context?.action,
            userId: context?.userId,
            ...context?.metadata,
          },
        });
      } catch (sentryError) {
        console.warn("发送错误到Sentry失败:", sentryError);
      }
    }

    return result;
  }

  /**
   * 根据错误类型处理
   */
  private handleErrorByType(
    error: Error,
    context?: ErrorContext,
  ): ErrorHandleResult {
    const type = context?.type || this.detectErrorType(error);

    switch (type) {
      case ErrorType.NETWORK:
        return {
          handled: true,
          recoverable: true,
          message: "网络错误，请检查网络连接",
          retry: async () => {
            // 可以在这里实现重试逻辑
            await new Promise(resolve => setTimeout(resolve, 1000));
          },
        };

      case ErrorType.API:
        return {
          handled: true,
          recoverable: true,
          message: "API请求失败，请稍后重试",
          retry: async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
          },
        };

      case ErrorType.VALIDATION:
        return {
          handled: true,
          recoverable: false,
          message: "数据验证失败，请检查输入",
        };

      case ErrorType.PERMISSION:
        return {
          handled: true,
          recoverable: false,
          message: "权限不足，无法执行此操作",
        };

      default:
        return {
          handled: true,
          recoverable: false,
          message: "发生未知错误，请刷新页面重试",
        };
    }
  }

  /**
   * 检测错误类型
   */
  private detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout")
    ) {
      return ErrorType.NETWORK;
    }

    if (
      message.includes("api") ||
      message.includes("http") ||
      message.includes("status")
    ) {
      return ErrorType.API;
    }

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required")
    ) {
      return ErrorType.VALIDATION;
    }

    if (
      message.includes("permission") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return ErrorType.PERMISSION;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 处理Promise错误
   */
  async handlePromiseError<T>(
    promise: Promise<T>,
    context?: ErrorContext,
  ): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context,
      );
      return null;
    }
  }

  /**
   * 创建错误处理包装函数
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: ErrorContext,
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          {
            ...context,
            action: context?.action || fn.name,
          },
        );
        throw error;
      }
    }) as T;
  }

  /**
   * 清空错误计数
   */
  clearErrorCounts(): void {
    this.errorCounts.clear();
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number;
    errorTypes: Record<string, number>;
  } {
    const errorTypes: Record<string, number> = {};
    let totalErrors = 0;

    this.errorCounts.forEach((count, key) => {
      totalErrors += count;
      const type = key.split("_")[0];
      errorTypes[type] = (errorTypes[type] || 0) + count;
    });

    return {
      totalErrors,
      errorTypes,
    };
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler();

/**
 * 错误处理Hook（用于React组件）
 */
export function useErrorHandler() {
  return {
    handleError: (error: Error | string, context?: ErrorContext) =>
      errorHandler.handleError(error, context),
    handlePromiseError: <T>(
      promise: Promise<T>,
      context?: ErrorContext,
    ) => errorHandler.handlePromiseError(promise, context),
    wrapAsync: <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      context?: ErrorContext,
    ) => errorHandler.wrapAsync(fn, context),
  };
}

/**
 * 错误处理装饰器（用于类方法）
 */
export function handleErrors(context?: ErrorContext) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    if (typeof originalMethod === "function") {
      descriptor.value = async function (...args: any[]) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          errorHandler.handleError(
            error instanceof Error ? error : new Error(String(error)),
            {
              ...context,
              component: target.constructor.name,
              action: propertyKey,
            },
          );
          throw error;
        }
      };
    }

    return descriptor;
  };
}
