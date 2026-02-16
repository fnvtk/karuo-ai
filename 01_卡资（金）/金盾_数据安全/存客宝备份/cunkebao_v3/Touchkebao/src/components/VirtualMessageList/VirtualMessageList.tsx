import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { VariableSizeList as List } from "react-window";
import { ChatRecord } from "@/pages/pc/ckbox/data";
import { MessageGroup } from "@/hooks/weChat/useMessageGrouping";

export interface VirtualMessageItem {
  type: "time" | "system" | "message";
  id: string | number;
  data: ChatRecord | string;
  groupIndex?: number;
}

interface VirtualMessageListProps {
  groupedMessages: MessageGroup[];
  containerHeight: number;
  containerRef?: React.RefObject<HTMLDivElement>;
  renderItem: (item: VirtualMessageItem, index: number) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  onScrollToTop?: () => void;
  estimatedItemSize?: number;
}

/**
 * 虚拟滚动消息列表组件
 * 使用 react-window 的 VariableSizeList 实现高性能消息列表
 */
export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  groupedMessages,
  containerHeight,
  containerRef,
  renderItem,
  onScroll,
  onScrollToTop,
  estimatedItemSize = 80,
}) => {
  const listRef = useRef<List>(null);
  const itemSizeCache = useRef<Map<number, number>>(new Map());
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 将分组消息展平为扁平列表
  const flatItems = useMemo<VirtualMessageItem[]>(() => {
    const items: VirtualMessageItem[] = [];

    groupedMessages.forEach((group, groupIndex) => {
      // 添加时间戳
      items.push({
        type: "time",
        id: `time-${groupIndex}`,
        data: group.time,
        groupIndex,
      });

      // 添加系统消息（时间分隔符）
      const systemMessages = group.messages.filter(v =>
        [10000, -10001].includes(v.msgType),
      );
      systemMessages.forEach(msg => {
        items.push({
          type: "system",
          id: `system-${msg.id}`,
          data: msg,
          groupIndex,
        });
      });

      // 添加其他系统消息
      const otherSystemMessages = group.messages.filter(v =>
        [570425393, 90000].includes(v.msgType),
      );
      otherSystemMessages.forEach(msg => {
        items.push({
          type: "system",
          id: `system-${msg.id}`,
          data: msg,
          groupIndex,
        });
      });

      // 添加普通消息
      const normalMessages = group.messages.filter(
        v => ![10000, 570425393, 90000, -10001].includes(v.msgType),
      );
      normalMessages.forEach(msg => {
        items.push({
          type: "message",
          id: msg.id,
          data: msg,
          groupIndex,
        });
      });
    });

    return items;
  }, [groupedMessages]);

  // 估算项目高度
  const getItemSize = useCallback(
    (index: number): number => {
      // 如果缓存中有，直接返回
      if (itemSizeCache.current.has(index)) {
        return itemSizeCache.current.get(index)!;
      }

      const item = flatItems[index];
      if (!item) return estimatedItemSize;

      // 根据类型返回估算高度
      switch (item.type) {
        case "time":
          return 40; // 时间戳高度
        case "system":
          return 30; // 系统消息高度
        case "message":
          // 根据消息类型估算
          const msg = item.data as ChatRecord;
          if (msg.msgType === 3) {
            // 图片消息
            return 250;
          } else if (msg.msgType === 43) {
            // 视频消息
            return 250;
          } else if (msg.msgType === 49) {
            // 小程序消息
            return 120;
          } else {
            // 文本消息，根据内容长度估算
            const content = String(msg.content || "");
            const lines = Math.ceil(content.length / 30);
            return Math.max(60, lines * 24 + 40);
          }
        default:
          return estimatedItemSize;
      }
    },
    [flatItems, estimatedItemSize],
  );

  // 测量实际项目高度并更新缓存
  const measureItem = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      if (!element) return;

      itemRefs.current.set(index, element);

      // 使用 ResizeObserver 或直接测量
      const height = element.getBoundingClientRect().height;
      if (height > 0 && height !== itemSizeCache.current.get(index)) {
        itemSizeCache.current.set(index, height);
        // 通知列表更新该索引的高度
        listRef.current?.resetAfterIndex(index, false);
      }
    },
    [],
  );

  // 处理滚动事件
  const handleScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      onScroll?.(scrollOffset);
      // 检测是否滚动到顶部
      if (scrollOffset < 50 && onScrollToTop) {
        onScrollToTop();
      }
    },
    [onScroll, onScrollToTop],
  );

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (listRef.current && flatItems.length > 0) {
      listRef.current.scrollToItem(flatItems.length - 1, "end");
    }
  }, [flatItems.length]);

  // 暴露滚动到底部方法
  useEffect(() => {
    if (containerRef?.current) {
      (containerRef.current as any).scrollToBottom = scrollToBottom;
    }
  }, [containerRef, scrollToBottom]);

  // 渲染列表项
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = flatItems[index];
      if (!item) return null;

      return (
        <div
          style={style}
          ref={el => measureItem(index, el)}
          data-index={index}
        >
          {renderItem(item, index)}
        </div>
      );
    },
    [flatItems, renderItem, measureItem],
  );

  if (flatItems.length === 0) {
    return null;
  }

  return (
    <List
      ref={listRef}
      height={containerHeight}
      itemCount={flatItems.length}
      itemSize={getItemSize}
      width="100%"
      onScroll={handleScroll}
      overscanCount={5} // 预渲染5个项目
      style={{ overflowX: "hidden" }}
    >
      {Row}
    </List>
  );
};

export default VirtualMessageList;
