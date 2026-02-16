import React from "react";
import { Input, Button } from "antd";
import { CloseOutlined, ClockCircleOutlined } from "@ant-design/icons";
import styles from "./messages.module.scss";
// 导入Upload组件
import ImageUpload from "@/components/Upload/ImageUpload/ImageUpload";
import VideoUpload from "@/components/Upload/VideoUpload";
import FileUpload from "@/components/Upload/FileUpload";
import MainImgUpload from "@/components/Upload/MainImgUpload";
// 导入GroupSelection组件
import GroupSelection from "@/components/GroupSelection";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { MessageContentItem, messageTypes } from "./base.data";

interface MessageCardProps {
  message: MessageContentItem;
  dayIndex: number;
  messageIndex: number;
  planDay: number;
  onUpdateMessage: (
    dayIndex: number,
    messageIndex: number,
    updates: Partial<MessageContentItem>,
  ) => void;
  onRemoveMessage: (dayIndex: number, messageIndex: number) => void;
  onToggleIntervalUnit: (dayIndex: number, messageIndex: number) => void;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  dayIndex,
  messageIndex,
  planDay,
  onUpdateMessage,
  onRemoveMessage,
  onToggleIntervalUnit,
}) => {
  return (
    <div className={styles["messages-message-card"]}>
      <div className={styles["messages-message-header"]}>
        {/* 时间/间隔设置 */}
        <div className={styles["messages-message-header-content"]}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {planDay === 0 ? (
              <>
                <span style={{ minWidth: 36 }}>间隔</span>
                <Input
                  type="number"
                  value={String(message.sendInterval || 5)}
                  onChange={e =>
                    onUpdateMessage(dayIndex, messageIndex, {
                      sendInterval: Number(e.target.value),
                    })
                  }
                  style={{ width: 60 }}
                />
                <Button
                  size="small"
                  onClick={() => onToggleIntervalUnit(dayIndex, messageIndex)}
                >
                  <ClockCircleOutlined />
                  {message.intervalUnit === "minutes" ? "分钟" : "秒"}
                </Button>
              </>
            ) : (
              <>
                <span style={{ minWidth: 60 }}>发送时间</span>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={String(message.scheduledTime?.hour || 9)}
                  onChange={e =>
                    onUpdateMessage(dayIndex, messageIndex, {
                      scheduledTime: {
                        ...(message.scheduledTime || {
                          hour: 9,
                          minute: 0,
                          second: 0,
                        }),
                        hour: Number(e.target.value),
                      },
                    })
                  }
                  style={{ width: 40 }}
                />
                <span>:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={String(message.scheduledTime?.minute || 0)}
                  onChange={e =>
                    onUpdateMessage(dayIndex, messageIndex, {
                      scheduledTime: {
                        ...(message.scheduledTime || {
                          hour: 9,
                          minute: 0,
                          second: 0,
                        }),
                        minute: Number(e.target.value),
                      },
                    })
                  }
                  style={{ width: 40 }}
                />
                <span>:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={String(message.scheduledTime?.second || 0)}
                  onChange={e =>
                    onUpdateMessage(dayIndex, messageIndex, {
                      scheduledTime: {
                        ...(message.scheduledTime || {
                          hour: 9,
                          minute: 0,
                          second: 0,
                        }),
                        second: Number(e.target.value),
                      },
                    })
                  }
                  style={{ width: 40 }}
                />
              </>
            )}
          </div>
          <button
            className={styles["messages-message-remove-btn"]}
            onClick={() => onRemoveMessage(dayIndex, messageIndex)}
            title="删除"
          >
            <CloseOutlined />
          </button>
        </div>
        {/* 类型切换按钮 */}
        <div className={styles["messages-message-type-btns"]}>
          {messageTypes.map(type => (
            <Button
              key={type.id}
              type={message.type === type.id ? "primary" : "default"}
              onClick={() =>
                onUpdateMessage(dayIndex, messageIndex, {
                  type: type.id as any,
                })
              }
              className={styles["messages-message-type-btn"]}
            >
              <type.icon />
            </Button>
          ))}
        </div>
      </div>
      <div className={styles["messages-message-content"]}>
        {/* 文本消息 */}
        {message.type === "text" && (
          <Input.TextArea
            value={message.content}
            onChange={e =>
              onUpdateMessage(dayIndex, messageIndex, {
                content: e.target.value,
              })
            }
            placeholder="请输入消息内容"
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        )}
        {/* 小程序消息 */}
        {message.type === "miniprogram" && (
          <>
            <Input
              value={message.title}
              onChange={e =>
                onUpdateMessage(dayIndex, messageIndex, {
                  title: e.target.value,
                })
              }
              placeholder="请输入小程序标题"
              style={{ marginBottom: 8 }}
            />
            <Input
              value={message.description}
              onChange={e =>
                onUpdateMessage(dayIndex, messageIndex, {
                  description: e.target.value,
                })
              }
              placeholder="请输入小程序描述"
              style={{ marginBottom: 8 }}
            />
            <Input
              value={message.address}
              onChange={e =>
                onUpdateMessage(dayIndex, messageIndex, {
                  address: e.target.value,
                })
              }
              placeholder="请输入小程序路径"
              style={{ marginBottom: 8 }}
            />
            <div style={{ marginBottom: 8 }}>
              <MainImgUpload
                value={message.content || ""}
                onChange={url =>
                  onUpdateMessage(dayIndex, messageIndex, {
                    content: url,
                  })
                }
                maxSize={5}
                showPreview={true}
              />
            </div>
          </>
        )}
        {/* 链接消息 */}
        {message.type === "link" && (
          <>
            <Input
              value={message.title}
              onChange={e =>
                onUpdateMessage(dayIndex, messageIndex, {
                  title: e.target.value,
                })
              }
              placeholder="请输入链接标题"
              style={{ marginBottom: 8 }}
            />
            <Input
              value={message.description}
              onChange={e =>
                onUpdateMessage(dayIndex, messageIndex, {
                  description: e.target.value,
                })
              }
              placeholder="请输入链接描述"
              style={{ marginBottom: 8 }}
            />
            <Input
              value={message.linkUrl}
              onChange={e =>
                onUpdateMessage(dayIndex, messageIndex, {
                  linkUrl: e.target.value,
                })
              }
              placeholder="请输入链接地址"
              style={{ marginBottom: 8 }}
            />
            <div style={{ marginBottom: 8 }}>
              <MainImgUpload
                value={message.coverImage || ""}
                onChange={url =>
                  onUpdateMessage(dayIndex, messageIndex, {
                    coverImage: url,
                  })
                }
                maxSize={1}
                showPreview={true}
              />
            </div>
          </>
        )}
        {/* 群邀请消息 */}
        {message.type === "group" && (
          <div style={{ marginBottom: 8 }}>
            <GroupSelection
              selectedOptions={message.groupOptions || []}
              onSelect={(groups: GroupSelectionItem[]) => {
                onUpdateMessage(dayIndex, messageIndex, {
                  groupIds: groups.map(v => v.id),
                  groupOptions: groups,
                });
              }}
              placeholder="选择邀请入的群"
              showSelectedList={true}
              selectedListMaxHeight={200}
            />
          </div>
        )}
        {/* 图片消息 */}
        {message.type === "image" && (
          <div style={{ marginBottom: 8 }}>
            <ImageUpload
              value={message.content ? [message.content] : []}
              onChange={urls =>
                onUpdateMessage(dayIndex, messageIndex, {
                  content: urls[0] || "",
                })
              }
              count={1}
              accept="image/*"
            />
          </div>
        )}
        {/* 视频消息 */}
        {message.type === "video" && (
          <div style={{ marginBottom: 8 }}>
            <VideoUpload
              value={message.content || ""}
              onChange={url => {
                const videoUrl = Array.isArray(url) ? url[0] || "" : url;
                onUpdateMessage(dayIndex, messageIndex, {
                  content: videoUrl,
                });
              }}
              maxSize={50}
              maxCount={1}
              showPreview={true}
            />
          </div>
        )}
        {/* 文件消息 */}
        {message.type === "file" && (
          <div style={{ marginBottom: 8 }}>
            <FileUpload
              value={message.content || ""}
              onChange={url => {
                const fileUrl = Array.isArray(url) ? url[0] || "" : url;
                onUpdateMessage(dayIndex, messageIndex, {
                  content: fileUrl,
                });
              }}
              maxSize={10}
              maxCount={1}
              showPreview={true}
              acceptTypes={["excel", "word", "ppt"]}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCard;
