import React, { useImperativeHandle, forwardRef, useState, useRef, useEffect } from "react";
import { Form, Card, Button, Input } from "antd";
import { PlusOutlined, CloseOutlined, ClockCircleOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  MessageOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { WelcomeMessage } from "../index.data";
import ImageUpload from "@/components/Upload/ImageUpload/ImageUpload";
import VideoUpload from "@/components/Upload/VideoUpload";
import FileUpload from "@/components/Upload/FileUpload";
import styles from "./MessageConfig.module.scss";

const { TextArea } = Input;

// 富文本编辑器组件
interface RichTextEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  onInsertMention?: React.MutableRefObject<{ insertMention: () => void } | null>; // 插入@好友的ref
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "",
  maxLength = 500,
  onInsertMention,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  // 暴露插入@好友的方法
  useEffect(() => {
    if (onInsertMention && editorRef.current) {
      onInsertMention.current = {
        insertMention: () => {
          if (!editorRef.current) return;

          // 获取当前文本（包含换行符）
          const currentText = getText(editorRef.current.innerHTML);

          // 检查是否已经存在@好友，如果存在则不允许再插入
          if (currentText.includes('@{好友}')) {
            // 已经存在@好友，不允许再插入
            return;
          }

          // 先保存当前光标位置
          const saved = saveSelection();
          const mentionPlaceholder = "@{好友}";

          // 根据光标位置插入@好友
          let newContent: string;
          if (!saved) {
            // 如果没有光标位置，插入到末尾
            if (!currentText) {
              newContent = mentionPlaceholder;
            } else if (currentText.endsWith("\n") || currentText.endsWith(" ")) {
              newContent = currentText + mentionPlaceholder;
            } else {
              newContent = currentText + " " + mentionPlaceholder;
            }
          } else {
            // 在光标位置插入@好友
            const cursorPos = saved.startOffset;
            const beforeText = currentText.substring(0, cursorPos);
            const afterText = currentText.substring(cursorPos);

            // 判断光标前是否需要添加空格
            const needsSpace = beforeText.length > 0
              && !beforeText.endsWith(" ")
              && !beforeText.endsWith("\n")
              && afterText.length > 0
              && !afterText.startsWith(" ");

            if (needsSpace) {
              newContent = beforeText + " " + mentionPlaceholder + afterText;
            } else {
              newContent = beforeText + mentionPlaceholder + afterText;
            }
          }

          // 直接更新编辑器内容
          const formatted = formatContent(newContent);
          editorRef.current.innerHTML = formatted;

          // 恢复光标位置到插入的@好友后面
          // 使用双重 requestAnimationFrame 确保 DOM 完全更新
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (editorRef.current) {
                const selection = window.getSelection();
                if (!selection) return;

                // 计算新插入的@好友在文本中的位置
                let newCursorPos: number;
                if (!saved) {
                  // 如果没有保存的光标位置，放在末尾
                  newCursorPos = newContent.length;
                } else {
                  // 计算插入@好友后的光标位置
                  const cursorPos = saved.startOffset;
                  const beforeText = currentText.substring(0, cursorPos);
                  const needsSpace = beforeText.length > 0
                    && !beforeText.endsWith(" ")
                    && !beforeText.endsWith("\n")
                    && currentText.substring(cursorPos).length > 0
                    && !currentText.substring(cursorPos).startsWith(" ");

                  // @好友的位置 = 原光标位置 + (如果需要空格则+1)
                  const mentionPos = cursorPos + (needsSpace ? 1 : 0);
                  // 光标位置 = @好友位置 + @好友长度
                  newCursorPos = mentionPos + mentionPlaceholder.length;
                }

                // 使用文本位置恢复光标
                restoreSelection({ startOffset: newCursorPos, endOffset: newCursorPos });

                // 确保编辑器获得焦点
                editorRef.current.focus();
              }
            });
          });

          // 更新value
          onChange(newContent);
        }
      };
    }
  }, [onInsertMention, onChange]);

  // 格式化内容，只将系统插入的@{好友}高亮，手动输入的@好友不高亮
  const formatContent = (text: string) => {
    if (!text) return "";
    // 先转义HTML，但保留@{好友}格式用于替换
    // 将@{好友}替换为特殊标记，避免被转义
    const parts = text.split(/(@\{好友\})/g);
    return parts.map((part, index) => {
      if (part === '@{好友}') {
        // 在span后面添加零宽空格，确保可以继续输入
        return '<span class="mention-friend">@好友</span>\u200B';
      }
      // 转义其他部分，保留换行符
      return part
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>"); // 保留换行符
    }).join('');
  };

  // 提取纯文本（将高亮的@好友还原为@{好友}格式）
  const getText = (html: string) => {
    // 先处理HTML中的mention-friend元素
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // 将所有的mention-friend元素替换为@{好友}格式
    const mentions = tempDiv.querySelectorAll('.mention-friend');
    mentions.forEach((mention) => {
      const replacement = document.createTextNode('@{好友}');
      mention.parentNode?.replaceChild(replacement, mention);
    });

    // 将块级元素转换为换行符：在块级元素前后添加换行
    const blockElements = Array.from(tempDiv.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6'));
    blockElements.forEach((block) => {
      // 在块级元素前添加换行符
      if (block.previousSibling) {
        const textNode = document.createTextNode('\n');
        block.parentNode?.insertBefore(textNode, block);
      }
      // 在块级元素后添加换行符
      if (block.nextSibling) {
        const textNode = document.createTextNode('\n');
        block.parentNode?.insertBefore(textNode, block.nextSibling);
      }
    });

    // 手动遍历所有节点，提取文本和<br>标签
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    const textParts: string[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
          textParts.push(text);
        }
      } else if (node.nodeName === 'BR') {
        textParts.push('\n');
      }
    }

    // 如果没有找到任何内容，使用 textContent 作为后备
    let text = textParts.length > 0
      ? textParts.join('')
      : (tempDiv.textContent || "");

    // 移除零宽空格
    text = text.replace(/\u200B/g, '');

    return text;
  };

  // 保存和恢复光标位置
  const saveSelection = () => {
    if (!editorRef.current) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    // 检查range是否在editor内部
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return null;
    }

    // 获取当前文本内容（包含换行符）
    const currentText = getText(editorRef.current.innerHTML);

    // 创建一个临时范围来计算光标前的文本长度
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    // 使用getText函数获取文本（包含换行符），然后计算长度
    // 创建一个临时div来保存当前HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorRef.current.innerHTML;

    // 克隆光标前的内容
    const clonedRange = preCaretRange.cloneContents();
    const beforeDiv = document.createElement('div');
    beforeDiv.appendChild(clonedRange);

    // 获取光标前的文本（包含换行符）
    // 需要处理.mention-friend元素，将其转换为@{好友}
    const beforeText = getText(beforeDiv.innerHTML);
    const startOffset = beforeText.length;

    return {
      startOffset,
      endOffset: startOffset + (range.toString().length),
      currentText, // 保存当前文本，用于后续计算
    };
  };

  const restoreSelection = (saved: { startOffset: number; endOffset: number } | null) => {
    if (!saved || !editorRef.current) return;

    try {
      const selection = window.getSelection();
      if (!selection) return;

      // 获取当前文本内容（包含换行符）
      const currentText = getText(editorRef.current.innerHTML);
      const targetOffset = Math.min(saved.startOffset, currentText.length);

      const range = document.createRange();
      let charCount = 0;
      let found = false;

      // 遍历所有节点，包括文本节点、<br>元素和.mention-friend元素
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null
      );

      let node: Node | null;
      while ((node = walker.nextNode()) && !found) {
        if (node.nodeType === Node.TEXT_NODE) {
          // 跳过零宽空格
          const text = node.textContent || '';
          const nodeLength = text.replace(/\u200B/g, '').length;
          if (charCount + nodeLength >= targetOffset) {
            const offset = targetOffset - charCount;
            // 计算实际偏移量（考虑零宽空格）
            let actualOffset = 0;
            let charIndex = 0;
            for (let i = 0; i < text.length; i++) {
              if (text[i] !== '\u200B') {
                if (charIndex >= offset) break;
                charIndex++;
              }
              actualOffset++;
            }
            range.setStart(node, Math.max(0, Math.min(actualOffset, text.length)));
            range.setEnd(node, Math.max(0, Math.min(actualOffset, text.length)));
            found = true;
          }
          charCount += nodeLength;
        } else if (node.nodeName === 'BR') {
          if (charCount >= targetOffset) {
            // 光标应该在<br>之前
            range.setStartBefore(node);
            range.setEndBefore(node);
            found = true;
          } else if (charCount + 1 >= targetOffset) {
            // 光标应该在<br>之后
            range.setStartAfter(node);
            range.setEndAfter(node);
            found = true;
          }
          charCount += 1;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // 处理.mention-friend元素，它代表@{好友}，长度为4
          const element = node as Element;
          if (element.classList.contains('mention-friend')) {
            const mentionLength = 4; // @{好友}的长度
            if (charCount + mentionLength >= targetOffset) {
              // 光标应该在mention-friend之后（零宽空格后面）
              // 查找或创建零宽空格
              let zwspNode: Node | null = null;
              const nextSibling = node.nextSibling;

              if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent === '\u200B') {
                zwspNode = nextSibling;
              } else {
                // 如果没有零宽空格，创建一个
                zwspNode = document.createTextNode('\u200B');
                node.parentNode?.insertBefore(zwspNode, nextSibling);
              }

              // 将光标放在零宽空格后面
              if (zwspNode) {
                range.setStartAfter(zwspNode);
                range.setEndAfter(zwspNode);
              } else {
                range.setStartAfter(node);
                range.setEndAfter(node);
              }
              found = true;
            }
            charCount += mentionLength;
          }
        }
      }

      if (found) {
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // 如果没找到，放在末尾
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (err) {
      // 如果恢复失败，将光标放在末尾
      try {
        const selection = window.getSelection();
        if (selection && editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (e) {
        // 忽略错误
      }
    }
  };

  // 更新内容（只在外部value变化时更新，不干扰用户输入）
  useEffect(() => {
    if (!editorRef.current || isComposingRef.current) return;
    const currentText = getText(editorRef.current.innerHTML);
    // 只在外部value变化且与当前内容不同时更新
    if (currentText !== value) {
      const saved = saveSelection();
      const formatted = formatContent(value) || "";
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
        // 延迟恢复光标，确保DOM已更新
        setTimeout(() => {
          restoreSelection(saved);
        }, 0);
      }
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (isComposingRef.current) return;

    const text = getText(e.currentTarget.innerHTML);
    if (text.length <= maxLength) {
      // 先更新文本内容
      onChange(text);

      // 不在输入时立即格式化，只在失去焦点时格式化
      // 这样可以避免干扰用户输入
    } else {
      // 超出长度，恢复之前的内容
      const saved = saveSelection();
      e.currentTarget.innerHTML = formatContent(value);
      requestAnimationFrame(() => {
        restoreSelection(saved);
      });
    }
  };

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          handleInput(e);
        }}
        onBlur={(e) => {
          const text = getText(e.currentTarget.innerHTML);
          onChange(text);
          // 失去焦点时格式化，确保@好友高亮显示
          if (text.includes('@{好友}')) {
            const formatted = formatContent(text);
            if (e.currentTarget.innerHTML !== formatted) {
              e.currentTarget.innerHTML = formatted;
            }
          }
        }}
        data-placeholder={placeholder}
        style={{
          minHeight: "80px",
          maxHeight: "200px",
          padding: "8px 12px",
          border: "1px solid #d9d9d9",
          borderRadius: "6px",
          fontSize: "14px",
          lineHeight: "1.5",
          outline: "none",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          backgroundColor: "#fff",
        }}
        className={styles.richTextInput}
      />
      <div style={{
        position: "absolute",
        bottom: 8,
        right: 12,
        fontSize: 12,
        color: "#999",
        pointerEvents: "none",
        background: "rgba(255, 255, 255, 0.8)",
        padding: "0 4px"
      }}>
        {value.length}/{maxLength}
      </div>
    </>
  );
};

// 消息类型配置
const messageTypes = [
  { id: "text", icon: MessageOutlined, label: "文本" },
  { id: "image", icon: PictureOutlined, label: "图片" },
  { id: "video", icon: VideoCameraOutlined, label: "视频" },
  { id: "file", icon: FileOutlined, label: "文件" },
];

interface MessageConfigProps {
  defaultMessages?: WelcomeMessage[];
  onPrevious: () => void;
  onNext: (data: { messages: WelcomeMessage[] }) => void;
}

export interface MessageConfigRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const MessageConfig = forwardRef<MessageConfigRef, MessageConfigProps>(
  ({ defaultMessages = [], onNext }, ref) => {
    const [form] = Form.useForm();
    const [messages, setMessages] = useState<WelcomeMessage[]>(
      defaultMessages.length > 0
        ? defaultMessages
        : [
            {
              id: Date.now().toString(),
              type: "text",
              content: "",
              order: 1,
              sendInterval: 5,
              intervalUnit: "seconds",
            },
          ],
    );

    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          // 验证至少有一条消息
          if (messages.length === 0) {
            form.setFields([
              {
                name: "messages",
                errors: ["请至少配置一条欢迎消息"],
              },
            ]);
            return false;
          }

          // 验证每条消息都有内容
          for (const msg of messages) {
            if (!msg.content) {
              form.setFields([
                {
                  name: "messages",
                  errors: ["请填写所有消息的内容，消息内容不能为空"],
                },
              ]);
              return false;
            }
            // 移除@{好友}格式标记和空白字符后检查是否有实际内容
            const contentWithoutMention = msg.content
              .replace(/@\{好友\}/g, "")
              .replace(/\s+/g, " ")
              .trim();
            if (contentWithoutMention === "") {
              form.setFields([
                {
                  name: "messages",
                  errors: ["请填写所有消息的内容，消息内容不能为空"],
                },
              ]);
              return false;
            }
          }

          form.setFieldsValue({ messages });
          await form.validateFields(["messages"]);
          return true;
        } catch (error) {
          console.log("MessageConfig 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return { messages };
      },
    }));

    // 添加消息
    const handleAddMessage = (type: WelcomeMessage["type"] = "text") => {
      const newMessage: WelcomeMessage = {
        id: Date.now().toString(),
        type,
        content: "",
        order: messages.length + 1,
        sendInterval: 5,
        intervalUnit: "seconds",
      };
      setMessages([...messages, newMessage]);
    };

    // 删除消息
    const handleRemoveMessage = (id: string) => {
      const newMessages = messages
        .filter(msg => msg.id !== id)
        .map((msg, index) => ({ ...msg, order: index + 1 }));
      setMessages(newMessages);
    };

    // 更新消息
    const handleUpdateMessage = (id: string, updates: Partial<WelcomeMessage>) => {
      setMessages(
        messages.map(msg => (msg.id === id ? { ...msg, ...updates } : msg)),
      );
    };

    // 切换时间单位
    const toggleIntervalUnit = (id: string) => {
      const message = messages.find(msg => msg.id === id);
      if (!message) return;
      const newUnit = message.intervalUnit === "minutes" ? "seconds" : "minutes";
      handleUpdateMessage(id, { intervalUnit: newUnit });
    };

    // 存储每个消息的编辑器ref
    const editorRefs = useRef<Record<string, React.MutableRefObject<{ insertMention: () => void } | null>>>({});

    // 插入@好友占位符（使用特殊格式，只有系统插入的才会高亮）
    const handleInsertFriendMention = (messageId: string) => {
      const editorRef = editorRefs.current[messageId];
      if (editorRef?.current) {
        editorRef.current.insertMention();
      }
    };

    // 将纯文本转换为带样式的HTML（用于富文本显示）
    const formatContentWithMentions = (content: string) => {
      if (!content) return "";
      // 转义HTML特殊字符
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      // 只将@{好友}格式替换为带样式的span，手动输入的@好友不会被高亮
      return escaped.replace(
        /@\{好友\}/g,
        '<span class="mention-friend">@好友</span>'
      );
    };

    // 从富文本中提取纯文本
    const extractTextFromHtml = (html: string) => {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    };

    return (
      <Card>
        <Form form={form} layout="vertical">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              配置欢迎消息
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              配置多条欢迎消息，新成员入群时将按顺序发送
            </p>
          </div>

          <Form.Item
            name="messages"
            rules={[
              {
                required: true,
                validator: () => {
                  if (messages.length === 0) {
                    return Promise.reject("请至少配置一条欢迎消息");
                  }
                  const hasEmptyContent = messages.some((msg) => {
                    if (!msg.content) return true;
                    // 移除@{好友}格式标记和空白字符后检查是否有实际内容
                    const contentWithoutMention = msg.content
                      .replace(/@\{好友\}/g, "")
                      .replace(/\s+/g, " ")
                      .trim();
                    return contentWithoutMention === "";
                  });
                  if (hasEmptyContent) {
                    return Promise.reject("请填写所有消息的内容，消息内容不能为空");
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <div className={styles.messageList}>
              {messages.map((message, index) => (
                <div key={message.id} className={styles.messageCard}>
                  <div className={styles.messageHeader}>
                    {/* 时间间隔设置 */}
                    <div className={styles.messageHeaderContent}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ minWidth: 36 }}>间隔</span>
                        <Input
                          type="number"
                          value={String(message.sendInterval || 5)}
                          onChange={e =>
                            handleUpdateMessage(message.id, {
                              sendInterval: Number(e.target.value),
                            })
                          }
                          style={{ width: 60 }}
                          min={1}
                        />
                        <Button
                          size="small"
                          onClick={() => toggleIntervalUnit(message.id)}
                        >
                          <ClockCircleOutlined />
                          {message.intervalUnit === "minutes" ? "分钟" : "秒"}
                        </Button>
                      </div>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveMessage(message.id)}
                        title="删除"
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                    {/* 类型切换按钮 */}
                    <div className={styles.messageTypeBtns}>
                      {messageTypes.map(type => (
                        <Button
                          key={type.id}
                          type={message.type === type.id ? "primary" : "default"}
                          onClick={() =>
                            handleUpdateMessage(message.id, {
                              type: type.id as any,
                              content: "", // 切换类型时清空内容
                            })
                          }
                          className={styles.messageTypeBtn}
                          title={type.label}
                        >
                          <type.icon />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.messageContent}>
                    {/* 文本消息 */}
                    {message.type === "text" && (
                      <div>
                        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, color: "#666" }}>消息内容</span>
                          <Button
                            type="link"
                            size="small"
                            icon={<UserAddOutlined />}
                            onClick={() => handleInsertFriendMention(message.id)}
                            disabled={message.content?.includes('@{好友}')}
                            style={{ padding: 0, height: "auto", color: message.content?.includes('@{好友}') ? "#ccc" : "#1677ff" }}
                          >
                            @好友
                          </Button>
                        </div>
                        <div style={{ position: "relative" }}>
                          {/* 富文本输入框 */}
                          <RichTextEditor
                            value={message.content || ""}
                            onChange={(text) => {
                              if (text.length <= 500) {
                                handleUpdateMessage(message.id, {
                                  content: text,
                                });
                              }
                            }}
                            placeholder="请输入欢迎消息内容，点击@好友按钮可插入@好友占位符"
                            maxLength={500}
                            onInsertMention={(() => {
                              if (!editorRefs.current[message.id]) {
                                editorRefs.current[message.id] = React.createRef();
                              }
                              return editorRefs.current[message.id];
                            })()}
                          />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
                          提示：@好友为占位符，系统会根据实际情况自动@相应好友
                        </div>
                      </div>
                    )}

                    {/* 图片消息 */}
                    {message.type === "image" && (
                      <ImageUpload
                        value={message.content ? [message.content] : []}
                        onChange={(urls) =>
                          handleUpdateMessage(message.id, {
                            content: urls && urls.length > 0 ? urls[0] : "",
                          })
                        }
                        count={1}
                        accept="image/*"
                      />
                    )}

                    {/* 视频消息 */}
                    {message.type === "video" && (
                      <VideoUpload
                        value={message.content || ""}
                        onChange={(url) =>
                          handleUpdateMessage(message.id, {
                            content: typeof url === "string" ? url : (Array.isArray(url) && url.length > 0 ? url[0] : ""),
                          })
                        }
                        maxSize={50}
                        maxCount={1}
                        showPreview={true}
                      />
                    )}

                    {/* 文件消息 */}
                    {message.type === "file" && (
                      <FileUpload
                        value={message.content || ""}
                        onChange={(url) =>
                          handleUpdateMessage(message.id, {
                            content: typeof url === "string" ? url : (Array.isArray(url) && url.length > 0 ? url[0] : ""),
                          })
                        }
                        maxSize={10}
                        maxCount={1}
                        showPreview={true}
                        acceptTypes={["excel", "word", "ppt"]}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Form.Item>

          <div className={styles.addMessageButtons}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddMessage("text")}
              className={styles.addMessageBtn}
            >
              添加文本消息
            </Button>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddMessage("image")}
              className={styles.addMessageBtn}
            >
              添加图片消息
            </Button>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddMessage("video")}
              className={styles.addMessageBtn}
            >
              添加视频消息
            </Button>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddMessage("file")}
              className={styles.addMessageBtn}
            >
              添加文件消息
            </Button>
          </div>
        </Form>
      </Card>
    );
  },
);

MessageConfig.displayName = "MessageConfig";

export default MessageConfig;
