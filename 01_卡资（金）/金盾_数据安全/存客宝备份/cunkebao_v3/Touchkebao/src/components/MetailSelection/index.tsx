import React, { useState } from "react";
import { SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { Avatar } from "antd-mobile";
import style from "./index.module.scss";
import SelectionPopup from "./selectionPopup";
import { GroupSelectionProps } from "./data";
export default function GroupSelection({
  selectedOptions,
  onSelect,
  onSelectDetail,
  placeholder = "选择素材",
  className = "",
  visible,
  onVisibleChange,
  selectedListMaxHeight = 300,
  showInput = true,
  showSelectedList = true,
  readonly = false,
  selectionMode = "single", // 默认为多选模式
  onConfirm,
}: GroupSelectionProps) {
  const [popupVisible, setPopupVisible] = useState(false);

  // 删除已选素材
  const handleRemoveGroup = (id: string) => {
    if (readonly) return;
    onSelect(selectedOptions.filter(g => g.id !== id));
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

  // 清空已选择的素材
  const handleClear = () => {
    if (readonly) return;
    onSelect([]);
  };

  // 获取显示文本
  const getDisplayText = () => {
    if (selectedOptions.length === 0) return "";
    if (selectionMode === "single") {
      return selectedOptions[0]?.title || "已选择素材";
    }
    return `已选择 ${selectedOptions.length} 个素材`;
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
            allowClear={!readonly && selectedOptions.length > 0}
            onClear={handleClear}
            size="large"
            readOnly={readonly}
            disabled={readonly}
            style={
              readonly ? { background: "#f5f5f5", cursor: "not-allowed" } : {}
            }
          />
        </div>
      )}
      {/* 已选素材列表窗口 */}
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
          {selectedOptions.map(group => (
            <div key={group.id} className={style.selectedListRow}>
              <div className={style.selectedListRowContent}>
                <Avatar src={group.cover} />
                <div className={style.selectedListRowContentText}>
                  <div>{group.title}</div>
                  <div>ID: {group.id}</div>
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
                    onClick={() => handleRemoveGroup(group.id)}
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
        selectionMode={selectionMode}
        onConfirm={onConfirm}
      />
    </>
  );
}
