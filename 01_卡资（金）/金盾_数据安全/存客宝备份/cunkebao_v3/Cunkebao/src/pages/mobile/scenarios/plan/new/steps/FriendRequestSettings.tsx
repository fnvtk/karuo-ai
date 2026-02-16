"use client";

import React, { useState, useEffect } from "react";
import { Input, Button, Modal, Alert, Select } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import DeviceSelection from "@/components/DeviceSelection";
import styles from "./friend.module.scss";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

interface FriendRequestSettingsProps {
  formData: any;
  onChange: (data: any) => void;
}

// 招呼语模板
const greetingTemplates = [
  "你好，请通过",
  "你好,了解XX,请通过",
  "你好，我是XX产品的客服请通过",
  "你好，感谢关注我们的产品",
  "你好，很高兴为您服务",
];

// 备注类型选项
const remarkTypes = [
  { value: "phone", label: "手机号" },
  { value: "nickname", label: "昵称" },
  { value: "source", label: "来源" },
];

const FriendRequestSettings: React.FC<FriendRequestSettingsProps> = ({
  formData,
  onChange,
}) => {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [hasWarnings, setHasWarnings] = useState(false);

  const [showRemarkTip, setShowRemarkTip] = useState(false);

  // 获取场景标题
  const getScenarioTitle = () => {
    switch (formData.scenario) {
      case "douyin":
        return "抖音直播";
      case "xiaohongshu":
        return "小红书";
      case "weixinqun":
        return "微信群";
      case "gongzhonghao":
        return "公众号";
      default:
        return formData.name || "获客计划";
    }
  };

  // 使用useEffect设置默认值
  useEffect(() => {
    if (!formData.greeting) {
      onChange({
        ...formData,
        greeting: "你好，请通过",
        remarkType: "phone", // 默认选择手机号
        remarkFormat: `手机号+${getScenarioTitle()}`, // 默认备注格式
        addFriendInterval: 1,
      });
    }
  }, [formData, formData.greeting, onChange]);

  // 检查是否有未完成的必填项
  useEffect(() => {
    const hasIncompleteFields = !formData.greeting?.trim();
    setHasWarnings(hasIncompleteFields);
  }, [formData]);

  const handleTemplateSelect = (template: string) => {
    onChange({ ...formData, greeting: template });
    setIsTemplateDialogOpen(false);
  };
  const handleDevicesChange = (deviceGroupsOptions: DeviceSelectionItem[]) => {
    onChange({
      ...formData,
      deviceGroups: deviceGroupsOptions.map(d => d.id),
      deviceGroupsOptions: deviceGroupsOptions,
    });
  };

  return (
    <div className={styles["friend-container"]}>
      {/* 选择设备区块 */}
      <div className={styles["friend-label"]}>选择设备</div>
      <div className={styles["friend-block"]}>
        <DeviceSelection
          selectedOptions={formData.deviceGroupsOptions}
          onSelect={handleDevicesChange}
          placeholder="选择设备"
        />
      </div>

      {/* 好友备注区块 */}
      <div className={styles["friend-label"]}>好友备注</div>
      <div className={styles["friend-block"]}>
        <div className={styles["friend-remark-container"]}>
          <Select
            value={formData.remarkType || "phone"}
            onChange={value => onChange({ ...formData, remarkType: value })}
            style={{ width: "100%" }}
          >
            {remarkTypes.map(type => (
              <Select.Option key={type.value} value={type.value}>
                {type.label}
              </Select.Option>
            ))}
          </Select>
          <span
            className={styles["friend-remark-q"]}
            onMouseEnter={() => setShowRemarkTip(true)}
            onMouseLeave={() => setShowRemarkTip(false)}
          >
            ?
          </span>
          {showRemarkTip && (
            <div className={styles["friend-remark-tip"]}>
              <div>设置添加好友时的备注格式</div>
              <div style={{ marginTop: 8, color: "#888", fontSize: 12 }}>
                备注格式预览：
              </div>
              <div style={{ marginTop: 4, color: "#1677ff" }}>
                {formData.remarkType === "phone" &&
                  `138****1234+${getScenarioTitle()}`}
                {formData.remarkType === "nickname" &&
                  `小红书用户2851+${getScenarioTitle()}`}
                {formData.remarkType === "source" &&
                  `抖音直播+${getScenarioTitle()}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 招呼语区块 */}
      <div className={styles["friend-label"]}>招呼语</div>
      <div className={styles["friend-block"]}>
        <Input
          value={formData.greeting}
          onChange={e => onChange({ ...formData, greeting: e.target.value })}
          placeholder="请输入招呼语"
          suffix={
            <Button
              type="link"
              onClick={() => setIsTemplateDialogOpen(true)}
              style={{ padding: 0 }}
            >
              <MessageOutlined /> 参考模板
            </Button>
          }
        />
      </div>

      {/* 添加间隔区块 */}
      <div className={styles["friend-label"]}>添加间隔</div>
      <div
        className={styles["friend-interval-row"] + " " + styles["friend-block"]}
      >
        <Input
          type="number"
          value={formData.addFriendInterval || 1}
          onChange={e =>
            onChange({
              ...formData,
              addFriendInterval: Number(e.target.value),
            })
          }
          style={{ width: 100 }}
        />
        <span>分钟</span>
      </div>

      {/* 允许加人时间段区块 */}
      <div className={styles["friend-label"]}>允许加人的时间段</div>
      <div className={styles["friend-time-row"] + " " + styles["friend-block"]}>
        <Input
          type="time"
          value={formData.addFriendTimeStart || "09:00"}
          onChange={e =>
            onChange({ ...formData, addFriendTimeStart: e.target.value })
          }
          style={{ width: 120 }}
        />
        <span>至</span>
        <Input
          type="time"
          value={formData.addFriendTimeEnd || "18:00"}
          onChange={e =>
            onChange({ ...formData, addFriendTimeEnd: e.target.value })
          }
          style={{ width: 120 }}
        />
      </div>

      {hasWarnings && (
        <Alert
          message="警告"
          description="您有未完成的设置项，建议完善后再进入下一步。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 招呼语模板弹窗 */}
      <Modal
        open={isTemplateDialogOpen}
        onCancel={() => setIsTemplateDialogOpen(false)}
        footer={null}
      >
        <div>
          {greetingTemplates.map((template, index) => (
            <Button
              key={index}
              onClick={() => handleTemplateSelect(template)}
              className={styles["friend-modal-btn"]}
            >
              {template}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default FriendRequestSettings;
