import React, { useEffect, useMemo, useRef, useState } from "react";
import { Popup } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import style from "./index.module.scss";
import { getAccountList } from "./api";
import { AccountItem, SelectionPopupProps } from "./data";

export default function SelectionPopup({
  visible,
  onVisibleChange,
  selectedOptions,
  onSelect,
  readonly = false,
  onConfirm,
}: SelectionPopupProps) {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<AccountItem[]>(
    [],
  );

  // 累积已加载过的账号，确保确认时能返回更完整的对象
  const loadedAccountMapRef = useRef<Map<number, AccountItem>>(new Map());

  const pageSize = 20;

  const fetchAccounts = async (page: number, keyword: string = "") => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (keyword.trim()) params.keyword = keyword.trim();

      const response = await getAccountList(params);
      if (response && response.list) {
        setAccounts(response.list);
        const total: number = response.total || response.list.length || 0;
        setTotalAccounts(total);
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));

        // 累积到映射表
        response.list.forEach((acc: AccountItem) => {
          loadedAccountMapRef.current.set(acc.id, acc);
        });
      } else {
        setAccounts([]);
        setTotalAccounts(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("获取账号列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountToggle = (account: AccountItem) => {
    if (readonly || !onSelect) return;
    const isSelected = tempSelectedOptions.some(opt => opt.id === account.id);
    const next = isSelected
      ? tempSelectedOptions.filter(opt => opt.id !== account.id)
      : tempSelectedOptions.concat(account);
    setTempSelectedOptions(next);
  };

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (readonly) return;

    if (checked) {
      // 全选：添加当前页面所有未选中的账号
      const currentPageAccounts = accounts.filter(
        account => !tempSelectedOptions.some(a => a.id === account.id),
      );
      setTempSelectedOptions(prev => [...prev, ...currentPageAccounts]);
    } else {
      // 取消全选：移除当前页面的所有账号
      const currentPageAccountIds = accounts.map(a => a.id);
      setTempSelectedOptions(prev =>
        prev.filter(a => !currentPageAccountIds.includes(a.id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    accounts.length > 0 &&
    accounts.every(account =>
      tempSelectedOptions.some(a => a.id === account.id),
    );

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(tempSelectedOptions);
    }
    if (onSelect) {
      onSelect(tempSelectedOptions);
    }
    onVisibleChange(false);
  };

  // 弹窗打开时初始化数据
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
      setSearchQuery("");
      loadedAccountMapRef.current.clear();
      // 复制一份selectedOptions到临时变量
      setTempSelectedOptions([...selectedOptions]);
      fetchAccounts(1, "");
    }
  }, [visible, selectedOptions]);

  // 搜索防抖
  useEffect(() => {
    if (!visible) return;
    if (searchQuery === "") return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchAccounts(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  // 页码变化
  useEffect(() => {
    if (!visible) return;
    fetchAccounts(currentPage, searchQuery);
  }, [currentPage, visible, searchQuery]);

  const selectedIdSet = useMemo(
    () => new Set(tempSelectedOptions.map(opt => opt.id)),
    [tempSelectedOptions],
  );

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
            title="选择账号"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="搜索账号"
            loading={loading}
            onRefresh={() => fetchAccounts(currentPage, searchQuery)}
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
          ) : accounts.length > 0 ? (
            <div className={style.friendListInner}>
              {accounts.map(acc => (
                <label
                  key={acc.id}
                  className={style.friendItem}
                  onClick={() => !readonly && handleAccountToggle(acc)}
                >
                  <div className={style.radioWrapper}>
                    <div
                      className={
                        selectedIdSet.has(acc.id)
                          ? style.radioSelected
                          : style.radioUnselected
                      }
                    >
                      {selectedIdSet.has(acc.id) && (
                        <div className={style.radioDot}></div>
                      )}
                    </div>
                  </div>
                  <div className={style.friendInfo}>
                    <div className={style.friendAvatar}>
                      {acc.avatar ? (
                        <img
                          src={acc.avatar}
                          alt={acc.userName}
                          className={style.avatarImg}
                        />
                      ) : (
                        (acc.userName?.charAt(0) ?? "?")
                      )}
                    </div>
                    <div className={style.friendDetail}>
                      <div className={style.friendName}>{acc.userName}</div>
                      <div className={style.friendId}>
                        真实姓名: {acc.realName}
                      </div>
                      <div className={style.friendId}>
                        部门: {acc.departmentName}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className={style.emptyBox}>
              <div className={style.emptyText}>
                {searchQuery
                  ? `没有找到包含"${searchQuery}"的账号`
                  : "没有找到账号"}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </Popup>
  );
}
