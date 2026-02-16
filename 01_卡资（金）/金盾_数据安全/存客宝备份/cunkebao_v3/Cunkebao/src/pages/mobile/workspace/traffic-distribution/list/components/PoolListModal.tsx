import React, { useEffect, useState } from "react";
import { Popup, Avatar, SpinLoading } from "antd-mobile";
import { Button, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import style from "../index.module.scss";
import { fetchDistributionRuleDetail } from "../api";

interface PoolItem {
  id: string | number;
  name?: string;
  description?: string;
  userCount?: number;
  tags?: string[];
  createdAt?: string;
  deviceIds?: string[];
}

interface PoolListModalProps {
  visible: boolean;
  onClose: () => void;
  ruleId?: number;
  ruleName?: string;
}

const PoolListModal: React.FC<PoolListModalProps> = ({
  visible,
  onClose,
  ruleId,
  ruleName,
}) => {
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取流量池数据
  const fetchPools = async () => {
    if (!ruleId) return;

    setLoading(true);
    try {
      const detailRes = await fetchDistributionRuleDetail(ruleId);
      const poolData = detailRes?.config?.poolGroupsOptions || [];

      const formattedPools = poolData.map((pool: any) => {
        // 处理创建时间：如果是时间戳，转换为日期字符串
        let createdAt = "";
        if (pool.createTime) {
          if (typeof pool.createTime === "number") {
            createdAt = new Date(pool.createTime * 1000).toLocaleString("zh-CN");
          } else {
            createdAt = pool.createTime;
          }
        }

        return {
        id: pool.id || pool.poolId,
        name: pool.name || pool.poolName || `流量池${pool.id}`,
        description: pool.description || pool.desc || "",
          userCount: pool.num || pool.userCount || pool.count || 0,
        tags: pool.tags || [],
          createdAt: createdAt,
        deviceIds: pool.deviceIds || [],
        };
      });

      setPools(formattedPools);
    } catch (error) {
      console.error("获取流量池详情失败:", error);
      message.error("获取流量池详情失败");
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开且有ruleId时，获取数据
  useEffect(() => {
    if (visible && ruleId) {
      fetchPools();
    }
  }, [visible, ruleId]);

  const title = ruleName ? `${ruleName} - 流量池列表` : "流量池列表";
  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: "70vh",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <div className={style.poolModal}>
        {/* 头部 */}
        <div className={style.poolModalHeader}>
          <h3 className={style.poolModalTitle}>{title}</h3>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={style.poolModalClose}
          />
        </div>

        {/* 流量池列表 */}
        <div className={style.poolList}>
          {loading ? (
            <div className={style.poolLoading}>
              <SpinLoading color="primary" />
              <div className={style.poolLoadingText}>正在加载流量池列表...</div>
            </div>
          ) : pools.length > 0 ? (
            pools.map((pool, index) => (
              <div key={pool.id || index} className={style.poolItem}>
                {/* 流量池信息 */}
                <div className={style.poolMainContent}>
                  {/* 图标 */}
                  <div className={style.poolIcon}>
                    <span className={style.poolIconText}>
                      {(pool.name || "池")[0]}
                    </span>
                  </div>

                  {/* 流量池信息 */}
                  <div className={style.poolInfo}>
                    <div className={style.poolInfoHeader}>
                      <h3 className={style.poolName}>
                        {pool.name || `流量池${pool.id}`}
                      </h3>
                      <span className={style.poolUserCount}>
                        {pool.userCount || 0} 人
                      </span>
                    </div>

                    <div className={style.poolInfoList}>
                      <div className={style.poolInfoItem}>
                        <span className={style.poolInfoLabel}>描述:</span>
                        <span className={style.poolInfoValue}>
                          {pool.description || "暂无描述"}
                        </span>
                      </div>
                      <div className={style.poolInfoItem}>
                        <span className={style.poolInfoLabel}>创建时间:</span>
                        <span className={style.poolInfoValue}>
                          {pool.createdAt || "-"}
                        </span>
                      </div>
                    </div>

                    {/* 标签 */}
                    {pool.tags && pool.tags.length > 0 && (
                      <div className={style.poolTags}>
                        {pool.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className={style.poolTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={style.poolEmpty}>
              <div className={style.poolEmptyText}>暂无流量池数据</div>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className={style.poolModalFooter}>
          <div className={style.poolStats}>
            <span>共 {pools.length} 个流量池</span>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default PoolListModal;
