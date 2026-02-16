import React, { useCallback, useEffect, useState } from "react";
import { Button, Input, message as antdMessage } from "antd";
import { FolderOutlined, PictureOutlined } from "@ant-design/icons";

import { EmojiPicker } from "@/components/EmojiSeclection";
import { EmojiInfo } from "@/components/EmojiSeclection/wechatEmoji";
import SimpleFileUpload from "@/components/Upload/SimpleFileUpload";
import AudioRecorder from "@/components/Upload/AudioRecorder";
import type { MessageItem } from "../../../types";

import styles from "./index.module.scss";

const { TextArea } = Input;

type FileTypeValue = 1 | 2 | 3 | 4 | 5;

interface InputMessageProps {
  defaultValue?: string;
  onContentChange?: (value: string) => void;
  onSend?: (value: string) => void;
  onAddMessage?: (message: MessageItem) => void; // 新增：支持添加非文本消息
  clearOnSend?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
}

const FileType: Record<string, FileTypeValue> = {
  TEXT: 1,
  IMAGE: 2,
  VIDEO: 3,
  AUDIO: 4,
  FILE: 5,
};

const getMsgTypeByFileFormat = (filePath: string): number => {
  const extension = filePath.toLowerCase().split(".").pop() || "";
  const imageFormats = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
  ];
  if (imageFormats.includes(extension)) {
    return 3;
  }

  const videoFormats = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "mkv",
    "webm",
    "3gp",
    "rmvb",
  ];
  if (videoFormats.includes(extension)) {
    return 43;
  }

  return 49;
};

const InputMessage: React.FC<InputMessageProps> = ({
  defaultValue = "",
  onContentChange,
  onSend,
  onAddMessage,
  clearOnSend = false,
  placeholder = "输入消息...",
  hint,
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (defaultValue !== inputValue) {
      setInputValue(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  useEffect(() => {
    onContentChange?.(inputValue);
  }, [inputValue, onContentChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content) {
      return;
    }
    onSend?.(content);
    if (clearOnSend) {
      setInputValue("");
    }
    antdMessage.success("已添加消息内容");
  }, [clearOnSend, inputValue, onSend]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const target = e.currentTarget;
        const { selectionStart, selectionEnd, value } = target;
        const nextValue =
          value.slice(0, selectionStart) + "\n" + value.slice(selectionEnd);
        setInputValue(nextValue);
        requestAnimationFrame(() => {
          const cursorPosition = selectionStart + 1;
          target.selectionStart = cursorPosition;
          target.selectionEnd = cursorPosition;
        });
        return;
      }

      if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleEmojiSelect = useCallback((emoji: EmojiInfo) => {
    setInputValue(prev => prev + `[${emoji.name}]`);
  }, []);

  const handleFileUploaded = useCallback(
    (
      filePath: { url: string; name: string; durationMs?: number },
      fileType: FileTypeValue,
    ) => {
      let msgType = 1;
      let content: string | Record<string, unknown> = filePath.url;
      if ([FileType.TEXT].includes(fileType)) {
        msgType = getMsgTypeByFileFormat(filePath.url);
      } else if ([FileType.IMAGE].includes(fileType)) {
        msgType = 3;
      } else if ([FileType.AUDIO].includes(fileType)) {
        msgType = 34;
        content = JSON.stringify({
          url: filePath.url,
          durationMs: filePath.durationMs,
        });
      } else if ([FileType.FILE].includes(fileType)) {
        msgType = getMsgTypeByFileFormat(filePath.url);
        if (msgType === 49) {
          content = JSON.stringify({
            type: "file",
            title: filePath.name,
            url: filePath.url,
          });
        }
      }

      console.log("模拟上传内容: ", {
        msgType,
        content,
      });

      // 如果提供了 onAddMessage 回调，则添加到消息列表
      if (onAddMessage) {
        let messageItem: MessageItem;
        if ([FileType.IMAGE].includes(fileType)) {
          messageItem = {
            type: "image",
            content: filePath.url,
            fileName: filePath.name,
          };
        } else if ([FileType.AUDIO].includes(fileType)) {
          messageItem = {
            type: "audio",
            content: filePath.url,
            fileName: filePath.name,
            durationMs: filePath.durationMs,
          };
        } else if ([FileType.FILE].includes(fileType)) {
          messageItem = {
            type: "file",
            content: filePath.url,
            fileName: filePath.name,
          };
        } else {
          // 默认作为文本处理
          messageItem = {
            type: "text",
            content: filePath.url,
            fileName: filePath.name,
          };
        }
        onAddMessage(messageItem);
        antdMessage.success("已添加消息内容");
      } else {
        antdMessage.success("附件上传成功，可在推送时使用");
      }
    },
    [onAddMessage],
  );

  const handleAudioUploaded = useCallback(
    (audioData: { name: string; url: string; durationMs?: number }) => {
      handleFileUploaded(
        {
          name: audioData.name,
          url: audioData.url,
          durationMs: audioData.durationMs,
        },
        FileType.AUDIO,
      );
    },
    [handleFileUploaded],
  );

  return (
    <div className={styles.chatFooter}>
      <div className={styles.inputContainer}>
        <div className={styles.inputToolbar}>
          <div className={styles.leftTool}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />

            <SimpleFileUpload
              onFileUploaded={fileInfo =>
                handleFileUploaded(fileInfo, FileType.IMAGE)
              }
              maxSize={10}
              type={1}
              slot={
                <Button
                  className={styles.toolbarButton}
                  type="text"
                  icon={<PictureOutlined />}
                />
              }
            />
            <SimpleFileUpload
              onFileUploaded={fileInfo =>
                handleFileUploaded(fileInfo, FileType.FILE)
              }
              maxSize={20}
              type={4}
              slot={
                <Button
                  className={styles.toolbarButton}
                  type="text"
                  icon={<FolderOutlined />}
                />
              }
            />
            <AudioRecorder
              onAudioUploaded={handleAudioUploaded}
              className={styles.toolbarButton}
            />
          </div>
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <TextArea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className={styles.messageInput}
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
          {hint && <div className={styles.inputHint}>{hint}</div>}
        </div>
      </div>
    </div>
  );
};

export default InputMessage;
