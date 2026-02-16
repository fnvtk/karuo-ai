import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { listData, updateMoment } from "./api";
import UploadComponent from "@/components/Upload/ImageUpload/ImageUpload";
import VideoUpload from "@/components/Upload/VideoUpload";

interface EditMomentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  momentData?: listData;
}

const EditMomentModal: React.FC<EditMomentModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  momentData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<number>(1);
  const [resUrls, setResUrls] = useState<string[]>([]);
  const [linkData, setLinkData] = useState({
    desc: "",
    image: "",
    url: "",
  });

  useEffect(() => {
    if (visible && momentData) {
      // 填充表单数据
      form.setFieldsValue({
        content: momentData.text,
        type: momentData.momentContentType.toString(),
        sendTime: momentData.sendTime
          ? new Date(momentData.sendTime * 1000).toISOString().slice(0, 16)
          : "",
      });

      setContentType(momentData.momentContentType);
      setResUrls(momentData.picUrlList || []);

      // 处理链接数据
      if (momentData.link && momentData.link.length > 0) {
        setLinkData({
          desc: momentData.link[0] || "",
          image: "",
          url: momentData.link[0] || "",
        });
      }
    }
  }, [visible, momentData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const updateData: any = {
        id: momentData?.id,
        content: values.content,
        type: values.type,
        "wechatIds[]": [momentData?.accountCount || 1], // 这里需要根据实际情况调整
      };

      // 根据内容类型添加相应字段
      switch (parseInt(values.type)) {
        case 1: // 文本
          break;
        case 2: // 图文
          if (resUrls.length > 0) {
            updateData["picUrlList[]"] = resUrls;
          }
          break;
        case 3: // 视频
          if (resUrls[0]) {
            updateData.videoUrl = resUrls[0];
          }
          break;
        case 4: // 链接
          if (linkData.url) {
            updateData["link[url]"] = [linkData.url];
            if (linkData.desc) {
              updateData["link[desc]"] = [linkData.desc];
            }
            if (linkData.image) {
              updateData["link[image]"] = [linkData.image];
            }
          }
          break;
      }

      // 添加定时发布时间
      if (values.sendTime) {
        updateData.timingTime = values.sendTime;
      }

      const success = await updateMoment(updateData);

      if (success) {
        message.success("更新成功！");
        onSuccess();
        onCancel();
      } else {
        message.error("更新失败，请重试");
      }
    } catch (error) {
      console.error("更新失败:", error);
      message.error("更新失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setResUrls([]);
    setLinkData({ desc: "", image: "", url: "" });
    onCancel();
  };

  return (
    <Modal
      title="编辑朋友圈"
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          保存
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="content"
          label="内容"
          rules={[{ required: true, message: "请输入内容" }]}
        >
          <Input.TextArea rows={4} placeholder="请输入内容" />
        </Form.Item>

        <Form.Item name="type" label="类型" rules={[{ required: true }]}>
          <Select
            placeholder="请选择类型"
            onChange={value => setContentType(parseInt(value))}
          >
            <Select.Option value="1">文本</Select.Option>
            <Select.Option value="2">图文</Select.Option>
            <Select.Option value="3">视频</Select.Option>
            <Select.Option value="4">链接</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="sendTime" label="发布时间">
          <Input type="datetime-local" />
        </Form.Item>

        {/* 图文类型 */}
        {contentType === 2 && (
          <Form.Item label="图片">
            <UploadComponent value={resUrls} onChange={setResUrls} count={9} />
          </Form.Item>
        )}

        {/* 视频类型 */}
        {contentType === 3 && (
          <Form.Item label="视频">
            <VideoUpload
              value={resUrls[0] || ""}
              onChange={url => setResUrls([url as string])}
            />
          </Form.Item>
        )}

        {/* 链接类型 */}
        {contentType === 4 && (
          <>
            <Form.Item label="链接地址">
              <Input
                value={linkData.url}
                onChange={e =>
                  setLinkData(prev => ({ ...prev, url: e.target.value }))
                }
                placeholder="请输入链接地址"
              />
            </Form.Item>
            <Form.Item label="链接描述">
              <Input
                value={linkData.desc}
                onChange={e =>
                  setLinkData(prev => ({ ...prev, desc: e.target.value }))
                }
                placeholder="请输入链接描述"
              />
            </Form.Item>
            <Form.Item label="链接封面">
              <UploadComponent
                value={linkData.image ? [linkData.image] : []}
                onChange={urls =>
                  setLinkData(prev => ({ ...prev, image: urls[0] || "" }))
                }
                count={1}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default EditMomentModal;
