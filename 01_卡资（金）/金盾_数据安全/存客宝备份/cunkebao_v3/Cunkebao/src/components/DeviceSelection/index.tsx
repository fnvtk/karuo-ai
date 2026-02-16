import React, { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Input, Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { DeviceSelectionProps } from "./data";
import SelectionPopup from "./selectionPopup";
import style from "./index.module.scss";

const DeviceSelection: React.FC<DeviceSelectionProps> = ({
  selectedOptions,
  onSelect,
  placeholder = "选择设备",
  className = "",
  mode = "input",
  open,
  onOpenChange,
  selectedListMaxHeight = 300, // 默认300
  showInput = true,
  showSelectedList = true,
  readonly = false,
  singleSelect = false,
}) => {
  // 弹窗控制
  const [popupVisible, setPopupVisible] = useState(false);
  const isDialog = mode === "dialog";
  const realVisible = isDialog ? !!open : popupVisible;
  const setRealVisible = (v: boolean) => {
    if (isDialog && onOpenChange) onOpenChange(v);
    if (!isDialog) setPopupVisible(v);
  };

  // 打开弹窗
  const openPopup = () => {
    if (readonly) return;
    setRealVisible(true);
  };

  // 获取显示文本
  const getDisplayText = () => {
    if (selectedOptions.length === 0) return "";
    if (singleSelect && selectedOptions.length > 0) {
      return selectedOptions[0].memo || selectedOptions[0].wechatId || "已选择设备";
    }
    return `已选择 ${selectedOptions.length} 个设备`;
  };

  // 删除已选设备
  const handleRemoveDevice = (id: number) => {
    if (readonly) return;
    onSelect(selectedOptions.filter(v => v.id !== id));
  };

  // 清除所有已选设备
  const handleClearAll = () => {
    if (readonly) return;
    onSelect([]);
  };

  return (
    <>
      {/* mode=input 显示输入框，mode=dialog不显示 */}
      {mode === "input" && showInput && (
        <div className={`${style.inputWrapper} ${className}`}>
          <Input
            placeholder={placeholder}
            value={getDisplayText()}
            onClick={openPopup}
            prefix={<SearchOutlined />}
            allowClear={!readonly}
            onClear={handleClearAll}
            size="large"
            readOnly={readonly}
            disabled={readonly}
            style={
              readonly ? { background: "#f5f5f5", cursor: "not-allowed" } : {}
            }
          />
        </div>
      )}
      {/* 已选设备列表窗口 */}
      {mode === "input" && showSelectedList && selectedOptions.length > 0 && (
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
          {selectedOptions.map(device => (
            <div
              key={device.id}
              className={style.selectedListRow}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: "1px solid #f0f0f0",
                fontSize: 14,
              }}
            >
              {/* 头像 */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "6px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.25)",
                  marginRight: "12px",
                  flexShrink: 0,
                }}
              >
                {device.avatar ? (
                  <img
                    src={device.avatar}
                    alt="头像"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 16,
                      color: "#fff",
                      fontWeight: 700,
                      textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  >
                    {(device.memo || device.wechatId || "设")[0]}
                  </span>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {device.memo} - {device.wechatId}
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
                  onClick={() => handleRemoveDevice(device.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {/* 弹窗 */}
      <SelectionPopup
        visible={realVisible && !readonly}
        onClose={() => setRealVisible(false)}
        selectedOptions={selectedOptions}
        onSelect={onSelect}
        singleSelect={singleSelect}
      />
    </>
  );
};

export default DeviceSelection;
