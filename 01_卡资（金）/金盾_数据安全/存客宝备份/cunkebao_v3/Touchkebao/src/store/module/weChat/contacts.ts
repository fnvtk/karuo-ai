import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ContactGroupByLabel } from "@/pages/pc/ckbox/data";
import { Contact } from "@/utils/db";
import { ContactManager } from "@/utils/dbAction";
import { useUserStore } from "@/store/module/user";

const SEARCH_DEBOUNCE_DELAY = 300;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 联系人状态管理接口
 */
export interface ContactState {
  // ==================== 基础状态 ====================
  /** 联系人列表 */
  contactList: Contact[];
  /** 联系人分组列表 */
  contactGroups: ContactGroupByLabel[];
  /** 当前选中的联系人 */
  currentContact: Contact | null;
  /** 搜索关键词 */
  searchKeyword: string;
  /** 加载状态 */
  loading: boolean;
  /** 刷新状态 */
  refreshing: boolean;

  // ==================== 搜索和筛选 ====================
  /** 搜索结果 */
  searchResults: Contact[];
  /** 是否在搜索模式 */
  isSearchMode: boolean;

  // ==================== 分页和性能 ====================
  /** 可见联系人（用于分页） */
  visibleContacts: { [key: string]: Contact[] };
  /** 加载状态（按分组） */
  loadingStates: { [key: string]: boolean };
  /** 是否有更多数据（按分组） */
  hasMore: { [key: string]: boolean };
  /** 当前页码（按分组） */
  currentPage: { [key: string]: number };

  // ==================== 转发相关 ====================
  /** 选中的转发联系人 */
  selectedTransmitContacts: Contact[];
  /** 转发弹窗状态 */
  openTransmitModal: boolean;

  // ==================== 基础操作方法 ====================
  /** 设置联系人列表 */
  setContactList: (contacts: Contact[]) => void;
  /** 设置联系人分组 */
  setContactGroups: (groups: ContactGroupByLabel[]) => void;
  /** 设置当前联系人 */
  setCurrentContact: (contact: Contact | null) => void;
  /** 清空当前联系人 */
  clearCurrentContact: () => void;
  /** 设置搜索关键词 */
  setSearchKeyword: (keyword: string) => void;
  /** 清空搜索关键词 */
  clearSearchKeyword: () => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置刷新状态 */
  setRefreshing: (refreshing: boolean) => void;

  // ==================== 搜索和筛选方法 ====================
  /** 搜索联系人 */
  searchContacts: (keyword: string) => Promise<void>;
  /** 根据客服筛选联系人 */
  filterByCustomer: (customerId: number) => Promise<void>;
  /** 清空筛选 */
  clearFilter: () => void;

  // ==================== 数据同步方法 ====================
  /** 从服务器同步联系人数据 */
  syncFromServer: (userId: number) => Promise<void>;
  /** 从本地数据库加载联系人数据 */
  loadFromLocal: (userId: number) => Promise<void>;
  /** 刷新联系人数据 */
  refreshContacts: (userId: number) => Promise<void>;

  // ==================== 联系人操作方法 ====================
  /** 添加联系人 */
  addContact: (contact: Contact) => Promise<void>;
  /** 更新联系人 */
  updateContact: (contact: Contact) => Promise<void>;
  /** 删除联系人 */
  deleteContact: (contactId: number) => Promise<void>;
  /** 批量添加联系人 */
  addContacts: (contacts: Contact[]) => Promise<void>;

  // ==================== 分组管理方法 ====================
  /** 获取联系人分组列表 */
  getContactGroups: (
    userId: number,
    customerId?: number,
  ) => Promise<ContactGroupByLabel[]>;
  /** 创建联系人分组 */
  createContactGroup: (group: Omit<ContactGroupByLabel, "id">) => Promise<void>;
  /** 更新联系人分组 */
  updateContactGroup: (group: ContactGroupByLabel) => Promise<void>;
  /** 删除联系人分组 */
  deleteContactGroup: (groupId: number) => Promise<void>;

  // ==================== 分页方法 ====================
  /** 加载更多联系人 */
  loadMoreContacts: (groupId: string) => Promise<void>;
  /** 重置分页状态 */
  resetPagination: () => void;

  // ==================== 转发相关方法 ====================
  /** 设置选中的转发联系人 */
  setSelectedTransmitContacts: (contacts: Contact[]) => void;
  /** 添加转发联系人 */
  addTransmitContact: (contact: Contact) => void;
  /** 移除转发联系人 */
  removeTransmitContact: (contactId: number) => void;
  /** 清空转发联系人 */
  clearTransmitContacts: () => void;
  /** 设置转发弹窗状态 */
  setTransmitModal: (open: boolean) => void;

  // ==================== 便捷获取方法 ====================
  /** 根据ID获取联系人 */
  getContactById: (id: number) => Contact | undefined;
  /** 根据客服ID获取联系人 */
  getContactsByCustomer: (customerId: number) => Contact[];
  /** 获取联系人总数 */
  getContactCount: () => number;
  /** 获取搜索结果总数 */
  getSearchResultCount: () => number;
}

/**
 * 联系人状态管理 Store
 */
export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      // ==================== 初始状态 ====================
      contactList: [],
      contactGroups: [],
      currentContact: null,
      searchKeyword: "",
      loading: false,
      refreshing: false,
      searchResults: [],
      isSearchMode: false,
      visibleContacts: {},
      loadingStates: {},
      hasMore: {},
      currentPage: {},
      selectedTransmitContacts: [],
      openTransmitModal: false,

      // ==================== 基础操作方法 ====================
      setContactList: (contacts: Contact[]) => {
        set({ contactList: contacts });
      },

      setContactGroups: (groups: ContactGroupByLabel[]) => {
        set({ contactGroups: groups });
      },

      setCurrentContact: (contact: Contact | null) => {
        set({ currentContact: contact });
      },

      clearCurrentContact: () => {
        set({ currentContact: null });
      },

      setSearchKeyword: (keyword: string) => {
        set({ searchKeyword: keyword });

        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer);
          searchDebounceTimer = null;
        }

        if (keyword.trim()) {
          searchDebounceTimer = setTimeout(() => {
            get().searchContacts(keyword);
          }, SEARCH_DEBOUNCE_DELAY);
        } else {
          set({ isSearchMode: false, searchResults: [] });
        }
      },

      clearSearchKeyword: () => {
        set({
          searchKeyword: "",
          isSearchMode: false,
          searchResults: [],
        });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      setRefreshing: (refreshing: boolean) => {
        set({ refreshing });
      },

      // ==================== 搜索和筛选方法 ====================
      searchContacts: async (keyword: string) => {
        if (!keyword.trim()) {
          set({ isSearchMode: false, searchResults: [] });
          return;
        }

        set({ loading: true, isSearchMode: true });

        try {
          const currentUserId = useUserStore.getState().user?.id;

          if (!currentUserId) {
            set({ searchResults: [], isSearchMode: false, loading: false });
            return;
          }

          const results = await ContactManager.searchContacts(
            currentUserId,
            keyword,
          );
          set({ searchResults: results });
        } catch (error) {
          console.error("搜索联系人失败:", error);
          set({ searchResults: [] });
        } finally {
          set({ loading: false });
        }
      },

      filterByCustomer: async (customerId: number) => {
        set({ loading: true });

        try {
          const contacts = await ContactManager.getContactsByCustomer(
            get().currentContact?.userId || 0,
            customerId,
          );
          set({ contactList: contacts });
        } catch (error) {
          console.error("按客服筛选联系人失败:", error);
        } finally {
          set({ loading: false });
        }
      },

      clearFilter: () => {
        set({
          contactList: [],
          searchResults: [],
          isSearchMode: false,
          searchKeyword: "",
        });
      },

      // ==================== 数据同步方法 ====================
      syncFromServer: async (userId: number) => {
        set({ refreshing: true });

        try {
          // 这里应该调用实际的API
          // const serverContacts = await getContactListFromServer(userId);
          // await ContactManager.syncContacts(userId, serverContacts);

          // 临时使用本地数据
          const localContacts = await ContactManager.getUserContacts(userId);
          set({ contactList: localContacts });
        } catch (error) {
          console.error("从服务器同步联系人失败:", error);
        } finally {
          set({ refreshing: false });
        }
      },

      loadFromLocal: async (userId: number) => {
        set({ loading: true });

        try {
          const contacts = await ContactManager.getUserContacts(userId);
          set({ contactList: contacts });
        } catch (error) {
          console.error("从本地加载联系人失败:", error);
        } finally {
          set({ loading: false });
        }
      },

      refreshContacts: async (userId: number) => {
        await get().loadFromLocal(userId);
        await get().syncFromServer(userId);
      },

      // ==================== 联系人操作方法 ====================
      addContact: async (contact: Contact) => {
        try {
          await ContactManager.addContact(contact);
          set(state => ({
            contactList: [...state.contactList, contact],
          }));
        } catch (error) {
          console.error("添加联系人失败:", error);
          throw error;
        }
      },

      updateContact: async (contact: Contact) => {
        try {
          await ContactManager.updateContact(contact);
          set(state => ({
            contactList: state.contactList.map(c =>
              c.id === contact.id ? contact : c,
            ),
          }));
        } catch (error) {
          console.error("更新联系人失败:", error);
          throw error;
        }
      },

      deleteContact: async (contactId: number) => {
        try {
          await ContactManager.deleteContact(contactId);
          set(state => ({
            contactList: state.contactList.filter(c => c.id !== contactId),
          }));
        } catch (error) {
          console.error("删除联系人失败:", error);
          throw error;
        }
      },

      addContacts: async (contacts: Contact[]) => {
        try {
          await ContactManager.addContacts(contacts);
          set(state => ({
            contactList: [...state.contactList, ...contacts],
          }));
        } catch (error) {
          console.error("批量添加联系人失败:", error);
          throw error;
        }
      },

      // ==================== 分组管理方法 ====================
      getContactGroups: async (userId: number, customerId?: number) => {
        try {
          const groups = await ContactManager.getContactGroups(
            userId,
            customerId,
          );
          set({ contactGroups: groups });
          return groups;
        } catch (error) {
          console.error("获取联系人分组失败:", error);
          return [];
        }
      },

      createContactGroup: async (group: Omit<ContactGroupByLabel, "id">) => {
        try {
          await ContactManager.createContactGroup(group);
          // 重新获取分组列表
          await get().getContactGroups(get().currentContact?.userId || 0);
        } catch (error) {
          console.error("创建联系人分组失败:", error);
          throw error;
        }
      },

      updateContactGroup: async (group: ContactGroupByLabel) => {
        try {
          await ContactManager.updateContactGroup(group);
          set(state => ({
            contactGroups: state.contactGroups.map(g =>
              g.id === group.id ? group : g,
            ),
          }));
        } catch (error) {
          console.error("更新联系人分组失败:", error);
          throw error;
        }
      },

      deleteContactGroup: async (groupId: number) => {
        try {
          await ContactManager.deleteContactGroup(groupId);
          set(state => ({
            contactGroups: state.contactGroups.filter(g => g.id !== groupId),
          }));
        } catch (error) {
          console.error("删除联系人分组失败:", error);
          throw error;
        }
      },

      // ==================== 分页方法 ====================
      loadMoreContacts: async (groupId: string) => {
        const state = get();
        if (state.loadingStates[groupId] || !state.hasMore[groupId]) {
          return;
        }

        set(state => ({
          loadingStates: { ...state.loadingStates, [groupId]: true },
        }));

        try {
          const currentPage = state.currentPage[groupId] || 1;
          const nextPage = currentPage + 1;
          const pageSize = 20;

          // 这里应该调用实际的分页API
          // const newContacts = await getContactsByGroup(groupId, nextPage, pageSize);

          // 临时使用本地数据模拟分页
          const allContacts = state.contactList;
          const startIndex = currentPage * pageSize;
          const endIndex = nextPage * pageSize;
          const newContacts = allContacts.slice(startIndex, endIndex);

          set(state => ({
            visibleContacts: {
              ...state.visibleContacts,
              [groupId]: [
                ...(state.visibleContacts[groupId] || []),
                ...newContacts,
              ],
            },
            currentPage: { ...state.currentPage, [groupId]: nextPage },
            hasMore: {
              ...state.hasMore,
              [groupId]: endIndex < allContacts.length,
            },
            loadingStates: { ...state.loadingStates, [groupId]: false },
          }));
        } catch (error) {
          console.error("加载更多联系人失败:", error);
          set(state => ({
            loadingStates: { ...state.loadingStates, [groupId]: false },
          }));
        }
      },

      resetPagination: () => {
        set({
          visibleContacts: {},
          loadingStates: {},
          hasMore: {},
          currentPage: {},
        });
      },

      // ==================== 转发相关方法 ====================
      setSelectedTransmitContacts: (contacts: Contact[]) => {
        set({ selectedTransmitContacts: contacts });
      },

      addTransmitContact: (contact: Contact) => {
        set(state => {
          const exists = state.selectedTransmitContacts.some(
            c => c.id === contact.id,
          );
          if (exists) return state;
          return {
            selectedTransmitContacts: [
              ...state.selectedTransmitContacts,
              contact,
            ],
          };
        });
      },

      removeTransmitContact: (contactId: number) => {
        set(state => ({
          selectedTransmitContacts: state.selectedTransmitContacts.filter(
            c => c.id !== contactId,
          ),
        }));
      },

      clearTransmitContacts: () => {
        set({ selectedTransmitContacts: [] });
      },

      setTransmitModal: (open: boolean) => {
        set({ openTransmitModal: open });
      },

      // ==================== 便捷获取方法 ====================
      getContactById: (id: number) => {
        const state = get();
        return state.contactList.find(contact => contact.id === id);
      },

      getContactsByCustomer: (customerId: number) => {
        const state = get();
        return state.contactList.filter(
          contact => contact.wechatAccountId === customerId,
        );
      },

      getContactCount: () => {
        return get().contactList.length;
      },

      getSearchResultCount: () => {
        return get().searchResults.length;
      },
    }),
    {
      name: "contacts-storage",
      partialize: () => ({
        // 只持久化必要的状态，不持久化临时状态
        contactList: [],
        contactGroups: [],
        currentContact: null,
        searchKeyword: "",
        selectedTransmitContacts: [],
        openTransmitModal: false,
      }),
    },
  ),
);

// ==================== 便捷选择器导出 ====================
/** 获取联系人列表的 Hook */
export const useContactList = () => useContactStore(state => state.contactList);
/** 获取当前联系人的 Hook */
export const useCurrentContact = () =>
  useContactStore(state => state.currentContact);
/** 获取搜索关键词的 Hook */
export const useSearchKeyword = () =>
  useContactStore(state => state.searchKeyword);
/** 获取加载状态的 Hook */
export const useContactLoading = () => useContactStore(state => state.loading);
/** 获取刷新状态的 Hook */
export const useContactRefreshing = () =>
  useContactStore(state => state.refreshing);
/** 获取搜索结果的 Hook */
export const useSearchResults = () =>
  useContactStore(state => state.searchResults);
/** 获取是否在搜索模式的 Hook */
export const useIsSearchMode = () =>
  useContactStore(state => state.isSearchMode);
/** 获取转发联系人的 Hook */
export const useSelectedTransmitContacts = () =>
  useContactStore(state => state.selectedTransmitContacts);
/** 获取转发弹窗状态的 Hook */
export const useTransmitModal = () =>
  useContactStore(state => state.openTransmitModal);
