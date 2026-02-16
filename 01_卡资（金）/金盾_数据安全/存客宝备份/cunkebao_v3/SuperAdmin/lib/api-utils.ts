import { getConfig } from './config';

/**
 * API响应接口
 */
interface ApiResponse {
  code: number;
  msg: string;
  data?: any;
}

/**
 * API请求函数
 * @param endpoint API端点
 * @param method HTTP方法
 * @param body 请求数据
 * @param headers 请求头
 * @returns API响应
 */
export async function apiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  headers: HeadersInit = {}
): Promise<ApiResponse> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`;
  
  // 从localStorage获取token和admin_id
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const adminId = typeof window !== 'undefined' ? localStorage.getItem('admin_id') : null;
  
  // 设置cookie
  if (typeof window !== 'undefined' && token && adminId) {
    const domain = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || '').hostname;
    document.cookie = `admin_token=${token}; path=/; domain=${domain}`;
    document.cookie = `admin_id=${adminId}; path=/; domain=${domain}`;
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers
  };

  const options: RequestInit = {
    method,
    headers: defaultHeaders,
    credentials: 'include', // 允许跨域请求携带cookies
    mode: 'cors', // 明确指定使用CORS模式
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    // 如果接口返回的code不是200，抛出错误
    if (data && data.code !== 200) {
      // 如果是认证错误，清除登录信息
      if (data.code === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_id');
          localStorage.removeItem('admin_name');
          localStorage.removeItem('admin_account');
          localStorage.removeItem('admin_token');
          // 清除cookie
          const domain = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || '').hostname;
          document.cookie = 'admin_token=; path=/; domain=' + domain + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'admin_id=; path=/; domain=' + domain + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      }
      throw data; // 抛出响应结果作为错误
    }
    
    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
} 