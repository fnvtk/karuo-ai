import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  List,
  Tag,
  Space,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import {
  getFollowUpList,
  addFollowUp,
  processFollowUp,
} from "@/pages/pc/ckbox/weChat/api";
import styles from "./index.module.scss";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

// 类型映射
const typeMap: { [key: string]: string } = {
  "1": "电话",
  "2": "消息",
  "3": "会议",
  "4": "邮件",
  "0": "其他",
};

interface FollowupReminder {
  id: string;
  type: "电话" | "消息" | "其他" | "会议" | "邮件";
  status: "待处理" | "已完成" | "已取消";
  content: string;
  scheduledTime: string;
  recipient: string;
  title?: string;
  description?: string;
  friendId?: string;
}

interface FollowupReminderModalProps {
  visible: boolean;
  onClose: () => void;
  recipientName?: string;
  friendId?: string;
}

const FollowupReminderModal: React.FC<FollowupReminderModalProps> = ({
  visible,
  onClose,
  recipientName = "客户",
  friendId,
}) => {
  const [form] = Form.useForm();
  const [reminders, setReminders] = useState<FollowupReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // 跟进方式选项
  const followupMethods = [
    { value: "1", label: "电话回访" },
    { value: "2", label: "发送消息" },
    { value: "3", label: "安排会议" },
    { value: "4", label: "发送邮件" },
    { value: "0", label: "其他" },
  ];

  // 加载跟进提醒列表
  const loadFollowUpList = useCallback(async () => {
    if (!friendId) return;

    setLoading(true);
    try {
      const response = await getFollowUpList({
        friendId,
        limit: "50",
        page: "1",
      });

      if (response && response.list) {
        const formattedReminders = response.list.map((item: any) => ({
          id: item.id?.toString() || "",
          type: typeMap[item.type] || "其他",
          status: item.isProcess === 1 ? "已完成" : "待处理",
          content: item.description || item.title || "",
          scheduledTime: item.reminderTime || "",
          recipient: recipientName,
          title: item.title,
          description: item.description,
          friendId: item.friendId,
        }));
        setReminders(formattedReminders);
      }
    } catch (error) {
      console.error("加载跟进提醒列表失败:", error);
      message.error("加载跟进提醒列表失败");
    } finally {
      setLoading(false);
    }
  }, [friendId, recipientName]);

  // 当模态框打开时加载数据
  useEffect(() => {
    if (visible && friendId) {
      loadFollowUpList();
    }
  }, [visible, friendId, loadFollowUpList]);

  // 处理添加提醒
  const handleAddReminder = async () => {
    if (!friendId) {
      message.error("缺少好友ID，无法添加提醒");
      return;
    }

    setAddLoading(true);
    try {
      const values = await form.validateFields();

      const params = {
        friendId,
        type: values.method,
        title: values.content,
        description: values.content,
        reminderTime: values.dateTime.format("YYYY-MM-DD HH:mm:ss"),
      };

      const response = await addFollowUp(params);

      if (response) {
        message.success("添加跟进提醒成功");
        form.resetFields();
        // 重新加载列表
        loadFollowUpList();
      }
    } catch (error) {
      console.error("添加跟进提醒失败:", error);
      message.error("添加跟进提醒失败");
    } finally {
      setAddLoading(false);
    }
  };

  // 处理跟进提醒
  const handleProcessReminder = async (id: string) => {
    try {
      const response = await processFollowUp({ ids: id });
      if (response) {
        message.success("处理成功");
        // 重新加载列表
        loadFollowUpList();
      }
    } catch (error) {
      console.error("处理跟进提醒失败:", error);
      message.error("处理跟进提醒失败");
    }
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "待处理":
        return "warning";
      case "已完成":
        return "success";
      case "已取消":
        return "default";
      default:
        return "default";
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    return type === "电话" ? <PhoneOutlined /> : <MessageOutlined />;
  };

  return (
    <Modal
      title={
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>跟进提醒设置</div>
          <div className={styles.modalSubtitle}>设置客户跟进时间和方式</div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      className={styles.followupModal}
    >
      <div className={styles.modalContent}>
        {/* 添加新提醒区域 */}
        <div className={styles.addReminderSection}>
          <Form form={form} layout="vertical" className={styles.reminderForm}>
            <div className={styles.formRow}>
              <Form.Item
                name="method"
                label="跟进方式"
                rules={[{ required: true, message: "请选择跟进方式" }]}
                className={styles.formItem}
              >
                <Select placeholder="电话回访" className={styles.selectInput}>
                  {followupMethods.map(method => (
                    <Option key={method.value} value={method.value}>
                      {method.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="dateTime"
                label="提醒时间"
                rules={[{ required: true, message: "请选择提醒时间" }]}
                className={styles.formItem}
              >
                <DatePicker
                  showTime
                  format="YYYY/M/D HH:mm"
                  placeholder="年/月/日 --:--"
                  className={styles.dateInput}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="content"
              label="提醒内容"
              rules={[{ required: true, message: "请输入提醒内容" }]}
            >
              <TextArea
                placeholder="提醒内容..."
                rows={3}
                className={styles.contentInput}
              />
            </Form.Item>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddReminder}
              className={styles.addButton}
              loading={addLoading}
              block
            >
              添加提醒
            </Button>
          </Form>
        </div>

        {/* 现有提醒列表 */}
        <div className={styles.remindersList}>
          <List
            dataSource={reminders}
            loading={loading}
            renderItem={reminder => (
              <List.Item className={styles.reminderItem}>
                <div className={styles.reminderContent}>
                  <div className={styles.reminderHeader}>
                    <Space>
                      <Tag
                        icon={getTypeIcon(reminder.type)}
                        color="blue"
                        className={styles.typeTag}
                      >
                        {reminder.type}
                      </Tag>
                      <Tag color={getStatusColor(reminder.status)}>
                        {reminder.status}
                      </Tag>
                    </Space>
                    <Text className={styles.recipient}>
                      {reminder.recipient}
                    </Text>
                  </div>

                  <div className={styles.reminderBody}>
                    <Text className={styles.reminderText}>
                      {reminder.content}
                    </Text>
                  </div>

                  <div className={styles.reminderFooter}>
                    <Space>
                      <ClockCircleOutlined className={styles.clockIcon} />
                      <Text className={styles.scheduledTime}>
                        {reminder.scheduledTime}
                      </Text>
                      {reminder.status === "待处理" && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleProcessReminder(reminder.id)}
                        >
                          处理
                        </Button>
                      )}
                    </Space>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    </Modal>
  );
};

export default FollowupReminderModal;
