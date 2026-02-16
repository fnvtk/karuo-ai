import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toast, SpinLoading, Dialog, Card } from "antd-mobile";
import NavCommon from "@/components/NavCommon";
import { Input } from "antd";
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  LikeOutlined,
} from "@ant-design/icons";

import Layout from "@/components/Layout/Layout";
import {
  fetchAutoLikeTasks,
  deleteAutoLikeTask,
  toggleAutoLikeTask,
  copyAutoLikeTask,
} from "./api";
import { LikeTask } from "./data";
import style from "./index.module.scss";

// 卡片菜单组件
interface CardMenuProps {
  onView: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const CardMenu: React.FC<CardMenuProps> = ({
  onView,
  onEdit,
  onCopy,
  onDelete,
}) => {
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
      <button onClick={() => setOpen(v => !v)} className={style["menu-btn"]}>
        <MoreOutlined />
      </button>
      {open && (
        <div ref={menuRef} className={style["menu-dropdown"]}>
          <div
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className={style["menu-item"]}
          >
            <EyeOutlined />
            查看
          </div>
          <div
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className={style["menu-item"]}
          >
            <EditOutlined />
            编辑
          </div>
          <div
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
            className={style["menu-item"]}
          >
            <CopyOutlined />
            复制
          </div>
          <div
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className={`${style["menu-item"]} ${style["danger"]}`}
          >
            <DeleteOutlined />
            删除
          </div>
        </div>
      )}
    </div>
  );
};

const AutoLike: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<LikeTask[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const Res: any = await fetchAutoLikeTasks();
      // 数据在 data.list 中
      const taskList = Res?.data?.list || Res?.list || [];
      const mappedTasks: LikeTask[] = taskList.map((task: any) => {
        const config = task.config || {};
        const friends = config.friends || [];
        const devices = config.devices || [];

        // 判断目标人群：如果 friends 为空或未设置，表示选择全部好友
        let targetGroup = "全部好友";
        if (friends.length > 0) {
          targetGroup = `${friends.length} 个好友`;
        }

        return {
          id: task.id?.toString() || "",
          name: task.name || "",
          status: task.status === 1 ? 1 : 2, // 1: 开启, 2: 关闭
          deviceCount: devices.length,
          targetGroup: targetGroup,
          likeInterval: config.interval || 60,
          maxLikesPerDay: config.maxLikes || 100,
          lastLikeTime: task.lastLikeTime || "暂无",
          createTime: task.createTime || "",
          updateTime: task.updateTime || "",
          todayLikeCount: config.todayLikeCount || 0,
          totalLikeCount: config.totalLikeCount || 0,
          planType: config.planType ?? task.planType ?? 1,
          // 保留原始数据
          config: config,
          devices: devices,
          friends: friends,
        };
      });
      setTasks(mappedTasks);
    } catch (error) {
      console.error("获取自动点赞任务失败:", error);
      Toast.show({
        content: "获取任务列表失败",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 删除任务
  const handleDelete = async (id: string) => {
    const result = await Dialog.confirm({
      content: "确定要删除这个任务吗？",
      confirmText: "删除",
      cancelText: "取消",
    });

    if (result) {
      try {
        await deleteAutoLikeTask(id);
        Toast.show({
          content: "删除成功",
          position: "top",
        });
        fetchTasks(); // 重新获取列表
      } catch (error) {
        Toast.show({
          content: "删除失败",
          position: "top",
        });
      }
    }
  };

  // 编辑任务
  const handleEdit = (taskId: string) => {
    navigate(`/workspace/auto-like/edit/${taskId}`);
  };

  // 查看任务
  const handleView = (taskId: string) => {
    navigate(`/workspace/auto-like/record/${taskId}`);
  };

  // 复制任务
  const handleCopy = async (id: string) => {
    try {
      await copyAutoLikeTask(id);
      Toast.show({
        content: "复制成功",
        position: "top",
      });
      fetchTasks(); // 重新获取列表
    } catch (error) {
      Toast.show({
        content: "复制失败",
        position: "top",
      });
    }
  };

  // 切换任务状态
  const toggleTaskStatus = async (id: string, status: number) => {
    try {
      await toggleAutoLikeTask({ id });
      Toast.show({
        content: status === 1 ? "已暂停" : "已启动",
        position: "top",
      });
      fetchTasks(); // 重新获取列表
    } catch (error) {
      Toast.show({
        content: "操作失败",
        position: "top",
      });
    }
  };

  // 创建新任务
  const handleCreateNew = () => {
    navigate("/workspace/auto-like/new");
  };

  // 过滤任务
  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 按计划类型分组
  const globalTasks = filteredTasks.filter(t => t.planType === 0);
  const independentTasks = filteredTasks.filter(t => t.planType !== 0);

  const renderTaskCard = (task: LikeTask) => (
              <Card key={task.id} className={style["task-card"]}>
                <div className={style["task-header"]}>
                  <div className={style["task-title-section"]}>
                    <h3 className={style["task-name"]}>{task.name}</h3>
                    <span
                      className={`${style["task-status"]} ${
              Number(task.status) === 1 ? style["active"] : style["inactive"]
                      }`}
                    >
                      {Number(task.status) === 1 ? "进行中" : "已暂停"}
                    </span>
                  </div>
                  <div className={style["task-controls"]}>
                    <label className={style["switch"]}>
                      <input
                        type="checkbox"
                        checked={Number(task.status) === 1}
              onChange={() => toggleTaskStatus(task.id, Number(task.status))}
                      />
                      <span className={style["slider"]}></span>
                    </label>
                    <CardMenu
                      onView={() => handleView(task.id)}
                      onEdit={() => handleEdit(task.id)}
                      onCopy={() => handleCopy(task.id)}
                      onDelete={() => handleDelete(task.id)}
                    />
                  </div>
                </div>

                <div className={style["task-info"]}>
                  <div className={style["info-section"]}>
                    <div className={style["info-item"]}>
                      <span className={style["info-label"]}>执行设备：</span>
            <span className={style["info-value"]}>{task.deviceCount} 个</span>
                    </div>
                    <div className={style["info-item"]}>
                      <span className={style["info-label"]}>目标人群：</span>
            <span className={style["info-value"]}>{task.targetGroup}</span>
                    </div>
                  </div>
                  <div className={style["info-section"]}>
                    <div className={style["info-item"]}>
                      <span className={style["info-label"]}>点赞间隔：</span>
                      <span className={style["info-value"]}>
                        {task.likeInterval} 秒
                      </span>
                    </div>
                    <div className={style["info-item"]}>
                      <span className={style["info-label"]}>每日上限：</span>
                      <span className={style["info-value"]}>
                        {task.maxLikesPerDay} 次
                      </span>
                    </div>
                  </div>
                </div>

                <div className={style["task-stats"]}>
                  <div className={style["stats-item"]}>
                    <LikeOutlined
                      className={`${style["stats-icon"]} ${style["blue"]}`}
                    />
                    <span className={style["stats-label"]}>今日点赞：</span>
                    <span className={style["stats-value"]}>
                      {task.todayLikeCount || 0}
                    </span>
                  </div>
                  <div className={style["stats-item"]}>
                    <LikeOutlined
                      className={`${style["stats-icon"]} ${style["green"]}`}
                    />
                    <span className={style["stats-label"]}>总点赞数：</span>
                    <span className={style["stats-value"]}>
                      {task.totalLikeCount || 0}
                    </span>
                  </div>
                </div>
              </Card>
  );

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className={style["task-list"]}>
        <div className={style["loading"]}>
          <SpinLoading color="primary" />
          <div className={style["loading-text"]}>加载中...</div>
        </div>
      </div>
    );
  } else if (filteredTasks.length === 0) {
    content = (
      <div className={style["task-list"]}>
        <div className={style["empty-state"]}>
          <div className={style["empty-icon"]}>
            <LikeOutlined />
          </div>
          <div className={style["empty-text"]}>暂无自动点赞任务</div>
          <div className={style["empty-subtext"]}>
            点击右上角按钮创建新任务
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        {globalTasks.length > 0 && (
          <div className={style["info-box"]}>
            全局计划将应用于所有设备（包括新添加的设备），请谨慎配置点赞频率和数量，避免账号风险。
          </div>
        )}

        {globalTasks.length > 0 && (
          <section className={style["section"]}>
            <h3 className={style["section-title"]}>
              <span className={style["section-dot"]} />
              全局自动点赞计划
            </h3>
            <div className={style["plan-list-group"]}>
              {globalTasks.map(renderTaskCard)}
            </div>
          </section>
        )}

        {independentTasks.length > 0 && (
          <section className={style["section"]}>
            <h3
              className={`${style["section-title"]} ${style["section-title-independent"]}`}
            >
              <span className={style["section-dot"]} />
              独立自动点赞计划
            </h3>
            <div className={style["plan-list-group"]}>
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
            title="自动点赞"
            backFn={() => navigate("/workspace")}
            right={
              <Button size="small" color="primary" onClick={handleCreateNew}>
                <PlusOutlined /> 新建计划
              </Button>
            }
          />

          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索计划名称"
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
    >
      <div className={style["auto-like-page"]}>{content}</div>
    </Layout>
  );
};

export default AutoLike;
