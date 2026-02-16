import React, { useState } from "react";
import { Input, Button, Tabs, Tag, Avatar, Card } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  MessageOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  MailOutlined,
  EyeOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import PowerNavigation from "@/components/PowerNavtion";
import styles from "./index.module.scss";

const { Search } = Input;

interface CommunicationRecord {
  id: string;
  avatar: string;
  name: string;
  type: "chat" | "call" | "video" | "email";
  status: "completed" | "pending" | "cancelled";
  dateTime: string;
  duration?: string;
  direction: "incoming" | "outgoing";
  subject?: string;
  content: string;
  tags: string[];
  attachments?: Array<{
    name: string;
    type: "pdf" | "xlsx" | "doc" | "other";
  }>;
}

const CommunicationRecord: React.FC = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [searchValue, setSearchValue] = useState("");

  // 模拟数据
  const mockData: CommunicationRecord[] = [
    {
      id: "1",
      avatar: "李",
      name: "李先生",
      type: "chat",
      status: "completed",
      dateTime: "2024/3/5 14:30:00",
      direction: "incoming",
      content: "咨询AI营销产品的详细功能和价格",
      tags: ["产品咨询", "价格询问"],
    },
    {
      id: "2",
      avatar: "张",
      name: "张总",
      type: "call",
      status: "completed",
      dateTime: "2024/3/5 10:15:00",
      duration: "25分钟",
      direction: "outgoing",
      subject: "产品演示预约",
      content: "与客户确认产品演示时间,讨论具体需求",
      tags: ["产品演示", "需求确认"],
    },
    {
      id: "3",
      avatar: "王",
      name: "王女士",
      type: "video",
      status: "completed",
      dateTime: "2024/3/4 16:45:00",
      duration: "45分钟",
      direction: "incoming",
      subject: "产品功能演示",
      content: "详细演示AI客服功能,客户表示很满意",
      tags: ["产品演示", "功能介绍"],
      attachments: [
        { name: "产品介绍.pdf", type: "pdf" },
        { name: "报价单.xlsx", type: "xlsx" },
      ],
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "chat":
        return <MessageOutlined />;
      case "call":
        return <PhoneOutlined />;
      case "video":
        return <VideoCameraOutlined />;
      case "email":
        return <MailOutlined />;
      default:
        return <MessageOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "processing";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === "incoming" ? "green" : "blue";
  };

  const getDirectionText = (direction: string) => {
    return direction === "incoming" ? "来电/来信" : "去电/去信";
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "pending":
        return "进行中";
      case "cancelled":
        return "已取消";
      default:
        return "未知";
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return "📄";
      case "xlsx":
        return "📊";
      case "doc":
        return "📝";
      default:
        return "📎";
    }
  };

  const filteredData = mockData.filter(
    record =>
      record.type === activeTab &&
      (searchValue === "" ||
        record.name.includes(searchValue) ||
        record.content.includes(searchValue) ||
        record.tags.some(tag => tag.includes(searchValue))),
  );

  const tabItems = [
    {
      key: "chat",
      label: (
        <span>
          <MessageOutlined />
          聊天(1)
        </span>
      ),
    },
    {
      key: "call",
      label: (
        <span>
          <PhoneOutlined />
          通话(2)
        </span>
      ),
    },
    {
      key: "video",
      label: (
        <span>
          <VideoCameraOutlined />
          视频(1)
        </span>
      ),
    },
    {
      key: "email",
      label: (
        <span>
          <MailOutlined />
          邮件(1)
        </span>
      ),
    },
  ];

  // 导出记录处理函数
  const handleExportRecords = () => {
    console.log("导出记录功能");
    // TODO: 实现导出功能
  };

  return (
    <div className={styles.container}>
      <PowerNavigation
        title="沟通记录"
        subtitle="查看和管理所有客户沟通记录"
        showBackButton={true}
        backButtonText="返回功能中心"
        rightContent={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportRecords}
            className={styles.exportButton}
          >
            导出记录
          </Button>
        }
      />

      <div className={styles.content}>
        {/* 顶部搜索和筛选区域 */}
        <div className={styles.headerSection}>
          <div className={styles.searchBar}>
            <Search
              placeholder="搜索客户、内容或标签..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
          </div>
          <div className={styles.filterButtons}>
            <Button icon={<FilterOutlined />}>筛选</Button>
            <Button icon={<CalendarOutlined />}>日期范围</Button>
          </div>
        </div>

        {/* 通信类型导航栏 */}
        <div className={styles.navigationTabs}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className={styles.tabs}
          />
        </div>

        {/* 通信记录列表 */}
        <div className={styles.recordsList}>
          {filteredData.map(record => (
            <Card key={record.id} className={styles.recordCard}>
              <div className={styles.cardContent}>
                <div className={styles.cardLeft}>
                  <Avatar className={styles.avatar}>{record.avatar}</Avatar>
                  <div className={styles.recordInfo}>
                    <div className={styles.nameAndType}>
                      <span className={styles.name}>{record.name}</span>
                      <span className={styles.type}>
                        {getTypeIcon(record.type)}
                        {record.type === "chat"
                          ? "聊天"
                          : record.type === "call"
                            ? "通话"
                            : record.type === "video"
                              ? "视频"
                              : "邮件"}
                      </span>
                    </div>
                    <div className={styles.statusAndTime}>
                      <Tag color={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Tag>
                      <span className={styles.dateTime}>{record.dateTime}</span>
                      {record.duration && (
                        <span className={styles.duration}>
                          时长:{record.duration}
                        </span>
                      )}
                    </div>
                    <div className={styles.directionAndSubject}>
                      <Tag color={getDirectionColor(record.direction)}>
                        {getDirectionText(record.direction)}
                      </Tag>
                      {record.subject && (
                        <span className={styles.subject}>{record.subject}</span>
                      )}
                    </div>
                    <div className={styles.content}>{record.content}</div>
                    <div className={styles.tags}>
                      {record.tags.map((tag, index) => (
                        <Tag key={index} className={styles.tag}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                    {record.attachments && record.attachments.length > 0 && (
                      <div className={styles.attachments}>
                        <span className={styles.attachmentsLabel}>附件:</span>
                        {record.attachments.map((attachment, index) => (
                          <div key={index} className={styles.attachment}>
                            <span className={styles.attachmentIcon}>
                              {getAttachmentIcon(attachment.type)}
                            </span>
                            <span className={styles.attachmentName}>
                              {attachment.name}
                            </span>
                            <DownloadOutlined className={styles.downloadIcon} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <EyeOutlined className={styles.viewIcon} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunicationRecord;
