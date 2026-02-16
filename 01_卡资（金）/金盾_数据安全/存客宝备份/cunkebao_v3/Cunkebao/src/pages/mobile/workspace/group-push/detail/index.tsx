import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Badge, Button, Progress, Spin } from "antd";
import {
  ArrowLeftOutlined,
  SettingOutlined,
  TeamOutlined,
  MessageOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import MeauMobile from "@/components/MeauMobile/MeauMoible";
import { getGroupPushTaskDetail, GroupPushTask } from "./groupPush";
import styles from "./index.module.scss";

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<GroupPushTask | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getGroupPushTaskDetail(id)
      .then(res => {
        setTask(res.data || res); // 兼容两种返回格式
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout
        header={
          <div
            style={{
              background: "#fff",
              padding: "0 16px",
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            <ArrowLeftOutlined
              onClick={() => navigate(-1)}
              style={{ marginRight: 12, cursor: "pointer" }}
            />
            群发推送详情
          </div>
        }
      >
        <div style={{ padding: 48, textAlign: "center" }}>
          <Spin />
        </div>
      </Layout>
    );
  }
  if (!task) {
    return (
      <Layout
        header={
          <div
            style={{
              background: "#fff",
              padding: "0 16px",
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            <ArrowLeftOutlined
              onClick={() => navigate(-1)}
              style={{ marginRight: 12, cursor: "pointer" }}
            />
            群发推送详情
          </div>
        }
        footer={<MeauMobile />}
      >
        <div style={{ padding: 48, textAlign: "center", color: "#888" }}>
          未找到该任务
        </div>
      </Layout>
    );
  }

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
    switch (type) {
      case "text":
        return "文字";
      case "image":
        return "图片";
      case "video":
        return "视频";
      case "link":
        return "链接";
      default:
        return "未知";
    }
  };
  const getSuccessRate = (pushCount: number, successCount: number) => {
    if (pushCount === 0) return 0;
    return Math.round((successCount / pushCount) * 100);
  };

  return (
    <Layout
      header={
        <div
          style={{
            background: "#fff",
            padding: "0 16px",
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          <ArrowLeftOutlined
            onClick={() => navigate(-1)}
            style={{ marginRight: 12, cursor: "pointer" }}
          />
          群发推送详情
        </div>
      }
    >
      <div className={styles.bg}>
        <Card className={styles.taskCard}>
          <div className={styles.taskHeader}>
            <div className={styles.taskTitle}>
              <span>{task.name}</span>
              <Badge
                color={getStatusColor(task.status)}
                text={getStatusText(task.status)}
                style={{ marginLeft: 8 }}
              />
            </div>
          </div>
          <div className={styles.taskInfoGrid}>
            <div>执行设备：{task.deviceCount} 个</div>
            <div>目标群组：{task.targetGroups.length} 个</div>
            <div>
              推送成功：{task.successCount}/{task.pushCount}
            </div>
            <div>创建人：{task.creator}</div>
          </div>
          <div className={styles.progressBlock}>
            <div className={styles.progressLabel}>推送成功率</div>
            <Progress
              percent={getSuccessRate(task.pushCount, task.successCount)}
              size="small"
            />
          </div>
          <div className={styles.taskFooter}>
            <div>
              <CalendarOutlined /> 上次推送：{task.lastPushTime}
            </div>
            <div>创建时间：{task.createTime}</div>
          </div>
          <div className={styles.expandedPanel}>
            <div className={styles.expandedGrid}>
              <div>
                <SettingOutlined /> <b>基本设置</b>
                <div>推送间隔：{task.pushInterval} 秒</div>
                <div>每日最大推送数：{task.maxPerDay} 条</div>
                <div>
                  执行时间段：{task.timeRange.start} - {task.timeRange.end}
                </div>
                <div>
                  推送模式：
                  {task.pushMode === "immediate" ? "立即推送" : "定时推送"}
                </div>
                {task.scheduledTime && (
                  <div>定时时间：{task.scheduledTime}</div>
                )}
              </div>
              <div>
                <TeamOutlined /> <b>目标群组</b>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {task.targetGroups.map(group => (
                    <Badge
                      key={group}
                      color="blue"
                      text={group}
                      style={{ background: "#f0f5ff", marginRight: 4 }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <MessageOutlined /> <b>消息内容</b>
                <div>消息类型：{getMessageTypeText(task.messageType)}</div>
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: 8,
                    borderRadius: 4,
                    marginTop: 4,
                  }}
                >
                  {task.messageContent}
                </div>
              </div>
              <div>
                <CalendarOutlined /> <b>执行进度</b>
                <div>
                  今日已推送：{task.pushCount} / {task.maxPerDay}
                </div>
                <Progress
                  percent={Math.round((task.pushCount / task.maxPerDay) * 100)}
                  size="small"
                />
                {task.targetTags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div>目标标签：</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {task.targetTags.map(tag => (
                        <Badge
                          key={tag}
                          color="purple"
                          text={tag}
                          style={{ background: "#f9f0ff", marginRight: 4 }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Detail;
