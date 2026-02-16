import React, { useState, useEffect } from "react";
import style from "./index.module.scss";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { LoadingOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Input } from "antd";
// 声明全局的 uni 对象
declare global {
  interface Window {
    uni: any;
  }
}

interface Message {
  type: number; // 数据类型：0数据交互 1App功能调用
  data: any;
}

const TYPE_EMUE = {
  CONNECT: 0,
  DATA: 1,
  FUNCTION: 2,
  CONFIG: 3,
};
const IframeDebugPage: React.FC = () => {
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [messageId, setMessageId] = useState(0);
  const [inputMessage, setInputMessage] = useState("");
  const [connectStatus, setConnectStatus] = useState(false);

  // 解析 URL 参数中的消息
  const parseUrlMessage = () => {
    const search = window.location.search.substring(1);
    let messageParam = null;

    if (search) {
      const pairs = search.split("&");
      for (const pair of pairs) {
        const [key, value] = pair.split("=");
        if (key === "message" && value) {
          messageParam = decodeURIComponent(value);
          break;
        }
      }
    }

    if (messageParam) {
      try {
        const message = JSON.parse(decodeURIComponent(messageParam));
        console.log("[存客宝]ReceiveMessage=>\n" + JSON.stringify(message));
        handleReceivedMessage(message);
        // 清除URL中的message参数
        const newUrl =
          window.location.pathname +
          window.location.search
            .replace(/[?&]message=[^&]*/, "")
            .replace(/^&/, "?");
        window.history.replaceState({}, "", newUrl);
      } catch (e) {
        console.error("解析URL消息失败:", e);
      }
    }
  };

  useEffect(() => {
    parseUrlMessage();
    // 监听 SDK 初始化完成事件
  }, []);

  // 处理接收到的消息
  const handleReceivedMessage = (message: Message) => {
    const messageText = `[${new Date().toLocaleTimeString()}] 收到: ${JSON.stringify(message)}`;
    setReceivedMessages(prev => [...prev, messageText]);
    console.log("message.type", message.type);
    if ([TYPE_EMUE.CONNECT].includes(message.type)) {
      setConnectStatus(true);
    }
  };

  // 向 App 发送消息
  const sendMessageToParent = (message: Message) => {
    if (window.uni && window.uni.postMessage) {
      try {
        window.uni.postMessage({
          data: message,
        });
        console.log("[存客宝]SendMessage=>\n" + JSON.stringify(message));
      } catch (e) {
        console.error(
          "[存客宝]SendMessage=>\n" + JSON.stringify(message) + "发送失败:",
          e,
        );
      }
    } else {
      console.error(
        "[存客宝]SendMessage=>\n" + JSON.stringify(message) + "无法发送消息",
      );
    }
  };

  // 发送自定义消息到 App
  const sendCustomMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessageId = messageId + 1;
    setMessageId(newMessageId);

    const message: Message = {
      type: TYPE_EMUE.DATA, // 数据交互
      data: {
        id: newMessageId,
        content: inputMessage,
        source: "存客宝消息源",
        timestamp: Date.now(),
      },
    };

    sendMessageToParent(message);
    setInputMessage("");
  };

  // 发送测试消息到 App
  const sendTestMessage = () => {
    const newMessageId = messageId + 1;
    setMessageId(newMessageId);

    const message: Message = {
      type: TYPE_EMUE.DATA, // 数据交互
      data: {
        id: newMessageId,
        action: "ping",
        content: `存客宝测试消息 ${newMessageId}`,
        random: Math.random(),
      },
    };

    sendMessageToParent(message);
  };

  // 发送App功能调用消息
  const sendAppFunctionCall = () => {
    const message: Message = {
      type: 1, // App功能调用
      data: {
        action: "showToast",
        params: {
          title: "来自H5的功能调用",
          icon: "success",
        },
      },
    };

    sendMessageToParent(message);
  };

  // 清空消息列表
  const clearMessages = () => {
    setInputMessage("");
    setReceivedMessages([]);
  };

  return (
    <Layout
      header={
        <NavCommon
          title="iframe调试"
          right={
            connectStatus ? (
              <CheckCircleOutlined style={{ color: "green" }} />
            ) : (
              <span>
                <span style={{ marginRight: 4, fontSize: 12 }}>连接中...</span>
                <LoadingOutlined />
              </span>
            )
          }
        />
      }
    >
      <div className={style["iframe-debug-page"]}>
        <div className={style.content}>
          <div className={style["message-panel"]}>
            <h4>接收到的消息</h4>
            <div className={style["message-list"]}>
              {receivedMessages.length === 0 ? (
                <div className={style["no-messages"]}>暂无消息</div>
              ) : (
                receivedMessages.map((msg, index) => (
                  <div key={index} className={style["message-item"]}>
                    <span className={style["message-text"]}>{msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={style["control-panel"]}>
            <h4>控制面板</h4>

            <div className={style["input-group"]}>
              <Input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="输入要发送的消息"
              />
              <button
                onClick={sendCustomMessage}
                className={`${style.btn} ${style["btn-primary"]}`}
              >
                发送消息
              </button>
            </div>

            <div className={style["button-group"]}>
              <button
                onClick={sendTestMessage}
                className={`${style.btn} ${style["btn-secondary"]}`}
              >
                发送测试消息
              </button>
              <button
                onClick={sendAppFunctionCall}
                className={`${style.btn} ${style["btn-warning"]}`}
              >
                功能调用
              </button>
              <button
                onClick={clearMessages}
                className={`${style.btn} ${style["btn-danger"]}`}
              >
                清空消息
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IframeDebugPage;
