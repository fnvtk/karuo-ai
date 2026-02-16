import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TeamOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SendOutlined,
  CarryOutOutlined,
} from "@ant-design/icons";
import { Card, Button, Input, Badge, Switch } from "antd";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import {
  fetchGroupPushTasks,
  deleteGroupPushTask,
  toggleGroupPushTask,
  copyGroupPushTask,
} from "./index.api";
import styles from "./index.module.scss";

// 卡片菜单组件
interface CardMenuProps {
  onView: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const CardMenu: React.FC<CardMenuProps> = ({ onEdit, onCopy, onDelete }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} className={styles["menu-btn"]}>
        <MoreOutlined />
      </button>
      {open && (
        <div ref={menuRef} className={styles["menu-dropdown"]}>
          <div
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className={styles["menu-item"]}
          >
            <EditOutlined />
            编辑
          </div>
          <div
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
            className={styles["menu-item"]}
          >
            <CopyOutlined />
            复制
          </div>
          <div
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className={`${styles["menu-item"]} ${styles["danger"]}`}
          >
            <DeleteOutlined />
            删除
          </div>
        </div>
      )}
    </div>
  );
};

const GroupPush: React.FC = () => {
  const navigate = useNavigate();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await fetchGroupPushTasks();
      const list = (result.list || []) as any[];
      const normalized = list.map(item => ({
        ...item,
        planType: item.config?.planType ?? item.planType ?? 1,
      }));
      setTasks(normalized);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("确定要删除该任务吗？")) return;
    await deleteGroupPushTask(taskId);
    fetchTasks();
  };

  const handleEdit = (taskId: string) => {
    navigate(`/workspace/group-push/edit/${taskId}`);
  };

  const handleView = (taskId: string) => {
    navigate(`/workspace/group-push/${taskId}`);
  };

  const handleCopy = async (taskId: string) => {
    await copyGroupPushTask(taskId);
    fetchTasks();
  };

  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 1 ? 2 : 1;
    await toggleGroupPushTask({ id: taskId, status: newStatus });
    fetchTasks();
  };

  const handleCreateNew = () => {
    // 直接跳转到群消息推送（targetType=1, groupPushSubType=1）
    const params = new URLSearchParams({
      targetType: "1",
      groupPushSubType: "1",
    });
    navigate(`/workspace/group-push/new?${params.toString()}`);
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const globalTasks = filteredTasks.filter(t => t.planType === 0);
  const independentTasks = filteredTasks.filter(t => t.planType !== 0);

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

  const renderTaskCard = (task: any) => (
    <Card key={task.id} className={styles.taskCard}>
      <div className={styles.taskHeader}>
        <div className={styles.taskTitle}>
          <span>{task.name}</span>
          <Badge
            color={getStatusColor(task.status)}
            text={getStatusText(task.status)}
            style={{ marginLeft: 8 }}
          />
        </div>
        <div className={styles.taskActions}>
          <Switch
            checked={task.status === 1}
            onChange={() => toggleTaskStatus(task.id)}
          />
          <CardMenu
            onView={() => handleView(task.id)}
            onEdit={() => handleEdit(task.id)}
            onCopy={() => handleCopy(task.id)}
            onDelete={() => handleDelete(task.id)}
          />
        </div>
      </div>
      <div className={styles.taskInfoGrid}>
        <div>
          <TeamOutlined />
          推送目标：{task.config?.groups?.length || 0} 个社群
        </div>
        <div>
          <CarryOutOutlined /> 推送内容：
          {task.config?.content || 0} 个
        </div>
      </div>

      <div className={styles.taskFooter}>
        <div>
          <ClockCircleOutlined /> 上次推送：
          {task.config?.lastPushTime || "暂无"}
        </div>
        <div>创建时间：{task.createTime}</div>
      </div>
    </Card>
  );

  let content: React.ReactNode;
  if (filteredTasks.length === 0) {
    content = (
      <Card className={styles.emptyCard}>
        <SendOutlined
          style={{ fontSize: 48, color: "#ccc", marginBottom: 12 }}
        />
        <div style={{ color: "#888", fontSize: 16, marginBottom: 8 }}>
          暂无推送任务
        </div>
        <div style={{ color: "#bbb", fontSize: 13, marginBottom: 16 }}>
          创建您的第一个群消息推送任务
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateNew}
        >
          创建第一个任务
        </Button>
      </Card>
    );
  } else {
    content = (
      <>
        {globalTasks.length > 0 && (
          <div className={styles.infoBox}>
            全局群发计划将应用于所有设备（包括新添加的设备），请谨慎设置推送频率和内容。
          </div>
        )}

        {globalTasks.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionDot} />
              全局群发计划
            </h3>
            <div className={styles.taskListGroup}>
              {globalTasks.map(renderTaskCard)}
            </div>
          </section>
        )}

        {independentTasks.length > 0 && (
          <section className={styles.section}>
            <h3
              className={`${styles.sectionTitle} ${styles.sectionTitleIndependent}`}
            >
              <span className={styles.sectionDot} />
              独立群发计划
            </h3>
            <div className={styles.taskListGroup}>
              {independentTasks.map(renderTaskCard)}
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <Layout
      loading={loading}
      header={
        <>
          <NavCommon
            title="群消息推送"
            backFn={() => navigate("/workspace")}
            right={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateNew}
              >
                创建任务
              </Button>
            }
          />

          <div className={styles.searchBar}>
            <Input
              placeholder="搜索计划名称"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              size="large"
            />
            <Button
              onClick={fetchTasks}
              size="large"
              className={styles["refresh-btn"]}
            >
              <ReloadOutlined />
            </Button>
          </div>
        </>
      }
    >
      <div className={styles.bg}>
        <div className={styles.taskList}>{content}</div>
      </div>
    </Layout>
  );
};

export default GroupPush;
