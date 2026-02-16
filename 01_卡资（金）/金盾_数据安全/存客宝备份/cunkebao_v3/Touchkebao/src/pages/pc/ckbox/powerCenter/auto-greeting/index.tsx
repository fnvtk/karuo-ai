import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Switch,
  Tabs,
  Tag,
  Space,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";

const { TextArea } = Input;
const { Option } = Select;

// 问候规则数据类型
interface GreetingRule {
  id: string;
  name: string;
  triggerType: string;
  triggerCondition: string;
  content: string;
  priority: number;
  isActive: boolean;
  usageCount: number;
  createTime: string;
  tags: string[];
}

const AutoGreeting: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("rules");
  const [rules, setRules] = useState<GreetingRule[]>([
    {
      id: "1",
      name: "产品咨询自动回复",
      triggerType: "关键词",
      triggerCondition: "包含:产品、价格、功能",
      content:
        "感谢您对我们产品的关注!我们的AI营销系统具有智能客服、精准营销、自动化运营等核心功能。详细资料我稍后发送给您,请稍等。",
      priority: 3,
      isActive: false,
      usageCount: 234,
      createTime: "2024/3/3",
      tags: ["关键词", "优先级3"],
    },
    {
      id: "2",
      name: "新好友欢迎",
      triggerType: "新好友",
      triggerCondition: "添加好友后",
      content:
        "您好!欢迎添加我为好友,我是触客宝AI助手,很高兴为您服务!如有任何问题,随时可以咨询我。",
      priority: 1,
      isActive: true,
      usageCount: 156,
      createTime: "2024/3/1",
      tags: ["新好友", "优先级1"],
    },
    {
      id: "3",
      name: "工作时间问候",
      triggerType: "时间触发",
      triggerCondition: "工作日 9:00-18:00",
      content: "您好!现在是工作时间,我是触客宝AI助手,很高兴为您服务!",
      priority: 2,
      isActive: true,
      usageCount: 89,
      createTime: "2024/2/28",
      tags: ["时间触发", "优先级2"],
    },
  ]);

  // 计算活跃规则数量
  const activeRulesCount = rules.filter(rule => rule.isActive).length;

  // 处理表单提交
  const handleSubmit = (values: any) => {
    const newRule: GreetingRule = {
      id: Date.now().toString(),
      name: values.name,
      triggerType: values.triggerType,
      triggerCondition: values.triggerCondition,
      content: values.content,
      priority: values.priority,
      isActive: true,
      usageCount: 0,
      createTime: new Date().toLocaleDateString(),
      tags: [values.triggerType, `优先级${values.priority}`],
    };

    setRules([...rules, newRule]);
    form.resetFields();
    message.success("规则创建成功！");
  };

  // 切换规则状态
  const toggleRuleStatus = (id: string) => {
    setRules(
      rules.map(rule =>
        rule.id === id ? { ...rule, isActive: !rule.isActive } : rule,
      ),
    );
  };

  // 删除规则
  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
    message.success("规则删除成功！");
  };

  // 编辑规则
  const editRule = (rule: GreetingRule) => {
    form.setFieldsValue({
      name: rule.name,
      triggerType: rule.triggerType,
      triggerCondition: rule.triggerCondition,
      content: rule.content,
      priority: rule.priority,
    });
    message.info("规则已加载到编辑表单");
  };

  return (
    <div className={styles.container}>
      {/* 头部区域 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            type="text"
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            className={styles.backButton}
          >
            返回功能中心
          </Button>
          <div className={styles.titleSection}>
            <h1>自动问候</h1>
            <p>设置智能问候规则,提升客户体验</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.activeRules}>
            活跃规则: {activeRulesCount}/{rules.length}
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            + 新建规则
          </Button>
        </div>
      </div>

      {/* 子导航栏 */}
      <div className={styles.subNav}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "rules",
              label: "问候规则",
            },
            {
              key: "templates",
              label: "话术模板",
            },
            {
              key: "statistics",
              label: "使用统计",
            },
          ]}
        />
      </div>

      {/* 主要内容区域 */}
      <div className={styles.mainContent}>
        {activeTab === "rules" && (
          <div className={styles.rulesContent}>
            {/* 左侧创建规则表单 */}
            <div className={styles.leftPanel}>
              <Card title="+ 创建问候规则" className={styles.createCard}>
                <p className={styles.cardSubtitle}>
                  设置自动问候的触发条件和回复内容
                </p>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  className={styles.createForm}
                >
                  <Form.Item
                    name="name"
                    label="规则名称"
                    rules={[{ required: true, message: "请输入规则名称" }]}
                  >
                    <Input placeholder="输入规则名称..." />
                  </Form.Item>

                  <Form.Item
                    name="triggerType"
                    label="触发条件"
                    rules={[{ required: true, message: "请选择触发条件" }]}
                  >
                    <Select placeholder="选择触发条件">
                      <Option value="新好友添加">新好友添加</Option>
                      <Option value="关键词">关键词</Option>
                      <Option value="时间触发">时间触发</Option>
                      <Option value="群聊">群聊</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="triggerCondition"
                    label="具体条件"
                    rules={[{ required: true, message: "请输入具体条件" }]}
                  >
                    <Input placeholder="如:工作日 9:00-18:00 或包含关键词" />
                  </Form.Item>

                  <Form.Item
                    name="content"
                    label="问候内容"
                    rules={[{ required: true, message: "请输入问候内容" }]}
                  >
                    <TextArea rows={4} placeholder="输入自动问候的内容..." />
                  </Form.Item>

                  <Form.Item
                    name="priority"
                    label="优先级"
                    rules={[{ required: true, message: "请选择优先级" }]}
                  >
                    <Select placeholder="选择优先级">
                      <Option value={1}>高优先级</Option>
                      <Option value={2}>中优先级</Option>
                      <Option value={3}>低优先级</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      保存规则
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </div>

            {/* 右侧规则列表 */}
            <div className={styles.rightPanel}>
              <Card title="问候规则列表" className={styles.listCard}>
                <div className={styles.listHeader}>
                  <span>{rules.length}条规则</span>
                </div>
                <div className={styles.ruleList}>
                  {rules.map(rule => (
                    <div key={rule.id} className={styles.ruleItem}>
                      <div className={styles.ruleHeader}>
                        <div className={styles.ruleTitle}>
                          <h4>{rule.name}</h4>
                          <div className={styles.ruleTags}>
                            {rule.tags.map((tag, index) => (
                              <Tag
                                key={index}
                                color={index === 0 ? "blue" : "default"}
                              >
                                {tag}
                              </Tag>
                            ))}
                          </div>
                        </div>
                        <div className={styles.ruleActions}>
                          <Switch
                            checked={rule.isActive}
                            onChange={() => toggleRuleStatus(rule.id)}
                            size="small"
                          />
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => editRule(rule)}
                          />
                          <Popconfirm
                            title="确定要删除这个规则吗？"
                            onConfirm={() => deleteRule(rule.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button
                              type="text"
                              icon={<DeleteOutlined />}
                              danger
                            />
                          </Popconfirm>
                        </div>
                      </div>
                      <div className={styles.ruleContent}>
                        <p className={styles.ruleDescription}>
                          {rule.triggerCondition}
                        </p>
                        <p className={styles.ruleText}>{rule.content}</p>
                        <div className={styles.ruleFooter}>
                          <span>使用次数:{rule.usageCount}</span>
                          <span>创建时间:{rule.createTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className={styles.templatesContent}>
            <Card>
              <p>话术模板功能开发中...</p>
            </Card>
          </div>
        )}

        {activeTab === "statistics" && (
          <div className={styles.statisticsContent}>
            <Card>
              <p>使用统计功能开发中...</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoGreeting;
