"use client"

import { useToast } from "@/components/ui/use-toast"

// 错误类型
type ErrorType = 'api' | 'auth' | 'network' | 'validation' | 'unknown';

// 错误处理配置
interface ErrorConfig {
  title: string;
  variant: "default" | "destructive" | "success";
  defaultMessage: string;
}

// 不同类型错误的配置
const errorConfigs: Record<ErrorType, ErrorConfig> = {
  api: {
    title: '接口错误',
    variant: 'destructive',
    defaultMessage: '服务器处理请求失败，请稍后再试',
  },
  auth: {
    title: '认证错误',
    variant: 'destructive',
    defaultMessage: '您的登录状态已失效，请重新登录',
  },
  network: {
    title: '网络错误',
    variant: 'destructive',
    defaultMessage: '网络连接失败，请检查您的网络状态',
  },
  validation: {
    title: '数据验证错误',
    variant: 'destructive',
    defaultMessage: '输入数据不正确，请检查后重试',
  },
  unknown: {
    title: '未知错误',
    variant: 'destructive',
    defaultMessage: '发生未知错误，请刷新页面后重试',
  },
};

/**
 * 全局错误处理工具，使用React Hook方式调用
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * 处理API响应错误
   * @param error 错误对象
   * @param customMessage 自定义错误消息
   * @param errorType 错误类型
   */
  const handleError = (
    error: any,
    customMessage?: string,
    errorType: ErrorType = 'api'
  ) => {
    let message = customMessage;
    let type = errorType;

    // 如果是API错误响应
    if (error && error.code !== undefined) {
      switch (error.code) {
        case 401:
          type = 'auth';
          message = error.msg || errorConfigs.auth.defaultMessage;
          
          // 清除登录信息并跳转到登录页
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_id');
            localStorage.removeItem('admin_name');
            localStorage.removeItem('admin_account');
            localStorage.removeItem('admin_token');
            
            // 延迟跳转，确保用户能看到错误提示
            setTimeout(() => {
              window.location.href = '/login';
            }, 1500);
          }
          break;
        case 400:
          type = 'validation';
          message = error.msg || errorConfigs.validation.defaultMessage;
          break;
        case 500:
          message = error.msg || errorConfigs.api.defaultMessage;
          break;
        default:
          message = error.msg || message || errorConfigs[type].defaultMessage;
      }
    } else if (error instanceof Error) {
      // 如果是普通Error对象
      if (error.message.includes('network') || error.message.includes('fetch')) {
        type = 'network';
        message = errorConfigs.network.defaultMessage;
      } else {
        message = error.message || errorConfigs.unknown.defaultMessage;
      }
    }

    // 使用Toast显示错误
    toast({
      title: errorConfigs[type].title,
      description: message || errorConfigs[type].defaultMessage,
      variant: errorConfigs[type].variant,
    });

    // 将错误信息记录到控制台，方便调试
    console.error('Error:', error);
  };

  return { handleError };
}

/**
 * 封装错误处理的高阶函数，用于API请求
 * @param apiFn API函数
 * @param errorMessage 自定义错误消息
 * @param onError 错误发生时的回调函数
 */
export function withErrorHandling<T, Args extends any[]>(
  apiFn: (...args: Args) => Promise<T>,
  errorMessage?: string,
  onError?: (error: any) => void
) {
  return async (...args: Args): Promise<T | null> => {
    try {
      return await apiFn(...args);
    } catch (error) {
      if (typeof window !== 'undefined') {
        // 创建一个临时div来获取toast函数
        const div = document.createElement('div');
        div.style.display = 'none';
        document.body.appendChild(div);
        
        const { handleError } = useErrorHandler();
        handleError(error, errorMessage);
        
        document.body.removeChild(div);
      }
      
      // 调用外部错误处理函数
      if (onError) {
        onError(error);
      }
      
      return null;
    }
  };
} 