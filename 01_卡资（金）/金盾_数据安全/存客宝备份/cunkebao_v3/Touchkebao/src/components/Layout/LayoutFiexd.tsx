import React from "react";
import { SpinLoading } from "antd-mobile";
import styles from "./layout.module.scss";

interface LayoutProps {
  loading?: boolean;
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const LayoutFiexd: React.FC<LayoutProps> = ({
  header,
  children,
  footer,
  loading = false,
}) => {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="header">{header}</div>
      <div
        className="content"
        style={{
          flex: 1,
          overflow: "auto",
        }}
      >
        {loading ? (
          <div className={styles.loadingContainer}>
            <SpinLoading color="primary" style={{ fontSize: 32 }} />
            <div className={styles.loadingText}>加载中...</div>
          </div>
        ) : (
          children
        )}
      </div>
      <div className="footer">{footer}</div>
    </div>
  );
};

export default LayoutFiexd;
