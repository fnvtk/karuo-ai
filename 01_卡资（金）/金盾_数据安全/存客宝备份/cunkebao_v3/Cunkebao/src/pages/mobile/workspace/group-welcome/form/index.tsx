import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "antd";
import { Toast } from "antd-mobile";
import {
  createGroupWelcomeTask,
  fetchGroupWelcomeTaskDetail,
  updateGroupWelcomeTask,
} from "./index.api";
import Layout from "@/components/Layout/Layout";
import StepIndicator from "@/components/StepIndicator";
import BasicSettings, { BasicSettingsRef } from "./components/BasicSettings";
import GroupSelector, { GroupSelectorRef } from "./components/GroupSelector";
import RobotSelector, { RobotSelectorRef } from "./components/RobotSelector";
import MessageConfig, { MessageConfigRef } from "./components/MessageConfig";
import type { FormData, WelcomeMessage } from "./index.data";
import NavCommon from "@/components/NavCommon";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

const steps = [
  { id: 1, title: "步骤 1", subtitle: "基础设置" },
  { id: 2, title: "步骤 2", subtitle: "选择机器人" },
  { id: 3, title: "步骤 3", subtitle: "选择群组" },
  { id: 4, title: "步骤 4", subtitle: "配置消息" },
];

const NewGroupWelcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [groupsOptions, setGroupsOptions] = useState<GroupSelectionItem[]>([]);
  const [robotsOptions, setRobotsOptions] = useState<DeviceSelectionItem[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    status: 1,
    interval: 1, // 默认1分钟
    pushType: 0, // 默认定时推送
    startTime: "09:00",
    endTime: "21:00",
    groups: [],
    groupsOptions: [],
    robots: [],
    robotsOptions: [],
    messages: [
      {
        id: Date.now().toString(),
        type: "text",
        content: "",
        order: 1,
        sendInterval: 5,
        intervalUnit: "seconds",
      },
    ],
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // 创建子组件的ref
  const basicSettingsRef = useRef<BasicSettingsRef>(null);
  const groupSelectorRef = useRef<GroupSelectorRef>(null);
  const robotSelectorRef = useRef<RobotSelectorRef>(null);
  const messageConfigRef = useRef<MessageConfigRef>(null);

  useEffect(() => {
    if (!id) return;
    setIsEditMode(true);
    // 加载编辑数据
    const loadEditData = async () => {
      try {
        const res = await fetchGroupWelcomeTaskDetail(id);
        const data = res?.data || res;
        const config = data?.config || {};

        // 回填表单数据
        // 处理 groups：可能是字符串数组或字符串
        let groupsArray: any[] = [];
        if (config.wechatGroups && Array.isArray(config.wechatGroups)) {
          groupsArray = config.wechatGroups;
        } else if (config.groups) {
          if (Array.isArray(config.groups)) {
            groupsArray = config.groups;
          } else if (typeof config.groups === 'string') {
            try {
              groupsArray = JSON.parse(config.groups);
            } catch {
              groupsArray = [];
            }
          }
        }

        // 处理 robots：可能是字符串数组或字符串
        let robotsArray: any[] = [];
        if (config.deviceGroups && Array.isArray(config.deviceGroups)) {
          robotsArray = config.deviceGroups;
        } else if (config.robots || config.devices) {
          const robotsData = config.robots || config.devices;
          if (Array.isArray(robotsData)) {
            robotsArray = robotsData;
          } else if (typeof robotsData === 'string') {
            try {
              robotsArray = JSON.parse(robotsData);
            } catch {
              robotsArray = [];
            }
          }
        }

        setFormData(prev => ({
          ...prev,
          name: data.name || "",
          status: data.status ?? config.status ?? 1,
          interval: config.interval || 1, // 默认1分钟
          pushType: config.pushType ?? 0,
          startTime: config.startTime || "09:00",
          endTime: config.endTime || "21:00",
          groups: groupsArray.map((id: any) => String(id)),
          robots: robotsArray.map((id: any) => String(id)),
          messages: config.messages || [
            {
              id: Date.now().toString(),
              type: "text",
              content: "",
              order: 1,
              sendInterval: 5,
              intervalUnit: "seconds",
            },
          ],
        }));

        // 回填选项数据
        // 映射群组选项字段：groupAvatar -> avatar, groupName -> name
        if (config.wechatGroupsOptions) {
          const mappedGroups = config.wechatGroupsOptions.map((group: any) => ({
            ...group,
            avatar: group.groupAvatar || group.avatar,
            name: group.groupName || group.name,
            ownerNickname: group.nickName || group.ownerNickname,
          }));
          setGroupsOptions(mappedGroups);
        }
        if (config.deviceGroupsOptions) {
          setRobotsOptions(config.deviceGroupsOptions);
        }
      } catch (error) {
        console.error("加载编辑数据失败:", error);
        Toast.show({ content: "加载数据失败", position: "top" });
      }
    };
    loadEditData();
  }, [id]);

  const handleBasicSettingsChange = (values: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...values }));
  };

  // 群组选择
  const handleGroupsChange = (data: {
    groups: string[];
    groupsOptions: GroupSelectionItem[];
  }) => {
    setFormData(prev => ({
      ...prev,
      groups: data.groups,
      groupsOptions: data.groupsOptions,
    }));
    setGroupsOptions(data.groupsOptions);
  };

  // 机器人选择
  const handleRobotsChange = (data: {
    robots: string[];
    robotsOptions: DeviceSelectionItem[];
  }) => {
    setFormData(prev => ({
      ...prev,
      robots: data.robots,
      robotsOptions: data.robotsOptions,
    }));
    setRobotsOptions(data.robotsOptions);
  };

  // 消息配置
  const handleMessagesChange = (data: { messages: WelcomeMessage[] }) => {
    setFormData(prev => ({
      ...prev,
      messages: data.messages,
    }));
  };

  const handleSave = async () => {
    try {
      // 调用 MessageConfig 的表单校验
      const isValid = (await messageConfigRef.current?.validate()) || false;
      if (!isValid) return;

      setLoading(true);

      // 获取基础设置中的值
      const basicSettingsValues = basicSettingsRef.current?.getValues() || {};
      const messageConfigValues = messageConfigRef.current?.getValues() || {};

      // 构建 API 请求数据
      const apiData: any = {
        name: basicSettingsValues.name || formData.name,
        type: 7, // 入群欢迎语工作台类型固定为7
        status: basicSettingsValues.status ?? formData.status,
        interval: basicSettingsValues.interval || formData.interval,
        pushType: basicSettingsValues.pushType ?? formData.pushType ?? 0,
        startTime: basicSettingsValues.startTime || formData.startTime || "09:00",
        endTime: basicSettingsValues.endTime || formData.endTime || "21:00",
        wechatGroups: formData.groups.map(id => Number(id)), // 使用 wechatGroups
        deviceGroups: formData.robots.map(id => Number(id)), // 使用 deviceGroups
        messages: messageConfigValues.messages || formData.messages,
      };

      // 更新时需要传递id
      if (id) {
        apiData.id = Number(id);
      }

      // 调用创建或更新 API
      if (id) {
        await updateGroupWelcomeTask(apiData);
        Toast.show({ content: "更新成功", position: "top" });
        navigate("/workspace/group-welcome");
      } else {
        await createGroupWelcomeTask(apiData);
        Toast.show({ content: "创建成功", position: "top" });
        navigate("/workspace/group-welcome");
      }
    } catch (error) {
      Toast.show({ content: "保存失败，请稍后重试", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep < 4) {
      try {
        let isValid = false;

        switch (currentStep) {
          case 1:
            // 调用 BasicSettings 的表单校验
            isValid = (await basicSettingsRef.current?.validate()) || false;
            if (isValid) {
              const values = basicSettingsRef.current?.getValues();
              if (values) {
                handleBasicSettingsChange(values);
              }
              setCurrentStep(2);
            }
            break;

          case 2:
            // 调用 RobotSelector 的表单校验
            isValid = (await robotSelectorRef.current?.validate()) || false;
            if (isValid) {
              setCurrentStep(3);
            }
            break;

          case 3:
            // 调用 GroupSelector 的表单校验
            isValid = (await groupSelectorRef.current?.validate()) || false;
            if (isValid) {
              setCurrentStep(4);
            }
            break;

          default:
            setCurrentStep(currentStep + 1);
        }
      } catch (error) {
        console.log("表单验证失败:", error);
      }
    }
  };

  const renderFooter = () => {
    return (
      <div className="footer-btn-group">
        {currentStep > 1 && (
          <Button size="large" onClick={handlePrevious}>
            上一步
          </Button>
        )}
        {currentStep === 4 ? (
          <Button size="large" type="primary" onClick={handleSave} loading={loading}>
            保存
          </Button>
        ) : (
          <Button size="large" type="primary" onClick={handleNext}>
            下一步
          </Button>
        )}
      </div>
    );
  };

  return (
    <Layout
      header={<NavCommon title={isEditMode ? "编辑任务" : "新建任务"} />}
      footer={renderFooter()}
    >
      <div style={{ padding: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <StepIndicator currentStep={currentStep} steps={steps} />
        </div>
        <div>
          {currentStep === 1 && (
            <BasicSettings
              ref={basicSettingsRef}
              defaultValues={{
                name: formData.name,
                status: formData.status,
                interval: formData.interval,
                pushType: formData.pushType,
                startTime: formData.startTime,
                endTime: formData.endTime,
              }}
              onNext={handleBasicSettingsChange}
              loading={loading}
            />
          )}
          {currentStep === 2 && (
            <RobotSelector
              ref={robotSelectorRef}
              selectedRobots={robotsOptions}
              onPrevious={() => setCurrentStep(1)}
              onNext={handleRobotsChange}
            />
          )}
          {currentStep === 3 && (
            <GroupSelector
              ref={groupSelectorRef}
              selectedGroups={groupsOptions}
              onPrevious={() => setCurrentStep(2)}
              onNext={handleGroupsChange}
            />
          )}
          {currentStep === 4 && (
            <MessageConfig
              ref={messageConfigRef}
              defaultMessages={formData.messages}
              onPrevious={() => setCurrentStep(3)}
              onNext={handleMessagesChange}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NewGroupWelcome;
