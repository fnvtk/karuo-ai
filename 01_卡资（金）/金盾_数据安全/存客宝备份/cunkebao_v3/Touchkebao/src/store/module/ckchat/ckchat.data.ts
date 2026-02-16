import {
  ContractData,
  KfUserListData,
  CkAccount,
  ContactGroupByLabel,
  weChatGroup,
} from "@/pages/pc/ckbox/data";

// 权限片段接口
export interface PrivilegeFrag {
  // 根据实际数据结构补充
  [key: string]: any;
}

// 租户信息接口
export interface CkTenant {
  id: number;
  name: string;
  guid: string;
  thirdParty: string | null;
  tenantType: number;
  deployName: string;
}

// 触客宝用户信息接口
export interface CkUserInfo {
  account: CkAccount;
  privilegeFrags: PrivilegeFrag[];
  tenant: CkTenant;
}

// 状态接口
export interface CkChatState {
  userInfo: CkUserInfo | null;
  isLoggedIn: boolean;
  isLoadWeChat: boolean;
  getIsLoadWeChat: () => boolean;
  updateIsLoadWeChat: (isLoadWeChat: boolean) => void;
  chatSessions: any[];
  kfUserList: KfUserListData[];
  kfSelected: number;
  getKfSelectedUser: () => KfUserListData | undefined;
  countLables: ContactGroupByLabel[];
  asyncKfSelected: (data: number) => void;
  asyncWeChatGroup: (data: weChatGroup[]) => void;
  asyncCountLables: (data: ContactGroupByLabel[]) => void;
  getkfUserList: () => KfUserListData[];
  asyncKfUserList: (data: KfUserListData[]) => void;
  getKfUserInfo: (wechatAccountId: number) => KfUserListData | undefined;
  getChatSessions: () => any[];
  asyncChatSessions: (data: any[]) => void;
  updateChatSession: (session: ContractData | weChatGroup) => void;
  deleteCtrlUser: (userId: number) => void;
  updateCtrlUser: (user: KfUserListData) => void;
  clearkfUserList: () => void;
  addChatSession: (session: any) => void;
  deleteChatSession: (sessionId: number) => void;
  pinChatSessionToTop: (sessionId: number) => void;
  setUserInfo: (userInfo: CkUserInfo) => void;
  clearUserInfo: () => void;
  updateAccount: (account: Partial<CkAccount>) => void;
  updateTenant: (tenant: Partial<CkTenant>) => void;
  getAccountId: () => number | null;
  getTenantId: () => number | null;
  getAccountName: () => string | null;
  getTenantName: () => string | null;
}
