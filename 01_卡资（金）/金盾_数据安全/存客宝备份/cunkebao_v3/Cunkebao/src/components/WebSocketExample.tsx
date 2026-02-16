import React, { useEffect, useState } from "react";
import { Button, Card, List, Badge, Toast } from "antd-mobile";
import {
  useWebSocketStore,
  WebSocketStatus,
  WebSocketMessage,
} from "@/store/module/websocket/websocket";

/**
 * WebSocket使用示例组件
 * 展示如何使用WebSocket store进行消息收发
 */
const WebSocketExample: React.FC = () => {
  const [messageInput, setMessageInput] = useState("");

  // 使用WebSocket store
  const {
    status,
    messages,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    sendCommand,
    clearMessages,
    markAsRead,
    reconnect,
  } = useWebSocketStore();

  // 连接状态显示
  const getStatusText = () => {
    switch (status) {
      case WebSocketStatus.DISCONNECTED:
        return "未连接";
      case WebSocketStatus.CONNECTING:
        return "连接中...";
      case WebSocketStatus.CONNECTED:
        return "已连接";
      case WebSocketStatus.RECONNECTING:
        return "重连中...";
      case WebSocketStatus.ERROR:
        return "连接错误";
      default:
        return "未知状态";
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (status) {
      case WebSocketStatus.CONNECTED:
        return "success";
      case WebSocketStatus.CONNECTING:
      case WebSocketStatus.RECONNECTING:
        return "warning";
      case WebSocketStatus.ERROR:
        return "danger";
      default:
        return "default";
    }
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!messageInput.trim()) {
      Toast.show({ content: "请输入消息内容", position: "top" });
      return;
    }

    sendMessage({
      type: "chat",
      content: {
        text: messageInput,
        timestamp: Date.now(),
      },
      sender: "user",
      receiver: "all",
    });

    setMessageInput("");
  };

  // 发送命令
  const handleSendCommand = (cmdType: string) => {
    sendCommand(cmdType, {
      data: "示例数据",
      timestamp: Date.now(),
    });
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div style={{ padding: "16px" }}>
      <Card title="WebSocket 连接状态">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Badge color={getStatusColor()}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
          </Badge>
          <span>{getStatusText()}</span>
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Button
            size="small"
            color="primary"
            onClick={() =>
              connect({
                url: "wss://kf.quwanzhi.com:9993", // 显式指定WebSocket URL，确保使用正确的服务器地址
                client: "kefu-client",
                autoReconnect: true,
              })
            }
            disabled={
              status === WebSocketStatus.CONNECTING ||
              status === WebSocketStatus.CONNECTED
            }
          >
            连接
          </Button>

          <Button
            size="small"
            color="danger"
            onClick={disconnect}
            disabled={status === WebSocketStatus.DISCONNECTED}
          >
            断开
          </Button>

          <Button
            size="small"
            color="warning"
            onClick={reconnect}
            disabled={status === WebSocketStatus.CONNECTED}
          >
            重连
          </Button>
        </div>
      </Card>

      <Card
        title={`消息列表 ${unreadCount > 0 ? `(${unreadCount} 条未读)` : ""}`}
        extra={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button size="small" onClick={markAsRead}>
              标记已读
            </Button>
            <Button size="small" onClick={clearMessages}>
              清空
            </Button>
          </div>
        }
        style={{ marginTop: "16px" }}
      >
        <List style={{ maxHeight: "300px", overflowY: "auto" }}>
          {messages.length === 0 ? (
            <List.Item>暂无消息</List.Item>
          ) : (
            messages.map((message: WebSocketMessage) => (
              <List.Item key={message.id}>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {formatTime(message.timestamp)} - {message.type}
                </div>
                <div style={{ marginTop: "4px" }}>
                  {typeof message.content === "string"
                    ? message.content
                    : JSON.stringify(message.content, null, 2)}
                </div>
              </List.Item>
            ))
          )}
        </List>
      </Card>

      <Card title="发送消息" style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="输入消息内容"
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: "4px",
              fontSize: "14px",
            }}
            onKeyPress={e => e.key === "Enter" && handleSendMessage()}
          />
          <Button
            color="primary"
            onClick={handleSendMessage}
            disabled={status !== WebSocketStatus.CONNECTED}
          >
            发送
          </Button>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button
            size="small"
            onClick={() => handleSendCommand("CmdHeartbeat")}
            disabled={status !== WebSocketStatus.CONNECTED}
          >
            心跳
          </Button>

          <Button
            size="small"
            onClick={() => handleSendCommand("CmdGetStatus")}
            disabled={status !== WebSocketStatus.CONNECTED}
          >
            获取状态
          </Button>

          <Button
            size="small"
            onClick={() => handleSendCommand("CmdSignIn")}
            disabled={status !== WebSocketStatus.CONNECTED}
          >
            登录
          </Button>
        </div>
      </Card>

      <Card title="使用说明" style={{ marginTop: "16px" }}>
        <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#666" }}>
          <p>1. 点击"连接"按钮建立WebSocket连接</p>
          <p>2. 连接成功后可以发送消息和命令</p>
          <p>3. 收到的消息会显示在消息列表中</p>
          <p>4. 页面刷新后会自动重连（如果之前是连接状态）</p>
          <p>5. 支持自动重连和错误处理</p>
        </div>
      </Card>
    </div>
  );
};

export default WebSocketExample;
