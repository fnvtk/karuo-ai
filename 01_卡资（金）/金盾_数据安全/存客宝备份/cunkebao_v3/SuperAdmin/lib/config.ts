/**
 * 获取应用配置
 * @returns 应用配置
 */
export function getConfig() {
  // 优先获取环境变量中配置的API地址
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  return {
    apiBaseUrl
  };
} 