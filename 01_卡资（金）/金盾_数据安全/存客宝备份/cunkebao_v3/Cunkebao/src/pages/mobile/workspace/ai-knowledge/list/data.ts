// AI知识库相关类型定义

// 知识库类型（对应接口的 type）
export interface KnowledgeBase {
  id: number;
  type: number; // 类型
  name: string;
  description: string;
  label: string[]; // 标签（接口返回的字段名）
  prompt: string | null; // 独立提示词
  companyId: number;
  userId: number;
  createTime: string | null;
  updateTime: string | null;
  isDel: number;
  delTime: number;
  // 前端扩展字段
  tags?: string[]; // 兼容字段，映射自 label
  status?: number; // 0-禁用 1-启用（前端维护）
  materialCount?: number; // 素材总数（前端计算）
  useIndependentPrompt?: boolean; // 是否使用独立提示词（根据 prompt 判断）
  independentPrompt?: string; // 独立提示词内容（映射自 prompt）
  aiCallEnabled?: boolean; // AI调用配置（前端维护）
  creatorName?: string;
  callerCount?: number; // 调用者数量
}

// 素材类型
export interface Material {
  id: number;
  knowledgeBaseId: number;
  fileName: string;
  fileSize: number; // 字节
  fileType: string; // 文件扩展名
  filePath: string;
  tags: string[];
  uploadTime: string;
  uploaderId: number;
  uploaderName: string;
}

// 调用者类型
export interface Caller {
  id: number;
  name: string;
  avatar: string;
  role: string; // 角色/职位
  lastCallTime: string;
  callCount: number;
}

// 统一提示词配置
export interface GlobalPromptConfig {
  enabled: boolean; // 是否启用统一提示词
  content: string; // 提示词内容
}

// 知识库列表响应
export interface KnowledgeBaseListResponse {
  data: KnowledgeBase[]; // 接口实际返回的是 data 字段
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// 新建/编辑知识库表单数据
export interface KnowledgeBaseFormData {
  id?: number;
  name: string;
  description?: string;
  tags: string[];
  useIndependentPrompt: boolean;
  independentPrompt?: string;
}
