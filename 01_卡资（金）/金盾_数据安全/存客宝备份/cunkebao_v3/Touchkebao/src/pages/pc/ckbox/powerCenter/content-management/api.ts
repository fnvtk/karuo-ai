import request from "@/api/request";

// 素材管理相关接口
export interface MaterialListParams {
  keyword?: string;
  limit?: string;
  page?: string;
}

// 内容项类型定义
export interface ContentItem {
  type: "text" | "image" | "video" | "file" | "audio" | "link";
  data: string | LinkData;
}

// 链接数据类型
export interface LinkData {
  title: string;
  url: string;
  cover: string;
}

export interface MaterialAddRequest {
  title: string;
  cover?: string;
  status: number;
  content: ContentItem[];
}

export interface MaterialUpdateRequest extends MaterialAddRequest {
  id?: string;
}

export interface MaterialSetStatusRequest {
  id: string;
}

// 素材管理-列表
export function getMaterialList(params: MaterialListParams) {
  return request("/v1/kefu/content/material/list", params, "GET");
}

// 素材管理-添加
export function addMaterial(data: MaterialAddRequest) {
  return request("/v1/kefu/content/material/add", data, "POST");
}

// 素材管理-详情
export function getMaterialDetails(id: string) {
  return request("/v1/kefu/content/material/details", { id }, "GET");
}

// 素材管理-删除
export function deleteMaterial(id: string) {
  return request("/v1/kefu/content/material/del", { id }, "DELETE");
}

// 素材管理-更新
export function updateMaterial(data: MaterialUpdateRequest) {
  return request("/v1/kefu/content/material/update", data, "POST");
}

// 素材管理-修改状态
export function setMaterialStatus(data: MaterialSetStatusRequest) {
  return request("/v1/kefu/content/material/setStatus", data, "POST");
}

// 违禁词管理相关接口
export interface SensitiveWordListParams {
  keyword?: string;
  limit?: string;
  page?: string;
}

export interface SensitiveWordAddRequest {
  content: string;
  keywords: string;
  /**
   * 操作 0不操作 1替换 2删除 3警告 4禁止发送
   */
  operation: string;
  status: string;
  title: string;
}

export interface SensitiveWordUpdateRequest extends SensitiveWordAddRequest {
  id?: string;
}

export interface SensitiveWordSetStatusRequest {
  id: string;
}

// 违禁词管理-列表
export function getSensitiveWordList(params: SensitiveWordListParams) {
  return request("/v1/kefu/content/sensitiveWord/list", params, "GET");
}

// 违禁词管理-添加
export function addSensitiveWord(data: SensitiveWordAddRequest) {
  return request("/v1/kefu/content/sensitiveWord/add", data, "POST");
}

// 违禁词管理-详情
export function getSensitiveWordDetails(id: string) {
  return request("/v1/kefu/content/sensitiveWord/details", { id }, "GET");
}

// 违禁词管理-删除
export function deleteSensitiveWord(id: string) {
  return request("/v1/kefu/content/sensitiveWord/del", { id }, "DELETE");
}

// 违禁词管理-更新
export function updateSensitiveWord(data: SensitiveWordUpdateRequest) {
  return request("/v1/kefu/content/sensitiveWord/update", data, "POST");
}

// 违禁词管理-修改状态
export function setSensitiveWordStatus(data: SensitiveWordSetStatusRequest) {
  return request("/v1/kefu/content/sensitiveWord/setStatus", data, "GET");
}

// 关键词回复管理相关接口
export interface KeywordListParams {
  keyword?: string;
  limit?: string;
  page?: string;
}

export interface KeywordAddRequest {
  title: string;
  keywords: string;
  content: string;
  type: number; // 匹配类型：模糊匹配、精确匹配
  level: number; // 优先级
  replyType: number; // 回复类型：文本回复、模板回复
  status: string;
  metailGroups: any[];
}

export interface KeywordUpdateRequest extends KeywordAddRequest {
  id?: number;
}

export interface KeywordSetStatusRequest {
  id: number;
}

// 关键词回复-列表
export function getKeywordList(params: KeywordListParams) {
  return request("/v1/kefu/content/keywords/list", params, "GET");
}

// 关键词回复-添加
export function addKeyword(data: KeywordAddRequest) {
  return request("/v1/kefu/content/keywords/add", data, "POST");
}

// 关键词回复-详情
export function getKeywordDetails(id: number) {
  return request("/v1/kefu/content/keywords/details", { id }, "GET");
}

// 关键词回复-删除
export function deleteKeyword(id: number) {
  return request("/v1/kefu/content/keywords/del", { id }, "DELETE");
}

// 关键词回复-更新
export function updateKeyword(data: KeywordUpdateRequest) {
  return request("/v1/kefu/content/keywords/update", data, "POST");
}

// 关键词回复-修改状态
export function setKeywordStatus(data: KeywordSetStatusRequest) {
  return request("/v1/kefu/content/keywords/setStatus", data, "POST");
}

//获取好友接待配置
export function getFriendInjectConfig(params) {
  return request("/v1/kefu/ai/friend/get", params, "GET");
}
