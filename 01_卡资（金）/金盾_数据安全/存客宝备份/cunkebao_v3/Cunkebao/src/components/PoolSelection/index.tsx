import React, { useState } from "react";
import { SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import style from "./index.module.scss";
import SelectionPopup from "./selectionPopup";
import { PoolSelectionProps } from "./data";
export default function PoolSelection({
  selectedOptions,
  onSelect,
  onSelectDetail,
  placeholder = "选择流量池",
  className = "",
  visible,
  onVisibleChange,
  selectedListMaxHeight = 300,
  showInput = true,
  showSelectedList = true,
  readonly = false,
  onConfirm,
}: PoolSelectionProps) {
  const [popupVisible, setPopupVisible] = useState(false);

  // 删除已选流量池项
  const handleRemoveItem = (id: string) => {
    if (readonly) return;
    onSelect(selectedOptions.filter(item => item.id !== id));
  };

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
    return `已选择 ${selectedOptions.length} 个流量池项`;
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
      {/* 已选流量池列表窗口 */}
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
          {selectedOptions.map(item => (
            <div key={item.id} className={style.selectedListRow}>
              <div className={style.selectedListRowContent}>
                <div className={style.groupAvatar}>
                  {(item.nickname || item.name || "").charAt(0)}
                </div>
                <div className={style.selectedListRowContentText}>
                  <div>{item.nickname || item.name}</div>
                  <div>{item.wechatId || item.mobile}</div>
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
                    onClick={() => handleRemoveItem(item.id)}
                  />
                )}
              </div>
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
        onSelectDetail={onSelectDetail}
        readonly={readonly}
        onConfirm={onConfirm}
      />
    </>
  );
}
