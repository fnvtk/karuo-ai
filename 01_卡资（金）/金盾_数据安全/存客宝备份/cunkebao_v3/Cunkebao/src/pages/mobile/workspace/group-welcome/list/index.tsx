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
  MessageOutlined,
} from "@ant-design/icons";
import { Card, Button, Input, Badge, Switch } from "antd";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import {
  fetchGroupWelcomeTasks,
  deleteGroupWelcomeTask,
  toggleGroupWelcomeTask,
  copyGroupWelcomeTask,
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

const GroupWelcome: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await fetchGroupWelcomeTasks();
      setTasks(result.list || result || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("确定要删除该任务吗？")) return;
    await deleteGroupWelcomeTask(taskId);
    fetchTasks();
  };

  const handleEdit = (taskId: string) => {
    navigate(`/workspace/group-welcome/edit/${taskId}`);
  };

  const handleView = (taskId: string) => {
    navigate(`/workspace/group-welcome/${taskId}`);
  };

  const handleCopy = async (taskId: string) => {
    await copyGroupWelcomeTask(taskId);
    fetchTasks();
  };

  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 1 ? 2 : 1;
    await toggleGroupWelcomeTask({ id: taskId, status: newStatus });
    fetchTasks();
  };

  const handleCreateNew = () => {
    navigate("/workspace/group-welcome/new");
  };

  const filteredTasks = tasks.filter(task =>
    task.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  return (
    <Layout
      loading={loading}
      header={
        <>
          <NavCommon
            title="入群欢迎语"
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
              placeholder="搜索任务名称"
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
        <div className={styles.taskList}>
          {filteredTasks.length === 0 ? (
            <Card className={styles.emptyCard}>
              <MessageOutlined
                style={{ fontSize: 48, color: "#ccc", marginBottom: 12 }}
              />
              <div style={{ color: "#888", fontSize: 16, marginBottom: 8 }}>
                暂无欢迎语任务
              </div>
              <div style={{ color: "#bbb", fontSize: 13, marginBottom: 16 }}>
                创建您的第一个入群欢迎语任务
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateNew}
              >
                创建第一个任务
              </Button>
            </Card>
          ) : (
            filteredTasks.map(task => (
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
                    目标群组：{task.config?.wechatGroups?.length || 0} 个群
                  </div>
                  <div>
                    <MessageOutlined /> 欢迎消息：
                    {task.config?.messages?.length || 0} 条
                  </div>
                </div>

                <div className={styles.taskFooter}>
                  <div>
                    <ClockCircleOutlined /> 时间间隔：
                    {task.config?.interval || 0} 分钟
                  </div>
                  <div>创建时间：{task.createTime || "暂无"}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GroupWelcome;
