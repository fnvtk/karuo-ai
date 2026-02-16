import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "antd-mobile";
import { ArrowLeftOutlined, HomeOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import styles from "./index.module.scss";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Layout>
      <div className={styles["not-found-container"]}>
        <div className={styles["not-found-content"]}>
          {/* 404 图标 */}
          <div className={styles["error-code"]}>404</div>

          {/* 错误提示 */}
          <h1 className={styles["error-title"]}>页面未找到</h1>
          <p className={styles["error-description"]}>
            抱歉，您访问的页面不存在或已被删除
          </p>

          {/* 操作按钮 */}
          <div className={styles["action-buttons"]}>
            <Button
              color="primary"
              size="large"
              onClick={handleGoHome}
              className={styles["action-btn"]}
            >
              <HomeOutlined />
              <span>返回首页</span>
            </Button>
            <Button
              color="default"
              size="large"
              onClick={handleGoBack}
              className={styles["action-btn"]}
            >
              <ArrowLeftOutlined />
              <span>返回上页</span>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
