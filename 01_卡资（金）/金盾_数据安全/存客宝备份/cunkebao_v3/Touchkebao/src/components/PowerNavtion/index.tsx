import React from "react";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";

// 简化的组件属性类型
export interface PowerNavigationProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  rightContent?: React.ReactNode;
}

const PowerNavigation: React.FC<PowerNavigationProps> = ({
  title = "触客宝",
  subtitle,
  showBackButton = true,
  backButtonText = "返回功能中心",
  onBackClick,
  className,
  style,
  rightContent,
}) => {
  const navigate = useNavigate();

  // 处理返回按钮点击
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`${styles.header} ${className || ""}`} style={style}>
      <div className={styles.headerLeft}>
        {/* 返回按钮 */}
        {showBackButton && (
          <Button
            type="text"
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={handleBackClick}
            className={styles.backButton}
          >
            {backButtonText}
          </Button>
        )}

        {/* 标题区域 */}
        <div className={styles.titleSection}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
      </div>
      <div className={styles.headerRight}>{rightContent}</div>
    </div>
  );
};

export default PowerNavigation;
