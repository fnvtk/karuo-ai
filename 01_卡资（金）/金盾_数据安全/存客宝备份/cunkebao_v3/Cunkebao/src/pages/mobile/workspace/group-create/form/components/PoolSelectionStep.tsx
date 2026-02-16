import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { PoolSelectionItem } from "@/components/PoolSelection/data";
import PoolSelection from "@/components/PoolSelection";
import style from "./PoolSelectionStep.module.scss";

export interface PoolSelectionStepRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

interface PoolSelectionStepProps {
  selectedPools?: PoolSelectionItem[];
  poolGroups?: string[];
  onSelect: (pools: PoolSelectionItem[], poolGroups: string[]) => void;
}

const PoolSelectionStep = forwardRef<PoolSelectionStepRef, PoolSelectionStepProps>(
  ({ selectedPools = [], poolGroups = [], onSelect }, ref) => {
    const [poolSelectionVisible, setPoolSelectionVisible] = useState(false);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        if (selectedPools.length === 0) {
          return false;
        }
        return true;
      },
      getValues: () => {
        return { selectedPools, poolGroups };
      },
    }));

    const handlePoolSelect = (pools: PoolSelectionItem[]) => {
      const poolGroupIds = pools.map(p => p.id);
      onSelect(pools, poolGroupIds);
      setPoolSelectionVisible(false);
    };

    return (
      <div className={style.container}>
        <div className={style.header}>
          <div className={style.headerTop}>
            <h2 className={style.title}>选择流量池</h2>
            <a
              className={style.manageLink}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // TODO: 导航到流量池管理页面
              }}
            >
              前往流量池管理
              <span className={style.linkIcon}>↗</span>
            </a>
          </div>
        </div>

        <div className={style.infoBox}>
          <span className={style.infoIcon}>ℹ</span>
          <p className={style.infoText}>
            选择流量池后，系统将自动筛选出该流量池中的用户，以确定自动建群所针对的目标群体。
          </p>
        </div>

        <div className={style.poolSelectorWrapper}>
          <div
            className={style.poolSelector}
            onClick={() => setPoolSelectionVisible(true)}
          >
            {selectedPools.length > 0 ? (
              <div className={style.selectedPoolsInfo}>
                <span className={style.selectedCountText}>
                  已选择 {selectedPools.length} 个流量池
                </span>
              </div>
            ) : (
              <div className={style.placeholder}>
                <span>请选择流量池</span>
              </div>
            )}
            <span className={style.expandIcon}>▼</span>
          </div>
        </div>

        {/* 已选流量池列表 */}
        {selectedPools.length > 0 && (
          <div className={style.selectedPoolsList}>
            {selectedPools.map((pool) => (
              <div key={pool.id} className={style.selectedPoolCard}>
                <div className={style.poolCardContent}>
                  <div className={style.poolCardHeader}>
                    <h3 className={style.poolCardName}>{pool.name}</h3>
                  </div>
                  {pool.description && (
                    <p className={style.poolCardDescription}>{pool.description}</p>
                  )}
                  <div className={style.poolCardStats}>
                    <div className={style.poolCardUsers}>
                      <span className={style.usersIcon}>👥</span>
                      <span className={style.usersCount}>{pool.num || 0} 人</span>
                    </div>
                    {pool.createTime && (
                      <>
                        <div className={style.poolCardDivider}></div>
                        <span className={style.poolCardTime}>
                          更新于 {pool.createTime}
                        </span>
                      </>
                    )}
                  </div>
                  {pool.tags && pool.tags.length > 0 && (
                    <div className={style.poolCardTags}>
                      {pool.tags.map((tag: any, index: number) => (
                        <span key={index} className={style.poolTag}>
                          {typeof tag === 'string' ? tag : tag.name || tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={style.poolCardDeleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newSelectedPools = selectedPools.filter(p => p.id !== pool.id);
                    const newPoolGroups = newSelectedPools.map(p => p.id);
                    onSelect(newSelectedPools, newPoolGroups);
                  }}
                >
                  <DeleteOutlined className={style.poolCardDeleteIcon} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 流量池选择弹窗 */}
        <PoolSelection
          selectedOptions={selectedPools}
          onSelect={handlePoolSelect}
          placeholder="选择流量池"
          showInput={false}
          showSelectedList={false}
          visible={poolSelectionVisible}
          onVisibleChange={setPoolSelectionVisible}
        />
      </div>
    );
  }
);

PoolSelectionStep.displayName = "PoolSelectionStep";

export default PoolSelectionStep;
