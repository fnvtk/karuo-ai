// 联系人数据接口
export interface ContractData {
  id?: number;
  wechatAccountId: number;
  wechatId: string;
  alias: string;
  conRemark: string;
  nickname: string;
  quanPin: string;
  avatar?: string;
  gender: number;
  region: string;
  addFrom: number;
  phone: string;
  labels: string[];
  signature: string;
  accountId: number;
  extendFields?: Record<string, any> | null;
  city?: string;
  lastUpdateTime: string;
  isPassed: boolean;
  tenantId: number;
  groupId: number;
  thirdParty: null;
  additionalPicture: string;
  desc: string;
  lastMessageTime: number;
  config: {
    unreadCount: number;
    top?: boolean;
  };
  duplicate: boolean;
  [key: string]: any;
}
//聊天会话类型
export type ChatType = "private" | "group";
// 聊天会话接口
export interface ChatSession {
  id: number;
  type: ChatType;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastTime: string;
  config: {
    unreadCount: number;
    top?: boolean;
  };
  online: boolean;
  members?: string[];
  pinned?: boolean;
  muted?: boolean;
}
