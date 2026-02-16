// API配置和常量定义

// API基础URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

// API版本
export const API_VERSION = "v1"

// 完整的API URL
export const FULL_API_URL = `${API_BASE_URL}/${API_VERSION}`

// 存储键名常量
export const STORAGE_KEYS = {
  // 认证相关
  TOKEN: "ckb_token",
  USER: "ckb_user",
  REMEMBER: "ckb_remember",
  REFRESH_TOKEN: "ckb_refresh_token",

  // 用户偏好设置
  THEME: "ckb_theme",
  LANGUAGE: "ckb_language",
  SIDEBAR_COLLAPSED: "ckb_sidebar_collapsed",

  // 业务数据缓存
  DEVICES_CACHE: "ckb_devices_cache",
  SCENARIOS_CACHE: "ckb_scenarios_cache",
  CONTENT_CACHE: "ckb_content_cache",
  TRAFFIC_CACHE: "ckb_traffic_cache",

  // 表单数据暂存
  FORM_DRAFT: "ckb_form_draft",
  SEARCH_HISTORY: "ckb_search_history",
  FILTER_SETTINGS: "ckb_filter_settings",

  // 功能开关
  FEATURE_FLAGS: "ckb_feature_flags",
  TUTORIAL_COMPLETED: "ckb_tutorial_completed",
  NOTIFICATION_SETTINGS: "ckb_notification_settings",
} as const

// API端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    USER: "/auth/user",
    REGISTER: "/auth/register",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // 设备管理
  DEVICES: {
    LIST: "/devices",
    DETAIL: "/devices/:id",
    CREATE: "/devices",
    UPDATE: "/devices/:id",
    DELETE: "/devices/:id",
    STATS: "/devices/stats",
    RESTART: "/devices/:id/restart",
    BATCH: "/devices/batch",
  },

  // 场景获客
  SCENARIOS: {
    LIST: "/scenarios",
    DETAIL: "/scenarios/:id",
    CREATE: "/scenarios",
    UPDATE: "/scenarios/:id",
    DELETE: "/scenarios/:id",
    STATS: "/scenarios/stats",
    RECORDS: "/scenarios/:id/records",
    EXPORT: "/scenarios/:id/export",
  },

  // 内容管理
  CONTENT: {
    LIST: "/content",
    DETAIL: "/content/:id",
    CREATE: "/content",
    UPDATE: "/content/:id",
    DELETE: "/content/:id",
    UPLOAD: "/content/upload",
    CATEGORIES: "/content/categories",
  },

  // 流量池管理
  TRAFFIC: {
    LIST: "/traffic",
    DETAIL: "/traffic/:id",
    CREATE: "/traffic",
    UPDATE: "/traffic/:id",
    DELETE: "/traffic/:id",
    STATS: "/traffic/stats",
    DISTRIBUTION: "/traffic/distribution",
  },

  // 工作台功能
  WORKSPACE: {
    OVERVIEW: "/workspace/overview",
    GROUP_PUSH: "/workspace/group-push",
    GROUP_SYNC: "/workspace/group-sync",
    MOMENTS_SYNC: "/workspace/moments-sync",
    AUTO_LIKE: "/workspace/auto-like",
    AI_ASSISTANT: "/workspace/ai-assistant",
  },

  // 计费管理
  BILLING: {
    ACCOUNT: "/billing/account",
    RECORDS: "/billing/records",
    RECHARGE: "/billing/recharge",
    CONSUME: "/billing/consume",
    BALANCE: "/billing/balance",
    PACKAGES: "/billing/packages",
  },

  // 首页数据
  HOMEPAGE: {
    OVERVIEW: "/homepage/overview",
    QUICK_ACCESS: "/homepage/quick-access",
    NOTIFICATIONS: "/homepage/notifications",
    ACTIVITIES: "/homepage/activities",
  },
} as const

// HTTP状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

// 请求超时配置
export const TIMEOUT_CONFIG = {
  DEFAULT: 10000, // 10秒
  UPLOAD: 60000, // 60秒
  DOWNLOAD: 30000, // 30秒
  AUTH: 5000, // 5秒
} as const

// 分页配置
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/avi", "video/mov"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
} as const

// 缓存配置
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5分钟
  USER_TTL: 30 * 60 * 1000, // 30分钟
  STATIC_TTL: 24 * 60 * 60 * 1000, // 24小时
} as const

// 重试配置
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒
  BACKOFF_FACTOR: 2,
} as const

// 环境配置
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const

// 功能开关配置
export const FEATURE_FLAGS = {
  ENABLE_AI_ASSISTANT: true,
  ENABLE_VOICE_RECOGNITION: true,
  ENABLE_BATCH_OPERATIONS: true,
  ENABLE_REAL_TIME_SYNC: true,
  ENABLE_ADVANCED_ANALYTICS: true,
  ENABLE_MOBILE_APP: true,
} as const

// 默认导出配置对象
export default {
  API_BASE_URL,
  API_VERSION,
  FULL_API_URL,
  STORAGE_KEYS,
  API_ENDPOINTS,
  HTTP_STATUS,
  TIMEOUT_CONFIG,
  PAGINATION_CONFIG,
  UPLOAD_CONFIG,
  CACHE_CONFIG,
  RETRY_CONFIG,
  ENV_CONFIG,
  FEATURE_FLAGS,
}
