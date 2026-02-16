import React, { useState, useCallback, useEffect, useMemo, memo } from "react";
import { Modal, Input, Avatar, Button, Checkbox, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { getFriendList } from "../FriendSelection/api";
import type { FriendSelectionItem } from "../FriendSelection/data";
import styles from "./TwoColumnSelection.module.scss";

// 使用 React.memo 优化好友列表项组件
const FriendListItem = memo<{
  friend: FriendSelectionItem;
  isSelected: boolean;
  onSelect: (friend: FriendSelectionItem) => void;
}>(({ friend, isSelected, onSelect }) => {
  return (
    <div
      className={`${styles.friendItem} ${isSelected ? styles.selected : ""}`}
      onClick={() => onSelect(friend)}
    >
      <Checkbox checked={isSelected} />
      <Avatar src={friend.avatar} size={40}>
        {friend.nickname?.charAt(0)}
      </Avatar>
      <div className={styles.friendInfo}>
        <div className={styles.friendName}>{friend.nickname}</div>
        <div className={styles.friendId}>{friend.wechatId}</div>
      </div>
    </div>
  );
});

FriendListItem.displayName = "FriendListItem";

interface TwoColumnSelectionProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (
    selectedIds: string[],
    selectedItems: FriendSelectionItem[],
  ) => void;
  title?: string;
  deviceIds?: number[];
  enableDeviceFilter?: boolean;
  dataSource?: FriendSelectionItem[];
}

const TwoColumnSelection: React.FC<TwoColumnSelectionProps> = ({
  visible,
  onCancel,
  onConfirm,
  title = "选择好友",
  deviceIds = [],
  enableDeviceFilter = true,
  dataSource,
}) => {
  const [rawFriends, setRawFriends] = useState<FriendSelectionItem[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<FriendSelectionItem[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 使用 useMemo 缓存过滤结果，避免每次渲染都重新计算
  const filteredFriends = useMemo(() => {
    const sourceData = dataSource || rawFriends;
    if (!searchQuery.trim()) {
      return sourceData;
    }

    const query = searchQuery.toLowerCase();
    return sourceData.filter(
      item =>
        item.name?.toLowerCase().includes(query) ||
        item.nickname?.toLowerCase().includes(query),
    );
  }, [dataSource, rawFriends, searchQuery]);

  // 分页显示好友列表，避免一次性渲染太多项目
  const ITEMS_PER_PAGE = 50;
  const [displayPage, setDisplayPage] = useState(1);

  const friends = useMemo(() => {
    const startIndex = 0;
    const endIndex = displayPage * ITEMS_PER_PAGE;
    return filteredFriends.slice(startIndex, endIndex);
  }, [filteredFriends, displayPage]);

  const hasMoreFriends = filteredFriends.length > friends.length;

  // 使用 useMemo 缓存选中状态映射，避免每次渲染都重新计算
  const selectedFriendsMap = useMemo(() => {
    const map = new Map();
    selectedFriends.forEach(friend => {
      map.set(friend.id, true);
    });
    return map;
  }, [selectedFriends]);

  // 获取好友列表
  const fetchFriends = useCallback(
    async (page: number, keyword: string = "") => {
      setLoading(true);
      try {
        const params: any = {
          page,
          pageSize: 20,
        };

        if (keyword) {
          params.keyword = keyword;
        }

        if (enableDeviceFilter && deviceIds.length > 0) {
          params.deviceIds = deviceIds;
        }

        const response = await getFriendList(params);

        if (response.success) {
          setRawFriends(response.data.list || []);
          setTotalPages(Math.ceil((response.data.total || 0) / 20));
        } else {
          setRawFriends([]);
          message.error(response.message || "获取好友列表失败");
        }
      } catch (error) {
        console.error("获取好友列表失败:", error);
        message.error("获取好友列表失败");
      } finally {
        setLoading(false);
      }
    },
    [deviceIds, enableDeviceFilter],
  );

  // 初始化数据加载
  useEffect(() => {
    if (visible && !dataSource) {
      // 只有在没有外部数据源时才调用 API
      fetchFriends(1);
      setCurrentPage(1);
    }
  }, [visible, dataSource, fetchFriends]);

  // 重置搜索状态
  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setSelectedFriends([]);
      setLoading(false);
    }
  }, [visible]);

  // 防抖搜索处理
  const handleSearch = useCallback(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDisplayPage(1); // 重置分页
        if (!dataSource) {
          fetchFriends(1, value);
        }
      }, 300);
    };
  }, [dataSource, fetchFriends])();

  // API搜索处理（当没有外部数据源时）
  const handleApiSearch = useCallback(
    async (keyword: string) => {
      if (!dataSource) {
        await fetchFriends(1, keyword);
      }
    },
    [dataSource, fetchFriends],
  );

  // 加载更多好友
  const handleLoadMore = useCallback(() => {
    setDisplayPage(prev => prev + 1);
  }, []);

  // 防抖搜索
  useEffect(() => {
    if (!dataSource && searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleApiSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, dataSource, handleApiSearch]);

  // 选择好友 - 使用 useCallback 优化性能
  const handleSelectFriend = useCallback((friend: FriendSelectionItem) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  }, []);

  // 移除已选好友 - 使用 useCallback 优化性能
  const handleRemoveFriend = useCallback((friendId: number) => {
    setSelectedFriends(prev => prev.filter(f => f.id !== friendId));
  }, []);

  // 确认选择 - 使用 useCallback 优化性能
  const handleConfirmSelection = useCallback(() => {
    const selectedIds = selectedFriends.map(f => f.id.toString());
    onConfirm(selectedIds, selectedFriends);
    setSelectedFriends([]);
    setSearchQuery("");
  }, [selectedFriends, onConfirm]);

  // 取消选择 - 使用 useCallback 优化性能
  const handleCancel = useCallback(() => {
    setSelectedFriends([]);
    setSearchQuery("");
    onCancel();
  }, [onCancel]);

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirmSelection}>
          确定
        </Button>,
      ]}
      className={styles.twoColumnModal}
    >
      <div className={styles.container}>
        {/* 左侧：好友列表 */}
        <div className={styles.leftColumn}>
          <div className={styles.searchWrapper}>
            <Input
              placeholder="请输入昵称或微信号"
              value={searchQuery}
              onChange={e => {
                const value = e.target.value;
                setSearchQuery(value); // 立即更新显示
                handleSearch(value); // 防抖处理搜索
              }}
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>

          <div className={styles.friendList}>
            {loading ? (
              <div className={styles.loading}>加载中...</div>
            ) : friends.length > 0 ? (
              // 使用 React.memo 优化列表项渲染
              friends.map(friend => {
                const isSelected = selectedFriendsMap.has(friend.id);
                return (
                  <FriendListItem
                    key={friend.id}
                    friend={friend}
                    isSelected={isSelected}
                    onSelect={handleSelectFriend}
                  />
                );
              })
            ) : (
              <div className={styles.empty}>
                {searchQuery
                  ? `没有找到包含"${searchQuery}"的好友`
                  : "暂无好友"}
              </div>
            )}

            {hasMoreFriends && (
              <div className={styles.loadMoreWrapper}>
                <Button type="link" onClick={handleLoadMore} loading={loading}>
                  加载更多
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：已选好友 */}
        <div className={styles.rightColumn}>
          <div className={styles.selectedHeader}>
            已选联系人 ({selectedFriends.length})
          </div>

          <div className={styles.selectedList}>
            {selectedFriends.length > 0 ? (
              selectedFriends.map(friend => (
                <div key={friend.id} className={styles.selectedItem}>
                  <Avatar src={friend.avatar} size={32}>
                    {friend.nickname?.charAt(0)}
                  </Avatar>
                  <div className={styles.selectedInfo}>
                    <div className={styles.selectedName}>{friend.nickname}</div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => handleRemoveFriend(friend.id)}
                    className={styles.removeBtn}
                  >
                    ×
                  </Button>
                </div>
              ))
            ) : (
              <div className={styles.emptySelected}>暂无选择</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TwoColumnSelection;
