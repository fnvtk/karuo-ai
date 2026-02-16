import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "@/store/module/user";

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, isLoggedIn } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 检查是否已登录
    if (!isLoggedIn || !user) {
      const currentPath = location.pathname + location.search;
      navigate(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    // 检查角色权限（如果需要）
    if (requiredRole && user.isAdmin !== 1) {
      navigate("/");
      return;
    }
  }, [isLoggedIn, user, requiredRole, navigate, location]);

  // 如果未登录，不渲染子组件
  if (!isLoggedIn || !user) {
    return null;
  }

  // 如果角色不匹配，不渲染子组件
  if (requiredRole && user.isAdmin !== 1) {
    return null;
  }

  return <>{children}</>;
};

export default PermissionRoute;
