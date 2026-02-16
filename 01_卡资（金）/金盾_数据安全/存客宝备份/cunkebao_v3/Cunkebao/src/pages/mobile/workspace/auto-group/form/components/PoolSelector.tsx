import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card } from "antd";
import PoolSelection from "@/components/PoolSelection";
import {
  PoolSelectionItem,
  PoolPackageItem,
} from "@/components/PoolSelection/data";

interface PoolSelectorProps {
  selectedPools: PoolSelectionItem[];
  onNext: (data: {
    poolGroups: string[];
    poolGroupsOptions: PoolSelectionItem[];
  }) => void;
}

export interface PoolSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const PoolSelector = forwardRef<PoolSelectorRef, PoolSelectorProps>(
  ({ selectedPools, onNext }, ref) => {
    const [form] = Form.useForm();

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          await form.validateFields();
          return true;
        } catch (error) {
          console.log("PoolSelector 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    // 处理选择变化
    const handlePoolChange = (poolGroupsOptions: PoolSelectionItem[]) => {
      const poolGroups = poolGroupsOptions.map(c => c.id.toString());
      form.setFieldValue("poolGroups", poolGroups);
      onNext({
        poolGroups,
        poolGroupsOptions,
      });
    };

    // 处理详细选择数据
    const handleSelectDetail = (poolPackages: PoolPackageItem[]) => {
      // 如果需要处理原始流量池包数据，可以在这里添加逻辑
    };

    return (
      <div style={{ marginBottom: 24 }}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              poolGroups: selectedPools.map(c => c.id.toString()),
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                选择流量池包
              </h2>
              <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
                请选择要用于建群的流量池包
              </p>
            </div>

            <Form.Item
              name="poolGroups"
              rules={[
                { required: true, message: "请选择至少一个流量池包" },
                { type: "array", min: 1, message: "请选择至少一个流量池包" },
                { type: "array", max: 20, message: "最多只能选择20个流量池包" },
              ]}
            >
              <PoolSelection
                selectedOptions={selectedPools}
                onSelect={handlePoolChange}
              />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  },
);

PoolSelector.displayName = "PoolSelector";

export default PoolSelector;
