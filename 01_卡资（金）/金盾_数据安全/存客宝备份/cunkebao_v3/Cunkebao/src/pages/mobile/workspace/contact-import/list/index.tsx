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
  ContactsOutlined,
} from "@ant-design/icons";

import Layout from "@/components/Layout/Layout";
import {
  fetchContactImportTasks,
  deleteContactImportTask,
  toggleContactImportTask,
  copyContactImportTask,
} from "./api";
import { ContactImportTask } from "./data";
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={style.cardMenu} ref={menuRef}>
      <Button
        size="small"
        fill="none"
        onClick={() => setOpen(!open)}
        className={style.menuButton}
      >
        <MoreOutlined />
      </Button>
      {open && (
        <div className={style.menuDropdown}>
          <div className={style.menuItem} onClick={onView}>
            <EyeOutlined /> 查看
          </div>
          <div className={style.menuItem} onClick={onEdit}>
            <EditOutlined /> 编辑
          </div>
          <div className={style.menuItem} onClick={onCopy}>
            <CopyOutlined /> 复制
          </div>
          <div className={style.menuItem} onClick={onDelete}>
            <DeleteOutlined /> 删除
          </div>
        </div>
      )}
    </div>
  );
};

const ContactImport: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ContactImportTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<ContactImportTask[]>([]);

  // 获取任务列表
  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await fetchContactImportTasks();
      const data: ContactImportTask[] = response?.list || [];
      const normalized = data.map(task => ({
        ...task,
        planType: task.config?.planType ?? (task as any).planType ?? 1,
      }));
      setTasks(normalized);
      setFilteredTasks(normalized);
    } catch (error) {
      Toast.show({
        content: "获取任务列表失败",
        icon: "fail",
      });
    } finally {
      setLoading(false);
    }
  };

  // 搜索过滤
  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    if (!keyword.trim()) {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter(
        task =>
          task.name.toLowerCase().includes(keyword.toLowerCase()) ||
          (task.config?.remark || "")
            .toLowerCase()
            .includes(keyword.toLowerCase()) ||
          task.creatorName.toLowerCase().includes(keyword.toLowerCase()),
      );
      setFilteredTasks(filtered);
    }
  };

  // 删除任务
  const handleDelete = async (id: number) => {
    const result = await Dialog.confirm({
      content: "确定要删除这个通讯录导入任务吗？",
    });
    if (result) {
      try {
        await deleteContactImportTask(id);
        Toast.show({
          content: "删除成功",
          icon: "success",
        });
        loadTasks();
      } catch (error) {
        Toast.show({
          content: "删除失败",
          icon: "fail",
        });
      }
    }
  };

  // 切换任务状态
  const handleToggleStatus = async (task: ContactImportTask) => {
    try {
      await toggleContactImportTask({
        id: task.id,
        status: task.status === 1 ? 2 : 1,
      });
      Toast.show({
        content: task.status === 1 ? "任务已暂停" : "任务已启动",
        icon: "success",
      });
      loadTasks();
    } catch (error) {
      Toast.show({
        content: "操作失败",
        icon: "fail",
      });
    }
  };

  // 复制任务
  const handleCopy = async (id: number) => {
    try {
      await copyContactImportTask(id);
      Toast.show({
        content: "复制成功",
        icon: "success",
      });
      loadTasks();
    } catch (error) {
      Toast.show({
        content: "复制失败",
        icon: "fail",
      });
    }
  };

  // 查看详情
  const handleView = (id: number) => {
    navigate(`/workspace/contact-import/detail/${id}`);
  };

  // 编辑任务
  const handleEdit = (id: number) => {
    navigate(`/workspace/contact-import/form/${id}`);
  };

  // 格式化状态文本
  const getStatusText = (status: number) => {
    return status === 1 ? "运行中" : "已暂停";
  };

  // 格式化状态颜色
  const getStatusColor = (status: number) => {
    return status === 1 ? "#52c41a" : "#faad14";
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const globalTasks = filteredTasks.filter(task => (task as any).planType === 0);
  const independentTasks = filteredTasks.filter(
    task => (task as any).planType !== 0,
  );

  return (
    <Layout
      header={
        <>
          <NavCommon
            backFn={() => navigate("/workspace")}
            title="通讯录导入"
            right={
              <Button
                size="small"
                color="primary"
                onClick={() => navigate("/workspace/contact-import/form")}
              >
                <PlusOutlined /> 新建
              </Button>
            }
          />
          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索计划名称"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              size="small"
              onClick={() => handleSearch(searchKeyword)}
              loading={loading}
              className="refresh-btn"
            >
              <ReloadOutlined />
            </Button>
          </div>
        </>
      }
    >
        <div className={style.container}>
          {/* 任务列表 */}
          <div className={style.taskList}>
            {loading ? (
              <div className={style.loading}>
                <SpinLoading /> 加载中...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className={style.empty}>
                <ContactsOutlined className={style.emptyIcon} />
                <div className={style.emptyText}>
                  {searchKeyword ? "未找到相关任务" : "暂无通讯录导入任务"}
                </div>
                {!searchKeyword && (
                  <Button
                    color="primary"
                    size="small"
                    onClick={() => navigate("/workspace/contact-import/form")}
                  >
                    <PlusOutlined /> 创建第一个任务
                  </Button>
                )}
              </div>
            ) : (
              <>
                {globalTasks.length > 0 && (
                  <div className={style.infoBox}>
                    全局通讯录导入计划将作用于所有设备，请谨慎配置导入数量与时间。
                  </div>
                )}

                {globalTasks.length > 0 && (
                  <section className={style.section}>
                    <h3 className={style.sectionTitle}>
                      <span className={style.sectionDot} />
                      全局通讯录导入计划
                    </h3>
                    <div className={style.planListGroup}>
                      {globalTasks.map(task => (
                        <Card key={task.id} className={style.taskCard}>
                          <div className={style.cardHeader}>
                            <div className={style.taskInfo}>
                              <div className={style.taskName}>{task.name}</div>
                              <div
                                className={style.taskStatus}
                                style={{ color: getStatusColor(task.status) }}
                              >
                                {getStatusText(task.status)}
                              </div>
                            </div>
                            <CardMenu
                              onView={() => handleView(task.id)}
                              onEdit={() => handleEdit(task.id)}
                              onCopy={() => handleCopy(task.id)}
                              onDelete={() => handleDelete(task.id)}
                            />
                          </div>
                          <div className={style.cardContent}>
                            <div className={style.taskDetail}>
                              <span className={style.label}>备注类型:</span>
                              <span className={style.value}>
                                {task.config?.remarkType === 1 ? "自定义备注" : "其他"}
                              </span>
                            </div>
                            <div className={style.taskDetail}>
                              <span className={style.label}>设备数量:</span>
                              <span className={style.value}>
                                {task.config?.devices?.length || 0}
                              </span>
                            </div>
                            <div className={style.taskDetail}>
                              <span className={style.label}>导入数量:</span>
                              <span className={style.value}>
                                {task.config?.num || 0}
                              </span>
                            </div>
                            <div className={style.taskDetail}>
                              <span className={style.label}>创建时间:</span>
                              <span className={style.value}>{task.createTime}</span>
                            </div>
                          </div>
                          <div className={style.cardActions}>
                            <Button
                              size="small"
                              fill="none"
                              onClick={() => handleToggleStatus(task)}
                            >
                              {task.status === 1 ? "暂停" : "启动"}
                            </Button>
                            <Button
                              size="small"
                              fill="none"
                              onClick={() => handleView(task.id)}
                            >
                              查看记录
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {independentTasks.length > 0 && (
                  <section className={style.section}>
                    <h3 className={`${style.sectionTitle} ${style.sectionTitleIndependent}`}>
                      <span className={style.sectionDot} />
                      独立通讯录导入计划
                    </h3>
                    <div className={style.planListGroup}>
                      {independentTasks.map(task => (
                        <Card key={task.id} className={style.taskCard}>
                          <div className={style.cardHeader}>
                            <div className={style.taskInfo}>
                              <div className={style.taskName}>{task.name}</div>
                              <div
                                className={style.taskStatus}
                                style={{ color: getStatusColor(task.status) }}
                              >
                                {getStatusText(task.status)}
                              </div>
                            </div>
                            <CardMenu
                              onView={() => handleView(task.id)}
                              onEdit={() => handleEdit(task.id)}
                              onCopy={() => handleCopy(task.id)}
                              onDelete={() => handleDelete(task.id)}
                            />
                          </div>
                          <div className={style.cardContent}>
                            <div className={style.taskDetail}>
                              <span className={style.label}>备注类型:</span>
                              <span className={style.value}>
                                {task.config?.remarkType === 1 ? "自定义备注" : "其他"}
                              </span>
                            </div>
                            <div className={style.taskDetail}>
                              <span className={style.label}>设备数量:</span>
                              <span className={style.value}>
                                {task.config?.devices?.length || 0}
                              </span>
                            </div>
                            <div className={style.taskDetail}>
                              <span className={style.label}>导入数量:</span>
                              <span className={style.value}>
                                {task.config?.num || 0}
                              </span>
                            </div>
                            <div className={style.taskDetail}>
                              <span className={style.label}>创建时间:</span>
                              <span className={style.value}>{task.createTime}</span>
                            </div>
                          </div>
                          <div className={style.cardActions}>
                            <Button
                              size="small"
                              fill="none"
                              onClick={() => handleToggleStatus(task)}
                            >
                              {task.status === 1 ? "暂停" : "启动"}
                            </Button>
                            <Button
                              size="small"
                              fill="none"
                              onClick={() => handleView(task.id)}
                            >
                              查看记录
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
    </Layout>
  );
};

export default ContactImport;
