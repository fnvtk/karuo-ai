import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  List,
  Checkbox,
  Tag,
  Space,
  Typography,
  message,
} from "antd";
import { PlusOutlined, CalendarOutlined } from "@ant-design/icons";
import { getTodoList, addTodo, processTodo } from "@/pages/pc/ckbox/weChat/api";
import styles from "./index.module.scss";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

// 优先级映射
const priorityMap: { [key: string]: string } = {
  "0": "低",
  "1": "中",
  "2": "高",
  "3": "紧急",
};

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  client?: string;
  priority: "高" | "中" | "低" | "紧急";
  dueDate: string;
  completed: boolean;
  friendId?: string;
}

interface TodoListModalProps {
  visible: boolean;
  onClose: () => void;
  clientName?: string;
  friendId?: string;
}

const TodoListModal: React.FC<TodoListModalProps> = ({
  visible,
  onClose,
  clientName = "客户",
  friendId,
}) => {
  const [form] = Form.useForm();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // 优先级选项
  const priorityOptions = [
    { value: "2", label: "高优先级", color: "orange" },
    { value: "1", label: "中优先级", color: "blue" },
    { value: "0", label: "低优先级", color: "green" },
    { value: "3", label: "紧急", color: "red" },
  ];

  // 加载待办事项列表
  const loadTodoList = useCallback(async () => {
    if (!friendId) return;

    setLoading(true);
    try {
      const response = await getTodoList({
        friendId,
        limit: "50",
        page: "1",
      });

      if (response && response.list) {
        const formattedTodos = response.list.map((item: any) => ({
          id: item.id?.toString() || "",
          title: item.title || "",
          description: item.description || "",
          client: clientName,
          priority: priorityMap[item.level] || "中",
          dueDate: item.reminderTime || "",
          completed: item.isProcess === 1,
          friendId: item.friendId,
        }));
        setTodos(formattedTodos);
      }
    } catch (error) {
      console.error("加载待办事项列表失败:", error);
      message.error("加载待办事项列表失败");
    } finally {
      setLoading(false);
    }
  }, [friendId, clientName]);

  // 当模态框打开时加载数据
  useEffect(() => {
    if (visible && friendId) {
      loadTodoList();
    }
  }, [visible, friendId, loadTodoList]);

  // 处理添加任务
  const handleAddTask = async () => {
    if (!friendId) {
      message.error("缺少好友ID，无法添加任务");
      return;
    }

    setAddLoading(true);
    try {
      const values = await form.validateFields();

      const params = {
        friendId,
        title: values.title,
        description: values.description,
        level: values.priority,
        reminderTime: values.dueDate.format("YYYY-MM-DD HH:mm:ss"),
      };

      const response = await addTodo(params);

      if (response) {
        message.success("添加待办事项成功");
        form.resetFields();
        // 重新加载列表
        loadTodoList();
      }
    } catch (error) {
      console.error("添加待办事项失败:", error);
      message.error("添加待办事项失败");
    } finally {
      setAddLoading(false);
    }
  };

  // 处理任务完成状态切换
  const handleToggleComplete = async (id: string) => {
    try {
      const response = await processTodo({ ids: id });
      if (response) {
        message.success("任务状态更新成功");
        // 重新加载列表
        loadTodoList();
      }
    } catch (error) {
      console.error("更新任务状态失败:", error);
      message.error("更新任务状态失败");
    }
  };

  // 获取优先级标签颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "高":
        return "orange";
      case "中":
        return "blue";
      case "低":
        return "green";
      case "紧急":
        return "red";
      default:
        return "default";
    }
  };

  return (
    <Modal
      title={
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>待办事项清单</div>
          <div className={styles.modalSubtitle}>管理日常工作任务</div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      className={styles.todoModal}
    >
      <div className={styles.modalContent}>
        {/* 添加新任务区域 */}
        <div className={styles.addTaskSection}>
          <Form form={form} layout="vertical" className={styles.taskForm}>
            <Form.Item
              name="title"
              rules={[{ required: true, message: "请输入任务标题" }]}
            >
              <Input placeholder="任务标题..." className={styles.titleInput} />
            </Form.Item>

            <Form.Item name="description">
              <TextArea
                placeholder="任务描述 (可选)..."
                rows={2}
                className={styles.descriptionInput}
              />
            </Form.Item>

            <div className={styles.formRow}>
              <Form.Item
                name="priority"
                rules={[{ required: true, message: "请选择优先级" }]}
                className={styles.formItem}
              >
                <Select
                  placeholder="中优先级"
                  className={styles.prioritySelect}
                >
                  {priorityOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="dueDate"
                rules={[{ required: true, message: "请选择截止时间" }]}
                className={styles.formItem}
              >
                <DatePicker
                  showTime
                  format="MM/DD HH:mm"
                  placeholder="年/月/日 --:--"
                  className={styles.dateInput}
                />
              </Form.Item>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddTask}
              className={styles.addButton}
              loading={addLoading}
              block
            >
              添加任务
            </Button>
          </Form>
        </div>

        {/* 任务列表 */}
        <div className={styles.todoList}>
          <List
            dataSource={todos}
            loading={loading}
            renderItem={todo => (
              <List.Item className={styles.todoItem}>
                <div className={styles.todoContent}>
                  <div className={styles.todoHeader}>
                    <Checkbox
                      checked={todo.completed}
                      onChange={() => handleToggleComplete(todo.id)}
                      className={styles.todoCheckbox}
                    />
                    <Text
                      className={`${styles.todoTitle} ${todo.completed ? styles.completed : ""}`}
                    >
                      {todo.title}
                    </Text>
                  </div>

                  {todo.description && (
                    <div className={styles.todoDescription}>
                      <Text className={styles.descriptionText}>
                        {todo.description}
                      </Text>
                    </div>
                  )}

                  <div className={styles.todoFooter}>
                    <Space>
                      <Text className={styles.clientInfo}>
                        客户:{todo.client}
                      </Text>
                      <Tag
                        color={getPriorityColor(todo.priority)}
                        className={styles.priorityTag}
                      >
                        {todo.priority}
                      </Tag>
                      <Space className={styles.dueDate}>
                        <CalendarOutlined className={styles.calendarIcon} />
                        <Text className={styles.dueDateText}>
                          {todo.dueDate}
                        </Text>
                      </Space>
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

export default TodoListModal;
