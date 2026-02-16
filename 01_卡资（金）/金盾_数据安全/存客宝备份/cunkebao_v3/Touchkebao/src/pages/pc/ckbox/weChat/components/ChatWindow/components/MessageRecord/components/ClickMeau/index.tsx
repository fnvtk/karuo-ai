import React, { useState, useEffect, useRef } from "react";
import { Menu, message } from "antd";
import {
  CopyOutlined,
  CheckSquareOutlined,
  RollbackOutlined,
  ExportOutlined,
  LinkOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { ChatRecord } from "@/pages/pc/ckbox/data";
import styles from "./ClickMenu.module.scss";

interface ClickMenuProps {
  visible: boolean;
  x: number;
  y: number;
  messageData: ChatRecord | null;
  onClose: () => void;
  onCommad: (action: string) => void;
  isOwn: boolean;
}

const ClickMenu: React.FC<ClickMenuProps> = ({
  visible,
  x,
  y,
  messageData,
  onClose,
  onCommad,
  isOwn,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (visible && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // 防止菜单超出屏幕右边界
      if (x + menuRect.width > windowWidth) {
        adjustedX = windowWidth - menuRect.width - 10;
      }

      // 防止菜单超出屏幕下边界
      if (y + menuRect.height > windowHeight) {
        adjustedY = windowHeight - menuRect.height - 10;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [visible, x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [visible, onClose]);

  if (!visible || !messageData) {
    return null;
  }

  const handleCopy = () => {
    if (messageData.content) {
      // 提取纯文本内容，去除HTML标签
      const textContent = messageData.content.replace(/<[^>]*>/g, "");
      navigator.clipboard
        .writeText(textContent)
        .then(() => {
          message.success("已复制到剪贴板");
        })
        .catch(() => {
          message.error("复制失败");
        });
    }
    onClose();
  };
  // 检查是否显示撤回功能
  const isShowRecall = (): boolean => {
    // 早期返回：非自己发送的消息不能撤回
    if (!isOwn) return false;
    // 使用 dayjs 计算时间差，1.8分钟 = 108秒
    const timeDiffInSeconds = dayjs().diff(
      dayjs(messageData.wechatTime),
      "second",
    );

    return timeDiffInSeconds <= 108;
  };
  // 检查是否为文本消息
  const isTextMessage = (): boolean => {
    return messageData.msgType === 1;
  };

  // 检查是否为音频消息
  const isAudioMessage = (): boolean => {
    return messageData.msgType === 34;
  };

  const menuItems = [
    {
      key: "transmit",
      icon: <ExportOutlined />,
      label: "转发",
    },
    // 只在文本消息时显示复制选项
    ...(isTextMessage()
      ? [
          {
            key: "copy",
            icon: <CopyOutlined />,
            label: "复制",
          },
        ]
      : []),
    // 只在音频消息时显示转文字选项
    ...(isAudioMessage()
      ? [
          {
            key: "voiceToText",
            icon: <SoundOutlined />,
            label: "转换文字",
          },
        ]
      : []),
    {
      key: "multipleForwarding",
      icon: <CheckSquareOutlined />,
      label: "多条转发",
    },
    // 只在文本消息时显示引用选项
    ...(isTextMessage()
      ? [
          {
            key: "quote",
            icon: <LinkOutlined />,
            label: "引用",
          },
        ]
      : []),
    ...(isShowRecall()
      ? [
          {
            key: "recall",
            icon: <RollbackOutlined />,
            label: "撤回",
          },
        ]
      : []),
  ];

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
      }}
    >
      <Menu
        items={menuItems.map(item => ({
          ...item,
          onClick: value => {
            if (value.key === "copy") {
              handleCopy();
            } else {
              onCommad(value.key);
              onClose();
            }
          },
        }))}
        mode="vertical"
        selectable={false}
        className={styles.menu}
      />
    </div>
  );
};

export default ClickMenu;
