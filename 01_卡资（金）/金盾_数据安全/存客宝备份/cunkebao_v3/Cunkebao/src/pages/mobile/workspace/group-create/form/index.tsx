import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Toast } from "antd-mobile";
import { Button } from "antd";
import Layout from "@/components/Layout/Layout";
import { createGroupCreate, updateGroupCreate, getGroupCreateDetail } from "./api";
import { GroupCreateFormData } from "./types";
import StepIndicator from "@/components/StepIndicator";
import BasicSettings, { BasicSettingsRef } from "./components/BasicSettings";
import DeviceSelectionStep, { DeviceSelectionStepRef } from "./components/DeviceSelectionStep";
import PoolSelectionStep, { PoolSelectionStepRef } from "./components/PoolSelectionStep";
import NavCommon from "@/components/NavCommon/index";

const steps = [
  { id: 1, title: "1", subtitle: "群设置" },
  { id: 2, title: "2", subtitle: "设备选择" },
  { id: 3, title: "3", subtitle: "流量池选择" },
];

const defaultForm: GroupCreateFormData = {
  planType: 1, // 默认独立计划
  isPlanType: 0, // 是否支持计划类型配置：默认不支持，依赖接口返回
  name: "",
  executorId: undefined,
  executor: undefined,
  deviceGroupsOptions: [],
  deviceGroups: [],
  wechatGroups: [],
  wechatGroupsOptions: [],
  groupAdminEnabled: false,
  groupAdminWechatId: undefined,
  groupAdminWechatIdOption: undefined,
  groupNameTemplate: "",
  maxGroupsPerDay: 20,
  groupSizeMin: 3,
  groupSizeMax: 38,
  startTime: "09:00", // 默认开始时间
  endTime: "21:00", // 默认结束时间
  poolGroups: [],
  poolGroupsOptions: [],
  status: 1, // 默认启用
};

const GroupCreateForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const routeState = (location.state || {}) as { isPlanType?: number };
  const isEdit = Boolean(id);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(!isEdit);
  const [formData, setFormData] = useState<GroupCreateFormData>({
    ...defaultForm,
    // 新建时，尝试从路由状态中获取 isPlanType（由列表页传入）
    isPlanType: routeState.isPlanType === 1 ? 1 : 0,
  });

  // 调试日志：查看路由传入的 isPlanType 和当前表单中的 planType / isPlanType
  useEffect(() => {
    // 仅在开发调试用，后续可以删除
    // eslint-disable-next-line no-console
    console.log("[GroupCreate] routeState.isPlanType =", routeState.isPlanType);
    // eslint-disable-next-line no-console
    console.log("[GroupCreate] formData.planType =", formData.planType, "formData.isPlanType =", formData.isPlanType);
  }, [routeState.isPlanType, formData.planType, formData.isPlanType]);

  // 创建子组件的ref
  const basicSettingsRef = useRef<BasicSettingsRef>(null);
  const deviceSelectionStepRef = useRef<DeviceSelectionStepRef>(null);
  const poolSelectionStepRef = useRef<PoolSelectionStepRef>(null);

  useEffect(() => {
    if (!id) return;
    // 获取详情并回填表单
    getGroupCreateDetail(id)
      .then(res => {
        const config = res.config || {};
        // 转换 deviceGroups 从字符串数组到数字数组
        const deviceGroups = (config.deviceGroups || []).map((id: string | number) => Number(id));
        // 转换 poolGroups 保持字符串数组
        const poolGroups = (config.poolGroups || []).map((id: string | number) => String(id));
        // 转换 wechatGroups 到数字数组
        const wechatGroups = (config.wechatGroups || []).map((id: string | number) => Number(id));

        // 查找群管理员选项（如果有）
        const groupAdminWechatIdOption = config.groupAdminWechatId && config.wechatGroupsOptions
          ? config.wechatGroupsOptions.find((f: any) => f.id === config.groupAdminWechatId)
          : undefined;

        const updatedForm: GroupCreateFormData = {
          ...defaultForm,
          id: String(res.id),
          planType: config.planType ?? res.planType ?? 1,
          // 由接口控制是否展示计划类型配置
          isPlanType: config.isPlanType ?? res.isPlanType ?? 0,
          name: res.name ?? "",
          executorId: config.executorId,
          executor: config.deviceGroupsOptions?.[0], // executor 使用第一个设备（如果需要）
          deviceGroupsOptions: config.deviceGroupsOptions || [],
          deviceGroups: deviceGroups,
          wechatGroups: wechatGroups,
          wechatGroupsOptions: config.wechatGroupsOptions || config.wechatFriendsOptions || [],
          groupAdminEnabled: config.groupAdminEnabled === 1,
          groupAdminWechatId: config.groupAdminWechatId || undefined,
          groupAdminWechatIdOption: groupAdminWechatIdOption,
          groupNameTemplate: config.groupNameTemplate || "",
          maxGroupsPerDay: config.maxGroupsPerDay ?? 20,
          groupSizeMin: config.groupSizeMin ?? 3,
          groupSizeMax: config.groupSizeMax ?? 38,
          startTime: config.startTime || "09:00",
          endTime: config.endTime || "21:00",
          poolGroups: poolGroups,
          poolGroupsOptions: config.poolGroupsOptions || [],
          status: res.status ?? 1,
        };
        setFormData(updatedForm);
        setDataLoaded(true);
      })
      .catch(err => {
        Toast.show({ content: err.message || "获取详情失败" });
        setDataLoaded(true);
      });
  }, [id]);

  const handleFormDataChange = (values: Partial<GroupCreateFormData>) => {
    setFormData(prev => ({ ...prev, ...values }));
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // 验证第一步
      const isValid = (await basicSettingsRef.current?.validate()) || false;
      if (!isValid) {
        return;
      }
      setCurrentStep(2);
      // 切换到下一步时，滚动到顶部
      setTimeout(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else if (currentStep === 2) {
      // 验证第二步
      const isValid = (await deviceSelectionStepRef.current?.validate()) || false;
      if (!isValid) {
        Toast.show({ content: "请至少选择一个执行设备", position: "top" });
        return;
      }
      setCurrentStep(3);
      // 切换到下一步时，滚动到顶部
      setTimeout(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else if (currentStep === 3) {
      // 验证第三步并保存
      await handleSave();
    }
  };

  const handleSave = async () => {
    // 验证第三步
    const isValid = (await poolSelectionStepRef.current?.validate()) || false;
    if (!isValid) {
      Toast.show({ content: "请至少选择一个流量池", position: "top" });
      return;
    }

    setLoading(true);
    try {
      // 构建提交数据
      const submitData = {
        ...formData,
        type: 4, // 自动建群任务类型（保持与旧版一致）
      };

      if (isEdit) {
        await updateGroupCreate(submitData);
        Toast.show({ content: "编辑成功" });
      } else {
        await createGroupCreate(submitData);
        Toast.show({ content: "创建成功" });
      }
      navigate("/workspace/group-create");
    } catch (e: any) {
      Toast.show({ content: e?.message || "提交失败" });
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentStep = () => {
    // 编辑模式下，等待数据加载完成后再渲染
    if (isEdit && !dataLoaded) {
      return (
        <div style={{ textAlign: "center", padding: "50px" }}>加载中...</div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <BasicSettings
            ref={basicSettingsRef}
            formData={formData}
            onChange={handleFormDataChange}
          />
        );
      case 2:
        return (
          <DeviceSelectionStep
            ref={deviceSelectionStepRef}
            deviceGroupsOptions={formData.deviceGroupsOptions || []}
            deviceGroups={formData.deviceGroups || []}
            onSelect={(devices) => {
              const deviceIds = devices.map(d => d.id);
              handleFormDataChange({
                deviceGroupsOptions: devices,
                deviceGroups: deviceIds,
                // 如果只有一个设备，也设置 executor 和 executorId 用于兼容
                executor: devices.length === 1 ? devices[0] : undefined,
                executorId: devices.length === 1 ? devices[0].id : undefined,
              });
            }}
          />
        );
      case 3:
        return (
          <PoolSelectionStep
            ref={poolSelectionStepRef}
            selectedPools={formData.poolGroupsOptions || []}
            poolGroups={formData.poolGroups || []}
            onSelect={(pools, poolGroupIds) => {
              handleFormDataChange({
                poolGroupsOptions: pools,
                poolGroups: poolGroupIds,
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderFooter = () => {
    return (
      <div style={{ display: "flex", gap: "12px", padding: "16px" }}>
        {currentStep > 1 && (
          <Button
            size="large"
            onClick={() => {
              setCurrentStep(currentStep - 1);
              // 切换到上一步时，滚动到顶部
              setTimeout(() => {
                const mainElement = document.querySelector('main');
                if (mainElement) {
                  mainElement.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }, 100);
            }}
            style={{ flex: 1 }}
          >
            上一步
          </Button>
        )}
        <Button
          size="large"
          type="primary"
          loading={loading}
          onClick={handleNext}
          style={{ flex: 1 }}
        >
          {currentStep === 3 ? "完成" : "下一步"}
        </Button>
      </div>
    );
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            title={isEdit ? "编辑自动建群" : "新建自动建群"}
            backFn={() => navigate(-1)}
          />
          <StepIndicator currentStep={currentStep} steps={steps} />
        </>
      }
      footer={renderFooter()}
    >
      <div>{renderCurrentStep()}</div>
    </Layout>
  );
};

export default GroupCreateForm;
