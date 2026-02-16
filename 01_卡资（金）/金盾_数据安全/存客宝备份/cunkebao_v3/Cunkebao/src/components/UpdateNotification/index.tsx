import React, { useState, useEffect } from "react";
import { Button } from "antd-mobile";
import { updateChecker } from "@/utils/updateChecker";
import { ReloadOutlined } from "@ant-design/icons";

interface UpdateNotificationProps {
  position?: "top" | "bottom";
  autoReload?: boolean;
  showToast?: boolean;
  forceShow?: boolean;
  onClose?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  position = "top",
  autoReload = false,
  showToast = true,
  forceShow = false,
  onClose,
}) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 注册更新检测回调
    const handleUpdate = (info: { hasUpdate: boolean }) => {
      if (info.hasUpdate) {
        setHasUpdate(true);
        setIsVisible(true);

        if (autoReload) {
          // 自动刷新
          setTimeout(() => {
            updateChecker.forceReload();
          }, 3000);
        }
      }
    };

    updateChecker.onUpdate(handleUpdate);

    // 启动更新检测
    updateChecker.start();

    return () => {
      updateChecker.offUpdate(handleUpdate);
      updateChecker.stop();
    };
  }, [autoReload, showToast]);
  const handleReload = () => {
    updateChecker.forceReload();
  };

  const handleLater = () => {
    setIsVisible(false);
    onClose?.();
    // 10分钟后再次检查
    setTimeout(
      () => {
        updateChecker.start();
      },
      10 * 60 * 1000,
    );
  };

  if ((!isVisible || !hasUpdate) && !forceShow) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
        color: "white",
        padding: "16px 16px",
        paddingTop: "calc(16px + env(safe-area-inset-top))",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        animation: "slideDownBar 0.3s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* 左侧内容 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flex: 1,
          }}
        >
          {/* 更新图标 */}
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #188eee 0%, #188eee 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <ReloadOutlined />
          </div>
          {/* 文本信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "2px",
                lineHeight: "1.2",
              }}
            >
              发现新版本
            </div>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.8,
                lineHeight: "1.3",
              }}
            >
              建议立即更新获得更好体验
            </div>
          </div>
        </div>

        {/* 右侧按钮组 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <Button
            size="small"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "12px",
              fontWeight: "500",
              borderRadius: "6px",
              height: "32px",
              minHeight: "32px",
              padding: "0 12px",
              minWidth: "56px",
            }}
            onClick={handleLater}
          >
            稍后
          </Button>
          <Button
            size="small"
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              border: "none",
              color: "white",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "6px",
              height: "32px",
              minHeight: "32px",
              padding: "0 16px",
              minWidth: "64px",
              boxShadow: "0 2px 8px rgba(24, 144, 255, 0.3)",
            }}
            onClick={handleReload}
          >
            立即更新
          </Button>
        </div>
      </div>

      {/* 动画样式 */}
      <style>
        {`
          @keyframes slideDownBar {
            0% {
              transform: translateY(-100%);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>
    </div>
  );
};

export default UpdateNotification;
