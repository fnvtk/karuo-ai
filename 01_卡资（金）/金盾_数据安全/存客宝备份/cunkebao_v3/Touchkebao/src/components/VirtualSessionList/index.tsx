/**
 * 虚拟滚动会话列表组件
 * 使用react-window实现，只渲染可见区域的会话项
 *
 * 性能优化：
 * - 固定高度虚拟滚动（ITEM_HEIGHT = 72px）
 * - 只渲染可见区域的10-20条数据
 * - 支持滚动加载更多
 */

import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import { ChatSession } from "@/utils/db";
import styles from "./index.module.scss";

/**
 * 会话项高度（固定）
 */
const ITEM_HEIGHT = 72;

/**
 * 可见区域缓冲项数（上下各多渲染2项）
 */
const OVERSCAN_COUNT = 2;

/**
 * 虚拟滚动会话列表Props
 */
export interface VirtualSessionListProps {
  /** 会话列表数据 */
  sessions: ChatSession[];
  /** 容器高度 */
  containerHeight?: number;
  /** 当前选中的会话ID */
  selectedSessionId?: number;
  /** 渲染会话项 */
  renderItem: (session: ChatSession, index: number) => React.ReactNode;
  /** 点击会话项 */
  onItemClick?: (session: ChatSession) => void;
  /** 右键菜单 */
  onItemContextMenu?: (e: React.MouseEvent, session: ChatSession) => void;
  /** 滚动事件 */
  onScroll?: (scrollTop: number) => void;
  /** 滚动到底部时触发（用于加载更多） */
  onLoadMore?: () => void;
  /** 滚动到底部的阈值（距离底部多少像素时触发加载更多） */
  loadMoreThreshold?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 虚拟滚动会话列表组件
 */
export const VirtualSessionList: React.FC<VirtualSessionListProps> = ({
  sessions,
  containerHeight = 600,
  selectedSessionId,
  renderItem,
  onItemClick,
  onItemContextMenu,
  onScroll,
  onLoadMore,
  loadMoreThreshold = 100,
  className,
}) => {
  const listRef = useRef<FixedSizeList>(null);
  const scrollTopRef = useRef(0);

  // 计算可见项数
  const visibleCount = useMemo(() => {
    return Math.ceil(containerHeight / ITEM_HEIGHT) + OVERSCAN_COUNT * 2;
  }, [containerHeight]);

  // 滚动事件处理（react-window的onScroll回调参数格式）
  const handleScroll = useCallback(
    (props: {
      scrollDirection: "forward" | "backward";
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      const scrollTop = props.scrollOffset;
      scrollTopRef.current = scrollTop;

      // 触发滚动事件
      onScroll?.(scrollTop);

      // 检查是否滚动到底部
      if (onLoadMore && listRef.current) {
        const totalHeight = sessions.length * ITEM_HEIGHT;
        const distanceToBottom = totalHeight - scrollTop - containerHeight;

        if (distanceToBottom < loadMoreThreshold) {
          onLoadMore();
        }
      }
    },
    [onScroll, onLoadMore, loadMoreThreshold, sessions.length, containerHeight],
  );

  // 会话项组件（使用React.memo优化）
  const SessionRow = React.memo<ListChildComponentProps>(
    ({ index, style }: ListChildComponentProps) => {
      const session = sessions[index];
      if (!session) return null;

      const isSelected = selectedSessionId === session.id;

      return (
        <div
          style={style}
          className={`${styles.virtualItem} ${isSelected ? styles.selected : ""}`}
          onClick={() => onItemClick?.(session)}
          onContextMenu={e => onItemContextMenu?.(e, session)}
        >
          {renderItem(session, index)}
        </div>
      );
    },
    (prevProps, nextProps) => {
      // 自定义比较函数，只在会话数据或选中状态变化时重渲染
      const prevSession = sessions[prevProps.index];
      const nextSession = sessions[nextProps.index];
      const prevSelected = selectedSessionId === prevSession?.id;
      const nextSelected = selectedSessionId === nextSession?.id;

      return (
        prevProps.index === nextProps.index &&
        prevSelected === nextSelected &&
        prevSession?.id === nextSession?.id &&
        prevSession?.lastUpdateTime === nextSession?.lastUpdateTime
      );
    },
  );

  // 渲染单个会话项
  const Row = useCallback(
    (props: ListChildComponentProps) => <SessionRow {...props} />,
    [SessionRow],
  );

  // 滚动到指定会话
  const scrollToSession = useCallback(
    (sessionId: number) => {
      const index = sessions.findIndex(s => s.id === sessionId);
      if (index !== -1 && listRef.current) {
        listRef.current.scrollToItem(index, "smart");
      }
    },
    [sessions],
  );

  // 暴露滚动方法（通过ref）
  useEffect(() => {
    if (listRef.current && selectedSessionId) {
      scrollToSession(selectedSessionId);
    }
  }, [selectedSessionId, scrollToSession]);

  // 如果没有数据，显示空状态
  if (sessions.length === 0) {
    return (
      <div className={`${styles.empty} ${className || ""}`}>
        <div className={styles.emptyText}>暂无会话</div>
      </div>
    );
  }

  return (
    <div className={`${styles.virtualListContainer} ${className || ""}`}>
      <FixedSizeList
        ref={listRef}
        height={containerHeight}
        itemCount={sessions.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
        overscanCount={OVERSCAN_COUNT}
        onScroll={handleScroll}
        className={styles.virtualList}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};

// 导出滚动方法类型
export type VirtualSessionListRef = {
  scrollToSession: (sessionId: number) => void;
  scrollToIndex: (index: number) => void;
};
