import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getChatMessages,
  getChatroomMessages,
  getGroupMembers,
} from "@/pages/pc/ckbox/api";
import { WeChatState } from "./index.data";

import {
  likeListItem,
  CommentItem,
} from "@/pages/pc/ckbox/weChat/components/SidebarMenu/FriendsCicle/index.data";
import {
  clearUnreadCount1,
  clearUnreadCount2,
  updateConfig,
  getFriendInjectConfig,
} from "@/pages/pc/ckbox/api";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { ContactManager } from "@/utils/dbAction";
import { useUserStore } from "@/store/module/user";
import {
  addChatSession,
  updateChatSession,
  useCkChatStore,
  pinChatSessionToTop,
} from "@/store/module/ckchat/ckchat";

/**
 * 微信聊天状态管理 Store
 * 使用 Zustand 管理微信聊天相关的状态和操作
 */
export const useDataCenterStore = create<WeChatState>()(
  persist(
    (set, get) => ({
      showChatRecordModel: false,
      updateShowChatRecordModel: (show: boolean) => {
        set({ showChatRecordModel: show });
      },
      //当前用户的ai接管状态
      aiQuoteMessageContent: 0,
      updateAiQuoteMessageContent: (message: number) => {
        set({ aiQuoteMessageContent: message });
      },
      quoteMessageContent: "",
      updateQuoteMessageContent: (message: string) => {
        set({ quoteMessageContent: message });
      },
      // ==================== Transmit Module =========Start===========
      /** 选中的聊天记录列表 */
      selectedChatRecords: [],
      /** 更新选中的聊天记录 */
      updateSelectedChatRecords: (message: ChatRecord[]) => {
        set({ selectedChatRecords: message });
      },

      /** 选中的联系人或群组列表 */
      selectedTransmitContact: [],
      /** 更新选中的联系人或群组 */
      updateSelectedTransmitContact: (
        contact: ContractData[] | weChatGroup[],
      ) => {
        set({ selectedTransmitContact: contact });
      },

      /** 转发弹窗开启状态 */
      openTransmitModal: false,
      /** 更新转发弹窗状态 */
      updateTransmitModal: (open: boolean) => {
        set({ openTransmitModal: open });
      },
      // ==================== Transmit Module =========END===========

      // ==================== 当前联系人管理状态 ====================
      /** 当前选中的联系人/群组 */
      currentContract: null,
      /** 当前聊天的消息列表 */
      currentMessages: [],

      // ==================== 聊天消息管理方法 ====================
      /** 添加新消息到当前聊天 */
      addMessage: message => {
        const { wechatChatroomId, wechatFriendId } = message;
        const currentContract = get().currentContract;
        if (currentContract) {
          if (
            currentContract.id === wechatFriendId ||
            currentContract.id === wechatChatroomId
          ) {
            set(state => ({
              currentMessages: [...state.currentMessages, message],
            }));
          }
        }
      },
      /** 更新指定消息内容 */
      updateMessage: (messageId, updates) => {
        set(state => ({
          currentMessages: state.currentMessages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg,
          ),
        }));
      },
      /** 撤回指定消息 */
      recallMessage: (messageId: number) => {
        set(state => ({
          currentMessages: state.currentMessages.filter(
            msg => msg.id !== messageId,
          ),
        }));
      },

      // ==================== 加载状态管理 ====================
      /** 消息加载状态 */
      messagesLoading: false,
      /** 数据初始化加载状态 */
      isLoadingData: false,
      /** 当前群组成员列表 */
      currentGroupMembers: [],

      // ==================== 界面状态管理 ====================
      /** 是否显示复选框 */
      showCheckbox: false,
      /** 更新复选框显示状态 */
      updateShowCheckbox: (show: boolean) => {
        set({ showCheckbox: show });
      },
      /** 进入模块类型 (common | multipleForwarding) */
      EnterModule: "common",
      /** 更新进入模块类型 */
      updateEnterModule: (module: string) => {
        set({ EnterModule: module });
      },

      // ==================== 朋友圈相关状态 ====================
      /** 朋友圈数据列表 */
      MomentCommon: [],
      /** 朋友圈数据加载状态 */
      MomentCommonLoading: false,
      /** 更新朋友圈加载状态 */
      updateMomentCommonLoading: (loading: boolean) => {
        set({ MomentCommonLoading: loading });
      },

      // ==================== 当前联系人管理方法 ====================
      /** 清空当前联系人和消息 */
      clearCurrentContact: () => {
        set({ currentContract: null, currentMessages: [] });
      },
      /** 设置当前联系人并加载相关数据 */
      setCurrentContact: (
        contract: ContractData | weChatGroup,
        isExist?: boolean,
      ) => {
        const state = useDataCenterStore.getState();
        // 切换联系人时清空当前消息，等待重新加载
        set({ currentMessages: [], openTransmitModal: false });

        const params: any = {};

        if (!contract.chatroomId) {
          params.wechatFriendId = contract.id;
        } else {
          params.wechatChatroomId = contract.id;
        }
        //重置动作
        set({ showChatRecordModel: false });
        clearUnreadCount1(params);
        clearUnreadCount2([contract.id]);
        getFriendInjectConfig({
          friendId: contract.id,
          wechatAccountId: contract.wechatAccountId,
        }).then(result => {
          set({ aiQuoteMessageContent: result });
        });
        if (isExist) {
          updateChatSession({
            ...contract,
            config: { unreadCount: 0 },
          });
        } else {
          addChatSession(contract);
        }
        set({ currentContract: contract });
        updateConfig({
          id: contract.id,
          config: { chat: true },
        });
        state.loadChatMessages(true, 4704624000000);
      },

      // ==================== 消息加载方法 ====================
      /** 加载聊天消息 */
      loadChatMessages: async (Init: boolean, To?: number) => {
        const state = useDataCenterStore.getState();
        const contact = state.currentContract;
        set({ messagesLoading: true });
        set({ isLoadingData: Init });
        try {
          const params: any = {
            wechatAccountId: contact.wechatAccountId,
            From: 1,
            To: To || +new Date(),
            Count: 20,
            olderData: true,
          };

          if ("chatroomId" in contact && contact.chatroomId) {
            // 群聊消息加载
            params.wechatChatroomId = contact.id;
            const messages = await getChatroomMessages(params);
            const currentGroupMembers = await getGroupMembers({
              id: contact.id,
            });
            if (Init) {
              set({ currentMessages: messages || [], currentGroupMembers });
            } else {
              set({
                currentMessages: [
                  ...(messages || []),
                  ...state.currentMessages,
                ],
              });
            }
          } else {
            // 私聊消息加载
            params.wechatFriendId = contact.id;
            const messages = await getChatMessages(params);
            if (Init) {
              set({ currentMessages: messages || [] });
            } else {
              set({
                currentMessages: [
                  ...(messages || []),
                  ...state.currentMessages,
                ],
              });
            }
          }
          set({ messagesLoading: false });
        } catch (error) {
          console.error("获取聊天消息失败:", error);
        } finally {
          set({ messagesLoading: false });
        }
      },

      /** 搜索消息 */
      SearchMessage: async ({
        From = 1,
        To = 4704624000000,
        keyword = "",
        Count = 20,
      }: {
        From: number;
        To: number;
        keyword: string;
        Count?: number;
      }) => {
        const state = useDataCenterStore.getState();
        const contact = state.currentContract;
        set({ messagesLoading: true });

        try {
          const params: any = {
            wechatAccountId: contact.wechatAccountId,
            From,
            To,
            keyword,
            Count,
            olderData: true,
          };

          if ("chatroomId" in contact && contact.chatroomId) {
            // 群聊消息搜索
            params.wechatChatroomId = contact.id;
            const messages = await getChatroomMessages(params);
            const currentGroupMembers = await getGroupMembers({
              id: contact.id,
            });
            set({ currentMessages: messages || [], currentGroupMembers });
          } else {
            // 私聊消息搜索
            params.wechatFriendId = contact.id;
            const messages = await getChatMessages(params);
            set({ currentMessages: messages || [] });
          }
          set({ messagesLoading: false });
        } catch (error) {
          console.error("获取聊天消息失败:", error);
        } finally {
          set({ messagesLoading: false });
        }
      },

      /** 设置消息加载状态 */
      setMessageLoading: loading => {
        set({ messagesLoading: Boolean(loading) });
      },

      // ==================== 消息接收处理 ====================
      /** 接收新消息处理 */
      receivedMsg: async message => {
        const currentContract = useDataCenterStore.getState().currentContract;
        // 判断是群聊还是私聊
        const getMessageId =
          message?.wechatChatroomId || message.wechatFriendId;
        const isWechatGroup = message?.wechatChatroomId;

        // 如果是当前选中的聊天，直接添加到消息列表
        if (currentContract && currentContract.id == getMessageId) {
          set(state => ({
            currentMessages: [...state.currentMessages, message],
          }));
        } else {
          // 更新其他聊天的未读消息数
          const chatSessions = useCkChatStore.getState().chatSessions;
          const session = chatSessions.find(item => item.id == getMessageId);
          if (session) {
            session.config.unreadCount = Number(session.config.unreadCount) + 1;
            updateChatSession(session);
            // 将接收到新消息的会话置顶到列表顶部
            pinChatSessionToTop(getMessageId);
          } else {
            // 如果会话不存在，创建新会话
            const currentUserId = useUserStore.getState().user?.id || 0;
            const contactType = isWechatGroup ? "group" : "friend";

            // 从统一联系人表查询
            const contacts =
              await ContactManager.getUserContacts(currentUserId);
            const contact = contacts.find(
              c => c.id === getMessageId[0] && c.type === contactType,
            );

            if (contact) {
              addChatSession({
                ...contact,
                config: { unreadCount: 1 },
              } as any);
              // 新创建的会话会自动添加到列表顶部，无需额外置顶
            }
          }
        }
      },

      // ==================== 便捷选择器方法 ====================
      /** 获取当前联系人 */
      getCurrentContact: () => get().currentContract,
      /** 获取当前消息列表 */
      getCurrentMessages: () => get().currentMessages,
      /** 获取消息加载状态 */
      getMessagesLoading: () => get().messagesLoading,

      // ==================== 视频消息处理方法 ====================
      /** 设置视频消息加载状态 */
      setVideoLoading: (messageId: number, isLoading: boolean) => {
        set(state => ({
          currentMessages: state.currentMessages.map(msg => {
            if (msg.id === messageId) {
              try {
                const content = JSON.parse(msg.content);
                // 更新加载状态
                const updatedContent = { ...content, isLoading };
                return {
                  ...msg,
                  content: JSON.stringify(updatedContent),
                };
              } catch (e) {
                console.error("更新视频加载状态失败:", e);
                return msg;
              }
            }
            return msg;
          }),
        }));
      },

      /** 设置视频消息URL */
      setVideoUrl: (messageId: number, videoUrl: string) => {
        set(state => ({
          currentMessages: state.currentMessages.map(msg => {
            if (msg.id === messageId) {
              try {
                const content = JSON.parse(msg.content);
                // 检查视频是否已经下载完毕，避免重复更新
                if (content.videoUrl && content.videoUrl === videoUrl) {
                  console.log("视频已下载，跳过重复更新:", messageId);
                  return msg;
                }

                // 设置视频URL并清除加载状态
                const updatedContent = {
                  ...content,
                  videoUrl,
                  isLoading: false,
                };
                return {
                  ...msg,
                  content: JSON.stringify(updatedContent),
                };
              } catch (e) {
                console.error("更新视频URL失败:", e);
                return msg;
              }
            }
            return msg;
          }),
        }));
      },

      // ==================== 数据清理方法 ====================
      /** 清空所有数据 */
      clearAllData: () => {
        set({
          currentContract: null,
          currentMessages: [],
          messagesLoading: false,
        });
      },

      // ==================== 朋友圈管理方法 ====================
      /** 清空朋友圈数据 */
      clearMomentCommon: () => {
        set({ MomentCommon: [] });
      },

      /** 添加朋友圈数据 */
      addMomentCommon: moment => {
        set(state => ({
          MomentCommon: [...state.MomentCommon, ...moment],
        }));
      },

      /** 更新朋友圈数据 */
      updateMomentCommon: moments => {
        set({ MomentCommon: moments });
      },

      /** 更新朋友圈点赞 */
      updateLikeMoment: (snsId: string, likeList: likeListItem[]) => {
        set(state => ({
          MomentCommon: state.MomentCommon.map(moment =>
            moment.snsId === snsId ? { ...moment, likeList } : moment,
          ),
        }));
      },

      /** 更新朋友圈评论 */
      updateComment: (snsId: string, commentList: CommentItem[]) => {
        set(state => ({
          MomentCommon: state.MomentCommon.map(moment =>
            moment.snsId === snsId ? { ...moment, commentList } : moment,
          ),
        }));
      },
    }),
    {
      name: "wechat-storage",
      partialize: state => ({
        // currentContract 不做持久化，登录和页面刷新时直接清空
      }),
    },
  ),
);

// ==================== 便捷选择器导出 ====================
/** 获取当前联系人的 Hook */
export const useCurrentContact = () =>
  useDataCenterStore(state => state.currentContract);
/** 获取当前消息列表的 Hook */
export const useCurrentMessages = () =>
  useDataCenterStore(state => state.currentMessages);
/** 获取消息加载状态的 Hook */
export const useMessagesLoading = () =>
  useDataCenterStore(state => state.messagesLoading);
/** 获取复选框显示状态的 Hook */
export const useShowCheckbox = () =>
  useDataCenterStore(state => state.showCheckbox);

export const useUpdateTransmitModal = (open: boolean) =>
  useDataCenterStore(state => state.updateTransmitModal(open));
