import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * MD5加密函数
 */
export function md5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex")
}

/**
 * 管理员信息
 */
export interface AdminInfo {
  id: number;
  name: string;
  account: string;
  token: string;
}

/**
 * 保存管理员信息到本地存储
 * @param adminInfo 管理员信息
 */
export function saveAdminInfo(adminInfo: AdminInfo): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_id', adminInfo.id.toString());
    localStorage.setItem('admin_name', adminInfo.name);
    localStorage.setItem('admin_account', adminInfo.account);
    localStorage.setItem('admin_token', adminInfo.token);
  }
}

/**
 * 获取管理员信息
 * @returns 管理员信息
 */
export function getAdminInfo(): AdminInfo | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const id = localStorage.getItem('admin_id');
  const name = localStorage.getItem('admin_name');
  const account = localStorage.getItem('admin_account');
  const token = localStorage.getItem('admin_token');
  
  if (!id || !name || !account || !token) {
    return null;
  }
  
  return {
    id: parseInt(id, 10),
    name,
    account,
    token
  };
}

/**
 * 清除管理员信息
 */
export function clearAdminInfo(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_account');
    localStorage.removeItem('admin_token');
  }
}

/**
 * 根据当前时间获取问候语
 * @param username 用户名
 * @returns 包含时间段的问候语
 */
export function getGreeting(username: string): string {
  if (typeof window === 'undefined') {
    return `你好，${username}`;
  }
  
  const hours = new Date().getHours();
  
  if (hours >= 0 && hours < 6) {
    return `凌晨好，${username}`;
  } else if (hours >= 6 && hours < 12) {
    return `上午好，${username}`;
  } else if (hours >= 12 && hours < 14) {
    return `中午好，${username}`;
  } else if (hours >= 14 && hours < 18) {
    return `下午好，${username}`;
  } else {
    return `晚上好，${username}`;
  }
}
