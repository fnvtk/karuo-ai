"use client"

/**
 * API路径映射 - 将GitHub项目的API路径映射到当前项目
 */
export const API_PATH_MAPPING = {
  // GitHub项目 -> 当前项目
  "/api/v1/scenarios": "/api/scenarios",
  "/api/v1/devices": "/api/devices",
  "/api/v1/wechat": "/api/wechat",
  "/api/v1/traffic": "/api/traffic",
  "/api/v1/content": "/api/content",
  "/api/v1/auth": "/api/auth",
  "/api/v1/dashboard": "/api/dashboard",
  "/api/v1/analytics": "/api/analytics",
  "/api/v1/upload": "/api/upload",
}

/**
 * 数据格式适配器 - 将GitHub项目的数据格式适配到当前项目
 */
export class DataAdapter {
  /**
   * 适配场景数据格式
   */
  static adaptScenarioData(githubData: any) {
    return {
      id: githubData.scenario_id || githubData.id,
      name: githubData.scenario_name || githubData.name,
      type: githubData.scenario_type || githubData.type,
      status: githubData.scenario_status || githubData.status,
      deviceCount: githubData.device_count || githubData.deviceCount || 0,
      wechatCount: githubData.wechat_count || githubData.wechatCount || 0,
      todayAcquisition: githubData.today_acquisition || githubData.todayAcquisition || 0,
      totalAcquisition: githubData.total_acquisition || githubData.totalAcquisition || 0,
      successRate: githubData.success_rate || githubData.successRate || 0,
      createTime: githubData.create_time || githubData.createTime,
      updateTime: githubData.update_time || githubData.updateTime,
      lastRunTime: githubData.last_run_time || githubData.lastRunTime,
      deviceNames: githubData.device_names || githubData.deviceNames || [],
      tags: githubData.tags || [],
      settings: githubData.settings || {},
    }
  }

  /**
   * 适配设备数据格式
   */
  static adaptDeviceData(githubData: any) {
    return {
      id: githubData.device_id || githubData.id,
      name: githubData.device_name || githubData.name,
      type: githubData.device_type || githubData.type,
      status: githubData.device_status || githubData.status,
      platform: githubData.platform || "android",
      version: githubData.version || "unknown",
      battery: githubData.battery_level || githubData.battery || 0,
      memory: githubData.memory_usage || githubData.memory || 0,
      cpu: githubData.cpu_usage || githubData.cpu || 0,
      network: githubData.network_status || githubData.network || "unknown",
      location: githubData.location || "",
      lastOnlineTime: githubData.last_online_time || githubData.lastOnlineTime,
      createTime: githubData.create_time || githubData.createTime,
      updateTime: githubData.update_time || githubData.updateTime,
    }
  }

  /**
   * 适配微信账号数据格式
   */
  static adaptWechatData(githubData: any) {
    return {
      id: githubData.wechat_id || githubData.id,
      nickname: githubData.wechat_nickname || githubData.nickname,
      wxid: githubData.wechat_wxid || githubData.wxid,
      phone: githubData.wechat_phone || githubData.phone,
      avatar: githubData.wechat_avatar || githubData.avatar,
      status: githubData.wechat_status || githubData.status,
      deviceId: githubData.device_id || githubData.deviceId,
      friendCount: githubData.friend_count || githubData.friendCount || 0,
      groupCount: githubData.group_count || githubData.groupCount || 0,
      todayAddCount: githubData.today_add_count || githubData.todayAddCount || 0,
      addLimit: githubData.add_limit || githubData.addLimit || 50,
      remainingQuota: githubData.remaining_quota || githubData.remainingQuota || 0,
      lastLoginTime: githubData.last_login_time || githubData.lastLoginTime,
      createTime: githubData.create_time || githubData.createTime,
      updateTime: githubData.update_time || githubData.updateTime,
    }
  }

  /**
   * 适配流量池数据格式
   */
  static adaptTrafficPoolData(githubData: any) {
    return {
      id: githubData.pool_id || githubData.id,
      name: githubData.pool_name || githubData.name,
      description: githubData.pool_description || githubData.description,
      type: githubData.pool_type || githubData.type,
      userCount: githubData.user_count || githubData.userCount || 0,
      activeCount: githubData.active_count || githubData.activeCount || 0,
      conversionRate: githubData.conversion_rate || githubData.conversionRate || 0,
      tags: githubData.tags || [],
      createTime: githubData.create_time || githubData.createTime,
      updateTime: githubData.update_time || githubData.updateTime,
    }
  }
}

/**
 * API请求适配器 - 将GitHub项目的API调用适配到当前项目
 */
export class ApiAdapter {
  /**
   * 适配API请求路径
   */
  static adaptApiPath(githubPath: string): string {
    return API_PATH_MAPPING[githubPath] || githubPath
  }

  /**
   * 适配请求参数
   */
  static adaptRequestParams(githubParams: any) {
    // 将下划线命名转换为驼峰命名
    const adaptedParams: any = {}

    Object.keys(githubParams).forEach((key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      adaptedParams[camelKey] = githubParams[key]
    })

    return adaptedParams
  }

  /**
   * 适配响应数据
   */
  static adaptResponseData(githubResponse: any) {
    // GitHub项目的响应格式
    if (githubResponse.status === "success" || githubResponse.code === 200) {
      return {
        code: 200,
        message: githubResponse.message || "success",
        data: githubResponse.data || githubResponse.result,
        timestamp: Date.now(),
      }
    } else {
      return {
        code: githubResponse.code || 500,
        message: githubResponse.message || "error",
        data: null,
        timestamp: Date.now(),
      }
    }
  }
}

/**
 * 组件适配器 - 将GitHub项目的Vue组件逻辑适配到React组件
 */
export class ComponentAdapter {
  /**
   * 适配Vue的data到React的useState
   */
  static adaptVueDataToReactState(vueData: any) {
    const stateInitializers: string[] = []

    Object.keys(vueData).forEach((key) => {
      const value = JSON.stringify(vueData[key])
      stateInitializers.push(`const [${key}, set${key.charAt(0).toUpperCase() + key.slice(1)}] = useState(${value})`)
    })

    return stateInitializers.join("\n  ")
  }

  /**
   * 适配Vue的methods到React的函数
   */
  static adaptVueMethodsToReactFunctions(vueMethods: any) {
    const functions: string[] = []

    Object.keys(vueMethods).forEach((methodName) => {
      const methodBody = vueMethods[methodName].toString()
      // 简单的转换，实际项目中需要更复杂的AST转换
      const adaptedMethod = methodBody
        .replace(/this\./g, "")
        .replace(/\$emit/g, "emit")
        .replace(/\$router/g, "router")

      functions.push(`const ${methodName} = ${adaptedMethod}`)
    })

    return functions.join("\n  ")
  }

  /**
   * 适配Vue的computed到React的useMemo
   */
  static adaptVueComputedToReactMemo(vueComputed: any) {
    const memoHooks: string[] = []

    Object.keys(vueComputed).forEach((computedName) => {
      const computedBody = vueComputed[computedName].toString()
      const dependencies = this.extractDependencies(computedBody)

      memoHooks.push(`const ${computedName} = useMemo(() => {
    ${computedBody.replace(/this\./g, "")}
  }, [${dependencies.join(", ")}])`)
    })

    return memoHooks.join("\n  ")
  }

  /**
   * 提取依赖项（简化版本）
   */
  private static extractDependencies(code: string): string[] {
    const dependencies: string[] = []
    const regex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
    let match

    while ((match = regex.exec(code)) !== null) {
      const variable = match[1]
      if (!["return", "function", "const", "let", "var"].includes(variable)) {
        dependencies.push(variable)
      }
    }

    return [...new Set(dependencies)]
  }
}
