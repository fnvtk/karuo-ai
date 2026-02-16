import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, SpinLoading, Tag, Toast } from "antd-mobile";
import {
  CheckCircleOutline,
  CloseCircleOutline,
  ClockCircleOutline,
  ExclamationCircleOutline,
} from "antd-mobile-icons";
import { CopyOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getRechargeOrderDetail } from "../api";
import type { RechargeOrderDetail } from "../data";
import style from "./index.module.scss";

type StatusMeta = {
  title: string;
  description: string;
  amountPrefix: string;
  color: string;
  icon: React.ReactNode;
};

type StatusCode = 0 | 1 | 2 | 3 | 4;

const statusMetaMap: Record<StatusCode, StatusMeta> = {
  1: {
    title: "支付成功",
    description: "订单已完成支付",
    amountPrefix: "已支付",
    color: "#00b578",
    icon: <CheckCircleOutline className={style.statusIcon} color="#00b578" />,
  },
  0: {
    title: "待支付",
    description: "请尽快完成支付，以免订单失效",
    amountPrefix: "待支付",
    color: "#faad14",
    icon: <ClockCircleOutline className={style.statusIcon} color="#faad14" />,
  },
  4: {
    title: "支付失败",
    description: "支付未成功，可重新发起支付",
    amountPrefix: "需支付",
    color: "#ff4d4f",
    icon: <CloseCircleOutline className={style.statusIcon} color="#ff4d4f" />,
  },
  2: {
    title: "订单已取消",
    description: "该订单已取消，如需继续请重新创建订单",
    amountPrefix: "订单金额",
    color: "#86909c",
    icon: (
      <ExclamationCircleOutline className={style.statusIcon} color="#86909c" />
    ),
  },
  3: {
    title: "订单已退款",
    description: "订单款项已退回，请注意查收",
    amountPrefix: "退款金额",
    color: "#1677ff",
    icon: (
      <ExclamationCircleOutline className={style.statusIcon} color="#1677ff" />
    ),
  },
};

const parseStatusCode = (status?: RechargeOrderDetail["status"]) => {
  if (status === undefined || status === null) return undefined;
  if (typeof status === "number")
    return statusMetaMap[status] ? status : undefined;
  const numeric = Number(status);
  if (!Number.isNaN(numeric) && statusMetaMap[numeric as StatusCode]) {
    return numeric as StatusCode;
  }
  const map: Record<string, StatusCode> = {
    success: 1,
    pending: 0,
    failed: 4,
    cancelled: 2,
    refunded: 3,
  };
  return map[status] ?? undefined;
};

const formatDateTime = (value?: string | number | null) => {
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
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const centsToYuan = (value?: number | string | null) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "string" && value.trim() === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (Number.isInteger(num)) return num / 100;
  return num;
};

const RechargeOrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RechargeOrderDetail | null>(null);

  useEffect(() => {
    if (!id) {
      Toast.show({ content: "缺少订单ID", position: "top" });
      navigate(-1);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await getRechargeOrderDetail({ orderNo: id });
        setDetail(res);
      } catch (error) {
        console.error("获取订单详情失败:", error);
        Toast.show({ content: "获取订单详情失败", position: "top" });
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, navigate]);

  const meta = useMemo<StatusMeta>(() => {
    if (!detail) {
      return statusMetaMap[0];
    }
    const code = parseStatusCode(detail.status);
    if (code !== undefined && statusMetaMap[code]) {
      return statusMetaMap[code];
    }
    return statusMetaMap[0];
  }, [detail]);

  const handleCopy = async (text?: string) => {
    if (!text) return;
    if (!navigator.clipboard) {
      Toast.show({ content: "当前环境不支持复制", position: "top" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      Toast.show({ content: "复制成功", position: "top" });
    } catch (error) {
      console.error("复制失败:", error);
      Toast.show({ content: "复制失败，请手动复制", position: "top" });
    }
  };

  const handleApplyInvoice = () => {
    Toast.show({ content: "发票功能即将上线，敬请期待", position: "top" });
  };

  const handleBack = () => {
    navigate("/recharge");
  };

  const renderRefundInfo = () => {
    if (!detail?.refundAmount) return null;
    return (
      <div className={style.refundBlock}>
        <div className={style.refundTitle}>退款信息</div>
        <div>退款金额：¥{centsToYuan(detail.refundAmount).toFixed(2)}</div>
        {detail.refundTime ? (
          <div>退款时间：{formatDateTime(detail.refundTime)}</div>
        ) : null}
        {detail.refundReason ? (
          <div>退款原因：{detail.refundReason}</div>
        ) : null}
      </div>
    );
  };

  return (
    <Layout
      header={<NavCommon title="订单详情" />}
      loading={loading && !detail}
      footer={
        <div className={style.actions}>
          <Button className={style.invoiceBtn} onClick={handleApplyInvoice}>
            申请发票
          </Button>
          <Button className={style.backBtn} onClick={handleBack}>
            返回算力中心
          </Button>
        </div>
      }
    >
      <div className={style.detailPage}>
        {loading && !detail ? (
          <div className={style.loadingWrapper}>
            <SpinLoading color="primary" />
          </div>
        ) : !detail ? (
          <div className={style.emptyWrapper}>未找到订单详情</div>
        ) : (
          <>
            <div className={style.statusCard}>
              {meta.icon}
              <div className={style.statusTitle}>{meta.title}</div>
              <div className={style.statusDesc}>{meta.description}</div>
              <div
                className={style.amountHighlight}
                style={{ color: meta.color }}
              >
                {meta.amountPrefix} ¥
                {centsToYuan(detail.money ?? detail.amount ?? 0).toFixed(2)}
              </div>
            </div>

            <div className={style.section}>
              <div className={style.sectionTitle}>订单信息</div>
              <div className={style.sectionList}>
                <div className={style.row}>
                  <span className={style.label}>订单号</span>
                  <span className={style.value}>
                    {detail.orderNo || "-"}
                    <span
                      className={style.copyBtn}
                      onClick={() => handleCopy(detail.orderNo)}
                    >
                      <CopyOutlined />
                    </span>
                  </span>
                </div>
                <div className={style.row}>
                  <span className={style.label}>套餐名称</span>
                  <span className={style.value}>
                    {detail.description || detail.goodsName || "算力充值"}
                  </span>
                </div>
                <div className={style.row}>
                  <span className={style.label}>订单金额</span>
                  <span className={style.value}>
                    ¥
                    {centsToYuan(detail.money ?? detail.amount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className={style.row}>
                  <span className={style.label}>创建时间</span>
                  <span className={style.value}>
                    {formatDateTime(detail.createTime)}
                  </span>
                </div>
                <div className={style.row}>
                  <span className={style.label}>支付时间</span>
                  <span className={style.value}>
                    {formatDateTime(detail.payTime)}
                  </span>
                </div>
                {detail.balance !== undefined ? (
                  <div className={style.row}>
                    <span className={style.label}>充值后余额</span>
                    <span className={style.value}>
                      ¥{centsToYuan(detail.balance).toFixed(2)}
                    </span>
                  </div>
                ) : null}
              </div>
              {renderRefundInfo()}
            </div>

            <div className={style.section}>
              <div className={style.sectionTitle}>支付信息</div>
              <div className={style.sectionList}>
                <div className={style.row}>
                  <span className={style.label}>支付方式</span>
                  <span className={style.value}>
                    <span className={style.tagGroup}>
                      <Tag color="primary" fill="outline">
                        {detail.payTypeText ||
                          detail.paymentChannel ||
                          detail.paymentMethod ||
                          "其他支付"}
                      </Tag>
                    </span>
                  </span>
                </div>
                <div className={style.row}>
                  <span className={style.label}>交易流水号</span>
                  <span className={style.value}>{detail.id || "-"}</span>
                </div>
                {detail.remark ? (
                  <div className={style.row}>
                    <span className={style.label}>备注信息</span>
                    <span className={style.value}>{detail.remark}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default RechargeOrderDetailPage;
