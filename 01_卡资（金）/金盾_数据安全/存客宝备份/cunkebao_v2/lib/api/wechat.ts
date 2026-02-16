// 微信号管理API模块
import { apiClient } from "./client"
import { ERROR_CODES } from "./config" // 错误码常量

// 微信号数据类型定义
export interface WechatAccount {
  id: string
  wechatId: string
  nickname: string
  avatar: string
  status: "online" | "offline" | "banned"
  friendCount: number
  groupCount: number
  todayAdded: number
  maxDailyAdds: number
  remainingAdds: number
  deviceId: string
  deviceName: string
  lastActiveTime: string
  createTime: string
  tags: string[]
  remark: string
}

export interface WechatStats {
  total: number
  online: number
  offline: number
  banned: number
  totalFriends: number
  totalGroups: number
  todayAdded: number
}

export interface AddWechatRequest {
  wechatId: string
  nickname: string
  deviceId: string
  remark?: string
  tags?: string[]
}

// 获取微信号列表
export async function getWechatAccounts(): Promise<WechatAccount[]> {
  try {
    const response = await apiClient.get("/v1/wechat/accounts")
    return response.data || []
  } catch (error) {
    console.error("获取微信号列表失败:", error)
    // 返回模拟数据作为降级处理
    return [
      {
        id: "1",
        wechatId: "wxid_test001",
        nickname: "测试账号1",
        avatar: "/placeholder.svg?height=40&width=40",
        status: "online",
        friendCount: 1250,
        groupCount: 35,
        todayAdded: 12,
        maxDailyAdds: 50,
        remainingAdds: 38,
        deviceId: "device_001",
        deviceName: "设备1",
        lastActiveTime: "2024-01-07 14:30:00",
        createTime: "2024-01-01 10:00:00",
        tags: ["营销", "客服"],
        remark: "主要营销账号",
      },
      {
        id: "2",
        wechatId: "wxid_test002",
        nickname: "测试账号2",
        avatar: "/placeholder.svg?height=40&width=40",
        status: "online",
        friendCount: 890,
        groupCount: 28,
        todayAdded: 8,
        maxDailyAdds: 50,
        remainingAdds: 42,
        deviceId: "device_002",
        deviceName: "设备2",
        lastActiveTime: "2024-01-07 13:45:00",
        createTime: "2024-01-02 11:00:00",
        tags: ["客服"],
        remark: "客服专用账号",
      },
      {
        id: "3",
        wechatId: "wxid_test003",
        nickname: "测试账号3",
        avatar: "/placeholder.svg?height=40&width=40",
        status: "offline",
        friendCount: 567,
        groupCount: 15,
        todayAdded: 5,
        maxDailyAdds: 50,
        remainingAdds: 45,
        deviceId: "device_003",
        deviceName: "设备3",
        lastActiveTime: "2024-01-07 10:20:00",
        createTime: "2024-01-03 09:30:00",
        tags: ["测试"],
        remark: "测试账号",
      },
    ]
  }
}

// 获取微信号统计（带错误码判断与降级处理）
export async function getWechatStats(): Promise<WechatStats> {
  try {
    // 兼容 v1 接口规范：{ code: number; data: WechatStats; message?: string }
    const response = await apiClient.get("/v1/wechat/stats")

    // 如果服务端返回符合规范的数据
    if (
      response?.data &&
      (response.data.code === undefined /* 老接口无 code 字段 */ || response.data.code === ERROR_CODES.SUCCESS)
    ) {
      // 兼容老接口直接返回统计数据的情况
      const stats: WechatStats = (response.data.data as WechatStats) ?? (response.data as unknown as WechatStats)

      return {
        total: stats.total ?? 0,
        online: stats.online ?? 0,
        offline: stats.offline ?? 0,
        banned: stats.banned ?? 0,
        totalFriends: stats.totalFriends ?? 0,
        totalGroups: stats.totalGroups ?? 0,
        todayAdded: stats.todayAdded ?? 0,
      }
    }

    // 若 code 不为 SUCCESS，则抛出错误以进入降级逻辑
    throw new Error(response?.data?.message || "服务端返回错误码")
  } catch (error) {
    // 控制台输出错误日志，但不中断页面渲染
    console.error("获取微信号统计失败:", error)

    // 返回本地默认数据，确保页面可继续渲染
    return {
      total: 25,
      online: 18,
      offline: 6,
      banned: 1,
      totalFriends: 15420,
      totalGroups: 156,
      todayAdded: 89,
    }
  }
}

// 添加微信号
export async function addWechatAccount(account: AddWechatRequest): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.post("/v1/wechat/accounts", account)
    return { success: true, message: "微信号添加成功" }
  } catch (error) {
    console.error("添加微信号失败:", error)
    return { success: false, message: "添加微信号失败" }
  }
}

// 删除微信号
export async function deleteWechatAccount(accountId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.delete(`/v1/wechat/accounts/${accountId}`)
    return { success: true, message: "微信号删除成功" }
  } catch (error) {
    console.error("删除微信号失败:", error)
    return { success: false, message: "删除微信号失败" }
  }
}

// 更新微信号
export async function updateWechatAccount(
  accountId: string,
  updates: Partial<AddWechatRequest>,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.put(`/v1/wechat/accounts/${accountId}`, updates)
    return { success: true, message: "微信号更新成功" }
  } catch (error) {
    console.error("更新微信号失败:", error)
    return { success: false, message: "更新微信号失败" }
  }
}

// 获取微信号好友列表
export async function getWechatFriends(accountId: string): Promise<any[]> {
  try {
    const response = await apiClient.get(`/v1/wechat/accounts/${accountId}/friends`)
    return response.data || []
  } catch (error) {
    console.error("获取好友列表失败:", error)
    return []
  }
}

// 获取微信号群组列表
export async function getWechatGroups(accountId: string): Promise<any[]> {
  try {
    const response = await apiClient.get(`/v1/wechat/accounts/${accountId}/groups`)
    return response.data || []
  } catch (error) {
    console.error("获取群组列表失败:", error)
    return []
  }
}
