import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import DeviceSelection from "@/components/DeviceSelection";
import style from "./DeviceSelectionStep.module.scss";

export interface DeviceSelectionStepRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

interface DeviceSelectionStepProps {
  deviceGroupsOptions?: DeviceSelectionItem[];
  deviceGroups?: number[];
  onSelect: (devices: DeviceSelectionItem[]) => void;
}

const DeviceSelectionStep = forwardRef<DeviceSelectionStepRef, DeviceSelectionStepProps>(
  ({ deviceGroupsOptions = [], deviceGroups = [], onSelect }, ref) => {
    const [deviceSelectionVisible, setDeviceSelectionVisible] = useState(false);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        if (deviceGroups.length === 0) {
          return false;
        }
        return true;
      },
      getValues: () => {
        return { deviceGroupsOptions, deviceGroups };
      },
    }));

    const handleDeviceSelect = (devices: DeviceSelectionItem[]) => {
      onSelect(devices);
      setDeviceSelectionVisible(false);
    };

    return (
      <div className={style.container}>
        <div className={style.header}>
          <h2 className={style.title}>选择设备</h2>
        </div>

        <div className={style.deviceSelectorWrapper}>
          <div
            className={style.deviceSelector}
            onClick={() => setDeviceSelectionVisible(true)}
          >
            {deviceGroupsOptions.length > 0 ? (
              <div className={style.selectedDevicesInfo}>
                <span className={style.selectedCountText}>
                  已选择 {deviceGroupsOptions.length} 个设备
                </span>
              </div>
            ) : (
              <div className={style.placeholder}>
                <span>请选择执行设备</span>
              </div>
            )}
            <span className={style.expandIcon}>▼</span>
          </div>
        </div>

        {/* 已选设备列表 */}
        {deviceGroupsOptions.length > 0 && (
          <div className={style.selectedDevicesGrid}>
            {deviceGroupsOptions.map((device) => (
              <div key={device.id} className={style.selectedDeviceCard}>
                <div className={style.deviceCardHeader}>
                  <div className={`${style.deviceCardIcon} ${device.status === "online" ? style.deviceIconOnline : style.deviceIconOffline}`}>
                    {device.avatar ? (
                      <img src={device.avatar} alt={device.memo || device.wechatId} />
                    ) : (
                      <span>📱</span>
                    )}
                  </div>
                  <span className={`${style.deviceCardStatusBadge} ${device.status === "online" ? style.statusOnline : style.statusOffline}`}>
                    {device.status === "online" ? "在线" : "离线"}
                  </span>
                </div>
                <h3 className={style.deviceCardName}>{device.memo || device.wechatId}</h3>
                <div className={style.deviceCardInfo}>
                  <p className={style.deviceCardPhone}>{device.wechatId}</p>
                </div>
                <div
                  className={style.deviceCardDeleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newDeviceGroupsOptions = deviceGroupsOptions.filter(d => d.id !== device.id);
                    onSelect(newDeviceGroupsOptions);
                  }}
                >
                  <DeleteOutlined className={style.deviceCardDeleteIcon} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 设备选择弹窗 */}
        <div style={{ display: "none" }}>
          <DeviceSelection
            selectedOptions={deviceGroupsOptions}
            onSelect={handleDeviceSelect}
            placeholder="选择设备"
            showInput={false}
            showSelectedList={false}
            singleSelect={false}
            mode="dialog"
            open={deviceSelectionVisible}
            onOpenChange={setDeviceSelectionVisible}
          />
        </div>
      </div>
    );
  }
);

DeviceSelectionStep.displayName = "DeviceSelectionStep";

export default DeviceSelectionStep;
