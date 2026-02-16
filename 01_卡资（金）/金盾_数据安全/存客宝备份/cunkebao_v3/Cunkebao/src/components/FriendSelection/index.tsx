import React, { useState } from "react";
import { SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { Avatar } from "antd-mobile";
import style from "./index.module.scss";
import { FriendSelectionProps } from "./data";
import SelectionPopup from "./selectionPopup";

export default function FriendSelection({
  selectedOptions = [],
  onSelect,
  deviceIds = [],
  enableDeviceFilter = true,
  placeholder = "选择微信好友",
  className = "",
  visible,
  onVisibleChange,
  selectedListMaxHeight = 300,
  showInput = true,
  showSelectedList = true,
  readonly = false,
  onConfirm,
}: FriendSelectionProps) {
  const [popupVisible, setPopupVisible] = useState(false);
  // 内部弹窗交给 selectionPopup 处理

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
    if (!selectedOptions || selectedOptions.length === 0) return "";
    return `已选择 ${selectedOptions.length} 个好友`;
  };

  // 删除已选好友
  const handleRemoveFriend = (id: number) => {
    if (readonly) return;
    onSelect((selectedOptions || []).filter(v => v.id !== id));
  };

  // 弹窗确认回调
  const handleConfirm = (
    selectedIds: number[],
    selectedItems: typeof selectedOptions,
  ) => {
    onSelect(selectedItems);
    if (onConfirm) onConfirm(selectedIds, selectedItems);
    setRealVisible(false);
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
      {/* 已选好友列表窗口 */}
      {showSelectedList && (selectedOptions || []).length > 0 && (
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
          {(selectedOptions || []).map(friend => (
            <div key={friend.id} className={style.selectedListRow}>
              <div className={style.selectedListRowContent}>
                <Avatar src={friend.avatar || friend.friendAvatar} />
                <div className={style.selectedListRowContentText}>
                  <div>{friend.nickname || friend.friendName}</div>
                  <div>{friend.wechatId}</div>
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
                    onClick={() => handleRemoveFriend(friend.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 弹窗 */}
      <SelectionPopup
        visible={realVisible && !readonly}
        onVisibleChange={setRealVisible}
        selectedOptions={selectedOptions || []}
        onSelect={onSelect}
        deviceIds={deviceIds}
        enableDeviceFilter={enableDeviceFilter}
        readonly={readonly}
        onConfirm={handleConfirm}
      />
    </>
  );
}
