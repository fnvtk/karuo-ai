import React, { useState, useEffect } from "react";
import { Popup, Form, Input, TextArea, Button, Toast } from "antd-mobile";
import { CloseOutlined } from "@ant-design/icons";
import styles from "./TestFormModal.module.scss";
import { submitLead, DEFAULT_API_KEY } from "../api";

interface TestFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (values: TestFormValues) => void;
}

export interface TestFormValues {
  apiKey: string;
  phone: string;
  name: string;
  source: string;
  remark: string;
}

const TestFormModal: React.FC<TestFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 获取API Key，如果没有输入则使用默认值
      const apiKey = values.apiKey?.trim() || DEFAULT_API_KEY;

      // 调用API提交数据
      const result = await submitLead(
        {
          phone: values.phone,
          name: values.name,
          source: values.source,
          remark: values.remark || undefined,
        },
        apiKey,
      );

      // 调用提交回调（如果提供）
      if (onSubmit) {
        onSubmit(values as TestFormValues);
      }

      Toast.show({
        content: result.message || "提交成功",
        icon: "success",
      });

      // 重置表单并关闭弹框
      form.resetFields();
      onClose();
    } catch (error: any) {
      console.error("提交失败:", error);
      Toast.show({
        content: error.message || "提交失败，请稍后重试",
        icon: "fail",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    // 重置时恢复默认API Key
    form.setFieldsValue({ apiKey: DEFAULT_API_KEY });
    onClose();
  };

  // 初始化表单默认值
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({ apiKey: DEFAULT_API_KEY });
    }
  }, [visible, form]);

  return (
    <Popup
      visible={visible}
      onMaskClick={handleClose}
      position="bottom"
      bodyStyle={{
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: "90vh",
        overflowY: "auto",
      }}
    >
      <div className={styles.modalContainer}>
        {/* 头部 */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>测试表单</h3>
          <CloseOutlined
            className={styles.closeIcon}
            onClick={handleClose}
          />
        </div>

        {/* 表单内容 */}
        <div className={styles.modalContent}>
          <Form
            form={form}
            layout="vertical"
            footer={
              <div className={styles.formFooter}>
                <Button
                  onClick={handleClose}
                  style={{ marginRight: 12 }}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  onClick={handleSubmit}
                  loading={loading}
                  block
                >
                  提交
                </Button>
              </div>
            }
          >
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[]}
              extra="留空则使用默认API Key"
            >
              <Input
                placeholder={`默认: ${DEFAULT_API_KEY}`}
                defaultValue={DEFAULT_API_KEY}
              />
            </Form.Item>

            <Form.Item
              label="手机号"
              name="phone"
              rules={[
                { required: true, message: "请输入手机号" },
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: "请输入正确的手机号",
                },
              ]}
            >
              <Input
                placeholder="请输入手机号"
                type="tel"
                maxLength={11}
              />
            </Form.Item>

            <Form.Item
              label="姓名"
              name="name"
              rules={[
                { required: true, message: "请输入姓名" },
                { max: 20, message: "姓名不能超过20个字符" },
              ]}
            >
              <Input placeholder="请输入姓名" maxLength={20} />
            </Form.Item>

            <Form.Item
              label="来源"
              name="source"
              rules={[{ required: true, message: "请输入来源" }]}
            >
              <Input placeholder="请输入来源" maxLength={50} />
            </Form.Item>

            <Form.Item
              label="备注"
              name="remark"
              rules={[{ max: 200, message: "备注不能超过200个字符" }]}
            >
              <TextArea
                placeholder="请输入备注（选填）"
                showCount
                maxLength={200}
                rows={3}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Popup>
  );
};

export default TestFormModal;
