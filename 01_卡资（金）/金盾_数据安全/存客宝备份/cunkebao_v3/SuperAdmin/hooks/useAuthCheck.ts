import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 检查用户是否已登录的钩子
 * @param redirectTo 如果未登录，重定向到的路径
 */
export default function useAuthCheck(redirectTo: string = '/login') {
  const router = useRouter();

  useEffect(() => {
    // 检查本地存储中是否有token
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      router.push(redirectTo);
    }
  }, [redirectTo, router]);
} 