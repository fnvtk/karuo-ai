import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "antd";
import { Toast } from "antd-mobile";
import { createGroupPushTask, fetchGroupPushTaskDetail } from "./index.api";
import Layout from "@/components/Layout/Layout";
import StepIndicator from "@/components/StepIndicator";
import BasicSettings, { BasicSettingsRef } from "./components/BasicSettings";
import DeviceSelector, { DeviceSelectorRef } from "./components/DeviceSelector";
import GroupSelector, { GroupSelectorRef } from "./components/GroupSelector";
import ContentSelector, {
  ContentSelectorRef,
} from "./components/ContentSelector";
import type { FormData } from "./index.data";
import NavCommon from "@/components/NavCommon";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { ContentItem } from "@/components/ContentSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import styles from "./index.module.scss";

// 根据targetType和groupPushSubType动态生成步骤
const getSteps = (targetType: number, groupPushSubType?: number) => {
  const baseSteps = [
    { id: 1, title: "步骤 1", subtitle: "基础设置" },
    { id: 2, title: "步骤 2", subtitle: "选择设备" },
  ];

  if (targetType === 2) {
    // 好友推送：选择好友
    return [
      ...baseSteps,
      { id: 3, title: "步骤 3", subtitle: "选择好友" },
      { id: 4, title: "步骤 4", subtitle: "选择内容库" },
    ];
  } else {
    // 群推送：选择社群
    const steps = [
      ...baseSteps,
      { id: 3, title: "步骤 3", subtitle: "选择社群" },
    ];
    // 群公告时不显示内容库步骤
    if (groupPushSubType !== 2) {
      steps.push({ id: 4, title: "步骤 4", subtitle: "选择内容库" });
    }
    return steps;
  }
};

const NewGroupPush: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // 从 URL 参数获取推送类型
  const urlParams = new URLSearchParams(window.location.search);
  const urlTargetType = urlParams.get("targetType");
  const urlGroupPushSubType = urlParams.get("groupPushSubType");
  const [deviceGroupsOptions, setDeviceGroupsOptions] = useState<
    DeviceSelectionItem[]
  >([]);
  const [wechatGroupsOptions, setWechatGroupsOptions] = useState<
    GroupSelectionItem[]
  >([]);
  const [contentGroupsOptions, setContentGroupsOptions] = useState<
    ContentItem[]
  >([]);

  const [formData, setFormData] = useState<FormData>({
    planType: 1, // 默认独立计划
    name: "",
    startTime: "09:00", // 允许推送的开始时间
    dailyPushCount: 0, // 每日已推送次数
    endTime: "21:00", // 允许推送的结束时间
    maxPerDay: 20,
    pushOrder: 1, // 1: 按最早
    isLoop: 0, // 0: 否, 1: 是
    pushType: 0, // 0: 定时推送, 1: 立即推送
    status: 0, // 0: 否, 1: 是（同时作为是否自动启动）
    isRandomTemplate: 0, // 是否随机模板：0=否，1=是
    postPushTags: [], // 推送后标签数组
    wechatGroups: [],
    contentGroups: [],
    targetType: urlTargetType ? Number(urlTargetType) : 1, // 从URL参数获取，默认1=群推送
    groupPushSubType: urlGroupPushSubType ? Number(urlGroupPushSubType) : 1, // 从URL参数获取，默认1=群群发
    wechatFriends: [],
    wechatFriendsOptions: [],
    poolGroups: [],
    poolGroupsOptions: [],
    deviceGroups: [],
    // 好友推送间隔设置
    friendIntervalMin: 10, // 目标间最小间隔（秒）
    friendIntervalMax: 20, // 目标间最大间隔（秒）
    messageIntervalMin: 1, // 消息间最小间隔（秒）
    messageIntervalMax: 12, // 消息间最大间隔（秒）
    // 群公告相关
    announcementContent: "",
    enableAiRewrite: 0,
    aiRewritePrompt: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // 创建子组件的ref
  const basicSettingsRef = useRef<BasicSettingsRef>(null);
  const deviceSelectorRef = useRef<DeviceSelectorRef>(null);
  const groupSelectorRef = useRef<GroupSelectorRef>(null);
  const contentSelectorRef = useRef<ContentSelectorRef>(null);

  useEffect(() => {
    if (!id) return;
    setIsEditMode(true);
    // 加载编辑数据
    const loadEditData = async () => {
      try {
        const res = await fetchGroupPushTaskDetail(id);
        const data = res?.data || res;
        const config = data?.config || {};

        // 回填表单数据（支持接口字段名和数据库字段名的映射）
        // 数据库字段：groups, friends, trafficPools, contentLibraries, ownerWechatIds, devices
        // 接口字段：wechatGroups, wechatFriends, trafficPools, contentGroups, ownerWechatIds
        const groups = config.groups || config.wechatGroups || [];
        const friends = config.friends || config.wechatFriends || [];
        const trafficPools = config.trafficPools || config.poolGroups || [];
        const contentLibraries = config.contentLibraries || config.contentGroups || [];
        const ownerWechatIds = config.ownerWechatIds || config.deviceGroups || [];
        const devices = config.devices || [];

        setFormData(prev => ({
          ...prev,
          planType: config.planType ?? data.planType ?? 1,
          name: data.name || "",
          status: data.status ?? config.status ?? config.autoStart ?? 0, // status 和 autoStart 合并为 status
          targetType: config.targetType ?? 1,
          groupPushSubType: config.groupPushSubType ?? 1,
          pushType: config.pushType ?? 0, // 0=定时推送，1=立即推送
          startTime: config.startTime || "09:00",
          endTime: config.endTime || "21:00",
          maxPerDay: config.maxPerDay || 20,
          pushOrder: config.pushOrder || 1,
          isLoop: config.isLoop ?? 0,
          isRandomTemplate: config.isRandomTemplate ?? 0,
          postPushTags: config.postPushTags || [],
          // 支持数据库字段名和接口字段名的映射
          deviceGroups: [...ownerWechatIds, ...devices].map((id: any) => String(id)),
          wechatGroups: groups.map((id: any) => String(id)),
          wechatFriends: friends.map((id: any) => String(id)),
          poolGroups: trafficPools.map((id: any) => String(id)),
          contentGroups: contentLibraries.map((id: any) => String(id)),
          friendIntervalMin: config.friendIntervalMin || 10,
          friendIntervalMax: config.friendIntervalMax || 20,
          messageIntervalMin: config.messageIntervalMin || 1,
          messageIntervalMax: config.messageIntervalMax || 12,
          announcementContent: config.announcementContent || "",
          enableAiRewrite: config.enableAiRewrite ?? 0,
          aiRewritePrompt: config.aiRewritePrompt || "",
          socialMediaId: config.socialMediaId || "",
          promotionSiteId: config.promotionSiteId || "",
        }));

        // 回填选项数据（支持多种字段名）
        // 设备选项：支持 deviceGroupsOptions, devicesOptions, ownerWechatOptions
        if (config.deviceGroupsOptions || config.devicesOptions || config.ownerWechatOptions) {
          setDeviceGroupsOptions(
            config.deviceGroupsOptions ||
            config.devicesOptions ||
            config.ownerWechatOptions ||
            []
          );
        }
        // 群组选项：支持 wechatGroupsOptions, groupsOptions
        if (config.wechatGroupsOptions || config.groupsOptions) {
          setWechatGroupsOptions(config.wechatGroupsOptions || config.groupsOptions || []);
        }
        // 内容库选项：支持 contentGroupsOptions, contentLibrariesOptions
        if (config.contentGroupsOptions || config.contentLibrariesOptions) {
          setContentGroupsOptions(config.contentGroupsOptions || config.contentLibrariesOptions || []);
        }
        // 好友选项：支持 wechatFriendsOptions, friendsOptions
        if (config.wechatFriendsOptions || config.friendsOptions) {
          setFormData(prev => ({
            ...prev,
            wechatFriendsOptions: config.wechatFriendsOptions || config.friendsOptions || []
          }));
        }
        // 流量池选项：支持 poolGroupsOptions, trafficPoolsOptions
        if (config.poolGroupsOptions || config.trafficPoolsOptions) {
          setFormData(prev => ({
            ...prev,
            poolGroupsOptions: config.poolGroupsOptions || config.trafficPoolsOptions || []
          }));
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

  //设备选择
  const handleDevicesChange = (data: {
    deviceGroups: string[];
    deviceGroupsOptions: DeviceSelectionItem[];
  }) => {
    setFormData(prev => ({
      ...prev,
      deviceGroups: data.deviceGroups,
    }));
    setDeviceGroupsOptions(data.deviceGroupsOptions);
  };

  //群组选择（当targetType=1时）或好友/流量池选择（当targetType=2时）
  const handleGroupsChange = (data: {
    wechatGroups?: string[];
    wechatGroupsOptions?: GroupSelectionItem[];
    wechatFriends?: string[];
    wechatFriendsOptions?: any[];
    poolGroups?: string[];
    poolGroupsOptions?: any[];
  }) => {
    setFormData(prev => ({
      ...prev,
      wechatGroups: data.wechatGroups || [],
      wechatFriends: data.wechatFriends || [],
      poolGroups: data.poolGroups || [],
      wechatFriendsOptions: data.wechatFriendsOptions || [],
      poolGroupsOptions: data.poolGroupsOptions || [],
    }));
    if (data.wechatGroupsOptions) {
      setWechatGroupsOptions(data.wechatGroupsOptions);
    }
  };
  //内容库选择
  const handleLibrariesChange = (data: {
    contentGroups: string[];
    contentGroupsOptions: ContentItem[];
  }) => {
    setFormData(prev => ({ ...prev, contentGroups: data.contentGroups }));
    setContentGroupsOptions(data.contentGroupsOptions);
  };

  const handleSave = async () => {
    try {
      // 群公告时不验证内容库选择器（因为步骤被隐藏了）
      const isGroupAnnouncement = formData.targetType === 1 && formData.groupPushSubType === 2;
      if (!isGroupAnnouncement) {
        // 调用 ContentSelector 的表单校验
        const isValid = (await contentSelectorRef.current?.validate()) || false;
        if (!isValid) return;
      }

      setLoading(true);

      // 获取基础设置中的京东联盟数据
      const basicSettingsValues = basicSettingsRef.current?.getValues() || {};

      // 构建 API 请求数据（根据接口文档）
      const apiData: any = {
        name: formData.name,
        type: 3, // 群发工作台类型固定为3
        status: formData.status, // 0: 否, 1: 是（同时作为是否自动启动）
        targetType: formData.targetType, // 1=群推送，2=好友推送
        pushType: formData.pushType ?? 0, // 推送方式：0=定时推送，1=立即推送
        // 设备参数：参考自动建群的方式，使用deviceGroups
        deviceGroups: formData.deviceGroups?.map(id => Number(id)) || [], // 设备ID数组
        ownerWechatIds: formData.deviceGroups?.map(id => Number(id)) || [], // 设备ID数组（兼容字段）
        startTime: formData.startTime || "09:00", // 允许推送的开始时间
        endTime: formData.endTime || "21:00", // 允许推送的结束时间
        maxPerDay: formData.maxPerDay || 0,
        pushOrder: formData.pushOrder || 1,
        isRandomTemplate: formData.isRandomTemplate || 0,
        socialMediaId: basicSettingsValues.socialMediaId || "",
        promotionSiteId: basicSettingsValues.promotionSiteId || "",
        planType: formData.planType ?? 1,
      };

      // 群推送（targetType = 1）
      if (formData.targetType === 1) {
        apiData.groupPushSubType = formData.groupPushSubType || 1;
        apiData.wechatGroups = formData.wechatGroups.map(id => Number(id)); // 群ID数组
        apiData.isLoop = formData.isLoop || 0; // 群推送和好友推送都有循环推送
        // 群推送不打标签，不传递postPushTags
        // 群推送不传递间隔参数
        // 群公告不传递内容库，群群发才传递
        if (formData.groupPushSubType !== 2) {
          apiData.contentGroups = formData.contentGroups.map(id => Number(id)); // 内容库ID数组
        }

        // 群公告（groupPushSubType = 2）
        if (formData.groupPushSubType === 2) {
          apiData.announcementContent = formData.announcementContent || "";
          apiData.enableAiRewrite = formData.enableAiRewrite || 0;
          if (formData.enableAiRewrite === 1) {
            apiData.aiRewritePrompt = formData.aiRewritePrompt || "";
          }
        }
      } else {
        // 好友推送（targetType = 2）
        apiData.wechatFriends = (formData.wechatFriends || []).map(id => Number(id));
        apiData.trafficPools = (formData.poolGroups || []).map(id => Number(id)); // 流量池ID数组
        apiData.isLoop = formData.isLoop || 0; // 好友推送默认为否（0）
        // 好友推送可以打标签
        apiData.postPushTags = formData.postPushTags || [];
        // 好友推送需要传递间隔参数
        apiData.friendIntervalMin = formData.friendIntervalMin || 10;
        apiData.friendIntervalMax = formData.friendIntervalMax || 20;
        apiData.messageIntervalMin = formData.messageIntervalMin || 1;
        apiData.messageIntervalMax = formData.messageIntervalMax || 12;
        // 好友推送需要传递内容库
        apiData.contentGroups = formData.contentGroups.map(id => Number(id)); // 内容库ID数组
      }

      // 更新时需要传递id
      if (id) {
        apiData.id = Number(id);
      }

      // 调用创建或更新 API
      if (id) {
        const { updateGroupPushTask } = await import("./index.api");
        await updateGroupPushTask(apiData);
        Toast.show({ content: "更新成功", position: "top" });
        navigate("/workspace/group-push");
      } else {
        await createGroupPushTask(apiData);
        Toast.show({ content: "创建成功", position: "top" });
        navigate("/workspace/group-push");
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
            // 调用 DeviceSelector 的表单校验
            isValid = (await deviceSelectorRef.current?.validate()) || false;
            if (isValid) {
              setCurrentStep(3);
            }
            break;

          case 3:
            // 调用 GroupSelector 的表单校验
            isValid = (await groupSelectorRef.current?.validate()) || false;
            if (isValid) {
              // 群公告时不显示内容库步骤，直接保存
              if (formData.targetType === 1 && formData.groupPushSubType === 2) {
                await handleSave();
              } else {
                setCurrentStep(4);
              }
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
        {(() => {
          // 群公告时，步骤3就是最后一步
          const isGroupAnnouncement = formData.targetType === 1 && formData.groupPushSubType === 2;
          const isLastStep = isGroupAnnouncement ? currentStep === 3 : currentStep === 4;
          return isLastStep ? (
            <Button size="large" type="primary" onClick={handleSave}>
              保存
            </Button>
          ) : (
            <Button size="large" type="primary" onClick={handleNext}>
              下一步
            </Button>
          );
        })()}
      </div>
    );
  };

  return (
    <Layout
      header={<NavCommon title={isEditMode ? "编辑任务" : "新建任务"} />}
      footer={renderFooter()}
    >
      <div className={styles.formContainer}>
        <div style={{ marginBottom: 12, padding: "0 16px" }}>
          <StepIndicator currentStep={currentStep} steps={getSteps(formData.targetType, formData.groupPushSubType)} />
        </div>
        <div className={styles.formContent}>
          {currentStep === 1 && (
            <BasicSettings
              ref={basicSettingsRef}
              defaultValues={{
                name: formData.name,
                startTime: formData.startTime,
                endTime: formData.endTime,
                maxPerDay: formData.maxPerDay,
                pushOrder: formData.pushOrder,
                isLoop: formData.isLoop,
                status: formData.status,
                pushType: formData.pushType,
                targetType: formData.targetType,
                groupPushSubType: formData.groupPushSubType,
                isRandomTemplate: formData.isRandomTemplate,
                postPushTags: formData.postPushTags,
                friendIntervalMin: formData.friendIntervalMin,
                friendIntervalMax: formData.friendIntervalMax,
                messageIntervalMin: formData.messageIntervalMin,
                messageIntervalMax: formData.messageIntervalMax,
                announcementContent: formData.announcementContent,
                enableAiRewrite: formData.enableAiRewrite,
                aiRewritePrompt: formData.aiRewritePrompt,
              }}
              onNext={handleBasicSettingsChange}
              onSave={handleSave}
              loading={loading}
            />
          )}
          {currentStep === 2 && (
            <DeviceSelector
              ref={deviceSelectorRef}
              selectedDevices={deviceGroupsOptions}
              onPrevious={() => setCurrentStep(1)}
              onNext={handleDevicesChange}
            />
          )}
          {currentStep === 3 && (
            <GroupSelector
              ref={groupSelectorRef}
              selectedGroups={wechatGroupsOptions}
              targetType={formData.targetType}
              selectedFriends={formData.wechatFriendsOptions || []}
              selectedPools={formData.poolGroupsOptions || []}
              onPrevious={() => setCurrentStep(2)}
              onNext={handleGroupsChange}
            />
          )}
          {currentStep === 4 && formData.targetType === 1 && formData.groupPushSubType !== 2 && (
            <ContentSelector
              ref={contentSelectorRef}
              selectedOptions={contentGroupsOptions}
              onPrevious={() => setCurrentStep(3)}
              onNext={handleLibrariesChange}
            />
          )}
          {currentStep === 4 && formData.targetType === 2 && (
            <ContentSelector
              ref={contentSelectorRef}
              selectedOptions={contentGroupsOptions}
              onPrevious={() => setCurrentStep(3)}
              onNext={handleLibrariesChange}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NewGroupPush;
