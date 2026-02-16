import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Badge, SpinLoading, Toast } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import MeauMobile from "@/components/MeauMobile/MeauMoible";
import styles from "./index.module.scss";
import NavCommon from "@/components/NavCommon";
import { getCommonFunctions } from "./api";

// 功能key到默认配置的映射（用于降级，当API没有返回icon时使用）
const featureConfig: Record<string, {
  bgColor: string;
  path: string;
}> = {
  "auto_like": {
    bgColor: "#fff2f0",
    path: "/workspace/auto-like",
  },
  "moments_sync": {
    bgColor: "#f9f0ff",
    path: "/workspace/moments-sync",
  },
  "group_push": {
    bgColor: "#fff7e6",
    path: "/workspace/group-push",
  },
  "auto_group": {
    bgColor: "#f6ffed",
    path: "/workspace/auto-group",
  },
  "group_create": {
    bgColor: "#f6ffed",
    path: "/workspace/group-create",
  },
  "traffic_distribution": {
    bgColor: "#e6f7ff",
    path: "/workspace/traffic-distribution",
  },
  "contact_import": {
    bgColor: "#f9f0ff",
    path: "/workspace/contact-import/list",
  },
  "ai_knowledge": {
    bgColor: "#fff7e6",
    path: "/workspace/ai-knowledge",
  },
  "distribution_management": {
    bgColor: "#f9f0ff",
    path: "/workspace/distribution-management",
  },
};

interface CommonFunction {
  id: number;
  key: string;
  name: string;
  description?: string;
  icon: React.ReactNode | null;
  iconUrl?: string | null;
  path: string;
  bgColor?: string;
  isNew?: boolean;
  isPlanType?: number; // 是否支持计划类型配置：1-支持，0-不支持
  [key: string]: any;
}

const Workspace: React.FC = () => {
  const [commonFeatures, setCommonFeatures] = useState<CommonFunction[]>([]);
  const [loading, setLoading] = useState(true);

  // 从API获取常用功能
  useEffect(() => {
    const fetchCommonFunctions = async () => {
      try {
        setLoading(true);
        const res = await getCommonFunctions();
        // 兼容不同返回结构：优先使用 data.list，其次 list，最后整体当作数组
        const list = res?.data?.list || res?.list || res?.data || res || [];
        // 处理API返回的数据，映射图标和样式
        const features = (list as any[]).map((item: any) => {
          const config = featureConfig[item.key];

          // icon是远程图片URL，渲染为img标签
          const iconElement = item.icon ? (
            <img
              src={item.icon}
              alt={item.title || ""}
              className={styles.iconImage}
              onError={(e) => {
                // 图片加载失败时，隐藏图片
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : null;

          const feature = {
            id: item.id,
            key: item.key,
            name: item.title || item.name || "",
            description: item.subtitle || item.description || item.desc || "",
            icon: iconElement,
            iconUrl: item.icon || null, // 保存原始URL
            path: item.route || item.path || (config?.path) || `/workspace/${item.key?.replace(/_/g, '-')}`,
            bgColor: item.iconColor || (config?.bgColor) || undefined, // iconColor可以为空
            isNew: item.isNew || item.is_new || false,
            isPlanType: item.isPlanType ?? 0, // 保存 isPlanType，用于传递给子页面
          };
          // eslint-disable-next-line no-console
          console.log("[Workspace] feature loaded:", feature.key, "isPlanType =", feature.isPlanType);
          return feature;
        });
        setCommonFeatures(features);
      } catch (e: any) {
        Toast.show({
          content: e?.message || "获取常用功能失败",
          position: "top",
        });
        // 如果接口失败，使用默认数据（从配置映射表生成）
        const defaultFeatures = Object.keys(featureConfig).map((key, index) => {
          const config = featureConfig[key];
          return {
            id: index + 1,
            key,
            name: key.replace(/_/g, ' '),
            description: "",
            icon: null, // 默认没有图标
            iconUrl: null,
            path: config.path,
            bgColor: config.bgColor,
            isNew: false,
          };
        });
        setCommonFeatures(defaultFeatures);
      } finally {
        setLoading(false);
      }
    };

    fetchCommonFunctions();
  }, []);

  return (
    <Layout
      header={<NavCommon left={<></>} title="工作台" />}
      footer={<MeauMobile activeKey="workspace" />}
    >
      <div className={styles.workspace}>
        {/* 常用功能 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>常用功能</h2>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <SpinLoading style={{ "--size": "32px" }} />
            </div>
          ) : (
            <div className={styles.featuresGrid}>
              {commonFeatures.length > 0 ? (
                commonFeatures.map(feature => (
                  <Link
                    to={feature.path}
                    // 将 isPlanType 透传到对应页面，便于调试和控制计划类型
                    state={{ isPlanType: feature.isPlanType ?? 0 }}
                    key={feature.key || feature.id}
                    className={styles.featureLink}
                  >
                    <Card className={styles.featureCard}>
                      <div
                        className={styles.featureIcon}
                        style={{ backgroundColor: feature.bgColor || "transparent" }}
                      >
                        {feature.icon}
                      </div>
                      <div className={styles.featureHeader}>
                        <div className={styles.featureName}>{feature.name}</div>
                        {feature.isNew && (
                          <Badge content="New" className={styles.newBadge} />
                        )}
                      </div>
                      <div className={styles.featureDescription}>
                        {feature.description}
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", width: "100%" }}>
                  暂无常用功能
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI智能助手 */}
        {/* <div className={styles.section}>
          <h2 className={styles.sectionTitle}>AI 智能助手</h2>
          <div className={styles.featuresGrid}>
            {aiFeatures.map(feature => (
              <Link
                to={feature.path}
                key={feature.id}
                className={styles.featureLink}
              >
                <Card className={styles.featureCard}>
                  <div
                    className={styles.featureIcon}
                    style={{ backgroundColor: feature.bgColor }}
                  >
                    {feature.icon}
                  </div>
                  <div className={styles.featureHeader}>
                    <div className={styles.featureName}>{feature.name}</div>
                    {feature.isNew && (
                      <Badge content="New" className={styles.newBadge} />
                    )}
                  </div>
                  <div className={styles.featureDescription}>
                    {feature.description}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div> */}
      </div>
    </Layout>
  );
};

export default Workspace;
