import { useMemo } from "react";
import { ChatRecord } from "@/pages/pc/ckbox/data";
import { formatWechatTime } from "@/utils/common";

export interface MessageGroup {
  time: string;
  messages: ChatRecord[];
}

/**
 * 消息分组 Hook
 * 使用 useMemo 缓存分组结果，减少重复计算
 */
export const useMessageGrouping = (
  messages: ChatRecord[] | null | undefined,
): MessageGroup[] => {
  return useMemo(() => {
    const safeMessages = Array.isArray(messages)
      ? messages
      : Array.isArray((messages as any)?.list)
        ? ((messages as any).list as ChatRecord[])
        : [];

    return safeMessages
      .filter(msg => msg !== null && msg !== undefined) // 过滤掉null和undefined的消息
      .map(msg => ({
        time: formatWechatTime(String(msg?.wechatTime)),
        messages: [msg],
      }));
  }, [messages]);
};
