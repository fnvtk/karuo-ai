/**
 * 联系人Store数据结构定义
 * 根据新架构设计，支持分组懒加载
 */

import { Contact } from "@/utils/db";

/**
 * 联系人分组
 */
export interface ContactGroup {
  id: number; // 分组ID（groupId）
  groupName: string; // 分组名称
  groupType: 1 | 2; // 1=好友列表，2=群列表
  count?: number; // 分组内联系人数量（统计信息）
  sort?: number; // 排序
  groupMemo?: string; // 分组备注
}

/**
 * 分组联系人数据
 */
export interface GroupContactData {
  contacts: Contact[]; // 已加载的联系人列表
  page: number; // 当前页码
  pageSize: number; // 每页数量
  hasMore: boolean; // 是否还有更多数据
  loading: boolean; // 是否正在加载
  loaded: boolean; // 是否已加载过（用于判断是否需要重新加载）
  lastLoadTime?: number; // 最后加载时间（时间戳）
}

/**
 * 虚拟滚动状态
 */
export interface VirtualScrollState {
  startIndex: number; // 可见区域起始索引
  endIndex: number; // 可见区域结束索引
  itemHeight: number; // 每项高度
  containerHeight: number; // 容器高度
  totalHeight: number; // 总高度
}

/**
 * 新架构ContactStore状态接口
 * 支持分组懒加载、API搜索、分组编辑等功能
 */
export interface ContactStoreState {
  // ==================== 分组列表（一次性加载）====================
  groups: ContactGroup[]; // 所有分组信息

  // ==================== 当前选中的账号ID（0=全部）====================
  selectedAccountId: number;

  // ==================== 展开的分组 ====================
  expandedGroups: Set<string>; // groupKey集合（格式：`${groupId}_${groupType}_${accountId}`）

  // ==================== 分组数据（按分组懒加载）====================
  groupData: Map<string, GroupContactData>; // groupKey → GroupContactData

  // ==================== 搜索相关 ====================
  searchKeyword: string;
  isSearchMode: boolean;
  searchResults: Contact[]; // 搜索结果（调用API获取，不依赖分组数据）
  searchLoading: boolean;

  // ==================== 虚拟滚动状态（每个分组独立）====================
  virtualScrollStates: Map<string, VirtualScrollState>;

  // ==================== 操作方法 ====================
  // 分组管理
  setGroups: (groups: ContactGroup[]) => Promise<void>; // 设置分组列表（带缓存）
  loadGroups: (accountId?: number) => Promise<ContactGroup[]>; // 加载分组列表（带缓存）
  loadGroupsFromAPI: (accountId: number) => Promise<ContactGroup[]>; // 从API加载分组列表
  toggleGroup: (groupId: number, groupType: 1 | 2) => Promise<void>; // 切换分组展开/折叠

  // 分组编辑操作
  addGroup: (
    group: Omit<ContactGroup, "id" | "count">,
  ) => Promise<void>; // 新增分组
  updateGroup: (group: ContactGroup) => Promise<void>; // 更新分组
  deleteGroup: (groupId: number, groupType: 1 | 2) => Promise<void>; // 删除分组

  // 分组数据加载
  loadGroupContacts: (
    groupId: number,
    groupType: 1 | 2,
    page?: number,
    limit?: number,
  ) => Promise<void>; // 加载分组联系人（懒加载，带缓存）
  loadGroupContactsFromAPI: (
    groupId: number,
    groupType: 1 | 2,
    page?: number,
    limit?: number,
  ) => Promise<void>; // 从API加载分组联系人
  loadMoreGroupContacts: (
    groupId: number,
    groupType: 1 | 2,
  ) => Promise<void>; // 加载更多

  // 搜索
  searchContacts: (keyword: string) => Promise<void>; // 搜索（调用API，同时请求好友和群列表）
  clearSearch: () => void; // 清除搜索

  // 切换账号
  switchAccount: (accountId: number) => Promise<void>; // 切换账号（重新加载展开的分组）

  // 联系人操作
  addContact: (contact: Contact) => void; // 新增联系人（更新对应分组）
  updateContact: (contact: Contact) => void; // 更新联系人（更新对应分组）
  updateContactRemark: (
    contactId: number,
    groupId: number,
    groupType: 1 | 2,
    remark: string,
  ) => Promise<void>; // 修改联系人备注（右键菜单）
  deleteContact: (
    contactId: number,
    groupId: number,
    groupType: 1 | 2,
  ) => void; // 删除联系人
  moveContactToGroup: (
    contactId: number,
    fromGroupId: number,
    toGroupId: number,
    groupType: 1 | 2,
  ) => Promise<void>; // 移动联系人到其他分组（右键菜单）

  // 虚拟滚动
  setVisibleRange: (
    groupKey: string,
    start: number,
    end: number,
  ) => void; // 设置可见范围

  // ==================== 保留原有接口（向后兼容）====================
  // 这些接口保留以兼容现有代码，但建议逐步迁移到新接口
  contactList: Contact[];
  contactGroups: any[];
  currentContact: Contact | null;
  loading: boolean;
  refreshing: boolean;
  searchResults_old: Contact[]; // 重命名避免冲突
  isSearchMode_old: boolean; // 重命名避免冲突
  visibleContacts: { [key: string]: Contact[] };
  loadingStates: { [key: string]: boolean };
  hasMore: { [key: string]: boolean };
  currentPage: { [key: string]: number };
  selectedTransmitContacts: Contact[];
  openTransmitModal: boolean;

  // 原有方法（保留兼容）
  setContactList: (contacts: Contact[]) => void;
  setContactGroups: (groups: any[]) => void;
  setCurrentContact: (contact: Contact | null) => void;
  clearCurrentContact: () => void;
  setSearchKeyword_old: (keyword: string) => void; // 重命名避免冲突
  clearSearchKeyword: () => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
}
