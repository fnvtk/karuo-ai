/**
 * 错误边界组件
 * 用于捕获React组件树中的JavaScript错误，记录错误信息，并显示降级UI
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Result } from "antd";
import { captureError } from "@/utils/sentry";
import { performanceMonitor } from "@/utils/performance";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 * 使用类组件实现，因为React错误边界必须是类组件
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新state，使下一次渲染能够显示降级UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error("ErrorBoundary捕获到错误:", error, errorInfo);

    // 性能监控：记录错误（使用measure方法）
    performanceMonitor.measure(
      "ErrorBoundary.error",
      () => {
        // 错误已记录，这里只是用于性能监控
      },
      {
        error: error.message,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    );

    // 更新state
    this.setState({
      error,
      errorInfo,
    });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (onErrorError) {
        console.error("onError回调函数执行失败:", onErrorError);
      }
    }

    // 发送错误到Sentry（如果已配置）
    try {
      captureError(error, {
        tags: {
          errorBoundary: "true",
          component: errorInfo.componentStack?.split("\n")[0] || "unknown",
        },
        extra: {
          componentStack: errorInfo.componentStack,
          errorInfo: errorInfo.toString(),
        },
      });
    } catch (sentryError) {
      console.warn("发送错误到Sentry失败:", sentryError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <Result
          status="error"
          title="出现了一些问题"
          subTitle={
            <div>
              <p>抱歉，应用遇到了一个错误。请尝试刷新页面或联系技术支持。</p>
              {import.meta.env.DEV && this.state.error && (
                <details style={{ marginTop: 16, textAlign: "left" }}>
                  <summary style={{ cursor: "pointer", marginBottom: 8 }}>
                    错误详情（开发环境）
                  </summary>
                  <pre
                    style={{
                      background: "#f5f5f5",
                      padding: 12,
                      borderRadius: 4,
                      overflow: "auto",
                      fontSize: 12,
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          }
          extra={[
            <Button
              type="primary"
              key="reload"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>,
            <Button key="reset" onClick={this.handleReset}>
              重试
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 带错误边界的HOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
