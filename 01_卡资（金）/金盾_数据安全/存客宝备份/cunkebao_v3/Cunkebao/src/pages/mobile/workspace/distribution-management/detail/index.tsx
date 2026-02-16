import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, SpinLoading, DatePicker } from "antd-mobile";
import { Button, Input, Select } from "antd";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import {
  TeamOutlined,
  PhoneOutlined,
  WechatOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserAddOutlined,
  WalletOutlined,
  DollarOutlined,
  FilterOutlined,
  DownOutlined,
} from "@ant-design/icons";
import {
  fetchChannelDetail,
  fetchChannelStatistics,
  fetchChannelHomeData,
  fetchRevenueList,
  fetchWithdrawalDetailList,
} from "./api";
import type {
  ChannelDetail,
  ChannelStatistics,
  RevenueRecord,
  RevenueType,
  WithdrawalDetailRecord,
  WithdrawalDetailStatus,
} from "./data";
import styles from "./index.module.scss";

// 格式化金额显示（后端返回的是元，直接格式化即可）
const formatCurrency = (amount: number): string => {
  if (amount >= 10000) {
    return "¥" + (amount / 10000).toFixed(2) + "万";
  }
  return "¥" + amount.toFixed(2);
};

const ChannelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [channelDetail, setChannelDetail] = useState<ChannelDetail | null>(
    null,
  );
  const [statistics, setStatistics] = useState<ChannelStatistics | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [revenueList, setRevenueList] = useState<RevenueRecord[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueType, setRevenueType] = useState<RevenueType>("all");
  const [revenueDate, setRevenueDate] = useState<Date | null>(null);
  const [showRevenueDatePicker, setShowRevenueDatePicker] = useState(false);
  const [revenuePage, setRevenuePage] = useState(1);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [withdrawalDetailList, setWithdrawalDetailList] = useState<
    WithdrawalDetailRecord[]
  >([]);
  const [withdrawalDetailLoading, setWithdrawalDetailLoading] =
    useState(false);
  const [withdrawalDetailStatus, setWithdrawalDetailStatus] =
    useState<WithdrawalDetailStatus>("all");
  const [withdrawalDetailDate, setWithdrawalDetailDate] = useState<Date | null>(
    null,
  );
  const [showWithdrawalDetailDatePicker, setShowWithdrawalDetailDatePicker] =
    useState(false);
  const [withdrawalDetailPage, setWithdrawalDetailPage] = useState(1);
  const [withdrawalDetailTotal, setWithdrawalDetailTotal] = useState(0);

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === "revenue") {
      loadRevenueList();
    } else if (id && activeTab === "withdrawal") {
      loadWithdrawalDetailList();
    }
  }, [
    id,
    activeTab,
    revenueType,
    revenueDate,
    revenuePage,
    withdrawalDetailStatus,
    withdrawalDetailDate, // 恢复日期筛选依赖
    withdrawalDetailPage,
  ]);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 路由参数 id 实际上就是 channelCode（对应列表的 code）
      // 使用同一个接口同时获取详情和统计数据，只调用一次接口
      const homeData = await fetchChannelHomeData(id);

      // 设置渠道详情
      setChannelDetail({
        id: homeData.channelInfo.channelCode,
        name: homeData.channelInfo.channelName,
        code: homeData.channelInfo.channelCode,
        phone: homeData.channelInfo.phone,
        wechatId: homeData.channelInfo.wechatId,
        createType: homeData.channelInfo.createType,
        remark: homeData.channelInfo.remark,
        createTime: homeData.channelInfo.createTime,
      });

      // 设置统计数据
      setStatistics({
        totalFriends: homeData.customerStats.totalFriends,
        todayFriends: homeData.customerStats.todayFriends,
        totalCustomers: homeData.customerStats.totalCustomers,
        todayCustomers: homeData.customerStats.todayCustomers,
        totalRevenue: homeData.financialStats.totalRevenue,
        pendingWithdrawal: homeData.financialStats.withdrawableAmount,
        pendingReview: homeData.financialStats.pendingReview,
        withdrawn: homeData.financialStats.withdrawn,
      });
    } catch (e) {
      // 处理错误
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueList = async () => {
    if (!id) return;
    setRevenueLoading(true);
    try {
      const res = await fetchRevenueList({
        channelCode: id, // 使用 channelCode，路由参数 id 就是 channelCode
        page: revenuePage,
        limit: 10,
        type: revenueType,
        date: revenueDate
          ? `${revenueDate.getFullYear()}-${String(
              revenueDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(revenueDate.getDate()).padStart(2, "0")}`
          : undefined,
      });
      setRevenueList(res.list);
      setRevenueTotal(res.total);
    } catch (e) {
      // 处理错误
    } finally {
      setRevenueLoading(false);
    }
  };

  const loadWithdrawalDetailList = async () => {
    if (!id) return;
    setWithdrawalDetailLoading(true);
    try {
      const res = await fetchWithdrawalDetailList({
        channelCode: id, // 使用 channelCode，路由参数 id 就是 channelCode
        page: withdrawalDetailPage,
        limit: 10,
        status: withdrawalDetailStatus,
        payType: "all", // 暂时默认 all，如果后续需要添加 payType 筛选，可以添加状态
        date: withdrawalDetailDate
          ? `${withdrawalDetailDate.getFullYear()}-${String(
              withdrawalDetailDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(
              withdrawalDetailDate.getDate(),
            ).padStart(2, "0")}`
          : undefined,
      });
      setWithdrawalDetailList(res.list);
      setWithdrawalDetailTotal(res.total);
    } catch (e) {
      // 处理错误
    } finally {
      setWithdrawalDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout
        header={
          <NavCommon
            left={<></>}
            title="分销客户详情"
          />
        }
      >
        <div className={styles.loadingContainer}>
          <SpinLoading color="primary" />
        </div>
      </Layout>
    );
  }

  if (!channelDetail || !statistics) {
    return (
      <Layout
        header={
          <NavCommon
            left={<></>}
            title="分销客户详情"
          />
        }
      >
        <div className={styles.errorContainer}>
          <p>渠道不存在</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { key: "overview", title: "概览" },
    { key: "revenue", title: "收益明细" },
    { key: "withdrawal", title: "提现明细" },
  ];

  return (
    <Layout
      header={
        <NavCommon
          left={<></>}
          title={
            <div className={styles.headerTitle}>
              <div className={styles.mainTitle}>分销客户详情</div>
              <div className={styles.subTitle}>渠道信息与统计</div>
            </div>
          }
        />
      }
    >
      <div className={styles.container}>
        {/* 标签页 */}
        <div className={styles.tabsContainer}>
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key)}
            className={styles.tabs}
          >
            {tabs.map(tab => (
              <Tabs.Tab key={tab.key} title={tab.title} />
            ))}
          </Tabs>
        </div>

        {/* 概览标签页内容 */}
        {activeTab === "overview" && (
          <>
            {/* 基本信息 */}
            <div className={styles.basicInfoCard}>
              <div className={styles.basicInfoHeader}>
                <div className={styles.basicInfoTitle}>
                  <TeamOutlined className={styles.basicInfoIcon} />
                  <div>
                    <div className={styles.basicInfoTitleText}>基本信息</div>
                    <div className={styles.basicInfoSubtitle}>
                      渠道详细信息
                    </div>
                  </div>
                </div>
                <span className={styles.createType}>
                  {channelDetail.createType === "manual"
                    ? "手动创建"
                    : "自动创建"}
                </span>
              </div>

              <div className={styles.basicInfoContent}>
                <div className={styles.channelName}>
                  {channelDetail.name}
                </div>

                <div className={styles.channelCodeBox}>
                  {channelDetail.code}
                </div>

                <div className={styles.infoGrid}>
                  <div className={`${styles.infoCard} ${styles.phoneCard}`}>
                    <PhoneOutlined className={styles.infoCardIcon} />
                    <div className={styles.infoCardText}>
                      {channelDetail.phone || "未填写"}
                    </div>
                  </div>

                  <div className={`${styles.infoCard} ${styles.wechatCard}`}>
                    <WechatOutlined className={styles.infoCardIcon} />
                    <div className={styles.infoCardText}>
                      {channelDetail.wechatId || "未填写"}
                    </div>
                  </div>

                  <div className={`${styles.infoCard} ${styles.remarkCard}`}>
                    <FileTextOutlined className={styles.infoCardIcon} />
                    <div className={styles.infoCardText}>
                      {channelDetail.remark || "暂无备注"}
                    </div>
                  </div>

                  <div className={`${styles.infoCard} ${styles.timeCard}`}>
                    <CalendarOutlined className={styles.infoCardIcon} />
                    <div className={styles.infoCardText}>
                      {channelDetail.createTime}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 数据统计 */}
            <div className={styles.statisticsSection}>
              <div className={styles.sectionTitle}>
                <div className={styles.sectionDot}></div>
                <span>数据统计</span>
              </div>

              <div className={styles.statisticsGrid}>
                <div className={`${styles.statCard} ${styles.blueCard}`}>
                  <UserAddOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>{statistics.totalFriends}</div>
                  <div className={styles.statChange}>
                    今日: {statistics.todayFriends}
                  </div>
                  <div className={styles.statLabel}>总加好友数</div>
                </div>

                <div className={`${styles.statCard} ${styles.greenCard}`}>
                  <TeamOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>{statistics.totalCustomers}</div>
                  <div className={styles.statChange}>
                    今日: {statistics.todayCustomers}
                  </div>
                  <div className={styles.statLabel}>总获客数</div>
                </div>

                <div className={`${styles.statCard} ${styles.purpleCard}`}>
                  <WalletOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>
                    {formatCurrency(statistics.totalRevenue)}
                  </div>
                  <div className={styles.statLabel}>总收益</div>
                </div>

                <div className={`${styles.statCard} ${styles.orangeCard}`}>
                  <DollarOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>
                    {formatCurrency(statistics.pendingWithdrawal)}
                  </div>
                  <div className={styles.statLabel}>待提现</div>
                </div>

                <div className={`${styles.statCard} ${styles.yellowCard}`}>
                  <FileTextOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>
                    {formatCurrency(statistics.pendingReview)}
                  </div>
                  <div className={styles.statLabel}>待审核</div>
                </div>

                <div className={`${styles.statCard} ${styles.greyCard}`}>
                  <WalletOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>
                    {formatCurrency(statistics.withdrawn)}
                  </div>
                  <div className={styles.statLabel}>已提现</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 收益明细标签页内容 */}
        {activeTab === "revenue" && (
          <>
            {/* 筛选条件 */}
            <div className={styles.filterPanel}>
              <div className={styles.filterTitle}>
                <FilterOutlined className={styles.filterIcon} />
                <span>筛选条件</span>
              </div>
              <div className={styles.filterContent}>
                <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>类型</label>
                  <Select
                    value={revenueType}
                    onChange={value => {
                      setRevenueType(value as RevenueType);
                      setRevenuePage(1);
                    }}
                    className={styles.filterSelect}
                    suffixIcon={<DownOutlined />}
                  >
                    <Select.Option value="all">全部</Select.Option>
                    <Select.Option value="addFriend">加好友</Select.Option>
                    <Select.Option value="customer">获客</Select.Option>
                    <Select.Option value="other">其他</Select.Option>
                  </Select>
                </div>

                <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>时间</label>
                  <Input
                    readOnly
                    placeholder="选择日期"
                    value={
                      revenueDate
                        ? `${revenueDate.getFullYear()}-${String(
                            revenueDate.getMonth() + 1,
                          ).padStart(2, "0")}-${String(
                            revenueDate.getDate(),
                          ).padStart(2, "0")}`
                        : ""
                    }
                    onClick={() => setShowRevenueDatePicker(true)}
                    prefix={<CalendarOutlined />}
                    className={styles.filterInput}
                  />
                  <DatePicker
                    visible={showRevenueDatePicker}
                    title="选择日期"
                    value={revenueDate}
                    onClose={() => setShowRevenueDatePicker(false)}
                    onConfirm={val => {
                      setRevenueDate(val);
                      setShowRevenueDatePicker(false);
                      setRevenuePage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 记录统计和列表 */}
            <div className={styles.revenueList}>
              <div className={styles.revenueStats}>
                <span className={styles.revenueTotal}>
                  共 {revenueTotal} 条记录
                </span>
                <span className={styles.revenuePagination}>
                  {revenuePage}/{Math.ceil(revenueTotal / 10)} 条
                </span>
              </div>

              {revenueLoading ? (
                <div className={styles.loadingContainer}>
                  <SpinLoading color="primary" />
                </div>
              ) : revenueList.length === 0 ? (
                <div className={styles.emptyContainer}>暂无收益记录</div>
              ) : (
                revenueList.map(record => (
                  <div key={record.id} className={styles.revenueCard}>
                    <div className={styles.revenueHeader}>
                      <div className={styles.revenueTitle}>{record.title}</div>
                      <div className={styles.revenueType}>
                        {record.type === "addFriend" && (
                          <UserAddOutlined className={styles.revenueTypeIcon} />
                        )}
                        <span>{record.typeLabel}</span>
                      </div>
                    </div>
                    <div className={styles.revenueFooter}>
                      <div className={styles.revenueDate}>
                        <CalendarOutlined className={styles.revenueDateIcon} />
                        <span>{record.date}</span>
                      </div>
                      <div className={styles.revenueAmount}>
                        <span className={styles.revenueAmountLabel}>收益</span>
                        <span className={styles.revenueAmountValue}>
                          {formatCurrency(record.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* 提现明细标签页内容 */}
        {activeTab === "withdrawal" && (
          <>
            {/* 筛选条件 */}
            <div className={styles.filterPanel}>
              <div className={styles.filterTitle}>
                <FilterOutlined className={styles.filterIcon} />
                <span>筛选条件</span>
              </div>
              <div className={styles.filterContent}>
                <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>状态</label>
                  <Select
                    value={withdrawalDetailStatus}
                    onChange={value => {
                      setWithdrawalDetailStatus(value as WithdrawalDetailStatus);
                      setWithdrawalDetailPage(1);
                    }}
                    className={styles.filterSelect}
                    suffixIcon={<DownOutlined />}
                  >
                    <Select.Option value="all">全部</Select.Option>
                    <Select.Option value="pending">待审核</Select.Option>
                    <Select.Option value="approved">已通过</Select.Option>
                    <Select.Option value="rejected">已拒绝</Select.Option>
                    <Select.Option value="paid">已打款</Select.Option>
                  </Select>
                </div>

                <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>时间</label>
                  <Input
                    readOnly
                    placeholder="选择日期"
                    value={
                      withdrawalDetailDate
                        ? `${withdrawalDetailDate.getFullYear()}-${String(
                            withdrawalDetailDate.getMonth() + 1,
                          ).padStart(2, "0")}-${String(
                            withdrawalDetailDate.getDate(),
                          ).padStart(2, "0")}`
                        : ""
                    }
                    onClick={() => setShowWithdrawalDetailDatePicker(true)}
                    prefix={<CalendarOutlined />}
                    className={styles.filterInput}
                  />
                  <DatePicker
                    visible={showWithdrawalDetailDatePicker}
                    title="选择日期"
                    value={withdrawalDetailDate}
                    onClose={() => setShowWithdrawalDetailDatePicker(false)}
                    onConfirm={val => {
                      setWithdrawalDetailDate(val);
                      setShowWithdrawalDetailDatePicker(false);
                      setWithdrawalDetailPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 记录统计和列表 */}
            <div className={styles.withdrawalDetailList}>
              <div className={styles.revenueStats}>
                <span className={styles.revenueTotal}>
                  共 {withdrawalDetailTotal} 条记录
                </span>
                <span className={styles.revenuePagination}>
                  {withdrawalDetailPage}/{Math.ceil(withdrawalDetailTotal / 10)} 条
                </span>
              </div>

              {withdrawalDetailLoading ? (
                <div className={styles.loadingContainer}>
                  <SpinLoading color="primary" />
                </div>
              ) : withdrawalDetailList.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <WalletOutlined />
                  </div>
                  <div className={styles.emptyText}>暂无提现明细</div>
                </div>
              ) : (
                withdrawalDetailList.map(record => (
                  <div key={record.id} className={styles.withdrawalDetailCard}>
                    <div className={styles.withdrawalDetailHeader}>
                      <div className={styles.withdrawalDetailAmount}>
                        {formatCurrency(record.amount)}
                      </div>
                      <span
                        className={`${styles.statusBadge} ${
                          record.status === "pending"
                            ? styles.statusPending
                            : record.status === "approved"
                              ? styles.statusApproved
                              : record.status === "rejected"
                                ? styles.statusRejected
                                : styles.statusPaid
                        }`}
                      >
                        {record.status === "pending"
                          ? "待审核"
                          : record.status === "approved"
                            ? "已通过"
                            : record.status === "rejected"
                              ? "已拒绝"
                              : "已打款"}
                      </span>
                    </div>
                    <div className={styles.withdrawalDetailInfo}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>申请时间:</span>
                        <span className={styles.infoValue}>
                          {record.applyDate}
                        </span>
                      </div>
                      {record.reviewDate && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>审核时间:</span>
                          <span className={styles.infoValue}>
                            {record.reviewDate}
                          </span>
                        </div>
                      )}
                      {record.paidDate && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>打款时间:</span>
                          <span className={styles.infoValue}>
                            {record.paidDate}
                          </span>
                        </div>
                      )}
                      {record.remark && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>备注:</span>
                          <span className={styles.infoValue}>
                            {record.remark}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ChannelDetailPage;
