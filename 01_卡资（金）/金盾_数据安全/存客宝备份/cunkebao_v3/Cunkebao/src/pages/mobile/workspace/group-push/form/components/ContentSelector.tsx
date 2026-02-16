import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card } from "antd";
import ContentSelection from "@/components/ContentSelection";
import { ContentItem } from "@/components/ContentSelection/data";

interface ContentSelectorProps {
  selectedOptions: ContentItem[];
  onPrevious: () => void;
  onNext: (data: {
    contentGroups: string[];
    contentGroupsOptions: ContentItem[];
  }) => void;
}

export interface ContentSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const ContentSelector = forwardRef<ContentSelectorRef, ContentSelectorProps>(
  ({ selectedOptions, onNext }, ref) => {
    const [form] = Form.useForm();

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          await form.validateFields();
          return true;
        } catch (error) {
          console.log("ContentSelector 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    // 处理选择变化
    const handleLibrariesChange = (contentGroupsOptions: ContentItem[]) => {
      const contentGroups = contentGroupsOptions.map(c => c.id.toString());
      onNext({
        contentGroups,
        contentGroupsOptions,
      });
      form.setFieldValue("contentGroups", contentGroups);
    };

    return (
      <div style={{ marginBottom: 24 }}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              contentGroups: selectedOptions.map(c => Number(c.id)),
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                选择内容库
              </h2>
              <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
                请选择要推送的内容库
              </p>
            </div>

            <Form.Item
              name="contentGroups"
              rules={[
                { required: true, message: "请选择至少一个内容库" },
                { type: "array", min: 1, message: "请选择至少一个内容库" },
                { type: "array", max: 20, message: "最多只能选择20个内容库" },
              ]}
            >
              <ContentSelection
                selectedOptions={selectedOptions}
                onSelect={handleLibrariesChange}
                placeholder="选择内容库"
                showInput={true}
                showSelectedList={true}
                readonly={false}
                selectedListMaxHeight={320}
              />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  },
);

ContentSelector.displayName = "ContentSelector";

export default ContentSelector;
