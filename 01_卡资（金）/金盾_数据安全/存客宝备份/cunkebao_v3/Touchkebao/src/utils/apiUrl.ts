/**
 * API URL工具函数
 * 用于统一处理API地址的拼接逻辑
 *
 * URL结构: {VITE_API_BASE_URL}/v1/api/scenarios/{path}
 *
 * 示例:
 * - 开发环境: http://localhost:3000/api/v1/api/scenarios/webhook/123
 * - 生产环境: https://api.example.com/v1/api/scenarios/webhook/123
 */

/**
 * 获取完整的API基础路径
 * @returns 完整的API基础路径，包含 /v1/api/scenarios
 *
 * 示例:
 * - 开发环境: http://localhost:3000/api/v1/api/scenarios
 * - 生产环境: https://api.example.com/v1/api/scenarios
 */
export const getFullApiPath = (): string => {
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
  return `${apiBaseUrl}/v1/api/scenarios`;
};

/**
 * 构建完整的API URL
 * @param path 相对路径或完整URL
 * @returns 完整的API URL
 *
 * 示例:
 * - buildApiUrl('/webhook/123') → 'http://localhost:3000/api/v1/api/scenarios/webhook/123'
 * - buildApiUrl('webhook/123') → 'http://localhost:3000/api/v1/api/scenarios/webhook/123'
 * - buildApiUrl('https://api.example.com/webhook/123') → 'https://api.example.com/webhook/123'
 */
export const buildApiUrl = (path: string): string => {
  if (!path) return "";

  // 如果已经是完整的URL（包含http或https），直接返回
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const fullApiPath = getFullApiPath();

  // 如果是相对路径，拼接完整API路径
  if (path.startsWith("/")) {
    return `${fullApiPath}${path}`;
  }

  // 其他情况，拼接完整API路径和路径
  return `${fullApiPath}?${path}`;
};

/**
 * 构建webhook URL
 * @param taskId 任务ID
 * @param path 可选的相对路径
 * @returns 完整的webhook URL
 *
 * 示例:
 * - buildWebhookUrl('123') → 'http://localhost:3000/api/v1/api/scenarios/webhook/123'
 * - buildWebhookUrl('123', '/custom/path') → 'http://localhost:3000/api/v1/api/scenarios/custom/path'
 */
export const buildWebhookUrl = (taskId: string, path?: string): string => {
  const fullApiPath = getFullApiPath();
  const webhookPath = path || `/webhook/${taskId}`;

  if (webhookPath.startsWith("/")) {
    return `${fullApiPath}${webhookPath}`;
  }

  return `${fullApiPath}/${webhookPath}`;
};
