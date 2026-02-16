import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card } from "antd";
import DeviceSelection from "@/components/DeviceSelection";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

interface RobotSelectorProps {
  selectedRobots: DeviceSelectionItem[];
  onPrevious: () => void;
  onNext: (data: {
    robots: string[];
    robotsOptions: DeviceSelectionItem[];
  }) => void;
}

export interface RobotSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const RobotSelector = forwardRef<RobotSelectorRef, RobotSelectorProps>(
  ({ selectedRobots, onNext }, ref) => {
    const [form] = Form.useForm();

    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          form.setFieldsValue({
            robots: selectedRobots.map(item => String(item.id)),
          });
          await form.validateFields(["robots"]);
          return true;
        } catch (error) {
          console.log("RobotSelector 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    const handleRobotSelect = (robotsOptions: DeviceSelectionItem[]) => {
      const robots = robotsOptions.map(item => String(item.id));
      form.setFieldValue("robots", robots);
      onNext({ robots, robotsOptions });
    };

    return (
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ robots: selectedRobots }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              选择机器人
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              请选择用于发送欢迎消息的机器人
            </p>
          </div>

          <Form.Item
            name="robots"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "请至少选择一个机器人",
              },
            ]}
          >
            <DeviceSelection
              selectedOptions={selectedRobots}
              onSelect={handleRobotSelect}
              placeholder="选择机器人"
            />
          </Form.Item>
        </Form>
      </Card>
    );
  },
);

RobotSelector.displayName = "RobotSelector";

export default RobotSelector;
