import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, SpinLoading, Empty, Toast, Dialog } from "antd-mobile";
import {
  WalletOutlined,
  ClockCircleOutlined,
  WechatOutlined,
  AlipayCircleOutlined,
  BankOutlined,
} from "@ant-design/icons";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import { getRechargeOrders, continuePay } from "./api";
import { RechargeOrder } from "./data";
import style from "./index.module.scss";

type StatusCode = 0 | 1 | 2 | 3 | 4;

const STATUS_META: Record<
  StatusCode,
  { label: string; color: string; tagBgOpacity?: number }
> = {
  0: { label: "待支付", color: "#faad14" },
  1: { label: "充值成功", color: "#52c41a" },
  2: { label: "已取消", color: "#999999" },
  3: { label: "已退款", color: "#1890ff" },
  4: { label: "充值失败", color: "#ff4d4f" },
};

const parseStatusCode = (
  status?: RechargeOrder["status"],
): StatusCode | undefined => {
  if (status === undefined || status === null) return undefined;

  if (typeof status === "number") {
    return STATUS_META[status as StatusCode]
      ? (status as StatusCode)
      : undefined;
  }

  const numeric = Number(status);
  if (!Number.isNaN(numeric) && STATUS_META[numeric as StatusCode]) {
    return numeric as StatusCode;
  }

  const stringMap: Record<string, StatusCode> = {
    success: 1,
    pending: 0,
    cancelled: 2,
    refunded: 3,
    failed: 4,
  };

  return stringMap[status] ?? undefined;
};

const formatTimestamp = (value?: string | number | null) => {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string" && value.trim() === "") return "-";

  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  const timestamp =
    numericValue > 1e12
      ? numericValue
      : numericValue > 1e10
        ? numericValue
        : numericValue * 1000;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (days === 1) {
    return `昨天 ${date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (days < 7) {
    return `${days}天前`;
  }
  return date.toLocaleDateString("zh-CN");
};

const centsToYuan = (value?: number | string | null) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "string" && value.trim() === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (Number.isInteger(num)) return num / 100;
  return num;
};

const getPaymentMethodText = (order: RechargeOrder) => {
  if (order.payTypeText) return order.payTypeText;
  if (order.paymentChannel) return order.paymentChannel;
  if (order.paymentMethod) return order.paymentMethod;
  return "其他支付";
};

const RechargeOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payingOrderNo, setPayingOrderNo] = useState<string | null>(null);

  const loadOrders = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20,
        orderType: 1,
        ...(statusFilter !== "all" && { status: statusFilter }),
      };

      const response = await getRechargeOrders(params);
      const newOrders = response.list || [];
      setOrders(prev => (reset ? newOrders : [...prev, ...newOrders]));
      setHasMore(newOrders.length === 20);
      if (reset) setPage(1);
      else setPage(currentPage + 1);
    } catch (error) {
      console.error("加载充值记录失败:", error);
      Toast.show({ content: "加载失败，请重试", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选条件变化时重新加载
  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    setOrders([]);
    loadOrders(true);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "wechat":
        return <WechatOutlined style={{ color: "#07c160" }} />;
      case "alipay":
        return <AlipayCircleOutlined style={{ color: "#1677ff" }} />;
      case "bank":
        return <BankOutlined style={{ color: "#722ed1" }} />;
      default:
        return <WalletOutlined style={{ color: "#666" }} />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "wechat":
        return "#07c160";
      case "alipay":
        return "#1677ff";
      case "bank":
        return "#722ed1";
      default:
        return "#666";
    }
  };

  const handleViewDetail = (order: RechargeOrder) => {
    const identifier = order.orderNo || order.id;
    if (!identifier) {
      Toast.show({
        content: "无法打开订单详情",
        position: "top",
      });
      return;
    }
    navigate(`/recharge/order/${identifier}`);
  };

  const openPayDialog = (
    order: RechargeOrder,
    options: { codeUrl?: string; payUrl?: string },
  ) => {
    const { codeUrl, payUrl } = options;
    if (codeUrl) {
      Dialog.show({
        content: (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div
              style={{
                marginBottom: "16px",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              请使用微信扫码完成支付
            </div>
            <img
              src={codeUrl}
              alt="支付二维码"
              style={{ width: "220px", height: "220px", margin: "0 auto" }}
            />
            <div
              style={{
                marginTop: "16px",
                color: "#666",
                fontSize: "14px",
              }}
            >
              支付金额：￥
              {centsToYuan(order.money ?? order.amount ?? 0).toFixed(2)}
            </div>
          </div>
        ),
        closeOnMaskClick: true,
      });
      return;
    }

    if (payUrl) {
      window.location.href = payUrl;
      return;
    }

    Toast.show({
      content: "暂未获取到支付信息，请稍后重试",
      position: "top",
    });
  };

  const handleContinuePay = async (order: RechargeOrder) => {
    if (!order.orderNo) {
      Toast.show({
        content: "订单号缺失，无法继续支付",
        position: "top",
      });
      return;
    }

    const orderNo = String(order.orderNo);
    setPayingOrderNo(orderNo);
    try {
      const res = await continuePay({ orderNo });
      const codeUrl = res?.code_url || res?.codeUrl;
      const payUrl = res?.payUrl;
      if (!codeUrl && !payUrl) {
        Toast.show({
          content: "未获取到支付链接，请稍后重试",
          position: "top",
        });
        return;
      }
      openPayDialog(order, { codeUrl, payUrl });
    } catch (error) {
      console.error("继续支付失败:", error);
      Toast.show({
        content: "继续支付失败，请重试",
        position: "top",
      });
    } finally {
      setPayingOrderNo(prev => (prev === orderNo ? null : prev));
    }
  };

  const renderOrderItem = (order: RechargeOrder) => {
    const statusCode = parseStatusCode(order.status);
    const statusMeta =
      statusCode !== undefined ? STATUS_META[statusCode] : undefined;
    const paymentMethod = getPaymentMethodText(order);
    const paymentMethodKey = paymentMethod.toLowerCase();
    const statusBgOpacity = statusMeta?.tagBgOpacity ?? 0.15;
    const statusBgColor = statusMeta
      ? `${statusMeta.color}${Math.round(statusBgOpacity * 255)
          .toString(16)
          .padStart(2, "0")}`
      : "#66666626";
    const amount = centsToYuan(order.money ?? order.amount ?? 0) || 0;
    const isPaying = payingOrderNo === order.orderNo;
    const actions: React.ReactNode[] = [];

    if (statusCode === 0) {
      actions.push(
        <button
          key="continue"
          className={`${style["action-btn"]} ${style["primary"]}`}
          onClick={() => handleContinuePay(order)}
          disabled={isPaying}
        >
          {isPaying ? "处理中..." : "继续支付"}
        </button>,
      );
    }

    if (statusCode === 4) {
      actions.push(
        <button
          key="retry"
          className={`${style["action-btn"]} ${style["primary"]}`}
          onClick={() => navigate("/recharge")}
        >
          重新充值
        </button>,
      );
    }

    if (statusCode === 1 || statusCode === 3 || statusCode === 2) {
      actions.push(
        <button
          key="purchase-again"
          className={`${style["action-btn"]} ${style["secondary"]}`}
          onClick={() => navigate("/recharge")}
        >
          再次购买
        </button>,
      );
    }

    actions.push(
      <button
        key="detail"
        className={`${style["action-btn"]} ${style["secondary"]}`}
        onClick={() => handleViewDetail(order)}
      >
        查看详情
      </button>,
    );

    return (
      <Card key={order.id} className={style["order-card"]}>
        <div className={style["order-header"]}>
          <div className={style["order-info"]}>
            <div className={style["order-no"]}>
              订单号：{order.orderNo || "-"}
            </div>
            <div className={style["order-time"]}>
              <ClockCircleOutlined style={{ fontSize: 12 }} />
              {formatTimestamp(order.createTime)}
            </div>
          </div>
          <div className={style["order-amount"]}>
            <div className={style["amount-text"]}>￥{amount.toFixed(2)}</div>
            <div
              className={style["status-tag"]}
              style={{
                backgroundColor: statusBgColor,
                color: statusMeta?.color || "#666",
              }}
            >
              {statusMeta?.label || "未知状态"}
            </div>
          </div>
        </div>

        <div className={style["order-details"]}>
          <div className={style["payment-method"]}>
            <div
              className={style["method-icon"]}
              style={{
                backgroundColor: getPaymentMethodColor(paymentMethodKey),
              }}
            >
              {getPaymentMethodIcon(paymentMethod)}
            </div>
            <div className={style["method-text"]}>{paymentMethod}</div>
          </div>

          {(order.description || order.remark) && (
            <div className={style["detail-row"]}>
              <span className={style["label"]}>备注</span>
              <span className={style["value"]}>
                {order.description || order.remark}
              </span>
            </div>
          )}

          {order.payTime && (
            <div className={style["detail-row"]}>
              <span className={style["label"]}>支付时间</span>
              <span className={style["value"]}>
                {formatTimestamp(order.payTime)}
              </span>
            </div>
          )}

          {order.balance !== undefined && (
            <div className={style["balance-info"]}>
              充值后余额: ￥{order.balance.toFixed(2)}
            </div>
          )}
        </div>

        {/* {order.status === "pending" && (
        <div className={style["order-actions"]}>
          <button
            className={`${style["action-btn"]} ${style["danger"]}`}
            onClick={() => handleCancelOrder(order.id)}
          >
            取消订单
          </button>
        </div>
      )} */}

        {actions.length > 0 && (
          <div className={style["order-actions"]}>{actions}</div>
        )}
      </Card>
    );
  };

  const filterTabs = [
    { key: "all", label: "全部" },
    { key: "1", label: "成功" },
    { key: "0", label: "待支付" },
    { key: "2", label: "已取消" },
    { key: "3", label: "已退款" },
  ];

  return (
    <Layout
      header={<NavCommon title="充值记录" />}
      loading={loading && page === 1}
    >
      <div className={style["recharge-orders-page"]}>
        <div className={style["filter-bar"]}>
          <div className={style["filter-tabs"]}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                className={`${style["filter-tab"]} ${
                  statusFilter === tab.key ? style["active"] : ""
                }`}
                onClick={() => handleFilterChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {orders.length === 0 && !loading ? (
          <Empty
            className={style["empty-state"]}
            description="暂无充值记录"
            image={<WalletOutlined className={style["empty-icon"]} />}
          />
        ) : (
          <div className={style["orders-list"]}>
            {orders.map(renderOrderItem)}
            {loading && page > 1 && (
              <div className={style["loading-container"]}>
                <SpinLoading color="primary" />
                <div className={style["loading-text"]}>加载中...</div>
              </div>
            )}
            {!loading && hasMore && (
              <div className={style["load-more"]} onClick={() => loadOrders()}>
                加载更多
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RechargeOrders;
