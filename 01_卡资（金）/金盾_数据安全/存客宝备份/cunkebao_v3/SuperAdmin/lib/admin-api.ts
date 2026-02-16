import { apiRequest, ApiResponse } from './api-utils';

// 管理员接口数据类型定义
export interface Administrator {
  id: number;
  username: string;
  account: string;
  role: string;
  status: number;
  createdAt: string;
  lastLogin: string;
  permissions: string[];
}

// 管理员详情接口
export interface AdministratorDetail {
  id: number;
  username: string;
  account: string;
  authId: number;
  roleName: string;
  status: number;
  createdAt: string;
  lastLogin: string;
  permissions: string[];
}

// 分页响应数据类型
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 管理员登录
 * @param account 账号
 * @param password 密码
 * @returns 登录结果
 */
export async function login(
  account: string,
  password: string
): Promise<ApiResponse<{
  id: number;
  name: string;
  account: string;
  token: string;
}>> {
  return apiRequest('/auth/login', 'POST', {
    account,
    password
  });
}

/**
 * 获取管理员列表
 * @param page 页码
 * @param limit 每页数量
 * @param keyword 搜索关键词
 * @returns 管理员列表
 */
export async function getAdministrators(
  page: number = 1,
  limit: number = 10,
  keyword: string = ''
): Promise<ApiResponse<PaginatedResponse<Administrator>>> {
  // 构建查询参数
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (keyword) {
    params.append('keyword', keyword);
  }
  
  return apiRequest(`/administrator/list?${params.toString()}`);
}

/**
 * 获取管理员详情
 * @param id 管理员ID
 * @returns 管理员详情
 */
export async function getAdministratorDetail(id: number | string): Promise<ApiResponse<AdministratorDetail>> {
  return apiRequest(`/administrator/detail/${id}`);
}

/**
 * 更新管理员信息
 * @param id 管理员ID
 * @param data 更新的数据
 * @returns 更新结果
 */
export async function updateAdministrator(
  id: number | string,
  data: {
    username: string;
    account: string;
    password?: string;
    permissionIds?: number[];
  }
): Promise<ApiResponse<null>> {
  return apiRequest('/administrator/update', 'POST', {
    id,
    ...data
  });
}

/**
 * 添加管理员
 * @param data 管理员数据
 * @returns 添加结果
 */
export async function addAdministrator(
  data: {
    username: string;
    account: string;
    password: string;
    permissionIds?: number[];
  }
): Promise<ApiResponse<null>> {
  return apiRequest('/administrator/add', 'POST', data);
}

/**
 * 删除管理员
 * @param id 管理员ID
 * @returns 删除结果
 */
export async function deleteAdministrator(id: number | string): Promise<ApiResponse<null>> {
  return apiRequest('/administrator/delete', 'POST', { id });
} 