import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";
import { FeatureCard, featureCategories, kpiData } from "./index.data";
import { Col, Row } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";

const PowerCenter: React.FC = () => {
  const navigate = useNavigate();
  const getKpiBg = (id: string) => {
    if (id === "total-customers") return "#1890ff";
    if (id === "active-customers") return "#52c41a";
    return "#722ed1";
  };

  // 将十六进制颜色转换为带透明度的rgba
  const getIconBgColor = (color: string) => {
    // 如果是十六进制颜色，转换为rgba
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }
    return color;
  };

  const handleCardClick = (card: FeatureCard) => {
    if (card.path) {
      navigate(card.path);
    }
  };

  return (
    <div className={styles.powerCenter}>
      {/* 页面标题区域 */}
      {/* KPI统计区域（置顶，按图展示） */}
      <div className={styles.kpiSection}>
        <Row gutter={16}>
          {kpiData.map(kpi => (
            <Col span={8} key={kpi.id}>
              <div className={styles.kpiCard}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      className={styles.kpiLabel}
                      style={{ textAlign: "left", marginBottom: 6 }}
                    >
                      {kpi.label}
                    </div>
                    <div
                      className={styles.kpiValue}
                      style={{ textAlign: "left", marginBottom: 6 }}
                    >
                      {kpi.value}
                    </div>
                    {kpi.trend && (
                      <div
                        className={styles.kpiTrend}
                        style={{ justifyContent: "flex-start" }}
                      >
                        <span className={styles.trendIcon}>
                          {kpi.trend.icon}
                        </span>
                        <span className={styles.trendText}>
                          {kpi.trend.text}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    aria-hidden
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: getKpiBg(kpi.id),
                      color: "#fff",
                      boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
                    }}
                  >
                    {kpi.id === "total-customers" && (
                      <UserOutlined style={{ fontSize: 22 }} />
                    )}
                    {kpi.id === "active-customers" && (
                      <TeamOutlined style={{ fontSize: 22 }} />
                    )}
                    {kpi.id !== "total-customers" &&
                      kpi.id !== "active-customers" && (
                        <UsergroupAddOutlined style={{ fontSize: 22 }} />
                      )}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* 核心功能模块 */}
      <div className={styles.coreFeatures}>
        {/* 第一行：3个功能卡片 */}
        <Row gutter={24} style={{ marginBottom: 24 }}>
          {featureCategories.slice(0, 3).map(card => (
            <Col span={8} key={card.id}>
              <div
                className={styles.featureCard}
                onClick={() => handleCardClick(card)}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <div
                      className={styles.cardIcon}
                      style={{ backgroundColor: getIconBgColor(card.color) }}
                    >
                      {card.icon}
                    </div>
                    <div
                      className={styles.cardTag}
                      style={{ backgroundColor: card.color }}
                    >
                      {card.tag}
                    </div>
                  </div>

                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>{card.title}</h3>
                    <p className={styles.cardDescription}>{card.description}</p>

                    <ul className={styles.featureList}>
                      {card.features.map((feature, index) => (
                        <li
                          key={index}
                          style={
                            {
                              "--dot-color": card.color,
                            } as React.CSSProperties
                          }
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* 第二行：消息推送助手（单独一行，左边对齐） */}
        {featureCategories.length > 3 && (
          <Row gutter={24}>
            <Col span={8}>
              <div
                className={styles.featureCard}
                onClick={() => handleCardClick(featureCategories[3])}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <div
                      className={styles.cardIcon}
                      style={{
                        backgroundColor: getIconBgColor(
                          featureCategories[3].color,
                        ),
                      }}
                    >
                      {featureCategories[3].icon}
                    </div>
                    <div
                      className={styles.cardTag}
                      style={{ backgroundColor: featureCategories[3].color }}
                    >
                      {featureCategories[3].tag}
                    </div>
                  </div>

                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>
                      {featureCategories[3].title}
                    </h3>
                    <p className={styles.cardDescription}>
                      {featureCategories[3].description}
                    </p>

                    <ul className={styles.featureList}>
                      {featureCategories[3].features.map((feature, index) => (
                        <li
                          key={index}
                          style={
                            {
                              "--dot-color": featureCategories[3].color,
                            } as React.CSSProperties
                          }
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        )}
      </div>
      {/* 页面底部 */}
      <div className={styles.footer}>
        <p>触客宝 AI私域营销系统 - 让每一次沟通都更有价值</p>
      </div>
    </div>
  );
};

export default PowerCenter;
