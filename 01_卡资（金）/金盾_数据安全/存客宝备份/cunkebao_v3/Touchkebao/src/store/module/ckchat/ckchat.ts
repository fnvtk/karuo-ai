import { createPersistStore } from "@/store/createPersistStore";
import { CkChatState, CkUserInfo, CkTenant } from "./ckchat.data";
import {
  ContractData,
  weChatGroup,
  CkAccount,
  KfUserListData,
  ContactGroupByLabel,
} from "@/pages/pc/ckbox/data";
import { ContactManager } from "@/utils/dbAction";
import { createContractList } from "@/store/module/ckchat/api";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useUserStore } from "@/store/module/user";
// 从weChat store获取clearCurrentContact方法
const getClearCurrentContact = () =>
  useWeChatStore.getState().clearCurrentContact;
export const useCkChatStore = createPersistStore<CkChatState>(
  set => ({
    userInfo: null,
    isLoggedIn: false,
    chatSessions: [], //聊天会话
    kfUserList: [], //客服列表
    countLables: [], //标签列表
    kfSelected: 0, //选中的客服
    isLoadWeChat: false, //是否加载微信
    getIsLoadWeChat: () => {
      return useCkChatStore.getState().isLoadWeChat;
    },
    updateIsLoadWeChat: (isLoadWeChat: boolean) => {
      set({ isLoadWeChat });
    },
    //客服列表
    asyncKfUserList: async data => {
      set({ kfUserList: data });
    },
    // 获取客服列表
    getkfUserList: () => {
      const state = useCkChatStore.getState();
      return state.kfUserList;
    },
    // 异步设置标签列表
    asyncCountLables: async (data: ContactGroupByLabel[]) => {
      set({ countLables: data });
    },
    asyncKfSelected: async (data: number) => {
      set({ kfSelected: data });
      // 清除getChatSessions缓存
      const state = useCkChatStore.getState();
      if (
        state.getChatSessions &&
        typeof state.getChatSessions === "function"
      ) {
        // 触发缓存重新计算
        state.getChatSessions();
      }
    },

    // 异步设置会话列表
    asyncChatSessions: data => {
      set({ chatSessions: data });
      // 清除getChatSessions缓存
      const state = useCkChatStore.getState();
      if (
        state.getChatSessions &&
        typeof state.getChatSessions === "function"
      ) {
        // 触发缓存重新计算
        state.getChatSessions();
      }
    },
    //异步设置联系人分组
    asyncWeChatGroup: async (data: weChatGroup[]) => {
      const currentUserId = useUserStore.getState().user?.id || 0;
      // 转换为统一的 Contact 格式并保存
      await ContactManager.addContacts(
        data.map(g => ({
          serverId: `group_${g.id}`,
          userId: currentUserId,
          id: g.id,
          type: "group" as const,
          wechatAccountId: g.wechatAccountId,
          nickname: g.nickname,
          conRemark: g.conRemark,
          avatar: g.chatroomAvatar || "",
          lastUpdateTime: new Date().toISOString(),
          sortKey: "",
          searchKey: (g.conRemark || g.nickname || "").toLowerCase(),
          chatroomId: g.chatroomId,
          chatroomOwner: g.chatroomOwner,
          selfDisplayName: g.selfDisplyName,
          notice: g.notice,
        })),
      );
    },
    //获取选中的客服信息
    getKfSelectedUser: () => {
      const state = useCkChatStore.getState();
      return state.kfUserList.find(item => item.id === state.kfSelected);
    },
    getKfUserInfo: (wechatAccountId: number) => {
      const state = useCkChatStore.getState();
      return state.kfUserList.find(item => item.id === wechatAccountId);
    },

    // 删除控制终端用户
    deleteCtrlUser: (userId: number) => {
      set(state => ({
        kfUserList: state.kfUserList.filter(item => item.id !== userId),
      }));
    },
    // 更新控制终端用户
    updateCtrlUser: (user: KfUserListData) => {
      set(state => ({
        kfUserList: state.kfUserList.map(item =>
          item.id === user.id ? user : item,
        ),
      }));
    },
    // 清空控制终端用户列表
    clearkfUserList: () => {
      set({ kfUserList: [] });
    },
    // 添加控制终端用户
    addCtrlUser: (user: KfUserListData) => {
      set(state => ({
        kfUserList: [...state.kfUserList, user],
      }));
    },
    // 获取聊天会话 - 使用缓存避免无限循环
    getChatSessions: (() => {
      let cachedResult: any = null;
      let lastKfSelected: number | null = null;
      let lastChatSessionsLength: number = 0;

      return () => {
        const state = useCkChatStore.getState();

        // 检查是否需要重新计算缓存
        const shouldRecalculate =
          cachedResult === null ||
          lastKfSelected !== state.kfSelected ||
          lastChatSessionsLength !== state.chatSessions.length;

        if (shouldRecalculate) {
          let filteredSessions = state.chatSessions;

          // 根据客服筛选
          if (state.kfSelected !== 0) {
            filteredSessions = filteredSessions.filter(
              item => item.wechatAccountId === state.kfSelected,
            );
          }

          cachedResult = filteredSessions;
          lastKfSelected = state.kfSelected;
          lastChatSessionsLength = state.chatSessions.length;
        }

        return cachedResult;
      };
    })(),
    // 添加聊天会话
    addChatSession: (session: ContractData | weChatGroup) => {
      set(state => {
        // 检查是否已存在相同id的会话
        const exists = state.chatSessions.some(item => item.id === session.id);
        // 如果已存在则不添加，否则添加到列表顶部
        return {
          chatSessions: exists
            ? state.chatSessions
            : [session as ContractData | weChatGroup, ...state.chatSessions],
        };
      });
    },
    // 更新聊天会话
    updateChatSession: (session: ContractData | weChatGroup) => {
      set(state => ({
        chatSessions: state.chatSessions.map(item =>
          item.id === session.id ? { ...item, ...session } : item,
        ),
      }));
    },
    // 删除聊天会话
    deleteChatSession: (sessionId: number) => {
      set(state => ({
        chatSessions: state.chatSessions.filter(item => item.id !== sessionId),
      }));
      //当前选中的客户清空
      getClearCurrentContact();
    },
    // 置顶聊天会话到列表顶部
    pinChatSessionToTop: (sessionId: number) => {
      set(state => {
        const sessionIndex = state.chatSessions.findIndex(
          item => item.id === sessionId,
        );
        if (sessionIndex === -1) return state; // 会话不存在

        const session = state.chatSessions[sessionIndex];
        const otherSessions = state.chatSessions.filter(
          item => item.id !== sessionId,
        );

        return {
          chatSessions: [session, ...otherSessions],
        };
      });
    },
    // 切换会话置顶状态
    toggleChatSessionPin: (sessionId: number, isPinned: boolean) => {
      set(state => {
        const updatedSessions = state.chatSessions.map(item => {
          if (item.id === sessionId) {
            return {
              ...item,
              config: {
                ...item.config,
                top: isPinned,
              },
            };
          }
          return item;
        });

        // 如果置顶，将会话移到顶部
        if (isPinned) {
          const sessionIndex = updatedSessions.findIndex(
            item => item.id === sessionId,
          );
          if (sessionIndex !== -1) {
            const session = updatedSessions[sessionIndex];
            const otherSessions = updatedSessions.filter(
              item => item.id !== sessionId,
            );
            return {
              chatSessions: [session, ...otherSessions],
            };
          }
        } else {
          // 如果取消置顶，重新排序（置顶>未读>名称>时间）
          const sortedSessions = updatedSessions.sort((a, b) => {
            // 获取置顶状态
            const aTop = (a.config as any)?.top || false;
            const bTop = (b.config as any)?.top || false;

            // 首先按置顶状态排序（置顶的排在前面）
            if (aTop !== bTop) {
              return aTop ? -1 : 1;
            }

            // 如果都是置顶或都不是置顶，则按未读消息数量降序排列
            const aUnread = a.config?.unreadCount || 0;
            const bUnread = b.config?.unreadCount || 0;

            if (aUnread !== bUnread) {
              return bUnread - aUnread;
            }

            // 如果未读消息数量相同，则按显示名称排序
            const getDisplayName = (session: any) => {
              return session.conRemark || session.nickname || "";
            };
            const aName = getDisplayName(a).toLowerCase();
            const bName = getDisplayName(b).toLowerCase();

            if (aName !== bName) {
              return aName.localeCompare(bName, "zh-CN");
            }

            // 如果名称也相同，则按时间降序排列
            if (!a.lastUpdateTime) return 1;
            if (!b.lastUpdateTime) return -1;

            const timeCompare =
              new Date(b.lastUpdateTime).getTime() -
              new Date(a.lastUpdateTime).getTime();

            return timeCompare;
          });

          return {
            chatSessions: sortedSessions,
          };
        }

        return {
          chatSessions: updatedSessions,
        };
      });
    },
    // 设置用户信息
    setUserInfo: (userInfo: CkUserInfo) => {
      set({ userInfo, isLoggedIn: true });
    },

    // 清除用户信息
    clearUserInfo: () => {
      set({ userInfo: null, isLoggedIn: false });
    },

    // 更新账户信息
    updateAccount: (account: Partial<CkAccount>) => {
      set(state => ({
        userInfo: state.userInfo
          ? {
              ...state.userInfo,
              account: { ...state.userInfo.account, ...account },
            }
          : null,
      }));
    },

    // 更新租户信息
    updateTenant: (tenant: Partial<CkTenant>) => {
      set(state => ({
        userInfo: state.userInfo
          ? {
              ...state.userInfo,
              tenant: { ...state.userInfo.tenant, ...tenant },
            }
          : null,
      }));
    },

    // 获取账户ID
    getAccountId: () => {
      const state = useCkChatStore.getState();
      return Number(state.userInfo?.account?.id) || null;
    },

    // 获取租户ID
    getTenantId: () => {
      const state = useCkChatStore.getState();
      return state.userInfo?.tenant?.id || null;
    },

    // 获取账户名称
    getAccountName: () => {
      const state = useCkChatStore.getState();
      return (
        state.userInfo?.account?.realName ||
        state.userInfo?.account?.userName ||
        null
      );
    },

    // 获取租户名称
    getTenantName: () => {
      const state = useCkChatStore.getState();
      return state.userInfo?.tenant?.name || null;
    },
  }),
  {
    name: "ckchat-store",
    partialize: state => ({
      userInfo: state.userInfo,
      isLoggedIn: state.isLoggedIn,
      kfUserList: state.kfUserList,
    }),
    onRehydrateStorage: () => () => {
      // console.log("CkChat store hydrated");
    },
  },
);

// 导出便捷的获取方法
export const getCkAccountId = () => useCkChatStore.getState().getAccountId();
export const getCkTenantId = () => useCkChatStore.getState().getTenantId();
export const getCkAccountName = () =>
  useCkChatStore.getState().getAccountName();
export const getCkTenantName = () => useCkChatStore.getState().getTenantName();
export const getChatSessions = () =>
  useCkChatStore.getState().getChatSessions();
export const addChatSession = (session: ContractData | weChatGroup) =>
  useCkChatStore.getState().addChatSession(session);
export const updateChatSession = (session: ContractData | weChatGroup) =>
  useCkChatStore.getState().updateChatSession(session);
export const deleteChatSession = (sessionId: number) =>
  useCkChatStore.getState().deleteChatSession(sessionId);
export const getkfUserList = () => useCkChatStore.getState().kfUserList;
export const addCtrlUser = (user: KfUserListData) =>
  useCkChatStore.getState().addCtrlUser(user);
export const deleteCtrlUser = (userId: number) =>
  useCkChatStore.getState().deleteCtrlUser(userId);
export const updateCtrlUser = (user: KfUserListData) =>
  useCkChatStore.getState().updateCtrlUser(user);
export const asyncKfUserList = (data: KfUserListData[]) =>
  useCkChatStore.getState().asyncKfUserList(data);
export const asyncContractList = (data: ContractData[]) =>
  useCkChatStore.getState().asyncContractList(data);
export const asyncChatSessions = (data: ContractData[]) =>
  useCkChatStore.getState().asyncChatSessions(data);
export const asyncKfSelected = (data: number) =>
  useCkChatStore.getState().asyncKfSelected(data);
export const asyncWeChatGroup = (data: weChatGroup[]) =>
  useCkChatStore.getState().asyncWeChatGroup(data);
export const getKfSelectedUser = () =>
  useCkChatStore.getState().getKfSelectedUser();
export const getKfUserInfo = (wechatAccountId: number) =>
  useCkChatStore.getState().getKfUserInfo(wechatAccountId);
export const asyncCountLables = (data: ContactGroupByLabel[]) =>
  useCkChatStore.getState().asyncCountLables(data);
export const getCountLables = () => useCkChatStore.getState().countLables;
export const pinChatSessionToTop = (sessionId: number) =>
  useCkChatStore.getState().pinChatSessionToTop(sessionId);
useCkChatStore.getState().getKfSelectedUser();
export const updateIsLoadWeChat = (isLoadWeChat: boolean) =>
  useCkChatStore.getState().updateIsLoadWeChat(isLoadWeChat);
export const getIsLoadWeChat = () =>
  useCkChatStore.getState().getIsLoadWeChat();
export const toggleChatSessionPin = (sessionId: number, isPinned: boolean) =>
  useCkChatStore.getState().toggleChatSessionPin(sessionId, isPinned);
