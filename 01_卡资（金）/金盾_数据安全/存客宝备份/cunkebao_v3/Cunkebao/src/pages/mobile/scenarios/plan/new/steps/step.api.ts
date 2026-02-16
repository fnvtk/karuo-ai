import request from "@/api/request";

// ==================== 场景相关接口 ====================

// 获取场景列表
export function getScenarios(params: any) {
  return request("/v1/plan/scenes", params, "GET");
}

// 获取场景详情
export function getScenarioDetail(id: string) {
  return request(`/v1/scenarios/${id}`, {}, "GET");
}

// 创建场景
export function createScenario(data: any) {
  return request("/v1/scenarios", data, "POST");
}

// 更新场景
export function updateScenario(id: string, data: any) {
  return request(`/v1/scenarios/${id}`, data, "PUT");
}

// 删除场景
export function deleteScenario(id: string) {
  return request(`/v1/scenarios/${id}`, {}, "DELETE");
}

// ==================== 计划相关接口 ====================

// 获取计划列表
export function getPlanList(
  scenarioId: string,
  page: number = 1,
  limit: number = 20,
) {
  return request(`/api/scenarios/${scenarioId}/plans`, { page, limit }, "GET");
}
// 复制计划
export function copyPlan(planId: string) {
  return request(`/api/scenarios/plans/${planId}/copy`, undefined, "POST");
}

// 删除计划
export function deletePlan(planId: string) {
  return request(`/api/scenarios/plans/${planId}`, undefined, "DELETE");
}

// 获取小程序二维码
export function getWxMinAppCode(planId: string) {
  return request(`/api/scenarios/plans/${planId}/qrcode`, undefined, "GET");
}

// ==================== 设备相关接口 ====================

// 获取设备列表
export function getDevices() {
  return request("/api/devices", undefined, "GET");
}

// 获取设备详情
export function getDeviceDetail(deviceId: string) {
  return request(`/api/devices/${deviceId}`, undefined, "GET");
}

// 创建设备
export function createDevice(data: any) {
  return request("/api/devices", data, "POST");
}

// 更新设备
export function updateDevice(deviceId: string, data: any) {
  return request(`/api/devices/${deviceId}`, data, "PUT");
}

// 删除设备
export function deleteDevice(deviceId: string) {
  return request(`/api/devices/${deviceId}`, undefined, "DELETE");
}

// ==================== 微信号相关接口 ====================

// 获取微信号列表
export function getWechatAccounts() {
  return request("/api/wechat-accounts", undefined, "GET");
}

// 获取微信号详情
export function getWechatAccountDetail(accountId: string) {
  return request(`/api/wechat-accounts/${accountId}`, undefined, "GET");
}

// 创建微信号
export function createWechatAccount(data: any) {
  return request("/api/wechat-accounts", data, "POST");
}

// 更新微信号
export function updateWechatAccount(accountId: string, data: any) {
  return request(`/api/wechat-accounts/${accountId}`, data, "PUT");
}

// 删除微信号
export function deleteWechatAccount(accountId: string) {
  return request(`/api/wechat-accounts/${accountId}`, undefined, "DELETE");
}

// ==================== 海报相关接口 ====================

// 获取海报列表
export function getPosters() {
  return request("/api/posters", undefined, "GET");
}

// 获取海报详情
export function getPosterDetail(posterId: string) {
  return request(`/api/posters/${posterId}`, undefined, "GET");
}

// 创建海报
export function createPoster(data: any) {
  return request("/api/posters", data, "POST");
}

// 更新海报
export function updatePoster(posterId: string, data: any) {
  return request(`/api/posters/${posterId}`, data, "PUT");
}

// 删除海报
export function deletePoster(posterId: string) {
  return request(`/api/posters/${posterId}`, undefined, "DELETE");
}

// ==================== 内容相关接口 ====================

// 获取内容列表
export function getContents(params: any) {
  return request("/api/contents", params, "GET");
}

// 获取内容详情
export function getContentDetail(contentId: string) {
  return request(`/api/contents/${contentId}`, undefined, "GET");
}

// 创建内容
export function createContent(data: any) {
  return request("/api/contents", data, "POST");
}

// 更新内容
export function updateContent(contentId: string, data: any) {
  return request(`/api/contents/${contentId}`, data, "PUT");
}

// 删除内容
export function deleteContent(contentId: string) {
  return request(`/api/contents/${contentId}`, undefined, "DELETE");
}

// ==================== 流量池相关接口 ====================

// 获取流量池列表
export function getTrafficPools() {
  return request("/api/traffic-pools", undefined, "GET");
}

// 获取流量池详情
export function getTrafficPoolDetail(poolId: string) {
  return request(`/api/traffic-pools/${poolId}`, undefined, "GET");
}

// 创建流量池
export function createTrafficPool(data: any) {
  return request("/api/traffic-pools", data, "POST");
}

// 更新流量池
export function updateTrafficPool(poolId: string, data: any) {
  return request(`/api/traffic-pools/${poolId}`, data, "PUT");
}

// 删除流量池
export function deleteTrafficPool(poolId: string) {
  return request(`/api/traffic-pools/${poolId}`, undefined, "DELETE");
}

// ==================== 工作台相关接口 ====================

// 获取工作台统计数据
export function getWorkspaceStats() {
  return request("/api/workspace/stats", undefined, "GET");
}

// 获取自动点赞任务列表
export function getAutoLikeTasks() {
  return request("/api/workspace/auto-like/tasks", undefined, "GET");
}

// 创建自动点赞任务
export function createAutoLikeTask(data: any) {
  return request("/api/workspace/auto-like/tasks", data, "POST");
}

// 更新自动点赞任务
export function updateAutoLikeTask(taskId: string, data: any) {
  return request(`/api/workspace/auto-like/tasks/${taskId}`, data, "PUT");
}

// 删除自动点赞任务
export function deleteAutoLikeTask(taskId: string) {
  return request(
    `/api/workspace/auto-like/tasks/${taskId}`,
    undefined,
    "DELETE",
  );
}

// ==================== 群发相关接口 ====================

// 获取群发任务列表
export function getGroupPushTasks() {
  return request("/api/workspace/group-push/tasks", undefined, "GET");
}

// 创建群发任务
export function createGroupPushTask(data: any) {
  return request("/api/workspace/group-push/tasks", data, "POST");
}

// 更新群发任务
export function updateGroupPushTask(taskId: string, data: any) {
  return request(`/api/workspace/group-push/tasks/${taskId}`, data, "PUT");
}

// 删除群发任务
export function deleteGroupPushTask(taskId: string) {
  return request(
    `/api/workspace/group-push/tasks/${taskId}`,
    undefined,
    "DELETE",
  );
}

// ==================== 自动建群相关接口 ====================

// 获取自动建群任务列表
export function getAutoGroupTasks() {
  return request("/api/workspace/auto-group/tasks", undefined, "GET");
}

// 创建自动建群任务
export function createAutoGroupTask(data: any) {
  return request("/api/workspace/auto-group/tasks", data, "POST");
}

// 更新自动建群任务
export function updateAutoGroupTask(taskId: string, data: any) {
  return request(`/api/workspace/auto-group/tasks/${taskId}`, data, "PUT");
}

// 删除自动建群任务
export function deleteAutoGroupTask(taskId: string) {
  return request(
    `/api/workspace/auto-group/tasks/${taskId}`,
    undefined,
    "DELETE",
  );
}

// ==================== AI助手相关接口 ====================

// 获取AI对话历史
export function getAIChatHistory() {
  return request("/api/workspace/ai-assistant/chat-history", undefined, "GET");
}

// 发送AI消息
export function sendAIMessage(data: any) {
  return request("/api/workspace/ai-assistant/send-message", data, "POST");
}

// 获取AI分析报告
export function getAIAnalysisReport() {
  return request(
    "/api/workspace/ai-assistant/analysis-report",
    undefined,
    "GET",
  );
}

// ==================== 订单相关接口 ====================

// 获取订单列表
export function getOrders(params: any) {
  return request("/api/orders", params, "GET");
}

// 获取订单详情
export function getOrderDetail(orderId: string) {
  return request(`/api/orders/${orderId}`, undefined, "GET");
}

// 创建订单
export function createOrder(data: any) {
  return request("/api/orders", data, "POST");
}

// 更新订单
export function updateOrder(orderId: string, data: any) {
  return request(`/api/orders/${orderId}`, data, "PUT");
}

// 删除订单
export function deleteOrder(orderId: string) {
  return request(`/api/orders/${orderId}`, undefined, "DELETE");
}

// ==================== 用户相关接口 ====================

// 获取用户信息
export function getUserInfo() {
  return request("/api/user/info", undefined, "GET");
}

// 更新用户信息
export function updateUserInfo(data: any) {
  return request("/api/user/info", data, "PUT");
}

// 修改密码
export function changePassword(data: any) {
  return request("/api/user/change-password", data, "POST");
}

// 上传头像
export function uploadAvatar(data: any) {
  return request("/api/user/upload-avatar", data, "POST");
}

// ==================== 文件上传相关接口 ====================

// 上传文件
export function uploadFile(data: any) {
  return request("/api/upload/file", data, "POST");
}

// 上传图片
export function uploadImage(data: any) {
  return request("/api/upload/image", data, "POST");
}

// 删除文件
export function deleteFile(fileId: string) {
  return request(`/api/upload/files/${fileId}`, undefined, "DELETE");
}

// ==================== 系统配置相关接口 ====================

// 获取系统配置
export function getSystemConfig() {
  return request("/api/system/config", undefined, "GET");
}

// 更新系统配置
export function updateSystemConfig(data: any) {
  return request("/api/system/config", data, "PUT");
}

// 获取系统通知
export function getSystemNotifications() {
  return request("/api/system/notifications", undefined, "GET");
}

// 标记通知为已读
export function markNotificationAsRead(notificationId: string) {
  return request(
    `/api/system/notifications/${notificationId}/read`,
    undefined,
    "PUT",
  );
}
