import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Select, Tag, Button, Pagination, message } from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import PowerNavigation from "@/components/PowerNavtion";
import Layout from "@/components/Layout/LayoutFiexd";
import { getPushHistory } from "./api";
import styles from "./index.module.scss";

const { Option } = Select;

// 推送类型代码枚举
export enum PushTypeCode {
  FRIEND = "friend", // 好友消息
  GROUP = "group", // 群消息
  ANNOUNCEMENT = "announcement", // 群公告
}

// 推送状态枚举
export enum PushStatus {
  PENDING = "pending", // 进行中
  COMPLETED = "completed", // 已完成
  FAILED = "failed", // 失败
}

// 推送历史记录接口
export interface PushHistoryRecord {
  workbenchId: number;
  taskName: string;
  pushType: string; // 推送类型中文名称，如 "好友消息"
  pushTypeCode: string; // 推送类型代码，如 "friend"
  targetCount: number;
  successCount: number;
  failCount: number;
  status: string; // 状态代码，如 "pending"
  statusText: string; // 状态中文名称，如 "进行中"
  createTime: string;
  contentLibraryName: string; // 内容库名称
}

const PushHistory: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PushHistoryRecord[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取推送历史数据
  const fetchPushHistory = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page: String(page),
        limit: String(pagination.pageSize),
      };

      if (searchValue.trim()) {
        params.keyword = searchValue.trim();
      }

      if (typeFilter !== "all") {
        params.pushTypeCode = typeFilter;
      }

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await getPushHistory(params);
      const result = response?.data ?? response ?? {};

      if (!result || typeof result !== "object") {
        message.error("获取推送历史失败");
        setDataSource([]);
        return;
      }

      const toNumber = (value: unknown, fallback: number) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const list = Array.isArray(result.list) ? result.list : [];
      const total = toNumber(result.total, pagination.total);
      const currentPage = toNumber(result.page, page);
      const pageSize = toNumber(result.pageSize, pagination.pageSize);

      setDataSource(list);
      setPagination(prev => ({
        ...prev,
        current: currentPage,
        pageSize,
        total,
      }));
    } catch (error) {
      console.error("获取推送历史失败:", error);
      message.error("获取推送历史失败，请稍后重试");
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    fetchPushHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchValue(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchPushHistory(1);
  };

  // 类型筛选处理
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    // 延迟执行，等待状态更新
    setTimeout(() => {
      fetchPushHistory(1);
    }, 0);
  };

  // 状态筛选处理
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    // 延迟执行，等待状态更新
    setTimeout(() => {
      fetchPushHistory(1);
    }, 0);
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }));
    fetchPushHistory(page);
  };

  // 查看详情
  const handleViewDetail = (record: PushHistoryRecord) => {
    // TODO: 打开详情弹窗或跳转到详情页
    console.log("查看详情:", record);
    message.info("查看详情功能开发中");
  };

  // 获取推送类型标签
  const getPushTypeTag = (pushType: string, pushTypeCode?: string) => {
    // 优先使用中文名称，如果没有则根据代码映射
    if (pushType) {
      const colorMap: Record<string, string> = {
        好友消息: "#1890ff",
        群消息: "#52c41a",
        群公告: "#722ed1",
      };
      return (
        <Tag
          color={colorMap[pushType] || "#666"}
          style={{ borderRadius: "12px" }}
        >
          {pushType}
        </Tag>
      );
    }
    // 如果没有中文名称，根据代码映射
    const codeMap: Record<string, { text: string; color: string }> = {
      [PushTypeCode.FRIEND]: { text: "好友消息", color: "#1890ff" },
      [PushTypeCode.GROUP]: { text: "群消息", color: "#52c41a" },
      [PushTypeCode.ANNOUNCEMENT]: { text: "群公告", color: "#722ed1" },
    };
    const config =
      pushTypeCode && codeMap[pushTypeCode]
        ? codeMap[pushTypeCode]
        : { text: pushType || "未知", color: "#666" };
    return (
      <Tag color={config.color} style={{ borderRadius: "12px" }}>
        {config.text}
      </Tag>
    );
  };

  // 获取状态标签
  const getStatusTag = (status: string, statusText?: string) => {
    // 优先使用中文状态文本
    const displayText = statusText || status;

    // 根据状态代码或文本匹配
    const statusMap: Record<
      string,
      { text: string; color: string; icon: React.ReactNode }
    > = {
      [PushStatus.COMPLETED]: {
        text: "已完成",
        color: "#52c41a",
        icon: <CheckCircleOutlined />,
      },
      completed: {
        text: "已完成",
        color: "#52c41a",
        icon: <CheckCircleOutlined />,
      },
      [PushStatus.PENDING]: {
        text: "进行中",
        color: "#1890ff",
        icon: <ClockCircleOutlined />,
      },
      pending: {
        text: "进行中",
        color: "#1890ff",
        icon: <ClockCircleOutlined />,
      },
      [PushStatus.FAILED]: {
        text: "失败",
        color: "#ff4d4f",
        icon: <CloseCircleOutlined />,
      },
      failed: {
        text: "失败",
        color: "#ff4d4f",
        icon: <CloseCircleOutlined />,
      },
    };

    // 根据状态文本匹配
    const textMap: Record<
      string,
      { text: string; color: string; icon: React.ReactNode }
    > = {
      已完成: {
        text: "已完成",
        color: "#52c41a",
        icon: <CheckCircleOutlined />,
      },
      进行中: {
        text: "进行中",
        color: "#1890ff",
        icon: <ClockCircleOutlined />,
      },
      失败: {
        text: "失败",
        color: "#ff4d4f",
        icon: <CloseCircleOutlined />,
      },
    };

    const config = textMap[displayText] ||
      statusMap[status] ||
      statusMap[status.toLowerCase()] || {
        text: displayText,
        color: "#666",
        icon: null,
      };

    return (
      <Tag
        color={config.color}
        icon={config.icon}
        style={{
          borderRadius: "12px",
          color: "#fff",
          border: "none",
        }}
      >
        {config.text}
      </Tag>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: "推送类型",
      dataIndex: "pushType",
      key: "pushType",
      width: 120,
      render: (pushType: string, record: PushHistoryRecord) =>
        getPushTypeTag(pushType, record.pushTypeCode),
    },
    {
      title: "任务名称",
      dataIndex: "taskName",
      key: "taskName",
      ellipsis: true,
      render: (text: string) => <span style={{ color: "#333" }}>{text}</span>,
    },
    {
      title: "内容库",
      dataIndex: "contentLibraryName",
      key: "contentLibraryName",
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: "#666", fontSize: "13px" }}>{text || "-"}</span>
      ),
    },
    {
      title: "目标数量",
      dataIndex: "targetCount",
      key: "targetCount",
      width: 100,
      align: "center" as const,
      render: (count: number) => <span>{count}</span>,
    },
    {
      title: "成功数",
      dataIndex: "successCount",
      key: "successCount",
      width: 100,
      align: "center" as const,
      render: (count: number) => (
        <span style={{ color: "#52c41a", fontWeight: 500 }}>{count}</span>
      ),
    },
    {
      title: "失败数",
      dataIndex: "failCount",
      key: "failCount",
      width: 100,
      align: "center" as const,
      render: (count: number) => (
        <span style={{ color: "#ff4d4f", fontWeight: 500 }}>{count}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (status: string, record: PushHistoryRecord) =>
        getStatusTag(status, record.statusText),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (time: string) => (
        <span style={{ color: "#666", fontSize: "13px" }}>{time}</span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      align: "center" as const,
      render: (_: any, record: PushHistoryRecord) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
          style={{ color: "#1890ff" }}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <Layout
      header={
        <div style={{ padding: "20px" }}>
          <PowerNavigation
            title="推送历史"
            subtitle="查看所有推送任务的历史记录"
            showBackButton={true}
            backButtonText="返回"
            onBackClick={() =>
              navigate("/pc/powerCenter/message-push-assistant")
            }
          />
        </div>
      }
      footer={null}
    >
      <div className={styles.pushHistory}>
        {/* 筛选区域 */}
        <div className={styles.filterSection}>
          <div className={styles.filterLeft}>
            <h3 className={styles.tableTitle}>推送历史记录</h3>
          </div>
          <div className={styles.filterRight}>
            <Input
              placeholder="搜索内容"
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onPressEnter={e => handleSearch(e.currentTarget.value)}
              className={styles.searchInput}
              allowClear
            />
            <Select
              value={typeFilter}
              onChange={handleTypeFilterChange}
              className={styles.filterSelect}
              suffixIcon={<span>▼</span>}
            >
              <Option value="all">全部类型</Option>
              <Option value={PushTypeCode.FRIEND}>好友消息</Option>
              <Option value={PushTypeCode.GROUP}>群消息</Option>
              <Option value={PushTypeCode.ANNOUNCEMENT}>群公告</Option>
            </Select>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className={styles.filterSelect}
              suffixIcon={<span>▼</span>}
            >
              <Option value="all">全部状态</Option>
              <Option value={PushStatus.PENDING}>进行中</Option>
              <Option value={PushStatus.COMPLETED}>已完成</Option>
              <Option value={PushStatus.FAILED}>失败</Option>
            </Select>
          </div>
        </div>

        {/* 数据表格 */}
        <div className={styles.tableSection}>
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="workbenchId"
            pagination={false}
            className={styles.dataTable}
          />
        </div>

        {/* 分页组件 */}
        {pagination.total > 0 && (
          <div className={styles.paginationSection}>
            <div className={styles.paginationInfo}>
              共{pagination.total}条记录
            </div>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              showSizeChanger={false}
              showQuickJumper={false}
              className={styles.pagination}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PushHistory;
