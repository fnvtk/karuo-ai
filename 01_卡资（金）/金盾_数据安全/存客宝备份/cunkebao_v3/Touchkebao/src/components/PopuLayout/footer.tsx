import React from "react";
import { Button, Checkbox } from "antd";
import style from "./footer.module.scss";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";

interface PopupFooterProps {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  selectedCount: number;
  onPageChange: (page: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  // 全选功能相关
  isAllSelected?: boolean;
  onSelectAll?: (checked: boolean) => void;
  showSelectAll?: boolean; // 新增：控制全选功能显示，默认为true
}

const PopupFooter: React.FC<PopupFooterProps> = ({
  currentPage,
  totalPages,
  loading,
  selectedCount,
  onPageChange,
  onCancel,
  onConfirm,
  isAllSelected = false,
  onSelectAll,
  showSelectAll = true, // 默认为true，显示全选功能
}) => {
  return (
    <>
      {/* 分页栏 */}
      <div className={style.paginationRow}>
        <div className={style.totalCount}>
          {showSelectAll && (
            <Checkbox
              checked={isAllSelected}
              onChange={e => onSelectAll?.(e.target.checked)}
              className={style.selectAllCheckbox}
            >
              全选当前页
            </Checkbox>
          )}
        </div>
        <div className={style.paginationControls}>
          <Button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className={style.pageBtn}
          >
            <ArrowLeftOutlined />
          </Button>
          <span className={style.pageInfo}>
            {currentPage} / {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || loading}
            className={style.pageBtn}
          >
            <ArrowRightOutlined />
          </Button>
        </div>
      </div>
      <div className={style.popupFooter}>
        <div className={style.selectedCount}>已选择 {selectedCount} 条记录</div>
        <div className={style.footerBtnGroup}>
          <Button color="primary" variant="filled" onClick={onCancel}>
            取消
          </Button>
          <Button type="primary" onClick={onConfirm}>
            确定
          </Button>
        </div>
      </div>
    </>
  );
};

export default PopupFooter;
