import React, { useState } from "react";
import { Card, Button, Space, Typography, Tag } from "antd";
import {
  MessageOutlined,
  SelectOutlined,
  UploadOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { isDevelopment } from "@/utils/env";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import TestFormModal, { TestFormValues } from "./components/TestFormModal";

const { Title, Text } = Typography;

const TestIndex: React.FC = () => {
  const navigate = useNavigate();
  const [testFormVisible, setTestFormVisible] = useState(false);

  const handleTestFormSubmit = (values: TestFormValues) => {
    // API调用已在TestFormModal内部完成
    // 这里可以添加额外的处理逻辑，如日志记录、数据分析等
    console.log("测试表单提交成功，数据:", values);
  };

  return (
    <Layout header={<NavCommon title="测试页面" />}>
      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        <Title level={2}>
          测试页面
          {isDevelopment && (
            <Tag color="orange" style={{ marginLeft: 8, fontSize: "12px" }}>
              开发环境
            </Tag>
          )}
        </Title>

        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Card title="组件测试" size="small">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type="primary"
                icon={<MessageOutlined />}
                size="large"
                block
                onClick={() => navigate("/test/iframe")}
              >
                UniApp桥接测试
              </Button>

              <Button
                icon={<SelectOutlined />}
                size="large"
                block
                onClick={() => navigate("/test/select")}
              >
                选择组件测试
              </Button>

              <Button
                icon={<UploadOutlined />}
                size="large"
                block
                onClick={() => navigate("/test/upload")}
              >
                上传组件测试
              </Button>
            </Space>
          </Card>

          <Card title="功能测试" size="small">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                icon={<FormOutlined />}
                size="large"
                block
                onClick={() => setTestFormVisible(true)}
              >
                测试表单
              </Button>
            </Space>
          </Card>

          <Card title="说明" size="small">
            <Text>这里提供各种功能的测试页面，方便开发和调试。</Text>
          </Card>
        </Space>
      </div>

      {/* 测试表单弹框 */}
      <TestFormModal
        visible={testFormVisible}
        onClose={() => setTestFormVisible(false)}
        onSubmit={handleTestFormSubmit}
      />
    </Layout>
  );
};

export default TestIndex;
