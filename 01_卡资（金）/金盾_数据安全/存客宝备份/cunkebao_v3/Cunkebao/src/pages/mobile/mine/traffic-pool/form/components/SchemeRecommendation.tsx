import React from "react";
import { Popup, Card, Button } from "antd-mobile";
import styles from "./SchemeRecommendation.module.scss";

interface FilterCondition {
  id: string;
  type: string;
  label: string;
  value: any;
  operator?: string;
}

interface SchemeRecommendationProps {
  visible: boolean;
  onClose: () => void;
  onApply: (conditions: FilterCondition[]) => void;
}

// 预设方案数据
const presetSchemes = [
  {
    id: "high_value",
    name: "高价值客户方案",
    description: "针对高消费、高活跃度的优质客户",
    conditions: [
      { id: "consumption_1", type: "select", label: "消费能力", value: "high" },
      { id: "frequency_1", type: "select", label: "消费频率", value: "high" },
      {
        id: "satisfaction_1",
        type: "select",
        label: "售后满意度",
        value: "good",
      },
    ],
    userCount: 1250,
    color: "#1677ff",
  },
  {
    id: "new_user",
    name: "新用户激活方案",
    description: "针对新注册用户，提高首次消费转化",
    conditions: [
      {
        id: "age_2",
        type: "range",
        label: "年龄层",
        value: { min: 18, max: 35 },
      },
      { id: "source_2", type: "select", label: "客户来源", value: "douyin" },
      { id: "frequency_2", type: "select", label: "消费频率", value: "low" },
    ],
    userCount: 3200,
    color: "#52c41a",
  },
  {
    id: "retention",
    name: "用户留存方案",
    description: "针对有流失风险的客户，进行召回激活",
    conditions: [
      { id: "frequency_3", type: "select", label: "消费频率", value: "low" },
      {
        id: "satisfaction_3",
        type: "select",
        label: "售后满意度",
        value: "average",
      },
      { id: "repurchase_3", type: "select", label: "复购行为", value: "no" },
    ],
    userCount: 890,
    color: "#faad14",
  },
  {
    id: "upsell",
    name: "升单转化方案",
    description: "针对有升单潜力的客户，推荐高价值产品",
    conditions: [
      {
        id: "consumption_4",
        type: "select",
        label: "消费能力",
        value: "medium",
      },
      { id: "frequency_4", type: "select", label: "消费频率", value: "medium" },
      {
        id: "category_4",
        type: "select",
        label: "品类偏好",
        value: "skincare",
      },
    ],
    userCount: 1560,
    color: "#722ed1",
  },
  {
    id: "price_sensitive",
    name: "价格敏感用户方案",
    description: "针对对价格敏感的用户，提供优惠活动",
    conditions: [
      {
        id: "sensitivity_5",
        type: "select",
        label: "优惠敏感度",
        value: "high",
      },
      { id: "consumption_5", type: "select", label: "消费能力", value: "low" },
      { id: "frequency_5", type: "select", label: "消费频率", value: "low" },
    ],
    userCount: 2100,
    color: "#eb2f96",
  },
  {
    id: "loyal_customer",
    name: "忠诚客户维护方案",
    description: "针对高忠诚度客户，提供VIP服务",
    conditions: [
      { id: "frequency_6", type: "select", label: "消费频率", value: "high" },
      { id: "repurchase_6", type: "select", label: "复购行为", value: "yes" },
      {
        id: "satisfaction_6",
        type: "select",
        label: "售后满意度",
        value: "good",
      },
    ],
    userCount: 680,
    color: "#13c2c2",
  },
];

const SchemeRecommendation: React.FC<SchemeRecommendationProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  const handleApplyScheme = (scheme: any) => {
    onApply(scheme.conditions);
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ height: "80vh" }}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>方案推荐</div>
          <Button size="small" fill="none" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className={styles.content}>
          <div className={styles.schemeList}>
            {presetSchemes.map(scheme => (
              <Card key={scheme.id} className={styles.schemeCard}>
                <div className={styles.schemeHeader}>
                  <div className={styles.schemeName}>{scheme.name}</div>
                  <div
                    className={styles.schemeBadge}
                    style={{ backgroundColor: scheme.color }}
                  >
                    {scheme.userCount}人
                  </div>
                </div>

                <div className={styles.schemeDescription}>
                  {scheme.description}
                </div>

                <div className={styles.schemeConditions}>
                  <div className={styles.conditionsTitle}>筛选条件：</div>
                  <div className={styles.conditionsList}>
                    {scheme.conditions.map((condition, index) => (
                      <span key={index} className={styles.conditionTag}>
                        {condition.label}: {condition.value}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  size="small"
                  color="primary"
                  fill="outline"
                  onClick={() => handleApplyScheme(scheme)}
                  className={styles.applyBtn}
                >
                  应用此方案
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default SchemeRecommendation;
