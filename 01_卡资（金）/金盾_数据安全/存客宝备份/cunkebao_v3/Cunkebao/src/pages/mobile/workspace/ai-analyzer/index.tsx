import React, { useState } from "react";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import { Tabs } from "antd-mobile";
import { Button } from "antd";
import styles from "./index.module.scss";
import { PlusOutlined } from "@ant-design/icons";

const mockPlans = [
  {
    id: "1",
    title: "美妆用户分析",
    status: "done",
    device: "设备1",
    wechat: "wxid_abc123",
    type: "综合分析",
    keywords: ["美妆", "护肤", "彩妆"],
    createTime: "2023/12/15 18:30:00",
    finishTime: "2023/12/15 19:45:00",
  },
  {
    id: "2",
    title: "健身爱好者分析",
    status: "doing",
    device: "设备2",
    wechat: "wxid_fit456",
    type: "好友信息分析",
    keywords: ["健身", "运动", "健康"],
    createTime: "2023/12/16 17:15:00",
    finishTime: "",
  },
];

const statusMap = {
  all: "全部计划",
  doing: "进行中",
  done: "已完成",
};

const statusTag = {
  done: <span className={styles.statusDone}>已完成</span>,
  doing: <span className={styles.statusDoing}>分析中</span>,
};

const AiAnalyzer: React.FC = () => {
  const [tab, setTab] = useState<"all" | "doing" | "done">("all");

  const filteredPlans =
    tab === "all" ? mockPlans : mockPlans.filter(p => p.status === tab);

  return (
    <Layout
      header={
        <NavCommon
          title="AI数据分析"
          right={
            <Button type="primary" size="small" style={{ borderRadius: 6 }}>
              <PlusOutlined /> 新建计划
            </Button>
          }
        />
      }
    >
      <div className={styles.analyzerPage}>
        <Tabs
          activeKey={tab}
          onChange={key => setTab(key as any)}
          className={styles.tabs}
        >
          <Tabs.Tab title="全部计划" key="all" />
          <Tabs.Tab title="进行中" key="doing" />
          <Tabs.Tab title="已完成" key="done" />
        </Tabs>
        <div className={styles.planList}>
          {filteredPlans.map(plan => (
            <div className={styles.planCard} key={plan.id}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{plan.title}</span>
                {statusTag[plan.status as "done" | "doing"]}
              </div>
              <div className={styles.cardInfo}>
                <div>
                  <span className={styles.label}>设备：</span>
                  {plan.device} | 微信号: {plan.wechat}
                </div>
                <div>
                  <span className={styles.label}>分析类型：</span>
                  {plan.type}
                </div>
                <div>
                  <span className={styles.label}>关键词：</span>
                  {plan.keywords.map(k => (
                    <span className={styles.keyword} key={k}>
                      {k}
                    </span>
                  ))}
                </div>
                <div>
                  <span className={styles.label}>创建时间：</span>
                  {plan.createTime}
                </div>
                {plan.status === "done" && (
                  <div>
                    <span className={styles.label}>完成时间：</span>
                    {plan.finishTime}
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                {plan.status === "done" ? (
                  <>
                    <Button size="small" className={styles.actionBtn}>
                      发送报告
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      className={styles.actionBtn}
                    >
                      查看报告
                    </Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    type="primary"
                    className={styles.actionBtn}
                  >
                    查看进度
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AiAnalyzer;
