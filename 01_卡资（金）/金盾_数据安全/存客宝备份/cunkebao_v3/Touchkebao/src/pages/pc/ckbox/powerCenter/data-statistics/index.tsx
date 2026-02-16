import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, Button, Progress, Tag } from "antd";
import {
  BarChartOutlined,
  EyeOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import PowerNavigation from "@/components/PowerNavtion";
import Layout from "@/components/Layout/LayoutFiexd";
import styles from "./index.module.scss";
import { kpiData, dialogueGroupData, timeRangeOptions } from "./index.data";

const DataStatistics: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("7days");
  const [dialogueGroup, setDialogueGroup] = useState("all");
  const [activeTab, setActiveTab] = useState("comparison");

  // 获取KPI图标和背景色
  const getKpiConfig = (id: string) => {
    switch (id) {
      case "reach-rate":
        return {
          icon: <EyeOutlined style={{ fontSize: 20 }} />,
          bgColor: "#1890ff",
        };
      case "reply-rate":
        return {
          icon: <MessageOutlined style={{ fontSize: 20 }} />,
          bgColor: "#52c41a",
        };
      case "avg-reply-time":
        return {
          icon: <ClockCircleOutlined style={{ fontSize: 20 }} />,
          bgColor: "#722ed1",
        };
      case "link-click-rate":
        return {
          icon: <ThunderboltOutlined style={{ fontSize: 20 }} />,
          bgColor: "#ff7a00",
        };
      default:
        return {
          icon: null,
          bgColor: "#1890ff",
        };
    }
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "优秀":
        return "green";
      case "良好":
        return "blue";
      case "一般":
        return "orange";
      default:
        return "default";
    }
  };

  // 处理生成报告
  const handleGenerateReport = () => {
    console.log("生成报告", { timeRange, dialogueGroup });
    // TODO: 实现生成报告功能
  };

  return (
    <Layout
      header={
        <div style={{ padding: "20px" }}>
          <PowerNavigation
            title="数据统计"
            subtitle="推送效果分析与话术优化建议"
            showBackButton={true}
            backButtonText="返回"
            onBackClick={() => navigate("/pc/powerCenter/message-push-assistant")}
          />
        </div>
      }
      footer={null}
    >
      <div className={styles.container}>
        {/* 筛选和操作区域 */}
        <div className={styles.filterSection}>
          <div className={styles.filterLeft}>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>时间范围</span>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                className={styles.filterSelect}
                options={timeRangeOptions}
              />
            </div>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>话术组筛选</span>
              <Select
                value={dialogueGroup}
                onChange={setDialogueGroup}
                className={styles.filterSelect}
                options={[
                  { label: "全部话术组", value: "all" },
                  { label: "话术组 1", value: "group1" },
                  { label: "话术组 2", value: "group2" },
                  { label: "话术组 3", value: "group3" },
                ]}
              />
            </div>
          </div>
          <div className={styles.filterRight}>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              onClick={handleGenerateReport}
              className={styles.generateReportBtn}
            >
              生成报告
            </Button>
          </div>
        </div>

        {/* KPI统计卡片区域 */}
        <div className={styles.kpiSection}>
          <div className={styles.kpiGrid}>
            {kpiData.map(kpi => {
              const kpiConfig = getKpiConfig(kpi.id);
              return (
                <div key={kpi.id} className={styles.kpiCard}>
                  <div className={styles.kpiContentWrapper}>
                    <div className={styles.kpiContent}>
                      <div className={styles.kpiValue}>{kpi.value}</div>
                      <div className={styles.kpiLabel}>{kpi.label}</div>
                      {kpi.trend && (
                        <div className={styles.kpiTrend}>
                          {kpi.trend.direction === "up" ? (
                            <ArrowUpOutlined className={styles.trendIconUp} />
                          ) : (
                            <ArrowDownOutlined className={styles.trendIconDown} />
                          )}
                          <span className={styles.trendText}>{kpi.trend.text}</span>
                        </div>
                      )}
                      {kpi.subtitle && (
                        <div className={styles.kpiSubtitle}>{kpi.subtitle}</div>
                      )}
                    </div>
                    <div
                      className={styles.kpiIcon}
                      style={{
                        backgroundColor: kpiConfig.bgColor,
                        color: "#fff",
                      }}
                    >
                      {kpiConfig.icon}
                    </div>
                  </div>
                </div>
            );
            })}
          </div>
        </div>

        {/* 标签页导航 */}
        <div className={styles.tabsSection}>
          <div className={styles.tabs}>
            <div
              className={`${styles.tab} ${
                activeTab === "comparison" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("comparison")}
            >
              话术组对比
            </div>
            <div
              className={`${styles.tab} ${
                activeTab === "time" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("time")}
            >
              时段分析
            </div>
            <div
              className={`${styles.tab} ${
                activeTab === "depth" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("depth")}
            >
              互动深度
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={styles.contentSection}>
          {activeTab === "comparison" && (
            <div className={styles.comparisonContent}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>话术组效果对比</h3>
                <p className={styles.sectionSubtitle}>
                  对比不同话术组的推送效果,找出表现最佳的话术
                </p>
              </div>
              <div className={styles.dialogueGroupList}>
                {dialogueGroupData.map((group, index) => (
                  <div key={index} className={styles.dialogueGroupCard}>
                    <div className={styles.groupHeader}>
                      <div className={styles.groupTitle}>
                        <span>话术组 {index + 1}</span>
                        <Tag color={getStatusColor(group.status)} className={styles.statusTag}>
                          {group.status}
                        </Tag>
                      </div>
                      <div className={styles.pushCount}>
                        推送 {group.pushCount}次
                      </div>
                    </div>
                    <div className={styles.metricsList}>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>触达率</span>
                        <div className={styles.metricValue}>
                          <span className={styles.metricPercent}>{group.reachRate}%</span>
                          <Progress
                            percent={group.reachRate}
                            showInfo={false}
                            strokeColor="#1890ff"
                            className={styles.metricProgress}
                          />
                        </div>
                      </div>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>回复率</span>
                        <div className={styles.metricValue}>
                          <span className={styles.metricPercent}>{group.replyRate}%</span>
                          <Progress
                            percent={group.replyRate}
                            showInfo={false}
                            strokeColor="#1890ff"
                            className={styles.metricProgress}
                          />
                        </div>
                      </div>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>点击率</span>
                        <div className={styles.metricValue}>
                          <span className={styles.metricPercent}>{group.clickRate}%</span>
                          <Progress
                            percent={group.clickRate}
                            showInfo={false}
                            strokeColor="#1890ff"
                            className={styles.metricProgress}
                          />
                        </div>
                      </div>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>转化率</span>
                        <div className={styles.metricValue}>
                          <span className={styles.metricPercent}>{group.conversionRate}%</span>
                          <Progress
                            percent={group.conversionRate}
                            showInfo={false}
                            strokeColor="#1890ff"
                            className={styles.metricProgress}
                          />
                        </div>
                      </div>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>平均回复时间</span>
                        <div className={styles.metricValue}>
                          <span className={styles.metricTime}>{group.avgReplyTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "time" && (
            <div className={styles.timeAnalysisContent}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>时段分析</h3>
                <p className={styles.sectionSubtitle}>
                  分析不同时段的推送效果，优化推送时间策略
                </p>
              </div>
              <div className={styles.placeholder}>
                <p>时段分析功能开发中...</p>
              </div>
            </div>
          )}

          {activeTab === "depth" && (
            <div className={styles.depthAnalysisContent}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>互动深度</h3>
                <p className={styles.sectionSubtitle}>
                  分析用户互动深度，优化推送内容策略
                </p>
              </div>
              <div className={styles.placeholder}>
                <p>互动深度分析功能开发中...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DataStatistics;
