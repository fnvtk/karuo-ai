import React, { useState, useEffect } from "react";
import style from "./index.module.scss";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { Input } from "antd";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/store/module/settings";
import {
  sendMessageToParent,
  parseUrlMessage,
  Message,
  TYPE_EMUE,
} from "@/utils/postApp";
// 声明全局的 uni 对象
declare global {
  interface Window {
    uni: any;
  }
}

const IframeDebugPage: React.FC = () => {
  const { setSettings } = useSettingsStore();
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [messageId, setMessageId] = useState(0);
  const [inputMessage, setInputMessage] = useState("");
  const navigate = useNavigate();
  // 解析 URL 参数中的消息
  parseUrlMessage().then(message => {
    if (message) {
      handleReceivedMessage(message);
    }
  });

  useEffect(() => {
    parseUrlMessage();
    // 监听 SDK 初始化完成事件
  }, []);

  // 处理接收到的消息
  const handleReceivedMessage = (message: Message) => {
    const messageText = `[${new Date().toLocaleTimeString()}] 收到: ${JSON.stringify(message)}`;
    setReceivedMessages(prev => [...prev, messageText]);
    if ([TYPE_EMUE.CONFIG].includes(message.type)) {
      const { paddingTop, appId, appName, appVersion } = message.data;
      setSettings({
        paddingTop,
        appId,
        appName,
        appVersion,
        isAppMode: true,
      });
      navigate("/");
    }
  };

  // 发送自定义消息到 App
  const sendCustomMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessageId = messageId + 1;
    setMessageId(newMessageId);

    const message = {
      id: newMessageId,
      content: inputMessage,
      source: "存客宝消息源",
      timestamp: Date.now(),
    };

    sendMessageToParent(message, TYPE_EMUE.DATA);
    setInputMessage("");
  };

  // 发送测试消息到 App
  const sendTestMessage = () => {
    const newMessageId = messageId + 1;
    setMessageId(newMessageId);

    const message = {
      id: newMessageId,
      action: "ping",
      content: `存客宝测试消息 ${newMessageId}`,
      random: Math.random(),
    };

    sendMessageToParent(message, TYPE_EMUE.DATA);
  };

  // 发送App功能调用消息
  const sendAppFunctionCall = () => {
    const message = {
      action: "showToast",
      params: {
        title: "来自H5的功能调用",
        icon: "success",
      },
    };

    sendMessageToParent(message, TYPE_EMUE.FUNCTION);
  };

  // 清空消息列表
  const clearMessages = () => {
    setInputMessage("");
    setReceivedMessages([]);
  };

  return (
    <Layout header={<NavCommon title="iframe调试" />}>
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
