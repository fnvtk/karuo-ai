import React from "react";
import { Card, Row, Col, Statistic, Progress, Table, Tag } from "antd";
import {
  UserOutlined,
  MessageOutlined,
  TeamOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import styles from "./index.module.scss";

interface DashboardProps {
  // 预留接口属性
}

const Dashboard: React.FC<DashboardProps> = () => {
  // 模拟数据
  const statsData = [
    {
      title: "在线设备数",
      value: 128,
      prefix: <UserOutlined />,
      suffix: "台",
      valueStyle: { color: "#3f8600" },
    },
    {
      title: "今日消息量",
      value: 2456,
      prefix: <MessageOutlined />,
      suffix: "条",
      valueStyle: { color: "#1890ff" },
    },
    {
      title: "活跃群组",
      value: 89,
      prefix: <TeamOutlined />,
      suffix: "个",
      valueStyle: { color: "#722ed1" },
    },
    {
      title: "成功率",
      value: 98.5,
      prefix: <TrophyOutlined />,
      suffix: "%",
      valueStyle: { color: "#f5222d" },
    },
  ];

  const tableColumns = [
    {
      title: "设备名称",
      dataIndex: "deviceName",
      key: "deviceName",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "在线" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "消息数",
      dataIndex: "messageCount",
      key: "messageCount",
    },
    {
      title: "最后活跃时间",
      dataIndex: "lastActive",
      key: "lastActive",
    },
  ];

  const tableData = [
    {
      key: "1",
      deviceName: "设备001",
      status: "在线",
      messageCount: 245,
      lastActive: "2024-01-15 14:30:25",
    },
    {
      key: "2",
      deviceName: "设备002",
      status: "离线",
      messageCount: 156,
      lastActive: "2024-01-15 12:15:10",
    },
    {
      key: "3",
      deviceName: "设备003",
      status: "在线",
      messageCount: 389,
      lastActive: "2024-01-15 14:28:45",
    },
  ];

  // 图表数据
  const lineData = [
    { time: "00:00", value: 120 },
    { time: "02:00", value: 132 },
    { time: "04:00", value: 101 },
    { time: "06:00", value: 134 },
    { time: "08:00", value: 190 },
    { time: "10:00", value: 230 },
    { time: "12:00", value: 210 },
    { time: "14:00", value: 220 },
    { time: "16:00", value: 165 },
    { time: "18:00", value: 127 },
    { time: "20:00", value: 82 },
    { time: "22:00", value: 91 },
  ];

  const columnData = [
    { type: "消息发送", value: 27 },
    { type: "消息接收", value: 25 },
    { type: "群组管理", value: 18 },
    { type: "设备监控", value: 15 },
    { type: "数据同步", value: 10 },
    { type: "其他", value: 5 },
  ];

  const pieData = [
    { type: "在线设备", value: 128 },
    { type: "离线设备", value: 32 },
    { type: "维护中", value: 8 },
  ];

  const areaData = [
    { time: "1月", value: 3000 },
    { time: "2月", value: 4000 },
    { time: "3月", value: 3500 },
    { time: "4月", value: 5000 },
    { time: "5月", value: 4900 },
    { time: "6月", value: 6000 },
  ];

  // ECharts配置
  const lineOption = {
    title: {
      text: "24小时消息趋势",
      left: "center",
      textStyle: {
        color: "#333",
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0,0,0,0.8)",
      textStyle: {
        color: "#fff",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: lineData.map(item => item.time),
      axisLine: {
        lineStyle: {
          color: "#ccc",
        },
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        lineStyle: {
          color: "#ccc",
        },
      },
    },
    series: [
      {
        data: lineData.map(item => item.value),
        type: "line",
        smooth: true,
        lineStyle: {
          color: "#1890ff",
          width: 3,
        },
        itemStyle: {
          color: "#1890ff",
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(24, 144, 255, 0.3)" },
            { offset: 1, color: "rgba(24, 144, 255, 0.1)" },
          ]),
        },
      },
    ],
  };

  const columnOption = {
    title: {
      text: "功能使用分布",
      left: "center",
      textStyle: {
        color: "#333",
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0,0,0,0.8)",
      textStyle: {
        color: "#fff",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: columnData.map(item => item.type),
      axisLabel: {
        rotate: 45,
      },
      axisLine: {
        lineStyle: {
          color: "#ccc",
        },
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        lineStyle: {
          color: "#ccc",
        },
      },
    },
    series: [
      {
        data: columnData.map(item => item.value),
        type: "bar",
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#52c41a" },
            { offset: 1, color: "#389e0d" },
          ]),
        },
      },
    ],
  };

  const pieOption = {
    title: {
      text: "设备状态分布",
      left: "center",
      textStyle: {
        color: "#333",
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(0,0,0,0.8)",
      textStyle: {
        color: "#fff",
      },
    },
    legend: {
      orient: "vertical",
      left: "left",
    },
    series: [
      {
        name: "设备状态",
        type: "pie",
        radius: "50%",
        data: pieData.map(item => ({ name: item.type, value: item.value })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        itemStyle: {
          borderRadius: 5,
          borderColor: "#fff",
          borderWidth: 2,
        },
      },
    ],
  };

  const areaOption = {
    title: {
      text: "月度数据趋势",
      left: "center",
      textStyle: {
        color: "#333",
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0,0,0,0.8)",
      textStyle: {
        color: "#fff",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: areaData.map(item => item.time),
      axisLine: {
        lineStyle: {
          color: "#ccc",
        },
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        lineStyle: {
          color: "#ccc",
        },
      },
    },
    series: [
      {
        data: areaData.map(item => item.value),
        type: "line",
        smooth: true,
        lineStyle: {
          color: "#722ed1",
          width: 3,
        },
        itemStyle: {
          color: "#722ed1",
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(114, 46, 209, 0.6)" },
            { offset: 1, color: "rgba(114, 46, 209, 0.1)" },
          ]),
        },
      },
    ],
  };

  return (
    <div className={styles.monitoring}>
      <div className={styles.header}>
        <h2>数据监控看板</h2>
        <p>实时监控系统运行状态和数据指标</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        {statsData.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card className={styles.statCard}>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                valueStyle={stat.valueStyle}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 进度指标 */}
      <Row gutter={[16, 16]} className={styles.progressRow}>
        <Col xs={24} md={12}>
          <Card title="系统负载" className={styles.progressCard}>
            <div className={styles.progressItem}>
              <span>CPU使用率</span>
              <Progress percent={65} status="active" />
            </div>
            <div className={styles.progressItem}>
              <span>内存使用率</span>
              <Progress percent={45} />
            </div>
            <div className={styles.progressItem}>
              <span>磁盘使用率</span>
              <Progress percent={30} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="实时指标" className={styles.metricsCard}>
            <div className={styles.metricItem}>
              <span>消息处理速度</span>
              <div className={styles.metricValue}>
                <span>1,245</span>
                <ArrowUpOutlined style={{ color: "#3f8600" }} />
              </div>
            </div>
            <div className={styles.metricItem}>
              <span>错误率</span>
              <div className={styles.metricValue}>
                <span>0.2%</span>
                <ArrowDownOutlined style={{ color: "#3f8600" }} />
              </div>
            </div>
            <div className={styles.metricItem}>
              <span>响应时间</span>
              <div className={styles.metricValue}>
                <span>125ms</span>
                <ArrowDownOutlined style={{ color: "#3f8600" }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card className={styles.chartCard}>
            <ReactECharts option={lineOption} style={{ height: "350px" }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className={styles.chartCard}>
            <ReactECharts option={columnOption} style={{ height: "350px" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card className={styles.chartCard}>
            <ReactECharts option={pieOption} style={{ height: "350px" }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className={styles.chartCard}>
            <ReactECharts option={areaOption} style={{ height: "350px" }} />
          </Card>
        </Col>
      </Row>

      {/* 设备状态表格 */}
      <Row className={styles.tableRow}>
        <Col span={24}>
          <Card title="设备状态" className={styles.tableCard}>
            <Table
              columns={tableColumns}
              dataSource={tableData}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
