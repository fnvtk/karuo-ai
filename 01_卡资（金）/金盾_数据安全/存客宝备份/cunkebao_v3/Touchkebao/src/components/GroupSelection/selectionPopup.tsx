import React, { useState, useEffect } from "react";
import { Popup, Checkbox } from "antd-mobile";

import { getGroupList } from "./api";
import style from "./index.module.scss";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import { GroupSelectionItem } from "./data";
// 群组接口类型
interface WechatGroup {
  id: string;
  name: string;
  avatar: string;
  chatroomId?: string;
  ownerWechatId?: string;
  ownerNickname?: string;
  ownerAvatar?: string;
}

// 弹窗属性接口
interface SelectionPopupProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  selectedOptions: GroupSelectionItem[];
  onSelect: (groups: GroupSelectionItem[]) => void;
  onSelectDetail?: (groups: WechatGroup[]) => void;
  readonly?: boolean;
  onConfirm?: (
    selectedIds: string[],
    selectedItems: GroupSelectionItem[],
  ) => void;
}

export default function SelectionPopup({
  visible,
  onVisibleChange,
  selectedOptions,
  onSelect,
  onSelectDetail,
  readonly = false,
  onConfirm,
}: SelectionPopupProps) {
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<
    GroupSelectionItem[]
  >([]);

  // 获取群聊列表API
  const fetchGroups = async (page: number, keyword: string = "") => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
      };

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      const response = await getGroupList(params);
      if (response && response.list) {
        setGroups(response.list);
        setTotalGroups(response.total || 0);
        setTotalPages(Math.ceil((response.total || 0) / 20));
      }
    } catch (error) {
      console.error("获取群聊列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理群聊选择
  const handleGroupToggle = (group: GroupSelectionItem) => {
    if (readonly) return;

    const newSelectedGroups = tempSelectedOptions.some(g => g.id === group.id)
      ? tempSelectedOptions.filter(g => g.id !== group.id)
      : tempSelectedOptions.concat(group);

    setTempSelectedOptions(newSelectedGroups);
  };

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (readonly) return;

    if (checked) {
      // 全选：添加当前页面所有未选中的群组
      const currentPageGroups = groups.filter(
        group => !tempSelectedOptions.some(g => g.id === group.id),
      );
      setTempSelectedOptions(prev => [...prev, ...currentPageGroups]);
    } else {
      // 取消全选：移除当前页面的所有群组
      const currentPageGroupIds = groups.map(g => g.id);
      setTempSelectedOptions(prev =>
        prev.filter(g => !currentPageGroupIds.includes(g.id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    groups.length > 0 &&
    groups.every(group => tempSelectedOptions.some(g => g.id === group.id));

  // 确认选择
  const handleConfirm = () => {
    // 用户点击确认时，才更新实际的selectedOptions
    onSelect(tempSelectedOptions);

    // 如果有 onSelectDetail 回调，传递完整的群聊对象
    if (onSelectDetail) {
      const selectedGroupObjs = groups.filter(group =>
        tempSelectedOptions.some(g => g.id === group.id),
      );
      onSelectDetail(selectedGroupObjs);
    }

    if (onConfirm) {
      onConfirm(
        tempSelectedOptions.map(g => g.id),
        tempSelectedOptions,
      );
    }
    onVisibleChange(false);
  };

  // 弹窗打开时初始化数据（只执行一次）
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
      setSearchQuery("");
      // 复制一份selectedOptions到临时变量
      setTempSelectedOptions([...selectedOptions]);
      fetchGroups(1, "");
    }
  }, [visible]);

  // 搜索防抖（只在弹窗打开且搜索词变化时执行）
  useEffect(() => {
    if (!visible || searchQuery === "") return;

    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchGroups(1, searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  // 页码变化时请求数据（只在弹窗打开且页码不是1时执行）
  useEffect(() => {
    if (!visible) return;
    fetchGroups(currentPage, searchQuery);
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
            title="选择群聊"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="搜索群聊"
            loading={loading}
            onRefresh={() => fetchGroups(currentPage, searchQuery)}
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
        <div className={style.groupList}>
          {loading ? (
            <div className={style.loadingBox}>
              <div className={style.loadingText}>加载中...</div>
            </div>
          ) : groups.length > 0 ? (
            <div className={style.groupListInner}>
              {groups.map(group => (
                <div key={group.id} className={style.groupItem}>
                  <Checkbox
                    checked={tempSelectedOptions.some(g => g.id === group.id)}
                    onChange={() => !readonly && handleGroupToggle(group)}
                    disabled={readonly}
                    style={{ marginRight: 12 }}
                  />
                  <div className={style.groupInfo}>
                    <div className={style.groupAvatar}>
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className={style.avatarImg}
                        />
                      ) : (
                        group.name.charAt(0)
                      )}
                    </div>
                    <div className={style.groupDetail}>
                      <div className={style.groupName}>{group.name}</div>
                      <div className={style.groupId}>
                        群ID: {group.chatroomId}
                      </div>
                      {group.ownerNickname && (
                        <div className={style.groupOwner}>
                          群主: {group.ownerNickname}
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
                {searchQuery
                  ? `没有找到包含"${searchQuery}"的群聊`
                  : "没有找到群聊"}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </Popup>
  );
}
