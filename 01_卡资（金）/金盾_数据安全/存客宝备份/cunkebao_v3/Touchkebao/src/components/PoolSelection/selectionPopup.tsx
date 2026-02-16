import React, { useState, useEffect } from "react";
import { Popup, Checkbox } from "antd-mobile";

import { getPoolPackages, Request } from "./api";
import style from "./index.module.scss";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import { PoolSelectionItem, PoolPackageItem } from "./data";

// 弹窗属性接口
interface SelectionPopupProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  selectedOptions: PoolSelectionItem[];
  onSelect: (items: PoolSelectionItem[]) => void;
  onSelectDetail?: (items: PoolPackageItem[]) => void;
  readonly?: boolean;
  onConfirm?: (
    selectedIds: string[],
    selectedItems: PoolSelectionItem[],
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
  const [poolPackages, setPoolPackages] = useState<PoolPackageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<
    PoolSelectionItem[]
  >([]);

  // 获取流量池包列表API
  const fetchPoolPackages = async (page: number, keyword: string = "") => {
    setLoading(true);
    try {
      const params: Request = {
        page: String(page),
        limit: "20",
        keyword: keyword.trim(),
      };

      const response = await getPoolPackages(params);
      if (response && response.list) {
        setPoolPackages(response.list);
        setTotalItems(response.total || 0);
        setTotalPages(Math.ceil((response.total || 0) / 20));
      }
    } catch (error) {
      console.error("获取流量池包列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理流量池包选择
  const handlePackageToggle = (item: PoolPackageItem) => {
    if (readonly) return;

    // 将PoolPackageItem转换为GroupSelectionItem格式
    const selectionItem: PoolSelectionItem = {
      id: String(item.id),
      name: item.name,
      description: item.description,
      createTime: item.createTime,
      num: item.num,
      // 保留原始数据
      originalData: item,
    };

    const newSelectedItems = tempSelectedOptions.some(
      g => g.id === String(item.id),
    )
      ? tempSelectedOptions.filter(g => g.id !== String(item.id))
      : tempSelectedOptions.concat(selectionItem);

    setTempSelectedOptions(newSelectedItems);

    // 如果有 onSelectDetail 回调，传递完整的流量池包对象
    if (onSelectDetail) {
      const selectedItemObjs = poolPackages.filter(packageItem =>
        newSelectedItems.some(g => g.id === String(packageItem.id)),
      );
      onSelectDetail(selectedItemObjs);
    }
  };

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (readonly) return;

    if (checked) {
      // 全选：添加当前页面所有未选中的流量池包
      const currentPagePackages = poolPackages.filter(
        packageItem =>
          !tempSelectedOptions.some(p => p.id === String(packageItem.id)),
      );
      const newSelectionItems = currentPagePackages.map(item => ({
        id: String(item.id),
        name: item.name,
        description: item.description,
        createTime: item.createTime,
        num: item.num,
        originalData: item,
      }));
      setTempSelectedOptions(prev => [...prev, ...newSelectionItems]);
    } else {
      // 取消全选：移除当前页面的所有流量池包
      const currentPagePackageIds = poolPackages.map(p => String(p.id));
      setTempSelectedOptions(prev =>
        prev.filter(p => !currentPagePackageIds.includes(p.id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    poolPackages.length > 0 &&
    poolPackages.every(packageItem =>
      tempSelectedOptions.some(p => p.id === String(packageItem.id)),
    );

  // 确认选择
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(
        tempSelectedOptions.map(item => item.id),
        tempSelectedOptions,
      );
    }
    // 更新实际选中的选项
    onSelect(tempSelectedOptions);
    onVisibleChange(false);
  };

  // 弹窗打开时初始化数据（只执行一次）
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
      setSearchQuery("");
      // 复制一份selectedOptions到临时变量
      setTempSelectedOptions([...selectedOptions]);
      fetchPoolPackages(1, "");
    }
  }, [visible, selectedOptions]);

  // 搜索防抖（只在弹窗打开且搜索词变化时执行）
  useEffect(() => {
    if (!visible || searchQuery === "") return;

    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPoolPackages(1, searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  // 页码变化时请求数据（只在弹窗打开且页码不是1时执行）
  useEffect(() => {
    if (!visible) return;
    fetchPoolPackages(currentPage, searchQuery);
  }, [currentPage, visible, searchQuery]);

  return (
    <Popup
      visible={visible}
      onMaskClick={() => onVisibleChange(false)}
      position="bottom"
      bodyStyle={{ height: "100vh" }}
    >
      <Layout
        header={
          <PopupHeader
            title="选择流量池包"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="搜索流量池包"
            loading={loading}
            onRefresh={() => fetchPoolPackages(currentPage, searchQuery)}
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
          ) : poolPackages.length > 0 ? (
            <div className={style.groupListInner}>
              {poolPackages.map(item => (
                <div key={item.id} className={style.groupItem}>
                  <Checkbox
                    checked={tempSelectedOptions.some(
                      g => g.id === String(item.id),
                    )}
                    onChange={() => !readonly && handlePackageToggle(item)}
                    disabled={readonly}
                    style={{ marginRight: 12 }}
                  />
                  <div className={style.groupInfo}>
                    <div className={style.groupAvatar}>
                      {item.name ? item.name.charAt(0) : "?"}
                    </div>
                    <div className={style.groupDetail}>
                      <div className={style.groupName}>{item.name}</div>
                      <div className={style.groupId}>
                        描述: {item.description || "无描述"}
                      </div>
                      <div className={style.groupOwner}>
                        创建时间: {item.createTime}
                      </div>
                      <div className={style.groupOwner}>
                        包含数量: {item.num}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={style.emptyBox}>
              <div className={style.emptyText}>
                {searchQuery
                  ? `没有找到包含"${searchQuery}"的流量池包`
                  : "没有找到流量池包"}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </Popup>
  );
}
