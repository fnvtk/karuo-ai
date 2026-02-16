// AI知识库详情相关类型定义
import type { KnowledgeBase, Caller } from "../list/data";

export type { KnowledgeBase, Caller };

// 素材类型（对应接口的 knowledge）
export interface Material {
  id: number;
  typeId: number; // 知识库类型ID
  name: string; // 文件名
  label: string[]; // 标签
  companyId: number;
  userId: number;
  createTime: number;
  updateTime: number;
  isDel: number;
  delTime: number;
  documentId: string; // 文档ID
  fileUrl: string; // 文件URL
  type?: KnowledgeBase; // 关联的知识库类型信息
  // 前端扩展字段
  fileName?: string; // 映射自 name
  size?: number; // 文件大小（前端计算）
  fileType?: string; // 文件类型（从 name 提取）
  filePath?: string; // 映射自 fileUrl
  tags?: string[]; // 映射自 label
  uploadTime?: string; // 映射自 createTime
  uploaderId?: number; // 映射自 userId
  uploaderName?: string;
}

// 知识库详情响应
export interface KnowledgeBaseDetailResponse extends KnowledgeBase {
  materials: Material[];
  callers: Caller[];
}

// 素材列表响应
export interface MaterialListResponse {
  list: Material[];
  total: number;
}

// 调用者列表响应
export interface CallerListResponse {
  list: Caller[];
  total: number;
}
