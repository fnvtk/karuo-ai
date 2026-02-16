import React, { useState, useEffect } from "react";
import { Checkbox, Popup } from "antd-mobile";
import { getContentLibraryList } from "./api";
import style from "./index.module.scss";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import { ContentItem } from "./data";

interface SelectionPopupProps {
  visible: boolean;
  onClose: () => void;
  selectedOptions: ContentItem[];
  onSelect: (libraries: ContentItem[]) => void;
  onConfirm?: (libraries: ContentItem[]) => void;
}

const PAGE_SIZE = 10;

// 类型标签文本
const getTypeText = (type?: number) => {
  if (type === 1) return "文本";
  if (type === 2) return "图片";
  if (type === 3) return "视频";
  return "未知";
};

// 时间格式化
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
};

const SelectionPopup: React.FC<SelectionPopupProps> = ({
  visible,
  onClose,
  selectedOptions,
  onSelect,
  onConfirm,
}) => {
  // 内容库数据
  const [libraries, setLibraries] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true); // 默认设置为加载中状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLibraries, setTotalLibraries] = useState(0);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<ContentItem[]>(
    [],
  );

  // 获取内容库列表，支持keyword和分页
  const fetchLibraries = async (page: number, keyword: string = "") => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: PAGE_SIZE,
      };
      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }
      const response = await getContentLibraryList(params);
      if (response && response.list) {
        setLibraries(response.list);
        setTotalLibraries(response.total || 0);
        setTotalPages(Math.ceil((response.total || 0) / PAGE_SIZE));
      } else {
        // 如果没有返回列表数据，设置为空数组
        setLibraries([]);
        setTotalLibraries(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("获取内容库列表失败:", error);
      // 请求失败时，设置为空数组
      setLibraries([]);
      setTotalLibraries(0);
      setTotalPages(1);
    } finally {
      setTimeout(() => {
        setLoading(false);
      });
    }
  };

  // 打开弹窗时获取第一页
  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setCurrentPage(1);
      // 复制一份selectedOptions到临时变量
      setTempSelectedOptions([...selectedOptions]);
      // 设置loading状态，避免显示空内容
      setLoading(true);
      fetchLibraries(1, "");
    } else {
      // 关闭弹窗时重置加载状态，确保下次打开时显示加载中
      setLoading(true);
    }
  }, [visible, selectedOptions]);

  // 搜索处理函数
  const handleSearch = (query: string) => {
    if (!visible) return;
    setCurrentPage(1);
    fetchLibraries(1, query);
  };

  // 搜索输入变化时的处理
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // 翻页处理函数
  const handlePageChange = (page: number) => {
    if (!visible || page === currentPage) return;
    setCurrentPage(page);
    fetchLibraries(page, searchQuery);
  };

  // 处理内容库选择
  const handleLibraryToggle = (library: ContentItem) => {
    const newSelected = tempSelectedOptions.some(c => c.id === library.id)
      ? tempSelectedOptions.filter(c => c.id !== library.id)
      : [...tempSelectedOptions, library];
    setTempSelectedOptions(newSelected);
  };

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      // 全选：添加当前页面所有未选中的内容库
      const currentPageLibraries = libraries.filter(
        library => !tempSelectedOptions.some(l => l.id === library.id),
      );
      setTempSelectedOptions(prev => [...prev, ...currentPageLibraries]);
    } else {
      // 取消全选：移除当前页面的所有内容库
      const currentPageLibraryIds = libraries.map(l => l.id);
      setTempSelectedOptions(prev =>
        prev.filter(l => !currentPageLibraryIds.includes(l.id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    libraries.length > 0 &&
    libraries.every(library =>
      tempSelectedOptions.some(l => l.id === library.id),
    );

  // 确认选择
  const handleConfirm = () => {
    // 用户点击确认时，才更新实际的selectedOptions
    onSelect(tempSelectedOptions);
    if (onConfirm) {
      onConfirm(tempSelectedOptions);
    }
    onClose();
  };
  // 渲染内容库列表或空状态提示
  const OptionsList = () => {
    return libraries.length > 0 ? (
      <div className={style.libraryListInner}>
        {libraries.map(item => (
          <label key={item.id} className={style.libraryItem}>
            <Checkbox
              checked={tempSelectedOptions.map(c => c.id).includes(item.id)}
              onChange={() => handleLibraryToggle(item)}
              className={style.checkboxWrapper}
            />
            <div className={style.libraryInfo}>
              <div className={style.libraryHeader}>
                <span className={style.libraryName}>{item.name}</span>
                <span className={style.typeTag}>
                  {getTypeText(item.sourceType)}
                </span>
              </div>
              <div className={style.libraryMeta}>
                <div>创建人: {item.creatorName || "-"}</div>
                <div>更新时间: {formatDate(item.updateTime)}</div>
              </div>
              {item.description && (
                <div className={style.libraryDesc}>{item.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
    ) : (
      <div className={style.emptyBox}>
        <div className={style.emptyText}>数据为空</div>
      </div>
    );
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ height: "100vh" }}
      closeOnMaskClick={false}
    >
      <Layout
        header={
          <PopupHeader
            title="选择内容库"
            searchQuery={searchQuery}
            setSearchQuery={handleSearchChange}
            searchPlaceholder="搜索内容库"
            loading={loading}
            onSearch={handleSearch}
            onRefresh={() => fetchLibraries(currentPage, searchQuery)}
          />
        }
        footer={
          <PopupFooter
            currentPage={currentPage}
            totalPages={totalPages}
            loading={loading}
            selectedCount={tempSelectedOptions.length}
            onPageChange={handlePageChange}
            onCancel={onClose}
            onConfirm={handleConfirm}
            isAllSelected={isCurrentPageAllSelected}
            onSelectAll={handleSelectAllCurrentPage}
          />
        }
      >
        <div className={style.libraryList}>
          {loading ? (
            <div className={style.loadingBox}>
              <div className={style.loadingText}>加载中...</div>
            </div>
          ) : (
            OptionsList()
          )}
        </div>
      </Layout>
    </Popup>
  );
};

export default SelectionPopup;
