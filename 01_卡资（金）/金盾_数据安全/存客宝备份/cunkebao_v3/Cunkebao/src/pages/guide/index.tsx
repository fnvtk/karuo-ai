import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toast, Popup, Tabs, Input } from "antd-mobile";
import {
  MobileOutlined,
  ExclamationCircleOutlined,
  ArrowRightOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import { fetchDeviceQRCode, addDeviceByImei, fetchDeviceList } from "./api";
import { useUserStore } from "@/store/module/user";
import styles from "./index.module.scss";
const Guide: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [deviceCount, setDeviceCount] = useState(user?.deviceTotal || 0);

  // 添加设备弹窗状态
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
  const initialDeviceCountRef = useRef(deviceCount);

  // 检查设备绑定状态
  const checkDeviceStatus = useCallback(async () => {
    try {
      setLoading(true);
      // 使用store中的设备数量
      const deviceNum = user?.deviceTotal || 0;
      setDeviceCount(deviceNum);

      // 如果已有设备，直接跳转到首页
      if (deviceNum > 0) {
        navigate("/");
        return;
      }
    } catch (error) {
      console.error("检查设备状态失败:", error);
      Toast.show({
        content: "检查设备状态失败，请重试",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.deviceTotal, navigate]);

  useEffect(() => {
    checkDeviceStatus();
  }, [checkDeviceStatus]);

  // 开始轮询监听设备状态
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    initialDeviceCountRef.current = deviceCount;

    const pollDeviceStatus = async () => {
      try {
        // 这里可以调用一个简单的设备数量接口来检查是否有新设备
        // 或者使用其他方式检测设备状态变化
        // 暂时使用store中的数量，实际项目中可能需要调用专门的接口
        let currentDeviceCount = user?.deviceTotal || 0;
        const res = await fetchDeviceList({ accountId: user?.s2_accountId });
        if (res.added) {
          currentDeviceCount = 1;
          Toast.show({ content: "设备添加成功！", position: "top" });
          setAddVisible(false);
          setDeviceCount(currentDeviceCount);
          setIsPolling(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          // 可以选择跳转到首页或继续留在当前页面
          navigate("/");
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
      const accountId = user?.s2_accountId;
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

  // 跳转到设备管理页面
  const handleGoToDevices = () => {
    handleGetQr();
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
      // 重新检查设备状态
      await checkDeviceStatus();
    } catch (e: any) {
      Toast.show({ content: e.message || "添加失败", position: "top" });
    } finally {
      setAddLoading(false);
    }
  };

  // 关闭弹窗时停止轮询
  const handleClosePopup = () => {
    setAddVisible(false);
    stopPolling();
    setQrCode(null);
  };

  if (loading) {
    return (
      <Layout loading={true}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>检查设备状态中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.guideContainer}>
        {/* 头部区域 */}
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <img src="/logo.png" alt="存客宝" className={styles.logo} />
          </div>
          <h1 className={styles.title}>欢迎使用存客宝</h1>
          <p className={styles.subtitle}>请先绑定设备以获得完整功能体验</p>
        </div>

        {/* 内容区域 */}
        <div className={styles.content}>
          <div className={styles.deviceStatus}>
            <div className={styles.statusCard}>
              <div className={styles.statusIcon}>
                <MobileOutlined />
              </div>
              <div className={styles.statusInfo}>
                <div className={styles.statusTitle}>设备绑定状态</div>
                <div className={styles.statusValue}>
                  已绑定：
                  <span className={styles.deviceCount}>{deviceCount}</span> 台
                </div>
              </div>
            </div>
          </div>

          <div className={styles.guideSteps}>
            <h2 className={styles.stepsTitle}>绑定步骤</h2>
            <div className={styles.stepList}>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>准备设备</div>
                  <div className={styles.stepDesc}>
                    确保手机已安装存客宝应用
                  </div>
                </div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>扫描二维码</div>
                  <div className={styles.stepDesc}>在设备管理页面扫描绑定</div>
                </div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>开始使用</div>
                  <div className={styles.stepDesc}>
                    绑定成功后即可使用所有功能
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tips}>
            <div className={styles.tipsTitle}>
              <ExclamationCircleOutlined className={styles.tipsIcon} />
              温馨提示
            </div>
            <div className={styles.tipsContent}>
              <p>• 绑定设备后可享受完整功能体验</p>
              <p>• 每个账号最多可绑定10台设备</p>
              <p>• 如需帮助请联系客服</p>
            </div>
          </div>
        </div>

        {/* 底部按钮区域 */}
        <div className={styles.footer}>
          <Button
            block
            color="primary"
            size="large"
            className={styles.primaryButton}
            onClick={handleGoToDevices}
          >
            立即绑定设备
            <ArrowRightOutlined className={styles.buttonIcon} />
          </Button>
        </div>
      </div>

      {/* 添加设备弹窗 */}
      <Popup
        visible={addVisible}
        onMaskClick={handleClosePopup}
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
              <Button color="primary" onClick={handleGetQr} loading={qrLoading}>
                <QrcodeOutlined />
                &nbsp; 获取二维码
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
                onChange={val => setName(val)}
                clearable
              />
              <Input
                placeholder="设备IMEI"
                value={imei}
                onChange={val => setImei(val)}
                clearable
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

export default Guide;
