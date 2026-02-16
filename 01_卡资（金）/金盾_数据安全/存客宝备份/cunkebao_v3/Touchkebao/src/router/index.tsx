import React from "react";
import { BrowserRouter, useRoutes, RouteObject } from "react-router-dom";
import PermissionRoute from "./permissionRoute";
import NotFound from "@/pages/404";

// 动态导入所有 module 下的 ts/tsx 路由模块
const modules = import.meta.glob("./module/*.{ts,tsx}", { eager: true });

// 合并所有模块的默认导出（假设每个模块都是 export default 路由数组）
const allRoutes: (RouteObject & { auth?: boolean; requiredRole?: string })[] =
  [];
Object.values(modules).forEach((mod: any) => {
  if (Array.isArray(mod.default)) {
    allRoutes.push(...mod.default);
  }
});

// 权限包装
function wrapWithPermission(
  route: RouteObject & { auth?: boolean; requiredRole?: string },
) {
  if (route.auth) {
    return {
      ...route,
      element: (
        <PermissionRoute requiredRole={route.requiredRole}>
          {route.element}
        </PermissionRoute>
      ),
    };
  }
  return route;
}

// 添加 404 路由（通配符路由，必须放在最后）
const routes = [
  ...allRoutes.map(wrapWithPermission),
  {
    path: "*",
    element: <NotFound />,
    auth: false,
  },
];

const AppRoutes = () => useRoutes(routes);

const AppRouter: React.FC = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AppRoutes />
  </BrowserRouter>
);

export default AppRouter;
