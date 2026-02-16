import React, { useEffect, useState } from "react";
import { Popup, Avatar, SpinLoading } from "antd-mobile";
import { Button, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import style from "./Popups.module.scss";
import { getPlanDetail } from "../api";

interface DeviceItem {
  id: string | number;
  memo?: string;
  imei?: string;
  wechatId?: string;
  status?: "online" | "offline";
  avatar?: string;
  totalFriend?: number;
}

interface DeviceListModalProps {
  visible: boolean;
  onClose: () => void;
  ruleId?: number;
  ruleName?: string;
}

const DeviceListModal: React.FC<DeviceListModalProps> = ({
  visible,
  onClose,
  ruleId,
  ruleName,
}) => {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取设备数据
  const fetchDevices = async () => {
    if (!ruleId) return;

    setLoading(true);
    try {
      const detailRes = await getPlanDetail(ruleId.toString());
      const deviceData = detailRes?.deviceGroupsOptions || [];
      setDevices(deviceData);
    } catch (error) {
      console.error("获取设备详情失败:", error);
      message.error("获取设备详情失败");
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开且有ruleId时，获取数据
  useEffect(() => {
    if (visible && ruleId) {
      fetchDevices();
    }
  }, [visible, ruleId]);

  const title = ruleName ? `${ruleName} - 分发设备列表` : "分发设备列表";
  const getStatusColor = (status?: string) => {
    return status === "online" ? "#52c41a" : "#ff4d4f";
  };

  const getStatusText = (status?: string) => {
    return status === "online" ? "在线" : "离线";
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: "70vh",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <div className={style.deviceModal}>
        {/* 头部 */}
        <div className={style.deviceModalHeader}>
          <h3 className={style.deviceModalTitle}>{title}</h3>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={style.deviceModalClose}
          />
        </div>

        {/* 设备列表 */}
        <div className={style.deviceList}>
          {loading ? (
            <div className={style.deviceLoading}>
              <SpinLoading color="primary" />
              <div className={style.deviceLoadingText}>正在加载设备列表...</div>
            </div>
          ) : devices.length > 0 ? (
            devices.map((device, index) => (
              <div key={device.id || index} className={style.deviceItem}>
                {/* 顶部行：IMEI */}
                <div className={style.deviceHeaderRow}>
                  <span className={style.deviceImeiText}>
                    IMEI: {device.imei?.toUpperCase() || "-"}
                  </span>
                </div>

                {/* 主要内容区域：头像和详细信息 */}
                <div className={style.deviceMainContent}>
                  {/* 头像 */}
                  <div className={style.deviceAvatar}>
                    {device.avatar ? (
                      <img src={device.avatar} alt="头像" />
                    ) : (
                      <span className={style.deviceAvatarText}>
                        {(device.memo || device.wechatId || "设")[0]}
                      </span>
                    )}
                  </div>

                  {/* 设备信息 */}
                  <div className={style.deviceInfo}>
                    <div className={style.deviceInfoHeader}>
                      <h3 className={style.deviceName}>
                        {device.memo || "未命名设备"}
                      </h3>
                      <span
                        className={`${style.deviceStatusBadge} ${
                          device.status === "online"
                            ? style.deviceStatusOnline
                            : style.deviceStatusOffline
                        }`}
                      >
                        {getStatusText(device.status)}
                      </span>
                    </div>

                    <div className={style.deviceInfoList}>
                      <div className={style.deviceInfoItem}>
                        <span className={style.deviceInfoLabel}>微信号:</span>
                        <span className={style.deviceInfoValue}>
                          {device.wechatId || "未绑定"}
                        </span>
                      </div>
                      <div className={style.deviceInfoItem}>
                        <span className={style.deviceInfoLabel}>好友数:</span>
                        <span
                          className={`${style.deviceInfoValue} ${style.deviceFriendCount}`}
                        >
                          {device.totalFriend ?? "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={style.deviceEmpty}>
              <div className={style.deviceEmptyText}>暂无设备数据</div>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className={style.deviceModalFooter}>
          <div className={style.deviceStats}>
            <span>共 {devices.length} 个设备</span>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default DeviceListModal;
