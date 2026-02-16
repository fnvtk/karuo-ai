import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  NavBar,
  Tabs,
  Switch,
  Toast,
  SpinLoading,
  Button,
  Avatar,
} from "antd-mobile";
import { SettingOutlined, RedoOutlined, UserOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import {
  fetchDeviceDetail,
  fetchDeviceRelatedAccounts,
  fetchDeviceHandleLogs,
  updateDeviceTaskConfig,
} from "./api";
import type { Device, WechatAccount, HandleLog } from "@/types/device";
import NavCommon from "@/components/NavCommon";
const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<Device | null>(null);
  const [tab, setTab] = useState("info");
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [logs, setLogs] = useState<HandleLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [featureSaving, setFeatureSaving] = useState<{ [k: string]: boolean }>(
    {},
  );

  // 获取设备详情
  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetchDeviceDetail(id);
      setDevice(res);
    } catch (e: any) {
      Toast.show({ content: e.message || "获取设备详情失败", position: "top" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 获取关联账号
  const loadAccounts = useCallback(async () => {
    if (!id) return;
    setAccountsLoading(true);
    try {
      const res = await fetchDeviceRelatedAccounts(id);
      setAccounts(Array.isArray(res.accounts) ? res.accounts : []);
    } catch (e: any) {
      Toast.show({ content: e.message || "获取关联账号失败", position: "top" });
    } finally {
      setAccountsLoading(false);
    }
  }, [id]);

  // 获取操作日志
  const loadLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    try {
      const res = await fetchDeviceHandleLogs(id, 1, 20);
      setLogs(Array.isArray(res.list) ? res.list : []);
    } catch (e: any) {
      Toast.show({ content: e.message || "获取操作日志失败", position: "top" });
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (tab === "accounts") loadAccounts();
    if (tab === "logs") loadLogs();
    // eslint-disable-next-line
  }, [tab]);

  // 功能开关
  const handleFeatureChange = async (
    feature: keyof Device["features"],
    checked: boolean,
  ) => {
    if (!id) return;
    setFeatureSaving(prev => ({ ...prev, [feature]: true }));
    try {
      await updateDeviceTaskConfig({ deviceId: id, [feature]: checked });
      setDevice(prev =>
        prev
          ? {
              ...prev,
              features: { ...prev.features, [feature]: checked },
            }
          : prev,
      );
      Toast.show({
        content: `${getFeatureName(feature)}已${checked ? "开启" : "关闭"}`,
      });
    } catch (e: any) {
      Toast.show({ content: e.message || "设置失败", position: "top" });
    } finally {
      setFeatureSaving(prev => ({ ...prev, [feature]: false }));
    }
  };

  const getFeatureName = (feature: string) => {
    const map: Record<string, string> = {
      autoAddFriend: "自动加好友",
      autoReply: "自动回复",
      momentsSync: "朋友圈同步",
      aiChat: "AI会话",
    };
    return map[feature] || feature;
  };

  return (
    <Layout
      header={
        <>
          <NavCommon title="设备详情" />

          {/* 基本信息卡片 */}
          {device && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                boxShadow: "0 1px 4px #eee",
                margin: "0 12px",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {device.memo || "未命名设备"}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                IMEI: {device.imei}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                微信号: {device.wechatId || "未绑定"}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                好友数: {device.totalFriend ?? "-"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color:
                    device.status === "online" || device.alive === 1
                      ? "#52c41a"
                      : "#aaa",
                  marginTop: 4,
                }}
              >
                {device.status === "online" || device.alive === 1
                  ? "在线"
                  : "离线"}
              </div>
            </div>
          )}
        </>
      }
      loading={loading}
    >
      {!device ? (
        <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
          <SpinLoading style={{ "--size": "32px" }} />
          <div style={{ marginTop: 16 }}>正在加载设备信息...</div>
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {/* 标签页 */}
          <Tabs activeKey={tab} onChange={setTab} style={{ marginBottom: 12 }}>
            <Tabs.Tab title="功能开关" key="info" />
            <Tabs.Tab title="关联账号" key="accounts" />
            <Tabs.Tab title="操作日志" key="logs" />
          </Tabs>
          {/* 功能开关 */}
          {tab === "info" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 4px #eee",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {["autoAddFriend", "autoReply", "momentsSync", "aiChat"].map(
                (f, index) => (
                  <div
                    key={`${f}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{getFeatureName(f)}</div>
                    </div>
                    <Switch
                      checked={
                        !!device.features?.[f as keyof Device["features"]]
                      }
                      loading={!!featureSaving[f]}
                      onChange={checked =>
                        handleFeatureChange(
                          f as keyof Device["features"],
                          checked,
                        )
                      }
                    />
                  </div>
                ),
              )}
            </div>
          )}
          {/* 关联账号 */}
          {tab === "accounts" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 4px #eee",
              }}
            >
              {accountsLoading ? (
                <div
                  style={{ textAlign: "center", color: "#888", padding: 32 }}
                >
                  <SpinLoading />
                </div>
              ) : accounts.length === 0 ? (
                <div
                  style={{ textAlign: "center", color: "#aaa", padding: 32 }}
                >
                  暂无关联微信账号
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {accounts.map((acc, index) => (
                    <div
                      key={`${acc.id}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "#f7f8fa",
                        borderRadius: 8,
                        padding: 10,
                      }}
                      onClick={() => {
                        navigate(`/wechat-accounts/detail/${acc.wechatId}`);
                      }}
                    >
                      <Avatar
                        src={acc.avatar}
                        alt={acc.nickname}
                        style={{
                          width: 40,
                          height: 40,
                          background: "#eee",
                        }}
                        fallback={
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              fontSize: 16,
                              borderRadius: "50%",
                            }}
                          >
                            <UserOutlined />
                          </div>
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{acc.nickname}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          微信号: {acc.wechatId}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          好友数: {acc.totalFriend}
                        </div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>
                          最后活跃: {acc.lastActive}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: acc.wechatAlive === 1 ? "#52c41a" : "#aaa",
                        }}
                      >
                        {acc.wechatAliveText}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Button size="small" onClick={loadAccounts}>
                  <RedoOutlined />
                  刷新
                </Button>
              </div>
            </div>
          )}
          {/* 操作日志 */}
          {tab === "logs" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 4px #eee",
              }}
            >
              {logsLoading ? (
                <div
                  style={{ textAlign: "center", color: "#888", padding: 32 }}
                >
                  <SpinLoading />
                </div>
              ) : logs.length === 0 ? (
                <div
                  style={{ textAlign: "center", color: "#aaa", padding: 32 }}
                >
                  暂无操作日志
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {logs.map((log, index) => (
                    <div
                      key={`${log.id}-${index}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        background: "#f7f8fa",
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{log.content}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        操作人: {log.username} · {log.createTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Button size="small" onClick={loadLogs}>
                  <RedoOutlined />
                  刷新
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default DeviceDetail;
