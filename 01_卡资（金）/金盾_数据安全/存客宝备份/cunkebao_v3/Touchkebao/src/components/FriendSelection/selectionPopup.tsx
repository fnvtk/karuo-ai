import React, { useCallback, useEffect, useState } from "react";
import { Popup, Checkbox } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import { getFriendList } from "./api";
import style from "./index.module.scss";
import type { FriendSelectionItem } from "./data";

interface SelectionPopupProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  selectedOptions: FriendSelectionItem[];
  onSelect: (friends: FriendSelectionItem[]) => void;
  deviceIds?: number[];
  enableDeviceFilter?: boolean;
  readonly?: boolean;
  onConfirm?: (
    selectedIds: number[],
    selectedItems: FriendSelectionItem[],
  ) => void;
}

const SelectionPopup: React.FC<SelectionPopupProps> = ({
  visible,
  onVisibleChange,
  selectedOptions,
  onSelect,
  deviceIds = [],
  enableDeviceFilter = true,
  readonly = false,
  onConfirm,
}) => {
  const [friends, setFriends] = useState<FriendSelectionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFriends, setTotalFriends] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<
    FriendSelectionItem[]
  >([]);

  // 获取好友列表API
  const fetchFriends = useCallback(
    async (page: number, keyword: string = "") => {
      setLoading(true);
      try {
        const params: any = {
          page,
          limit: 20,
        };

        if (keyword.trim()) {
          params.keyword = keyword.trim();
        }

        if (enableDeviceFilter && deviceIds.length > 0) {
          params.deviceIds = deviceIds.join(",");
        }

        const response = await getFriendList(params);
        if (response && response.list) {
          setFriends(response.list);
          setTotalFriends(response.total || 0);
          setTotalPages(Math.ceil((response.total || 0) / 20));
        }
      } catch (error) {
        console.error("获取好友列表失败:", error);
      } finally {
        setLoading(false);
      }
    },
    [deviceIds, enableDeviceFilter],
  );

  // 处理好友选择
  const handleFriendToggle = (friend: FriendSelectionItem) => {
    if (readonly) return;

    const newSelectedFriends = tempSelectedOptions.some(f => f.id === friend.id)
      ? tempSelectedOptions.filter(f => f.id !== friend.id)
      : tempSelectedOptions.concat(friend);

    setTempSelectedOptions(newSelectedFriends);
  };

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (readonly) return;

    if (checked) {
      // 全选：添加当前页面所有未选中的好友
      const currentPageFriends = friends.filter(
        friend => !tempSelectedOptions.some(f => f.id === friend.id),
      );
      setTempSelectedOptions(prev => [...prev, ...currentPageFriends]);
    } else {
      // 取消全选：移除当前页面的所有好友
      const currentPageFriendIds = friends.map(f => f.id);
      setTempSelectedOptions(prev =>
        prev.filter(f => !currentPageFriendIds.includes(f.id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    friends.length > 0 &&
    friends.every(friend => tempSelectedOptions.some(f => f.id === friend.id));

  // 确认选择
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(
        tempSelectedOptions.map(v => v.id),
        tempSelectedOptions,
      );
    }
    // 更新实际选中的选项
    onSelect(tempSelectedOptions);
    onVisibleChange(false);
  };

  // 弹窗打开时初始化
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
      setSearchQuery("");
      // 复制一份selectedOptions到临时变量
      setTempSelectedOptions([...selectedOptions]);
      fetchFriends(1, "");
    }
  }, [visible, selectedOptions]); // 只在弹窗开启时请求

  // 搜索防抖（只在弹窗打开且搜索词变化时执行）
  useEffect(() => {
    if (!visible || searchQuery === "") return; // 弹窗关闭或搜索词为空时不请求

    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchFriends(1, searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  // 页码变化时请求数据（只在弹窗打开且页码不是1时执行）
  useEffect(() => {
    if (!visible) return; // 弹窗关闭或第一页时不请求
    fetchFriends(currentPage, searchQuery);
  }, [currentPage, visible, searchQuery]);

  return (
    <Popup
      visible={visible && !readonly}
      onMaskClick={() => onVisibleChange(false)}
      position="bottom"
      bodyStyle={{ height: "100vh" }}
    >
      <Layout
        header={
          <PopupHeader
            title="选择微信好友"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="搜索好友"
            loading={loading}
            onRefresh={() => fetchFriends(currentPage, searchQuery)}
          />
        }
        footer={
          <PopupFooter
            currentPage={currentPage}
            totalPages={totalPages}
            loading={loading}
            selectedCount={tempSelectedOptions.length}
            onPageChange={setCurrentPage}
            onCancel={() => onVisibleChange(false)}
            onConfirm={handleConfirm}
            isAllSelected={isCurrentPageAllSelected}
            onSelectAll={handleSelectAllCurrentPage}
          />
        }
      >
        <div className={style.friendList}>
          {loading ? (
            <div className={style.loadingBox}>
              <div className={style.loadingText}>加载中...</div>
            </div>
          ) : friends.length > 0 ? (
            <div className={style.friendListInner}>
              {friends.map(friend => (
                <div key={friend.id} className={style.friendItem}>
                  <Checkbox
                    checked={tempSelectedOptions.some(f => f.id === friend.id)}
                    onChange={() => !readonly && handleFriendToggle(friend)}
                    disabled={readonly}
                    style={{ marginRight: 12 }}
                  />
                  <div className={style.friendInfo}>
                    <div className={style.friendAvatar}>
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.nickname}
                          className={style.avatarImg}
                        />
                      ) : (
                        friend.nickname.charAt(0)
                      )}
                    </div>
                    <div className={style.friendDetail}>
                      <div className={style.friendName}>{friend.nickname}</div>
                      <div className={style.friendId}>
                        微信ID: {friend.wechatId}
                      </div>
                      {friend.customer && (
                        <div className={style.friendCustomer}>
                          归属客户: {friend.customer}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={style.emptyBox}>
              <div className={style.emptyText}>
                {deviceIds.length === 0
                  ? "请先选择设备"
                  : searchQuery
                    ? `没有找到包含"${searchQuery}"的好友`
                    : "没有找到好友"}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </Popup>
  );
};

export default SelectionPopup;
