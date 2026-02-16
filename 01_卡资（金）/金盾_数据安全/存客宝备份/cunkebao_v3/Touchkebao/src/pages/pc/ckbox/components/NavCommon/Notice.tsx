import React, { useEffect, useState } from "react";
import { Drawer, Avatar, Space, Button, Badge, Empty, Tabs, Tag } from "antd";
import { BellOutlined } from "@ant-design/icons";
import {
  noticeList,
  readMessage,
  readAll,
  friendRequestList as fetchFriendRequestListApi,
} from "./api";
import styles from "./index.module.scss";

interface MessageItem {
  id: number;
  type: number;
  companyId: number;
  userId: number;
  bindId: number;
  title: string;
  message: string;
  isRead: number;
  createTime: string;
  readTime: string;
  friendData: {
    nickname: string;
    avatar: string;
  };
}

interface FriendRequestItem {
  taskId: number;
  phone: string;
  wechatId: string;
  adder?: {
    avatar?: string;
    nickname?: string;
    username?: string;
    accountNickname?: string;
    accountRealName?: string;
  };
  status?: {
    code?: number;
    text?: string;
  };
  time?: {
    addTime?: string;
    addTimeStamp?: number;
    updateTime?: string;
    updateTimeStamp?: number;
    passTime?: string;
    passTimeStamp?: number;
  };
  friend?: {
    nickname?: string;
    isPassed?: boolean;
  };
  other?: {
    msgContent?: string;
    remark?: string;
    from?: string;
    labels?: string[];
  };
}

const DEFAULT_QUERY = { page: 1, limit: 20 };

const Notice: React.FC = () => {
  const [messageDrawerVisible, setMessageDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const [messageList, setMessageList] = useState<MessageItem[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [friendRequestList, setFriendRequestList] = useState<
    FriendRequestItem[]
  >([]);
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);

  const fetchMessageList = async () => {
    try {
      setLoading(true);
      const response = await noticeList(DEFAULT_QUERY);
      if (response?.list) {
        setMessageList(response.list);
        const unreadCount = response.list.filter(
          (item: MessageItem) => item.isRead === 0,
        ).length;
        setMessageCount(unreadCount);
      }
    } catch (error) {
      console.error("获取消息列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const response = await noticeList(DEFAULT_QUERY);
      if (response && typeof response.noRead === "number") {
        setMessageCount(response.noRead);
      }
    } catch (error) {
      console.error("获取未读消息数失败:", error);
    }
  };

  useEffect(() => {
    fetchMessageList();
    const timer = window.setInterval(refreshUnreadCount, 30 * 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleMessageClick = () => {
    setMessageDrawerVisible(true);
    fetchMessageList();
    fetchFriendRequestList();
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === "friendRequests") {
      fetchFriendRequestList();
    }
  };

  const handleMessageDrawerClose = () => {
    setMessageDrawerVisible(false);
  };

  const handleReadMessage = async (messageId: number) => {
    try {
      await readMessage({ id: messageId });
      setMessageList(prev => {
        const updated = prev.map(item =>
          item.id === messageId ? { ...item, isRead: 1 } : item,
        );
        const unreadCount = updated.filter(item => item.isRead === 0).length;
        setMessageCount(unreadCount);
        return updated;
      });
    } catch (error) {
      console.error("标记消息已读失败:", error);
    }
  };

  const handleReadAll = async () => {
    try {
      await readAll();
      setMessageList(prev => prev.map(item => ({ ...item, isRead: 1 })));
      setMessageCount(0);
    } catch (error) {
      console.error("全部已读失败:", error);
    }
  };

  const fetchFriendRequestList = async () => {
    try {
      setFriendRequestLoading(true);
      const response = await fetchFriendRequestListApi(DEFAULT_QUERY);
      if (response?.list) {
        setFriendRequestList(response.list);
      }
    } catch (error) {
      console.error("获取好友添加记录失败:", error);
    } finally {
      setFriendRequestLoading(false);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) {
      return "-";
    }
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      });
    }
  };

  const getStatusText = (statusCode?: number, statusText?: string) => {
    if (statusText) {
      return statusText;
    }
    switch (statusCode) {
      case 0:
        return "待处理";
      case 1:
        return "已同意";
      case 2:
        return "已拒绝";
      default:
        return "未知";
    }
  };

  const getStatusColor = (statusCode?: number) => {
    switch (statusCode) {
      case 0:
        return "#1890ff";
      case 1:
        return "#52c41a";
      case 2:
        return "#ff4d4f";
      default:
        return "#999";
    }
  };

  const getFriendRequestKey = (item: FriendRequestItem) => {
    return (
      item.taskId?.toString() ||
      item.wechatId ||
      item.phone ||
      `${item.adder?.username || "unknown"}-${item.time?.addTime || "time"}`
    );
  };

  const getAddedUserName = (item: FriendRequestItem) => {
    return (
      item.friend?.nickname ||
      item.phone ||
      item.wechatId ||
      item.adder?.nickname ||
      "未知好友"
    );
  };

  const getAdderName = (item: FriendRequestItem) => {
    return (
      item.adder?.nickname ||
      item.adder?.username ||
      item.adder?.accountNickname ||
      item.adder?.accountRealName ||
      "未知添加人"
    );
  };

  return (
    <>
      <div className={styles.messageButton} onClick={handleMessageClick}>
        <Badge count={messageCount} size="small">
          <BellOutlined style={{ fontSize: 20 }} />
        </Badge>
      </div>

      <Drawer
        title="通知中心"
        placement="right"
        onClose={handleMessageDrawerClose}
        open={messageDrawerVisible}
        width={400}
        className={styles.messageDrawer}
        extra={
          activeTab === "messages" && (
            <Space>
              <Button type="text" size="small" onClick={handleReadAll}>
                全部已读
              </Button>
            </Space>
          )
        }
      >
        <div style={{ padding: "0 20px" }}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={[
              {
                key: "messages",
                label: "消息列表",
                children: (
                  <div className={styles.messageContent}>
                    {loading ? (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        加载中...
                      </div>
                    ) : messageList.length === 0 ? (
                      <Empty description="暂无消息" />
                    ) : (
                      messageList.map(item => (
                        <div
                          key={item.id}
                          className={`${styles.messageItem} ${
                            item.isRead === 0 ? styles.unread : ""
                          }`}
                          onClick={() => handleReadMessage(item.id)}
                        >
                          <div className={styles.messageAvatar}>
                            <Avatar
                              size={40}
                              src={item.friendData?.avatar}
                              style={{ backgroundColor: "#87d068" }}
                            >
                              {item.friendData?.nickname?.charAt(0) || "U"}
                            </Avatar>
                          </div>
                          <div className={styles.messageInfo}>
                            <div className={styles.messageTitle}>
                              <span className={styles.messageType}>
                                {item.title}
                              </span>
                              {item.isRead === 0 && (
                                <div className={styles.messageStatus}></div>
                              )}
                            </div>
                            <div className={styles.messageText}>
                              {item.message}
                            </div>
                            {item.isRead === 0 && (
                              <div className={styles.messageTime}>
                                {formatTime(item.createTime)}
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={event => {
                                    event.stopPropagation();
                                    handleReadMessage(item.id);
                                  }}
                                >
                                  标记已读
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: "friendRequests",
                label: "好友添加记录",
                children: (
                  <div className={styles.messageContent}>
                    {friendRequestLoading ? (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        加载中...
                      </div>
                    ) : friendRequestList.length === 0 ? (
                      <Empty description="暂无好友添加记录" />
                    ) : (
                      friendRequestList.map(item => (
                        <div
                          key={getFriendRequestKey(item)}
                          className={styles.messageItem}
                        >
                          <div className={styles.messageAvatar}>
                            <Avatar
                              size={40}
                              src={item.adder?.avatar}
                              style={{ backgroundColor: "#87d068" }}
                            >
                              {item.adder?.nickname?.charAt(0) || "U"}
                            </Avatar>
                          </div>
                          <div className={styles.messageInfo}>
                            <div className={styles.messageTitle}>
                              <span className={styles.messageType}>
                                添加好友：
                                <Tag color="blue">{getAddedUserName(item)}</Tag>
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: getStatusColor(item.status?.code),
                                  fontWeight: 500,
                                }}
                              >
                                {getStatusText(
                                  item.status?.code,
                                  item.status?.text,
                                )}
                              </span>
                            </div>
                            <div
                              className={styles.messageText}
                              style={{ color: "#595959" }}
                            >
                              申请人：{getAdderName(item)}
                            </div>
                            <div className={styles.messageText}>
                              验证信息：{item.other?.msgContent || "无"}
                            </div>

                            <div
                              className={styles.messageText}
                              style={{ color: "#999", fontSize: 12 }}
                            >
                              {item.other?.remark && (
                                <Tag color="orange" style={{ marginTop: 4 }}>
                                  备注：{item.other.remark}
                                </Tag>
                              )}
                            </div>
                            <div className={styles.messageTime}>
                              {formatTime(item.time?.addTime)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Drawer>
    </>
  );
};

export default Notice;
