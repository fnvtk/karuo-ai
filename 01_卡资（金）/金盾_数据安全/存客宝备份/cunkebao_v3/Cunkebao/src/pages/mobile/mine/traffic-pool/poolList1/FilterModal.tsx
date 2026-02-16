import React, { useState, useEffect } from "react";
import { Popup } from "antd-mobile";
import { Select, Button } from "antd";
import DeviceSelection from "@/components/DeviceSelection";
import type { ScenarioOption } from "./data";
import { fetchScenarioOptions, fetchPackageOptions } from "./api";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (filters: {
    selectedDevices: DeviceSelectionItem[]; // 更新为 deviceld
    packageld: number; // 更新为 packageld
    sceneId: number; // 更新为 sceneId
    userValue: number;
    addStatus: number; // 更新为 addStatus
  }) => void;
  scenarioOptions: ScenarioOption[];
  // 初始筛选值
  initialFilters?: {
    selectedDevices: DeviceSelectionItem[];
    packageId: number;
    scenarioId: number;
    userValue: number;
    userStatus: number;
  };
}

const valueLevelOptions = [
  { label: "全部价值", value: 0 },
  { label: "高价值", value: 1 },
  { label: "中价值", value: 2 },
  { label: "低价值", value: 3 },
];
const statusOptions = [
  { label: "全部状态", value: 0 },
  { label: "已添加", value: 1 },
  { label: "待添加", value: 2 },
  { label: "重复", value: 3 },
  { label: "添加失败", value: -1 },
];

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialFilters,
}) => {
  const [selectedDevices, setSelectedDevices] = useState<DeviceSelectionItem[]>(
    initialFilters?.selectedDevices || [],
  );
  const [packageId, setPackageId] = useState<number>(initialFilters?.packageId);
  const [scenarioId, setScenarioId] = useState<number>(
    initialFilters?.scenarioId,
  );
  const [userValue, setUserValue] = useState<number>(
    initialFilters?.userValue || 0,
  );
  const [userStatus, setUserStatus] = useState<number>(
    initialFilters?.userStatus || 0,
  );
  const [scenarioOptions, setScenarioOptions] = useState<any[]>([]);
  const [packageOptions, setPackageOptions] = useState<any[]>([]);

  // 同步初始值变化
  useEffect(() => {
    if (initialFilters) {
      setSelectedDevices(initialFilters.selectedDevices || []);
      setPackageId(initialFilters.packageId || 0);
      setScenarioId(initialFilters.scenarioId || 0);
      setUserValue(initialFilters.userValue || 0);
      setUserStatus(initialFilters.userStatus || 0);
    }
  }, [initialFilters]);

  useEffect(() => {
    if (visible) {
      fetchScenarioOptions()
        .then(res => {
          setScenarioOptions(Array.isArray(res) ? res : []);
        })
        .catch(err => {
          console.error("获取场景选项失败:", err);
          setScenarioOptions([]);
        });

      fetchPackageOptions()
        .then(res => {
          setPackageOptions(Array.isArray(res) ? res : []);
        })
        .catch(err => {
          console.error("获取流量池选项失败:", err);
          setPackageOptions([]);
        });
    }
  }, [visible]);

  const handleApply = () => {
    const params = {
      selectedDevices: selectedDevices, // 更新为 deviceld
      packageld: packageId, // 更新为 packageld
      sceneId: scenarioId, // 更新为 sceneId
      userValue,
      addStatus: userStatus, // 更新为 addStatus
    };
    console.log(params);

    onConfirm(params);
    onClose();
  };

  const handleReset = () => {
    setSelectedDevices([]);
    setPackageId(0);
    setScenarioId(0);
    setUserValue(0);
    setUserStatus(0);
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="right"
      bodyStyle={{ width: "80vw", maxWidth: 360, padding: 24 }}
    >
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 20 }}>
        筛选选项
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6 }}>设备</div>
        <DeviceSelection
          selectedOptions={selectedDevices}
          onSelect={setSelectedDevices}
          placeholder="选择设备"
          showSelectedList={false}
          selectedListMaxHeight={120}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6 }}>流量池</div>
        <Select
          style={{ width: "100%" }}
          value={packageId}
          onChange={setPackageId}
          options={[
            { label: "全部流量池", value: 0 },
            ...packageOptions.map(p => ({ label: p.name, value: p.id })),
          ]}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6 }}>获客场景</div>
        <Select
          style={{ width: "100%" }}
          value={scenarioId}
          onChange={setScenarioId}
          options={[
            { label: "全部场景", value: 0 },
            ...scenarioOptions.map(s => ({ label: s.name, value: s.id })),
          ]}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6 }}>用户价值</div>
        <Select
          style={{ width: "100%" }}
          value={userValue}
          onChange={v => setUserValue(v as number)}
          options={valueLevelOptions}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6 }}>添加状态</div>
        <Select
          style={{ width: "100%" }}
          value={userStatus}
          onChange={v => setUserStatus(Number(v))}
          options={statusOptions}
        />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <Button onClick={handleReset} style={{ flex: 1 }}>
          重置筛选
        </Button>
        <Button type="primary" onClick={handleApply} style={{ flex: 1 }}>
          应用筛选
        </Button>
      </div>
    </Popup>
  );
};

export default FilterModal;
