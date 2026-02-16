import React, { useRef, useState, useEffect } from "react";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import {
  PictureOutlined,
  PaperClipOutlined,
  AudioOutlined,
} from "@ant-design/icons";
import styles from "./AIAssistant.module.scss";

interface Message {
  id: string;
  content: string;
  from: "user" | "ai";
  time: string;
  type?: "text" | "image" | "file" | "audio";
  fileName?: string;
  fileUrl?: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    content: "你好！我是你的AI助手，有什么可以帮助你的吗?",
    from: "ai",
    time: "15:29",
    type: "text",
  },
];

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 语音识别初始化
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "zh-CN";
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setRecognizing(false);
    };
    recognitionRef.current.onerror = () => setRecognizing(false);
    recognitionRef.current.onend = () => setRecognizing(false);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      content: input,
      from: "user",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + "-ai",
          content: "AI正在思考...（此处可接入真实API）",
          from: "ai",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "text",
        },
      ]);
      setLoading(false);
    }, 1200);
  };

  // 图片上传
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          content: url,
          from: "user",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "image",
          fileName: file.name,
          fileUrl: url,
        },
      ]);
    }
    e.target.value = "";
  };

  // 文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          content: file.name,
          from: "user",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "file",
          fileName: file.name,
          fileUrl: url,
        },
      ]);
    }
    e.target.value = "";
  };

  // 语音输入
  const handleVoiceInput = () => {
    if (!recognitionRef.current) return alert("当前浏览器不支持语音输入");
    if (recognizing) {
      recognitionRef.current.stop();
      setRecognizing(false);
    } else {
      recognitionRef.current.start();
      setRecognizing(true);
    }
  };

  return (
    <Layout header={<NavCommon title="AI助手" />} loading={false}>
      <div className={styles.chatContainer}>
        <div className={styles.messageList}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={
                msg.from === "user" ? styles.userMessage : styles.aiMessage
              }
            >
              {msg.type === "text" && (
                <div className={styles.bubble}>{msg.content}</div>
              )}
              {msg.type === "image" && (
                <div className={styles.bubble}>
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName}
                    className={styles.image}
                  />
                </div>
              )}
              {msg.type === "file" && (
                <div className={styles.bubble}>
                  <a
                    href={msg.fileUrl}
                    download={msg.fileName}
                    className={styles.fileLink}
                  >
                    <PaperClipOutlined style={{ marginRight: 6 }} />
                    {msg.fileName}
                  </a>
                </div>
              )}
              {/* 语音消息可后续扩展 */}
              <div className={styles.time}>{msg.time}</div>
            </div>
          ))}
          {loading && (
            <div className={styles.aiMessage}>
              <div className={styles.bubble}>AI正在输入...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputBar}>
          <button
            className={styles.iconBtn}
            onClick={() => imageInputRef.current?.click()}
            title="图片"
            type="button"
          >
            <PictureOutlined />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageChange}
          />
          <button
            className={styles.iconBtn}
            onClick={() => fileInputRef.current?.click()}
            title="文件"
            type="button"
          >
            <PaperClipOutlined />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className={styles.iconBtn}
            onClick={handleVoiceInput}
            title="语音输入"
            type="button"
            style={{ color: recognizing ? "#5bbcff" : undefined }}
          >
            <AudioOutlined />
          </button>
          <input
            className={styles.input}
            type="text"
            placeholder="输入消息..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={loading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AIAssistant;
