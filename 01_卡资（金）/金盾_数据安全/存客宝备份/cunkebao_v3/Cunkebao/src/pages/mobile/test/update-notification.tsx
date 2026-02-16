import React from "react";
import UpdateNotification from "@/components/UpdateNotification";

const UpdateNotificationTest: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        position: "relative",
      }}
    >
      {/* 更新通知组件 */}
      <UpdateNotification forceShow={true} />

      {/* 页面内容 */}
      <div
        style={{
          paddingTop: "calc(80px + env(safe-area-inset-top))", // 为通知栏留出空间
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#333",
            }}
          >
            UpdateNotification 组件预览
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "#666",
              }}
            >
              设计特点：
            </h3>
            <ul
              style={{
                paddingLeft: "20px",
                lineHeight: "1.6",
                color: "#666",
              }}
            >
              <li>酷黑风格横向条设计</li>
              <li>顶部固定定位，支持安全区域</li>
              <li>渐变背景和半透明边框</li>
              <li>蓝色主题按钮</li>
              <li>从上方滑入动画效果</li>
              <li>红色更新图标脉冲动画</li>
              <li>移动端优化的字体和按钮尺寸</li>
            </ul>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "#666",
              }}
            >
              功能说明：
            </h3>
            <ul
              style={{
                paddingLeft: "20px",
                lineHeight: "1.6",
                color: "#666",
              }}
            >
              <li>点击&ldquo;立即更新&rdquo;会刷新页面</li>
              <li>点击&ldquo;稍后&rdquo;会隐藏通知，10分钟后重新检查</li>
              <li>通知固定在顶部，不会影响页面布局</li>
              <li>支持安全区域适配，确保在刘海屏设备上正常显示</li>
              <li>响应式设计，适配不同屏幕尺寸</li>
            </ul>
          </div>

          <div
            style={{
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#666",
                lineHeight: "1.5",
              }}
            >
              <strong>注意：</strong>
              此页面强制显示更新通知组件用于预览效果。在实际使用中，组件会根据更新检测结果自动显示或隐藏。
            </p>
          </div>
        </div>

        {/* 模拟页面内容 */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "500",
              marginBottom: "16px",
              color: "#333",
            }}
          >
            页面内容区域
          </h3>
          <p
            style={{
              lineHeight: "1.6",
              color: "#666",
              marginBottom: "16px",
            }}
          >
            这里是页面的主要内容区域。更新通知栏固定在顶部，不会影响页面内容的正常显示和交互。
          </p>
          <p
            style={{
              lineHeight: "1.6",
              color: "#666",
              marginBottom: "16px",
            }}
          >
            页面内容会自动为顶部通知栏预留空间，确保内容不被遮挡。在有安全区域的设备上，
            通知栏会自动适配安全区域高度。
          </p>
          <div
            style={{
              height: "200px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: "14px",
            }}
          >
            模拟内容区域
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationTest;
