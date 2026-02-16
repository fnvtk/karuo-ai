import React, { useMemo } from "react";
import { Modal, Form, Input, Select, Space, Button } from "antd";
import {
  PictureOutlined,
  VideoCameraOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import SimpleFileUpload from "@/components/Upload/SimpleFileUpload";
// 简化版不再使用样式与解析组件
import { AddReplyRequest } from "../api";

export interface QuickReplyModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialValues?: Partial<AddReplyRequest>;
  onSubmit: (values: AddReplyRequest) => void;
  onCancel: () => void;
  groupOptions?: { label: string; value: string }[];
  defaultGroupId?: string;
}

const QuickReplyModal: React.FC<QuickReplyModalProps> = ({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  groupOptions,
  defaultGroupId,
}) => {
  const [form] = Form.useForm<AddReplyRequest>();

  const mergedInitialValues = useMemo(() => {
    return {
      groupId: defaultGroupId,
      msgType: initialValues?.msgType || ["1"],
      ...initialValues,
    } as Partial<AddReplyRequest>;
  }, [initialValues, defaultGroupId]);

  // 监听类型变化
  const msgTypeWatch = Form.useWatch("msgType", form);
  const selectedMsgType = useMemo(() => {
    const value = msgTypeWatch;
    const raw = Array.isArray(value) ? value[0] : value;
    return Number(raw || "1");
  }, [msgTypeWatch]);

  // 根据文件格式判断消息类型
  const getMsgTypeByFileFormat = (filePath: string): number => {
    const extension = filePath.toLowerCase().split(".").pop() || "";
    const imageFormats = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
      "svg",
      "ico",
    ];
    if (imageFormats.includes(extension)) return 3;
    const videoFormats = [
      "mp4",
      "avi",
      "mov",
      "wmv",
      "flv",
      "mkv",
      "webm",
      "3gp",
      "rmvb",
    ];
    if (videoFormats.includes(extension)) return 43;
    return 49;
  };

  const FileType = {
    TEXT: 1,
    IMAGE: 2,
    VIDEO: 3,
    AUDIO: 4,
    FILE: 5,
  } as const;

  const handleFileUploaded = (
    filePath: string | { url: string; durationMs: number },
    fileType: number,
  ) => {
    let msgType = 1;
    if (([FileType.TEXT] as number[]).includes(fileType)) {
      msgType = getMsgTypeByFileFormat(filePath as string);
    } else if (([FileType.IMAGE] as number[]).includes(fileType)) {
      msgType = 3;
    } else if (([FileType.VIDEO] as number[]).includes(fileType)) {
      msgType = 43;
    } else if (([FileType.AUDIO] as number[]).includes(fileType)) {
      msgType = 34;
    } else if (([FileType.FILE] as number[]).includes(fileType)) {
      msgType = 49;
    }

    form.setFieldsValue({
      msgType: [String(msgType)],
      content: ([FileType.AUDIO] as number[]).includes(fileType)
        ? JSON.stringify(filePath)
        : (filePath as string),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      form.submit();
    }
  };

  // 简化后不再有预览解析

  return (
    <Modal
      title={mode === "add" ? "添加快捷回复" : "编辑快捷回复"}
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
        onFinish={values => {
          const normalized = {
            ...values,
            msgType: Array.isArray(values.msgType)
              ? values.msgType
              : [String(values.msgType)],
          } as AddReplyRequest;
          onSubmit(normalized);
        }}
        initialValues={mergedInitialValues}
      >
        <Space style={{ width: "100%" }} size={24}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入标题" }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="请输入快捷语标题" allowClear />
          </Form.Item>

          <Form.Item
            name="groupId"
            label="选择分组"
            style={{ width: 260 }}
            rules={[{ required: true, message: "请选择分组" }]}
          >
            <Select
              placeholder="请选择分组"
              options={groupOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="msgType"
          label="消息类型"
          rules={[{ required: true, message: "请选择消息类型" }]}
        >
          <Select placeholder="请选择消息类型">
            <Select.Option value="1">文本</Select.Option>
            <Select.Option value="3">图片</Select.Option>
            <Select.Option value="43">视频</Select.Option>
            <Select.Option value="49">链接</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="content"
          label="内容"
          rules={[{ required: true, message: "请输入/上传内容" }]}
        >
          {selectedMsgType === 1 && (
            <Input.TextArea
              rows={4}
              placeholder="请输入文本内容"
              value={form.getFieldValue("content")}
              onChange={e => form.setFieldsValue({ content: e.target.value })}
              onKeyDown={handleKeyPress}
            />
          )}
          {selectedMsgType === 3 && (
            <SimpleFileUpload
              onFileUploaded={filePath =>
                handleFileUploaded(filePath, FileType.IMAGE)
              }
              maxSize={1}
              type={1}
              slot={<Button icon={<PictureOutlined />}>上传图片</Button>}
            />
          )}
          {selectedMsgType === 43 && (
            <SimpleFileUpload
              onFileUploaded={filePath =>
                handleFileUploaded(filePath, FileType.VIDEO)
              }
              maxSize={1}
              type={4}
              slot={<Button icon={<VideoCameraOutlined />}>上传视频</Button>}
            />
          )}
          {selectedMsgType === 49 && (
            <Input
              placeholder="请输入链接地址"
              prefix={<LinkOutlined />}
              value={form.getFieldValue("content")}
              onChange={e => form.setFieldsValue({ content: e.target.value })}
            />
          )}
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

export default QuickReplyModal;
