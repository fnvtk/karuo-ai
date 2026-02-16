import React from "react";
import { Modal, Form, Input, Space, Button } from "antd";
import { AddGroupRequest } from "../api";

export interface GroupModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialValues?: Partial<AddGroupRequest>;
  onSubmit: (values: AddGroupRequest) => void;
  onCancel: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm<AddGroupRequest>();

  return (
    <Modal
      title={mode === "add" ? "新增分组" : "编辑分组"}
      open={open}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={values => onSubmit(values)}
        initialValues={initialValues}
      >
        <Form.Item
          name="groupName"
          label="分组名称"
          rules={[{ required: true, message: "请输入分组名称" }]}
        >
          <Input placeholder="请输入分组名称" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              确定
            </Button>
            <Button
              onClick={() => {
                onCancel();
                form.resetFields();
              }}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default GroupModal;
