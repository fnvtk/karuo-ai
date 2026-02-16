import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card } from "antd";
import DeviceSelection from "@/components/DeviceSelection";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

interface DeviceSelectorProps {
  selectedDevices: DeviceSelectionItem[];
  onPrevious: () => void;
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
          form.setFieldsValue({
            deviceGroups: selectedDevices.map(item => String(item.id)),
          });
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
      const deviceGroups = deviceGroupsOptions.map(item => String(item.id));
      form.setFieldValue("deviceGroups", deviceGroups);
      onNext({ deviceGroups, deviceGroupsOptions });
    };

    return (
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ devices: selectedDevices }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              选择设备
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              请选择要使用的设备
            </p>
          </div>

          <Form.Item
            name="deviceGroups"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "请选择至少一个设备",
              },
            ]}
          >
            <DeviceSelection
              selectedOptions={selectedDevices}
              onSelect={handleDeviceSelect}
              placeholder="选择设备"
              readonly={false}
              showSelectedList={true}
              selectedListMaxHeight={300}
            />
          </Form.Item>
        </Form>
      </Card>
    );
  },
);

DeviceSelector.displayName = "DeviceSelector";

export default DeviceSelector;
