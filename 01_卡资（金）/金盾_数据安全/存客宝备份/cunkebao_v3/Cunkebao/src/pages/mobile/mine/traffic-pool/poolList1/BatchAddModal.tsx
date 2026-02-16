import React, { useState, useEffect } from "react";
import { Popup, Selector, Button } from "antd-mobile";
import { fetchPackageOptions } from "./api";
import type { PackageOption } from "./data";

interface BatchAddModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (data: {
    packageOptions: PackageOption[];
    selectedPackageId: string;
  }) => void;
}

const BatchAddModal: React.FC<BatchAddModalProps> = ({
  visible,
  onClose,
  selectedCount,
  onConfirm,
}) => {
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 获取分组选项
  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchPackageOptions()
        .then(res => {
          setPackageOptions(res.list || []);
        })
        .catch(error => {
          console.error("获取分组选项失败:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!selectedPackageId) {
      // 可以添加提示
      return;
    }
    onConfirm({
      packageOptions,
      selectedPackageId,
    });
  };
  return (
    <Popup
      visible={visible}
      onMaskClick={() => onClose()}
      position="bottom"
      bodyStyle={{ height: "80vh" }}
    >
      <div style={{ marginBottom: 12, padding: 10 }}>
        <div style={{ marginBottom: 12 }}>选择目标分组</div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20 }}>加载中...</div>
        ) : (
          <Selector
            options={packageOptions.map(p => ({ label: p.name, value: p.id }))}
            value={[selectedPackageId]}
            onChange={v => setSelectedPackageId(v[0])}
          />
        )}
        <div
          style={{
            color: "#888",
            fontSize: 12,
            paddingTop: 15,
            marginBottom: 20,
          }}
        >
          将选中的{selectedCount}个用户加入所选分组
        </div>
        <Button
          onClick={handleSubmit}
          color="primary"
          block
          disabled={!selectedPackageId || loading}
        >
          确定
        </Button>
      </div>
    </Popup>
  );
};

export default BatchAddModal;
