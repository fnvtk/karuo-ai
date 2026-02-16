import React from "react";
import { NavBar, Button } from "antd-mobile";
import { PlusOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";

interface PlaceholderPageProps {
  title: string;
  showBack?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  showBack = true,
  showAddButton = false,
  addButtonText = "新建",
}) => {
  return (
    <Layout
      header={
        <NavBar
          back={showBack}
          style={{ background: "#fff" }}
          onBack={showBack ? () => window.history.back() : undefined}
          left={
            <div style={{ color: "var(--primary-color)", fontWeight: 600 }}>
              {title}
            </div>
          }
          right={
            showAddButton ? (
              <Button size="small" color="primary">
                <PlusOutlined />
                <span style={{ marginLeft: 4, fontSize: 12 }}>
                  {addButtonText}
                </span>
              </Button>
            ) : undefined
          }
        />
      }
    >
      <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
        <h3>{title}页面</h3>
        <p>此页面正在开发中...</p>
      </div>
    </Layout>
  );
};

export default PlaceholderPage;
