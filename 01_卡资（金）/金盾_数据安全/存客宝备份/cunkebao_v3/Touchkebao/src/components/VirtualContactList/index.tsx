/**
 * 虚拟滚动联系人列表组件
 * 使用react-window实现，支持分组展开/折叠和动态高度
 *
 * 性能优化：
 * - 支持分组虚拟滚动
 * - 动态高度处理（分组头部+联系人列表）
 * - 只渲染可见区域的项
 * - 支持分组内分页加载
 */

import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { VariableSizeList, ListChildComponentProps } from "react-window";
import { Spin, Button } from "antd";
import { Contact } from "@/utils/db";
import {
  ContactGroup,
  GroupContactData,
} from "@/store/module/weChat/contacts.data";
import styles from "./index.module.scss";

/**
 * 统一的列表行高（分组 / 好友 / 群聊 / 加载中 / 加载更多 都使用同一高度）
 * 由视觉统一规范，避免高度不一致导致的视觉错位和虚拟滚动跳动。
 */
const ROW_HEIGHT = 60;

/**
 * 可见区域缓冲项数
 */
const OVERSCAN_COUNT = 2;

/**
 * 虚拟滚动项类型
 */
type VirtualItem =
  | { type: "group"; data: ContactGroup; index: number }
  | { type: "loading"; groupIndex: number; groupKey: string }
  | { type: "contact"; data: Contact; groupIndex: number; contactIndex: number }
  | {
      type: "loadMore";
      groupIndex: number;
      groupId: number;
      groupType: 1 | 2;
      groupKey: string;
    };

/**
 * 虚拟滚动联系人列表Props
 */
export interface VirtualContactListProps {
  /** 分组列表 */
  groups: ContactGroup[];
  /** 展开的分组Key集合 */
  expandedGroups: Set<string>;
  /** 分组数据Map */
  groupData: Map<string, GroupContactData>;
  /** 生成分组Key的函数 */
  getGroupKey: (groupId: number, groupType: 1 | 2, accountId: number) => string;
  /** 当前选中的账号ID */
  selectedAccountId: number;
  /** 容器高度 */
  containerHeight?: number;
  /** 当前选中的联系人ID */
  selectedContactId?: number;
  /** 渲染分组头部 */
  renderGroupHeader: (
    group: ContactGroup,
    isExpanded: boolean,
  ) => React.ReactNode;
  /** 渲染联系人项 */
  renderContact: (
    contact: Contact,
    groupIndex: number,
    contactIndex: number,
  ) => React.ReactNode;
  /** 点击分组头部（展开/折叠） */
  onGroupToggle?: (groupId: number, groupType: 1 | 2) => void;
  /** 点击联系人项 */
  onContactClick?: (contact: Contact) => void;
  /** 右键菜单（分组） */
  onGroupContextMenu?: (e: React.MouseEvent, group: ContactGroup) => void;
  /** 右键菜单（联系人） */
  onContactContextMenu?: (e: React.MouseEvent, contact: Contact) => void;
  /** 滚动事件 */
  onScroll?: (scrollTop: number) => void;
  /** 分组内滚动到底部时触发（用于加载更多） */
  onGroupLoadMore?: (groupId: number, groupType: 1 | 2) => void;
  /** 滚动到底部的阈值 */
  loadMoreThreshold?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 虚拟滚动联系人列表组件
 */
export const VirtualContactList: React.FC<VirtualContactListProps> = ({
  groups,
  expandedGroups,
  groupData,
  getGroupKey,
  selectedAccountId,
  containerHeight,
  selectedContactId,
  renderGroupHeader,
  renderContact,
  onGroupToggle,
  onContactClick,
  onGroupContextMenu,
  onContactContextMenu,
  onScroll,
  onGroupLoadMore,
  loadMoreThreshold = 100,
  className,
}) => {
  const listRef = useRef<VariableSizeList>(null);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const scrollOffsetRef = useRef<number>(0);

  // 构建虚拟滚动项列表
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];

    groups.forEach((group, groupIndex) => {
      // 添加分组头部
      items.push({
        type: "group",
        data: group,
        index: groupIndex,
      });

      // 如果分组展开，添加联系人项或loading项
      const groupKey = getGroupKey(
        group.id,
        group.groupType,
        selectedAccountId,
      );
      if (expandedGroups.has(groupKey)) {
        const groupDataItem = groupData.get(groupKey);
        if (groupDataItem) {
          // 如果正在加载，显示loading项
          if (
            groupDataItem.loading &&
            (!groupDataItem.loaded || groupDataItem.contacts.length === 0)
          ) {
            items.push({
              type: "loading",
              groupIndex,
              groupKey,
            });
          } else if (
            groupDataItem.loaded &&
            groupDataItem.contacts.length > 0
          ) {
            // 如果已加载，显示联系人项
            groupDataItem.contacts.forEach((contact, contactIndex) => {
              items.push({
                type: "contact",
                data: contact,
                groupIndex,
                contactIndex,
              });
            });
            // 如果有更多数据，显示"加载更多"按钮（加载中时按钮会显示loading状态）
            if (groupDataItem.hasMore) {
              items.push({
                type: "loadMore",
                groupIndex,
                groupId: group.id,
                groupType: group.groupType,
                groupKey,
              });
            }
          }
        } else {
          // 如果分组数据不存在，显示loading项
          items.push({
            type: "loading",
            groupIndex,
            groupKey,
          });
        }
      }
    });

    return items;
  }, [groups, expandedGroups, groupData, getGroupKey, selectedAccountId]);

  // 计算每项的高度
  const getItemSize = useCallback(
    (index: number): number => {
      const item = virtualItems[index];
      if (!item) return ROW_HEIGHT;

      // 所有类型统一使用固定高度，避免高度差异导致的布局偏移
      return ROW_HEIGHT;
    },
    [virtualItems],
  );

  // 计算总高度
  const totalHeight = useMemo(() => {
    let height = 0;
    for (let i = 0; i < virtualItems.length; i++) {
      height += getItemSize(i);
    }
    return height;
  }, [virtualItems, getItemSize]);

  // 如果没有指定容器高度，使用总高度（不限制高度）
  // 确保至少有一个最小高度，避免渲染错误
  const actualContainerHeight = containerHeight ?? (totalHeight || 1);

  // 滚动事件处理（react-window的onScroll回调参数格式）
  const handleScroll = useCallback(
    (props: {
      scrollDirection: "forward" | "backward";
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      const scrollTop = props.scrollOffset;
      // 保存滚动位置
      scrollOffsetRef.current = scrollTop;

      onScroll?.(scrollTop);

      // 检查是否需要加载更多
      if (onGroupLoadMore && listRef.current) {
        const currentTotalHeight = totalHeight;
        const distanceToBottom =
          currentTotalHeight - scrollTop - containerHeight;

        if (distanceToBottom < loadMoreThreshold) {
          // 找到最后一个可见的分组，触发加载更多
          // 简化处理：找到最后一个展开的分组
          for (let i = groups.length - 1; i >= 0; i--) {
            const group = groups[i];
            const groupKey = getGroupKey(
              group.id,
              group.groupType,
              selectedAccountId,
            );
            if (expandedGroups.has(groupKey)) {
              onGroupLoadMore(group.id, group.groupType);
              break;
            }
          }
        }
      }
    },
    [
      onScroll,
      onGroupLoadMore,
      loadMoreThreshold,
      totalHeight,
      containerHeight,
      groups,
      expandedGroups,
      getGroupKey,
      selectedAccountId,
    ],
  );

  // 渲染单个项
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = virtualItems[index];
      if (!item) return null;

      if (item.type === "group") {
        const group = item.data;
        const groupKey = getGroupKey(
          group.id,
          group.groupType,
          selectedAccountId,
        );
        const isExpanded = expandedGroups.has(groupKey);

        return (
          <div
            style={style}
            className={styles.groupHeader}
            data-group-key={groupKey}
            data-group-id={group.id}
            data-group-type={group.groupType}
            onClick={() => onGroupToggle?.(group.id, group.groupType)}
            onContextMenu={e => onGroupContextMenu?.(e, group)}
          >
            {renderGroupHeader(group, isExpanded)}
          </div>
        );
      } else if (item.type === "loading") {
        return (
          <div style={style} className={styles.loadingItem}>
            <Spin size="small" />
            <span className={styles.loadingText}>加载中...</span>
          </div>
        );
      } else if (item.type === "loadMore") {
        const groupDataItem = groupData.get(item.groupKey);
        const isLoading = groupDataItem?.loading || false;
        return (
          <div style={style} className={styles.loadMoreItem}>
            <Button
              type="link"
              size="small"
              loading={isLoading}
              onClick={() => {
                if (!isLoading && onGroupLoadMore) {
                  onGroupLoadMore(item.groupId, item.groupType);
                }
              }}
              className={styles.loadMoreButton}
            >
              {isLoading ? "加载中..." : "加载更多"}
            </Button>
          </div>
        );
      } else {
        const contact = item.data;
        const isSelected = selectedContactId === contact.id;

        return (
          <div
            style={style}
            className={`${styles.contactItem} ${isSelected ? styles.selected : ""}`}
            onClick={() => onContactClick?.(contact)}
            onContextMenu={e => onContactContextMenu?.(e, contact)}
          >
            {renderContact(contact, item.groupIndex, item.contactIndex)}
          </div>
        );
      }
    },
    [
      virtualItems,
      getGroupKey,
      selectedAccountId,
      expandedGroups,
      selectedContactId,
      renderGroupHeader,
      renderContact,
      onGroupToggle,
      onContactClick,
      onGroupContextMenu,
      onContactContextMenu,
      groupData,
      onGroupLoadMore,
    ],
  );

  // 保存前一个 virtualItems 的长度，用于检测是否只是添加了新项
  const prevItemsLengthRef = useRef<number>(0);
  const prevGroupDataRef = useRef<Map<string, GroupContactData>>(new Map());

  // 重置缓存的高度（当数据变化时）
  useEffect(() => {
    const currentItemsLength = virtualItems.length;
    const prevItemsLength = prevItemsLengthRef.current;

    // 如果只是添加了新项（加载更多），只重置新增项之后的高度缓存
    // 如果项数减少或大幅变化，重置所有缓存
    if (currentItemsLength > prevItemsLength) {
      // 只重置新增项之后的高度缓存，保持滚动位置
      if (listRef.current && prevItemsLength > 0) {
        listRef.current.resetAfterIndex(prevItemsLength, false);
      }
    } else if (currentItemsLength !== prevItemsLength) {
      // 项数减少或变化较大，重置所有缓存
      itemHeightsRef.current.clear();
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }

    prevItemsLengthRef.current = currentItemsLength;
    prevGroupDataRef.current = new Map(groupData);
  }, [virtualItems.length, groupData]);

  // 当数据更新后，恢复滚动位置（仅在添加新项时恢复）
  const prevItemsLengthForScrollRef = useRef<number>(0);
  useEffect(() => {
    const currentItemsLength = virtualItems.length;
    const prevItemsLength = prevItemsLengthForScrollRef.current;

    // 只在添加新项时恢复滚动位置（加载更多场景）
    if (
      listRef.current &&
      scrollOffsetRef.current > 0 &&
      currentItemsLength > prevItemsLength
    ) {
      // 使用 requestAnimationFrame 确保在渲染后恢复滚动位置
      requestAnimationFrame(() => {
        if (listRef.current && scrollOffsetRef.current > 0) {
          // 使用 scrollToItem 或 scrollToOffset 恢复位置
          // 注意：这里不触发 onScroll 回调，避免循环
          listRef.current.scrollTo(scrollOffsetRef.current);
        }
      });
    }

    prevItemsLengthForScrollRef.current = currentItemsLength;
  }, [virtualItems.length]);

  // 如果没有数据，显示空状态
  if (groups.length === 0) {
    return (
      <div className={`${styles.empty} ${className || ""}`}>
        <div className={styles.emptyText}>暂无分组</div>
      </div>
    );
  }

  return (
    <div className={`${styles.virtualListContainer} ${className || ""}`}>
      <VariableSizeList
        ref={listRef}
        height={actualContainerHeight}
        itemCount={virtualItems.length}
        itemSize={getItemSize}
        width="100%"
        overscanCount={OVERSCAN_COUNT}
        onScroll={handleScroll}
        className={styles.virtualList}
      >
        {Row}
      </VariableSizeList>
    </div>
  );
};
