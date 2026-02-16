import React, { useState } from "react";
import { Input, Button, Card, Space, Typography, Divider } from "antd";
import { SendOutlined } from "@ant-design/icons";
import ChatFileUpload from "./index";

const { TextArea } = Input;
const { Text } = Typography;

interface ChatMessage {
  id: string;
  type: "text" | "file";
  content: string;
  timestamp: Date;
  fileInfo?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
}

const ChatFileUploadExample: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");

  // 处理文件上传
  const handleFileUploaded = (fileInfo: {
    url: string;
    name: string;
    type: string;
    size: number;
  }) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "file",
      content: `文件: ${fileInfo.name}`,
      timestamp: new Date(),
      fileInfo,
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // 处理文本发送
  const handleSendText = () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "text",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 获取文件类型图标
  const getFileTypeIcon = (type: string, name: string) => {
    const lowerType = type.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerType.startsWith("image/")) {
      return "🖼️";
    } else if (lowerType.startsWith("video/")) {
      return "🎥";
    } else if (lowerType.startsWith("audio/")) {
      return "🎵";
    } else if (lowerType === "application/pdf") {
      return "📄";
    } else if (lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) {
      return "📝";
    } else if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
      return "📊";
    } else if (lowerName.endsWith(".ppt") || lowerName.endsWith(".pptx")) {
      return "📈";
    } else {
      return "📎";
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <Card title="聊天文件上传示例" style={{ marginBottom: 20 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>功能特点：</Text>
          <ul>
            <li>点击文件按钮直接唤醒文件选择框</li>
            <li>选择文件后自动上传</li>
            <li>上传成功后自动发送到聊天框</li>
            <li>支持各种文件类型和大小限制</li>
            <li>显示文件图标和大小信息</li>
          </ul>
        </Space>
      </Card>

      {/* 聊天消息区域 */}
      <Card
        title="聊天记录"
        style={{
          height: 400,
          marginBottom: 20,
          overflowY: "auto",
        }}
        bodyStyle={{ height: 320, overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", marginTop: 100 }}>
            暂无消息，开始聊天吧！
          </div>
        ) : (
          <div>
            {messages.map(message => (
              <div key={message.id} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    background: "#f0f0f0",
                    padding: 12,
                    borderRadius: 8,
                    maxWidth: "80%",
                    wordBreak: "break-word",
                  }}
                >
                  {message.type === "text" ? (
                    <div>{message.content}</div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          {getFileTypeIcon(
                            message.fileInfo!.type,
                            message.fileInfo!.name,
                          )}
                        </span>
                        <Text strong>{message.fileInfo!.name}</Text>
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        大小: {formatFileSize(message.fileInfo!.size)}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        类型: {message.fileInfo!.type}
                      </div>
                      <a
                        href={message.fileInfo!.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "#1890ff" }}
                      >
                        查看文件
                      </a>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      marginTop: 4,
                      textAlign: "right",
                    }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 输入区域 */}
      <Card title="发送消息">
        <Space direction="vertical" style={{ width: "100%" }}>
          <TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="输入消息内容..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={e => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              {/* 文件上传组件 */}
              <ChatFileUpload
                onFileUploaded={handleFileUploaded}
                maxSize={50} // 最大50MB
                accept="*/*" // 接受所有文件类型
                buttonText="文件"
                buttonIcon={<span>📎</span>}
              />

              {/* 图片上传组件 */}
              <ChatFileUpload
                onFileUploaded={handleFileUploaded}
                maxSize={10} // 最大10MB
                accept="image/*" // 只接受图片
                buttonText="图片"
                buttonIcon={<span>🖼️</span>}
              />

              {/* 文档上传组件 */}
              <ChatFileUpload
                onFileUploaded={handleFileUploaded}
                maxSize={20} // 最大20MB
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" // 只接受文档
                buttonText="文档"
                buttonIcon={<span>📄</span>}
              />
            </Space>

            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendText}
              disabled={!inputValue.trim()}
            >
              发送
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ChatFileUploadExample;
