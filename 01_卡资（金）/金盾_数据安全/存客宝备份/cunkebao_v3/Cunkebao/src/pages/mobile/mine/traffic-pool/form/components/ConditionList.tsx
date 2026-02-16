import React from "react";
import { Button } from "antd-mobile";
import { DeleteOutline } from "antd-mobile-icons";
import styles from "./ConditionList.module.scss";

interface FilterCondition {
  id: string;
  type: string;
  label: string;
  value: any;
  operator?: string;
}

interface ConditionListProps {
  conditions: FilterCondition[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, value: any) => void;
}

const ConditionList: React.FC<ConditionListProps> = ({
  conditions,
  onRemove,
  onUpdate,
}) => {
  const formatConditionValue = (condition: FilterCondition) => {
    switch (condition.type) {
      case "range":
        return `${condition.value.min || 0}-${condition.value.max || 0}岁`;
      case "select":
        return condition.value;
      default:
        return condition.value;
    }
  };

  if (conditions.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>自定义条件</div>
      <div className={styles.conditionList}>
        {conditions.map(condition => (
          <div key={condition.id} className={styles.conditionItem}>
            <div className={styles.conditionContent}>
              <span className={styles.conditionLabel}>{condition.label}:</span>
              <span className={styles.conditionValue}>
                {formatConditionValue(condition)}
              </span>
            </div>
            <Button
              size="small"
              fill="none"
              onClick={() => onRemove(condition.id)}
              className={styles.removeBtn}
            >
              <DeleteOutline />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConditionList;
