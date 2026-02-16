import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  PullToRefresh,
  InfiniteScroll,
  Button,
  SpinLoading,
} from "antd-mobile";
import styles from "./InfiniteList.module.scss";

interface InfiniteListProps<T> {
  // 数据相关
  data: T[];
  loading?: boolean;
  hasMore?: boolean;
  loadingText?: string;
  noMoreText?: string;

  // 渲染相关
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;

  // 事件回调
  onLoadMore?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;

  // 样式相关
  className?: string;
  itemClassName?: string;
  containerStyle?: React.CSSProperties;

  // 功能开关
  enablePullToRefresh?: boolean;
  enableInfiniteScroll?: boolean;
  enableLoadMoreButton?: boolean;

  // 自定义高度
  height?: string | number;
  minHeight?: string | number;
}

const InfiniteList = <T extends any>({
  data,
  loading = false,
  hasMore = true,
  loadingText = "加载中...",
  noMoreText = "没有更多了",

  renderItem,
  keyExtractor = (_, index) => index,

  onLoadMore,
  onRefresh,

  className = "",
  itemClassName = "",
  containerStyle = {},

  enablePullToRefresh = true,
  enableInfiniteScroll = true,
  enableLoadMoreButton = false,

  height = "100%",
  minHeight = "200px",
}: InfiniteListProps<T>) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理下拉刷新
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // 处理加载更多
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error("Load more failed:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [onLoadMore, loadingMore, hasMore]);

  // 点击加载更多按钮
  const handleLoadMoreClick = useCallback(() => {
    handleLoadMore();
  }, [handleLoadMore]);

  // 容器样式
  const containerStyles: React.CSSProperties = {
    height,
    minHeight,
    ...containerStyle,
  };

  // 渲染列表项
  const renderListItems = () => {
    return data.map((item, index) => (
      <div
        key={keyExtractor(item, index)}
        className={`${styles.listItem} ${itemClassName}`}
      >
        {renderItem(item, index)}
      </div>
    ));
  };

  // 渲染加载更多按钮
  const renderLoadMoreButton = () => {
    if (!enableLoadMoreButton || !hasMore) return null;

    return (
      <div className={styles.loadMoreButtonContainer}>
        <Button
          size="small"
          loading={loadingMore}
          onClick={handleLoadMoreClick}
          disabled={loading || !hasMore}
        >
          {loadingMore ? loadingText : "点击加载更多"}
        </Button>
      </div>
    );
  };

  // 渲染无更多数据提示
  const renderNoMoreText = () => {
    if (hasMore || data.length === 0) return null;

    return <div className={styles.noMoreText}>{noMoreText}</div>;
  };

  // 渲染空状态
  const renderEmptyState = () => {
    if (data.length > 0 || loading) return null;

    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📝</div>
        <div className={styles.emptyText}>暂无数据</div>
      </div>
    );
  };

  const content = (
    <div
      className={`${styles.listContainer} ${className}`}
      style={containerStyles}
    >
      {renderListItems()}
      {renderLoadMoreButton()}
      {renderNoMoreText()}
      {renderEmptyState()}

      {/* 无限滚动组件 */}
      {enableInfiniteScroll && (
        <InfiniteScroll
          loadMore={handleLoadMore}
          hasMore={hasMore}
          threshold={100}
        />
      )}
    </div>
  );

  // 如果启用下拉刷新，包装PullToRefresh
  if (enablePullToRefresh && onRefresh) {
    return (
      <PullToRefresh
        onRefresh={handleRefresh}
        refreshing={refreshing}
        className={styles.pullToRefresh}
      >
        {content}
      </PullToRefresh>
    );
  }

  return content;
};

export default InfiniteList;
