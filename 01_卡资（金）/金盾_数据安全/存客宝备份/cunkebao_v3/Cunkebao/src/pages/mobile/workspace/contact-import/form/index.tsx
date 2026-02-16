import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { Button, Input, message, TimePicker, Select, Switch, Radio, Card } from "antd";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import DeviceSelection from "@/components/DeviceSelection";
import PoolSelection from "@/components/PoolSelection";
import {
  createContactImportTask,
  updateContactImportTask,
  fetchContactImportTaskDetail,
} from "./api";
import { Allocation } from "./data";
import { PoolSelectionItem } from "@/components/PoolSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import style from "./index.module.scss";
import dayjs from "dayjs";
import { useUserStore } from "@/store/module/user";

const ContactImportForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useUserStore();
  const isAdmin = user?.isAdmin === 1;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    planType: 1, // 计划类型：0-全局计划，1-独立计划
    name: "", // 任务名称
    status: 1, // 是否启用，默认启用
    type: 6, // 任务类型，固定为6
    workbenchId: 1, // 默认工作台ID
    deviceGroups: [] as number[],
    poolGroups: [] as number[],
    num: 50,
    clearContact: 0,
    remarkType: 0,
    remark: "",
    startTime: dayjs("09:00", "HH:mm"),
    endTime: dayjs("21:00", "HH:mm"),
    // 保留原有字段用于UI显示
    deviceGroupsOptions: [] as DeviceSelectionItem[],
    poolGroupsOptions: [] as PoolSelectionItem[], // 流量池选择项
  });

  // 处理设备选择
  const handleDeviceSelect = (selectedDevices: any[]) => {
    setFormData(prev => ({
      ...prev,
      deviceGroupsOptions: selectedDevices,
      deviceGroups: selectedDevices.map(device => device.id), // 提取设备ID存储到deviceGroups数组
    }));
  };

  // 处理流量池选择
  const handlePoolSelect = (selectedpoolGroups: PoolSelectionItem[]) => {
    setFormData(prev => ({
      ...prev,
      poolGroupsOptions: selectedpoolGroups,
      poolGroups: selectedpoolGroups.map(pool => Number(pool.id)), // 提取流量池信息存储到pools数组
    }));
  };

  // 获取任务详情（编辑模式）
  const loadTaskDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await fetchContactImportTaskDetail(Number(id));
      if (data) {
        const config = data.config || {};

        // 构造设备选择组件需要的数据格式
        const deviceGroupsOptions = config.deviceGroupsOptions || [];
        const poolGroupsOptions = config.poolGroupsOptions || [];

        setFormData({
          name: data.name || "",
          status: data.status || 1,
          type: data.type || 6,
          workbenchId: config.workbenchId || 1,
          deviceGroups:
            deviceGroupsOptions.map((device: any) => device.id) || [],
          poolGroups: config.poolGroups || [],
          num: config.num || 50,
          clearContact: config.clearContact || 0,
          remarkType: config.remarkType || 0,
          remark: config.remark || "",
          startTime: config.startTime ? dayjs(config.startTime, "HH:mm") : null,
          endTime: config.endTime ? dayjs(config.endTime, "HH:mm") : null,
          deviceGroupsOptions,
          poolGroupsOptions,
          planType: config.planType ?? (data as any).planType ?? 1,
        });
      }
    } catch (error) {
      console.error("Failed to load task detail:", error);
      message.error("获取任务详情失败");
      navigate("/workspace/contact-import/list");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // 更新表单数据
  const handleUpdateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // 提交表单
  const handleSubmit = async () => {
    // 表单验证
    if (!formData.name.trim()) {
      message.error("请输入任务名称");
      return;
    }

    if (formData.deviceGroups.length === 0) {
      message.error("请选择设备");
      return;
    }

    if (!formData.num || formData.num <= 0) {
      message.error("请输入有效的分配数量");
      return;
    }

    // 验证开始时间不得大于结束时间
    if (formData.startTime && formData.endTime) {
      if (formData.startTime.isAfter(formData.endTime)) {
        message.error("开始时间不得大于结束时间");
        return;
      }
    }

    setLoading(true);
    try {
      const submitData: Partial<Allocation> = {
        name: formData.name,
        status: formData.status,
        type: formData.type,
        workbenchId: formData.workbenchId,
        deviceGroups: formData.deviceGroups,
        poolGroups: formData.poolGroups,
        num: formData.num,
        clearContact: formData.clearContact,
        remarkType: formData.remarkType,
        remark: formData.remark || null,
        startTime: formData.startTime?.format("HH:mm") || null,
        endTime: formData.endTime?.format("HH:mm") || null,
        planType: (formData as any).planType ?? 1,
      };

      if (isEdit && id) {
        await updateContactImportTask({
          ...submitData,
          id: Number(id),
        } as Allocation);
        message.success("更新成功");
      } else {
        await createContactImportTask(submitData as Allocation);
        message.success("创建成功");
      }

      navigate("/workspace/contact-import/list");
    } catch (error) {
      message.error(isEdit ? "更新失败" : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setFormData({
      name: "",
      status: 1,
      type: 6,
      workbenchId: 1,
      deviceGroups: [],
      poolGroups: [],
      num: 50,
      clearContact: 0,
      remarkType: 0,
      remark: "",
      startTime: dayjs("09:00", "HH:mm"),
      endTime: dayjs("21:00", "HH:mm"),
      deviceGroupsOptions: [],
      poolGroupsOptions: [],
    });
  };

  useEffect(() => {
    if (isEdit) {
      loadTaskDetail();
    }
  }, [id, isEdit, loadTaskDetail]);

  return (
    <Layout
      header={<NavCommon title={isEdit ? "编辑导入任务" : "新建导入任务"} />}
      footer={
        <div className={style.buttonGroup}>
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleSubmit}
            className={style.submitButton}
          >
            {isEdit ? "更新" : "创建"}
          </Button>
          <Button
            size="large"
            onClick={handleReset}
            className={style.resetButton}
          >
            重置
          </Button>
        </div>
      }
      loading={loading}
    >
      <div className={style.formBg}>
        <div className={style.basicSection}>
          {/* 计划类型和任务名称 */}
          <Card className={style.card}>
            {isAdmin && (
              <div className={style.formItem}>
                <div className={style.formLabel}>计划类型</div>
                <Radio.Group
                  value={(formData as any).planType}
                  onChange={e =>
                    handleUpdateFormData({ planType: e.target.value })
                  }
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
                placeholder="请输入任务名称"
                value={formData.name}
                onChange={e => handleUpdateFormData({ name: e.target.value })}
                className={style.input}
              />
              <div className={style.counterTip}>为此导入任务设置一个名称</div>
            </div>
          </Card>

          {/* 设备选择 */}
          <Card className={style.card}>
            <div className={style.formItem}>
              <div className={style.formLabel}>设备选择</div>
              <DeviceSelection
                selectedOptions={formData.deviceGroupsOptions}
                onSelect={handleDeviceSelect}
                placeholder="请选择设备"
                className={style.deviceSelection}
              />
              <div className={style.counterTip}>选择要分配联系人的设备</div>
            </div>
          </Card>

          {/* 流量池选择 */}
          <Card className={style.card}>
            <div className={style.formItem}>
              <div className={style.formLabel}>流量池选择</div>
              <PoolSelection
                selectedOptions={formData.poolGroupsOptions}
                onSelect={handlePoolSelect}
                placeholder="请选择流量池"
                className={style.poolSelection}
              />
              <div className={style.counterTip}>选择要导入的流量池</div>
            </div>
          </Card>

          {/* 分配数量 */}
          <Card className={style.card}>
            <div className={style.formItem}>
              <div className={style.formLabel}>分配数量</div>
              <div className={style.stepperContainer}>
                <Button
                  icon={<MinusOutlined />}
                  onClick={() =>
                    handleUpdateFormData({ num: Math.max(1, formData.num - 1) })
                  }
                  disabled={formData.num <= 1}
                  className={style.stepperButton}
                />
                <Input
                  value={formData.num}
                  onChange={e => {
                    const value = parseInt(e.target.value) || 1;
                    handleUpdateFormData({
                      num: Math.min(1000, Math.max(1, value)),
                    });
                  }}
                  className={style.stepperInput}
                />
                <Button
                  icon={<PlusOutlined />}
                  onClick={() =>
                    handleUpdateFormData({
                      num: Math.min(1000, formData.num + 1),
                    })
                  }
                  disabled={formData.num >= 1000}
                  className={style.stepperButton}
                />
              </div>
              <div className={style.counterTip}>要分配给设备的联系人数量</div>
            </div>
          </Card>

          {/* 清除现有联系人和备注类型 */}
          <Card className={style.card}>
            <div className={style.formItem}>
              <div className={style.formLabel}>清除现有联系人</div>
              <Switch
                checked={formData.clearContact === 1}
                onChange={checked =>
                  handleUpdateFormData({ clearContact: checked ? 1 : 0 })
                }
              />
              <div className={style.counterTip}>是否清除设备上现有的联系人</div>
            </div>
            <div className={style.formItem}>
              <div className={style.formLabel}>备注类型</div>
              <Select
                placeholder="请选择备注类型"
                value={formData.remarkType}
                onChange={value => handleUpdateFormData({ remarkType: value })}
                className={style.select}
              >
                <Select.Option value={0}>不备注</Select.Option>
                <Select.Option value={1}>年月日</Select.Option>
                <Select.Option value={2}>月日</Select.Option>
                <Select.Option value={3}>自定义</Select.Option>
              </Select>
              <div className={style.counterTip}>选择联系人备注的格式</div>
            </div>
            {formData.remarkType === 3 && (
              <div className={style.formItem}>
                <div className={style.formLabel}>自定义备注</div>
                <Input
                  placeholder="请输入备注内容"
                  value={formData.remark}
                  onChange={e => handleUpdateFormData({ remark: e.target.value })}
                  className={style.input}
                />
                <div className={style.counterTip}>输入自定义的备注内容</div>
              </div>
            )}
          </Card>

          {/* 时间设置 */}
          <Card className={style.card}>
            <div className={style.formItem}>
              <div className={style.formLabel}>开始时间</div>
              <TimePicker
                value={formData.startTime}
                onChange={time =>
                  handleUpdateFormData({
                    startTime: time,
                  })
                }
                format="HH:mm"
                placeholder="请选择开始时间"
                className={style.timePicker}
              />
              <div className={style.counterTip}>设置每天开始导入的时间</div>
            </div>
            <div className={style.formItem}>
              <div className={style.formLabel}>结束时间</div>
              <TimePicker
                value={formData.endTime}
                onChange={time =>
                  handleUpdateFormData({
                    endTime: time,
                  })
                }
                format="HH:mm"
                placeholder="请选择结束时间"
                className={style.timePicker}
              />
              <div className={style.counterTip}>设置每天结束导入的时间</div>
            </div>
          </Card>

          {/* 是否启用 */}
          <Card className={style.card}>
            <div
              className={style.formItem}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span className={style.formLabel}>是否启用</span>
              <Switch
                checked={formData.status === 1}
                onChange={check =>
                  handleUpdateFormData({ status: check ? 1 : 0 })
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ContactImportForm;
