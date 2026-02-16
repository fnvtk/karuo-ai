import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from "antd-mobile";
import { Button } from "antd";
import Layout from "@/components/Layout/Layout";
import { createAutoGroup, updateAutoGroup, getAutoGroupDetail } from "./api";
import { AutoGroupFormData, StepItem } from "./types";
import StepIndicator from "@/components/StepIndicator";
import BasicSettings, { BasicSettingsRef } from "./components/BasicSettings";
import OwnerAdminSelector, {
  OwnerAdminSelectorRef,
} from "./components/OwnerAdminSelector";
import PoolSelector, { PoolSelectorRef } from "./components/PoolSelector";
import NavCommon from "@/components/NavCommon/index";
import dayjs from "dayjs";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import { PoolSelectionItem } from "@/components/PoolSelection/data";

const steps: StepItem[] = [
  { id: 1, title: "步骤 1", subtitle: "基础设置" },
  { id: 2, title: "步骤 2", subtitle: "选择群主和管理员" },
  { id: 3, title: "步骤 3", subtitle: "选择流量池包" },
];

const defaultForm: AutoGroupFormData = {
  name: "",
  type: 4,
  devices: [], //  群主ID列表
  devicesOptions: [], // 群主选项
  admins: [], // 管理员ID列表
  adminsOptions: [], // 管理员选项
  poolGroups: [], // 内容库
  poolGroupsOptions: [], // 内容库选项
  startTime: dayjs().format("HH:mm"), // 开始时间 (HH:mm)
  endTime: dayjs().add(1, "hour").format("HH:mm"), // 结束时间 (HH:mm)
  groupSizeMin: 20, // 群组最小人数
  groupSizeMax: 50, //  群组最大人数
  maxGroupsPerDay: 10, // 每日最大建群数
  groupNameTemplate: "", // 群名称模板
  groupDescription: "", //  群描述
  status: 1, // 是否启用 (1: 启用, 0: 禁用)
};

const AutoGroupForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(!isEdit); // 非编辑模式直接标记为已加载
  const [formData, setFormData] = useState<AutoGroupFormData>(defaultForm);
  const [devicesOptions, setDevicesOptions] = useState<DeviceSelectionItem[]>([]);
  const [adminsOptions, setAdminsOptions] = useState<FriendSelectionItem[]>([]);
  const [poolGroupsOptions, setpoolGroupsOptions] = useState<
    PoolSelectionItem[]
  >([]);

  // 创建子组件的ref
  const basicSettingsRef = useRef<BasicSettingsRef>(null);
  const ownerAdminSelectorRef = useRef<OwnerAdminSelectorRef>(null);
  const poolSelectorRef = useRef<PoolSelectorRef>(null);

  useEffect(() => {
    if (!id) return;
    // 这里应请求详情接口，回填表单，演示用mock
    getAutoGroupDetail(id).then(res => {
      const updatedForm = {
        ...defaultForm,
        name: res.name,
        devices: res.config.deviceGroups || res.config.devices || [], // 兼容deviceGroups和devices
        devicesOptions: res.config.deviceGroupsOptions || res.config.devicesOptions || [], // 兼容deviceGroupsOptions和devicesOptions
        admins: res.config.admins || [],
        adminsOptions: res.config.adminsOptions || [],
        poolGroups: res.config.poolGroups || [],
        poolGroupsOptions: res.config.poolGroupsOptions || [],
        startTime: res.config.startTime,
        endTime: res.config.endTime,
        groupSizeMin: res.config.groupSizeMin,
        groupSizeMax: res.config.groupSizeMax,
        maxGroupsPerDay: res.config.maxGroupsPerDay,
        groupNameTemplate: res.config.groupNameTemplate,
        groupDescription: res.config.groupDescription,
        status: res.status,
        type: res.type,
        id: res.id,
      };
      setFormData(updatedForm);
      setDevicesOptions(res.config.deviceGroupsOptions || res.config.devicesOptions || []); // 兼容deviceGroupsOptions和devicesOptions
      setAdminsOptions(res.config.adminsOptions || []);
      setpoolGroupsOptions(res.config.poolGroupsOptions || []);
      setDataLoaded(true); // 标记数据已加载
    });
  }, [id]);

  const handleBasicSettingsChange = (values: Partial<AutoGroupFormData>) => {
    setFormData(prev => ({ ...prev, ...values }));
  };

  // 群主和管理员选择
  const handleOwnerAdminChange = (data: {
    devices: string[];
    devicesOptions: DeviceSelectionItem[];
    admins: string[];
    adminsOptions: FriendSelectionItem[];
  }) => {
    setFormData(prev => ({
      ...prev,
      devices: data.devices,
      admins: data.admins,
    }));
    setDevicesOptions(data.devicesOptions);
    setAdminsOptions(data.adminsOptions);
  };

  // 流量池包选择
  const handlePoolsChange = (data: {
    poolGroups: string[];
    poolGroupsOptions: PoolSelectionItem[];
  }) => {
    setFormData(prev => ({ ...prev, poolGroups: data.poolGroups }));
    setpoolGroupsOptions(data.poolGroupsOptions);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Toast.show({ content: "请输入任务名称" });
      return;
    }
    if (formData.devices.length === 0) {
      Toast.show({ content: "请选择一个群主" });
      return;
    }
    if (formData.devices.length > 1) {
      Toast.show({ content: "群主只能选择一个设备" });
      return;
    }
    if (formData.admins.length === 0) {
      Toast.show({ content: "请至少选择一个管理员" });
      return;
    }
    if (formData.poolGroups.length === 0) {
      Toast.show({ content: "请选择至少一个流量池包" });
      return;
    }

    setLoading(true);
    try {
      // 构建提交数据，将devices映射为deviceGroups
      const { devices, devicesOptions, ...restFormData } = formData;
      const submitData = {
        ...restFormData,
        deviceGroups: devices, // 设备ID数组，传输字段名为deviceGroups
        deviceGroupsOptions: devicesOptions, // 设备完整信息，传输字段名为deviceGroupsOptions
        adminsOptions: adminsOptions,
        poolGroupsOptions: poolGroupsOptions,
      };

      if (isEdit) {
        await updateAutoGroup(submitData);
        Toast.show({ content: "编辑成功" });
      } else {
        await createAutoGroup(submitData);
        Toast.show({ content: "创建成功" });
      }
      navigate("/workspace/auto-group");
    } catch (e) {
      Toast.show({ content: "提交失败" });
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
    if (currentStep < 3) {
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
            // 调用 OwnerAdminSelector 的表单校验
            isValid =
              (await ownerAdminSelectorRef.current?.validate()) || false;
            if (isValid) {
              setCurrentStep(3);
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
            initialValues={{
              name: formData.name,
              startTime: formData.startTime,
              endTime: formData.endTime,
              groupSizeMin: formData.groupSizeMin,
              groupSizeMax: formData.groupSizeMax,
              maxGroupsPerDay: formData.maxGroupsPerDay,
              groupNameTemplate: formData.groupNameTemplate,
              groupDescription: formData.groupDescription,
              status: formData.status,
            }}
          />
        );
      case 2:
        return (
          <OwnerAdminSelector
            ref={ownerAdminSelectorRef}
            selectedOwners={devicesOptions}
            selectedAdmins={adminsOptions}
            onNext={handleOwnerAdminChange}
          />
        );
      case 3:
        return (
          <PoolSelector
            ref={poolSelectorRef}
            selectedPools={poolGroupsOptions}
            onNext={handlePoolsChange}
          />
        );
      default:
        return null;
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
        {currentStep === 3 ? (
          <Button
            size="large"
            type="primary"
            loading={loading}
            onClick={handleSave}
          >
            {isEdit ? "保存修改" : "创建任务"}
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
      header={
        <>
          <NavCommon
            title={isEdit ? "编辑建群任务" : "新建建群任务"}
            backFn={() => navigate(-1)}
          />
          <StepIndicator currentStep={currentStep} steps={steps} />
        </>
      }
      footer={renderFooter()}
    >
      <div style={{ padding: 12 }}>{renderCurrentStep()}</div>
    </Layout>
  );
};

export default AutoGroupForm;
