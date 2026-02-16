// 环境配置
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isTest = import.meta.env.MODE === "test";

// 开发环境特性开关
export const DEV_FEATURES = {
  // 是否显示测试页面
  SHOW_TEST_PAGES: isDevelopment,

  // 是否启用调试日志
  ENABLE_DEBUG_LOGS: isDevelopment,

  // 是否显示开发工具
  SHOW_DEV_TOOLS: isDevelopment,

  // 是否启用Mock数据
  ENABLE_MOCK_DATA: isDevelopment,
};

// 获取环境变量
export const getEnvVar = (key: string, defaultValue?: string): string => {
  return import.meta.env[key] || defaultValue || "";
};

// 环境信息
export const ENV_INFO = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_APP_TITLE: getEnvVar("VITE_APP_TITLE", "存客宝"),
  VITE_API_BASE_URL: getEnvVar("VITE_API_BASE_URL", ""),
  VITE_APP_VERSION: getEnvVar("VITE_APP_VERSION", "1.0.0"),
};

// 开发环境检查
export const checkDevEnvironment = () => {
  if (isDevelopment) {
    // console.log("🚀 开发环境已启用");
    // console.log("📋 环境信息:", ENV_INFO);
    // console.log("⚙️ 开发特性:", DEV_FEATURES);
  }
};

// 初始化环境检查
checkDevEnvironment();
