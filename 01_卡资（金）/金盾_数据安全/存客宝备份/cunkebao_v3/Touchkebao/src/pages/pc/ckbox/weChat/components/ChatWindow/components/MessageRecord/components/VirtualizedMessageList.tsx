import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { VariableSizeList, ListChildComponentProps } from "react-window";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { MessageGroup } from "@/hooks/weChat/useMessageGrouping";
import { MessageItem } from "../index";
import { parseSystemMessage } from "@/utils/filter";
import styles from "../com.module.scss";
import { addPerformanceBreadcrumb } from "@/utils/sentry";

interface VirtualizedMessageListProps {
  groupedMessages: MessageGroup[];
  contract: ContractData | weChatGroup;
  isGroupChat: boolean;
  showCheckbox: boolean;
  currentCustomerAvatar?: string;
  renderGroupUser: (msg: ChatRecord) => { avatar: string; nickname: string };
  clearWechatidInContent: (sender: any, content: string) => string;
  parseMessageContent: (
    content: string | null | undefined,
    msg: ChatRecord,
    msgType?: number,
  ) => React.ReactNode;
  isMessageSelected: (msg: ChatRecord) => boolean;
  onCheckboxChange: (checked: boolean, msg: ChatRecord) => void;
  onContextMenu: (e: React.MouseEvent, msg: ChatRecord, isOwn: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onScroll?: (scrollTop: number) => void;
}

interface ItemData {
  groups: MessageGroup[];
  props: Omit<
    VirtualizedMessageListProps,
    "groupedMessages" | "containerRef" | "messagesEndRef" | "onScroll"
  >;
}

/**
 * 估算每个消息组的高度（像素）
 * 根据消息数量和类型估算
 */
const estimateGroupHeight = (group: MessageGroup): number => {
  let height = 40; // 时间分隔符高度
  const messageCount = group.messages.filter(
    v => ![10000, 570425393, 90000, -10001].includes(v.msgType),
  ).length;

  // 基础消息项高度（包含间距）
  const baseMessageHeight = 80;
  // 系统消息高度
  const systemMessageHeight = 30;

  // 计算系统消息数量
  const systemMessageCount = group.messages.filter(v =>
    [10000, 570425393, 90000, -10001].includes(v.msgType),
  ).length;

  height += systemMessageCount * systemMessageHeight;
  height += messageCount * baseMessageHeight;

  return height;
};

/**
 * 虚拟滚动消息列表项
 */
const VirtualizedMessageItem: React.FC<ListChildComponentProps<ItemData>> = ({
  index,
  style,
  data,
}) => {
  const { groups, props } = data;
  const group = groups[index];

  return (
    <div style={style}>
      {/* 时间分隔符 */}
      {group.messages
        .filter(v => [10000, -10001].includes(v.msgType))
        .map(msg => {
          const parsedText = parseSystemMessage(msg.content);
          return (
            <div key={`divider-${msg.id}`} className={styles.messageTime}>
              {parsedText}
            </div>
          );
        })}

      {/* 其他系统消息 */}
      {group.messages
        .filter(v => [570425393, 90000].includes(v.msgType))
        .map(msg => {
          let displayContent = msg.content;
          try {
            const parsedContent = JSON.parse(msg.content);
            if (
              parsedContent &&
              typeof parsedContent === "object" &&
              parsedContent.content
            ) {
              displayContent = parsedContent.content;
            }
          } catch (error) {
            displayContent = msg.content;
          }
          return (
            <div key={`divider-${msg.id}`} className={styles.messageTime}>
              {displayContent}
            </div>
          );
        })}

      {/* 时间标签 */}
      <div className={styles.messageTime}>{group.time}</div>

      {/* 消息项 */}
      {group.messages
        .filter(v => ![10000, 570425393, 90000, -10001].includes(v.msgType))
        .map(msg => {
          if (!msg) return null;
          const isOwn = !!msg.isSend;
          return (
            <MessageItem
              key={msg.id}
              msg={msg}
              contract={props.contract}
              isGroup={props.isGroupChat}
              showCheckbox={props.showCheckbox}
              isSelected={props.isMessageSelected(msg)}
              currentCustomerAvatar={props.currentCustomerAvatar || ""}
              renderGroupUser={props.renderGroupUser}
              clearWechatidInContent={props.clearWechatidInContent}
              parseMessageContent={props.parseMessageContent}
              onCheckboxChange={props.onCheckboxChange}
              onContextMenu={e => props.onContextMenu(e, msg, isOwn)}
            />
          );
        })}
    </div>
  );
};

/**
 * 虚拟滚动消息列表
 * 使用 react-window 实现虚拟滚动，提升长列表性能
 */
export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  groupedMessages,
  containerRef,
  messagesEndRef,
  onScroll,
  ...props
}) => {
  const listRef = useRef<VariableSizeList>(null);
  const [listHeight, setListHeight] = React.useState(600);
  const heightCacheRef = useRef<Map<number, number>>(new Map());

  // 监听容器高度变化
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        setListHeight(height);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // 获取每个项目的高度
  const getItemSize = useCallback(
    (index: number) => {
      // 如果缓存中有，直接返回
      if (heightCacheRef.current.has(index)) {
        return heightCacheRef.current.get(index)!;
      }

      // 估算高度
      const group = groupedMessages[index];
      const estimatedHeight = estimateGroupHeight(group);
      heightCacheRef.current.set(index, estimatedHeight);
      return estimatedHeight;
    },
    [groupedMessages],
  );

  // 当消息列表变化时，清除高度缓存
  useEffect(() => {
    heightCacheRef.current.clear();
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [groupedMessages.length]);

  // 当新消息到达时，滚动到底部
  useEffect(() => {
    if (listRef.current && groupedMessages.length > 0) {
      // 延迟滚动，确保 DOM 已更新
      requestAnimationFrame(() => {
        if (listRef.current) {
          // 滚动到最后一个项目
          listRef.current.scrollToItem(groupedMessages.length - 1, "end");
        }
      });
    }
  }, [groupedMessages.length]);

  // 处理滚动事件
  const handleScroll = useCallback(
    (event: { scrollOffset: number }) => {
      if (onScroll) {
        onScroll(event.scrollOffset);
      }
    },
    [onScroll],
  );

  // 性能监控
  useEffect(() => {
    if (groupedMessages.length > 100) {
      addPerformanceBreadcrumb("虚拟滚动启用", {
        messageCount: groupedMessages.length,
        groupCount: groupedMessages.length,
      });
    }
  }, [groupedMessages.length]);

  // 准备传递给列表项的数据
  const itemData = useMemo<ItemData>(
    () => ({
      groups: groupedMessages,
      props,
    }),
    [groupedMessages, props],
  );

  if (groupedMessages.length === 0) {
    return null;
  }

  return (
    <>
      <VariableSizeList
        ref={listRef}
        height={listHeight}
        itemCount={groupedMessages.length}
        itemSize={getItemSize}
        width="100%"
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={5} // 预渲染 5 个项目，提升滚动流畅度
      >
        {VirtualizedMessageItem}
      </VariableSizeList>
      {/* 用于滚动到底部的锚点 */}
      <div ref={messagesEndRef} />
    </>
  );
};
