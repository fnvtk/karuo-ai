import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card } from "antd";
import GroupSelection from "@/components/GroupSelection";
import { GroupSelectionItem } from "@/components/GroupSelection/data";

interface GroupSelectorProps {
  selectedGroups: GroupSelectionItem[];
  onPrevious: () => void;
  onNext: (data: {
    groups: string[];
    groupsOptions: GroupSelectionItem[];
  }) => void;
}

export interface GroupSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const GroupSelector = forwardRef<GroupSelectorRef, GroupSelectorProps>(
  ({ selectedGroups, onNext }, ref) => {
    const [form] = Form.useForm();

    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          form.setFieldsValue({
            groups: selectedGroups.map(item => String(item.id)),
          });
          await form.validateFields(["groups"]);
          return true;
        } catch (error) {
          console.log("GroupSelector 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    const handleGroupSelect = (groupsOptions: GroupSelectionItem[]) => {
      const groups = groupsOptions.map(item => String(item.id));
      form.setFieldValue("groups", groups);
      onNext({ groups, groupsOptions });
    };

    return (
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ groups: selectedGroups }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              选择群组
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              请选择需要设置欢迎语的群组（可多选）
            </p>
          </div>

          <Form.Item
            name="groups"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "请至少选择一个群组",
              },
            ]}
          >
            <GroupSelection
              selectedOptions={selectedGroups}
              onSelect={handleGroupSelect}
              placeholder="选择群组"
            />
          </Form.Item>
        </Form>
      </Card>
    );
  },
);

GroupSelector.displayName = "GroupSelector";

export default GroupSelector;
