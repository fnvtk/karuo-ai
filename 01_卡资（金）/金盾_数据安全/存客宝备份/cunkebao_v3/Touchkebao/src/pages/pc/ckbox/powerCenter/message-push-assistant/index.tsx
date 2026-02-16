import React from "react";
import { useNavigate } from "react-router-dom";
import PowerNavigation from "@/components/PowerNavtion";
import Layout from "@/components/Layout/LayoutFiexd";
import {
  UserOutlined,
  MessageOutlined,
  SoundOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SendOutlined,
} from "@ant-design/icons";
import styles from "./index.module.scss";

export type PushType =
  | "friend-message"
  | "group-message"
  | "group-announcement";

const MessagePushAssistant: React.FC = () => {
  const navigate = useNavigate();

  // 创建推送任务卡片数据
  const createTaskCards = [
    {
      id: "friend-message",
      title: "好友消息推送",
      description: "向选定的微信好友批量发送消息",
      icon: <UserOutlined />,
      color: "#1890ff",
      onClick: () => {
        navigate(
          "/pc/powerCenter/message-push-assistant/create-push-task/friend-message",
        );
      },
    },
    {
      id: "group-message",
      title: "群消息推送",
      description: "向选定的微信群批量发送消息",
      icon: <MessageOutlined />,
      color: "#52c41a",
      onClick: () => {
        navigate(
          "/pc/powerCenter/message-push-assistant/create-push-task/group-message",
        );
      },
    },
    {
      id: "group-announcement",
      title: "群公告推送",
      description: "向选定的微信群批量发布群公告",
      icon: <SoundOutlined />,
      color: "#722ed1",
      onClick: () => {
        navigate(
          "/pc/powerCenter/message-push-assistant/create-push-task/group-announcement",
        );
      },
    },
  ];

  // 数据与记录卡片数据
  const dataRecordCards = [
    {
      id: "data-statistics",
      title: "数据统计",
      description: "查看推送效果统计与话术对比分析",
      icon: <BarChartOutlined />,
      color: "#ff7a00",
      onClick: () => {
        navigate("/pc/powerCenter/data-statistics");
      },
    },
    {
      id: "push-history",
      title: "推送历史",
      description: "查看所有推送任务的历史记录",
      icon: <HistoryOutlined />,
      color: "#666666",
      onClick: () => {
        navigate("/pc/powerCenter/push-history");
      },
    },
  ];

  return (
    <Layout
      header={
        <div style={{ padding: "20px" }}>
          <PowerNavigation
            title="消息推送助手"
            subtitle="智能批量推送，AI智能话术改写"
            showBackButton={true}
            backButtonText="返回"
            onBackClick={() => navigate("/pc/powerCenter")}
          />
        </div>
      }
      footer={null}
    >
      <div className={styles.container}>
        {/* 创建推送任务部分 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>创建推送任务</h2>
          <div className={styles.cardGrid}>
            {createTaskCards.map(card => (
              <div
                key={card.id}
                className={styles.taskCard}
                onClick={card.onClick}
              >
                <div
                  className={styles.cardIcon}
                  style={{ backgroundColor: card.color }}
                >
                  {card.icon}
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                </div>
                <div className={styles.cardAction}>
                  <SendOutlined
                    style={{ fontSize: "14px", color: card.color }}
                  />
                  <span style={{ color: card.color, marginLeft: "4px" }}>
                    立即创建
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 数据与记录部分 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>数据与记录</h2>
          <div className={styles.dataRecordGrid}>
            {dataRecordCards.map(card => (
              <div
                key={card.id}
                className={styles.taskCard}
                onClick={card.onClick}
              >
                <div
                  className={styles.cardIcon}
                  style={{ backgroundColor: card.color }}
                >
                  {card.icon}
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MessagePushAssistant;
