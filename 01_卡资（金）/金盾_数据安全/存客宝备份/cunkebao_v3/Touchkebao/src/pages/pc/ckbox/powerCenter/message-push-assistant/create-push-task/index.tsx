import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, message } from "antd";
import { SendOutlined } from "@ant-design/icons";
import PowerNavigation from "@/components/PowerNavtion";
import Layout from "@/components/Layout/LayoutFiexd";
import styles from "./index.module.scss";
import {
  useCustomerStore,
  updateCustomerList,
} from "@/store/module/weChat/customer";
import { getCustomerList } from "@/pages/pc/ckbox/weChat/api";

import StepSelectAccount from "./components/StepSelectAccount";
import StepSelectContacts from "./components/StepSelectContacts";
import StepSendMessage from "./components/StepSendMessage";
import StepPushParams from "./components/StepPushParams";
import {
  ContactItem,
  PushType,
  ScriptGroup,
  CreatePushTaskPayload,
} from "./types";
import StepIndicator from "@/components/StepIndicator";
import type { ContentItem } from "@/components/ContentSelection/data";
import type { PoolSelectionItem } from "@/components/PoolSelection/data";
import { queryWorkbenchCreate } from "./api";

const DEFAULT_FRIEND_INTERVAL: [number, number] = [3, 10];
const DEFAULT_MESSAGE_INTERVAL: [number, number] = [1, 3];

const DEFAULT_TIME_RANGE: Record<
  PushType,
  { startTime: string; endTime: string }
> = {
  "friend-message": { startTime: "10:00", endTime: "22:00" },
  "group-message": { startTime: "09:00", endTime: "20:00" },
  "group-announcement": { startTime: "08:30", endTime: "18:30" },
};

const DEFAULT_PUSH_ORDER: Record<PushType, 1 | 2> = {
  "friend-message": 1,
  "group-message": 1,
  "group-announcement": 2,
};

const DEFAULT_MAX_PER_DAY: Record<PushType, number> = {
  "friend-message": 150,
  "group-message": 200,
  "group-announcement": 80,
};

const DEFAULT_AUTO_START: Record<PushType, 0 | 1> = {
  "friend-message": 1,
  "group-message": 1,
  "group-announcement": 0,
};

const DEFAULT_PUSH_TYPE: Record<PushType, 0 | 1> = {
  "friend-message": 0,
  "group-message": 0,
  "group-announcement": 1,
};

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const CreatePushTask: React.FC = () => {
  const navigate = useNavigate();
  const { pushType } = useParams<{ pushType: PushType }>();

  const validPushType: PushType =
    pushType === "friend-message" ||
    pushType === "group-message" ||
    pushType === "group-announcement"
      ? pushType
      : "friend-message";

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAccounts, setSelectedAccounts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<ContactItem[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [currentScriptMessages, setCurrentScriptMessages] = useState<string[]>(
    [],
  );
  const [currentScriptName, setCurrentScriptName] = useState("");
  const [savedScriptGroups, setSavedScriptGroups] = useState<ScriptGroup[]>([]);
  const [selectedScriptGroupIds, setSelectedScriptGroupIds] = useState<
    string[]
  >([]);
  const [selectedContentLibraries, setSelectedContentLibraries] = useState<
    ContentItem[]
  >([]);
  const [friendInterval, setFriendInterval] = useState<[number, number]>([
    ...DEFAULT_FRIEND_INTERVAL,
  ]);
  const [messageInterval, setMessageInterval] = useState<[number, number]>([
    ...DEFAULT_MESSAGE_INTERVAL,
  ]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [aiRewriteEnabled, setAiRewriteEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedTrafficPools, setSelectedTrafficPools] = useState<
    PoolSelectionItem[]
  >([]);

  const customerList = useCustomerStore(state => state.customerList);

  useEffect(() => {
    if (customerList.length === 0) {
      getCustomerList()
        .then(res => {
          updateCustomerList(res);
        })
        .catch(error => {
          console.error("获取客服列表失败:", error);
          message.error("获取客服列表失败");
        });
    }
  }, [customerList.length]);

  const title = useMemo(() => {
    switch (validPushType) {
      case "friend-message":
        return "好友消息推送";
      case "group-message":
        return "群消息推送";
      case "group-announcement":
        return "群公告推送";
      default:
        return "消息推送";
    }
  }, [validPushType]);

  const subtitle = "智能批量推送，AI智能话术改写";

  const step2Title = useMemo(() => {
    switch (validPushType) {
      case "friend-message":
        return "好友";
      case "group-message":
      case "group-announcement":
        return "群";
      default:
        return "对象";
    }
  }, [validPushType]);

  const handleClose = () => {
    navigate("/pc/powerCenter/message-push-assistant");
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedAccounts.length === 0) {
        message.warning("请至少选择一个微信账号");
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (selectedContacts.length === 0) {
        message.warning(
          `请至少选择一个${validPushType === "friend-message" ? "好友" : "群"}`,
        );
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      // 验证推送内容
      if (
        currentScriptMessages.length === 0 &&
        selectedScriptGroupIds.length === 0 &&
        selectedContentLibraries.length === 0
      ) {
        message.warning("请至少添加一条消息、选择一个话术组或内容库");
        return;
      }
      setCurrentStep(4);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClearAccounts = () => {
    if (selectedAccounts.length === 0) {
      message.info("暂无已选微信账号");
      return;
    }
    setSelectedAccounts([]);
  };

  const handleSend = async () => {
    if (creatingTask) {
      return;
    }

    // ========== 1. 数据验证和准备 ==========
    const selectedGroups = savedScriptGroups.filter(group =>
      selectedScriptGroupIds.includes(group.id),
    );

    if (
      currentScriptMessages.length === 0 &&
      selectedGroups.length === 0 &&
      selectedContentLibraries.length === 0
    ) {
      message.warning("请添加话术内容、选择话术组或内容库");
      return;
    }

    // 手动消息处理
    const manualMessages = currentScriptMessages
      .map(item => item.trim())
      .filter(Boolean);

    if (validPushType === "group-announcement" && manualMessages.length === 0) {
      message.warning("请先填写公告内容");
      return;
    }

    // ID 转换工具函数
    const toNumberId = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) && !Number.isNaN(numeric)
        ? numeric
        : null;
    };

    // ========== 2. 内容库ID处理 ==========
    const contentGroupIds = Array.from(
      new Set(
        [
          ...selectedContentLibraries
            .map(item => toNumberId(item?.id))
            .filter((id): id is number => id !== null),
          ...selectedScriptGroupIds
            .map(id => toNumberId(id))
            .filter((id): id is number => id !== null),
        ].filter((id): id is number => id !== null),
      ),
    );

    if (
      manualMessages.length === 0 &&
      selectedGroups.length === 0 &&
      contentGroupIds.length === 0
    ) {
      message.warning("缺少有效的话术内容，请重新检查");
      return;
    }

    // ========== 3. 账号ID处理 ==========
    const ownerWechatIds = Array.from(
      new Set(
        selectedAccounts
          .map(account => toNumberId(account?.id))
          .filter((id): id is number => id !== null),
      ),
    );

    if (ownerWechatIds.length === 0) {
      message.error("缺少有效的推送账号信息");
      return;
    }

    // ========== 4. 联系人ID处理 ==========
    const selectedContactIds = Array.from(
      new Set(
        selectedContacts.map(contact => contact?.id).filter(isValidNumber),
      ),
    );

    if (selectedContactIds.length === 0) {
      message.error("缺少有效的推送对象");
      return;
    }

    // ========== 5. 设备分组ID处理（好友推送必填） ==========
    const deviceGroupIds = Array.from(
      new Set(
        selectedAccounts
          .map(account => toNumberId(account?.currentDeviceId))
          .filter((id): id is number => id !== null),
      ),
    );

    if (validPushType === "friend-message" && deviceGroupIds.length === 0) {
      message.error("缺少有效的推送设备分组");
      return;
    }

    // ========== 6. 流量池ID处理 ==========
    const trafficPoolIds = selectedTrafficPools
      .map(pool => {
        const id = pool.id;
        if (id === undefined || id === null) return null;
        const strId = String(id).trim();
        return strId !== "" ? strId : null;
      })
      .filter((id): id is string => id !== null);

    // ========== 7. 时间范围 ==========
    const { startTime, endTime } = DEFAULT_TIME_RANGE[validPushType];

    // ========== 8. 每日最大推送数 ==========
    const maxPerDay =
      selectedContacts.length > 0
        ? selectedContacts.length
        : DEFAULT_MAX_PER_DAY[validPushType];

    // ========== 9. 推送顺序 ==========
    const pushOrder = DEFAULT_PUSH_ORDER[validPushType];

    // ========== 10. 推送后标签处理 ==========
    const postPushTags =
      selectedTag.trim().length > 0
        ? (() => {
            const tagId = toNumberId(selectedTag);
            return tagId !== null ? [tagId] : [];
          })()
        : [];

    // ========== 11. 任务名称 ==========
    const taskName =
      currentScriptName.trim() ||
      selectedGroups[0]?.name ||
      (manualMessages[0] ? manualMessages[0].slice(0, 20) : "") ||
      `推送任务-${Date.now()}`;

    // ========== 12. 构建基础载荷 ==========
    const basePayload: CreatePushTaskPayload = {
      name: String(taskName).trim(),
      type: 3, // 固定值：工作台类型
      autoStart: DEFAULT_AUTO_START[validPushType] ? 1 : 0,
      status: 1, // 固定值：启用
      pushType: DEFAULT_PUSH_TYPE[validPushType] ? 1 : 0,
      targetType: validPushType === "friend-message" ? 2 : 1,
      groupPushSubType: validPushType === "group-announcement" ? 2 : 1,
      startTime: String(startTime),
      endTime: String(endTime),
      maxPerDay: Number(maxPerDay),
      pushOrder: Number(pushOrder),
      friendIntervalMin: Number(friendInterval[0]),
      friendIntervalMax: Number(friendInterval[1]),
      messageIntervalMin: Number(messageInterval[0]),
      messageIntervalMax: Number(messageInterval[1]),
      isRandomTemplate: selectedScriptGroupIds.length > 1 ? 1 : 0,
      contentGroups: contentGroupIds.length > 0 ? contentGroupIds : [],
      postPushTags: postPushTags,
      ownerWechatIds: ownerWechatIds,
    };

    // ========== 13. 根据推送类型添加特定字段 ==========
    if (validPushType === "friend-message") {
      // 好友推送特有字段
      // 注意：wechatFriends 必须是字符串数组，不是数字数组
      basePayload.wechatFriends = Array.from(
        new Set(
          selectedContacts
            .map(contact => {
              const id = toNumberId(contact?.id);
              return id !== null ? String(id) : null;
            })
            .filter((id): id is string => id !== null),
        ),
      );
      basePayload.deviceGroups = deviceGroupIds; // 必填，数字数组
      basePayload.isLoop = 0; // 固定值
      basePayload.targetType = 2; // 确保是好友类型
      basePayload.groupPushSubType = 1; // 固定为群群发
    } else {
      // 群推送特有字段
      const groupIds = Array.from(
        new Set(
          selectedContacts
            .map(contact => {
              // 优先使用 groupId，如果没有则使用 id
              const id = contact.groupId ?? contact.id;
              return toNumberId(id);
            })
            .filter((id): id is number => id !== null),
        ),
      );

      basePayload.wechatGroups = groupIds; // 数字数组
      basePayload.targetType = 1; // 群类型
      basePayload.groupPushSubType =
        validPushType === "group-announcement" ? 2 : 1;

      // 群公告特有字段
      if (validPushType === "group-announcement") {
        basePayload.announcementContent = manualMessages.join("\n");
      }
    }

    // ========== 14. 可选字段处理 ==========
    // 流量池（如果存在）
    if (trafficPoolIds.length > 0) {
      basePayload.trafficPools = trafficPoolIds; // 字符串数组
    }

    // 手动消息（如果存在）
    if (manualMessages.length > 0) {
      basePayload.manualMessages = manualMessages;
      if (currentScriptName.trim()) {
        basePayload.manualScriptName = String(currentScriptName.trim());
      }
    }

    // 选中的话术组ID（如果存在）
    if (selectedScriptGroupIds.length > 0) {
      basePayload.selectedScriptGroupIds = selectedScriptGroupIds.map(id =>
        String(id),
      );
    }

    // AI改写相关（如果启用）
    if (aiRewriteEnabled) {
      basePayload.enableAiRewrite = 1;
      if (aiPrompt.trim()) {
        basePayload.aiRewritePrompt = String(aiPrompt.trim());
      }
    } else {
      basePayload.enableAiRewrite = 0;
    }

    // 话术组对象（如果存在）
    if (selectedGroups.length > 0) {
      basePayload.scriptGroups = selectedGroups.map(group => ({
        id: String(group.id),
        name: String(group.name || ""),
        messages: Array.isArray(group.messages)
          ? group.messages.map(msg => String(msg))
          : [],
      }));
    }

    // ========== 15. 数据验证和提交 ==========
    // 最终验证：确保必填字段存在
    if (validPushType === "friend-message") {
      if (
        !Array.isArray(basePayload.deviceGroups) ||
        basePayload.deviceGroups.length === 0
      ) {
        message.error("好友推送必须选择设备分组");
        return;
      }
      if (
        !Array.isArray(basePayload.wechatFriends) ||
        basePayload.wechatFriends.length === 0
      ) {
        message.error("好友推送必须选择好友");
        return;
      }
    } else {
      if (
        !Array.isArray(basePayload.wechatGroups) ||
        basePayload.wechatGroups.length === 0
      ) {
        message.error("群推送必须选择群");
        return;
      }
    }

    // 提交前打印日志（开发环境）
    if (process.env.NODE_ENV === "development") {
      console.log("提交数据:", JSON.stringify(basePayload, null, 2));
    }

    // ========== 16. 提交请求 ==========
    let hideLoading: ReturnType<typeof message.loading> | undefined;
    try {
      setCreatingTask(true);
      hideLoading = message.loading("正在创建推送任务...", 0);
      await queryWorkbenchCreate(basePayload);
      hideLoading?.();
      message.success("推送任务已创建");
      navigate("/pc/powerCenter/message-push-assistant");
    } catch (error) {
      hideLoading?.();
      console.error("创建推送任务失败:", error);
      const errorMessage =
        (error as any)?.message ||
        (error as any)?.response?.data?.message ||
        "创建推送任务失败，请稍后重试";
      message.error(errorMessage);
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <Layout
      header={
        <>
          <div style={{ padding: "0 20px" }}>
            <PowerNavigation
              title={title}
              subtitle={subtitle}
              showBackButton={true}
              backButtonText="返回"
              onBackClick={handleClose}
            />
          </div>
          <div style={{ margin: "0 20px" }}>
            <StepIndicator
              currentStep={currentStep}
              steps={[
                {
                  id: 1,
                  title: "选择微信",
                  subtitle: "选择微信",
                },
                {
                  id: 2,
                  title: `选择${step2Title}`,
                  subtitle: `选择${step2Title}`,
                },
                {
                  id: 3,
                  title: "推送内容",
                  subtitle: "推送内容",
                },
                {
                  id: 4,
                  title: "推送参数",
                  subtitle: "推送参数",
                },
              ]}
            />
          </div>
        </>
      }
      footer={
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {currentStep === 1 && (
              <span>已选择{selectedAccounts.length}个微信账号</span>
            )}
            {currentStep === 2 && (
              <span>
                已选择{selectedContacts.length}个{step2Title}
              </span>
            )}
            {currentStep === 3 && (
              <span>
                推送账号: {selectedAccounts.length}个, 推送{step2Title}:{" "}
                {selectedContacts.length}个
              </span>
            )}
            {currentStep === 4 && (
              <span>
                推送账号: {selectedAccounts.length}个, 推送{step2Title}:{" "}
                {selectedContacts.length}个
              </span>
            )}
          </div>
          <div className={styles.footerRight}>
            {currentStep === 1 && (
              <>
                <Button
                  onClick={handleClearAccounts}
                  disabled={selectedAccounts.length === 0}
                >
                  清空选择
                </Button>
                <Button type="primary" onClick={handleNext}>
                  下一步 &gt;
                </Button>
              </>
            )}
            {currentStep === 2 && (
              <>
                <Button onClick={handlePrev}>上一步</Button>
                <Button type="primary" onClick={handleNext}>
                  下一步 &gt;
                </Button>
              </>
            )}
            {currentStep === 3 && (
              <>
                <Button onClick={handlePrev}>上一步</Button>
                <Button type="primary" onClick={handleNext}>
                  下一步 &gt;
                </Button>
              </>
            )}
            {currentStep === 4 && (
              <>
                <Button onClick={handlePrev}>上一步</Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={creatingTask}
                  disabled={creatingTask}
                >
                  一键发送
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className={styles.container}>
        <div className={styles.stepBody}>
          {currentStep === 1 && (
            <StepSelectAccount
              customerList={customerList}
              selectedAccounts={selectedAccounts}
              onChange={setSelectedAccounts}
            />
          )}
          {currentStep === 2 && (
            <StepSelectContacts
              pushType={validPushType}
              selectedAccounts={selectedAccounts}
              selectedContacts={selectedContacts}
              onChange={setSelectedContacts}
              selectedTrafficPools={selectedTrafficPools}
              onTrafficPoolsChange={setSelectedTrafficPools}
            />
          )}
          {currentStep === 3 && (
            <StepSendMessage
              selectedAccounts={selectedAccounts}
              selectedContacts={selectedContacts}
              targetLabel={step2Title}
              messageContent={messageDraft}
              onMessageContentChange={setMessageDraft}
              currentScriptMessages={currentScriptMessages}
              onCurrentScriptMessagesChange={setCurrentScriptMessages}
              currentScriptName={currentScriptName}
              onCurrentScriptNameChange={setCurrentScriptName}
              savedScriptGroups={savedScriptGroups}
              onSavedScriptGroupsChange={setSavedScriptGroups}
              selectedScriptGroupIds={selectedScriptGroupIds}
              onSelectedScriptGroupIdsChange={setSelectedScriptGroupIds}
              selectedContentLibraries={selectedContentLibraries}
              onSelectedContentLibrariesChange={setSelectedContentLibraries}
              aiRewriteEnabled={aiRewriteEnabled}
              onAiRewriteToggle={setAiRewriteEnabled}
              aiPrompt={aiPrompt}
              onAiPromptChange={setAiPrompt}
            />
          )}
          {currentStep === 4 && (
            <StepPushParams
              selectedAccounts={selectedAccounts}
              selectedContacts={selectedContacts}
              targetLabel={step2Title}
              friendInterval={friendInterval}
              onFriendIntervalChange={setFriendInterval}
              messageInterval={messageInterval}
              onMessageIntervalChange={setMessageInterval}
              selectedTag={selectedTag}
              onSelectedTagChange={setSelectedTag}
              savedScriptGroups={savedScriptGroups}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CreatePushTask;
