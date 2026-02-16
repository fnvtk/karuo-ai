import React, { useEffect } from "react";
import { SpinLoading } from "antd-mobile";
import styles from "./layout.module.scss";

interface LayoutProps {
  loading?: boolean;
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  header,
  footer,
  loading = false,
}) => {
  // 移动端100vh兼容
  useEffect(() => {
    const setRealHeight = () => {
      document.documentElement.style.setProperty(
        "--real-vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setRealHeight();
    window.addEventListener("resize", setRealHeight);
    return () => window.removeEventListener("resize", setRealHeight);
  }, []);

  return (
    <div
      className={styles.container}
      style={{ height: "calc(var(--real-vh, 1vh) * 100)" }}
    >
      {header && <header>{header}</header>}
      <main>
        {loading ? (
          <div className={styles.loadingContainer}>
            <SpinLoading color="primary" style={{ fontSize: 32 }} />
            <div className={styles.loadingText}>加载中...</div>
          </div>
        ) : (
          children
        )}
      </main>
      {footer && <footer>{footer}</footer>}
    </div>
  );
};

export default Layout;
