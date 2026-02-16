// GitHub项目集成分析和对接方案
// 基于 https://github.com/fnvtk/cunkebao_v3.git 项目结构

/**
 * GitHub项目结构分析
 *
 * cunkebao_v3/
 * ├── Cunkebao/           # 前端主应用 (React/Vue混合)
 * │   ├── src/
 * │   │   ├── components/ # 组件库
 * │   │   ├── pages/      # 页面组件
 * │   │   ├── api/        # API接口
 * │   │   ├── utils/      # 工具函数
 * │   │   └── store/      # 状态管理
 * │   ├── public/         # 静态资源
 * │   └── package.json    # 依赖配置
 * ├── Server/             # 后端API服务
 * │   ├── controllers/    # 控制器
 * │   ├── models/         # 数据模型
 * │   ├── routes/         # 路由配置
 * │   └── middleware/     # 中间件
 * ├── Store_vue/          # Vue商城前端
 * └── SuperAdmin/         # 管理后台
 */

// 项目关联度分析
export const PROJECT_CORRELATION = {
  // 高度关联的模块 (90%+)
  HIGH_CORRELATION: [
    "场景获客模块", // 核心业务逻辑完全一致
    "设备管理模块", // 设备状态和操作接口一致
    "微信号管理", // 微信账号管理逻辑相同
    "API接口规范", // 接口定义和响应格式一致
  ],

  // 中度关联的模块 (60-90%)
  MEDIUM_CORRELATION: [
    "用户界面设计", // 设计风格相似，需要适配
    "数据统计图表", // 统计逻辑相同，展示方式需调整
    "工作台功能", // 功能相似，实现方式不同
  ],

  // 低度关联的模块 (30-60%)
  LOW_CORRELATION: [
    "商城模块", // Store_vue独立模块
    "管理后台", // SuperAdmin独立系统
    "支付系统", // 业务逻辑差异较大
  ],

  // 需要重新实现的模块
  NEED_REIMPLEMENTATION: [
    "Next.js路由系统", // 从Vue Router迁移到Next.js
    "状态管理", // 从Vuex迁移到React状态管理
    "组件库", // 从Vue组件迁移到React组件
  ],
}

// 对接策略配置
export const INTEGRATION_STRATEGY = {
  // API对接策略
  API_INTEGRATION: {
    // 直接复用的接口
    REUSE_APIS: [
      "/api/scenarios/*", // 场景获客接口
      "/api/devices/*", // 设备管理接口
      "/api/wechat/*", // 微信管理接口
      "/api/traffic/*", // 流量池接口
      "/api/content/*", // 内容库接口
      "/api/auth/*", // 认证接口
    ],

    // 需要适配的接口
    ADAPT_APIS: [
      "/api/dashboard/*", // 数据格式需要调整
      "/api/analytics/*", // 统计接口需要优化
      "/api/upload/*", // 文件上传需要适配
    ],

    // 需要新增的接口
    NEW_APIS: [
      "/api/mobile/*", // 移动端专用接口
      "/api/realtime/*", // 实时数据接口
      "/api/notifications/*", // 通知推送接口
    ],
  },

  // 前端对接策略
  FRONTEND_INTEGRATION: {
    // 保留现有架构
    KEEP_CURRENT: ["Next.js框架", "TypeScript类型系统", "Tailwind CSS样式", "shadcn/ui组件库"],

    // 从GitHub项目迁移
    MIGRATE_FROM_GITHUB: ["业务逻辑代码", "API调用方法", "数据处理函数", "工具类函数"],

    // 混合实现
    HYBRID_IMPLEMENTATION: ["页面组件结构", "状态管理方案", "路由配置", "样式主题"],
  },
}
