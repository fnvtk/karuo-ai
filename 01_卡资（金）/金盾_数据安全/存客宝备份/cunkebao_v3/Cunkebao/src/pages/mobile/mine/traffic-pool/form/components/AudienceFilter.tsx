import React, { useEffect, useState } from "react";
import { Card, Button } from "antd-mobile";
import { Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import CustomConditionModal from "./CustomConditionModal";
import ConditionList from "./ConditionList";
import styles from "./AudienceFilter.module.scss";
import {
  getIndustryOptions,
  getPresetSchemes,
  IndustryOption,
  PresetScheme,
} from "../api";

interface FilterCondition {
  id: string;
  type: string;
  label: string;
  value: any;
  operator?: string;
}

interface AudienceFilterProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}

const AudienceFilter: React.FC<AudienceFilterProps> = ({
  conditions,
  onChange,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [industryOptions, setIndustryOptions] = useState<IndustryOption[]>([]);
  const [presetSchemes, setPresetSchemes] = useState<PresetScheme[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<
    string | number | undefined
  >(undefined);
  const [selectedScheme, setSelectedScheme] = useState<string | undefined>(
    undefined,
  );

  // 加载行业选项和方案列表
  useEffect(() => {
    getIndustryOptions()
      .then(res => setIndustryOptions(res || []))
      .catch(() => setIndustryOptions([]));

    getPresetSchemes()
      .then(res => setPresetSchemes(res || []))
      .catch(() => setPresetSchemes([]));
  }, []);

  const handleAddCondition = (condition: FilterCondition) => {
    const newConditions = [...conditions, condition];
    onChange(newConditions);
  };

  const handleRemoveCondition = (id: string) => {
    const newConditions = conditions.filter(c => c.id !== id);
    onChange(newConditions);
  };

  const handleUpdateCondition = (id: string, value: any) => {
    const newConditions = conditions.map(c =>
      c.id === id ? { ...c, value } : c,
    );
    onChange(newConditions);
  };

  const handleSchemeChange = (schemeId: string) => {
    setSelectedScheme(schemeId);
    if (schemeId) {
      // 找到选中的方案并应用其条件
      const scheme = presetSchemes.find(s => s.id === schemeId);
      if (scheme) {
        onChange(scheme.conditions);
      }
    } else {
      // 清空方案选择时，清空条件
      onChange([]);
    }
  };

  const handleAddScheme = () => {
    // 这里可以打开添加方案的弹窗或跳转到方案管理页面
    console.log("添加新方案");
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>人群筛选</div>
        </div>

        {/* 方案推荐选择 */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>方案推荐</div>
          <div className={styles.schemeRow}>
            <Select
              style={{ flex: 1 }}
              placeholder="选择预设方案"
              value={selectedScheme}
              onChange={handleSchemeChange}
              options={presetSchemes.map(scheme => ({
                label: `${scheme.name} (${scheme.userCount}人)`,
                value: scheme.id,
              }))}
              allowClear
            />
            <Button
              size="small"
              fill="outline"
              onClick={handleAddScheme}
              className={styles.addSchemeBtn}
            >
              <PlusOutlined />
              添加方案
            </Button>
          </div>
        </div>

        {/* 条件筛选区域 - 当未选择方案时显示 */}
        {!selectedScheme && (
          <>
            {/* 行业筛选（固定项，接口获取选项） */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>行业</div>
              <Select
                style={{ width: "100%" }}
                placeholder="选择行业"
                value={selectedIndustry}
                onChange={value => setSelectedIndustry(value)}
                options={industryOptions.map(opt => ({
                  label: opt.label,
                  value: opt.value,
                }))}
                allowClear
              />
            </div>

            {/* 标签筛选 */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>标签筛选</div>
              <div className={styles.tagGrid}>
                {[
                  { name: "高价值用户", color: "#1677ff" },
                  { name: "新用户", color: "#52c41a" },
                  { name: "活跃用户", color: "#faad14" },
                  { name: "流失风险", color: "#eb2f96" },
                  { name: "复购率高", color: "#722ed1" },
                  { name: "高潜力", color: "#eb2f96" },
                  { name: "已沉睡", color: "#bfbfbf" },
                  { name: "价格敏感", color: "#13c2c2" },
                ].map((tag, index) => (
                  <div
                    key={index}
                    className={styles.tag}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </div>
                ))}
              </div>
            </div>

            {/* 自定义条件列表 */}
            <ConditionList
              conditions={conditions}
              onRemove={handleRemoveCondition}
              onUpdate={handleUpdateCondition}
            />

            {/* 添加自定义条件 */}
            <Button
              fill="outline"
              onClick={() => setShowCustomModal(true)}
              className={styles.addConditionBtn}
            >
              + 添加自定义条件
            </Button>
          </>
        )}
      </Card>

      {/* 自定义条件弹窗 */}
      <CustomConditionModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdd={handleAddCondition}
      />
    </div>
  );
};

export default AudienceFilter;
