import React, { useState, useEffect } from "react";
import { Card, Toast, Picker, InfiniteScroll } from "antd-mobile";
import style from "./index.module.scss";
import {
  ThunderboltOutlined,
  LineChartOutlined,
  BarChartOutlined,
  HistoryOutlined,
  CalendarOutlined,
  DownOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  AimOutlined,
  SearchOutlined,
  WechatOutlined,
  AlipayCircleOutlined,
  DesktopOutlined,
  UserOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { Button, Dialog, Input, Popup } from "antd-mobile";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import { useUserStore } from "@/store";
import { getStatistics, getOrderList, queryOrder, getAccountList, allocateTokens } from "./api";
import type { QueryOrderResponse, Account } from "./api";
import { getTokensUseRecord } from "../usage-records/api";
import { getTaocanList, buyPackage } from "../buy-power/api";
import type { Statistics, OrderList } from "./api";
import type { TokensUseRecordItem } from "../usage-records/api";
import type { PowerPackage } from "../buy-power/api";

// 格式化日期时间：2025/2/22 17:02
const formatDateTime = (value?: string | number | null) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" && value.trim() === "") return "";

  let date: Date;
  if (typeof value === "string") {
    date = new Date(value);
  } else {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return String(value);
    }
    const timestamp =
      numericValue > 1e12
        ? numericValue
        : numericValue > 1e10
          ? numericValue
          : numericValue * 1000;
    date = new Date(timestamp);
  }

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hour}:${minute}`;
};

// 格式化数值，超过1000用K，超过10000用W，保留1位小数
const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return "0";
  const num = Number(value);
  if (isNaN(num)) return "0";

  if (num >= 10000) {
    const w = num / 10000;
    return w % 1 === 0 ? `${w}w` : `${w.toFixed(1)}w`;
  } else if (num >= 1000) {
    const k = num / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return num.toFixed(1);
};

// 类型映射：form字段到显示名称（数据库字段映射）
const formLabelMap: Record<number, string> = {
  0: "未知",
  1: "点赞",
  2: "朋友圈同步",
  3: "朋友圈发布",
  4: "群发微信",
  5: "群发群消息",
  6: "群发群公告",
  7: "海报获客",
  8: "订单获客",
  9: "电话获客",
  10: "微信群获客",
  11: "API获客",
  12: "AI改写",
  13: "AI客服",
  14: "生成群公告",
  1001: "商家",
  1002: "充值",
  1003: "系统",
};

// 根据form字段获取类型名称，优先显示remarks
const getRecordTitle = (item: TokensUseRecordItem): string => {
  // 优先显示remarks，如果没有则显示类型名称
  if (item.remarks && item.remarks.trim()) {
    return item.remarks;
  }
  return formLabelMap[item.form] || "使用记录";
};

const PowerManagement: React.FC = () => {
  const user = useUserStore(state => state.user);
  const isAdmin = user?.isAdmin === 1; // 判断是否为管理员
  const [activeTab, setActiveTab] = useState("details"); // details, buy, orders, allocation
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [records, setRecords] = useState<TokensUseRecordItem[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordHasMore, setRecordHasMore] = useState(true);
  const [recordLoadingMore, setRecordLoadingMore] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderHasMore, setOrderHasMore] = useState(true);
  const [orderLoadingMore, setOrderLoadingMore] = useState(false);
  const [packages, setPackages] = useState<PowerPackage[]>([]);
  const [buyLoading, setBuyLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrderList[]>([]);
  const [orderKeyword, setOrderKeyword] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("all");
  const [orderTime, setOrderTime] = useState<string>("7days");
  const [orderPayType, setOrderPayType] = useState<string>("all");
  const [orderStatusVisible, setOrderStatusVisible] = useState(false);
  const [orderTimeVisible, setOrderTimeVisible] = useState(false);
  const [orderPayTypeVisible, setOrderPayTypeVisible] = useState(false);
  const [allocationAccount, setAllocationAccount] = useState<Account | null>(null);
  const [allocationAmount, setAllocationAmount] = useState<string>("");
  const [allocationAccountVisible, setAllocationAccountVisible] = useState(false);
  const [allocationRecords, setAllocationRecords] = useState<TokensUseRecordItem[]>([]);
  const [allocationPage, setAllocationPage] = useState(1);
  const [allocationTotal, setAllocationTotal] = useState(0);
  const [allocationHasMore, setAllocationHasMore] = useState(true);
  const [allocationLoadingMore, setAllocationLoadingMore] = useState(false);
  const [allocationAccountFilter, setAllocationAccountFilter] = useState<string>("all");
  const [allocationTimeFilter, setAllocationTimeFilter] = useState<string>("7days");
  const [allocationAccountFilterVisible, setAllocationAccountFilterVisible] = useState(false);
  const [allocationTimeFilterVisible, setAllocationTimeFilterVisible] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentDialogVisible, setPaymentDialogVisible] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    packageName: string;
    tokens: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    codeUrl: string;
    orderNo: string;
    payType: number; // 1: 微信, 2: 支付宝
  } | null>(null);
  const [countdown, setCountdown] = useState(300); // 5分钟倒计时（秒）
  const [expireTime, setExpireTime] = useState<Date | null>(null);
  const [paymentSuccessVisible, setPaymentSuccessVisible] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<QueryOrderResponse | null>(null);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);

  // 筛选器状态
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("all");
  const [filterTypeVisible, setFilterTypeVisible] = useState(false);
  const [filterActionVisible, setFilterActionVisible] = useState(false);
  const [filterTimeVisible, setFilterTimeVisible] = useState(false);

  const typeOptions = [
    { label: "全部类型", value: "all" },
    { label: "点赞", value: "1" },
    { label: "朋友圈同步", value: "2" },
    { label: "朋友圈发布", value: "3" },
    { label: "群发微信", value: "4" },
    { label: "群发群消息", value: "5" },
    { label: "群发群公告", value: "6" },
    { label: "海报获客", value: "7" },
    { label: "订单获客", value: "8" },
    { label: "电话获客", value: "9" },
    { label: "微信群获客", value: "10" },
    { label: "API获客", value: "11" },
    { label: "AI改写", value: "12" },
    { label: "AI客服", value: "13" },
    { label: "生成群公告", value: "14" },
    { label: "商家", value: "1001" },
    { label: "充值", value: "1002" },
    { label: "系统", value: "1003" },
  ];

  const actionOptions = [
    { label: "全部行为", value: "all" },
    { label: "消耗", value: "consume" },
    { label: "充值", value: "recharge" },
  ];

  const timeOptions = [
    { label: "最近7天", value: "7days" },
    { label: "最近30天", value: "30days" },
    { label: "最近90天", value: "90days" },
    { label: "全部时间", value: "all" },
  ];

  // 导航标签数据（根据管理员权限过滤）
  const navTabs = [
    { key: "details", label: "算力明细" },
    { key: "buy", label: "购买算力" },
    { key: "orders", label: "购买记录" },
    // 只有管理员才能看到算力分配
    ...(isAdmin ? [{ key: "allocation", label: "算力分配" }] : []),
  ];

  useEffect(() => {
    fetchStats();
  }, []);


  useEffect(() => {
    // 如果非管理员尝试访问分配页面，自动跳转到明细页面
    if (activeTab === "allocation" && !isAdmin) {
      setActiveTab("details");
      return;
    }

    if (activeTab === "details") {
      // 筛选条件变化时重置
      setRecordPage(1);
      setRecordHasMore(true);
      fetchRecords(1, false);
    } else if (activeTab === "buy") {
      fetchPackages();
    } else if (activeTab === "orders") {
      // 筛选条件变化时重置
      setOrderPage(1);
      setOrderHasMore(true);
      fetchOrders(1, false);
    } else if (activeTab === "allocation" && isAdmin) {
      fetchAccounts();
      // 重置分配记录
      setAllocationPage(1);
      setAllocationHasMore(true);
      fetchAllocationRecords(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterType, filterAction, filterTime, orderStatus, orderTime, orderPayType, orderKeyword, isAdmin]);

  const fetchStats = async () => {
    try {
      const res = await getStatistics();
      setStats(res);
    } catch (error) {
      console.error("获取统计失败:", error);
      Toast.show({ content: "获取数据失败", position: "top" });
    }
  };

  const fetchRecords = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setRecordLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      // 根据筛选条件构建参数
      const params: any = {
        page: String(page),
        limit: "10",
        type: filterAction === "consume" ? "0" : filterAction === "recharge" ? "1" : undefined,
      };

      // 类型筛选：根据form字段筛选
      if (filterType !== "all") {
        params.form = filterType;
      }

      // 时间筛选（转换为 startTime 和 endTime，只保留日期）
      if (filterTime !== "all") {
        const now = new Date();
        const daysMap: Record<string, number> = {
          "7days": 7,
          "30days": 30,
          "90days": 90,
        };
        const days = daysMap[filterTime] || 7;
        const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.startTime = startTime.toISOString().slice(0, 10); // YYYY-MM-DD
        params.endTime = now.toISOString().slice(0, 10); // YYYY-MM-DD
      }

      const res = await getTokensUseRecord(params);
      console.log("接口返回数据:", res);

      // 处理返回数据：request拦截器会返回 res.data.data，所以直接使用 res.list
      let list = Array.isArray(res?.list) ? res.list : [];
      const total = res?.total || 0;

      console.log("处理后的列表:", list, "列表长度:", list.length, "总数:", total);

      if (append) {
        // 追加数据
        setRecords(prev => [...prev, ...list]);
      } else {
        // 替换数据
        setRecords(list);
      }

      setRecordTotal(total);
      // 判断是否还有更多数据
      const hasMore = records.length + list.length < total;
      setRecordHasMore(hasMore);
    } catch (error) {
      console.error("获取使用记录失败:", error);
      Toast.show({ content: "获取使用记录失败", position: "top" });
    } finally {
      if (append) {
        setRecordLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await getTaocanList();
      setPackages(res.list || []);
    } catch (error) {
      console.error("获取套餐列表失败:", error);
      Toast.show({ content: "获取套餐列表失败", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setOrderLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params: any = {
        page: String(page),
        limit: "10",
        orderType: "1", // 算力充值
      };

      // 关键词搜索（订单号）
      if (orderKeyword) {
        params.keyword = orderKeyword;
      }

      // 订单状态筛选
      if (orderStatus !== "all") {
        params.status = orderStatus;
      }

      // 支付方式筛选
      if (orderPayType !== "all") {
        params.payType = orderPayType;
      }

      // 时间筛选（转换为 startTime 和 endTime，只保留日期）
      if (orderTime !== "all") {
        const now = new Date();
        const daysMap: Record<string, number> = {
          "7days": 7,
          "30days": 30,
          "90days": 90,
        };
        const days = daysMap[orderTime] || 7;
        const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.startTime = startTime.toISOString().slice(0, 10); // YYYY-MM-DD
        params.endTime = now.toISOString().slice(0, 10); // YYYY-MM-DD
      }

      const res = await getOrderList(params);
      const list = res.list || [];
      const total = res.total || 0;

      if (append) {
        // 追加数据
        setOrders(prev => [...prev, ...list]);
      } else {
        // 替换数据
        setOrders(list);
      }

      setOrderTotal(total);
      // 判断是否还有更多数据
      if (append) {
        const hasMore = orders.length + list.length < total;
        setOrderHasMore(hasMore);
      } else {
        const hasMore = list.length < total;
        setOrderHasMore(hasMore);
      }
    } catch (error) {
      console.error("获取订单列表失败:", error);
      Toast.show({ content: "获取订单列表失败", position: "top" });
    } finally {
      if (append) {
        setOrderLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleBuyPackage = async (pkg: PowerPackage) => {
    setBuyLoading(true);
    try {
      const res = await buyPackage({
        id: pkg.id,
        price: pkg.price,
      });

      if (res?.code_url) {
        // 显示新版支付弹框
        const tokensValue = formatTokens(pkg.tokens);
        const savings = getSavings(pkg);
        const discount = savings > 0 && pkg.originalPrice
          ? Math.round((savings / pkg.originalPrice) * 100)
          : pkg.discount || 0;

        setPaymentData({
          packageName: pkg.name,
          tokens: tokensValue,
          price: pkg.price / 100,
          originalPrice: pkg.originalPrice ? pkg.originalPrice / 100 : undefined,
          discount: discount,
          codeUrl: res.code_url,
          orderNo: res.orderNo || res.order_no || `ORDER${Date.now()}`,
          payType: 1, // 默认微信支付
        });
        setCountdown(300); // 5分钟倒计时
        const expire = new Date();
        expire.setMinutes(expire.getMinutes() + 5);
        setExpireTime(expire);
        setPaymentDialogVisible(true);
      }
    } catch (error) {
      console.error("购买失败:", error);
      Toast.show({ content: "购买失败，请重试", position: "top" });
    } finally {
      setBuyLoading(false);
    }
  };

  // 格式化算力值
  const formatTokens = (tokens: number | string): string => {
    if (typeof tokens === "string") {
      return tokens;
    }
    return tokens.toLocaleString();
  };

  // 计算节省金额
  const getSavings = (pkg: PowerPackage): number => {
    if (pkg.originalPrice && pkg.originalPrice > pkg.price) {
      return pkg.originalPrice - pkg.price;
    }
    return 0;
  };

  // 处理快速选择金额
  const handleQuickSelect = (amount: number) => {
    setSelectedQuickAmount(amount);
    setCustomAmount(amount.toString());
  };

  // 处理自定义金额输入（只允许整数）
  const handleCustomAmountChange = (value: string) => {
    // 只允许输入数字，自动去除小数点
    const intValue = value.replace(/[^\d]/g, '');
    setCustomAmount(intValue);
    setSelectedQuickAmount(null);
  };

  // 购买自定义金额
  const handleBuyCustom = async () => {
    if (!customAmount || !customAmount.trim()) {
      Toast.show({ content: "请输入购买金额", position: "top" });
      return;
    }

    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount < 1) {
      Toast.show({ content: "请输入有效的金额1元", position: "top" });
      return;
    }

    setBuyLoading(true);
    try {
      // 使用自定义购买接口，传入金额（元）
      const res = await buyPackage({
        price: amount, // 金额传元，不是分
      });

      if (res?.code_url) {
        // 显示新版支付弹框
        setPaymentData({
          packageName: "自定义购买算力",
          tokens: "待计算", // 自定义购买时算力点数由后端返回
          price: amount,
          codeUrl: res.code_url,
          orderNo: res.orderNo || res.order_no || `CUSTOM${Date.now()}`,
          payType: 1, // 默认微信支付
        });
        setCountdown(300); // 5分钟倒计时
        const expire = new Date();
        expire.setMinutes(expire.getMinutes() + 5);
        setExpireTime(expire);
        setPaymentDialogVisible(true);
      }
    } catch (error) {
      console.error("购买失败:", error);
      Toast.show({ content: "购买失败，请重试", position: "top" });
    } finally {
      setBuyLoading(false);
    }
  };

  // 计算使用率
  const getUsageRate = (): number => {
    if (!stats || !stats.totalTokens || stats.totalTokens === 0) return 0;
    const used = stats.totalTokens - stats.remainingTokens;
    return Math.round((used / stats.totalTokens) * 100);
  };

  // 获取预计可用天数（直接使用接口返回的字段）
  const getEstimatedDays = (): number => {
    return stats?.estimatedDays || 0;
  };

  const getTypeLabel = () =>
    typeOptions.find(opt => opt.value === filterType)?.label || "全部";
  const getActionLabel = () =>
    actionOptions.find(opt => opt.value === filterAction)?.label || "全部";
  const getTimeLabel = () =>
    timeOptions.find(opt => opt.value === filterTime)?.label || "最近7天";

  // 订单筛选选项
  const orderStatusOptions = [
    { label: "全部状态", value: "all" },
    { label: "待支付", value: "0" },
    { label: "已支付", value: "1" },
    { label: "已取消", value: "2" },
    { label: "已退款", value: "3" },
  ];

  const orderTimeOptions = [
    { label: "最近7天", value: "7days" },
    { label: "最近30天", value: "30days" },
    { label: "最近90天", value: "90days" },
    { label: "全部", value: "all" },
  ];

  const orderPayTypeOptions = [
    { label: "全部方式", value: "all" },
    { label: "微信支付", value: "1" },
    { label: "支付宝", value: "2" },
  ];

  const getOrderStatusLabel = () =>
    orderStatusOptions.find(opt => opt.value === orderStatus)?.label || "全部状态";
  const getOrderTimeLabel = () =>
    orderTimeOptions.find(opt => opt.value === orderTime)?.label || "最近7天";
  const getOrderPayTypeLabel = () =>
    orderPayTypeOptions.find(opt => opt.value === orderPayType)?.label || "全部方式";

  // 获取支付方式文本
  const getPayTypeText = (payType?: number): string => {
    switch (payType) {
      case 1:
        return "微信支付";
      case 2:
        return "支付宝支付";
      default:
        return "未知";
    }
  };

  // 获取状态文本和样式
  const getOrderStatusInfo = (status?: number) => {
    switch (status) {
      case 0:
        return { text: "待支付", color: "#faad14", bgColor: "#fffbe6" };
      case 1:
        return { text: "已支付", color: "#52c41a", bgColor: "#f6ffed" };
      case 2:
        return { text: "已取消", color: "#999999", bgColor: "#f5f5f5" };
      case 3:
        return { text: "已退款", color: "#1890ff", bgColor: "#e6f7ff" };
      default:
        return { text: "未知", color: "#666", bgColor: "#f5f5f5" };
    }
  };

  // 获取账号列表
  const fetchAccounts = async () => {
    try {
      const res = await getAccountList();
      setAccounts(res.list || []);
    } catch (error) {
      console.error("获取账号列表失败:", error);
      Toast.show({ content: "获取账号列表失败", position: "top" });
    }
  };

  // 获取账号显示名称
  const getAccountDisplayName = (account: Account) => {
    const parts: string[] = [];
    if (account.realName) {
      parts.push(account.realName);
    }
    if (account.userName) {
      parts.push(account.userName);
    }
    if (parts.length > 0) {
      return parts.join(" - ");
    }
    return account.nickname || `账号${account.id}`;
  };

  // 获取分配记录（form=1001的算力明细记录）
  const fetchAllocationRecords = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setAllocationLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params: any = {
        page: String(page),
        limit: "10",
        form: "1001", // 商家类型
      };

      // 账号筛选
      if (allocationAccountFilter !== "all") {
        // 这里需要根据账号ID筛选，可能需要后端支持
        // 暂时先不处理，等后端接口支持
      }

      // 时间筛选
      if (allocationTimeFilter !== "all") {
        const now = new Date();
        const daysMap: Record<string, number> = {
          "7days": 7,
          "30days": 30,
          "90days": 90,
        };
        const days = daysMap[allocationTimeFilter] || 7;
        const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.startTime = startTime.toISOString().slice(0, 10);
        params.endTime = now.toISOString().slice(0, 10);
      }

      const res = await getTokensUseRecord(params);
      let list = Array.isArray(res?.list) ? res.list : [];
      const total = res?.total || 0;

      if (append) {
        setAllocationRecords(prev => [...prev, ...list]);
      } else {
        setAllocationRecords(list);
      }

      setAllocationTotal(total);
      if (append) {
        const hasMore = allocationRecords.length + list.length < total;
        setAllocationHasMore(hasMore);
      } else {
        const hasMore = list.length < total;
        setAllocationHasMore(hasMore);
      }
    } catch (error) {
      console.error("获取分配记录失败:", error);
      Toast.show({ content: "获取分配记录失败", position: "top" });
    } finally {
      if (append) {
        setAllocationLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 处理确认分配
  const handleConfirmAllocation = async () => {
    if (!allocationAccount) {
      Toast.show({ content: "请选择账号", position: "top" });
      return;
    }
    if (!allocationAmount || !allocationAmount.trim()) {
      Toast.show({ content: "请输入分配算力数量", position: "top" });
      return;
    }
    const amount = parseInt(allocationAmount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ content: "请输入有效的算力数量", position: "top" });
      return;
    }

    setLoading(true);
    try {
      // 调用分配接口
      await allocateTokens({
        targetUserId: allocationAccount.uid || allocationAccount.userId || allocationAccount.id,
        tokens: amount,
        remarks: `分配给${getAccountDisplayName(allocationAccount)}`,
      });

      Toast.show({ content: "分配成功", position: "top" });
      setAllocationAccount(null);
      setAllocationAmount("");

      // 刷新统计数据
      fetchStats();

      // 重新加载记录
      setAllocationPage(1);
      setAllocationHasMore(true);
      fetchAllocationRecords(1, false);
    } catch (error) {
      console.error("分配失败:", error);
      Toast.show({ content: "分配失败，请重试", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  // 分配记录筛选选项
  const allocationAccountOptions = [
    { label: "全部账号", value: "all" },
    ...accounts.map(acc => ({ label: getAccountDisplayName(acc), value: (acc.uid || acc.userId || acc.id).toString() })),
  ];

  const allocationTimeOptions = [
    { label: "最近7天", value: "7days" },
    { label: "最近30天", value: "30days" },
    { label: "最近90天", value: "90days" },
    { label: "全部", value: "all" },
  ];

  // 倒计时效果
  useEffect(() => {
    if (paymentDialogVisible && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentDialogVisible, countdown]);

  // 格式化倒计时时间
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 格式化过期时间
  const formatExpireTime = (date: Date | null): string => {
    if (!date) return "";
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hour}:${minute}`;
  };

  // 复制订单号
  const handleCopyOrderNo = async () => {
    if (!paymentData?.orderNo) return;
    try {
      await navigator.clipboard.writeText(paymentData.orderNo);
      Toast.show({ content: "订单号已复制", position: "top" });
    } catch (error) {
      // 降级方案
      const textarea = document.createElement("textarea");
      textarea.value = paymentData.orderNo;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      Toast.show({ content: "订单号已复制", position: "top" });
    }
  };

  // 切换支付方式
  const handleChangePayType = (payType: number) => {
    if (paymentData) {
      setPaymentData({ ...paymentData, payType });
      // TODO: 根据支付方式重新获取二维码
    }
  };

  // 查询订单状态（轮询）
  const pollOrderStatus = async (orderNo: string) => {
    try {
      const res = await queryOrder(orderNo);
      if (res.status === 1) {
        // 订单已支付，显示支付成功弹框
        setPaymentSuccessData(res);
        setPaymentSuccessVisible(true);
        setPaymentDialogVisible(false);
        // 清除轮询
        if (pollingTimer) {
          clearInterval(pollingTimer);
          setPollingTimer(null);
        }
        // 刷新统计数据
        fetchStats();
        // 刷新订单列表
        if (activeTab === "orders") {
          fetchOrders();
        }
      }
    } catch (error) {
      console.error("查询订单状态失败:", error);
    }
  };

  // 开始轮询订单状态
  useEffect(() => {
    if (paymentDialogVisible && paymentData?.orderNo) {
      // 立即查询一次
      pollOrderStatus(paymentData.orderNo);
      // 每3秒轮询一次
      const timer = setInterval(() => {
        pollOrderStatus(paymentData.orderNo);
      }, 3000);
      setPollingTimer(timer);
      return () => {
        clearInterval(timer);
        setPollingTimer(null);
      };
    } else {
      // 关闭支付弹框时清除轮询
      if (pollingTimer) {
        clearInterval(pollingTimer);
        setPollingTimer(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentDialogVisible, paymentData?.orderNo]);

  // 完成支付
  const handleCompletePayment = () => {
    // 手动触发一次查询
    if (paymentData?.orderNo) {
      pollOrderStatus(paymentData.orderNo);
    }
  };

  // 关闭支付成功弹框
  const handleClosePaymentSuccess = () => {
    setPaymentSuccessVisible(false);
    setPaymentSuccessData(null);
  };

  // 格式化支付时间
  const formatPayTime = (timestamp: number | null): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hour}:${minute}`;
  };

  // 解析商品规格
  const parseGoodsSpecs = (specs: string) => {
    try {
      const parsed = typeof specs === "string" ? JSON.parse(specs) : specs;
      return parsed;
    } catch {
      return null;
    }
  };

  // 复制支付成功弹框的订单号
  const handleCopySuccessOrderNo = async () => {
    if (!paymentSuccessData?.orderNo) return;
    try {
      await navigator.clipboard.writeText(paymentSuccessData.orderNo);
      Toast.show({ content: "订单号已复制", position: "top" });
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = paymentSuccessData.orderNo;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      Toast.show({ content: "订单号已复制", position: "top" });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // 移除导航逻辑，只切换tab
  };

  // 触底加载更多 - 算力明细
  const loadMoreRecords = async () => {
    if (recordLoadingMore || !recordHasMore) return;
    const nextPage = recordPage + 1;
    setRecordPage(nextPage);
    await fetchRecords(nextPage, true);
  };

  // 触底加载更多 - 订单
  const loadMoreOrders = async () => {
    if (orderLoadingMore || !orderHasMore) return;
    const nextPage = orderPage + 1;
    setOrderPage(nextPage);
    await fetchOrders(nextPage, true);
  };

  // 触底加载更多 - 分配记录
  const loadMoreAllocationRecords = async () => {
    if (allocationLoadingMore || !allocationHasMore) return;
    const nextPage = allocationPage + 1;
    setAllocationPage(nextPage);
    await fetchAllocationRecords(nextPage, true);
  };

  return (
    <Layout
      loading={loading && !stats}
      header={<NavCommon title="算力中心" />}
    >
      <div className={style.powerPage}>
        {/* 算力概览区域：蓝色卡片 + 4个统计卡片 */}
        <div className={style.overviewSection}>
          {/* 蓝色算力概览卡片 */}
          <div className={style.overviewCard}>
            <div className={style.overviewContent}>
              <div className={style.remainingPower}>
                <div className={style.remainingLabel}>剩余算力</div>
                <div className={style.remainingValue}>
                  {formatNumber(stats?.remainingTokens)}
                </div>
              </div>
              <div className={style.totalInfo}>
                <span>总计 {stats?.totalTokens || 0}</span>
              </div>
              <div className={style.progressBar}>
                <div
                  className={style.progressFill}
                  style={{
                    width: `${getUsageRate()}%`,
                  }}
                />
              </div>
              <div className={style.usageRate}>
                使用率 {getUsageRate()}%
              </div>
              <ThunderboltOutlined className={style.lightningIcon} />
            </div>
          </div>

          {/* 4个统计卡片（2x2网格） */}
          <div className={style.statsGrid}>
            <Card className={`${style.statCard} ${style.statCardGreen}`}>
              <div className={style.statTitleRow}>
                <LineChartOutlined className={style.statIcon} />
                <div className={style.statTitle}>今日消耗</div>
              </div>
              <div className={style.statValue}>
                {formatNumber(stats?.todayUsed)}
              </div>
            </Card>
            <Card className={`${style.statCard} ${style.statCardGrey}`}>
              <div className={style.statTitleRow}>
                <BarChartOutlined className={style.statIcon} />
                <div className={style.statTitle}>昨日消耗</div>
              </div>
              <div className={style.statValue}>
                {formatNumber(stats?.yesterdayUsed)}
              </div>
            </Card>
            <Card className={`${style.statCard} ${style.statCardPurple}`}>
              <div className={style.statTitleRow}>
                <HistoryOutlined className={style.statIcon} />
                <div className={style.statTitle}>历史消耗</div>
              </div>
              <div className={style.statValue}>
                {formatNumber(stats?.historyConsumed || stats?.totalConsumed)}
              </div>
            </Card>
            <Card className={`${style.statCard} ${style.statCardOrange}`}>
              <div className={style.statTitleRow}>
                <CalendarOutlined className={style.statIcon} />
                <div className={style.statTitle}>预计可用(天)</div>
              </div>
              <div className={style.statValue}>
                {getEstimatedDays()}
              </div>
            </Card>
          </div>
        </div>

        {/* 导航标签 */}
        <div className={style.navTabs}>
          {navTabs.map(tab => (
            <div
              key={tab.key}
              className={`${style.navTab} ${activeTab === tab.key ? style.navTabActive : ""}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>


        {/* 算力明细Tab内容 */}
        {activeTab === "details" && (
          <>
            {/* 筛选器 */}
            <div className={style.filters}>
              <Picker
                columns={[typeOptions]}
                visible={filterTypeVisible}
                onClose={() => setFilterTypeVisible(false)}
                value={[filterType]}
                onConfirm={value => {
                  setFilterType(value[0] as string);
                  setFilterTypeVisible(false);
                }}
              >
                {() => (
                  <div
                    className={style.filterButton}
                    onClick={() => setFilterTypeVisible(true)}
                  >
                    <DownOutlined className={style.filterIcon} />
                    {getTypeLabel()}
                  </div>
                )}
              </Picker>

              <Picker
                columns={[actionOptions]}
                visible={filterActionVisible}
                onClose={() => setFilterActionVisible(false)}
                value={[filterAction]}
                onConfirm={value => {
                  setFilterAction(value[0] as string);
                  setFilterActionVisible(false);
                }}
              >
                {() => (
                  <div
                    className={style.filterButton}
                    onClick={() => setFilterActionVisible(true)}
                  >
                    <DownOutlined className={style.filterIcon} />
                    {getActionLabel()}
                  </div>
                )}
              </Picker>

              <Picker
                columns={[timeOptions]}
                visible={filterTimeVisible}
                onClose={() => setFilterTimeVisible(false)}
                value={[filterTime]}
                onConfirm={value => {
                  setFilterTime(value[0] as string);
                  setFilterTimeVisible(false);
                }}
              >
                {() => (
                  <div
                    className={style.filterButton}
                    onClick={() => setFilterTimeVisible(true)}
                  >
                    <DownOutlined className={style.filterIcon} />
                    {getTimeLabel()}
                  </div>
                )}
              </Picker>
            </div>

            {/* 算力消耗记录列表 */}
            <div className={style.recordList}>
              {loading && records.length === 0 ? (
                <div className={style.loadingContainer}>
                  <div className={style.loadingText}>加载中...</div>
                </div>
              ) : records.length > 0 ? (
                <>
                  {records.map(record => {
                    const isConsume = record.type === 0;
                    const powerColor = isConsume ? '#ff7a00' : '#52c41a';
                    const iconBgColor = isConsume ? '#fff4e6' : '#f6ffed';

                    return (
                      <div key={record.id} className={style.recordItem}>
                        {/* 左侧：图标 + 文字信息 */}
                        <div className={style.recordLeft}>
                          <div
                            className={style.recordIconWrapper}
                            style={{ backgroundColor: iconBgColor }}
                          >
                            <ThunderboltOutlined
                              className={style.recordIcon}
                              style={{ color: powerColor }}
                            />
                          </div>
                          <div className={style.recordInfo}>
                            <div
                              className={style.recordTitle}
                              style={{ color: powerColor }}
                            >
                              {getRecordTitle(record)}
                            </div>
                            <div className={style.recordTime}>
                              {formatDateTime(record.createTime)}
                            </div>
                          </div>
                        </div>
                        {/* 右侧：算力数值 */}
                        <div className={style.recordRight}>
                          <div
                            className={style.recordPower}
                            style={{ color: powerColor }}
                          >
                            {isConsume ? '-' : '+'}{formatNumber(Math.abs(record.tokens))}
                          </div>
                          <div className={style.recordPowerUnit}>算力点</div>
                        </div>
                      </div>
                    );
                  })}
                  <InfiniteScroll
                    loadMore={loadMoreRecords}
                    hasMore={recordHasMore}
                    threshold={100}
                  />
                </>
              ) : (
                <div className={style.emptyRecords}>
                  <div className={style.emptyText}>暂无消耗记录</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 购买算力Tab内容 */}
        {activeTab === "buy" && (
          <div className={style.buyPowerContent}>
            {loading && packages.length === 0 ? (
              <div className={style.loadingContainer}>
                <div className={style.loadingText}>加载中...</div>
              </div>
            ) : (
              packages.map(pkg => {
                const savings = getSavings(pkg);
                const tokensValue = formatTokens(pkg.tokens);

                return (
                  <Card key={pkg.id} className={style.packageCard}>
                    {/* 套餐头部 */}
                    <div className={style.packageHeader}>
                      <div className={style.packageNameRow}>
                        <span className={style.packageName}>{pkg.name}</span>
                        {pkg.discount > 0 && (
                          <span className={style.discountTag}>
                            {pkg.discount}% OFF
                          </span>
                        )}
                      </div>
                      <div className={style.packageTokensHeader}>
                        <ThunderboltOutlined className={style.tokensIcon} />
                        <div className={style.tokensValue}>
                          <div className={style.tokensNumber}>{tokensValue}</div>
                          <div className={style.tokensUnit}>算力</div>
                        </div>
                      </div>
                    </div>

                    {/* 价格信息 */}
                    <div className={style.packagePriceSection}>
                      <div className={style.priceRow}>
                        <span className={style.currentPrice}>
                          ¥{(pkg.price / 100).toFixed(2)}
                        </span>
                        {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                          <span className={style.originalPrice}>
                            ¥{(pkg.originalPrice / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {savings > 0 && (
                        <div className={style.savings}>
                          节省 ¥{(savings / 100).toFixed(2)}
                        </div>
                      )}
                      <div className={style.unitPrice}>
                        ¥{pkg.unitPrice.toFixed(3)}/算力
                      </div>
                    </div>

                    {/* 功能列表 */}
                    {pkg.description && pkg.description.length > 0 && (
                      <div className={style.packageFeatures}>
                        {pkg.description.map((desc, index) => (
                          <div key={index} className={style.featureItem}>
                            <CheckCircleOutlined className={style.featureIcon} />
                            <span>{desc}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 立即购买按钮 */}
                    <Button
                      block
                      color="primary"
                      size="large"
                      className={style.buyButton}
                      loading={buyLoading}
                      onClick={() => handleBuyPackage(pkg)}
                    >
                      <ThunderboltOutlined className={style.buyButtonIcon} />
                      立即购买
                    </Button>
                  </Card>
                );
              })
            )}

            {/* 自定义算力包 */}
            <Card className={style.customPackageCard}>
              <div className={style.customPackageHeader}>
                <div className={style.customPackageIcon}>
                  <AimOutlined />
                </div>
                <div className={style.customPackageTitle}>自定义算力包</div>
                <div className={style.customPackageDesc}>
                  根据您的需求定制,灵活购买算力
                </div>
              </div>

              {/* 快速选择 */}
              <div className={style.quickSelectButtons}>
                {[10, 50, 100].map(amount => (
                  <button
                    key={amount}
                    className={`${style.quickSelectBtn} ${
                      selectedQuickAmount === amount ? style.quickSelectBtnActive : ""
                    }`}
                    onClick={() => handleQuickSelect(amount)}
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>

              {/* 自定义输入 */}
              <div className={style.customInputWrapper}>
                <Input
                  type="number"
                  placeholder="请输入购买金额（元）"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={style.customInput}
                />
              </div>

              {/* 立即购买按钮 */}
              <Button
                block
                size="large"
                className={style.customBuyButton}
                loading={buyLoading}
                onClick={handleBuyCustom}
                disabled={!customAmount || !customAmount.trim()}
              >
                立即购买
              </Button>
            </Card>

            {/* 安全保障承诺 */}
            <Card className={style.securityCard}>
              <div className={style.securityHeader}>
                <CheckCircleOutlined className={style.securityIcon} />
                <span className={style.securityTitle}>安全保障承诺</span>
              </div>
              <div className={style.securityList}>
                <div className={style.securityItem}>
                  <CheckCircleOutlined className={style.securityItemIcon} />
                  <span>算力永不过期,购买后永久有效</span>
                </div>
                <div className={style.securityItem}>
                  <CheckCircleOutlined className={style.securityItemIcon} />
                  <span>透明计费,每次AI服务消耗明细可查</span>
                </div>
                <div className={style.securityItem}>
                  <CheckCircleOutlined className={style.securityItemIcon} />
                  <span>7×24小时技术支持</span>
                </div>
                <div className={style.securityItem}>
                  <CheckCircleOutlined className={style.securityItemIcon} />
                  <span>企业级数据安全全认证</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 购买记录Tab内容 */}
        {activeTab === "orders" && (
          <div className={style.ordersContent}>
            {/* 搜索栏 */}
            <div className={style.searchBar}>
              <SearchOutlined className={style.searchIcon} />
              <Input
                placeholder="搜索订单号"
                value={orderKeyword}
                onChange={value => {
                  setOrderKeyword(value);
                }}
                onEnterPress={() => {
                  setOrderPage(1);
                  setOrderHasMore(true);
                  fetchOrders(1, false);
                }}
                className={style.searchInput}
              />
            </div>

            {/* 筛选器 */}
            <div className={style.orderFilters}>
              <Picker
                columns={[orderStatusOptions]}
                visible={orderStatusVisible}
                onClose={() => setOrderStatusVisible(false)}
                value={[orderStatus]}
                onConfirm={value => {
                  setOrderStatus(value[0] as string);
                  setOrderStatusVisible(false);
                  // useEffect 会自动触发 fetchOrders
                }}
              >
                {() => (
                  <div
                    className={style.filterButton}
                    onClick={() => setOrderStatusVisible(true)}
                  >
                    <DownOutlined className={style.filterIcon} />
                    {getOrderStatusLabel()}
                  </div>
                )}
              </Picker>

              <Picker
                columns={[orderTimeOptions]}
                visible={orderTimeVisible}
                onClose={() => setOrderTimeVisible(false)}
                value={[orderTime]}
                onConfirm={value => {
                  setOrderTime(value[0] as string);
                  setOrderTimeVisible(false);
                  // useEffect 会自动触发 fetchOrders
                }}
              >
                {() => (
                  <div
                    className={style.filterButton}
                    onClick={() => setOrderTimeVisible(true)}
                  >
                    <DownOutlined className={style.filterIcon} />
                    {getOrderTimeLabel()}
                  </div>
                )}
              </Picker>

              <Picker
                columns={[orderPayTypeOptions]}
                visible={orderPayTypeVisible}
                onClose={() => setOrderPayTypeVisible(false)}
                value={[orderPayType]}
                onConfirm={value => {
                  setOrderPayType(value[0] as string);
                  setOrderPayTypeVisible(false);
                  // useEffect 会自动触发 fetchOrders
                }}
              >
                {() => (
                  <div
                    className={style.filterButton}
                    onClick={() => setOrderPayTypeVisible(true)}
                  >
                    <DownOutlined className={style.filterIcon} />
                    {getOrderPayTypeLabel()}
                  </div>
                )}
              </Picker>
            </div>

            {/* 订单列表 */}
            <div className={style.orderList}>
              {loading && orders.length === 0 ? (
                <div className={style.loadingContainer}>
                  <div className={style.loadingText}>加载中...</div>
                </div>
              ) : orders.length > 0 ? (
                <>
                  {orders.map(order => {
                    const statusInfo = getOrderStatusInfo(order.status);
                    // tokens 已经是格式化好的字符串，如 "280,000"
                    const tokens = order.tokens || "0";

                    return (
                      <Card key={order.id} className={style.orderCard}>
                        <div className={style.orderHeader}>
                          <div className={style.orderTitle}>
                            {order.goodsName || "算力充值"}
                          </div>
                          <div className={style.orderAmount}>
                            +{tokens}
                          </div>
                        </div>
                        <div className={style.orderInfo}>
                          <div className={style.orderLeft}>
                            <div className={style.orderNumber}>
                              订单号: {order.orderNo || "-"}
                            </div>
                            <div className={style.orderPayment}>
                              {order.payType === 1 ? (
                                <WechatOutlined className={style.paymentIcon} />
                              ) : order.payType === 2 ? (
                                <AlipayCircleOutlined className={style.paymentIcon} />
                              ) : null}
                              {order.payType ? getPayTypeText(order.payType) : order.payTypeText || "未支付"}
                            </div>
                          </div>
                          <div className={style.orderRight}>
                            <div
                              className={style.orderStatus}
                              style={{
                                color: statusInfo.color,
                                backgroundColor: statusInfo.bgColor,
                              }}
                            >
                              {order.statusText || statusInfo.text}
                            </div>
                            <div className={style.orderTime}>
                              {formatDateTime(order.createTime)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  <InfiniteScroll
                    loadMore={loadMoreOrders}
                    hasMore={orderHasMore}
                    threshold={100}
                  />
                </>
              ) : (
                <div className={style.emptyRecords}>
                  <div className={style.emptyText}>暂无订单记录</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 算力分配Tab内容 */}
        {activeTab === "allocation" && (
          <div className={style.allocationContent}>
            {/* 算力分配表单 */}
            <Card className={style.allocationFormCard}>
              <div className={style.allocationFormHeader}>
                <ThunderboltOutlined className={style.allocationFormIcon} />
                <span className={style.allocationFormTitle}>算力分配</span>
              </div>

              <div className={style.allocationFormBody}>
                {/* 选择账号 */}
                <div className={style.formItem}>
                  <label className={style.formLabel}>选择账号</label>
                  <Picker
                    columns={[accounts.map(acc => ({ label: getAccountDisplayName(acc), value: acc.uid || acc.userId || acc.id }))]}
                    visible={allocationAccountVisible}
                    onClose={() => setAllocationAccountVisible(false)}
                    value={allocationAccount ? [allocationAccount.uid || allocationAccount.userId || allocationAccount.id] : []}
                    onConfirm={value => {
                      const selectedAccount = accounts.find(acc => (acc.uid || acc.userId || acc.id) === value[0]);
                      setAllocationAccount(selectedAccount || null);
                      setAllocationAccountVisible(false);
                    }}
                  >
                    {() => (
                      <div
                        className={style.formInput}
                        onClick={() => setAllocationAccountVisible(true)}
                      >
                        {allocationAccount ? getAccountDisplayName(allocationAccount) : "请选择账号"}
                        <DownOutlined className={style.formInputIcon} />
                      </div>
                    )}
                  </Picker>
                </div>

                {/* 填写数量 */}
                <div className={style.formItem}>
                  <label className={style.formLabel}>填写数量</label>
                  <Input
                    type="number"
                    placeholder="请输入分配算力数量"
                    value={allocationAmount}
                    onChange={setAllocationAmount}
                    className={style.formInput}
                  />
                </div>

                {/* 确认分配按钮 */}
                <Button
                  block
                  color="primary"
                  size="large"
                  className={style.allocationConfirmButton}
                  onClick={handleConfirmAllocation}
                >
                  确认分配
                </Button>
              </div>
            </Card>

            {/* 分配记录 */}
            <Card className={style.allocationRecordsCard}>
              <div className={style.allocationRecordsHeader}>
                <DesktopOutlined className={style.allocationRecordsIcon} />
                <span className={style.allocationRecordsTitle}>分配记录</span>
                <div className={style.allocationRecordsFilters}>
                  <Picker
                    columns={[allocationAccountOptions]}
                    visible={allocationAccountFilterVisible}
                    onClose={() => setAllocationAccountFilterVisible(false)}
                    value={[allocationAccountFilter]}
                    onConfirm={value => {
                      setAllocationAccountFilter(value[0] as string);
                      setAllocationAccountFilterVisible(false);
                      // 重新加载记录
                      setAllocationPage(1);
                      setAllocationHasMore(true);
                      fetchAllocationRecords(1, false);
                    }}
                  >
                    {() => (
                      <div
                        className={style.filterButton}
                        onClick={() => setAllocationAccountFilterVisible(true)}
                      >
                        {allocationAccountOptions.find(opt => opt.value === allocationAccountFilter)?.label || "全部账号"}
                        <DownOutlined className={style.filterIcon} />
                      </div>
                    )}
                  </Picker>

                  <Picker
                    columns={[allocationTimeOptions]}
                    visible={allocationTimeFilterVisible}
                    onClose={() => setAllocationTimeFilterVisible(false)}
                    value={[allocationTimeFilter]}
                    onConfirm={value => {
                      setAllocationTimeFilter(value[0] as string);
                      setAllocationTimeFilterVisible(false);
                      // 重新加载记录
                      setAllocationPage(1);
                      setAllocationHasMore(true);
                      fetchAllocationRecords(1, false);
                    }}
                  >
                    {() => (
                      <div
                        className={style.filterButton}
                        onClick={() => setAllocationTimeFilterVisible(true)}
                      >
                        {allocationTimeOptions.find(opt => opt.value === allocationTimeFilter)?.label || "最近7天"}
                        <DownOutlined className={style.filterIcon} />
                      </div>
                    )}
                  </Picker>
                </div>
              </div>

              {/* 记录列表 */}
              <div className={style.allocationRecordsList}>
                {loading && allocationRecords.length === 0 ? (
                  <div className={style.loadingContainer}>
                    <div className={style.loadingText}>加载中...</div>
                  </div>
                ) : allocationRecords.length > 0 ? (
                  <>
                    {allocationRecords.map(record => {
                      // 从remarks中提取账号信息，格式可能是 "账号名 - 其他信息" 或直接是账号名
                      const accountName = record.remarks || `账号${record.wechatAccountId || record.id}`;

                      return (
                        <div key={record.id} className={style.allocationRecordItem}>
                          <div className={style.allocationRecordLeft}>
                            <UserOutlined className={style.allocationRecordIcon} />
                            <div className={style.allocationRecordInfo}>
                              <div className={style.allocationRecordName}>
                                {accountName}
                              </div>
                              <div className={style.allocationRecordTime}>
                                {formatDateTime(record.createTime)}
                              </div>
                            </div>
                          </div>
                          <div className={style.allocationRecordAmount}>
                            +{formatNumber(Math.abs(record.tokens))}
                          </div>
                        </div>
                      );
                    })}
                    <InfiniteScroll
                      loadMore={loadMoreAllocationRecords}
                      hasMore={allocationHasMore}
                      threshold={100}
                    />
                  </>
                ) : (
                  <div className={style.emptyRecords}>
                    <div className={style.emptyText}>暂无分配记录</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 支付弹框 */}
      <Popup
        visible={paymentDialogVisible}
        onMaskClick={() => setPaymentDialogVisible(false)}
        bodyStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {paymentData && (
          <div className={style.paymentDialog}>
            {/* 头部 */}
            <div className={style.paymentHeader}>
              <div className={style.paymentTitle}>购买算力包</div>
              <CloseOutlined
                className={style.paymentClose}
                onClick={() => setPaymentDialogVisible(false)}
              />
            </div>

            {/* 产品详情 */}
            <div className={style.paymentProduct}>
              <div className={style.paymentProductLeft}>
                <ThunderboltOutlined className={style.paymentProductIcon} />
                <div className={style.paymentProductInfo}>
                  <div className={style.paymentProductName}>
                    {paymentData.packageName}
                  </div>
                  <div className={style.paymentProductTokens}>
                    算力点数: {paymentData.tokens}
                  </div>
                  <div className={style.paymentProductValid}>
                    有效期: 永久
                  </div>
                </div>
              </div>
              <div className={style.paymentProductRight}>
                <div className={style.paymentPrice}>¥{paymentData.price.toFixed(2)}</div>
                {paymentData.discount && paymentData.discount > 0 && (
                  <div className={style.paymentDiscount}>
                    省{paymentData.discount}%
                  </div>
                )}
              </div>
            </div>

            {/* 支付方式选择 */}
            <div className={style.paymentMethods}>
              <div
                className={`${style.paymentMethod} ${
                  paymentData.payType === 1 ? style.paymentMethodActive : ""
                }`}
                onClick={() => handleChangePayType(1)}
              >
                <WechatOutlined className={style.paymentMethodIcon} />
                <span>微信支付</span>
              </div>
              <div
                className={`${style.paymentMethod} ${
                  paymentData.payType === 2 ? style.paymentMethodActive : ""
                }`}
                onClick={() => handleChangePayType(2)}
              >
                <AlipayCircleOutlined className={style.paymentMethodIcon} />
                <span>支付宝</span>
              </div>
            </div>

            {/* 二维码 */}
            <div className={style.paymentQrCode}>
              <img
                src={paymentData.codeUrl}
                alt="支付二维码"
                className={style.qrCodeImage}
              />
              <div className={style.qrCodeHint}>
                <CheckCircleOutlined className={style.qrCodeHintIcon} />
                请使用{paymentData.payType === 1 ? "微信" : "支付宝"}扫码支付
              </div>
            </div>

            {/* 支付信息 */}
            <div className={style.paymentInfo}>
              <div className={style.paymentInfoItem}>
                <ClockCircleOutlined className={style.paymentInfoIcon} />
                <span className={style.paymentInfoLabel}>支付剩余时间</span>
                <span className={style.paymentInfoValue}>
                  {formatCountdown(countdown)}
                </span>
              </div>
              <div className={style.paymentInfoItem}>
                <span className={style.paymentInfoLabel}>二维码有效期至</span>
                <span className={style.paymentInfoValue}>
                  {formatExpireTime(expireTime)}
                </span>
              </div>
              <div className={style.paymentInfoItem}>
                <span className={style.paymentInfoLabel}>订单号</span>
                <div className={style.paymentOrderNo}>
                  <span className={style.orderNoText}>{paymentData.orderNo}</span>
                  <CopyOutlined
                    className={style.copyIcon}
                    onClick={handleCopyOrderNo}
                  />
                </div>
              </div>
            </div>

            {/* 完成支付按钮 */}
            <Button
              block
              color="primary"
              size="large"
              className={style.completePaymentButton}
              onClick={handleCompletePayment}
            >
              <CheckOutlined className={style.completePaymentIcon} />
              我已完成支付
            </Button>

            {/* 支付说明 */}
            <div className={style.paymentInstructions}>
              <div className={style.paymentInstructionsTitle}>
                <ExclamationCircleOutlined className={style.instructionsIcon} />
                支付说明
              </div>
              <div className={style.paymentInstructionsList}>
                <div className={style.instructionItem}>
                  <CheckCircleOutlined className={style.instructionIcon} />
                  <span>
                    请在5分钟内完成支付,超时后需重新生成二维码
                  </span>
                </div>
                <div className={style.instructionItem}>
                  <CheckCircleOutlined className={style.instructionIcon} />
                  <span>
                    支付成功后算力将立即到账,可在账户中查看
                  </span>
                </div>
                <div className={style.instructionItem}>
                  <CheckCircleOutlined className={style.instructionIcon} />
                  <span>
                    支持自动检测支付状态,无需手动刷新
                  </span>
                </div>
                <div className={style.instructionItem}>
                  <CheckCircleOutlined className={style.instructionIcon} />
                  <span>
                    如遇问题请联系客服:400-123-4567
                  </span>
                </div>
                <div className={style.instructionItem}>
                  <CheckCircleOutlined className={style.instructionIcon} />
                  <span>
                    支持7天无理由退款(未使用部分按比例退款)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Popup>

      {/* 支付成功弹框 */}
      <Popup
        visible={paymentSuccessVisible}
        onMaskClick={handleClosePaymentSuccess}
        bodyStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {paymentSuccessData && (
          <div className={style.paymentSuccessDialog}>
            {/* 头部 */}
            <div className={style.paymentSuccessHeader}>
              <div className={style.paymentSuccessTitle}>支付成功</div>
              <CloseOutlined
                className={style.paymentSuccessClose}
                onClick={handleClosePaymentSuccess}
              />
            </div>

            {/* 成功图标和文字 */}
            <div className={style.paymentSuccessIcon}>
              <CheckCircleOutlined />
            </div>
            <div className={style.paymentSuccessText}>支付成功</div>
            <div className={style.paymentSuccessDesc}>
              您购买的算力包已到账
            </div>

            {/* 套餐信息 */}
            <div className={style.paymentSuccessProduct}>
              <div className={style.paymentSuccessProductLeft}>
                <ThunderboltOutlined className={style.paymentSuccessProductIcon} />
                <div className={style.paymentSuccessProductInfo}>
                  <div className={style.paymentSuccessProductName}>
                    {paymentSuccessData.goodsName}
                  </div>
                  {(() => {
                    const specs = parseGoodsSpecs(paymentSuccessData.goodsSpecs);
                    const tokens = specs?.tokens || 0;
                    return (
                      <div className={style.paymentSuccessProductTokens}>
                        算力点数: {tokens.toLocaleString()}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className={style.paymentSuccessProductRight}>
                <div className={style.paymentSuccessPrice}>
                  ¥{(paymentSuccessData.money / 100).toFixed(2)}
                </div>
                <div className={style.paymentSuccessPayType}>
                  支付方式: {paymentSuccessData.payType === 1 ? "微信支付" : paymentSuccessData.payType === 2 ? "支付宝" : "未知"}
                </div>
              </div>
            </div>

            {/* 订单信息 */}
            <div className={style.paymentSuccessInfo}>
              <div className={style.paymentSuccessInfoItem}>
                <span className={style.paymentSuccessInfoLabel}>支付时间</span>
                <span className={style.paymentSuccessInfoValue}>
                  {formatPayTime(paymentSuccessData.payTime)}
                </span>
              </div>
              <div className={style.paymentSuccessInfoItem}>
                <span className={style.paymentSuccessInfoLabel}>订单号</span>
                <div className={style.paymentSuccessOrderNo}>
                  <span className={style.successOrderNoText}>
                    {paymentSuccessData.orderNo}
                  </span>
                  <CopyOutlined
                    className={style.successCopyIcon}
                    onClick={handleCopySuccessOrderNo}
                  />
                </div>
              </div>
            </div>

            {/* 完成按钮 */}
            <Button
              block
              color="primary"
              size="large"
              className={style.paymentSuccessButton}
              onClick={handleClosePaymentSuccess}
            >
              完成
            </Button>
          </div>
        )}
      </Popup>
    </Layout>
  );
};

export default PowerManagement;
