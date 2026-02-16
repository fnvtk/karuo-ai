/**
 * 联系人Store - 新架构实现
 * 支持分组懒加载、API搜索、分组编辑等功能
 *
 * 注意：这是一个新文件，用于逐步迁移。最终会替换原有的contacts.ts
 */

import { createPersistStore } from "@/store/createPersistStore";
import { Contact } from "@/utils/db";
import { useUserStore } from "@/store/module/user";
import { useWeChatAccountStore } from "./account";
import {
  ContactGroup,
  ContactStoreState,
  GroupContactData,
  VirtualScrollState,
} from "./contacts.data";
import {
  getContactList,
  getGroupList,
  getLabelsListByGroup,
} from "@/pages/pc/ckbox/weChat/api";
import {
  addGroup,
  updateGroup,
  deleteGroup,
  moveGroup,
} from "@/api/module/group";
import { updateFriendInfo } from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/ProfileCard/components/ProfileModules/api";
import {
  convertFriendsToContacts,
  convertGroupsToContacts,
} from "@/pages/pc/ckbox/weChat/components/SidebarMenu/WechatFriends/extend";
import {
  groupListCache,
  groupContactsCache,
  groupStatsCache,
} from "@/utils/cache";
import { ContactManager } from "@/utils/dbAction/contact";
import { useMessageStore } from "./message";
import { performanceMonitor } from "@/utils/performance";

/**
 * 生成分组Key
 */
const getGroupKey = (
  groupId: number,
  groupType: 1 | 2,
  accountId: number,
): string => {
  return `${groupId}_${groupType}_${accountId}`;
};

/**
 * 联系人Store - 新架构实现
 */
export const useContactStoreNew = createPersistStore<ContactStoreState>(
  (set, get) => ({
    // ==================== 初始状态 ====================
    groups: [],
    selectedAccountId: 0, // 0表示"全部"
    expandedGroups: new Set<string>(),
    groupData: new Map<string, GroupContactData>(),
    searchKeyword: "",
    isSearchMode: false,
    searchResults: [],
    searchLoading: false,
    virtualScrollStates: new Map<string, VirtualScrollState>(),

    // ==================== 保留原有接口（向后兼容）====================
    contactList: [],
    contactGroups: [],
    currentContact: null,
    loading: false,
    refreshing: false,
    searchResults_old: [],
    isSearchMode_old: false,
    visibleContacts: {},
    loadingStates: {},
    hasMore: {},
    currentPage: {},
    selectedTransmitContacts: [],
    openTransmitModal: false,

    // ==================== 分组管理 ====================
    /**
     * 设置分组列表
     */
    setGroups: async (groups: ContactGroup[]) => {
      // 先重置人数为占位值 -1，等真正展开分组、拿到 total 后再更新
      const groupsWithPlaceholder = groups.map(g => ({
        ...g,
        count: -1,
      }));

      // 按自定义规则排序：
      // 1. 默认群分组（groupType=2 且 id=0）始终在最前
      // 2. 未分组（groupType=1 且 id=0）始终在最后
      // 3. 其他分组按 sort 升序
      const sortedGroups = [...groupsWithPlaceholder].sort((a, b) => {
        const isDefaultGroupA = a.groupType === 2 && a.id === 0;
        const isDefaultGroupB = b.groupType === 2 && b.id === 0;
        const isUngroupedA = a.groupType === 1 && a.id === 0;
        const isUngroupedB = b.groupType === 1 && b.id === 0;

        // 默认群分组始终最前
        if (isDefaultGroupA && !isDefaultGroupB) return -1;
        if (!isDefaultGroupA && isDefaultGroupB) return 1;

        // 未分组始终最后
        if (isUngroupedA && !isUngroupedB) return 1;
        if (!isUngroupedA && isUngroupedB) return -1;

        // 其他按 sort 排序
        return (a.sort || 0) - (b.sort || 0);
      });
      set({ groups: sortedGroups });

      // 缓存分组列表
      const accountId = get().selectedAccountId;
      const cacheKey = `groups_${accountId}`;
      await groupListCache.set(cacheKey, sortedGroups);
    },

    /**
     * 加载分组列表（带缓存）
     */
    loadGroups: async (accountId?: number) => {
      const targetAccountId = accountId ?? get().selectedAccountId;
      const cacheKey = `groups_${targetAccountId}`;

      // 1. 先尝试从缓存读取
      const cached = await groupListCache.get<ContactGroup[]>(cacheKey);
      if (cached && cached.length > 0) {
        // 立即显示缓存数据
        set({ groups: cached });
        // 后台更新（不阻塞UI）
        get().loadGroupsFromAPI(targetAccountId).catch(console.error);
        return cached;
      }

      // 2. 无缓存，调用API
      return await get().loadGroupsFromAPI(targetAccountId);
    },

    /**
     * 从API加载分组列表
     */
    loadGroupsFromAPI: async (accountId: number) => {
      try {
        const userId = useUserStore.getState().user?.id;
        if (!userId) {
          throw new Error("用户未登录");
        }

        const params: any = {
          page: 1,
          limit: 1000, // 分组列表通常不会太多
          // 即便为 0 也要把 wechatAccountId 传给接口，由后端决定含义
          wechatAccountId: accountId,
        };

        // 单次请求分组列表，按 groupType 区分好友/群分组
        const result = await getLabelsListByGroup(params);
        const list = result?.list || [];

        const friendGroups: ContactGroup[] = list
          .filter((item: any) => Number(item.groupType) === 1)
          .map((item: any) => ({
            id: item.id,
            groupName: item.groupName,
            groupType: 1,
            count: item.count || 0,
            sort: item.sort || 0,
            groupMemo: item.groupMemo || "",
          }));

        const groupGroups: ContactGroup[] = list
          .filter((item: any) => Number(item.groupType) === 2)
          .map((item: any) => ({
            id: item.id,
            groupName: item.groupName,
            groupType: 2,
            count: item.count || 0,
            sort: item.sort || 0,
            groupMemo: item.groupMemo || "",
          }));

        // 额外补充：默认群分组 & 未分组（接口不返回，由前端约定）
        const extraGroups: ContactGroup[] = [];

        const hasDefaultGroup = groupGroups.some(
          g => g.id === 0 && g.groupType === 2,
        );
        if (!hasDefaultGroup) {
          extraGroups.push({
            id: 0,
            groupName: "默认群分组",
            groupType: 2,
            count: 0,
            sort: -9999,
            groupMemo: "",
          });
        }

        const hasUngrouped = friendGroups.some(
          g => g.id === 0 && g.groupType === 1,
        );
        if (!hasUngrouped) {
          extraGroups.push({
            id: 0,
            groupName: "未分组",
            groupType: 1,
            count: 0,
            sort: 999999,
            groupMemo: "",
          });
        }

        const allGroups = [...extraGroups, ...friendGroups, ...groupGroups];
        await get().setGroups(allGroups);

        return allGroups;
      } catch (error) {
        console.error("加载分组列表失败:", error);
        throw error;
      }
    },

    /**
     * 切换分组展开/折叠
     */
    toggleGroup: async (groupId: number, groupType: 1 | 2) => {
      return performanceMonitor.measureAsync(
        `ContactStore.toggleGroup(${groupId}, ${groupType})`,
        async () => {
          const state = get();
          const accountId = state.selectedAccountId;
          const groupKey = getGroupKey(groupId, groupType, accountId);

          const expandedGroups = new Set(state.expandedGroups);

          if (expandedGroups.has(groupKey)) {
            // 折叠
            expandedGroups.delete(groupKey);
            set({ expandedGroups });
          } else {
            // 展开 - 懒加载
            expandedGroups.add(groupKey);
            set({ expandedGroups });
            // 加载分组联系人
            await get().loadGroupContacts(groupId, groupType, 1, 50);
          }
        },
        { groupId, groupType },
      );
    },

    // ==================== 分组数据加载 ====================
    /**
     * 加载分组联系人（懒加载，带缓存）
     */
    loadGroupContacts: async (
      groupId: number,
      groupType: 1 | 2,
      page: number = 1,
      limit: number = 50,
    ) => {
      // 在 measureAsync 调用之前获取 accountId，用于 metadata
      const accountIdForMetadata = get().selectedAccountId;
      return performanceMonitor.measureAsync(
        `ContactStore.loadGroupContacts(${groupId}, ${groupType}, page=${page})`,
        async () => {
          const state = get();
          // 在异步函数内部重新获取 accountId，确保使用执行时的值
          const accountId = state.selectedAccountId;
          const groupKey = getGroupKey(groupId, groupType, accountId);
          const currentData = state.groupData.get(groupKey);

          // 如果已经加载过且不是第一页，直接返回
          if (currentData?.loaded && page > 1 && !currentData.hasMore) {
            return;
          }

          // 第一页时，先尝试从缓存读取
          if (page === 1) {
            const cacheKey = `groupContacts_${groupKey}`;
            const cached =
              await groupContactsCache.get<GroupContactData>(cacheKey);
            if (cached && cached.contacts && cached.contacts.length > 0) {
              // 立即显示缓存数据
              const groupData = new Map(state.groupData);
              groupData.set(groupKey, {
                ...cached,
                loading: false,
              });
              set({ groupData });

              // 后台更新（不阻塞UI）
              get()
                .loadGroupContactsFromAPI(groupId, groupType, page, limit)
                .catch(console.error);
              return;
            } else {
              // 没有缓存，先设置loading状态
              const groupData = new Map(state.groupData);
              groupData.set(groupKey, {
                contacts: [],
                page: 1,
                pageSize: limit,
                hasMore: true,
                loading: true,
                loaded: false,
                lastLoadTime: Date.now(),
              });
              set({ groupData });
            }
          } else {
            // 非第一页，先设置loading状态
            const groupData = new Map(state.groupData);
            const existingData = state.groupData.get(groupKey);
            groupData.set(groupKey, {
              contacts: existingData?.contacts || [],
              page: existingData?.page || 1,
              pageSize: limit,
              hasMore: existingData?.hasMore ?? true,
              loading: true,
              loaded: existingData?.loaded || false,
              lastLoadTime: Date.now(),
            });
            set({ groupData });
          }

          // 调用API加载数据
          await get().loadGroupContactsFromAPI(groupId, groupType, page, limit);
        },
        { groupId, groupType, page, accountId: accountIdForMetadata },
      );
    },

    /**
     * 从API加载分组联系人
     */
    loadGroupContactsFromAPI: async (
      groupId: number,
      groupType: 1 | 2,
      page: number = 1,
      limit: number = 50,
    ) => {
      const state = get();
      const accountId = state.selectedAccountId;
      const groupKey = getGroupKey(groupId, groupType, accountId);
      const currentData = state.groupData.get(groupKey);

      // 注意：loadGroupContacts 已经设置了 loading 状态，所以这里直接执行 API 调用
      // 但如果 currentData 不存在（直接调用此方法），需要设置初始状态
      if (!currentData) {
        const groupData = new Map(state.groupData);
        const loadingData: GroupContactData = {
          contacts: [],
          page,
          pageSize: limit,
          hasMore: true,
          loading: true,
          loaded: false,
          lastLoadTime: Date.now(),
        };
        groupData.set(groupKey, loadingData);
        set({ groupData });
      }

      try {
        const userId = useUserStore.getState().user?.id;
        if (!userId) {
          throw new Error("用户未登录");
        }

        let contacts: Contact[] = [];

        const params: any = {
          page,
          limit,
        };

        // 根据groupType调用不同的API
        let total = 0;

        if (groupType === 1) {
          // 好友列表API
          // 分组ID：即便为 0（未分组）也要传给接口，由后端决定语义
          params.groupId = groupId;
          // 账号ID：即便为 0 也要传
          params.wechatAccountId = accountId;

          const result = await getContactList(params, { debounceGap: 0 });
          const friendList = result?.list || [];
          total =
            typeof result?.total === "number"
              ? result.total
              : friendList.length;
          contacts = convertFriendsToContacts(friendList, userId);
        } else if (groupType === 2) {
          // 群列表API
          // 分组ID：即便为 0（默认群分组）也要传给接口
          params.groupId = groupId;
          // 账号ID：即便为 0 也要传
          params.wechatAccountId = accountId;

          const result = await getGroupList(params, { debounceGap: 0 });
          const groupList = result?.list || [];
          total =
            typeof result?.total === "number" ? result.total : groupList.length;
          contacts = convertGroupsToContacts(groupList, userId);
        }

        // 更新数据（从最新的 state 获取当前数据，确保使用最新的 contacts）
        const latestState = get();
        const latestGroupData = latestState.groupData.get(groupKey);
        const existingContacts = latestGroupData?.contacts || [];

        const updatedData: GroupContactData = {
          contacts: page === 1 ? contacts : [...existingContacts, ...contacts], // 使用最新的 contacts，而不是 currentData
          page,
          pageSize: limit,
          hasMore: contacts.length === limit,
          loading: false,
          loaded: true,
          lastLoadTime: Date.now(),
        };

        const updatedGroupData = new Map(latestState.groupData);
        updatedGroupData.set(groupKey, updatedData);

        // 同步更新分组人数：使用接口返回的 total
        const updatedGroups = latestState.groups.map(g =>
          g.id === groupId && g.groupType === groupType
            ? { ...g, count: total }
            : g,
        );

        set({ groupData: updatedGroupData, groups: updatedGroups });

        // 缓存第一页数据
        if (page === 1) {
          const cacheKey = `groupContacts_${groupKey}`;
          await groupContactsCache.set(cacheKey, updatedData);
        }
      } catch (error) {
        console.error("加载分组联系人失败:", error);
        // 恢复加载状态
        const errorGroupData = new Map(groupData);
        errorGroupData.set(groupKey, {
          ...currentData,
          loading: false,
        });
        set({ groupData: errorGroupData });
        throw error;
      }
    },

    /**
     * 加载更多分组联系人
     */
    loadMoreGroupContacts: async (groupId: number, groupType: 1 | 2) => {
      const state = get();
      const accountId = state.selectedAccountId;
      const groupKey = getGroupKey(groupId, groupType, accountId);
      const currentData = state.groupData.get(groupKey);

      if (!currentData || !currentData.hasMore || currentData.loading) {
        return; // 没有更多数据或正在加载
      }

      // 加载下一页
      const nextPage = currentData.page + 1;
      await get().loadGroupContacts(
        groupId,
        groupType,
        nextPage,
        currentData.pageSize,
      );
    },

    // ==================== 搜索 ====================
    /**
     * 搜索联系人（API搜索，并行请求）
     */
    searchContacts: async (keyword: string) => {
      if (!keyword.trim()) {
        set({
          isSearchMode: false,
          searchResults: [],
          searchKeyword: "",
        });
        return;
      }

      set({
        searchKeyword: keyword,
        isSearchMode: true,
        searchLoading: true,
      });

      return performanceMonitor.measureAsync(
        `ContactStore.searchContacts("${keyword}")`,
        async () => {
          try {
            const userId = useUserStore.getState().user?.id;
            if (!userId) {
              throw new Error("用户未登录");
            }

            const accountId = get().selectedAccountId;
            const params: any = {
              keyword,
              page: 1,
              limit: 100, // 搜索时可能需要加载更多结果
            };

            if (accountId !== 0) {
              params.wechatAccountId = accountId;
            }

            // 并行请求好友列表和群列表
            const [friendsResult, groupsResult] = await Promise.all([
              getContactList(params, { debounceGap: 0 }),
              getGroupList(params, { debounceGap: 0 }),
            ]);

            // 合并结果
            const friends = friendsResult?.list || [];
            const groups = groupsResult?.list || [];
            const friendContacts = convertFriendsToContacts(friends, userId);
            const groupContacts = convertGroupsToContacts(groups, userId);
            const allResults = [...friendContacts, ...groupContacts];

            set({
              searchResults: allResults,
              searchLoading: false,
            });
          } catch (error) {
            console.error("搜索联系人失败:", error);
            set({
              searchResults: [],
              searchLoading: false,
            });
            throw error;
          }
        },
        { keyword, accountId: get().selectedAccountId },
      );
    },

    /**
     * 清除搜索
     */
    clearSearch: () => {
      set({
        searchKeyword: "",
        isSearchMode: false,
        searchResults: [],
        searchLoading: false,
      });
    },

    // ==================== 切换账号 ====================
    /**
     * 切换账号（重新加载展开的分组）
     */
    switchAccount: async (accountId: number) => {
      return performanceMonitor.measureAsync(
        `ContactStore.switchAccount(${accountId})`,
        async () => {
          const state = get();
          set({ selectedAccountId: accountId });

          // 重新加载展开的分组
          const expandedGroups = Array.from(state.expandedGroups);
          const groupData = new Map<string, GroupContactData>();

          // 清理旧账号的数据
          for (const groupKey of expandedGroups) {
            // 检查是否是当前账号的分组
            const parts = groupKey.split("_");
            if (parts.length === 3) {
              const oldAccountId = parseInt(parts[2], 10);
              if (oldAccountId === accountId) {
                // 保留当前账号的数据
                const oldData = state.groupData.get(groupKey);
                if (oldData) {
                  groupData.set(groupKey, oldData);
                }
              }
            }
          }

          set({ groupData });

          // 重新加载展开的分组
          for (const groupKey of expandedGroups) {
            const parts = groupKey.split("_");
            if (parts.length === 3) {
              const groupId = parseInt(parts[0], 10);
              const groupType = parseInt(parts[1], 10) as 1 | 2;
              const oldAccountId = parseInt(parts[2], 10);

              if (oldAccountId !== accountId) {
                // 不同账号，需要重新加载
                const newGroupKey = getGroupKey(groupId, groupType, accountId);
                const expandedGroupsNew = new Set(state.expandedGroups);
                expandedGroupsNew.delete(groupKey);
                expandedGroupsNew.add(newGroupKey);
                set({ expandedGroups: expandedGroupsNew });

                await get().loadGroupContacts(groupId, groupType, 1, 50);
              }
            }
          }
        },
        { accountId, expandedGroupsCount: state.expandedGroups.size },
      );
    },

    // ==================== 分组编辑操作 ====================
    /**
     * 新增分组
     */
    addGroup: async (group: Omit<ContactGroup, "id" | "count">) => {
      try {
        const result: any = await addGroup({
          groupName: group.groupName,
          groupMemo: group.groupMemo || "",
          groupType: group.groupType,
          sort: group.sort || 0,
        });

        const newGroup: ContactGroup = {
          id: result?.id || result?.data?.id || 0,
          groupName:
            result?.groupName || result?.data?.groupName || group.groupName,
          groupType: (result?.groupType ||
            result?.data?.groupType ||
            group.groupType) as 1 | 2,
          count: 0, // 新分组初始数量为0
          sort: result?.sort || result?.data?.sort || group.sort || 0,
          groupMemo:
            result?.groupMemo || result?.data?.groupMemo || group.groupMemo,
        };

        const groups = [...get().groups, newGroup];
        get().setGroups(groups);
      } catch (error) {
        console.error("新增分组失败:", error);
        throw error;
      }
    },

    /**
     * 更新分组
     */
    updateGroup: async (group: ContactGroup) => {
      try {
        await updateGroup({
          id: group.id,
          groupName: group.groupName,
          groupMemo: group.groupMemo || "",
          groupType: group.groupType,
          sort: group.sort || 0,
        });

        const groups = get().groups.map(g => (g.id === group.id ? group : g));
        get().setGroups(groups);
      } catch (error) {
        console.error("更新分组失败:", error);
        throw error;
      }
    },

    /**
     * 删除分组
     */
    deleteGroup: async (groupId: number, groupType: 1 | 2) => {
      try {
        await deleteGroup(groupId);

        // 从分组列表删除
        const groups = get().groups.filter(
          g => !(g.id === groupId && g.groupType === groupType),
        );
        get().setGroups(groups);

        // 清理该分组的所有缓存数据
        const groupData = new Map(get().groupData);
        const expandedGroups = new Set(get().expandedGroups);

        // 清理所有账号的该分组数据
        groupData.forEach((value, key) => {
          if (key.startsWith(`${groupId}_${groupType}_`)) {
            groupData.delete(key);
          }
        });

        // 清理展开状态
        expandedGroups.forEach(key => {
          if (key.startsWith(`${groupId}_${groupType}_`)) {
            expandedGroups.delete(key);
          }
        });

        set({ groupData, expandedGroups });
      } catch (error) {
        console.error("删除分组失败:", error);
        throw error;
      }
    },

    // ==================== 联系人操作 ====================
    /**
     * 新增联系人（更新对应分组）
     */
    addContact: (contact: Contact) => {
      const state = get();
      const accountId = state.selectedAccountId;
      const groupKey = getGroupKey(
        contact.groupId || 0,
        contact.type === "friend" ? 1 : 2,
        accountId,
      );

      const groupData = new Map(state.groupData);
      const groupDataItem = groupData.get(groupKey);

      if (groupDataItem && groupDataItem.loaded) {
        // 如果分组已加载，添加到列表
        groupData.set(groupKey, {
          ...groupDataItem,
          contacts: [...groupDataItem.contacts, contact],
        });
        set({ groupData });
      }
    },

    /**
     * 更新联系人（更新对应分组）
     */
    updateContact: (contact: Contact) => {
      const state = get();
      const accountId = state.selectedAccountId;
      const groupKey = getGroupKey(
        contact.groupId || 0,
        contact.type === "friend" ? 1 : 2,
        accountId,
      );

      const groupData = new Map(state.groupData);
      const groupDataItem = groupData.get(groupKey);

      if (groupDataItem && groupDataItem.loaded) {
        const contacts = groupDataItem.contacts.map(c =>
          c.id === contact.id ? contact : c,
        );
        groupData.set(groupKey, {
          ...groupDataItem,
          contacts,
        });
        set({ groupData });
      }

      // 如果当前在搜索模式，更新搜索结果
      if (state.isSearchMode) {
        const searchResults = state.searchResults.map(c =>
          c.id === contact.id ? contact : c,
        );
        set({ searchResults });
      }
    },

    /**
     * 修改联系人备注（右键菜单）
     */
    updateContactRemark: async (
      contactId: number,
      groupId: number,
      groupType: 1 | 2,
      remark: string,
    ) => {
      try {
        // 调用API更新备注
        await updateFriendInfo({
          id: contactId,
          conRemark: remark,
          phone: "",
          company: "",
          name: "",
          position: "",
          email: "",
          address: "",
          qq: "",
          remark: "",
        });

        // 更新内存中的数据
        const state = get();
        const accountId = state.selectedAccountId;
        const groupKey = getGroupKey(groupId, groupType, accountId);

        const groupData = new Map(state.groupData);
        const groupDataItem = groupData.get(groupKey);

        if (groupDataItem && groupDataItem.loaded) {
          const contacts = groupDataItem.contacts.map(c =>
            c.id === contactId ? { ...c, conRemark: remark } : c,
          );
          groupData.set(groupKey, {
            ...groupDataItem,
            contacts,
          });
          set({ groupData });

          // 更新缓存
          const cacheKey = `groupContacts_${groupKey}`;
          const cachedData =
            await groupContactsCache.get<GroupContactData>(cacheKey);
          if (cachedData && cachedData.contacts) {
            const updatedContacts = cachedData.contacts.map(c =>
              c.id === contactId ? { ...c, conRemark: remark } : c,
            );
            await groupContactsCache.set(cacheKey, {
              ...cachedData,
              contacts: updatedContacts,
            });
          }
        }

        // 如果当前在搜索模式，更新搜索结果
        if (state.isSearchMode) {
          const searchResults = state.searchResults.map(c =>
            c.id === contactId ? { ...c, conRemark: remark } : c,
          );
          set({ searchResults });
        }

        // 更新数据库
        const userId = useUserStore.getState().user?.id;
        if (userId) {
          const contact = await ContactManager.getContactByIdAndType(
            userId,
            contactId,
            groupType === 1 ? "friend" : "group",
          );
          if (contact) {
            await ContactManager.updateContact({
              ...contact,
              conRemark: remark,
            });
          }
        }

        // 同步更新会话列表中的备注名称
        try {
          const messageState = useMessageStore.getState();
          const existingSessions = messageState.allSessions;
          if (existingSessions && existingSessions.length > 0) {
            existingSessions
              .filter(
                s =>
                  s.id === contactId &&
                  (groupType === 1
                    ? s.type === "friend"
                    : s.type === "group"),
              )
              .forEach(s => {
                messageState.addSession({
                  ...s,
                  conRemark: remark,
                });
              });
          }
        } catch (err) {
          console.error("同步会话列表备注失败:", err);
        }
      } catch (error) {
        console.error("更新联系人备注失败:", error);
        throw error;
      }
    },

    /**
     * 删除联系人
     */
    deleteContact: (contactId: number, groupId: number, groupType: 1 | 2) => {
      const state = get();
      const accountId = state.selectedAccountId;
      const groupKey = getGroupKey(groupId, groupType, accountId);

      const groupData = new Map(state.groupData);
      const groupDataItem = groupData.get(groupKey);

      if (groupDataItem && groupDataItem.loaded) {
        const contacts = groupDataItem.contacts.filter(c => c.id !== contactId);
        groupData.set(groupKey, {
          ...groupDataItem,
          contacts,
        });
        set({ groupData });
      }

      // 如果当前在搜索模式，从搜索结果中删除
      if (state.isSearchMode) {
        const searchResults = state.searchResults.filter(
          c => c.id !== contactId,
        );
        set({ searchResults });
      }
    },

    /**
     * 移动联系人到其他分组（右键菜单）
     */
    moveContactToGroup: async (
      contactId: number,
      fromGroupId: number,
      toGroupId: number,
      groupType: 1 | 2,
    ) => {
      try {
        // 调用API移动分组
        await moveGroup({
          // 好友用 friend，群聊用 chatroom
          type: groupType === 1 ? "friend" : "chatroom",
          groupId: toGroupId,
          id: contactId,
        });

        const state = get();
        const accountId = state.selectedAccountId;

        // 从原分组移除
        const fromGroupKey = getGroupKey(fromGroupId, groupType, accountId);
        const groupData = new Map(state.groupData);
        const fromGroupData = groupData.get(fromGroupKey);

        if (fromGroupData && fromGroupData.loaded) {
          const contacts = fromGroupData.contacts.filter(
            c => c.id !== contactId,
          );
          groupData.set(fromGroupKey, {
            ...fromGroupData,
            contacts,
          });
        }

        // 添加到新分组（如果已加载）
        const toGroupKey = getGroupKey(toGroupId, groupType, accountId);
        const toGroupData = groupData.get(toGroupKey);

        if (toGroupData && toGroupData.loaded) {
          // 重新加载该联系人数据（因为groupId已变化）
          const userId = useUserStore.getState().user?.id;
          if (userId) {
            const updatedContact = await ContactManager.getContactByIdAndType(
              userId,
              contactId,
              groupType === 1 ? "friend" : "group",
            );
            if (updatedContact) {
              const updatedContacts = [...toGroupData.contacts, updatedContact];
              groupData.set(toGroupKey, {
                ...toGroupData,
                contacts: updatedContacts,
              });

              // 更新缓存
              const cacheKey = `groupContacts_${toGroupKey}`;
              const cachedData =
                await groupContactsCache.get<GroupContactData>(cacheKey);
              if (cachedData) {
                await groupContactsCache.set(cacheKey, {
                  ...cachedData,
                  contacts: updatedContacts,
                });
              }
            }
          }
        }

        set({ groupData });
      } catch (error) {
        console.error("移动联系人失败:", error);
        throw error;
      }
    },

    // ==================== 虚拟滚动 ====================
    /**
     * 设置可见范围
     */
    setVisibleRange: (groupKey: string, start: number, end: number) => {
      const virtualScrollStates = new Map(get().virtualScrollStates);
      virtualScrollStates.set(groupKey, {
        startIndex: start,
        endIndex: end,
        itemHeight: 60, // 默认高度
        containerHeight: 600, // 默认容器高度
        totalHeight: 0, // 需要根据数据计算
      });
      set({ virtualScrollStates });
    },

    // ==================== 保留原有方法（向后兼容）====================
    setContactList: (contacts: Contact[]) => {
      set({ contactList: contacts });
    },
    setContactGroups: (groups: any[]) => {
      set({ contactGroups: groups });
    },
    setCurrentContact: (contact: Contact | null) => {
      set({ currentContact: contact });
    },
    clearCurrentContact: () => {
      set({ currentContact: null });
    },
    setSearchKeyword_old: (keyword: string) => {
      set({ searchKeyword: keyword });
    },
    clearSearchKeyword: () => {
      get().clearSearch();
    },
    setLoading: (loading: boolean) => {
      set({ loading });
    },
    setRefreshing: (refreshing: boolean) => {
      set({ refreshing });
    },
  }),
  {
    name: "contacts-store-new",
    partialize: state => {
      // Map和Set类型需要转换为数组才能持久化
      const expandedGroupsArray = Array.from(state.expandedGroups);
      const groupDataArray = Array.from(state.groupData.entries());
      const virtualScrollStatesArray = Array.from(
        state.virtualScrollStates.entries(),
      );

      return {
        groups: state.groups,
        selectedAccountId: state.selectedAccountId,
        expandedGroups: expandedGroupsArray,
        groupData: groupDataArray,
        searchKeyword: state.searchKeyword,
        isSearchMode: state.isSearchMode,
        virtualScrollStates: virtualScrollStatesArray,
        // 保留原有字段
        contactList: state.contactList,
        contactGroups: state.contactGroups,
        currentContact: state.currentContact,
      };
    },
    // 恢复时，将数组转换回Map和Set
    onRehydrateStorage: () => (state: any, error: any) => {
      if (error) {
        console.error("ContactStore rehydration error:", error);
        return;
      }
      if (state) {
        if (Array.isArray(state.expandedGroups)) {
          state.expandedGroups = new Set(state.expandedGroups);
        }
        if (Array.isArray(state.groupData)) {
          state.groupData = new Map(state.groupData);
        }
        if (Array.isArray(state.virtualScrollStates)) {
          state.virtualScrollStates = new Map(state.virtualScrollStates);
        }
      }
    },
  },
);
