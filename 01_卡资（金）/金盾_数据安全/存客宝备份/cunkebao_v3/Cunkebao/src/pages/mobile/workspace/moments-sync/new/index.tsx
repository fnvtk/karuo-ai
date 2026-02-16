import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Input, Switch, message, Spin, Radio } from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";

import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";

import StepIndicator from "@/components/StepIndicator";
import {
  createMomentsSync,
  updateMomentsSync,
  getMomentsSyncDetail,
} from "./api";
import DeviceSelection from "@/components/DeviceSelection";
import ContentSelection from "@/components/ContentSelection";
import NavCommon from "@/components/NavCommon";
import { useUserStore } from "@/store/module/user";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { ContentItem } from "@/components/ContentSelection/data";

const steps = [
  { id: 1, title: "基础设置", subtitle: "基础设置" },
  { id: 2, title: "设备选择", subtitle: "设备选择" },
  { id: 3, title: "内容库选择", subtitle: "内容库选择" },
];

const defaultForm = {
  taskName: "",
  startTime: "06:00",
  endTime: "23:59",
  syncCount: 5,
  syncInterval: 30,
  syncType: 1, // 1=业务号 2=人设号
  accountType: 1, // 仅UI用
  enabled: true,
  deviceGroups: [] as any[],
  contentGroups: [] as any[], // 存完整内容库对象数组
  contentTypes: ["text", "image", "video"],
  targetTags: [] as string[],
  filterKeywords: [] as string[],
  // 计划类型：0-全局计划，1-独立计划
  planType: 1,
};

const NewMomentsSync: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { user } = useUserStore();
  const isAdmin = user?.isAdmin === 1;
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [deviceGroupsOptions, setSelectedDevicesOptions] = useState<
    DeviceSelectionItem[]
  >([]);
  const [contentGroupsOptions, setContentGroupsOptions] = useState<
    ContentItem[]
  >([]);

  // 获取详情（编辑）
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getMomentsSyncDetail(id);
      if (res) {
        setFormData({
          taskName: res.name,
          startTime: res.config?.startTime || "06:00",
          endTime: res.config?.endTime || "23:59",
          syncCount: res.config?.syncCount || res.syncCount || 5,
          syncInterval: res.config?.syncInterval || res.syncInterval || 30,
          syncType: res.config?.syncType,
          accountType: res.config?.accountType,
          enabled: res.status === 1,
          deviceGroups: res.config?.deviceGroups || [],
          // 关键：用id字符串数组回填
          contentGroups: res.config?.contentGroups || [], // 直接用对象数组
          contentTypes: res.config?.contentTypes || ["text", "image", "video"],
          targetTags: res.config?.targetTags || [],
          filterKeywords: res.config?.filterKeywords || [],
          planType: res.config?.planType ?? (res as any).planType ?? 1,
        });
        setSelectedDevicesOptions(res.config?.deviceGroupsOptions || []);
        setContentGroupsOptions(res.config?.contentGroupsOptions || []);
      }
    } catch {
      message.error("获取详情失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) fetchDetail();
  }, [isEditMode, fetchDetail]);

  // 步骤切换
  const next = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setCurrentStep(s => Math.max(s - 1, 0));

  // 表单数据更新
  const updateForm = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // UI选择账号类型时同步syncType和accountType
  const handleAccountTypeChange = (type: number) => {
    setFormData(prev => ({
      ...prev,
      accountType: type,
      syncType: type,
    }));
  };
  const handleDevicesChange = (devices: DeviceSelectionItem[]) => {
    setSelectedDevicesOptions(devices);
    updateForm({ deviceGroups: devices.map(d => d.id) });
  };
  const handleContentChange = (libs: ContentItem[]) => {
    setContentGroupsOptions(libs);
    updateForm({ contentGroups: libs });
  };
  // 提交
  const handleSubmit = async () => {
    if (!formData.taskName.trim()) {
      message.error("请输入任务名称");
      return;
    }
    if (formData.deviceGroups.length === 0) {
      message.error("请选择设备");
      return;
    }
    if (formData.contentGroups.length === 0) {
      message.error("请选择内容库");
      return;
    }
    setLoading(true);
    try {
      const params = {
        name: formData.taskName,
        deviceGroups: formData.deviceGroups,
        contentGroups: contentGroupsOptions.map((lib: any) => lib.id),
        syncInterval: formData.syncInterval,
        syncCount: formData.syncCount,
        syncType: formData.syncType, // 账号类型真实传参
        accountType: formData.accountType, // 也要传
        startTime: formData.startTime,
        endTime: formData.endTime,
        contentTypes: formData.contentTypes,
        targetTags: formData.targetTags,
        filterKeywords: formData.filterKeywords,
        type: 2,
        status: formData.enabled ? 1 : 0,
        planType: (formData as any).planType ?? 1,
      };
      if (isEditMode && id) {
        await updateMomentsSync({ id, ...params });
        message.success("更新成功");
        navigate(`/workspace/moments-sync`);
      } else {
        await createMomentsSync(params);
        message.success("创建成功");
        navigate("/workspace/moments-sync");
      }
    } catch {
      message.error(isEditMode ? "更新失败" : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  // 步骤内容（去除按钮）
  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <div className={style.container}>
          {/* 计划类型和任务名称 */}
          <div className={style.card}>
            {isAdmin && (
              <div className={style.formItem}>
                <div className={style.formLabel}>计划类型</div>
                <Radio.Group
                  value={(formData as any).planType}
                  onChange={e => updateForm({ planType: e.target.value })}
                  className={style.radioGroup}
                >
                  <Radio value={0}>全局计划</Radio>
                  <Radio value={1}>独立计划</Radio>
                </Radio.Group>
              </div>
            )}
          <div className={style.formItem}>
            <div className={style.formLabel}>任务名称</div>
            <Input
              value={formData.taskName}
              onChange={e => updateForm({ taskName: e.target.value })}
              placeholder="请输入任务名称"
              maxLength={30}
              className={style.input}
            />
            </div>
          </div>

          {/* 允许发布时间段 */}
          <div className={style.card}>
          <div className={style.formItem}>
            <div className={style.formLabel}>允许发布时间段</div>
            <div className={style.timeRow}>
              <Input
                type="time"
                value={formData.startTime}
                onChange={e => updateForm({ startTime: e.target.value })}
                className={style.inputTime}
              />
              <span className={style.timeTo}>至</span>
              <Input
                type="time"
                value={formData.endTime}
                onChange={e => updateForm({ endTime: e.target.value })}
                className={style.inputTime}
              />
              </div>
            </div>
          </div>

          {/* 每日同步数量 */}
          <div className={style.card}>
          <div className={style.formItem}>
            <div className={style.formLabel}>每日同步数量</div>
            <div className={style.counterRow}>
              <button
                className={style.counterBtn}
                onClick={() =>
                  updateForm({ syncCount: Math.max(1, formData.syncCount - 1) })
                }
              >
                <MinusOutlined />
              </button>
              <span className={style.counterValue}>{formData.syncCount}</span>
              <button
                className={style.counterBtn}
                onClick={() =>
                  updateForm({ syncCount: formData.syncCount + 1 })
                }
              >
                <PlusOutlined />
              </button>
              <span className={style.counterUnit}>条朋友圈</span>
              </div>
            </div>
          </div>

          {/* 账号类型和是否启用 */}
          <div className={style.card}>
          <div className={style.formItem}>
            <div className={style.formLabel}>账号类型</div>
            <div className={style.accountTypeRow}>
              <button
                className={`${style.accountTypeBtn} ${formData.accountType === 1 ? style.accountTypeActive : ""}`}
                onClick={() => handleAccountTypeChange(1)}
              >
                业务号
              </button>
              <button
                className={`${style.accountTypeBtn} ${formData.accountType === 2 ? style.accountTypeActive : ""}`}
                onClick={() => handleAccountTypeChange(2)}
              >
                人设号
              </button>
            </div>
          </div>
          <div className={style.formItem}>
            <div className={style.switchRow}>
              <span className={style.switchLabel}>是否启用</span>
              <Switch
                checked={formData.enabled}
                onChange={checked => updateForm({ enabled: checked })}
                className={style.switch}
              />
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (currentStep === 1) {
      return (
        <div className={style.container}>
          <div className={style.card}>
          <div className={style.formItem}>
            <div className={style.formLabel}>选择设备</div>
            <DeviceSelection
              selectedOptions={deviceGroupsOptions}
              onSelect={handleDevicesChange}
              placeholder="请选择设备"
              showSelectedList={true}
              selectedListMaxHeight={200}
            />
            </div>
          </div>
        </div>
      );
    }
    if (currentStep === 2) {
      return (
        <div className={style.container}>
          <div className={style.card}>
          <div className={style.formItem}>
            <div className={style.formLabel}>选择内容库</div>
            <ContentSelection
              selectedOptions={contentGroupsOptions}
              onSelect={handleContentChange}
              placeholder="请选择内容库"
              showSelectedList={true}
              selectedListMaxHeight={200}
            />
            {formData.contentGroups.length > 0 && (
              <div className={style.selectedTip}>
                已选内容库: {formData.contentGroups.length}个
              </div>
            )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 统一底部按钮
  const renderFooter = () => {
    if (loading) return null;
    if (currentStep === 0) {
      return (
        <div className={style.formStepBtnRow}>
          <Button
            type="primary"
            disabled={!formData.taskName.trim()}
            onClick={next}
            className={style.nextBtn}
            block
          >
            下一步
          </Button>
        </div>
      );
    }
    if (currentStep === 1) {
      return (
        <div className={style.formStepBtnRow}>
          <Button onClick={prev} className={style.prevBtn} style={{ flex: 1 }}>
            上一步
          </Button>
          <Button type="primary" onClick={next} className={style.nextBtn} style={{ flex: 1 }}>
            下一步
          </Button>
        </div>
      );
    }
    if (currentStep === 2) {
      return (
        <div className={style.formStepBtnRow}>
          <Button onClick={prev} className={style.prevBtn} style={{ flex: 1 }}>
            上一步
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            className={style.completeBtn}
            style={{ flex: 1 }}
          >
            完成
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout
      header={
        <NavCommon title={isEditMode ? "编辑朋友圈同步" : "新建朋友圈同步"} />
      }
      footer={renderFooter()}
    >
      <div className={style.formBg}>
        <div style={{ marginBottom: "15px", padding: "0 16px" }}>
          <StepIndicator currentStep={currentStep + 1} steps={steps} />
        </div>

        {loading ? (
          <div className={style.formLoading}>
            <Spin />
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </Layout>
  );
};

export default NewMomentsSync;
