// 迁移指南 - 从GitHub项目到当前Next.js项目的完整迁移方案

/**
 * 迁移步骤配置
 */
export const MIGRATION_STEPS = {
  // 第一阶段：环境准备
  PHASE_1_PREPARATION: {
    title: "环境准备阶段",
    duration: "1-2天",
    tasks: [
      {
        id: "clone-github-repo",
        title: "克隆GitHub仓库",
        description: "git clone https://github.com/fnvtk/cunkebao_v3.git",
        priority: "high",
        estimatedTime: "30分钟",
      },
      {
        id: "analyze-dependencies",
        title: "分析依赖关系",
        description: "对比GitHub项目和当前项目的依赖包",
        priority: "high",
        estimatedTime: "2小时",
      },
      {
        id: "setup-development-env",
        title: "搭建开发环境",
        description: "配置本地开发环境，确保两个项目都能正常运行",
        priority: "high",
        estimatedTime: "4小时",
      },
      {
        id: "backup-current-project",
        title: "备份当前项目",
        description: "创建当前项目的完整备份",
        priority: "medium",
        estimatedTime: "30分钟",
      },
    ],
  },

  // 第二阶段：API对接
  PHASE_2_API_INTEGRATION: {
    title: "API接口对接",
    duration: "3-5天",
    tasks: [
      {
        id: "map-api-endpoints",
        title: "映射API端点",
        description: "创建GitHub项目API到当前项目API的映射表",
        priority: "high",
        estimatedTime: "4小时",
      },
      {
        id: "adapt-api-client",
        title: "适配API客户端",
        description: "修改API客户端以支持GitHub项目的接口格式",
        priority: "high",
        estimatedTime: "8小时",
      },
      {
        id: "implement-data-adapters",
        title: "实现数据适配器",
        description: "创建数据格式转换器",
        priority: "high",
        estimatedTime: "6小时",
      },
      {
        id: "test-api-integration",
        title: "测试API集成",
        description: "全面测试API接口的对接效果",
        priority: "high",
        estimatedTime: "4小时",
      },
    ],
  },

  // 第三阶段：业务逻辑迁移
  PHASE_3_BUSINESS_LOGIC: {
    title: "业务逻辑迁移",
    duration: "5-7天",
    tasks: [
      {
        id: "migrate-scenario-logic",
        title: "迁移场景获客逻辑",
        description: "将GitHub项目的场景获客业务逻辑迁移到当前项目",
        priority: "high",
        estimatedTime: "12小时",
      },
      {
        id: "migrate-device-management",
        title: "迁移设备管理逻辑",
        description: "迁移设备管理相关的业务逻辑",
        priority: "high",
        estimatedTime: "8小时",
      },
      {
        id: "migrate-wechat-management",
        title: "迁移微信管理逻辑",
        description: "迁移微信号管理相关的业务逻辑",
        priority: "high",
        estimatedTime: "10小时",
      },
      {
        id: "migrate-traffic-pool",
        title: "迁移流量池逻辑",
        description: "迁移流量池管理相关的业务逻辑",
        priority: "medium",
        estimatedTime: "6小时",
      },
    ],
  },

  // 第四阶段：UI组件迁移
  PHASE_4_UI_MIGRATION: {
    title: "UI组件迁移",
    duration: "4-6天",
    tasks: [
      {
        id: "convert-vue-to-react",
        title: "Vue组件转React组件",
        description: "将GitHub项目的Vue组件转换为React组件",
        priority: "high",
        estimatedTime: "16小时",
      },
      {
        id: "adapt-styling",
        title: "适配样式系统",
        description: "将原有样式适配到Tailwind CSS",
        priority: "medium",
        estimatedTime: "8小时",
      },
      {
        id: "implement-responsive-design",
        title: "实现响应式设计",
        description: "确保所有页面在移动端和桌面端都能正常显示",
        priority: "high",
        estimatedTime: "6小时",
      },
      {
        id: "optimize-user-experience",
        title: "优化用户体验",
        description: "改进交互效果和用户体验",
        priority: "medium",
        estimatedTime: "4小时",
      },
    ],
  },

  // 第五阶段：测试和优化
  PHASE_5_TESTING: {
    title: "测试和优化",
    duration: "2-3天",
    tasks: [
      {
        id: "unit-testing",
        title: "单元测试",
        description: "为关键功能编写单元测试",
        priority: "medium",
        estimatedTime: "8小时",
      },
      {
        id: "integration-testing",
        title: "集成测试",
        description: "测试各模块之间的集成效果",
        priority: "high",
        estimatedTime: "6小时",
      },
      {
        id: "performance-optimization",
        title: "性能优化",
        description: "优化页面加载速度和运行性能",
        priority: "medium",
        estimatedTime: "4小时",
      },
      {
        id: "bug-fixing",
        title: "Bug修复",
        description: "修复测试过程中发现的问题",
        priority: "high",
        estimatedTime: "6小时",
      },
    ],
  },
}

/**
 * 风险评估和缓解策略
 */
export const RISK_ASSESSMENT = {
  HIGH_RISK: [
    {
      risk: "API接口不兼容",
      probability: "medium",
      impact: "high",
      mitigation: "创建适配层，保持向后兼容",
    },
    {
      risk: "数据格式差异",
      probability: "high",
      impact: "medium",
      mitigation: "实现数据转换器，统一数据格式",
    },
    {
      risk: "业务逻辑复杂度",
      probability: "medium",
      impact: "high",
      mitigation: "分阶段迁移，逐步验证功能",
    },
  ],

  MEDIUM_RISK: [
    {
      risk: "Vue到React转换困难",
      probability: "medium",
      impact: "medium",
      mitigation: "使用自动化工具辅助转换",
    },
    {
      risk: "样式兼容性问题",
      probability: "low",
      impact: "medium",
      mitigation: "建立统一的设计系统",
    },
  ],

  LOW_RISK: [
    {
      risk: "性能下降",
      probability: "low",
      impact: "low",
      mitigation: "持续性能监控和优化",
    },
  ],
}

/**
 * 成功标准
 */
export const SUCCESS_CRITERIA = {
  FUNCTIONAL: ["所有核心功能正常运行", "API接口响应正常", "数据显示准确", "用户操作流畅"],

  PERFORMANCE: ["页面加载时间 < 3秒", "API响应时间 < 1秒", "移动端体验流畅", "内存使用合理"],

  QUALITY: ["代码质量良好", "测试覆盖率 > 80%", "无严重Bug", "文档完整"],
}
