import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useShallow } from "zustand/react/shallow";
import { useMemo } from "react";
import type { WeChatState } from "@/store/module/weChat/weChat.data";

/**
 * 合并多个 selector，减少重渲染
 * 使用 useShallow 进行 shallow 比较，只有对象属性变化时才触发更新
 * 使用 useMemo 稳定 selector 函数引用
 */
export const useWeChatSelectors = () => {
  const selector = useMemo(
    () => (state: WeChatState) => ({
      // 消息相关
      currentMessages: state.currentMessages,
      currentMessagesHasMore: state.currentMessagesHasMore,
      messagesLoading: state.messagesLoading,
      isLoadingData: state.isLoadingData,

      // 联系人相关
      currentContract: state.currentContract,

      // UI 状态
      showCheckbox: state.showCheckbox,
      EnterModule: state.EnterModule,
      showChatRecordModel: state.showChatRecordModel,

      // AI 相关
      isLoadingAiChat: state.isLoadingAiChat,
      quoteMessageContent: state.quoteMessageContent,
      aiQuoteMessageContent: state.aiQuoteMessageContent,

      // 选中记录
      selectedChatRecords: state.selectedChatRecords,
    }),
    [],
  );
  return useWeChatStore(useShallow(selector));
};

/**
 * 消息相关的 selector
 * 使用 useShallow 进行 shallow 比较，避免 getSnapshot 警告
 * 使用 useMemo 稳定 selector 函数引用
 */
export const useMessageSelectors = (): Pick<
  WeChatState,
  | "currentMessages"
  | "currentMessagesHasMore"
  | "messagesLoading"
  | "isLoadingData"
> => {
  const selector = useMemo(
    () => (state: WeChatState) => ({
      currentMessages: state.currentMessages,
      currentMessagesHasMore: state.currentMessagesHasMore,
      messagesLoading: state.messagesLoading,
      isLoadingData: state.isLoadingData,
    }),
    [],
  );
  return useWeChatStore(useShallow(selector));
};

/**
 * UI 状态相关的 selector
 * 使用 useShallow 进行 shallow 比较，避免 getSnapshot 警告
 * 使用 useMemo 稳定 selector 函数引用
 */
export const useUIStateSelectors = (): Pick<
  WeChatState,
  "showCheckbox" | "EnterModule" | "showChatRecordModel"
> => {
  const selector = useMemo(
    () => (state: WeChatState) => ({
      showCheckbox: state.showCheckbox,
      EnterModule: state.EnterModule,
      showChatRecordModel: state.showChatRecordModel,
    }),
    [],
  );
  return useWeChatStore(useShallow(selector));
};

/**
 * AI 相关的 selector
 * 使用 useShallow 进行 shallow 比较，避免 getSnapshot 警告
 * 使用 useMemo 稳定 selector 函数引用
 */
export const useAISelectors = (): Pick<
  WeChatState,
  "isLoadingAiChat" | "quoteMessageContent" | "aiQuoteMessageContent"
> => {
  const selector = useMemo(
    () => (state: WeChatState) => ({
      isLoadingAiChat: state.isLoadingAiChat,
      quoteMessageContent: state.quoteMessageContent,
      aiQuoteMessageContent: state.aiQuoteMessageContent,
    }),
    [],
  );
  return useWeChatStore(useShallow(selector));
};

/**
 * 操作方法 selector
 * 使用 useShallow 进行 shallow 比较，避免 getSnapshot 警告
 * 虽然方法引用稳定，但返回的对象需要 shallow 比较
 */
export const useWeChatActions = () => {
  const selector = useMemo(
    () => (state: WeChatState) => ({
      addMessage: state.addMessage,
      updateMessage: state.updateMessage,
      recallMessage: state.recallMessage,
      loadChatMessages: state.loadChatMessages,
      updateShowCheckbox: state.updateShowCheckbox,
      updateEnterModule: state.updateEnterModule,
      updateQuoteMessageContent: state.updateQuoteMessageContent,
      updateIsLoadingAiChat: state.updateIsLoadingAiChat,
      updateSelectedChatRecords: state.updateSelectedChatRecords,
      updateShowChatRecordModel: state.updateShowChatRecordModel,
      setCurrentContact: state.setCurrentContact,
      updateAiQuoteMessageContent: state.updateAiQuoteMessageContent,
    }),
    [],
  );
  return useWeChatStore(useShallow(selector));
};
