import React, { useEffect, useRef, useState, useCallback } from "react";
import { Popup, Tabs, Toast, SpinLoading } from "antd-mobile";
import { Button, Input, Pagination, Checkbox } from "antd";
import { useNavigate } from "react-router-dom";
import { AddOutline, DeleteOutline } from "antd-mobile-icons";
import {
  ReloadOutlined,
  SearchOutlined,
  QrcodeOutlined,
  RightOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import {
  fetchDeviceList,
  fetchDeviceQRCode,
  addDeviceByImei,
  deleteDevice,
  fetchAddResults,
} from "./api";
import type { Device } from "@/types/device";
import { comfirm } from "@/utils/common";
import { useUserStore } from "@/store/module/user";
import NavCommon from "@/components/NavCommon";
import styles from "./index.module.scss";

const Devices: React.FC = () => {
  // 设备列表相关
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "online" | "offline">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<(string | number)[]>([]);
  const observerRef = useRef<HTMLDivElement>(null);
  const [usePagination, setUsePagination] = useState(true); // 新增：是否使用分页

  // 添加设备弹窗
  const [addVisible, setAddVisible] = useState(false);
  const [addTab, setAddTab] = useState("scan");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [imei, setImei] = useState("");
  const [name, setName] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // 轮询监听相关
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const loadDevicesRef = useRef<((reset?: boolean) => Promise<void>) | null>(null);

  // 删除弹窗
  const [delVisible, setDelVisible] = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useUserStore();

  // 加载设备列表
  const loadDevices = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const params: any = { page: reset ? 1 : page, limit: 20 };
        if (search) params.keyword = search;
        const res = await fetchDeviceList(params);
        const list = Array.isArray(res.list) ? res.list : [];
        setDevices(prev => (reset ? list : [...prev, ...list]));
        setTotal(res.total || 0);
        setHasMore(list.length === 20);
        if (reset) setPage(1);
      } catch (e) {
        Toast.show({ content: "获取设备列表失败", position: "top" });
        setHasMore(false); // 请求失败后不再继续请求
      } finally {
        setLoading(false);
      }
    },
    [loading, search, page],
  );

  // 更新 loadDevices 的 ref
  useEffect(() => {
    loadDevicesRef.current = loadDevices;
  }, [loadDevices]);

  // 首次加载和搜索
  useEffect(() => {
    loadDevices(true);
    // eslint-disable-next-line
  }, [search]);

  // 无限滚动
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new window.IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.5 },
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // 分页加载
  useEffect(() => {
    if (page === 1) return;
    loadDevices();
    // eslint-disable-next-line
  }, [page]);

  // 状态筛选
  const filtered = devices.filter(d => {
    if (status === "all") return true;
    if (status === "online") return d.status === "online" || d.alive === 1;
    if (status === "offline") return d.status === "offline" || d.alive === 0;
    return true;
  });

  // 开始轮询监听设备状态
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);

    const pollDeviceStatus = async () => {
      try {
        const res = await fetchAddResults({ accountId: user?.s2_accountId });
        if (res.added) {
          Toast.show({ content: "设备添加成功！", position: "top" });
          setAddVisible(false);
          setIsPolling(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          // 刷新设备列表
          if (loadDevicesRef.current) {
            await loadDevicesRef.current(true);
          }
          return;
        }
      } catch (error) {
        console.error("轮询检查设备状态失败:", error);
      }
    };

    // 每3秒检查一次设备状态
    pollingRef.current = setInterval(pollDeviceStatus, 3000);
  }, [isPolling, user?.s2_accountId]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 获取二维码
  const handleGetQr = async () => {
    setQrLoading(true);
    setQrCode(null);
    try {
      const accountId = user.s2_accountId;
      if (!accountId) throw new Error("未获取到用户信息");
      const res = await fetchDeviceQRCode(accountId);
      setQrCode(res.qrCode);
      // 获取二维码后开始轮询监听
      startPolling();
    } catch (e: any) {
      Toast.show({ content: e.message || "获取二维码失败", position: "top" });
    } finally {
      setQrLoading(false);
    }
  };

  const addDevice = async () => {
    await handleGetQr();
    setAddVisible(true);
  };

  // 手动添加设备
  const handleAddDevice = async () => {
    if (!imei.trim() || !name.trim()) {
      Toast.show({ content: "请填写完整信息", position: "top" });
      return;
    }
    setAddLoading(true);
    try {
      await addDeviceByImei(imei, name);
      Toast.show({ content: "添加成功", position: "top" });
      setAddVisible(false);
      setImei("");
      setName("");
      loadDevices(true);
    } catch (e: any) {
      Toast.show({ content: e.message || "添加失败", position: "top" });
    } finally {
      setAddLoading(false);
    }
  };

  // 删除设备
  const handleDelete = async () => {
    setDelLoading(true);
    try {
      for (const id of selected) {
        await deleteDevice(Number(id));
      }
      Toast.show({ content: `删除成功`, position: "top" });
      setSelected([]);
      loadDevices(true);
    } catch (e: any) {
      if (e) Toast.show({ content: e.message || "删除失败", position: "top" });
    } finally {
      setDelLoading(false);
    }
  };

  // 删除按钮点击
  const handleDeleteClick = async () => {
    try {
      await comfirm(
        `将删除${selected.length}个设备，删除后本设备配置的计划任务操作也将失效。确认删除？`,
        { title: "确认删除", confirmText: "确认删除", cancelText: "取消" },
      );
      handleDelete();
    } catch {
      // 用户取消，无需处理
    }
  };

  // 跳转详情
  const goDetail = (id: string | number) => {
    navigate(`/mine/devices/${id}`);
  };

  // 分页切换
  const handlePageChange = (p: number) => {
    setPage(p);
    loadDevices(true);
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="设备管理"
            right={
              <Button size="small" type="primary" onClick={() => addDevice()}>
                <AddOutline />
                添加设备
              </Button>
            }
          />
          <div style={{ padding: "12px 12px 0 12px", background: "#fff" }}>
            {/* 搜索栏 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Input
                placeholder="搜索设备IMEI/备注"
                value={search}
                onChange={e => setSearch(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                style={{ flex: 1 }}
              />
              <Button
                onClick={() => loadDevices(true)}
                icon={<ReloadOutlined />}
              >
                刷新
              </Button>
            </div>
            {/* 筛选和删除 */}
            <div style={{ display: "flex", gap: 8 }}>
              <Tabs
                activeKey={status}
                onChange={k => setStatus(k as any)}
                style={{ flex: 1 }}
              >
                <Tabs.Tab title="全部" key="all" />
                <Tabs.Tab title="在线" key="online" />
                <Tabs.Tab title="离线" key="offline" />
              </Tabs>
              <div style={{ paddingTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  danger
                  icon={<DeleteOutline />}
                  disabled={selected.length === 0}
                  onClick={handleDeleteClick}
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        </>
      }
      footer={
        <div className={styles.paginationContainer}>
          <Pagination
            current={page}
            pageSize={20}
            total={total}
            showSizeChanger={false}
            onChange={handlePageChange}
          />
        </div>
      }
      loading={loading && devices.length === 0}
    >
      <div style={{ padding: 12 }}>
        {/* 设备列表 */}
        <div className={styles.deviceList}>
          {filtered.map(device => (
            <div key={device.id} className={styles.deviceCard}>
              {/* 顶部行：选择框和IMEI */}
              <div className={styles.headerRow}>
                <div className={styles.checkboxContainer}>
                  <Checkbox
                    checked={selected.includes(device.id)}
                    onChange={e => {
                      e.stopPropagation();
                      setSelected(prev =>
                        e.target.checked
                          ? [...prev, device.id!]
                          : prev.filter(id => id !== device.id),
                      );
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <span className={styles.imeiText}>
                  IMEI: {device.imei?.toUpperCase()}
                </span>
              </div>

              {/* 主要内容区域：头像和详细信息 */}
              <div
                className={styles.mainContent}
                onClick={() => goDetail(device.id!)}
              >
                {/* 头像 */}
                <div className={styles.avatar}>
                  {device.avatar ? (
                    <img src={device.avatar} alt="头像" />
                  ) : (
                    <span className={styles.avatarText}>
                      {(device.memo || device.wechatId || "设")[0]}
                    </span>
                  )}
                </div>

                {/* 设备信息 */}
                <div className={styles.deviceInfo}>
                  <div className={styles.deviceHeader}>
                    <h3 className={styles.deviceName}>
                      {device.memo || "未命名设备"}
                    </h3>
                    <span
                      className={`${styles.statusBadge} ${
                        device.status === "online" || device.alive === 1
                          ? styles.online
                          : styles.offline
                      }`}
                    >
                      {device.status === "online" || device.alive === 1
                        ? "在线"
                        : "离线"}
                    </span>
                  </div>

                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>微信号:</span>
                      <span className={styles.infoValue}>
                        {device.wechatId || "未绑定"}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>好友数:</span>
                      <span
                        className={`${styles.infoValue} ${styles.friendCount}`}
                      >
                        {device.totalFriend ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 无限滚动提示（仅在不分页时显示） */}
          {!usePagination && (
            <div
              ref={observerRef}
              style={{ padding: 12, textAlign: "center", color: "#888" }}
            >
              {loading && <SpinLoading style={{ "--size": "24px" }} />}
              {!hasMore && devices.length > 0 && "没有更多设备了"}
              {!hasMore && devices.length === 0 && "暂无设备"}
            </div>
          )}
        </div>
      </div>
      {/* 添加设备弹窗 */}
      <Popup
        visible={addVisible}
        onMaskClick={() => {
          setAddVisible(false);
          stopPolling();
          setQrCode(null);
        }}
        bodyStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          minHeight: 320,
        }}
      >
        <div style={{ padding: 20 }}>
          <Tabs
            activeKey={addTab}
            onChange={setAddTab}
            style={{ marginBottom: 16 }}
          >
            <Tabs.Tab title="扫码添加" key="scan" />
          </Tabs>
          {addTab === "scan" && (
            <div style={{ textAlign: "center", minHeight: 200 }}>
              <Button
                type="primary"
                onClick={handleGetQr}
                loading={qrLoading}
                icon={<QrcodeOutlined />}
              >
                获取二维码
              </Button>
              {qrCode && (
                <div style={{ marginTop: 16 }}>
                  <img
                    src={qrCode}
                    alt="二维码"
                    style={{
                      width: 180,
                      height: 180,
                      background: "#f5f5f5",
                      borderRadius: 8,
                      margin: "0 auto",
                    }}
                  />
                  <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
                    请用手机扫码添加设备
                  </div>
                  {isPolling && (
                    <div
                      style={{ color: "#1890ff", fontSize: 12, marginTop: 8 }}
                    >
                      正在监听设备添加状态...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {addTab === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input
                placeholder="设备名称"
                value={name}
                onChange={e => setName(e.target.value)}
                allowClear
              />
              <Input
                placeholder="设备IMEI"
                value={imei}
                onChange={e => setImei(e.target.value)}
                allowClear
              />
              <Button
                color="primary"
                onClick={handleAddDevice}
                loading={addLoading}
              >
                添加
              </Button>
            </div>
          )}
        </div>
      </Popup>
    </Layout>
  );
};

export default Devices;
