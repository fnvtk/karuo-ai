import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Switch, message, Spin } from "antd";
import NavCommon from "@/components/NavCommon";
import { EditOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import request from "@/api/request";

interface MomentsSyncTask {
  id: string;
  name: string;
  status: 1 | 2;
  deviceCount: number;
  syncCount: number;
  lastSyncTime: string;
  createTime: string;
  creatorName: string;
  updateTime?: string;
  maxSyncPerDay?: number;
  syncInterval?: number;
  timeRange?: { start: string; end: string };
  contentTypes?: string[];
  targetTags?: string[];
  todaySyncCount?: number;
  totalSyncCount?: number;
  syncMode?: string;
  config?: {
    devices?: string[];
    contentLibraryNames?: string[];
    syncCount?: number;
  };
}

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

const MomentsSyncDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<MomentsSyncTask | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTaskDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await request("/v1/workbench/detail", { id }, "GET");
      if (res) setTask(res);
    } catch {
      message.error("获取任务详情失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchTaskDetail();
  }, [id, fetchTaskDetail]);

  const handleToggleStatus = async () => {
    if (!task || !id) return;
    try {
      const newStatus = task.status === 1 ? 2 : 1;
      await request(
        "/v1/workbench/update-status",
        { id, status: newStatus },
        "POST",
      );
      setTask({ ...task, status: newStatus });
      message.success(newStatus === 1 ? "任务已开启" : "任务已暂停");
    } catch {
      message.error("操作失败");
    }
  };

  const handleEdit = () => {
    if (id) navigate(`/workspace/moments-sync/edit/${id}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className={style.detailLoading}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className={style.detailLoading}>
          <div>任务不存在</div>
          <Button onClick={() => navigate("/workspace/moments-sync")}>
            返回列表
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={
        <NavCommon
          title="查看朋友圈同步任务"
          right={
            <Button
              icon={<EditOutlined />}
              onClick={handleEdit}
              className={style.editBtn}
              type="primary"
            >
              编辑任务
            </Button>
          }
        />
      }
    >
      <div className={style.detailBg}>
        <div className={style.detailCard}>
          <div className={style.detailTop}>
            <div className={style.detailTitle}>{task.name}</div>
            <span
              className={
                task.status === 1
                  ? style.statusPill + " " + style.statusActive
                  : style.statusPill + " " + style.statusPaused
              }
            >
              {getStatusText(task.status)}
            </span>
            <Switch
              checked={task.status === 1}
              onChange={handleToggleStatus}
              className={style.switchBtn}
              size="small"
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>任务详情</div>
              <div style={{ fontSize: 14, color: "#222", marginBottom: 4 }}>
                推送设备：{task.config?.devices?.length || 0} 个
              </div>
              <div style={{ fontSize: 14, color: "#222", marginBottom: 4 }}>
                内容库：{task.config?.contentLibraryNames?.join("，") || "-"}
              </div>
              <div style={{ fontSize: 14, color: "#222", marginBottom: 4 }}>
                已同步：{task.syncCount || 0} 条
              </div>
              <div style={{ fontSize: 14, color: "#222" }}>
                创建人：{task.creatorName}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>时间信息</div>
              <div style={{ fontSize: 14, color: "#222", marginBottom: 4 }}>
                创建时间：{task.createTime}
              </div>
              <div style={{ fontSize: 14, color: "#222" }}>
                上次同步：{task.lastSyncTime || "无"}
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              margin: "16px 0 0 0",
              paddingTop: 12,
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: 8 }}>同步内容预览</div>
            <div style={{ color: "#888", fontSize: 14 }}>暂无内容预览</div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MomentsSyncDetail;
