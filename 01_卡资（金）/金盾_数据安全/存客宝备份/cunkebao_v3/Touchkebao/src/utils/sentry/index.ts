import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";
import { replayIntegration } from "@sentry/react";

/**
 * 初始化 Sentry
 * 用于错误监控和性能追踪
 */
export const initSentry = () => {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn("Sentry DSN 未配置，跳过初始化");
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      browserTracingIntegration({
        tracingOrigins: [
          "localhost",
          import.meta.env.VITE_API_BASE_URL || "/api",
        ],
      }),
      replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === "development" ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "chrome-extension://",
      "moz-extension://",
    ],
  });
};

/**
 * 手动捕获错误
 */
export const captureError = (
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  },
) => {
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
  });
};

/**
 * 手动捕获消息
 */
export const captureMessage = (
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  },
) => {
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
};

/**
 * 添加性能面包屑
 */
export const addPerformanceBreadcrumb = (
  message: string,
  data?: Record<string, any>,
) => {
  Sentry.addBreadcrumb({
    category: "performance",
    message,
    level: "info",
    data,
  });
};
