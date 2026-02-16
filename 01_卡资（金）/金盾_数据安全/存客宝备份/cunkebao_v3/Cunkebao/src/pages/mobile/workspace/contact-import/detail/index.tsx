import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Toast,
  Card,
  Tabs,
  List,
  Tag,
  Space,
  InfiniteScroll,
  PullToRefresh,
  Empty,
  SpinLoading,
} from "antd-mobile";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import {
  fetchContactImportTaskDetail,
  fetchImportRecords,
  triggerImport,
  toggleContactImportTask,
} from "../list/api";
import { ContactImportRecord } from "../list/data";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import style from "./index.module.scss";

const ContactImportDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<any>(null);
  const [records, setRecords] = useState<ContactImportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("info");

  // 获取任务详情
  const loadTaskDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await fetchContactImportTaskDetail(id);
      const data = response?.data || response;
      setTask(data);
    } catch (error) {
      Toast.show({
        content: "获取任务详情失败",
        icon: "fail",
      });
      navigate("/workspace/contact-import/list");
    } finally {
      setLoading(false);
    }
  };

  // 获取导入记录
  const loadRecords = async (pageNum: number = 1, reset: boolean = false) => {
    if (!id) return;

    setRecordsLoading(true);
    try {
      const response = await fetchImportRecords(id, pageNum, 20);
      const data = response?.data || response;
      if (reset) {
        setRecords(data.list || []);
      } else {
        setRecords(prev => [...prev, ...(data.list || [])]);
      }
      setHasMore(data.list.length === 20);
      setPage(pageNum);
    } catch (error) {
      Toast.show({
        content: "获取记录失败",
        icon: "fail",
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  // 切换任务状态
  const handleToggleStatus = async () => {
    if (!task) return;

    try {
      await toggleContactImportTask({
        id: task.id,
        status: task.status === 1 ? 2 : 1,
      });
      Toast.show({
        content: task.status === 1 ? "任务已暂停" : "任务已启动",
        icon: "success",
      });
      loadTaskDetail();
    } catch (error) {
      Toast.show({
        content: "操作失败",
        icon: "fail",
      });
    }
  };

  // 手动触发导入
  const handleTriggerImport = async () => {
    if (!task) return;

    try {
      await triggerImport(task.id);
      Toast.show({
        content: "导入任务已触发",
        icon: "success",
      });
      setTimeout(() => {
        loadTaskDetail();
        loadRecords(1, true);
      }, 1000);
    } catch (error) {
      Toast.show({
        content: "触发失败",
        icon: "fail",
      });
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    await loadTaskDetail();
    if (activeTab === "records") {
      await loadRecords(1, true);
    }
  };

  // 加载更多记录
  const loadMoreRecords = async () => {
    await loadRecords(page + 1);
  };

  // 获取状态文本和颜色
  const getStatusInfo = (status: number) => {
    return status === 1
      ? { text: "运行中", color: "#52c41a" }
      : { text: "已暂停", color: "#faad14" };
  };

  // 获取记录状态图标
  const getRecordStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "failed":
        return <CloseCircleOutlined style={{ color: "#ff4d4f" }} />;
      case "pending":
        return <ClockCircleOutlined style={{ color: "#faad14" }} />;
      default:
        return null;
    }
  };

  // 获取记录状态标签
  const getRecordStatusTag = (status: string) => {
    switch (status) {
      case "success":
        return <Tag color="success">成功</Tag>;
      case "failed":
        return <Tag color="danger">失败</Tag>;
      case "pending":
        return <Tag color="warning">进行中</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  useEffect(() => {
    loadTaskDetail();
  }, [id]);

  useEffect(() => {
    // if (activeTab === "records" && records.length === 0) {
    //   loadRecords(1, true);
    // }
  }, [activeTab]);

  if (loading) {
    return (
      <Layout
        header={
          <NavCommon
            left={
              <Button
                fill="none"
                size="small"
                onClick={() => navigate("/workspace/contact-import/list")}
              >
                返回
              </Button>
            }
            title="任务详情"
          />
        }
      >
        <div className={style.loading}>
          <SpinLoading /> 加载中...
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout
        header={
          <NavCommon
            left={
              <Button
                fill="none"
                size="small"
                onClick={() => navigate("/workspace/contact-import/list")}
              >
                返回
              </Button>
            }
            title="任务详情"
          />
        }
      >
        <div className={style.empty}>
          <Empty description="任务不存在" />
        </div>
      </Layout>
    );
  }

  const statusInfo = getStatusInfo(task.status);

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="任务详情"
            right={
              <Button
                color="primary"
                onClick={() =>
                  navigate(`/workspace/contact-import/form/${task.id}`)
                }
              >
                <EditOutlined /> 编辑
              </Button>
            }
          />
          {/* 任务操作栏 */}
          <Card className={style.actionCard}>
            <div className={style.taskHeader}>
              <div className={style.taskInfo}>
                <div className={style.taskName}>{task.name}</div>
                <div
                  className={style.taskStatus}
                  style={{ color: statusInfo.color }}
                >
                  {statusInfo.text}
                </div>
              </div>
            </div>
            <div className={style.actions}>
              <Button
                onClick={handleToggleStatus}
                color={task.status === 1 ? "warning" : "primary"}
              >
                {task.status === 1 ? (
                  <>
                    <PauseCircleOutlined /> 暂停
                  </>
                ) : (
                  <>
                    <PlayCircleOutlined /> 启动
                  </>
                )}
              </Button>
              <Button
                size="small"
                onClick={handleTriggerImport}
                disabled={task.status !== 1}
              >
                <ReloadOutlined /> 立即导入
              </Button>
            </div>
          </Card>
        </>
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <div className={style.container}>
          {/* 标签页 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className={style.tabs}
          >
            <Tabs.Tab title="任务信息" key="info">
              <div className={style.tabContent}>
                {/* 基本信息 */}
                <Card className={style.infoCard}>
                  <div className={style.cardTitle}>基本信息</div>
                  <div className={style.infoList}>
                    <div className={style.infoItem}>
                      <span className={style.label}>任务名称:</span>
                      <span className={style.value}>{task.name}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>设备组数:</span>
                      <span className={style.value}>
                        {task.deviceGroups?.length || 0}
                      </span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>导入数量:</span>
                      <span className={style.value}>{task.num}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>客户端ID:</span>
                      <span className={style.value}>{task.clientId}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>备注类型:</span>
                      <span className={style.value}>{task.remarkType}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>备注内容:</span>
                      <span className={style.value}>{task.remarkValue}</span>
                    </div>
                  </div>
                </Card>

                {/* 时间配置 */}
                <Card className={style.infoCard}>
                  <div className={style.cardTitle}>时间配置</div>
                  <div className={style.infoList}>
                    <div className={style.infoItem}>
                      <span className={style.label}>开始时间:</span>
                      <span className={style.value}>{task.startTime}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>结束时间:</span>
                      <span className={style.value}>{task.endTime}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>每日最大导入:</span>
                      <span className={style.value}>
                        {task.maxImportsPerDay}
                      </span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>导入间隔:</span>
                      <span className={style.value}>
                        {task.importInterval}分钟
                      </span>
                    </div>
                  </div>
                </Card>

                {/* 统计信息 */}
                <Card className={style.infoCard}>
                  <div className={style.cardTitle}>统计信息</div>
                  <div className={style.infoList}>
                    <div className={style.infoItem}>
                      <span className={style.label}>今日导入:</span>
                      <span className={style.value}>
                        {task.todayImportCount}
                      </span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>总导入数:</span>
                      <span className={style.value}>
                        {task.totalImportCount}
                      </span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>创建时间:</span>
                      <span className={style.value}>{task.createTime}</span>
                    </div>
                    <div className={style.infoItem}>
                      <span className={style.label}>更新时间:</span>
                      <span className={style.value}>{task.updateTime}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </Tabs.Tab>

            <Tabs.Tab title="导入记录" key="records">
              <div className={style.tabContent}>
                {records.length === 0 && !recordsLoading ? (
                  <Empty description="暂无导入记录" />
                ) : (
                  <List className={style.recordList}>
                    {records.map(record => (
                      <List.Item key={record.id} className={style.recordItem}>
                        <div className={style.recordHeader}>
                          <div className={style.recordInfo}>
                            <Space>
                              {getRecordStatusIcon(record.importStatus)}
                              <span className={style.recordDevice}>
                                {record.deviceName}
                              </span>
                              {getRecordStatusTag(record.importStatus)}
                            </Space>
                          </div>
                          <div className={style.recordTime}>
                            {record.createTime}
                          </div>
                        </div>
                        <div className={style.recordContent}>
                          <div className={style.recordDetail}>
                            <span className={style.label}>导入数量:</span>
                            <span className={style.value}>{record.num}</span>
                          </div>
                          <div className={style.recordDetail}>
                            <span className={style.label}>备注:</span>
                            <span className={style.value}>
                              {record.remarkType}: {record.remarkValue}
                            </span>
                          </div>
                          {record.errorMessage && (
                            <div className={style.recordError}>
                              错误信息: {record.errorMessage}
                            </div>
                          )}
                        </div>
                      </List.Item>
                    ))}
                  </List>
                )}

                <InfiniteScroll
                  loadMore={loadMoreRecords}
                  hasMore={hasMore}
                  threshold={10}
                >
                  {recordsLoading && (
                    <div className={style.loadingMore}>
                      <SpinLoading /> 加载中...
                    </div>
                  )}
                </InfiniteScroll>
              </div>
            </Tabs.Tab>
          </Tabs>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default ContactImportDetail;
