import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card } from "antd";
import DeviceSelection from "@/components/DeviceSelection";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

interface DeviceSelectorProps {
  selectedDevices: DeviceSelectionItem[];
  onNext: (data: {
    deviceGroups: string[];
    deviceGroupsOptions: DeviceSelectionItem[];
  }) => void;
}

export interface DeviceSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const DeviceSelector = forwardRef<DeviceSelectorRef, DeviceSelectorProps>(
  ({ selectedDevices, onNext }, ref) => {
    const [form] = Form.useForm();

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          await form.validateFields();
          return true;
        } catch (error) {
          console.log("DeviceSelector 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    // 设备选择
    const handleDeviceSelect = (deviceGroupsOptions: DeviceSelectionItem[]) => {
      const deviceGroups = deviceGroupsOptions.map(item => item.id);
      form.setFieldValue("deviceGroups", deviceGroups);
      // 通知父组件数据变化
      onNext({
        deviceGroups: deviceGroups.map(id => String(id)),
        deviceGroupsOptions,
      });
    };

    return (
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            deviceGroups: selectedDevices.map(item => item.id),
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              选择设备组
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              请选择要用于建群的设备组
            </p>
          </div>

          <Form.Item
            name="deviceGroups"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "请选择至少一个设备组",
              },
              { type: "array", max: 20, message: "最多只能选择20个设备组" },
            ]}
          >
            <DeviceSelection
              selectedOptions={selectedDevices}
              onSelect={handleDeviceSelect}
            />
          </Form.Item>
        </Form>
      </Card>
    );
  },
);

DeviceSelector.displayName = "DeviceSelector";

export default DeviceSelector;
