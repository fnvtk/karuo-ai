import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Popover, Toast } from "antd-mobile";
import { Input, Switch, Pagination } from "antd";
import {
  MoreOutline,
  AddCircleOutline,
  UserAddOutline,
  ClockCircleOutline,
} from "antd-mobile-icons";

import {
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  getAutoGroupList,
  copyAutoGroupTask,
  deleteAutoGroupTask,
} from "./api";
import { comfirm } from "@/utils/common";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import NavCommon from "@/components/NavCommon";

interface GroupTask {
  id: string;
  name: string;
  status: number; // 1 开启, 0 关闭
  deviceCount?: number;
  targetFriends?: number;
  createdGroups?: number;
  lastCreateTime?: string;
  createTime?: string;
  creator?: string;
  createInterval?: number;
  maxGroupsPerDay?: number;
  timeRange?: { start: string; end: string };
  groupSize?: { min: number; max: number };
  targetTags?: string[];
  groupNameTemplate?: string;
  groupDescription?: string;
}

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return style.statusRunning;
    case 0:
      return style.statusPaused;
    default:
      return style.statusPaused;
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "开启";
    case 0:
      return "关闭";
    default:
      return "关闭";
  }
};

const AutoGroupList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshTasks = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const res: any = await getAutoGroupList({ type: 4, page: p, limit: ps });
      // 兼容不同返回结构
      const list = res?.list || res?.records || res?.data || [];
      const totalCount = res?.total || res?.totalCount || list.length;
      const normalized: GroupTask[] = (list as any[]).map(item => ({
        id: String(item.id),
        name: item.name,
        status: Number(item.status) === 1 ? 1 : 0,
        deviceCount: Array.isArray(item.config?.devices)
          ? item.config.devices.length
          : 0,
        maxGroupsPerDay: item.config?.maxGroupsPerDay ?? 0,
        timeRange: {
          start: item.config?.startTime ?? "-",
          end: item.config?.endTime ?? "-",
        },
        groupSize: {
          min: item.config?.groupSizeMin ?? 0,
          max: item.config?.groupSizeMax ?? 0,
        },
        creator: item.creatorName ?? "",
        createTime: item.createTime ?? "",
        lastCreateTime: item.updateTime ?? "",
      }));
      setTasks(normalized);
      setTotal(totalCount);
    } catch (e) {
      Toast.show({ content: "获取列表失败" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTasks(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (taskId: string) => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) return;

    try {
      await comfirm("确定要删除吗？", {
        title: "删除确认",
        cancelText: "取消",
        confirmText: "删除",
      });

      await deleteAutoGroupTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      Toast.show({ content: "删除成功" });
    } catch (error) {
      // 用户取消删除或删除失败
      if (error !== "cancel") {
        Toast.show({ content: "删除失败" });
      }
    }
  };
  const handleEdit = (taskId: string) => {
    navigate(`/workspace/auto-group/${taskId}/edit`);
  };

  const handleView = (taskId: string) => {
    navigate(`/workspace/auto-group/${taskId}`);
  };

  // 复制任务
  const handleCopy = async (id: string) => {
    try {
      await copyAutoGroupTask(id);
      Toast.show({
        content: "复制成功",
        position: "top",
      });
      refreshTasks(); // 重新获取列表
    } catch (error) {
      Toast.show({
        content: "复制失败",
        position: "top",
      });
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 1 ? 0 : 1,
            }
          : task,
      ),
    );
    Toast.show({ content: "状态已切换" });
  };

  const handleCreateNew = () => {
    navigate("/workspace/auto-group/new");
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="自动建群"
            backFn={() => navigate("/workspace")}
            right={
              <Button size="small" color="primary" onClick={handleCreateNew}>
                <PlusOutlined /> 新建任务
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
              onClick={() => refreshTasks()}
              loading={false}
              className="refresh-btn"
            >
              <ReloadOutlined />
            </Button>
          </div>
        </>
      }
      footer={
        <div className="pagination-container">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps);
              refreshTasks(p, ps);
            }}
            showSizeChanger
            showTotal={t => `共 ${t} 条`}
          />
        </div>
      }
      loading={loading}
    >
      <div className={style.autoGroupList}>
        <div className={style.taskList}>
          {filteredTasks.length === 0 ? (
            <Card className={style.emptyCard}>
              <UserAddOutline style={{ fontSize: 48, color: "#ccc" }} />
              <div className={style.emptyTitle}>暂无建群任务</div>
              <div className={style.emptyDesc}>创建您的第一个自动建群任务</div>
              <Button color="primary" onClick={handleCreateNew}>
                <AddCircleOutline /> 创建第一个任务
              </Button>
            </Card>
          ) : (
            filteredTasks.map(task => (
              <Card key={task.id} className={style.taskCard}>
                <div className={style.taskHeader}>
                  <div className={style.taskTitle}>{task.name}</div>
                  <span className={getStatusColor(task.status)}>
                    {getStatusText(task.status)}
                  </span>
                  <Switch
                    checked={task.status === 1}
                    onChange={() => toggleTaskStatus(task.id)}
                    disabled={false}
                    style={{ marginLeft: 8 }}
                  />
                  <Popover
                    content={
                      <div>
                        <div
                          className={style.menuItem}
                          onClick={() => handleView(task.id)}
                        >
                          查看
                        </div>
                        <div
                          className={style.menuItem}
                          onClick={() => handleEdit(task.id)}
                        >
                          编辑
                        </div>
                        <div
                          className={style.menuItem}
                          onClick={() => handleCopy(task.id)}
                        >
                          复制
                        </div>
                        <div
                          className={style.menuItemDanger}
                          onClick={() => handleDelete(task.id)}
                        >
                          删除
                        </div>
                      </div>
                    }
                    trigger="click"
                  >
                    <MoreOutline style={{ fontSize: 20, marginLeft: 8 }} />
                  </Popover>
                </div>
                <div className={style.taskInfoGrid}>
                  <div>
                    <div className={style.infoLabel}>执行设备</div>
                    <div className={style.infoValue}>
                      {task.deviceCount ?? 0} 个
                    </div>
                  </div>
                  {/* 该字段暂无，预留位 */}
                  <div>
                    <div className={style.infoLabel}>时间段</div>
                    <div className={style.infoValue}>
                      {task.timeRange?.start} - {task.timeRange?.end}
                    </div>
                  </div>
                  <div>
                    <div className={style.infoLabel}>单日上限</div>
                    <div className={style.infoValue}>
                      {task.maxGroupsPerDay ?? 0} 个
                    </div>
                  </div>
                  <div>
                    <div className={style.infoLabel}>创建人</div>
                    <div className={style.infoValue}>{task.creator ?? ""}</div>
                  </div>
                </div>
                <div className={style.taskFooter}>
                  <div className={style.footerLeft}>
                    <ClockCircleOutline style={{ marginRight: 4 }} />
                    更新时间：{task.lastCreateTime}
                  </div>
                  <div className={style.footerRight}>
                    创建时间：{task.createTime}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AutoGroupList;
