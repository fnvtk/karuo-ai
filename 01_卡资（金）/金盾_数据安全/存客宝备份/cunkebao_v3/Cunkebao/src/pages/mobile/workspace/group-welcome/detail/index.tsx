import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Descriptions, Tag, Badge, Button } from "antd";
import {
  ArrowLeftOutlined,
  TeamOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { fetchGroupWelcomeTaskDetail } from "../form/index.api";
import { Toast } from "antd-mobile";
import styles from "./index.module.scss";

const GroupWelcomeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [taskData, setTaskData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const loadDetail = async () => {
      try {
        setLoading(true);
        const res = await fetchGroupWelcomeTaskDetail(id);
        const data = res?.data || res;
        setTaskData(data);
      } catch (error) {
        console.error("加载详情失败:", error);
        Toast.show({ content: "加载数据失败", position: "top" });
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id]);

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "green";
      case 2:
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return "进行中";
      case 2:
        return "已暂停";
      default:
        return "未知";
    }
  };

  const getMessageTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      text: "文本",
      image: "图片",
      video: "视频",
      file: "文件",
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <Layout
        header={<NavCommon title="任务详情" backFn={() => navigate("/workspace/group-welcome")} />}
      >
        <div style={{ textAlign: "center", padding: "40px 0" }}>加载中...</div>
      </Layout>
    );
  }

  if (!taskData) {
    return (
      <Layout
        header={<NavCommon title="任务详情" backFn={() => navigate("/workspace/group-welcome")} />}
      >
        <div style={{ textAlign: "center", padding: "40px 0" }}>暂无数据</div>
      </Layout>
    );
  }

  const config = taskData.config || {};

  return (
    <Layout
      header={
        <NavCommon
          title="任务详情"
          backFn={() => navigate("/workspace/group-welcome")}
          right={
            <Button
              type="primary"
              onClick={() => navigate(`/workspace/group-welcome/edit/${id}`)}
            >
              编辑
            </Button>
          }
        />
      }
    >
      <div className={styles.detailContainer}>
        <Card className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2>{taskData.name}</h2>
            <Badge
              color={getStatusColor(taskData.status)}
              text={getStatusText(taskData.status)}
            />
          </div>

          <Descriptions column={1} bordered>
            <Descriptions.Item label="任务名称">{taskData.name}</Descriptions.Item>
            <Descriptions.Item label="任务状态">
              <Badge
                color={getStatusColor(taskData.status)}
                text={getStatusText(taskData.status)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="时间间隔">
              <ClockCircleOutlined /> {config.interval || 0} 分钟
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {taskData.createTime || "暂无"}
            </Descriptions.Item>
            {taskData.updateTime && (
              <Descriptions.Item label="更新时间">
                {taskData.updateTime}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card className={styles.detailCard} title={<><TeamOutlined /> 目标群组</>}>
          <div className={styles.groupList}>
            {config.wechatGroupsOptions && config.wechatGroupsOptions.length > 0 ? (
              config.wechatGroupsOptions.map((group: any) => (
                <div key={group.id} className={styles.groupItem}>
                  {group.groupAvatar && (
                    <img
                      src={group.groupAvatar}
                      alt={group.groupName || "群组头像"}
                      className={styles.groupAvatar}
                    />
                  )}
                  <div className={styles.groupInfo}>
                    <div className={styles.groupName}>{group.groupName || `群组 ${group.id}`}</div>
                    {group.nickName && (
                      <div className={styles.groupOwner}>归属：{group.nickName}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#999" }}>
                已选择 {config.wechatGroups?.length || 0} 个群组
              </div>
            )}
          </div>
        </Card>

        <Card className={styles.detailCard} title={<><RobotOutlined /> 机器人</>}>
          <div className={styles.robotList}>
            {config.deviceGroupsOptions && config.deviceGroupsOptions.length > 0 ? (
              config.deviceGroupsOptions.map((robot: any) => (
                <Tag key={robot.id} color="green" style={{ marginBottom: 8 }}>
                  {robot.memo || robot.wechatId || robot.nickname || `设备 ${robot.id}`}
                </Tag>
              ))
            ) : (
              <div style={{ color: "#999" }}>
                已选择 {config.deviceGroups?.length || 0} 个机器人
              </div>
            )}
          </div>
        </Card>

        <Card className={styles.detailCard} title={<><MessageOutlined /> 欢迎消息</>}>
          <div className={styles.messageList}>
            {config.messages && config.messages.length > 0 ? (
              config.messages.map((message: any, index: number) => (
                <div key={message.id || index} className={styles.messageItem}>
                  <div className={styles.messageHeader}>
                    <Tag color="purple">消息 {message.order || index + 1}</Tag>
                    <Tag>{getMessageTypeText(message.type)}</Tag>
                  </div>
                  <div className={styles.messageContent}>
                    {message.type === "text" ? (
                      <div
                        className={styles.textContent}
                        style={{ whiteSpace: "pre-wrap" }}
                        dangerouslySetInnerHTML={{
                          __html: (message.content || "")
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/\n/g, "<br>")
                            .replace(/@\{好友\}/g, '<span style="color: #1677ff; font-weight: 600; background: #e6f7ff; padding: 2px 4px; border-radius: 3px;">@好友</span>')
                        }}
                      />
                    ) : message.type === "image" ? (
                      <img
                        src={message.content}
                        alt="图片"
                        style={{ maxWidth: "100%", borderRadius: 8 }}
                      />
                    ) : message.type === "video" ? (
                      <video
                        src={message.content}
                        controls
                        style={{ maxWidth: "100%", borderRadius: 8 }}
                      />
                    ) : (
                      <div className={styles.fileContent}>
                        <a href={message.content} target="_blank" rel="noopener noreferrer">
                          查看文件
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#999", textAlign: "center", padding: "20px 0" }}>
                暂无欢迎消息
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default GroupWelcomeDetail;
