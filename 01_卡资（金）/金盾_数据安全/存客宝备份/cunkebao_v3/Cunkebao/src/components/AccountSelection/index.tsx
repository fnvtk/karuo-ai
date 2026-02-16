import React, { useState } from "react";
import { SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import style from "./index.module.scss";
import SelectionPopup from "./selectionPopup";
import { AccountItem, AccountSelectionProps } from "./data";

export default function AccountSelection({
  selectedOptions,
  onSelect,
  accounts: propAccounts = [],
  placeholder = "选择账号",
  className = "",
  visible,
  onVisibleChange,
  selectedListMaxHeight = 300,
  showInput = true,
  showSelectedList = true,
  readonly = false,
  onConfirm,
}: AccountSelectionProps) {
  const [popupVisible, setPopupVisible] = useState(false);

  // 受控弹窗逻辑
  const realVisible = visible !== undefined ? visible : popupVisible;
  const setRealVisible = (v: boolean) => {
    if (onVisibleChange) onVisibleChange(v);
    if (visible === undefined) setPopupVisible(v);
  };

  // 打开弹窗
  const openPopup = () => {
    if (readonly) return;
    setRealVisible(true);
  };

  // 获取显示文本
  const getDisplayText = () => {
    if (selectedOptions.length === 0) return "";
    return `已选择 ${selectedOptions.length} 个账号`;
  };

  // 删除已选账号
  const handleRemoveAccount = (id: number) => {
    if (readonly) return;
    onSelect(selectedOptions.filter(d => d.id !== id));
  };

  return (
    <>
      {/* 输入框 */}
      {showInput && (
        <div className={`${style.inputWrapper} ${className}`}>
          <Input
            placeholder={placeholder}
            value={getDisplayText()}
            onClick={openPopup}
            prefix={<SearchOutlined />}
            allowClear={!readonly}
            size="large"
            readOnly={readonly}
            disabled={readonly}
            style={
              readonly ? { background: "#f5f5f5", cursor: "not-allowed" } : {}
            }
          />
        </div>
      )}
      {/* 已选账号列表窗口 */}
      {showSelectedList && selectedOptions.length > 0 && (
        <div
          className={style.selectedListWindow}
          style={{
            maxHeight: selectedListMaxHeight,
            overflowY: "auto",
            marginTop: 8,
            border: "1px solid #e5e6eb",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          {selectedOptions.map(acc => (
            <div
              key={acc.id}
              className={style.selectedListRow}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 8px",
                borderBottom: "1px solid #f0f0f0",
                fontSize: 14,
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                【{acc.realName}】 {acc.userName}
              </div>
              {!readonly && (
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{
                    marginLeft: 4,
                    color: "#ff4d4f",
                    border: "none",
                    background: "none",
                    minWidth: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => handleRemoveAccount(acc.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {/* 弹窗 */}
      <SelectionPopup
        visible={realVisible}
        onVisibleChange={setRealVisible}
        selectedOptions={selectedOptions}
        onSelect={onSelect}
        readonly={readonly}
        onConfirm={onConfirm}
      />
    </>
  );
}
