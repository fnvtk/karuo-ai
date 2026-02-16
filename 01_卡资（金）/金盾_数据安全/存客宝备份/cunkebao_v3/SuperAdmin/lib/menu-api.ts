import { apiRequest, ApiResponse } from './api-utils';

/**
 * 菜单项接口
 */
export interface MenuItem {
  id: number;
  title: string;
  path: string;
  icon?: string;
  parent_id: number;
  status: number;
  sort: number;
  children?: MenuItem[];
}

/**
 * 获取菜单树
 * @param onlyEnabled 是否只获取启用的菜单
 * @returns 菜单树
 */
export async function getMenus(onlyEnabled: boolean = true): Promise<MenuItem[]> {
  try {
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('only_enabled', onlyEnabled ? '1' : '0');
    
    // 禁用缓存，每次都获取最新的基于用户权限的菜单
    params.append('use_cache', '0');
    
    const response = await apiRequest<MenuItem[]>(`/menu/tree?${params.toString()}`);
    
    return response.data || [];
  } catch (error) {
    console.error('获取菜单树失败:', error);
    return [];
  }
}

/**
 * 获取菜单列表
 * @param page 页码
 * @param limit 每页数量
 * @returns 菜单列表
 */
export async function getMenuList(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<{
  list: MenuItem[];
  total: number;
  page: number;
  limit: number;
}>> {
  // 构建查询参数
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  return apiRequest(`/menu/list?${params.toString()}`);
}

/**
 * 保存菜单（新增或更新）
 * @param menuData 菜单数据
 * @returns 保存结果
 */
export async function saveMenu(menuData: Partial<MenuItem>): Promise<boolean> {
  try {
    const response = await apiRequest('/menu/save', 'POST', menuData);
    
    return response.code === 200;
  } catch (error) {
    console.error('保存菜单失败:', error);
    return false;
  }
}

/**
 * 删除菜单
 * @param id 菜单ID
 * @returns 删除结果
 */
export async function deleteMenu(id: number): Promise<boolean> {
  try {
    const response = await apiRequest(`/menu/delete/${id}`, 'DELETE');
    
    return response.code === 200;
  } catch (error) {
    console.error('删除菜单失败:', error);
    return false;
  }
}

/**
 * 更新菜单状态
 * @param id 菜单ID
 * @param status 状态：1启用，0禁用
 * @returns 更新结果
 */
export async function updateMenuStatus(id: number, status: 0 | 1): Promise<boolean> {
  try {
    const response = await apiRequest('/menu/status', 'POST', {
      id,
      status
    });
    
    return response.code === 200;
  } catch (error) {
    console.error('更新菜单状态失败:', error);
    return false;
  }
}

/**
 * 获取一级菜单（用于权限设置）
 * @returns 一级菜单列表
 */
export async function getTopLevelMenus(): Promise<ApiResponse<MenuItem[]>> {
  try {
    return await apiRequest<MenuItem[]>('/menu/toplevel');
  } catch (error) {
    console.error('获取一级菜单失败:', error);
    return {
      code: 500,
      msg: '获取一级菜单失败',
      data: []
    };
  }
} 