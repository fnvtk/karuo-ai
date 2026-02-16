/**
 * 路由到视频URL的映射配置
 * key: 路由路径（支持正则表达式）
 * value: 视频URL
 */
interface VideoConfig {
  [route: string]: string;
}

// 视频URL配置
const videoConfig: VideoConfig = {
  // 首页
  "/": "/videos/home.mp4",
  "/mobile/home": "/videos/home.mp4",

  // 工作台
  "/workspace": "/videos/workspace.mp4",
  "/workspace/auto-like": "/videos/auto-like-list.mp4",
  "/workspace/auto-like/new": "/videos/auto-like-new.mp4",
  "/workspace/auto-like/record": "/videos/auto-like-record.mp4",
  "/workspace/auto-group": "/videos/auto-group-list.mp4",
  "/workspace/auto-group/new": "/videos/auto-group-new.mp4",
  "/workspace/group-push": "/videos/group-push-list.mp4",
  "/workspace/group-push/new": "/videos/group-push-new.mp4",
  "/workspace/moments-sync": "/videos/moments-sync-list.mp4",
  "/workspace/moments-sync/new": "/videos/moments-sync-new.mp4",
  "/workspace/ai-assistant": "/videos/ai-assistant.mp4",
  "/workspace/ai-analyzer": "/videos/ai-analyzer.mp4",
  "/workspace/traffic-distribution": "/videos/traffic-distribution-list.mp4",
  "/workspace/traffic-distribution/new": "/videos/traffic-distribution-new.mp4",
  "/workspace/contact-import": "/videos/contact-import-list.mp4",
  "/workspace/contact-import/form": "/videos/contact-import-form.mp4",
  "/workspace/ai-knowledge": "/videos/ai-knowledge-list.mp4",
  "/workspace/ai-knowledge/new": "/videos/ai-knowledge-new.mp4",

  // 我的
  "/mobile/mine": "/videos/mine.mp4",
  "/mobile/mine/devices": "/videos/devices.mp4",
  "/mobile/mine/wechat-accounts": "/videos/wechat-accounts.mp4",
  "/mobile/mine/content": "/videos/content.mp4",
  "/mobile/mine/traffic-pool": "/videos/traffic-pool.mp4",
  "/mobile/mine/recharge": "/videos/recharge.mp4",
  "/mobile/mine/setting": "/videos/setting.mp4",

  // 场景
  "/mobile/scenarios": "/videos/scenarios.mp4",
  "/mobile/scenarios/plan": "/videos/scenarios-plan.mp4",
};

/**
 * 根据路由路径获取对应的视频URL
 * @param routePath 当前路由路径
 * @returns 视频URL，如果没有匹配则返回 null
 */
export function getVideoUrlByRoute(routePath: string): string | null {
  // 精确匹配
  if (videoConfig[routePath]) {
    return videoConfig[routePath];
  }

  // 模糊匹配（支持动态路由参数）
  // 例如：/workspace/auto-like/edit/123 会匹配 /workspace/auto-like/edit/:id
  const routeKeys = Object.keys(videoConfig);
  for (const key of routeKeys) {
    // 将配置中的 :id 等参数转换为正则表达式
    const regexPattern = key.replace(/:\w+/g, "[^/]+");
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(routePath)) {
      return videoConfig[key];
    }
  }

  // 前缀匹配（作为兜底方案）
  // 例如：/workspace/auto-like/edit/123 会匹配 /workspace/auto-like
  const sortedKeys = routeKeys.sort((a, b) => b.length - a.length); // 按长度降序排列
  for (const key of sortedKeys) {
    if (routePath.startsWith(key)) {
      return videoConfig[key];
    }
  }

  return null;
}

/**
 * 添加或更新视频配置
 * @param route 路由路径
 * @param videoUrl 视频URL
 */
export function setVideoConfig(route: string, videoUrl: string): void {
  videoConfig[route] = videoUrl;
}

/**
 * 批量添加视频配置
 * @param config 视频配置对象
 */
export function setVideoConfigs(config: VideoConfig): void {
  Object.assign(videoConfig, config);
}

/**
 * 获取所有视频配置
 * @returns 视频配置对象
 */
export function getAllVideoConfigs(): VideoConfig {
  return { ...videoConfig };
}

export default videoConfig;
