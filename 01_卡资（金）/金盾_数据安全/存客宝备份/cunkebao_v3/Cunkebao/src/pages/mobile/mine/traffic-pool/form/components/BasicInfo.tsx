import React from "react";
import { Card, Form, Input } from "antd-mobile";
import styles from "./BasicInfo.module.scss";

interface BasicInfoProps {
  data: {
    name: string;
    description: string;
    remarks: string;
  };
  onChange: (data: any) => void;
}

const BasicInfo: React.FC<BasicInfoProps> = ({ data, onChange }) => {
  const handleChange = (field: string, value: string) => {
    onChange({ [field]: value });
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.title}>基本信息</div>

        <Form layout="vertical">
          <Form.Item
            label={
              <span className={styles.label}>
                流量包名称<span className={styles.required}>*</span>
              </span>
            }
            required
          >
            <Input
              placeholder="输入流量包名称"
              value={data.name}
              onChange={value => handleChange("name", value)}
              className={styles.input}
            />
          </Form.Item>

          <Form.Item label={<span className={styles.label}>描述</span>}>
            <Input
              placeholder="输入流量包描述"
              value={data.description}
              onChange={value => handleChange("description", value)}
              className={styles.input}
            />
          </Form.Item>

          <Form.Item label={<span className={styles.label}>备注</span>}>
            <Input
              placeholder="输入备注信息 (选填)"
              value={data.remarks}
              onChange={value => handleChange("remarks", value)}
              className={styles.textarea}
              rows={3}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BasicInfo;
