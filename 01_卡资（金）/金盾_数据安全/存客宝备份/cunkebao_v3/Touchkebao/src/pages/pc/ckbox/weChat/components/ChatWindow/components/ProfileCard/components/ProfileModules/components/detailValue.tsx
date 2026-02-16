import React, { useCallback, useState, useEffect, useRef } from "react";
import { Input, message } from "antd";
import { Button } from "antd-mobile";
import { EditOutlined } from "@ant-design/icons";

import styles from "../Person.module.scss";

export interface DetailValueField {
  label: string;
  key: string;
  ifEdit?: boolean;
  placeholder?: string;
  type?: "text" | "textarea";
  editable?: boolean;
}

export interface DetailValueProps {
  fields: DetailValueField[];
  value?: Record<string, string>;
  onChange?: (next: Record<string, string>) => void;
  onSubmit?: (next: Record<string, string>, changedKeys: string[]) => void;
  submitText?: string;
  submitting?: boolean;
  renderFooter?: React.ReactNode;
  saveHandler?: (
    values: Record<string, string>,
    changedKeys: string[],
  ) => Promise<void>;
  onSaveSuccess?: (
    values: Record<string, string>,
    changedKeys: string[],
  ) => void;
}

const DetailValue: React.FC<DetailValueProps> = ({
  fields,
  value = {},
  onChange,
  onSubmit,
  submitText = "保存",
  submitting = false,
  renderFooter,
  saveHandler,
  onSaveSuccess,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>(
    {},
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(value);

  const [originalValues, setOriginalValues] =
    useState<Record<string, string>>(value);
  const [changedKeys, setChangedKeys] = useState<string[]>([]);

  // 使用 useRef 存储上一次的 value，用于深度比较
  const prevValueRef = useRef<Record<string, string>>(value);

  // 深度比较函数：比较两个对象的值是否真的变化了
  const isValueChanged = useCallback(
    (prev: Record<string, string>, next: Record<string, string>) => {
      const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      for (const key of allKeys) {
        if (prev[key] !== next[key]) {
          return true;
        }
      }
      return false;
    },
    [],
  );

  // 当外部value变化时，更新内部状态
  // 优化：只有当值真正变化时才重置编辑状态，避免因对象引用变化导致编辑状态丢失
  useEffect(() => {
    // 深度比较，只有当值真正变化时才更新
    if (!isValueChanged(prevValueRef.current, value)) {
      return;
    }

    // 只有在值真正变化时才更新状态
    setFieldValues(value);
    setOriginalValues(value);
    setChangedKeys([]);
    // 重置所有编辑状态
    const newEditingFields: Record<string, boolean> = {};
    fields.forEach(field => {
      newEditingFields[field.key] = false;
    });
    setEditingFields(newEditingFields);

    // 更新 ref
    prevValueRef.current = value;
  }, [value, fields, isValueChanged]);

  const handleFieldChange = useCallback(
    (fieldKey: string, nextVal: string) => {
      setFieldValues(prev => ({
        ...prev,
        [fieldKey]: nextVal,
      }));

      // 检查值是否发生变化，更新changedKeys
      if (nextVal !== originalValues[fieldKey]) {
        if (!changedKeys.includes(fieldKey)) {
          setChangedKeys(prev => [...prev, fieldKey]);
        }
      } else {
        // 如果值恢复到原始值，从changedKeys中移除
        setChangedKeys(prev => prev.filter(key => key !== fieldKey));
      }

      // 调用外部onChange，但不触发自动保存
      if (onChange) {
        onChange({
          ...fieldValues,
          [fieldKey]: nextVal,
        });
      }
    },
    [onChange, fieldValues, originalValues, changedKeys],
  );

  const handleEditField = useCallback((fieldKey: string) => {
    setEditingFields(prev => ({
      ...prev,
      [fieldKey]: true,
    }));
  }, []);

  const handleCancelEdit = useCallback(
    (fieldKey: string) => {
      // 恢复原始值
      setFieldValues(prev => ({
        ...prev,
        [fieldKey]: originalValues[fieldKey] || "",
      }));

      // 从changedKeys中移除
      setChangedKeys(prev => prev.filter(key => key !== fieldKey));

      // 关闭编辑状态
      setEditingFields(prev => ({
        ...prev,
        [fieldKey]: false,
      }));
    },
    [originalValues],
  );

  const handleSubmit = useCallback(async () => {
    if (changedKeys.length === 0) {
      messageApi.info("没有需要保存的更改");
      return;
    }

    try {
      // 统一由外部传入的 saveHandler 或 onSubmit 处理保存逻辑，
      // DetailValue 只负责收集数据和触发保存，避免与业务层重复。
      if (saveHandler) {
        await saveHandler(fieldValues, changedKeys);
      } else {
        onSubmit?.(fieldValues, changedKeys);
      }

      // 更新原始值
      setOriginalValues(fieldValues);
      // 清空changedKeys
      setChangedKeys([]);
      // 关闭所有编辑状态
      const newEditingFields: Record<string, boolean> = {};
      fields.forEach(field => {
        newEditingFields[field.key] = false;
      });
      setEditingFields(newEditingFields);
      // 调用保存成功回调
      onSaveSuccess?.(fieldValues, changedKeys);
      messageApi.success("保存成功");
    } catch (error) {
      messageApi.error("保存失败");
      console.error("保存失败:", error);
    }
  }, [
    onSubmit,
    saveHandler,
    onSaveSuccess,
    fieldValues,
    changedKeys,
    fields,
    messageApi,
  ]);

  const isEditing = Object.values(editingFields).some(Boolean);

  return (
    <div>
      {contextHolder}
      {fields.map(field => {
        const disabled = field.ifEdit === false;
        const fieldValue = fieldValues[field.key] ?? "";
        const isFieldEditing = editingFields[field.key];
        const InputComponent =
          field.type === "textarea" ? Input.TextArea : Input;

        return (
          <div key={field.key} className={styles.infoItem}>
            <span className={styles.infoLabel}>{field.label}:</span>
            <div className={styles.infoValue}>
              {disabled ? (
                <span>{fieldValue || field.placeholder || ""}</span>
              ) : isFieldEditing ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <InputComponent
                    value={fieldValue}
                    placeholder={field.placeholder}
                    onChange={event =>
                      handleFieldChange(field.key, event.target.value)
                    }
                    onPressEnter={undefined}
                    autoFocus
                    rows={field.type === "textarea" ? 4 : undefined}
                  />
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => handleCancelEdit(field.key)}
                      style={{ marginRight: 8 }}
                    >
                      取消
                    </Button>
                    <Button size="small" color="primary" onClick={handleSubmit}>
                      确定
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid transparent",
                    transition: "all 0.3s",
                    width: "100%",
                  }}
                  onClick={() => handleEditField(field.key)}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#d9d9d9";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace:
                        field.type === "textarea" ? "pre-wrap" : "nowrap",
                    }}
                  >
                    {fieldValue || field.placeholder || ""}
                  </span>
                  <EditOutlined style={{ color: "#1890ff", marginLeft: 8 }} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {(onSubmit || renderFooter) && !isEditing && changedKeys.length > 0 && (
        <div className={styles.footerActions}>
          {renderFooter}
          <Button
            loading={submitting}
            onClick={handleSubmit}
            style={{ marginLeft: renderFooter ? 8 : 0 }}
          >
            {submitText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DetailValue;
