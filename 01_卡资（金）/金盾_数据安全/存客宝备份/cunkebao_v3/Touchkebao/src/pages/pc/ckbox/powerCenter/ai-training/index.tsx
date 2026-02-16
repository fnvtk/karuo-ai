import React, { useState } from "react";
import { Button, Input, Tabs, Card, Tag, message, Modal, Tooltip } from "antd";
import {
  PlusOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import PowerNavigation from "@/components/PowerNavtion";
import styles from "./index.module.scss";

const { TextArea } = Input;
const { TabPane } = Tabs;

// 话术数据类型
interface UtteranceData {
  id: string;
  title: string;
  category: string;
  content: string;
  status: "active" | "pending";
  createTime: string;
  updateTime: string;
}

// 模型数据类型
interface ModelData {
  id: string;
  name: string;
  version: string;
  status: "training" | "completed" | "failed";
  accuracy: number;
  createTime: string;
  lastTraining: string;
}

// 训练分析数据类型
interface TrainingAnalysis {
  totalUtterances: number;
  activeUtterances: number;
  pendingUtterances: number;
  trainingAccuracy: number;
  lastTrainingTime: string;
  nextTrainingTime: string;
}

const AiTraining: React.FC = () => {
  const [activeTab, setActiveTab] = useState("utterance");
  const [utteranceForm, setUtteranceForm] = useState({
    title: "",
    category: "",
    content: "",
  });
  const [utterances, setUtterances] = useState<UtteranceData[]>([
    {
      id: "1",
      title: "产品介绍话术",
      category: "产品介绍",
      content:
        "我们的AI营销系统具有智能客服、精准营销、自动化运营等核心功能，能够帮助您提升客户满意度和业务效率...",
      status: "active",
      createTime: "2024/3/1",
      updateTime: "2024/3/5",
    },
    {
      id: "2",
      title: "价格咨询回复",
      category: "价格咨询",
      content:
        "关于价格方面，我们提供多种套餐选择，可以根据您的具体需求定制。基础版适合小型企业，专业版适合中型企业...",
      status: "active",
      createTime: "2024/3/2",
      updateTime: "2024/3/4",
    },
    {
      id: "3",
      title: "技术支持话术",
      category: "技术支持",
      content:
        "我们提供7x24小时技术支持，包括在线客服、电话支持、远程协助等多种方式，确保您的问题得到及时解决...",
      status: "pending",
      createTime: "2024/3/3",
      updateTime: "2024/3/3",
    },
  ]);
  const [models] = useState<ModelData[]>([
    {
      id: "1",
      name: "智能客服模型",
      version: "v2.1.0",
      status: "completed",
      accuracy: 94.5,
      createTime: "2024/2/15",
      lastTraining: "2024/3/5",
    },
    {
      id: "2",
      name: "营销推荐模型",
      version: "v1.8.0",
      status: "training",
      accuracy: 89.2,
      createTime: "2024/2/20",
      lastTraining: "2024/3/4",
    },
  ]);
  const [trainingAnalysis] = useState<TrainingAnalysis>({
    totalUtterances: 3,
    activeUtterances: 2,
    pendingUtterances: 1,
    trainingAccuracy: 94.5,
    lastTrainingTime: "2024/3/5 14:30:00",
    nextTrainingTime: "2024/3/6 09:00:00",
  });

  // 保存话术
  const handleSaveUtterance = () => {
    if (
      !utteranceForm.title ||
      !utteranceForm.category ||
      !utteranceForm.content
    ) {
      message.warning("请填写完整的话术信息");
      return;
    }

    const newUtterance: UtteranceData = {
      id: Date.now().toString(),
      title: utteranceForm.title,
      category: utteranceForm.category,
      content: utteranceForm.content,
      status: "pending",
      createTime: new Date().toLocaleDateString("zh-CN"),
      updateTime: new Date().toLocaleDateString("zh-CN"),
    };

    setUtterances([...utterances, newUtterance]);
    setUtteranceForm({ title: "", category: "", content: "" });
    message.success("话术保存成功");
  };

  // 删除话术
  const handleDeleteUtterance = (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这条话术吗？",
      onOk: () => {
        setUtterances(utterances.filter(item => item.id !== id));
        message.success("删除成功");
      },
    });
  };

  // 开始训练
  const handleStartTraining = () => {
    Modal.confirm({
      title: "开始训练",
      content: "确定要开始AI模型训练吗？训练过程可能需要几分钟时间。",
      onOk: () => {
        message.success("训练已开始，请稍候...");
        // 这里可以添加实际的训练逻辑
      },
    });
  };

  // 话术投喂组件
  const UtteranceFeeding = () => (
    <div className={styles.utteranceFeeding}>
      <div className={styles.leftPanel}>
        <Card className={styles.addCard}>
          <div className={styles.cardHeader}>
            <PlusOutlined className={styles.icon} />
            <span className={styles.title}>添加训练话术</span>
          </div>
          <p className={styles.description}>添加高质量的对话内容来训练AI模型</p>

          <div className={styles.form}>
            <div className={styles.formItem}>
              <label>话术标题</label>
              <Input
                placeholder="输入话术标题..."
                value={utteranceForm.title}
                onChange={e =>
                  setUtteranceForm({ ...utteranceForm, title: e.target.value })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label>分类</label>
              <Input
                placeholder="如：产品介绍、价格咨询等"
                value={utteranceForm.category}
                onChange={e =>
                  setUtteranceForm({
                    ...utteranceForm,
                    category: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label>话术内容</label>
              <TextArea
                placeholder="输入详细的话术内容..."
                rows={6}
                value={utteranceForm.content}
                onChange={e =>
                  setUtteranceForm({
                    ...utteranceForm,
                    content: e.target.value,
                  })
                }
              />
            </div>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveUtterance}
              className={styles.saveButton}
            >
              保存话术
            </Button>
          </div>
        </Card>
      </div>

      <div className={styles.rightPanel}>
        <Card className={styles.libraryCard}>
          <div className={styles.cardHeader}>
            <DatabaseOutlined className={styles.icon} />
            <span className={styles.title}>训练话术库</span>
            <span className={styles.count}>{utterances.length}条话术</span>
          </div>

          <div className={styles.utteranceList}>
            {utterances.map(utterance => (
              <div key={utterance.id} className={styles.utteranceItem}>
                <div className={styles.utteranceHeader}>
                  <span className={styles.utteranceTitle}>
                    {utterance.title}
                  </span>
                  <Tag color={utterance.status === "active" ? "green" : "blue"}>
                    {utterance.status === "active" ? "已激活" : "待处理"}
                  </Tag>
                </div>

                <div className={styles.utteranceCategory}>
                  <Tag color="blue">{utterance.category}</Tag>
                </div>

                <div className={styles.utteranceContent}>
                  {utterance.content}
                </div>

                <div className={styles.utteranceFooter}>
                  <div className={styles.timestamps}>
                    <span>创建: {utterance.createTime}</span>
                    <span>更新: {utterance.updateTime}</span>
                  </div>

                  <div className={styles.actions}>
                    <Tooltip title="查看">
                      <Button type="text" icon={<EyeOutlined />} size="small" />
                    </Tooltip>
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => handleDeleteUtterance(utterance.id)}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  // 模型管理组件
  const ModelManagement = () => (
    <div className={styles.modelManagement}>
      <Card>
        <div className={styles.cardHeader}>
          <FileTextOutlined className={styles.icon} />
          <span className={styles.title}>模型管理</span>
        </div>

        <div className={styles.modelList}>
          {models.map(model => (
            <div key={model.id} className={styles.modelItem}>
              <div className={styles.modelInfo}>
                <div className={styles.modelName}>
                  <span className={styles.name}>{model.name}</span>
                  <Tag color="blue">{model.version}</Tag>
                </div>
                <div className={styles.modelStatus}>
                  <Tag
                    color={
                      model.status === "completed"
                        ? "green"
                        : model.status === "training"
                          ? "orange"
                          : "red"
                    }
                  >
                    {model.status === "completed"
                      ? "已完成"
                      : model.status === "training"
                        ? "训练中"
                        : "失败"}
                  </Tag>
                  <span className={styles.accuracy}>
                    准确率: {model.accuracy}%
                  </span>
                </div>
              </div>

              <div className={styles.modelActions}>
                <Button type="primary" size="small">
                  部署
                </Button>
                <Button size="small">查看详情</Button>
                <Button size="small">重新训练</Button>
              </div>

              <div className={styles.modelTimestamps}>
                <span>创建: {model.createTime}</span>
                <span>最后训练: {model.lastTraining}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // 训练分析组件
  const TrainingAnalysis = () => (
    <div className={styles.trainingAnalysis}>
      <div className={styles.analysisCards}>
        <Card className={styles.analysisCard}>
          <div className={styles.cardTitle}>话术统计</div>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>总话术数</span>
              <span className={styles.statValue}>
                {trainingAnalysis.totalUtterances}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>已激活</span>
              <span className={styles.statValue}>
                {trainingAnalysis.activeUtterances}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>待处理</span>
              <span className={styles.statValue}>
                {trainingAnalysis.pendingUtterances}
              </span>
            </div>
          </div>
        </Card>

        <Card className={styles.analysisCard}>
          <div className={styles.cardTitle}>训练效果</div>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>准确率</span>
              <span className={styles.statValue}>
                {trainingAnalysis.trainingAccuracy}%
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>最后训练</span>
              <span className={styles.statValue}>
                {trainingAnalysis.lastTrainingTime}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>下次训练</span>
              <span className={styles.statValue}>
                {trainingAnalysis.nextTrainingTime}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className={styles.chartCard}>
        <div className={styles.cardTitle}>训练趋势图</div>
        <div className={styles.chartPlaceholder}>
          <BarChartOutlined className={styles.chartIcon} />
          <p>训练趋势图表</p>
        </div>
      </Card>
    </div>
  );

  return (
    <div className={styles.container}>
      <PowerNavigation
        title="AI模型训练"
        subtitle="训练和优化AI模型，提升智能服务质量"
        showBackButton={true}
        backButtonText="返回功能中心"
      />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.computeBalance}>
            <ThunderboltOutlined />
            <span>算力余额: 9307.423</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartTraining}
            className={styles.startTrainingButton}
          >
            开始训练
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className={styles.tabs}
        >
          <TabPane tab="话术投喂" key="utterance">
            <UtteranceFeeding />
          </TabPane>
          <TabPane tab="模型管理" key="model">
            <ModelManagement />
          </TabPane>
          <TabPane tab="训练分析" key="analysis">
            <TrainingAnalysis />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default AiTraining;
