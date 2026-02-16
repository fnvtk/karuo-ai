import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { Input, Form, Card, Switch, InputNumber, Radio } from "antd";

interface BasicSettingsProps {
  defaultValues?: {
    name: string;
    status: number; // 0: 否, 1: 是
    interval: number; // 时间间隔（分钟）
    pushType?: number; // 0: 定时推送, 1: 立即推送
    startTime?: string; // 允许推送的开始时间
    endTime?: string; // 允许推送的结束时间
  };
  onNext: (values: any) => void;
  loading?: boolean;
}

export interface BasicSettingsRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const BasicSettings = forwardRef<BasicSettingsRef, BasicSettingsProps>(
  (
    {
      defaultValues = {
        name: "",
        status: 1, // 默认开启
        interval: 1, // 默认1分钟
        pushType: 0, // 默认定时推送
        startTime: "09:00", // 默认开始时间
        endTime: "21:00", // 默认结束时间
      },
    },
    ref,
  ) => {
    const [form] = Form.useForm();

    useEffect(() => {
      if (defaultValues) {
        form.setFieldsValue(defaultValues);
      }
    }, [defaultValues, form]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          await form.validateFields();
          return true;
        } catch (error) {
          console.log("BasicSettings 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    return (
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={defaultValues}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              基础设置
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              配置任务的基本信息
            </p>
          </div>

          <Form.Item
            name="name"
            label="任务名称"
            rules={[
              { required: true, message: "请输入任务名称" },
              { max: 50, message: "任务名称不能超过50个字符" },
            ]}
          >
            <Input placeholder="请输入任务名称" size="large" />
          </Form.Item>

          <Form.Item
            name="pushType"
            label="推送类型"
            rules={[{ required: true, message: "请选择推送类型" }]}
          >
            <Radio.Group>
              <Radio value={0}>定时推送</Radio>
              <Radio value={1}>立即推送</Radio>
            </Radio.Group>
          </Form.Item>

          {/* 允许推送的时间段 - 只在定时推送时显示 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.pushType !== currentValues.pushType
            }
          >
            {({ getFieldValue }) => {
              // 只在pushType为0（定时推送）时显示时间段设置
              return getFieldValue("pushType") === 0 ? (
                <Form.Item label="允许推送的时间段">
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <Form.Item
                      name="startTime"
                      noStyle
                      rules={[{ required: true, message: "请选择开始时间" }]}
                    >
                      <Input type="time" style={{ width: 120 }} size="large" />
                    </Form.Item>
                    <span style={{ color: "#888" }}>至</span>
                    <Form.Item
                      name="endTime"
                      noStyle
                      rules={[{ required: true, message: "请选择结束时间" }]}
                    >
                      <Input type="time" style={{ width: 120 }} size="large" />
                    </Form.Item>
                  </div>
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item
            name="interval"
            label="时间间隔（分钟）"
            rules={[
              { required: true, message: "请输入时间间隔" },
              { type: "number", min: 1, message: "时间间隔至少为1分钟" },
              { type: "number", max: 1440, message: "时间间隔不能超过1440分钟（24小时）" },
            ]}
          >
            <InputNumber
              placeholder="请输入时间间隔"
              min={1}
              max={1440}
              style={{ width: "100%" }}
              size="large"
              addonAfter="分钟"
            />
          </Form.Item>



          <Form.Item
            name="status"
            label="启用状态"
            valuePropName="checked"
            getValueFromEvent={(checked) => (checked ? 1 : 0)}
            getValueProps={(value) => ({ checked: value === 1 })}
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Card>
    );
  },
);

BasicSettings.displayName = "BasicSettings";

export default BasicSettings;
