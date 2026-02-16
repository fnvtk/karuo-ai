import React, { useState } from "react";
import { Popup, Form, Input, Selector, Button } from "antd-mobile";
import styles from "./CustomConditionModal.module.scss";

interface CustomConditionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (condition: any) => void;
}

// 模拟标签数据
const mockTags = [
  { id: "age", name: "年龄层", type: "range", options: [] },
  {
    id: "consumption",
    name: "消费能力",
    type: "select",
    options: [
      { label: "高", value: "high" },
      { label: "中", value: "medium" },
      { label: "低", value: "low" },
    ],
  },
  {
    id: "gender",
    name: "性别",
    type: "select",
    options: [
      { label: "男", value: "male" },
      { label: "女", value: "female" },
      { label: "未知", value: "unknown" },
    ],
  },
  {
    id: "location",
    name: "所在地区",
    type: "select",
    options: [
      { label: "厦门", value: "xiamen" },
      { label: "泉州", value: "quanzhou" },
      { label: "福州", value: "fuzhou" },
    ],
  },
  {
    id: "source",
    name: "客户来源",
    type: "select",
    options: [
      { label: "抖音", value: "douyin" },
      { label: "门店扫码", value: "store" },
      { label: "朋友推荐", value: "referral" },
      { label: "广告投放", value: "ad" },
    ],
  },
  {
    id: "frequency",
    name: "消费频率",
    type: "select",
    options: [
      { label: "高频(>3次/月)", value: "high" },
      { label: "中频", value: "medium" },
      { label: "低频", value: "low" },
    ],
  },
  {
    id: "sensitivity",
    name: "优惠敏感度",
    type: "select",
    options: [
      { label: "高", value: "high" },
      { label: "中", value: "medium" },
      { label: "低", value: "low" },
    ],
  },
  {
    id: "category",
    name: "品类偏好",
    type: "select",
    options: [
      { label: "护肤", value: "skincare" },
      { label: "茶饮", value: "tea" },
      { label: "宠物", value: "pet" },
      { label: "课程", value: "course" },
    ],
  },
  {
    id: "repurchase",
    name: "复购行为",
    type: "select",
    options: [
      { label: "有", value: "yes" },
      { label: "无", value: "no" },
    ],
  },
  {
    id: "satisfaction",
    name: "售后满意度",
    type: "select",
    options: [
      { label: "好评", value: "good" },
      { label: "一般", value: "average" },
      { label: "差评", value: "bad" },
    ],
  },
];

const CustomConditionModal: React.FC<CustomConditionModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [conditionValue, setConditionValue] = useState<any>(null);

  const handleTagSelect = (tag: any) => {
    setSelectedTag(tag);
    setConditionValue(null);
  };

  const handleValueChange = (value: any) => {
    setConditionValue(value);
  };

  const handleSubmit = () => {
    if (!selectedTag || !conditionValue) return;

    const condition = {
      id: `${selectedTag.id}_${Date.now()}`,
      type: selectedTag.type,
      label: selectedTag.name,
      value: conditionValue,
    };

    onAdd(condition);
    onClose();
    setSelectedTag(null);
    setConditionValue(null);
  };

  const renderValueInput = () => {
    if (!selectedTag) return null;

    switch (selectedTag.type) {
      case "range":
        return (
          <div className={styles.rangeInputs}>
            <Input
              placeholder="最小年龄"
              type="number"
              onChange={value =>
                setConditionValue(prev => ({ ...prev, min: value }))
              }
            />
            <span className={styles.rangeSeparator}>-</span>
            <Input
              placeholder="最大年龄"
              type="number"
              onChange={value =>
                setConditionValue(prev => ({ ...prev, max: value }))
              }
            />
          </div>
        );

      case "select":
        return (
          <Selector
            options={selectedTag.options}
            value={conditionValue ? [conditionValue] : []}
            onChange={value => handleValueChange(value[0])}
            multiple={false}
          />
        );

      default:
        return (
          <Input
            placeholder="请输入值"
            value={conditionValue}
            onChange={handleValueChange}
          />
        );
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ height: "70vh" }}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>添加自定义条件</div>
          <Button size="small" fill="none" onClick={onClose}>
            取消
          </Button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>选择标签</div>
            <div className={styles.tagList}>
              {mockTags.map(tag => (
                <div
                  key={tag.id}
                  className={`${styles.tagItem} ${
                    selectedTag?.id === tag.id ? styles.selected : ""
                  }`}
                  onClick={() => handleTagSelect(tag)}
                >
                  {tag.name}
                </div>
              ))}
            </div>
          </div>

          {selectedTag && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>设置条件</div>
              {renderValueInput()}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button
            color="primary"
            block
            disabled={!selectedTag || !conditionValue}
            onClick={handleSubmit}
          >
            添加条件
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default CustomConditionModal;
