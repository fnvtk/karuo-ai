import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Switch, Input, message, Dropdown, Menu } from "antd";
import { Button } from "antd-mobile";
import NavCommon from "@/components/NavCommon";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
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
  contentLib?: string;
  // 计划类型：0-全局计划，1-独立计划
  planType?: number;
  config?: {
    devices?: string[];
    contentGroups: number[];
    contentGroupsOptions?: {
      id: number;
      name: string;
      [key: string]: any;
    }[];
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

const MomentsSync: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<MomentsSyncTask[]>([]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await request(
        "/v1/workbench/list",
        { type: 2, page: 1, limit: 100 },
        "GET",
      );
      const list = (res.list || []) as any[];
      const normalized: MomentsSyncTask[] = list.map(item => ({
        ...item,
        planType: item.config?.planType ?? item.planType ?? 1,
      }));
      setTasks(normalized);
    } catch (e) {
      message.error("获取任务失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除该任务吗？")) return;
    try {
      await request("/v1/workbench/delete", { id }, "DELETE");
      message.success("删除成功");
      fetchTasks();
    } catch {
      message.error("删除失败");
    }
  };

  const handleCopy = async (id: string) => {
    try {
      await request("/v1/workbench/copy", { id }, "POST");
      message.success("复制成功");
      fetchTasks();
    } catch {
      message.error("复制失败");
    }
  };

  const handleToggle = async (id: string, status: number) => {
    const newStatus = status === 1 ? 2 : 1;
    try {
      await request(
        "/v1/workbench/update-status",
        { id, status: newStatus },
        "POST",
      );
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)),
      );
      message.success("操作成功");
    } catch {
      message.error("操作失败");
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const globalTasks = filteredTasks.filter(t => t.planType === 0);
  const independentTasks = filteredTasks.filter(t => t.planType !== 0);

  // 菜单
  const getMenu = (task: MomentsSyncTask) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/workspace/moments-sync/record/${task.id}`)}
      >
        查看
      </Menu.Item>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/workspace/moments-sync/edit/${task.id}`)}
      >
        编辑
      </Menu.Item>
      <Menu.Item
        key="copy"
        icon={<CopyOutlined />}
        onClick={() => handleCopy(task.id)}
      >
        复制
      </Menu.Item>
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        onClick={() => handleDelete(task.id)}
        danger
      >
        删除
      </Menu.Item>
    </Menu>
  );

  const renderTaskCard = (task: MomentsSyncTask) => (
              <div key={task.id} className={style.itemCard}>
                <div className={style.itemTop}>
                  <div className={style.itemTitle}>
                    <span className={style.itemName}>{task.name}</span>
                    <span
                      className={
                        task.status === 1
                          ? style.statusPill + " " + style.statusActive
                          : style.statusPill + " " + style.statusPaused
                      }
                    >
                      {getStatusText(task.status)}
                    </span>
                  </div>
                  <div className={style.itemActions}>
                    <Switch
                      checked={task.status === 1}
                      onChange={() => handleToggle(task.id, task.status)}
                      className={style.switchBtn}
                      size="small"
                    />
                    <Dropdown
                      overlay={getMenu(task)}
                      trigger={["click"]}
                      placement="bottomRight"
                    >
                      <button
                        className={style.moreBtn}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                        tabIndex={0}
                        aria-label="更多操作"
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  </div>
                </div>
                <div className={style.itemInfoRow}>
                  <div className={style.infoCol}>
                    推送设备：{task.config?.devices?.length || 0} 个
                  </div>
                  <div className={style.infoCol}>
                    已同步：{task.syncCount || 0} 条
                  </div>
                </div>
                <div className={style.itemInfoRow}>
                  <div className={style.infoCol}>
                    内容库：
                    {task.config?.contentGroupsOptions
                      ?.map(c => c.name)
                      .join(",") || "默认内容库"}
                  </div>
        <div className={style.infoCol}>创建人：{task.creatorName}</div>
                </div>
                <div className={style.itemBottom}>
                  <div className={style.bottomLeft}>
                    <ClockCircleOutlined className={style.clockIcon} />
                    上次同步：{task.lastSyncTime || "无"}
                  </div>
        <div className={style.bottomRight}>创建时间：{task.createTime}</div>
                  </div>
                </div>
  );

  let content: React.ReactNode;
  if (filteredTasks.length === 0) {
    content = (
      <div className={style.emptyBox}>
        <span style={{ fontSize: 40, color: "#ddd" }}>
          <ClockCircleOutlined />
        </span>
        <div className={style.emptyText}>暂无同步任务</div>
        <Button
          color="primary"
          onClick={() => navigate("/workspace/moments-sync/new")}
        >
          新建第一个任务
        </Button>
      </div>
    );
  } else {
    content = (
      <>
        {globalTasks.length > 0 && (
          <div className={style.infoBox}>
            全局同步计划将应用于所有设备（包括新添加的设备），请合理设置同步频率与数量。
          </div>
        )}

        {globalTasks.length > 0 && (
          <section className={style.section}>
            <h3 className={style.sectionTitle}>
              <span className={style.sectionDot} />
              全局朋友圈同步计划
            </h3>
            <div className={style.taskListGroup}>
              {globalTasks.map(renderTaskCard)}
            </div>
          </section>
        )}

        {independentTasks.length > 0 && (
          <section className={style.section}>
            <h3
              className={`${style.sectionTitle} ${style.sectionTitleIndependent}`}
            >
              <span className={style.sectionDot} />
              独立朋友圈同步计划
            </h3>
            <div className={style.taskListGroup}>
              {independentTasks.map(renderTaskCard)}
              </div>
          </section>
        )}
      </>
    );
  }

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="朋友圈同步"
            right={
              <Button
                size="small"
                color="primary"
                onClick={() => navigate("/workspace/moments-sync/new")}
              >
                <PlusOutlined /> 新建任务
              </Button>
            }
          />

          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索任务名称"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              size="small"
              onClick={fetchTasks}
              loading={loading}
              className="refresh-btn"
            >
              <ReloadOutlined />
            </Button>
        </div>
        </>
      }
      loading={loading}
    >
      <div className={style.pageBg}>
        <div className={style.taskList}>{content}</div>
      </div>
    </Layout>
  );
};

export default MomentsSync;
