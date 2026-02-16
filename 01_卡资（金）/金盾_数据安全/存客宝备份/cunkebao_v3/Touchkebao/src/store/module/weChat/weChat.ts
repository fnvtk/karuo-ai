import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getChatMessages,
  getChatroomMessages,
  getGroupMembers,
} from "@/pages/pc/ckbox/api";
import { WeChatState } from "./weChat.data";
import { dataProcessing, aiChat } from "@/api/ai";
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
import { useWebSocketStore } from "@/store/module/websocket/websocket";

/**
 * AI请求防抖管理
 * 用于处理连续消息时的AI请求延迟
 */
let aiRequestTimer: NodeJS.Timeout | null = null;
let pendingMessages: ChatRecord[] = []; // 待处理的消息队列
let currentAiGenerationId: string | null = null; // 当前AI生成的唯一ID
const AI_REQUEST_DELAY = 3000; // 3秒延迟
const FILE_MESSAGE_TYPE = "file";
const DEFAULT_MESSAGE_PAGE_SIZE = 20;

// ✅ 消息批量处理优化
let messageBatchQueue: ChatRecord[] = []; // 消息批量队列
let messageBatchTimer: NodeJS.Timeout | null = null;
const MESSAGE_BATCH_DELAY = 16; // 16ms，约一帧的时间，用于批量更新

type FileMessagePayload = {
  type?: string;
  title?: string;
  url?: string;
  isDownloading?: boolean;
  fileext?: string;
  size?: number | string;
  [key: string]: any;
};

const isJsonLike = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
};

const parseFileJsonContent = (
  rawContent: unknown,
): FileMessagePayload | null => {
  if (typeof rawContent !== "string") {
    return null;
  }

  const trimmed = rawContent.trim();
  if (!trimmed || !isJsonLike(trimmed)) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === FILE_MESSAGE_TYPE
    ) {
      return parsed as FileMessagePayload;
    }
  } catch (error) {
    console.warn("parseFileJsonContent failed:", error);
  }

  return null;
};

const extractFileTitleFromContent = (rawContent: unknown): string => {
  if (typeof rawContent !== "string") {
    return "";
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return "";
  }

  const cdataMatch =
    trimmed.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
    trimmed.match(/"title"\s*:\s*"([^"]+)"/i);
  if (cdataMatch?.[1]) {
    return cdataMatch[1].trim();
  }

  const simpleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1].trim();
  }

  return "";
};

const isFileLikeMessage = (msg: ChatRecord): boolean => {
  if ((msg as any).fileDownloadMeta) {
    return true;
  }

  if (typeof msg.content === "string") {
    const trimmed = msg.content.trim();
    if (!trimmed) {
      return false;
    }

    if (
      /"type"\s*:\s*"file"/i.test(trimmed) ||
      /<appattach/i.test(trimmed) ||
      /<fileext/i.test(trimmed)
    ) {
      return true;
    }
  }

  return false;
};

const normalizeMessages = (source: any): ChatRecord[] => {
  if (Array.isArray(source)) {
    return source;
  }
  if (Array.isArray(source?.list)) {
    return source.list;
  }
  return [];
};

const parseTimeValue = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return 0;
};

const getMessageTimestamp = (msg: ChatRecord): number => {
  const candidates = [
    (msg as any)?.wechatTime,
    (msg as any)?.createTime,
    (msg as any)?.msgTime,
    (msg as any)?.timestamp,
    (msg as any)?.time,
  ];

  for (const candidate of candidates) {
    const parsed = parseTimeValue(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return typeof msg.id === "number" ? msg.id : 0;
};

const sortMessagesByTime = (messages: ChatRecord[]): ChatRecord[] => {
  return [...messages].sort(
    (a, b) => getMessageTimestamp(a) - getMessageTimestamp(b),
  );
};

const resolvePaginationState = (
  source: any,
  requestedPage: number,
  requestedLimit: number,
  listLength: number,
) => {
  const page =
    typeof source?.page === "number"
      ? source.page
      : typeof source?.current === "number"
        ? source.current
        : requestedPage;

  const limit =
    typeof source?.limit === "number"
      ? source.limit
      : typeof source?.pageSize === "number"
        ? source.pageSize
        : requestedLimit;

  let hasMore: boolean;
  if (typeof source?.hasNext === "boolean") {
    hasMore = source.hasNext;
  } else if (typeof source?.hasNextPage === "boolean") {
    hasMore = source.hasNextPage;
  } else if (typeof source?.pages === "number") {
    hasMore = page < source.pages;
  } else if (typeof source?.total === "number" && limit > 0) {
    hasMore = page * limit < source.total;
  } else {
    hasMore = listLength >= limit && listLength > 0;
  }

  if (listLength === 0) {
    hasMore = false;
  }

  return {
    page,
    limit: limit || requestedLimit || DEFAULT_MESSAGE_PAGE_SIZE,
    hasMore,
  };
};

const normalizeFilePayload = (
  payload: FileMessagePayload | null | undefined,
  msg: ChatRecord,
): FileMessagePayload => {
  const fallbackTitle =
    payload?.title ||
    ((msg as any).fileDownloadMeta &&
    typeof (msg as any).fileDownloadMeta === "object"
      ? ((msg as any).fileDownloadMeta as FileMessagePayload).title
      : undefined) ||
    extractFileTitleFromContent(msg.content) ||
    (msg as any).fileName ||
    (msg as any).title ||
    "";

  return {
    type: FILE_MESSAGE_TYPE,
    ...payload,
    title: payload?.title ?? fallbackTitle ?? "",
    isDownloading: payload?.isDownloading ?? false,
  };
};

const updateFileMessageState = (
  msg: ChatRecord,
  updater: (payload: FileMessagePayload) => FileMessagePayload,
): ChatRecord => {
  const parsedPayload = parseFileJsonContent(msg.content);

  if (!parsedPayload && !isFileLikeMessage(msg)) {
    return msg;
  }

  const basePayload = parsedPayload
    ? normalizeFilePayload(parsedPayload, msg)
    : normalizeFilePayload(
        (msg as any).fileDownloadMeta as FileMessagePayload | undefined,
        msg,
      );

  const updatedPayload = updater(basePayload);
  const sanitizedPayload: FileMessagePayload = {
    ...basePayload,
    ...updatedPayload,
    type: FILE_MESSAGE_TYPE,
    title:
      updatedPayload.title ??
      basePayload.title ??
      extractFileTitleFromContent(msg.content) ??
      "",
    isDownloading:
      updatedPayload.isDownloading ?? basePayload.isDownloading ?? false,
  };

  if (parsedPayload) {
    return {
      ...msg,
      content: JSON.stringify({
        ...parsedPayload,
        ...sanitizedPayload,
      }),
      fileDownloadMeta: sanitizedPayload,
    };
  }

  return {
    ...msg,
    fileDownloadMeta: sanitizedPayload,
  };
};

/**
 * 清除AI请求定时器和队列
 * 用于取消AI生成或切换聊天时调用
 * @param reason 清除原因（用于日志）
 */
export const clearAiRequestQueue = (reason: string = "手动取消") => {
  if (aiRequestTimer) {
    console.log(`🚫 清除AI请求：${reason}`);
    clearTimeout(aiRequestTimer);
    aiRequestTimer = null;
  }
  pendingMessages = [];
  currentAiGenerationId = null;

  // 同时清除AI加载状态
  useWeChatStore.getState().updateIsLoadingAiChat(false);
};

/**
 * 生成唯一的AI生成ID
 */
const generateAiId = (): string => {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 手动触发AI回复生成
 * 用于用户主动请求AI生成回复
 */
export const manualTriggerAi = async () => {
  const state = useWeChatStore.getState();
  const currentContract = state.currentContract;

  if (!currentContract) {
    console.warn("⚠️ 没有当前联系人，无法触发AI");
    return false;
  }

  // 检查是否为AI模式
  const aiType = (currentContract as any).aiType || 0;
  if (![1, 2].includes(aiType)) {
    console.warn("⚠️ 当前不是AI模式，无法触发AI");
    return false;
  }

  // 清除之前的AI请求（如果有）
  if (aiRequestTimer || currentAiGenerationId) {
    console.log("🔄 清除之前的AI请求");
    clearAiRequestQueue("手动重新生成");
  }

  // 获取最近的消息作为上下文
  const currentMessages = state.currentMessages;
  if (currentMessages.length === 0) {
    console.warn("⚠️ 没有消息记录，无法触发AI");
    return false;
  }

  // 找到最近的对方消息（非自己发送的）
  const recentMessages = currentMessages
    .filter(msg => !msg.isSend && msg.msgType === 1) // 只要对方发的文字消息
    .slice(-5); // 最近5条

  if (recentMessages.length === 0) {
    console.warn("⚠️ 没有对方的消息，无法触发AI");
    return false;
  }

  console.log("🔄 手动触发AI回复生成");

  // 显示AI加载状态
  state.updateIsLoadingAiChat(true);

  // 生成唯一的AI请求ID
  const generationId = generateAiId();
  currentAiGenerationId = generationId;
  console.log(`🆔 AI生成ID: ${generationId}`);
  console.log(`📝 使用最近 ${recentMessages.length} 条消息作为上下文`);

  try {
    // 使用最后一条消息作为主要上下文
    const lastMessage = recentMessages[recentMessages.length - 1];

    // 手动触发时直接调用 AI 对话接口，不需要先调用 dataProcessing
    const messageContent = await aiChat({
      friendId: currentContract.id,
      wechatAccountId: currentContract.wechatAccountId,
      message: lastMessage,
    });

    // 回复到达前检查：是否已被取消
    if (currentAiGenerationId !== generationId) {
      console.log(
        `❌ AI回复已过期，丢弃 (当前ID: ${currentAiGenerationId}, 回复ID: ${generationId})`,
      );
      return false;
    }

    // 获取当前接待类型
    const aiType = (currentContract as any)?.aiType || 0; // 0=人工, 1=AI辅助, 2=AI接管
    const aiResponseContent = messageContent?.content || "";
    const isWechatGroup = !!(currentContract as any)?.chatroomId;

    // 根据接待类型处理AI回复
    if (aiType === 2 && aiResponseContent) {
      // AI接管模式：直接发送消息，不经过MessageEnter组件
      const messageId = +Date.now();

      // 构造本地消息对象
      const localMessage: ChatRecord = {
        id: messageId,
        wechatAccountId: currentContract.wechatAccountId,
        wechatFriendId: isWechatGroup ? 0 : currentContract.id,
        wechatChatroomId: isWechatGroup ? currentContract.id : 0,
        tenantId: 0,
        accountId: 0,
        synergyAccountId: 0,
        content: aiResponseContent,
        msgType: 1,
        msgSubType: 0,
        msgSvrId: "",
        isSend: true,
        createTime: new Date().toISOString(),
        isDeleted: false,
        deleteTime: "",
        sendStatus: 1,
        wechatTime: Date.now(),
        origin: 0,
        msgId: 0,
        recalled: false,
        seq: messageId,
      };

      // 添加到消息列表
      state.addMessage(localMessage);

      // 直接发送消息
      const { sendCommand } = useWebSocketStore.getState();
      sendCommand("CmdSendMessage", {
        wechatAccountId: currentContract.wechatAccountId,
        wechatChatroomId: isWechatGroup ? currentContract.id : 0,
        wechatFriendId: isWechatGroup ? 0 : currentContract.id,
        msgSubType: 0,
        msgType: 1,
        content: aiResponseContent,
        seq: messageId,
      });

      state.updateIsLoadingAiChat(false);
      console.log(
        `✅ 手动AI接管模式：直接发送消息 [${generationId}]:`,
        aiResponseContent,
      );
    } else if (aiType === 1) {
      // AI辅助模式：设置quoteMessageContent，让MessageEnter组件填充输入框
      state.updateQuoteMessageContent(aiResponseContent);
      state.updateIsLoadingAiChat(false);
      console.log(
        `✅ 手动AI辅助模式：填充输入框 [${generationId}]:`,
        aiResponseContent,
      );
    } else {
      // 其他情况
      state.updateIsLoadingAiChat(false);
    }

    // 清除当前生成ID
    currentAiGenerationId = null;
    return true;
  } catch (error) {
    console.error("❌ 手动AI请求失败:", error);
    state.updateIsLoadingAiChat(false);
    currentAiGenerationId = null;
    return false;
  }
};

/**
 * 微信聊天状态管理 Store
 * 使用 Zustand 管理微信聊天相关的状态和操作
 */
export const useWeChatStore = create<WeChatState>()(
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
      //正在加载ai对话
      isLoadingAiChat: false,
      updateIsLoadingAiChat: (loading: boolean) => {
        set({ isLoadingAiChat: loading });
      },
      // ==================== Transmit Module =========Start===========
      /** 选中的聊天记录列表 */
      selectedChatRecords: [],
      /** 更新选中的聊天记录 */
      updateSelectedChatRecords: (message: ChatRecord[]) => {
        set({ selectedChatRecords: message });
      },

      // ==================== Transmit Module =========END===========

      // ==================== 当前联系人管理状态 ====================
      /** 当前选中的联系人/群组 */
      currentContract: null,
      /** 当前聊天的消息列表 */
      currentMessages: [],
      /** 当前消息分页信息 */
      currentMessagesPage: 1,
      currentMessagesPageSize: DEFAULT_MESSAGE_PAGE_SIZE,
      currentMessagesHasMore: true,
      currentMessagesRequestId: 0,

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
      findMessageBySeq: (seq: number) => {
        return get().currentMessages.find(msg => msg.seq === seq);
      },
      findMessageById: (id: number) => {
        return get().currentMessages.find(msg => msg.id === id);
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
        // 清除AI请求定时器和队列
        if (aiRequestTimer) {
          clearTimeout(aiRequestTimer);
          aiRequestTimer = null;
        }
        pendingMessages = [];
        set({
          currentContract: null,
          currentMessages: [],
          currentMessagesPage: 1,
          currentMessagesHasMore: true,
          currentMessagesPageSize: DEFAULT_MESSAGE_PAGE_SIZE,
          currentMessagesRequestId: 0,
        });
      },
      /** 设置当前联系人并加载相关数据 */
      setCurrentContact: (contract: ContractData | weChatGroup) => {
        // 切换联系人时清除AI请求定时器和队列
        if (aiRequestTimer) {
          console.log("切换联系人，清除AI请求定时器和队列");
          clearTimeout(aiRequestTimer);
          aiRequestTimer = null;
        }
        pendingMessages = [];

        const state = useWeChatStore.getState();
        const newRequestId = Date.now();
        // 切换联系人时清空当前消息，等待重新加载
        set({
          currentMessages: [],
          currentMessagesPage: 1,
          currentMessagesHasMore: true,
          currentMessagesPageSize: DEFAULT_MESSAGE_PAGE_SIZE,
          isLoadingAiChat: false,
          currentMessagesRequestId: newRequestId,
        });

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
        // 注意：会话列表的未读数清零在MessageList组件的onContactClick中处理
        set({
          currentContract: contract,
          currentMessagesRequestId: newRequestId,
        });
        updateConfig({
          id: contract.id,
          config: { chat: true },
        });
        state.loadChatMessages(true);
      },

      // ==================== 消息加载方法 ====================
      /** 加载聊天消息 */
      loadChatMessages: async (Init: boolean, pageOverride?: number) => {
        const state = useWeChatStore.getState();
        const contact = state.currentContract;
        const requestIdAtStart = state.currentMessagesRequestId;
        const requestedContactId = contact?.id;

        if (!contact || !requestedContactId) {
          console.warn("loadChatMessages: 没有当前联系人，跳过请求");
          return;
        }

        if (!Init && !state.currentMessagesHasMore) {
          console.warn("loadChatMessages: 没有更多消息，跳过请求");
          return;
        }

        const nextPage = Init
          ? 1
          : (pageOverride ?? state.currentMessagesPage + 1);
        const limit =
          state.currentMessagesPageSize || DEFAULT_MESSAGE_PAGE_SIZE;

        // 移除重复请求拦截，允许并发请求
        console.log(`loadChatMessages: 开始加载消息 (Init=${Init}, page=${nextPage}, contactId=${requestedContactId})`);
        set({
          messagesLoading: true,
          isLoadingData: Init,
        });

        try {
          const params: any = {
            wechatAccountId: contact.wechatAccountId,
            page: nextPage,
            limit,
          };

          const isGroup =
            "chatroomId" in contact && Boolean(contact.chatroomId);

          if (isGroup) {
            params.wechatChatroomId = contact.id;
          } else {
            params.wechatFriendId = contact.id;
          }

          const response = isGroup
            ? await getChatroomMessages(params)
            : await getChatMessages(params);

          const normalizedMessages = normalizeMessages(response);
          const sortedMessages = sortMessagesByTime(normalizedMessages);
          const paginationMeta = resolvePaginationState(
            response,
            nextPage,
            limit,
            sortedMessages.length,
          );

          let nextGroupMembers = state.currentGroupMembers;
          if (Init && isGroup) {
            nextGroupMembers = await getGroupMembers({
              id: contact.id,
            });
          }

          set(current => {
            if (
              current.currentMessagesRequestId !== requestIdAtStart ||
              !current.currentContract ||
              current.currentContract.id !== requestedContactId
            ) {
              return {};
            }
            return {
              currentMessages: Init
                ? sortedMessages
                : [...sortedMessages, ...current.currentMessages],
              currentGroupMembers:
                Init && isGroup
                  ? nextGroupMembers
                  : current.currentGroupMembers,
              currentMessagesPage: paginationMeta.page,
              currentMessagesPageSize: paginationMeta.limit,
              currentMessagesHasMore: paginationMeta.hasMore,
            };
          });
        } catch (error) {
          console.error("获取聊天消息失败:", error);
        } finally {
          set(current => {
            if (
              current.currentMessagesRequestId !== requestIdAtStart ||
              !current.currentContract ||
              current.currentContract.id !== requestedContactId
            ) {
              return {};
            }
            return {
              messagesLoading: false,
              isLoadingData: false,
            };
          });
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
        const state = useWeChatStore.getState();
        const contact = state.currentContract;

        // 移除重复请求拦截，允许并发请求
        set({ messagesLoading: true });

        try {
          const params: any = {
            wechatAccountId: contact.wechatAccountId,
            keyword,
            From,
            To,
            page: 1,
            limit: Count,
          };

          if ("chatroomId" in contact && contact.chatroomId) {
            // 群聊消息搜索
            params.wechatChatroomId = contact.id;
            const messages = await getChatroomMessages(params);
            const currentGroupMembers = await getGroupMembers({
              id: contact.id,
            });
            set({
              currentMessages: sortMessagesByTime(normalizeMessages(messages)),
              currentGroupMembers,
              currentMessagesPage: 1,
              currentMessagesHasMore: false,
              currentMessagesPageSize: Count || state.currentMessagesPageSize,
            });
          } else {
            // 私聊消息搜索
            params.wechatFriendId = contact.id;
            const messages = await getChatMessages(params);
            set({
              currentMessages: sortMessagesByTime(normalizeMessages(messages)),
              currentMessagesPage: 1,
              currentMessagesHasMore: false,
              currentMessagesPageSize: Count || state.currentMessagesPageSize,
            });
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
      /** 接收新消息处理（优化：批量更新减少重渲染） */
      receivedMsg: async message => {
        const currentContract = useWeChatStore.getState().currentContract;
        // 判断是群聊还是私聊
        const getMessageId =
          message?.wechatChatroomId || message.wechatFriendId;
        const isWechatGroup = message?.wechatChatroomId;

        try {
          // 如果是当前选中的聊天，使用批量更新机制
          if (currentContract && currentContract.id == getMessageId) {
            // ✅ 将消息加入批量队列
            messageBatchQueue.push(message);

            // ✅ 清除之前的定时器
            if (messageBatchTimer) {
              clearTimeout(messageBatchTimer);
            }

            // ✅ 设置批量更新定时器（16ms，约一帧时间）
            messageBatchTimer = setTimeout(() => {
              const messagesToAdd = [...messageBatchQueue];
              messageBatchQueue = [];
              messageBatchTimer = null;

              // 批量添加到消息列表（减少重渲染次数）
              if (messagesToAdd.length > 0) {
                set(state => ({
                  currentMessages: [...state.currentMessages, ...messagesToAdd],
                }));
              }
            }, MESSAGE_BATCH_DELAY);

            // 只有文字消息才触发AI（msgType === 1），且必须是对方发送的消息（isSend !== true）
            if (
              message.msgType === 1 &&
              !message.isSend &&
              [1, 2].includes((currentContract as any).aiType || 0)
            ) {
              console.log("📨 收到新消息，准备触发AI");

              // 如果AI正在生成中，先取消
              if (aiRequestTimer || currentAiGenerationId) {
                console.log("⚠️ 检测到AI正在生成，取消并重新开始");
                clearAiRequestQueue("收到新消息");
              }

              // 将当前消息加入待处理队列
              pendingMessages.push(message);
              console.log(
                `📥 消息加入队列，当前队列长度: ${pendingMessages.length}`,
              );

              // 显示AI加载状态
              set(() => ({
                isLoadingAiChat: true,
              }));

              // 设置新的定时器，延迟发送AI请求
              aiRequestTimer = setTimeout(async () => {
                console.log(
                  `⏰ ${AI_REQUEST_DELAY / 1000}秒内无新消息，开始处理AI请求`,
                );

                // 获取队列中的所有消息
                const messagesToProcess = [...pendingMessages];
                pendingMessages = []; // 清空队列
                aiRequestTimer = null;

                // 生成唯一的AI请求ID
                const generationId = generateAiId();
                currentAiGenerationId = generationId;
                console.log(`🆔 AI生成ID: ${generationId}`);
                console.log(`📝 准备处理 ${messagesToProcess.length} 条消息`);

                try {
                  // 把所有消息数据传到存客宝
                  const params: any = {
                    type: "CmdNewMessage",
                    wechatAccountId: currentContract.wechatAccountId,
                  };
                  if (isWechatGroup) {
                    params.chatroomMessage = messagesToProcess;
                  } else {
                    params.friendMessage = messagesToProcess;
                  }

                  const dataProcessingResult = await dataProcessing(params);

                  // 请求前再次检查：是否已被取消
                  if (currentAiGenerationId !== generationId) {
                    console.log(
                      `❌ AI请求已过期 (当前ID: ${currentAiGenerationId}, 请求ID: ${generationId})`,
                    );
                    return;
                  }

                  // 如果成功，就请求AI对话接口
                  if (!dataProcessingResult) {
                    // 使用最后一条消息作为上下文
                    const lastMessage =
                      messagesToProcess[messagesToProcess.length - 1];
                    const messageContent = await aiChat({
                      friendId: getMessageId,
                      wechatAccountId: currentContract.wechatAccountId,
                      message: lastMessage,
                    });

                    // 回复到达前再次检查：是否已被取消
                    if (currentAiGenerationId !== generationId) {
                      console.log(
                        `❌ AI回复已过期，丢弃 (当前ID: ${currentAiGenerationId}, 回复ID: ${generationId})`,
                      );
                      return;
                    }

                    // 获取当前接待类型
                    const aiType = (currentContract as any)?.aiType || 0; // 0=人工, 1=AI辅助, 2=AI接管
                    const aiResponseContent = messageContent?.content || "";

                    // 根据接待类型处理AI回复
                    if (aiType === 2 && aiResponseContent) {
                      // AI接管模式：直接发送消息，不经过MessageEnter组件
                      const messageId = +Date.now();

                      // 构造本地消息对象
                      const localMessage: ChatRecord = {
                        id: messageId,
                        wechatAccountId: currentContract.wechatAccountId,
                        wechatFriendId: isWechatGroup ? 0 : currentContract.id,
                        wechatChatroomId: isWechatGroup
                          ? currentContract.id
                          : 0,
                        tenantId: 0,
                        accountId: 0,
                        synergyAccountId: 0,
                        content: aiResponseContent,
                        msgType: 1,
                        msgSubType: 0,
                        msgSvrId: "",
                        isSend: true,
                        createTime: new Date().toISOString(),
                        isDeleted: false,
                        deleteTime: "",
                        sendStatus: 1,
                        wechatTime: Date.now(),
                        origin: 0,
                        msgId: 0,
                        recalled: false,
                        seq: messageId,
                      };

                      // 添加到消息列表
                      set(state => ({
                        currentMessages: [
                          ...state.currentMessages,
                          localMessage,
                        ],
                        isLoadingAiChat: false,
                      }));

                      // 直接发送消息
                      const { sendCommand } = useWebSocketStore.getState();
                      sendCommand("CmdSendMessage", {
                        wechatAccountId: currentContract.wechatAccountId,
                        wechatChatroomId: isWechatGroup
                          ? currentContract.id
                          : 0,
                        wechatFriendId: isWechatGroup ? 0 : currentContract.id,
                        msgSubType: 0,
                        msgType: 1,
                        content: aiResponseContent,
                        seq: messageId,
                      });

                      console.log(
                        `✅ AI接管模式：直接发送消息 [${generationId}]:`,
                        aiResponseContent,
                      );
                    } else if (aiType === 1) {
                      // AI辅助模式：设置quoteMessageContent，让MessageEnter组件填充输入框
                      set(() => ({
                        quoteMessageContent: aiResponseContent,
                        isLoadingAiChat: false,
                      }));
                      console.log(
                        `✅ AI辅助模式：填充输入框 [${generationId}]:`,
                        aiResponseContent,
                      );
                    } else {
                      // 其他情况
                      set(() => ({
                        isLoadingAiChat: false,
                      }));
                    }

                    // 清除当前生成ID
                    currentAiGenerationId = null;
                  } else {
                    set(() => ({
                      isLoadingAiChat: false,
                    }));
                    currentAiGenerationId = null;
                  }
                } catch (error) {
                  console.error("❌ AI请求失败:", error);
                  set(() => ({
                    isLoadingAiChat: false,
                  }));
                  currentAiGenerationId = null;
                }
              }, AI_REQUEST_DELAY);
            }
          }
          // 注意：非当前聊天的会话列表更新已通过 chatMessageReceived 事件
          // 在 MessageList 组件中处理，无需在此重复操作
        } catch (error) {
          console.error("接收新消息失败:", error);
          set(() => ({
            isLoadingAiChat: false,
          }));
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

      // ==================== 文件消息处理方法 ====================
      /** 更新文件消息下载状态 */
      setFileDownloading: (messageId: number, isDownloading: boolean) => {
        set(state => ({
          currentMessages: state.currentMessages.map(msg => {
            if (msg.id !== messageId) {
              return msg;
            }

            try {
              return updateFileMessageState(msg, payload => ({
                ...payload,
                isDownloading,
              }));
            } catch (error) {
              console.error("更新文件下载状态失败:", error);
              return msg;
            }
          }),
        }));
      },

      /** 更新文件消息URL */
      setFileDownloadUrl: (messageId: number, fileUrl: string) => {
        set(state => ({
          currentMessages: state.currentMessages.map(msg => {
            if (msg.id !== messageId) {
              return msg;
            }

            try {
              return updateFileMessageState(msg, payload => ({
                ...payload,
                url: fileUrl,
                isDownloading: false,
              }));
            } catch (error) {
              console.error("更新文件URL失败:", error);
              return msg;
            }
          }),
        }));
      },

      // ==================== 数据清理方法 ====================
      /** 清空所有数据 */
      clearAllData: () => {
        set({
          currentContract: null,
          currentMessages: [],
          currentMessagesPage: 1,
          currentMessagesHasMore: true,
          currentMessagesPageSize: DEFAULT_MESSAGE_PAGE_SIZE,
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
      partialize: () => ({
        // currentContract 不做持久化，登录和页面刷新时直接清空
      }),
    },
  ),
);

// ==================== 便捷选择器导出 ====================
/** 获取当前联系人的 Hook */
export const useCurrentContact = () =>
  useWeChatStore(state => state.currentContract);
/** 获取当前消息列表的 Hook */
export const useCurrentMessages = () =>
  useWeChatStore(state => state.currentMessages);
/** 获取消息加载状态的 Hook */
export const useMessagesLoading = () =>
  useWeChatStore(state => state.messagesLoading);
/** 获取复选框显示状态的 Hook */
export const useShowCheckbox = () =>
  useWeChatStore(state => state.showCheckbox);
