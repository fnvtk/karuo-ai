import React, { useState } from "react";
import { Button, Tabs, Modal, message } from "antd";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import styles from "./messages.module.scss";
import {
  MessageContentItem,
  MessageContentGroup,
  MessageSettingsProps,
} from "./base.data";
import MessageCard from "./MessageCard";

const MessageSettings: React.FC<MessageSettingsProps> = ({
  formData,
  onChange,
}) => {
  const [isAddDayPlanOpen, setIsAddDayPlanOpen] = useState(false);

  // 获取当前的消息计划，如果没有则使用默认值
  const getCurrentMessagePlans = (): MessageContentGroup[] => {
    if (formData.messagePlans && formData.messagePlans.length > 0) {
      return formData.messagePlans;
    }
    return [
      {
        day: 0,
        messages: [
          {
            id: "1",
            type: "text",
            content: "",
            sendInterval: 5,
            intervalUnit: "seconds",
          },
        ],
      },
    ];
  };

  // 添加新消息
  const handleAddMessage = (dayIndex: number, type = "text") => {
    const currentPlans = getCurrentMessagePlans();
    const updatedPlans = [...currentPlans];
    const newMessage: MessageContentItem = {
      id: Date.now().toString(),
      type: type as MessageContentItem["type"],
      content: "",
    };

    if (currentPlans[dayIndex].day === 0) {
      newMessage.sendInterval = 5;
      newMessage.intervalUnit = "seconds";
    } else {
      newMessage.scheduledTime = {
        hour: 9,
        minute: 0,
        second: 0,
      };
    }

    updatedPlans[dayIndex].messages.push(newMessage);
    onChange({ ...formData, messagePlans: updatedPlans });
  };

  // 更新消息内容
  const handleUpdateMessage = (
    dayIndex: number,
    messageIndex: number,
    updates: Partial<MessageContentItem>,
  ) => {
    const currentPlans = getCurrentMessagePlans();
    const updatedPlans = [...currentPlans];
    updatedPlans[dayIndex].messages[messageIndex] = {
      ...updatedPlans[dayIndex].messages[messageIndex],
      ...updates,
    };
    onChange({ ...formData, messagePlans: updatedPlans });
  };

  // 删除消息
  const handleRemoveMessage = (dayIndex: number, messageIndex: number) => {
    const currentPlans = getCurrentMessagePlans();
    const updatedPlans = [...currentPlans];
    updatedPlans[dayIndex].messages.splice(messageIndex, 1);
    onChange({ ...formData, messagePlans: updatedPlans });
  };

  // 切换时间单位
  const toggleIntervalUnit = (dayIndex: number, messageIndex: number) => {
    const currentPlans = getCurrentMessagePlans();
    const message = currentPlans[dayIndex].messages[messageIndex];
    const newUnit = message.intervalUnit === "minutes" ? "seconds" : "minutes";
    handleUpdateMessage(dayIndex, messageIndex, { intervalUnit: newUnit });
  };

  // 添加新的天数计划
  const handleAddDayPlan = () => {
    const currentPlans = getCurrentMessagePlans();
    const newDay = currentPlans.length;
    const updatedPlans = [
      ...currentPlans,
      {
        day: newDay,
        messages: [
          {
            id: Date.now().toString(),
            type: "text",
            content: "",
            scheduledTime: {
              hour: 9,
              minute: 0,
              second: 0,
            },
          },
        ],
      },
    ];
    onChange({ ...formData, messagePlans: updatedPlans });
    setIsAddDayPlanOpen(false);
    message.success(`已添加第${newDay}天的消息计划`);
  };

  // 删除天数计划
  const handleRemoveDayPlan = (dayIndex: number) => {
    if (dayIndex === 0) {
      message.warning("不能删除即时消息");
      return;
    }

    const currentPlans = getCurrentMessagePlans();
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除第${currentPlans[dayIndex].day}天的消息计划吗？`,
      onOk: () => {
        const updatedPlans = currentPlans.filter(
          (_, index) => index !== dayIndex,
        );
        // 重新计算天数
        const recalculatedPlans = updatedPlans.map((plan, index) => ({
          ...plan,
          day: index,
        }));
        onChange({ ...formData, messagePlans: recalculatedPlans });
        message.success(`已删除第${currentPlans[dayIndex].day}天的消息计划`);
      },
    });
  };

  const items = getCurrentMessagePlans().map(
    (plan: MessageContentGroup, dayIndex: number) => ({
      key: plan.day.toString(),
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <span>{plan.day === 0 ? "即时消息" : `第${plan.day}天`}</span>
          {dayIndex > 0 && (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={e => {
                e.stopPropagation();
                handleRemoveDayPlan(dayIndex);
              }}
              style={{
                padding: "0 4px",
                minWidth: "auto",
                color: "#ff4d4f",
                fontSize: "12px",
              }}
              title="删除此天计划"
            />
          )}
        </div>
      ),
      children: (
        <div className={styles["messages-day-panel"]}>
          {plan.messages.map((message, messageIndex) => (
            <MessageCard
              key={message.id}
              message={message}
              dayIndex={dayIndex}
              messageIndex={messageIndex}
              planDay={plan.day}
              onUpdateMessage={handleUpdateMessage}
              onRemoveMessage={handleRemoveMessage}
              onToggleIntervalUnit={toggleIntervalUnit}
            />
          ))}
          <Button
            onClick={() => handleAddMessage(dayIndex)}
            className={styles["messages-add-message-btn"]}
          >
            <PlusOutlined className="w-4 h-4 mr-2" />
            添加消息
          </Button>
        </div>
      ),
    }),
  );

  return (
    <div className={styles["messages-container"]}>
      <div className={styles["messages-header"]}>
        <h2 className={styles["messages-title"]}>消息设置</h2>
        <Button onClick={() => setIsAddDayPlanOpen(true)}>
          <PlusOutlined />
        </Button>
      </div>
      <Tabs
        defaultActiveKey="0"
        items={items}
        className={styles["messages-tab"]}
      />

      {/* 添加天数计划弹窗 */}
      <Modal
        title="添加消息计划"
        open={isAddDayPlanOpen}
        onCancel={() => setIsAddDayPlanOpen(false)}
        onOk={() => {
          handleAddDayPlan();
          setIsAddDayPlanOpen(false);
        }}
      >
        <p className="text-sm text-gray-500 mb-4">选择要添加的消息计划类型</p>
        <Button
          onClick={handleAddDayPlan}
          className={styles["messages-modal-btn"]}
        >
          添加第 {getCurrentMessagePlans().length} 天计划
        </Button>
      </Modal>
    </div>
  );
};

export default MessageSettings;
