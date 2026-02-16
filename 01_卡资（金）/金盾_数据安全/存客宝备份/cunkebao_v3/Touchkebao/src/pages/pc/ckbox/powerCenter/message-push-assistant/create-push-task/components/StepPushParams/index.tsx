"use client";

import React from "react";
import { Select, Slider } from "antd";
import styles from "./index.module.scss";

interface StepPushParamsProps {
  selectedAccounts: any[];
  selectedContacts: any[];
  targetLabel: string;
  friendInterval: [number, number];
  onFriendIntervalChange: (value: [number, number]) => void;
  messageInterval: [number, number];
  onMessageIntervalChange: (value: [number, number]) => void;
  selectedTag: string;
  onSelectedTagChange: (value: string) => void;
  savedScriptGroups: any[];
}

const StepPushParams: React.FC<StepPushParamsProps> = ({
  selectedAccounts,
  selectedContacts,
  targetLabel,
  friendInterval,
  onFriendIntervalChange,
  messageInterval,
  onMessageIntervalChange,
  selectedTag,
  onSelectedTagChange,
  savedScriptGroups,
}) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.step4Content}>
        <div className={styles.settingsPanel}>
          <div className={styles.settingsTitle}>相关设置</div>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>好友间间隔</div>
            <div className={styles.settingControl}>
              <span>间隔时间(秒)</span>
              <Slider
                range
                min={1}
                max={60}
                value={friendInterval}
                onChange={value =>
                  onFriendIntervalChange(value as [number, number])
                }
                style={{ flex: 1, margin: "0 16px" }}
              />
              <span>
                {friendInterval[0]} - {friendInterval[1]}
              </span>
            </div>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>消息间间隔</div>
            <div className={styles.settingControl}>
              <span>间隔时间(秒)</span>
              <Slider
                range
                min={1}
                max={60}
                value={messageInterval}
                onChange={value =>
                  onMessageIntervalChange(value as [number, number])
                }
                style={{ flex: 1, margin: "0 16px" }}
              />
              <span>
                {messageInterval[0]} - {messageInterval[1]}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.tagSection}>
          <div className={styles.settingLabel}>完成打标签</div>
          <Select
            value={selectedTag}
            onChange={onSelectedTagChange}
            placeholder="选择标签"
            style={{ width: "100%" }}
          >
            <Select.Option value="potential">潜在客户</Select.Option>
            <Select.Option value="customer">客户</Select.Option>
            <Select.Option value="partner">合作伙伴</Select.Option>
          </Select>
        </div>

        <div className={styles.pushPreview}>
          <div className={styles.previewTitle}>推送预览</div>
          <ul>
            <li>推送账号: {selectedAccounts.length}个</li>
            <li>
              推送{targetLabel}: {selectedContacts.length}个
            </li>
            <li>话术组数: {savedScriptGroups.length}个</li>
            <li>随机推送: 否</li>
            <li>预计耗时: ~1分钟</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StepPushParams;
