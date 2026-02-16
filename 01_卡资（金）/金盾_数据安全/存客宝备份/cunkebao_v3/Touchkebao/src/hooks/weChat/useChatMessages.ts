import { useInfiniteQuery } from "@tanstack/react-query";
import { getChatMessages, getChatroomMessages } from "@/pages/pc/ckbox/api";
import { ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { captureError, addPerformanceBreadcrumb } from "@/utils/sentry";

const DEFAULT_MESSAGE_PAGE_SIZE = 20;

/**
 * 消息列表 Hook
 * 使用 TanStack Query 管理消息数据，自动缓存和分页
 * 使用 Sentry 监控请求性能和错误
 */
export const useChatMessages = (contact: ContractData | weChatGroup | null) => {
  return useInfiniteQuery({
    queryKey: ["chatMessages", contact?.id, contact?.wechatAccountId],
    initialPageParam: 1, // TanStack Query v5 必需
    queryFn: async ({ pageParam }) => {
      if (!contact) {
        throw new Error("联系人信息缺失");
      }

      const startTime = performance.now();
      const params: any = {
        wechatAccountId: contact.wechatAccountId,
        page: pageParam,
        limit: DEFAULT_MESSAGE_PAGE_SIZE,
      };

      const isGroup = "chatroomId" in contact && Boolean(contact.chatroomId);

      if (isGroup) {
        params.wechatChatroomId = contact.id;
      } else {
        params.wechatFriendId = contact.id;
      }

      try {
        const response = isGroup
          ? await getChatroomMessages(params)
          : await getChatMessages(params);

        const duration = performance.now() - startTime;

        // ✅ 使用 Sentry 记录请求性能
        addPerformanceBreadcrumb("获取消息列表", {
          duration,
          contactId: contact.id,
          page: pageParam,
          messageCount: (response as any)?.list?.length || 0,
          isGroup,
        });

        // 如果请求时间超过 1 秒，记录警告
        if (duration > 1000) {
          addPerformanceBreadcrumb("慢请求警告", {
            duration,
            contactId: contact.id,
            threshold: 1000,
          });
        }

        return response;
      } catch (error) {
        // ✅ 使用 Sentry 捕获错误
        captureError(error as Error, {
          tags: {
            action: "getChatMessages",
            isGroup: String(isGroup),
          },
          extra: {
            contactId: contact.id,
            page: pageParam,
            params,
          },
        });
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // 判断是否还有更多数据
      const lastPageData = lastPage as any;
      const hasMore =
        lastPageData?.hasNext ||
        lastPageData?.hasNextPage ||
        (lastPageData?.list?.length || 0) >= DEFAULT_MESSAGE_PAGE_SIZE;
      return hasMore ? allPages.length + 1 : undefined;
    },
    enabled: !!contact, // 只有联系人存在时才请求
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
    gcTime: 10 * 60 * 1000, // 10 分钟缓存（v5 使用 gcTime）
    // ✅ 使用 Sentry 监控查询状态变化
    retry: 1,
    refetchOnWindowFocus: true,
  });
};
