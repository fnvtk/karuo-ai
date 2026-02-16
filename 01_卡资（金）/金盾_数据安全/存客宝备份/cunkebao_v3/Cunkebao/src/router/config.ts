// 路由配置类型定义
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  auth: boolean;
  requiredRole?: string;
  title?: string;
  icon?: string;
  children?: RouteConfig[];
}

// 路由分组配置
export const routeGroups = {
  // 基础路由
  basic: {
    name: "基础功能",
    routes: ["/", "/login", "/guide", "/scene", "/work", "/mine"],
  },

  // 设备管理
  devices: {
    name: "设备管理",
    routes: ["/mine/devices", "/mine/devices/:id"],
  },

  // 微信号管理
  wechatAccounts: {
    name: "微信号管理",
    routes: ["/wechat-accounts", "/wechat-accounts/:id"],
  },

  // 工作台
  workspace: {
    name: "工作台",
    routes: [
      "/workspace",
      "/workspace/auto-like",
      "/workspace/auto-like/new",
      "/workspace/auto-like/:id",
      "/workspace/auto-like/:id/edit",
      "/workspace/auto-group",
      "/workspace/auto-group/:id",
      "/workspace/group-create",
      "/workspace/group-create/new",
      "/workspace/group-create/:id",
      "/workspace/group-create/:id/groups",
      "/workspace/group-create/:id/groups/:groupId",
      "/workspace/group-create/:id/edit",
      "/workspace/group-push",
      "/workspace/group-push/new",
      "/workspace/group-push/:id",
      "/workspace/group-push/:id/edit",
      "/workspace/moments-sync",
      "/workspace/moments-sync/new",
      "/workspace/moments-sync/:id",
      "/workspace/moments-sync/edit/:id",
      "/workspace/ai-assistant",
      "/workspace/traffic-distribution",
      "/workspace/traffic-distribution/new",
      "/workspace/traffic-distribution/edit/:id",
      "/workspace/traffic-distribution/:id",
      "/workspace/group-welcome",
      "/workspace/group-welcome/new",
      "/workspace/group-welcome/:id",
      "/workspace/group-welcome/edit/:id",
    ],
  },

  // 场景管理
  scenarios: {
    name: "场景管理",
    routes: [
      "/scenarios",
      "/scenarios/new",
      "/scenarios/new/:scenarioId",
      "/scenarios/edit/:planId",
      "/scenarios/list/:scenarioId/:scenarioName",
    ],
  },

  // 内容管理
  content: {
    name: "内容管理",
    routes: [
      "/mine/content",
      "/mine/content/new",
      "/mine/content/edit/:id",
      "/mine/content/materials/:id",
      "/mine/content/materials/new/:id",
      "/mine/content/materials/edit/:id/:materialId",
    ],
  },

  // 流量池
  trafficPool: {
    name: "流量池",
    routes: ["/traffic-pool", "/traffic-pool/:id"],
  },

  // 其他功能
  other: {
    name: "其他功能",
    routes: [
      "/profile",
      "/plans",
      "/plans/:planId",
      "/orders",
      "/contract-import",
    ],
  },
};

// 路由权限配置
export const routePermissions = {
  // 管理员权限
  admin: Object.values(routeGroups).flatMap(group => group.routes),

  // 普通用户权限
  user: [
    "/",
    "/login",
    "/guide",
    "/scene",
    "/work",
    "/mine",
    "/mine/devices",
    "/mine/devices/:id",
    "/wechat-accounts",
    "/wechat-accounts/:id",
    "/workspace",
    "/scenarios",
    "/content",
    "/traffic-pool",
    "/traffic-pool/:id",
    "/profile",
    "/plans",
    "/plans/:planId",
    "/orders",
    "/contract-import",
  ],

  // 访客权限
  guest: ["/", "/login"],
};

// 路由标题映射
export const routeTitles: Record<string, string> = {
  "/": "首页",
  "/login": "登录",
  "/guide": "设备绑定引导",
  "/scene": "场景获客",
  "/work": "工作台",
  "/mine": "我的",
  "/mine/devices": "设备管理",
  "/wechat-accounts": "微信号管理",
  "/workspace": "工作台",
  "/scenarios": "场景管理",
  "/content": "内容管理",
  "/traffic-pool": "流量池",
  "/profile": "个人中心",
  "/plans": "计划管理",
  "/orders": "订单管理",
  "/contract-import": "联系人导入",
};

// 获取路由标题
export const getRouteTitle = (path: string): string => {
  return routeTitles[path] || "页面";
};

// 检查路由权限
export const checkRoutePermission = (
  path: string,
  userRole: string = "user",
): boolean => {
  const allowedRoutes =
    routePermissions[userRole as keyof typeof routePermissions] || [];
  return allowedRoutes.some(route => {
    // 简单的路径匹配，支持动态参数
    const routePattern = route.replace(/:[^/]+/g, "[^/]+");
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(path);
  });
};
