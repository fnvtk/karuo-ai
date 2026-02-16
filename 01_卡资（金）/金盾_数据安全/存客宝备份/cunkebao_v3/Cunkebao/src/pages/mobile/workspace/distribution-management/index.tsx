import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import {
  Input,
  Button,
  Dropdown,
  Menu,
  message,
  Select,
  Modal,
} from "antd";
import { Tabs, DatePicker, InfiniteScroll, SpinLoading, Popup } from "antd-mobile";
import NavCommon from "@/components/NavCommon";

const { TextArea } = Input;

// 格式化数字显示
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toLocaleString();
};

// 格式化金额显示（后端返回的是分，需要转换为元）
const formatCurrency = (amount: number): string => {
  // 将分转换为元
  const yuan = amount / 100;
  if (yuan >= 10000) {
    return "¥" + (yuan / 10000).toFixed(2) + "万";
  }
  return "¥" + yuan.toFixed(2);
};

// 格式化金额显示（后端返回的已经是元，不需要转换）
const formatCurrencyYuan = (amount: number): string => {
  if (amount >= 10000) {
    return "¥" + (amount / 10000).toFixed(2) + "万";
  }
  return "¥" + amount.toFixed(2);
};
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  LineChartOutlined,
  UserAddOutlined,
  PhoneOutlined,
  WechatOutlined,
  WalletOutlined,
  CheckOutlined,
  CloseOutlined as CloseIcon,
  CalendarOutlined,
  FilterOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  fetchStatistics,
  fetchChannelList,
  createChannel,
  updateChannel,
  deleteChannel,
  toggleChannelStatus,
  fetchFundStatistics,
  fetchChannelEarningsList,
  fetchWithdrawalList,
  reviewWithdrawal,
  markAsPaid,
  generateLoginQRCode,
} from "./api";
import type {
  Channel,
  Statistics,
  TabType,
  FundStatistics,
  ChannelEarnings,
  WithdrawalRequest,
  WithdrawalStatus,
} from "./data";
import AddChannelModal from "./components/AddChannelModal";
import styles from "./index.module.scss";

const DistributionManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("channel");
  const [statistics, setStatistics] = useState<Statistics>({
    totalChannels: 0,
    todayChannels: 0,
    totalCustomers: 0,
    todayCustomers: 0,
    totalFriends: 0,
    todayFriends: 0,
  });
  const [channelList, setChannelList] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [addChannelModalVisible, setAddChannelModalVisible] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<string>("");
  const [rejectingChannelName, setRejectingChannelName] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [markPaidModalVisible, setMarkPaidModalVisible] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string>("");
  const [markingPaidChannelName, setMarkingPaidChannelName] = useState<string>("");
  const [payType, setPayType] = useState<"wechat" | "alipay" | "bankcard">("wechat");
  const [markPaidRemark, setMarkPaidRemark] = useState<string>("");
  const [fundStatistics, setFundStatistics] = useState<FundStatistics>({
    totalExpenditure: 0,
    withdrawn: 0,
    pendingReview: 0,
  });
  const [channelEarningsList, setChannelEarningsList] = useState<
    ChannelEarnings[]
  >([]);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundSearchKeyword, setFundSearchKeyword] = useState("");
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [earningsLoadingMore, setEarningsLoadingMore] = useState(false);
  const [withdrawalList, setWithdrawalList] = useState<WithdrawalRequest[]>([]);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus>(
    "all",
  );
  const [withdrawalDate, setWithdrawalDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [withdrawalKeyword, setWithdrawalKeyword] = useState("");

  // 渠道登录入口二维码相关状态
  const [loginQrVisible, setLoginQrVisible] = useState(false);
  const [loginQrType, setLoginQrType] = useState<"h5" | "miniprogram">("h5");
  const [loginQrLoading, setLoginQrLoading] = useState(false);
  const [loginQrData, setLoginQrData] = useState<{
    qrCode: string;
    url: string;
    type: "h5" | "miniprogram";
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "channel") {
      loadChannelList();
    } else if (activeTab === "fund") {
      // 切换标签页或搜索关键词变化时，重置数据
      setEarningsPage(1);
      setChannelEarningsList([]);
      setEarningsTotal(0);
      loadFundData(true);
    } else if (activeTab === "withdrawal") {
      loadWithdrawalList();
    }
  }, [
    activeTab,
    searchKeyword,
    fundSearchKeyword,
    withdrawalStatus,
    withdrawalDate,
    withdrawalKeyword,
  ]);

  const loadData = async () => {
    try {
      const stats = await fetchStatistics();
      setStatistics(stats);
    } catch (e) {
      message.error("加载统计数据失败");
    }
  };

  // 生成渠道登录二维码（每次调用都重新请求）
  const handleGenerateLoginQRCode = async (type: "h5" | "miniprogram") => {
    setLoginQrLoading(true);
    try {
      const res = await generateLoginQRCode(type);
      setLoginQrData(res);
    } catch (e: any) {
      const errorMsg = e?.message || e?.msg || "生成登录二维码失败";
      message.error(errorMsg);
      setLoginQrData(null);
    } finally {
      setLoginQrLoading(false);
    }
  };

  // 打开登录入口弹窗（默认用当前类型重新请求一次）
  const handleOpenLoginQrDialog = async () => {
    setLoginQrVisible(true);
    setLoginQrData(null);
    await handleGenerateLoginQRCode(loginQrType);
  };

  // 切换登录二维码类型（H5 / 小程序），每次都重新请求接口生成
  const handleLoginQrTypeChange = async (type: "h5" | "miniprogram") => {
    setLoginQrType(type);
    setLoginQrData(null);
    await handleGenerateLoginQRCode(type);
  };

  const loadChannelList = async () => {
    setLoading(true);
    try {
      const res = await fetchChannelList({
        keyword: searchKeyword,
      });
      setChannelList(res.list);
    } catch (e) {
      message.error("加载渠道列表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadFundData = async (reset: boolean = false) => {
    const page = reset ? 1 : earningsPage;
    setFundLoading(true);
    try {
      const [stats, earnings] = await Promise.all([
        fetchFundStatistics(),
        fetchChannelEarningsList({
          page,
          limit: 20,
          keyword: fundSearchKeyword,
        }),
      ]);
      setFundStatistics(stats);
      if (reset) {
        setChannelEarningsList(earnings.list);
        setEarningsPage(2);
      } else {
        setChannelEarningsList(prev => [...prev, ...earnings.list]);
        setEarningsPage(page + 1);
      }
      setEarningsTotal(earnings.total);
    } catch (e) {
      message.error("加载资金统计数据失败");
    } finally {
      setFundLoading(false);
    }
  };

  const loadMoreEarnings = async () => {
    if (earningsLoadingMore || channelEarningsList.length >= earningsTotal) {
      return;
    }
    setEarningsLoadingMore(true);
    try {
      const earnings = await fetchChannelEarningsList({
        page: earningsPage,
        limit: 20,
        keyword: fundSearchKeyword,
      });
      setChannelEarningsList(prev => [...prev, ...earnings.list]);
      setEarningsPage(earningsPage + 1);
      setEarningsTotal(earnings.total);
    } catch (e) {
      message.error("加载更多失败");
    } finally {
      setEarningsLoadingMore(false);
    }
  };

  const loadWithdrawalList = async () => {
    setWithdrawalLoading(true);
    try {
      const res = await fetchWithdrawalList({
        status: withdrawalStatus,
        date: withdrawalDate
          ? `${withdrawalDate.getFullYear()}-${String(
              withdrawalDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(withdrawalDate.getDate()).padStart(
              2,
              "0",
            )}`
          : undefined,
        keyword: withdrawalKeyword,
      });
      setWithdrawalList(res.list);
    } catch (e) {
      message.error("加载提现申请列表失败");
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleReview = async (
    id: string,
    action: "approve" | "reject",
    remark?: string,
  ) => {
    try {
      await reviewWithdrawal(id, action, remark);
      message.success(action === "approve" ? "审核通过" : "已拒绝");
      loadWithdrawalList();
    } catch (e: any) {
      const errorMsg = e?.message || e?.msg || "操作失败";
      message.error(errorMsg);
    }
  };

  const handleRejectWithReason = (id: string, channelName: string) => {
    setRejectingId(id);
    setRejectingChannelName(channelName);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      message.error("请输入拒绝理由");
      return;
    }
    try {
      await handleReview(rejectingId, "reject", rejectReason.trim());
      setRejectModalVisible(false);
      setRejectReason("");
      setRejectingId("");
      setRejectingChannelName("");
    } catch (e) {
      // 错误已在 handleReview 中处理
    }
  };

  const handleCancelReject = () => {
    setRejectModalVisible(false);
    setRejectReason("");
    setRejectingId("");
    setRejectingChannelName("");
  };

  const handleMarkAsPaid = (id: string, channelName: string) => {
    setMarkingPaidId(id);
    setMarkingPaidChannelName(channelName);
    setPayType("wechat");
    setMarkPaidRemark("");
    setMarkPaidModalVisible(true);
  };

  const handleConfirmMarkAsPaid = async () => {
    if (!payType) {
      message.error("请选择支付方式");
      return;
    }
    try {
      await markAsPaid(markingPaidId, payType, markPaidRemark);
      message.success("已标记为已打款");
      setMarkPaidModalVisible(false);
      setMarkingPaidId("");
      setMarkingPaidChannelName("");
      setPayType("wechat");
      setMarkPaidRemark("");
      loadWithdrawalList();
    } catch (e: any) {
      const errorMsg = e?.message || e?.msg || "操作失败";
      message.error(errorMsg);
    }
  };

  const handleCancelMarkAsPaid = () => {
    setMarkPaidModalVisible(false);
    setMarkingPaidId("");
    setMarkingPaidChannelName("");
    setPayType("wechat");
    setMarkPaidRemark("");
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  const handleAddChannel = () => {
    setEditingChannel(null);
    setAddChannelModalVisible(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setAddChannelModalVisible(true);
  };

  const handleChannelSubmit = async (data: {
    id?: string;
    name: string;
    phone?: string;
    wechatId?: string;
    remarks?: string;
  }) => {
    try {
      if (data.id) {
        // 编辑渠道
        await updateChannel(data.id, {
          name: data.name,
          phone: data.phone || undefined,
          wechatId: data.wechatId || undefined,
          remarks: data.remarks || undefined,
        });
        message.success("渠道编辑成功");
      } else {
        // 创建渠道
        await createChannel({
          name: data.name,
          phone: data.phone || undefined,
          wechatId: data.wechatId || undefined,
          remarks: data.remarks || undefined,
        });
        message.success("渠道创建成功");
      }
      setAddChannelModalVisible(false);
      setEditingChannel(null);
      // 刷新列表和统计数据
      await Promise.all([loadChannelList(), loadData()]);
    } catch (e: any) {
      const errorMsg = e?.message || e?.msg || (data.id ? "编辑失败" : "创建失败");
      message.error(errorMsg);
      throw e; // 重新抛出错误，让弹窗知道操作失败
    }
  };

  const handleMenuClick = async (
    key: string,
    channel: Channel,
    e?: React.MouseEvent | React.KeyboardEvent,
  ) => {
    // 阻止事件冒泡，防止触发卡片点击
    if (e) {
      e.stopPropagation();
      if ("preventDefault" in e) {
        e.preventDefault();
      }
    }

    if (key === "edit") {
      handleEditChannel(channel);
    } else if (key === "delete") {
      Modal.confirm({
        title: "确认删除",
        content: `确定要删除渠道"${channel.name}"吗？删除后无法恢复。`,
        okText: "删除",
        okType: "danger",
        cancelText: "取消",
        onOk: async () => {
          try {
            await deleteChannel(channel.id);
            message.success("删除成功");
            // 刷新列表和统计数据
            await Promise.all([loadChannelList(), loadData()]);
          } catch (err: any) {
            const errorMsg = err?.message || err?.msg || "删除失败";
            message.error(errorMsg);
          }
        },
      });
    } else if (key === "disable" || key === "enable") {
      try {
        const newStatus = key === "disable" ? "disabled" : "enabled";
        await toggleChannelStatus(channel.id, newStatus);
        message.success(newStatus === "disabled" ? "已禁用" : "已启用");
        // 刷新列表以更新状态显示
        loadChannelList();
      } catch (err: any) {
        const errorMsg = err?.message || err?.msg || "操作失败";
        message.error(errorMsg);
      }
    }
  };

  const tabs = [
    {
      key: "channel",
      title: "渠道管理",
      icon: <TeamOutlined />,
    },
    {
      key: "fund",
      title: "资金统计",
      icon: <DollarOutlined />,
    },
    {
      key: "withdrawal",
      title: "提现审核",
      icon: <FileTextOutlined />,
    },
  ];

  return (
    <Layout
      header={
        <NavCommon
          left={<></>}
          title={
            <div className={styles.headerTitle}>
              <div className={styles.mainTitle}>分销管理</div>
              <div className={styles.subTitle}>渠道与资金管理</div>
            </div>
          }
          right={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddChannel}
              style={{
                borderRadius: "8px",
                fontWeight: 500,
                boxShadow: "0 2px 6px rgba(24, 144, 255, 0.3)",
              }}
            >
              新增
            </Button>
          }
        />
      }
    >
      <div className={styles.container}>
        {/* 标签页 */}
        <div className={styles.tabsContainer}>
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as TabType)}
            className={styles.tabs}
          >
            {tabs.map(tab => (
              <Tabs.Tab
                key={tab.key}
                title={
                  <div className={styles.tabTitle}>
                    <span className={styles.tabIcon}>{tab.icon}</span>
                    <span>{tab.title}</span>
                  </div>
                }
              />
            ))}
          </Tabs>
        </div>

        {/* 渠道管理标签页内容 */}
        {activeTab === "channel" && (
          <>
            {/* 统计卡片 */}
            <div className={styles.statsCards}>
              <div className={`${styles.statCard} ${styles.blueCard}`}>
                <div className={styles.statHeader}>
                  <div className={styles.statIcon}>
                    <TeamOutlined />
                  </div>
                  <div className={styles.statLabel}>总渠道数</div>
                </div>
                <div className={styles.statValue}>
                  {formatNumber(statistics.totalChannels)}
                </div>
                <div className={styles.statChange}>
                  今日: +{formatNumber(statistics.todayChannels)}
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.greenCard}`}>
                <div className={styles.statHeader}>
                  <div className={styles.statIcon}>
                    <LineChartOutlined />
                  </div>
                  <div className={styles.statLabel}>总获客数</div>
                </div>
                <div className={styles.statValue}>
                  {formatNumber(statistics.totalCustomers)}
                </div>
                <div className={styles.statChange}>
                  今日: +{formatNumber(statistics.todayCustomers)}
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.purpleCard}`}>
                <div className={styles.statHeader}>
                  <div className={styles.statIcon}>
                    <UserAddOutlined />
                  </div>
                  <div className={styles.statLabel}>总加好友数</div>
                </div>
                <div className={styles.statValue}>
                  {formatNumber(statistics.totalFriends)}
                </div>
                <div className={styles.statChange}>
                  今日: +{formatNumber(statistics.todayFriends)}
                </div>
              </div>
            </div>

            {/* 渠道登录入口 */}
            <div className={styles.loginEntryCard}>
              <div className={styles.loginEntryHeader}>
                <div className={styles.loginEntryTitle}>
                  <span className={styles.loginEntryDot}></span>
                  <span className={styles.loginEntryText}>渠道登录入口</span>
                </div>
                <div className={styles.loginEntryTypeTabs}>
                  <button
                    className={`${styles.loginEntryTypeTab} ${
                      loginQrType === "h5" ? styles.active : ""
                    }`}
                    onClick={() => handleLoginQrTypeChange("h5")}
                  >
                    H5
                  </button>
                  <button
                    className={`${styles.loginEntryTypeTab} ${
                      loginQrType === "miniprogram" ? styles.active : ""
                    }`}
                    onClick={() => handleLoginQrTypeChange("miniprogram")}
                  >
                    小程序
                  </button>
                </div>
              </div>
              <div className={styles.loginEntryContent}>
                <div className={styles.loginEntryDesc}>
                  生成登录入口二维码，分发给渠道方扫码登录管理后台
                </div>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleOpenLoginQrDialog}
                >
                  查看登录二维码
                </Button>
              </div>
            </div>

            {/* 搜索栏 */}
            <div className={styles.searchBar}>
              <Input
                placeholder="搜索渠道名称、编码、电话、微信号..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={e => handleSearch(e.target.value)}
                allowClear
              />
            </div>

            {/* 渠道列表 */}
            <div className={styles.channelList}>
              {loading ? (
                <div className={styles.loading}>加载中...</div>
              ) : channelList.length === 0 ? (
                <div className={styles.empty}>
                  <div>暂无渠道数据</div>
                  <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
                    点击右上角"新增渠道"按钮添加渠道
                  </div>
                </div>
              ) : (
                  channelList.map(channel => (
                    <div
                      key={channel.id}
                      className={styles.channelCard}
                      onClick={() =>
                        navigate(`/workspace/distribution-management/${channel.code}`)
                      }
                      style={{ cursor: "pointer" }}
                    >
                    <div className={styles.channelHeader}>
                      <div className={styles.channelNameWrapper}>
                        <div className={styles.channelName}>{channel.name}</div>
                        {channel.status === "disabled" && (
                          <span className={styles.disabledBadge}>已禁用</span>
                        )}
                      </div>
                      <div className={styles.headerActions}>
                        <span className={styles.createType}>
                          {channel.createType === "manual"
                            ? "手动创建"
                            : "自动创建"}
                        </span>
                        <Dropdown
                          overlay={
                            <Menu
                              onClick={({ key, domEvent }) => {
                                if (domEvent) {
                                  domEvent.stopPropagation();
                                  if ("preventDefault" in domEvent) {
                                    domEvent.preventDefault();
                                  }
                                }
                                handleMenuClick(key, channel, domEvent as React.MouseEvent);
                              }}
                            >
                              <Menu.Item key="edit" icon={<FileTextOutlined />}>
                                编辑
                              </Menu.Item>
                              {channel.status === "disabled" ? (
                                <Menu.Item
                                  key="enable"
                                  icon={<CheckOutlined />}
                                >
                                  启用
                                </Menu.Item>
                              ) : (
                                <Menu.Item
                                  key="disable"
                                  icon={<CloseIcon />}
                                >
                                  禁用
                                </Menu.Item>
                              )}
                              <Menu.Item
                                key="delete"
                                danger
                                icon={<CloseIcon />}
                              >
                                删除
                              </Menu.Item>
                            </Menu>
                          }
                          trigger={["click"]}
                          placement="bottomRight"
                          getPopupContainer={(triggerNode) =>
                            triggerNode.parentElement || document.body
                          }
                        >
                          <div
                            className={styles.moreButton}
                            onClick={e => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            <MoreOutlined />
                          </div>
                        </Dropdown>
                      </div>
                    </div>

                    <div className={styles.channelInfo}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>ID:</span>
                        <span className={styles.infoValue}>{channel.code}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <PhoneOutlined className={styles.infoIcon} />
                        <span className={styles.infoLabel}>手机号:</span>
                        <span className={styles.infoValue}>
                          {channel.phone || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <WechatOutlined className={styles.infoIcon} />
                        <span className={styles.infoLabel}>微信号:</span>
                        <span className={styles.infoValue}>
                          {channel.wechatId || "-"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.channelStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>总获客</span>
                        <span className={`${styles.statValue} ${styles.blueText}`}>
                          {formatNumber(channel.totalCustomers)}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>今日获客</span>
                        <span className={`${styles.statValue} ${styles.greenText}`}>
                          {formatNumber(channel.todayCustomers)}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>总加好友</span>
                        <span className={`${styles.statValue} ${styles.purpleText}`}>
                          {formatNumber(channel.totalFriends)}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>今日加好友</span>
                        <span className={`${styles.statValue} ${styles.orangeText}`}>
                          {formatNumber(channel.todayFriends)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* 资金统计标签页内容 */}
        {activeTab === "fund" && (
          <>
            {/* 资金统计卡片 */}
            <div className={styles.fundStatsCards}>
              <div className={`${styles.fundStatCard} ${styles.blueCard} ${styles.fullWidth}`}>
                <div className={styles.fundStatHeader}>
                  <DollarOutlined className={styles.fundStatIcon} />
                  <div className={styles.fundStatLabel}>总支出</div>
                </div>
                <div className={styles.fundStatValue}>
                  {formatCurrencyYuan(fundStatistics.totalExpenditure)}
                </div>
              </div>

              <div className={`${styles.fundStatCard} ${styles.greenCard} ${styles.halfWidth}`}>
                <div className={styles.fundStatHeader}>
                  <WalletOutlined className={styles.fundStatIcon} />
                  <div className={styles.fundStatLabel}>已提现</div>
                </div>
                <div className={styles.fundStatValue}>
                  {formatCurrencyYuan(fundStatistics.withdrawn)}
                </div>
              </div>

              <div className={`${styles.fundStatCard} ${styles.orangeCard} ${styles.halfWidth}`}>
                <div className={styles.fundStatHeader}>
                  <FileTextOutlined className={styles.fundStatIcon} />
                  <div className={styles.fundStatLabel}>待审核</div>
                </div>
                <div className={styles.fundStatValue}>
                  {formatCurrencyYuan(fundStatistics.pendingReview)}
                </div>
              </div>
            </div>

            {/* 渠道收益明细 */}
            <div className={styles.earningsSection}>
              <div className={styles.sectionTitle}>
                <LineChartOutlined className={styles.sectionIcon} />
                <span>渠道收益明细</span>
              </div>

              {/* 搜索栏 */}
              <div className={styles.searchBar}>
                <Input
                  placeholder="搜索渠道名称、编码..."
                  prefix={<SearchOutlined />}
                  value={fundSearchKeyword}
                  onChange={e => setFundSearchKeyword(e.target.value)}
                  allowClear
                />
              </div>

              {/* 渠道收益列表 */}
              <div className={styles.earningsList}>
                {fundLoading && channelEarningsList.length === 0 ? (
                  <div className={styles.loading}>加载中...</div>
                ) : channelEarningsList.length === 0 ? (
                  <div className={styles.empty}>
                    <div>暂无收益数据</div>
                    <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
                      渠道产生收益后将显示在这里
                    </div>
                  </div>
                ) : (
                  <>
                    {channelEarningsList.map(earnings => (
                      <div key={earnings.channelId} className={styles.earningsCard}>
                        <div className={styles.earningsHeader}>
                          <div className={styles.earningsName}>{earnings.channelName}</div>
                          <div className={styles.earningsCode}>{earnings.channelCode}</div>
                        </div>

                        <div className={styles.earningsStats}>
                          <div
                            className={`${styles.earningsStatItem} ${styles.lightBlue}`}
                          >
                            <div className={styles.earningsStatLabel}>总收益</div>
                            <div className={styles.earningsStatValue}>
                              {formatCurrencyYuan(earnings.totalRevenue)}
                            </div>
                          </div>
                          <div
                            className={`${styles.earningsStatItem} ${styles.lightGreen}`}
                          >
                            <div className={styles.earningsStatLabel}>可提现</div>
                            <div className={styles.earningsStatValue}>
                              {formatCurrencyYuan(earnings.withdrawable)}
                            </div>
                          </div>
                          <div
                            className={`${styles.earningsStatItem} ${styles.lightGrey}`}
                          >
                            <div className={styles.earningsStatLabel}>已提现</div>
                            <div className={styles.earningsStatValue}>
                              {formatCurrencyYuan(earnings.withdrawn)}
                            </div>
                          </div>
                          <div
                            className={`${styles.earningsStatItem} ${styles.lightOrange}`}
                          >
                            <div className={styles.earningsStatLabel}>待审核</div>
                            <div className={styles.earningsStatValue}>
                              {formatCurrencyYuan(earnings.pendingReview)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <InfiniteScroll
                      loadMore={loadMoreEarnings}
                      hasMore={channelEarningsList.length < earningsTotal}
                      threshold={100}
                    >
                      {earningsLoadingMore && (
                        <div style={{ padding: "20px", textAlign: "center" }}>
                          <SpinLoading color="primary" style={{ fontSize: 16 }} />
                          <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>
                            加载中...
                          </span>
                        </div>
                      )}
                      {channelEarningsList.length >= earningsTotal &&
                        channelEarningsList.length > 0 && (
                          <div
                            style={{
                              padding: "20px",
                              textAlign: "center",
                              color: "#999",
                              fontSize: 12,
                            }}
                          >
                            没有更多了
                          </div>
                        )}
                    </InfiniteScroll>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* 提现审核标签页内容 */}
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
                    value={withdrawalStatus}
                    onChange={value => setWithdrawalStatus(value as WithdrawalStatus)}
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
                      withdrawalDate
                        ? `${withdrawalDate.getFullYear()}-${String(
                            withdrawalDate.getMonth() + 1,
                          ).padStart(2, "0")}-${String(
                            withdrawalDate.getDate(),
                          ).padStart(2, "0")}`
                        : ""
                    }
                    onClick={() => setShowDatePicker(true)}
                    prefix={<CalendarOutlined />}
                    className={styles.filterInput}
                  />
                  <DatePicker
                    visible={showDatePicker}
                    title="选择日期"
                    value={withdrawalDate}
                    onClose={() => setShowDatePicker(false)}
                    onConfirm={val => {
                      setWithdrawalDate(val);
                      setShowDatePicker(false);
                    }}
                  />
                </div>

                <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>渠道搜索</label>
                  <Input
                    placeholder="搜索渠道名称、编码..."
                    prefix={<SearchOutlined />}
                    value={withdrawalKeyword}
                    onChange={e => setWithdrawalKeyword(e.target.value)}
                    allowClear
                    className={styles.filterInput}
                  />
                </div>
              </div>
            </div>

            {/* 提现申请列表 */}
            <div className={styles.withdrawalList}>
              {withdrawalLoading ? (
                <div className={styles.loading}>加载中...</div>
              ) : withdrawalList.length === 0 ? (
                <div className={styles.empty}>
                  <div>暂无提现申请</div>
                  <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
                    当前没有待处理的提现申请
                  </div>
                </div>
              ) : (
                withdrawalList.map(request => (
                  <div key={request.id} className={styles.withdrawalCard}>
                    <div className={styles.withdrawalHeader}>
                      <div className={styles.withdrawalName}>
                        {request.channelName}
                      </div>
                      <span
                        className={`${styles.statusBadge} ${
                          request.status === "pending"
                            ? styles.statusPending
                            : request.status === "approved"
                              ? styles.statusApproved
                              : request.status === "rejected"
                                ? styles.statusRejected
                                : styles.statusPaid
                        }`}
                      >
                        {request.status === "pending"
                          ? "待审核"
                          : request.status === "approved"
                            ? "已通过"
                            : request.status === "rejected"
                              ? "已拒绝"
                              : "已打款"}
                      </span>
                    </div>

                    <div className={styles.withdrawalAmount}>
                      {formatCurrencyYuan(request.amount)}
                    </div>

                    <div className={styles.withdrawalInfo}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>ID:</span>
                        <span className={styles.infoValue}>
                          {request.channelCode}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>日期:</span>
                        <span className={styles.infoValue}>
                          {request.applyDate}
                        </span>
                      </div>
                      {request.status === "paid" && request.payType && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>打款方式:</span>
                          <span className={styles.infoValue}>
                            {request.payType === "wechat"
                              ? "微信"
                              : request.payType === "alipay"
                                ? "支付宝"
                                : "银行卡"}
                          </span>
                        </div>
                      )}
                      {(request.status === "rejected" || request.status === "paid") &&
                        request.remark && (
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                              {request.status === "rejected" ? "拒绝理由:" : "备注:"}
                            </span>
                            <span className={styles.infoValue}>{request.remark}</span>
                          </div>
                        )}
                    </div>

                    <div className={styles.withdrawalActions}>
                      {request.status === "pending" ? (
                        <>
                          <Button
                            type="primary"
                            danger
                            icon={<CloseIcon />}
                            onClick={() =>
                              handleRejectWithReason(request.id, request.channelName)
                            }
                            className={styles.rejectBtn}
                          >
                            拒绝
                          </Button>
                          <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleReview(request.id, "approve")}
                            className={styles.approveBtn}
                          >
                            通过
                          </Button>
                        </>
                      ) : request.status === "approved" ? (
                        <Button
                          type="primary"
                          onClick={() => handleMarkAsPaid(request.id, request.channelName)}
                          className={styles.paidBtn}
                        >
                          标记为已打款
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 渠道登录入口二维码弹窗 */}
      <Popup
        visible={loginQrVisible}
        onMaskClick={() => setLoginQrVisible(false)}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        <div className={styles.loginQrDialog}>
          <div className={styles.loginQrHeader}>
            <h3>渠道登录入口</h3>
            <Button size="small" onClick={() => setLoginQrVisible(false)}>
              关闭
            </Button>
          </div>
          <div className={styles.loginQrTypeSelector}>
            <button
              className={`${styles.loginEntryTypeTab} ${
                loginQrType === "h5" ? styles.active : ""
              }`}
              onClick={() => handleLoginQrTypeChange("h5")}
            >
              H5
            </button>
            <button
              className={`${styles.loginEntryTypeTab} ${
                loginQrType === "miniprogram" ? styles.active : ""
              }`}
              onClick={() => handleLoginQrTypeChange("miniprogram")}
            >
              小程序
            </button>
          </div>
          <div className={styles.loginQrContent}>
            {loginQrLoading ? (
              <div className={styles.loginQrLoading}>
                <SpinLoading color="primary" style={{ fontSize: 28 }} />
                <div>生成二维码中...</div>
              </div>
            ) : loginQrData?.qrCode ? (
              <>
                <img
                  src={loginQrData.qrCode}
                  alt="登录二维码"
                  className={styles.loginQrImage}
                />
                {loginQrData.url && (
                  <div className={styles.loginQrLinkSection}>
                    <div className={styles.loginQrLinkLabel}>
                      {loginQrType === "h5" ? "H5 链接" : "小程序链接"}
                    </div>
                    <div className={styles.loginQrLinkWrapper}>
                      <Input
                        value={loginQrData.url}
                        readOnly
                        className={styles.loginQrLinkInput}
                      />
                      <Button
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(loginQrData.url);
                          message.success("链接已复制到剪贴板");
                        }}
                      >
                        复制
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.loginQrError}>
                <div>二维码生成失败，请重试</div>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => handleGenerateLoginQRCode(loginQrType)}
                >
                  重新生成
                </Button>
              </div>
            )}
          </div>
        </div>
      </Popup>

      {/* 新增/编辑渠道弹窗 */}
      <AddChannelModal
        visible={addChannelModalVisible}
        onClose={() => {
          setAddChannelModalVisible(false);
          setEditingChannel(null);
        }}
        editData={
          editingChannel
            ? {
                id: editingChannel.id,
                name: editingChannel.name,
                phone: editingChannel.phone,
                wechatId: editingChannel.wechatId,
                remarks: editingChannel.remarks || "",
              }
            : undefined
        }
        onSubmit={handleChannelSubmit}
      />

      {/* 拒绝提现申请弹窗 */}
      <Modal
        open={rejectModalVisible}
        title="拒绝提现申请"
        onOk={handleConfirmReject}
        onCancel={handleCancelReject}
        okText="确认拒绝"
        okType="danger"
        cancelText="取消"
        width="90%"
        style={{ maxWidth: "500px" }}
        centered
        closable={false}
      >
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              marginBottom: 16,
              padding: "12px",
              background: "#f5f5f5",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#666" }}>渠道：</span>
            <span style={{ fontWeight: 500, color: "#222" }}>
              {rejectingChannelName}
            </span>
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: "14px",
                color: "#222",
              }}
            >
              拒绝理由 <span style={{ color: "#ff4d4f" }}>*</span>
            </label>
            <TextArea
              placeholder="请输入拒绝理由（必填）"
              rows={4}
              maxLength={200}
              showCount
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                fontSize: "14px",
              }}
            />
          </div>
        </div>
      </Modal>

      {/* 标记为已打款弹窗 */}
      <Modal
        open={markPaidModalVisible}
        title="标记为已打款"
        onOk={handleConfirmMarkAsPaid}
        onCancel={handleCancelMarkAsPaid}
        okText="确认标记"
        cancelText="取消"
        width="90%"
        style={{ maxWidth: "500px" }}
        centered
        closable={false}
      >
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              marginBottom: 16,
              padding: "12px",
              background: "#f5f5f5",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#666" }}>渠道：</span>
            <span style={{ fontWeight: 500, color: "#222" }}>
              {markingPaidChannelName}
            </span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: "14px",
                color: "#222",
              }}
            >
              支付方式 <span style={{ color: "#ff4d4f" }}>*</span>
            </label>
            <Select
              value={payType}
              onChange={(value) => setPayType(value as "wechat" | "alipay" | "bankcard")}
              style={{ width: "100%" }}
              suffixIcon={<DownOutlined />}
            >
              <Select.Option value="wechat">微信</Select.Option>
              <Select.Option value="alipay">支付宝</Select.Option>
              <Select.Option value="bankcard">银行卡</Select.Option>
            </Select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: "14px",
                color: "#222",
              }}
            >
              备注
            </label>
            <TextArea
              placeholder="请输入备注信息（可选）"
              rows={4}
              maxLength={200}
              showCount
              value={markPaidRemark}
              onChange={(e) => setMarkPaidRemark(e.target.value)}
              style={{
                fontSize: "14px",
              }}
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default DistributionManagement;
