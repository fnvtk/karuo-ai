import { ChatSession } from "@/utils/db";

export interface Message {
  id: number;
  wechatId: string;
  nickname: string;
  alias: string;
  avatar: string;
  region: string;
  signature: string;
  bindQQ: string;
  bindEmail: string;
  bindMobile: string;
  createTime: string;
  currentDeviceId: number;
  isDeleted: boolean;
  deleteTime: string;
  groupId: number;
  memo: string;
  wechatVersion: string;
  labels: string[];
  lastUpdateTime: string;
  isOnline?: boolean;
  momentsMax: number;
  momentsNum: number;
  wechatAccountId: number;
  [key: string]: any;
}

//Store State - 会话列表状态管理（不存储数据，只管理状态）
export type SessionsUpdater =
  | ChatSession[]
  | ((previous: ChatSession[]) => ChatSession[]);

export interface MessageState {
  //加载状态
  loading: boolean;
  //后台同步状态
  refreshing: boolean;
  //最后刷新时间
  lastRefreshTime: string | null;
  //是否已经加载过一次（避免重复请求）
  hasLoadedOnce: boolean;

  //设置加载状态
  setLoading: (loading: boolean) => void;
  //设置同步状态
  setRefreshing: (refreshing: boolean) => void;
  //设置已加载标识
  setHasLoadedOnce: (loaded: boolean) => void;
  //重置加载状态（用于登出或切换用户）
  resetLoadState: () => void;

  // ==================== 保留原有接口（向后兼容） ====================
  //消息列表（废弃，保留兼容）
  messageList: Message[];
  //当前选中的消息（废弃，保留兼容）
  currentMessage: Message | null;
  //更新消息列表（废弃，保留兼容）
  updateMessageList: (messageList: Message[]) => void;
  //更新消息状态（废弃，保留兼容）
  updateMessageStatus: (messageId: number, status: string) => void;
  //更新当前选中的消息（废弃，保留兼容）
  updateCurrentMessage: (message: Message) => void;

  // ==================== 新的会话数据接口 ====================
  // 当前会话列表（过滤后的，用于显示）
  sessions: ChatSession[];
  // 设置或更新会话列表（支持回调写法）
  setSessions: (updater: SessionsUpdater) => void;
  // 新增或替换某个会话
  upsertSession: (session: ChatSession) => void;
  // 按 ID 和类型移除会话
  removeSessionById: (sessionId: number, type: ChatSession["type"]) => void;
  // 清空所有会话（登出/切账号使用）
  clearSessions: () => void;

  // ==================== 新架构：索引和缓存（阶段1.2） ====================
  // 全部会话数据（一次性加载全部）
  allSessions: ChatSession[];
  // 会话索引：accountId -> sessions[]（O(1)快速查找）
  sessionIndex: Map<number, ChatSession[]>;
  // 过滤结果缓存：accountId -> filteredSessions[]（避免重复计算）
  filteredSessionsCache: Map<number, ChatSession[]>;
  // 缓存有效性标记：accountId -> boolean
  cacheValid: Map<number, boolean>;
  // 当前选中的账号ID（0表示"全部"）
  selectedAccountId: number;
  // 搜索关键词
  searchKeyword: string;
  // 排序方式
  sortBy: "time" | "unread" | "name";

  // 设置全部会话数据并构建索引（带缓存）
  setAllSessions: (sessions: ChatSession[]) => Promise<void>;
  // 从缓存加载会话列表
  loadSessionsFromCache: (accountId: number) => Promise<ChatSession[] | null>;
  // 构建索引（数据加载时调用）
  buildIndexes: (sessions: ChatSession[]) => void;
  // 切换账号（使用索引快速过滤）
  switchAccount: (accountId: number) => ChatSession[];
  // 新增会话（增量更新索引）
  addSession: (session: ChatSession) => void;
  // 设置搜索关键词
  setSearchKeyword: (keyword: string) => void;
  // 设置排序方式
  setSortBy: (sortBy: "time" | "unread" | "name") => void;
  // 失效缓存（数据更新时调用）
  invalidateCache: (accountId?: number) => void;
}
