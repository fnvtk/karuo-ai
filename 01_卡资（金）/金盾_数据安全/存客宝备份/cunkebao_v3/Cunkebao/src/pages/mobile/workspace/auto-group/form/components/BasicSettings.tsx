import React, { useImperativeHandle, forwardRef, useEffect } from "react";
import { Button, Card, Switch, Form, InputNumber } from "antd";
import { Input } from "antd";

const { TextArea } = Input;

interface BasicSettingsProps {
  initialValues?: {
    name: string;
    startTime: string;
    endTime: string;
    groupSizeMin: number;
    groupSizeMax: number;
    maxGroupsPerDay: number;
    groupNameTemplate: string;
    groupDescription: string;
    status: number;
  };
}

export interface BasicSettingsRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const BasicSettings = forwardRef<BasicSettingsRef, BasicSettingsProps>(
  (
    {
      initialValues = {
        name: "",
        startTime: "06:00",
        endTime: "23:59",
        groupSizeMin: 20,
        groupSizeMax: 50,
        maxGroupsPerDay: 10,
        groupNameTemplate: "",
        groupDescription: "",
        status: 1,
      },
    },
    ref,
  ) => {
    const [form] = Form.useForm();

    // 当initialValues变化时，重新设置表单值
    useEffect(() => {
      form.setFieldsValue(initialValues);
    }, [form, initialValues]);

    // 暴露方法给父组件
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
      <div style={{ marginBottom: 24 }}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            key={JSON.stringify(initialValues)}
            onValuesChange={(changedValues, allValues) => {
              // 可以在这里处理表单值变化
            }}
          >
            {/* 任务名称 */}
            <Form.Item
              label="任务名称"
              name="name"
              rules={[
                { required: true, message: "请输入任务名称" },
                { min: 2, max: 50, message: "任务名称长度在2-50个字符之间" },
              ]}
            >
              <Input placeholder="请输入任务名称" />
            </Form.Item>

            {/* 允许建群的时间段 */}
            <Form.Item label="允许建群的时间段">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Form.Item
                  name="startTime"
                  noStyle
                  rules={[{ required: true, message: "请选择开始时间" }]}
                >
                  <Input type="time" style={{ width: 120 }} />
                </Form.Item>
                <span style={{ color: "#888" }}>至</span>
                <Form.Item
                  name="endTime"
                  noStyle
                  rules={[{ required: true, message: "请选择结束时间" }]}
                >
                  <Input type="time" style={{ width: 120 }} />
                </Form.Item>
              </div>
            </Form.Item>

            {/* 每日最大建群数 */}
            <Form.Item
              label="每日最大建群数"
              name="maxGroupsPerDay"
              rules={[
                { required: true, message: "请输入每日最大建群数" },
                {
                  validator: (_, value) => {
                    const numValue = Number(value);
                    if (value && (numValue < 1 || numValue > 100)) {
                      return Promise.reject(
                        new Error("每日最大建群数在1-100之间"),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={1}
                max={100}
                placeholder="请输入最大建群数"
                step={1}
                style={{ width: "100%" }}
                value={form.getFieldValue("maxGroupsPerDay")}
                onChange={value => form.setFieldValue("maxGroupsPerDay", value)}
                addonBefore={
                  <Button
                    type="text"
                    onClick={() => {
                      const currentValue =
                        form.getFieldValue("maxGroupsPerDay") || 1;
                      const newValue = Math.max(1, currentValue - 1);
                      form.setFieldValue("maxGroupsPerDay", newValue);
                    }}
                  >
                    -
                  </Button>
                }
                addonAfter={
                  <Button
                    type="text"
                    onClick={() => {
                      const currentValue =
                        form.getFieldValue("maxGroupsPerDay") || 1;
                      const newValue = Math.min(100, currentValue + 1);
                      form.setFieldValue("maxGroupsPerDay", newValue);
                    }}
                  >
                    +
                  </Button>
                }
              />
            </Form.Item>

            {/* 群组最小人数 */}
            <Form.Item
              label="群组最小人数"
              name="groupSizeMin"
              rules={[
                { required: true, message: "请输入群组最小人数" },
                {
                  validator: (_, value) => {
                    const numValue = Number(value);
                    if (value && (numValue < 1 || numValue > 500)) {
                      return Promise.reject(
                        new Error("群组最小人数在1-500之间"),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={1}
                max={500}
                placeholder="请输入最小人数"
                step={1}
                style={{ width: "100%" }}
                value={form.getFieldValue("groupSizeMin")}
                onChange={value => form.setFieldValue("groupSizeMin", value)}
                addonBefore={
                  <Button
                    type="text"
                    onClick={() => {
                      const currentValue =
                        form.getFieldValue("groupSizeMin") || 1;
                      const newValue = Math.max(1, currentValue - 1);
                      form.setFieldValue("groupSizeMin", newValue);
                    }}
                  >
                    -
                  </Button>
                }
                addonAfter={
                  <Button
                    type="text"
                    onClick={() => {
                      const currentValue =
                        form.getFieldValue("groupSizeMin") || 1;
                      const newValue = Math.min(500, currentValue + 1);
                      form.setFieldValue("groupSizeMin", newValue);
                    }}
                  >
                    +
                  </Button>
                }
              />
            </Form.Item>

            {/* 群组最大人数 */}
            <Form.Item
              label="群组最大人数"
              name="groupSizeMax"
              rules={[
                { required: true, message: "请输入群组最大人数" },
                {
                  validator: (_, value) => {
                    const numValue = Number(value);
                    if (value && (numValue < 1 || numValue > 500)) {
                      return Promise.reject(
                        new Error("群组最大人数在1-500之间"),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={1}
                max={500}
                placeholder="请输入最大人数"
                step={1}
                style={{ width: "100%" }}
                value={form.getFieldValue("groupSizeMax")}
                onChange={value => form.setFieldValue("groupSizeMax", value)}
                addonBefore={
                  <Button
                    type="text"
                    onClick={() => {
                      const currentValue =
                        form.getFieldValue("groupSizeMax") || 1;
                      const newValue = Math.max(1, currentValue - 1);
                      form.setFieldValue("groupSizeMax", newValue);
                    }}
                  >
                    -
                  </Button>
                }
                addonAfter={
                  <Button
                    type="text"
                    onClick={() => {
                      const currentValue =
                        form.getFieldValue("groupSizeMax") || 1;
                      const newValue = Math.min(500, currentValue + 1);
                      form.setFieldValue("groupSizeMax", newValue);
                    }}
                  >
                    +
                  </Button>
                }
              />
            </Form.Item>

            {/* 群名称模板 */}
            <Form.Item
              label="群名称模板"
              name="groupNameTemplate"
              rules={[
                { required: true, message: "请输入群名称模板" },
                {
                  min: 2,
                  max: 100,
                  message: "群名称模板长度在2-100个字符之间",
                },
              ]}
            >
              <Input placeholder="请输入群名称模板" />
            </Form.Item>

            {/* 群描述 */}
            <Form.Item
              label="群描述"
              name="groupDescription"
              rules={[{ max: 200, message: "群描述不能超过200个字符" }]}
            >
              <TextArea
                placeholder="请输入群描述"
                rows={3}
                maxLength={200}
                showCount
              />
            </Form.Item>

            {/* 是否启用 */}
            <Form.Item
              label="是否启用"
              name="status"
              valuePropName="checked"
              getValueFromEvent={checked => (checked ? 1 : 0)}
              getValueProps={value => ({ checked: value === 1 })}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>状态</span>
                <Switch />
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  },
);

BasicSettings.displayName = "BasicSettings";

export default BasicSettings;
