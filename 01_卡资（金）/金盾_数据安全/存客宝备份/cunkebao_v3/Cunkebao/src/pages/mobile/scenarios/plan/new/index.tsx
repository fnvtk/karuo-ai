import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { message, Button, Space } from "antd";
import NavCommon from "@/components/NavCommon";
import BasicSettings from "./steps/BasicSettings";
import FriendRequestSettings from "./steps/FriendRequestSettings";
import MessageSettings from "./steps/MessageSettings";
import Layout from "@/components/Layout/Layout";
import StepIndicator from "@/components/StepIndicator";

import {
  getScenarioTypes,
  createPlan,
  getPlanDetail,
  updatePlan,
} from "./index.api";
import { FormData, defFormData, steps } from "./index.data";
import { fetchChannelList } from "@/pages/mobile/workspace/distribution-management/api";

export default function NewPlan() {
  const router = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(defFormData);
  const [submitting, setSubmitting] = useState(false); // 添加提交状态

  const [sceneList, setSceneList] = useState<any[]>([]);
  const [sceneLoading, setSceneLoading] = useState(true);
  const { scenarioId, planId } = useParams<{
    scenarioId: string;
    planId: string;
  }>();
  const [isEdit, setIsEdit] = useState(false);
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setSceneLoading(true);
    //获取场景类型
    getScenarioTypes()
      .then(data => {
        setSceneList(data || []);
      })
      .catch(err => {
        message.error(err.message || "获取场景类型失败");
      })
      .finally(() => setSceneLoading(false));
    if (planId) {
      setIsEdit(true);
      //获取计划详情

      const detail = await getPlanDetail(planId);

      // 处理分销相关数据回填
      const distributionChannels = detail.distributionChannels || [];
      let distributionChannelsOptions: Array<{ id: string | number; name: string; code?: string }> = [];

      if (distributionChannels.length > 0) {
        // 判断 distributionChannels 是对象数组还是ID数组
        const isObjectArray = distributionChannels.some((item: any) => typeof item === 'object' && item !== null);

        if (isObjectArray) {
          // 如果已经是对象数组，直接使用（包含 id, code, name）
          distributionChannelsOptions = distributionChannels.map((channel: any) => ({
            id: channel.id,
            name: channel.name || `渠道${channel.id}`,
            code: channel.code,
          }));
        } else {
          // 如果是ID数组，需要查询渠道信息
          try {
            const channelRes = await fetchChannelList({ page: 1, limit: 200, status: "enabled" });
            distributionChannelsOptions = distributionChannels.map((channelId: number) => {
              const channel = channelRes.list.find((c: any) => c.id === channelId);
              return channel
                ? { id: channelId, name: channel.name, code: channel.code }
                : { id: channelId, name: `渠道${channelId}` };
            });
          } catch {
            // 如果获取渠道信息失败，使用默认名称
            distributionChannelsOptions = distributionChannels.map((channelId: number) => ({
              id: channelId,
              name: `渠道${channelId}`,
            }));
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        name: detail.name ?? "",
        scenario: Number(detail.sceneId || detail.scenario) || 1,
        scenarioTags: detail.scenarioTags ?? [],
        customTags: detail.customTags ?? [],
        customTagsOptions: detail.customTags ?? [],
        posters: detail.posters ?? [],
        device: detail.device ?? [],
        remarkType: detail.remarkType ?? "phone",
        greeting: detail.greeting ?? "",
        addInterval: detail.addInterval ?? 1,
        startTime: detail.startTime ?? "09:00",
        endTime: detail.endTime ?? "18:00",
        enabled: detail.enabled ?? true,
        sceneId: Number(detail.sceneId || detail.scenario) || 1,
        remarkFormat: detail.remarkFormat ?? "",
        addFriendInterval: detail.addFriendInterval ?? 1,
        tips: detail.tips ?? "",
        deviceGroups: detail.deviceGroups ?? [],
        deviceGroupsOptions: detail.deviceGroupsOptions ?? [],
        wechatGroups: detail.wechatGroups ?? [],
        wechatGroupsOptions: detail.wechatGroupsOptions ?? [],
        contentGroups: detail.contentGroups ?? [],
        contentGroupsOptions: detail.contentGroupsOptions ?? [],
        // 拉群设置
        groupInviteEnabled: detail.groupInviteEnabled ?? false,
        groupName: detail.groupName ?? "",
        // 计划类型
        planType: detail.planType ?? 1,
        // 优先使用后端返回的 options（完整好友信息），否则退回到 ID 数组或旧字段
        fixedGroupMembers:
          detail.groupFixedMembersOptions ??
          detail.fixedGroupMembers ??
          detail.groupFixedMembers ??
          [],
        status: detail.status ?? 0,
        messagePlans: detail.messagePlans ?? [],
        // 分销相关数据回填
        distributionEnabled: detail.distributionEnabled ?? false,
        distributionChannelIds: distributionChannelsOptions.map(item => item.id),
        distributionChannelsOptions: distributionChannelsOptions,
        distributionCustomerReward: detail.customerRewardAmount,
        distributionAddReward: detail.addFriendRewardAmount,
      }));
    } else {
      // 新建时，如果是海报场景，设置默认获客成功提示
      const defaultTips = "请注意消息，稍后加你微信";
      if (scenarioId) {
        setFormData(prev => ({
          ...prev,
          ...{ scenario: Number(scenarioId) || 1 },
          tips: Number(scenarioId) === 1 ? defaultTips : prev.tips || "",
        }));
      } else {
        // 如果没有 scenarioId，默认是海报场景（scenario === 1），设置默认提示
        setFormData(prev => ({
          ...prev,
          tips: prev.scenario === 1 ? defaultTips : prev.tips || "",
        }));
      }
    }
  };

  // 更新表单数据
  const onChange = (data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // 处理保存
  const handleSave2 = async () => {
    if (isEdit && planId) {
      // 编辑：拼接后端需要的完整参数
      const editData = {
        ...formData,
        ...{ sceneId: Number(formData.scenario) },
        id: Number(planId),
        planId: Number(planId),
      };
      console.log("editData", editData);
    } else {
      // 新建
      formData.sceneId = Number(formData.scenario);
      console.log("formData", formData);
    }
  };
  // 处理保存
  const handleSave = async () => {
    // 防止重复提交
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      // 构建提交数据，转换分销相关字段为接口需要的格式
      const submitData: any = {
        ...formData,
        sceneId: Number(formData.scenario),
      };

      // 转换分销相关字段为接口需要的格式
      if (formData.distributionEnabled) {
        submitData.distributionEnabled = true;
        // 转换渠道ID数组，确保都是数字类型
        submitData.distributionChannels = (formData.distributionChannelIds || []).map(id =>
          typeof id === 'string' ? Number(id) : id
        );
        // 转换奖励金额，确保是浮点数，最多2位小数
        submitData.customerRewardAmount = formData.distributionCustomerReward
          ? Number(Number(formData.distributionCustomerReward).toFixed(2))
          : 0;
        submitData.addFriendRewardAmount = formData.distributionAddReward
          ? Number(Number(formData.distributionAddReward).toFixed(2))
          : 0;
      } else {
        // 如果未开启分销，设置为false
        submitData.distributionEnabled = false;
      }

      // 拉群设置字段转换
      if (formData.groupInviteEnabled) {
        submitData.groupInviteEnabled = true;
        submitData.groupName = formData.groupName || "";
        // 后端期望的字段：groupFixedMembers，使用好友ID数组
        submitData.groupFixedMembers = (formData.fixedGroupMembers || []).map(
          (f: any) => f.id,
        );
      } else {
        submitData.groupInviteEnabled = false;
        submitData.groupName = "";
        submitData.groupFixedMembers = [];
      }

      // 移除前端使用的字段，避免提交到后端
      delete submitData.distributionChannelIds;
      delete submitData.distributionChannelsOptions;
      delete submitData.distributionCustomerReward;
      delete submitData.distributionAddReward;
      delete submitData.fixedGroupMembers;

      if (isEdit && planId) {
        // 编辑：拼接后端需要的完整参数
        submitData.id = Number(planId);
        submitData.planId = Number(planId);
        await updatePlan(submitData);
      } else {
        // 新建
        await createPlan(submitData);
      }
      message.success(isEdit ? "计划已更新" : "获客计划已创建");
      const sceneItem = sceneList.find(v => formData.scenario === v.id);
      router(`/scenarios/list/${formData.scenario}/${sceneItem.name}`);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : isEdit
              ? "更新计划失败，请重试"
              : "创建计划失败，请重试",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep === steps.length) {
      // 最后一步时调用保存，防止重复点击
      if (!submitting) {
        handleSave();
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicSettings
            isEdit={isEdit}
            formData={formData}
            onChange={onChange}
            sceneList={sceneList}
            sceneLoading={sceneLoading}
            planId={planId}
          />
        );
      case 2:
        return (
          <FriendRequestSettings formData={formData} onChange={onChange} />
        );
      case 3:
        return <MessageSettings formData={formData} onChange={onChange} />;
      default:
        return null;
    }
  };

  // 渲染底部按钮
  const renderFooterButtons = () => {
    return (
      <div style={{ padding: "16px", display: "flex", gap: "12px" }}>
        {currentStep > 1 && (
          <Button
            onClick={handlePrev}
            size="large"
            style={{ flex: 1 }}
            disabled={submitting}
          >
            上一步
          </Button>
        )}
        <Button
          type="primary"
          size="large"
          onClick={handleNext}
          style={{ flex: 1 }}
          loading={submitting}
          disabled={submitting}
        >
          {submitting
            ? isEdit
              ? "更新中..."
              : "创建中..."
            : currentStep === steps.length
              ? "完成"
              : "下一步"}
        </Button>
      </div>
    );
  };

  return (
    <Layout
      header={
        <>
          <NavCommon title={isEdit ? "编辑场景计划" : "新建场景计划"} />
          <StepIndicator currentStep={currentStep} steps={steps} />
        </>
      }
      footer={renderFooterButtons()}
    >
      {renderStepContent()}
    </Layout>
  );
}
