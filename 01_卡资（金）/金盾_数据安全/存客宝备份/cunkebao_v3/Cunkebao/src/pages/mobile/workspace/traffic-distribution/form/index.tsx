import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Button, Radio, Slider, TimePicker, message, Card } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import style from "./index.module.scss";
import StepIndicator from "@/components/StepIndicator";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import AccountSelection from "@/components/AccountSelection";
import { AccountItem } from "@/components/AccountSelection/data";
import DeviceSelection from "@/components/DeviceSelection";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import PoolSelection from "@/components/PoolSelection";
import { PoolSelectionItem } from "@/components/PoolSelection/data";
import {
  getTrafficDistributionDetail,
  updateTrafficDistribution,
  createTrafficDistribution,
} from "./api";
import type { TrafficDistributionFormData } from "./data";
import { useUserStore } from "@/store/module/user";
import dayjs from "dayjs";

const stepList = [
  { id: 1, title: "基本信息", subtitle: "基本信息" },
  { id: 2, title: "目标设置", subtitle: "目标设置" },
  { id: 3, title: "流量池选择", subtitle: "流量池选择" },
];

const TrafficDistributionForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useUserStore();
  const isAdmin = user?.isAdmin === 1;

  const [current, setCurrent] = useState(0);
  const [selectedDevices, setSelectedDevices] = useState<DeviceSelectionItem[]>(
    [],
  );
  // 设备组和账号组数据
  const [deviceGroups, setDeviceGroups] = useState<DeviceSelectionItem[]>([]);
  const [deviceGroupsOptions, setDeviceGroupsOptions] = useState<
    DeviceSelectionItem[]
  >([]);
  const [accountGroups, setAccountGroups] = useState<AccountItem[]>([]);
  const [accountGroupsOptions, setAccountGroupsOptions] = useState<
    AccountItem[]
  >([]);
  // 使用 Form 管理字段，配合 useWatch 读取值
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [poolGroupsOptions, setPoolGroupsOptions] = useState<
    PoolSelectionItem[]
  >([]);

  // 监听表单字段变化（antd v5 推荐）
  const maxPerDay = Form.useWatch("maxPerDay", form);
  const timeType = Form.useWatch("timeType", form);

  // 生成默认名称
  const generateDefaultName = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, "");
    return `流量分发 ${dateStr} ${timeStr}`;
  };

  const fetchDetail = useCallback(async () => {
    if (!id) return;

    setDetailLoading(true);
    try {
      const detail = await getTrafficDistributionDetail(id);

      // 回填表单数据
      const config = detail.config;
      form.setFieldsValue({
        name: detail.name,
        distributeType: config.distributeType,
        maxPerDay: config.maxPerDay,
        timeType: config.timeType,
      });

      // 设置账号组数据
      setAccountGroups(config.accountGroups || []);
      setAccountGroupsOptions(config.accountGroupsOptions || []);

      // 设置设备组数据
      setDeviceGroups(config.deviceGroups || []);
      setDeviceGroupsOptions(config.deviceGroupsOptions || []);
      setSelectedDevices(config.deviceGroupsOptions || []);
      //设置流量池
      setPoolGroupsOptions(config.poolGroupsOptions || []);

      // 设置时间范围 - 使用dayjs格式
      if (config.timeType === 2 && config.startTime && config.endTime) {
        try {
          const startTimeMatch = config.startTime.match(/^(\d{1,2}):(\d{2})$/);
          const endTimeMatch = config.endTime.match(/^(\d{1,2}):(\d{2})$/);

          if (startTimeMatch && endTimeMatch) {
            const startHour = parseInt(startTimeMatch[1], 10);
            const startMinute = parseInt(startTimeMatch[2], 10);
            const endHour = parseInt(endTimeMatch[1], 10);
            const endMinute = parseInt(endTimeMatch[2], 10);

            // 验证时间有效性
            if (
              startHour >= 0 &&
              startHour < 24 &&
              startMinute >= 0 &&
              startMinute < 60 &&
              endHour >= 0 &&
              endHour < 24 &&
              endMinute >= 0 &&
              endMinute < 60
            ) {
              const startTime = dayjs()
                .hour(startHour)
                .minute(startMinute)
                .second(0);
              const endTime = dayjs().hour(endHour).minute(endMinute).second(0);
              form.setFieldsValue({ timeRange: [startTime, endTime] });
            } else {
              console.warn("时间格式无效:", config.startTime, config.endTime);
            }
          } else {
            console.warn("时间格式不匹配:", config.startTime, config.endTime);
          }
        } catch (error) {
          console.error("解析时间失败:", error);
        }
      }
    } catch (error) {
      console.error("获取详情失败:", error);
      message.error("获取详情失败");
    } finally {
      setDetailLoading(false);
    }
  }, [id, form]);

  // 获取详情数据
  useEffect(() => {
    if (isEdit && id) {
      fetchDetail();
    }
  }, [isEdit, id, fetchDetail]);

  const handleSubmit = async (values?: any) => {
    setLoading(true);
    try {
      // 校验流量池至少选择一个
      // if (!poolGroupsOptions || poolGroupsOptions.length === 0) {
      //   message.error("请至少选择一个流量池");
      //   setLoading(false);
      //   return;
      // }
      // 如果没有传递values参数，从表单中获取
      const formValues = values ?? form.getFieldsValue();

      const formData: TrafficDistributionFormData = {
        id,
        type: 5, // 流量分发类型
        name: formValues.name,
        source: "",
        sourceIcon: "",
        description: "",
        distributeType: formValues.distributeType,
        maxPerDay: formValues.maxPerDay,
        timeType: formValues.timeType,
        startTime:
          formValues.timeType === 2 && formValues.timeRange?.[0]
            ? formValues.timeRange[0].format("HH:mm")
            : "",
        endTime:
          formValues.timeType === 2 && formValues.timeRange?.[1]
            ? formValues.timeRange[1].format("HH:mm")
            : "",
        deviceGroups: deviceGroupsOptions.map(v => v.id),
        deviceGroupsOptions,
        accountGroups: accountGroupsOptions.map(v => v.id),
        accountGroupsOptions,
        poolGroups: poolGroupsOptions.map(v => v.id),
        enabled: true,
        planType: formValues.planType ?? 1,
      };

      if (isEdit) {
        await updateTrafficDistribution(formData);
        message.success("更新流量分发成功");
      } else {
        await createTrafficDistribution(formData);
        message.success("新建流量分发成功");
      }

      navigate(-1);
    } catch (e) {
      message.error(isEdit ? "更新失败" : "新建失败");
    } finally {
      setLoading(false);
    }
  };

  // 步骤切换
  const next = () => {
    if (current === 0) {
      // 第一步需要验证表单
      form
        .validateFields()
        .then(() => {
          setCurrent(cur => cur + 1);
        })
        .catch(() => {
          // 验证失败，不进行下一步
        });
    } else if (current === 1) {
      // 第二步：目标设置至少需要选择一个设备
      const hasDevice =
        Array.isArray(selectedDevices) && selectedDevices.length > 0;
      if (!hasDevice) {
        message.error("请至少选择一个设备");
        return;
      }
      setCurrent(cur => cur + 1);
    } else {
      setCurrent(cur => cur + 1);
    }
  };
  const prev = () => setCurrent(cur => cur - 1);

  const handlePoolSelect = (params: PoolSelectionItem[]) => {
    setPoolGroupsOptions(params);
  };

  // 移除未使用的输入同步函数
  return (
    <Layout
      header={
        <>
          <NavCommon title={isEdit ? "编辑流量分发" : "新建流量分发"} />
          <div className={style.formStepsWrap}>
            <StepIndicator currentStep={current + 1} steps={stepList} />
          </div>
        </>
      }
      loading={detailLoading}
      footer={
        <div className="footer-btn-group">
          {current > 0 && (
            <Button size="large" onClick={prev}>
              上一步
            </Button>
          )}
          {current < 2 ? (
            <Button size="large" type="primary" onClick={next}>
              下一步
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={() => form.submit()}
              loading={loading}
            >
              提交
            </Button>
          )}
        </div>
      }
    >
      <div className={style.formPage}>
        <div className={style.formBody}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: isEdit ? "" : generateDefaultName(),
              planType: 1,
              distributeType: 1,
              maxPerDay: 50,
              timeType: 1,
            }}
            disabled={detailLoading}
            onFinish={handleSubmit}
            style={{ display: current === 0 ? "block" : "none" }}
          >
            {/* 计划类型和计划名称 */}
            <Card className={style.card}>
              {isAdmin && (
                <Form.Item label="计划类型" name="planType">
                  <Radio.Group className={style.radioGroupHorizontal}>
                    <Radio value={0}>全局计划</Radio>
                    <Radio value={1}>独立计划</Radio>
                  </Radio.Group>
                </Form.Item>
              )}
              <Form.Item
                label="计划名称"
                name="name"
                rules={[{ required: true, message: "请输入计划名称" }]}
              >
                <Input placeholder="流量分发 20250724 1700" maxLength={30} />
              </Form.Item>
            </Card>

            {/* 分配方式 */}
            <Card className={style.card}>
              <Form.Item label="分配方式" name="distributeType" required>
                <Radio.Group className={style.radioGroup}>
                  <Radio value={1}>
                    均分配
                    <span className={style.radioDesc}>
                      (流量将均分分配给所有客服)
                    </span>
                  </Radio>
                  <Radio value={2}>
                    优先级分配
                    <span className={style.radioDesc}>
                      (按客服优先级顺序分配)
                    </span>
                  </Radio>
                  <Radio value={3}>
                    比例分配
                    <span className={style.radioDesc}>(按设置比例分配流量)</span>
                  </Radio>
                </Radio.Group>
              </Form.Item>
            </Card>

            {/* 分配限制 */}
            <Card className={style.card}>
              <Form.Item label="分配限制" required>
                <div className={style.sliderLabelWrap}>
                  <span>每日最大分配量</span>
                  <span className={style.sliderValue}>
                    {maxPerDay || 0} 人/天
                  </span>
                </div>
                <Form.Item
                  name="maxPerDay"
                  noStyle
                  rules={[{ required: true, message: "请设置每日最大分配量" }]}
                >
                  <Slider min={1} max={1000} className={style.slider} />
                </Form.Item>
                <div className={style.sliderDesc}>限制每天最多分配的流量数量</div>
              </Form.Item>
            </Card>

            {/* 时间限制 */}
            <Card className={style.card}>
              <Form.Item label="时间限制" name="timeType" required>
                <Radio.Group className={style.radioGroupHorizontal}>
                  <Radio value={1}>全天分配</Radio>
                  <Radio value={2}>自定义时间段</Radio>
                </Radio.Group>
              </Form.Item>
              {timeType === 2 && (
                <Form.Item
                  label=""
                  name="timeRange"
                  required
                  dependencies={["timeType"]}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (getFieldValue("timeType") === 1) {
                          return Promise.resolve();
                        }
                        if (value && value.length === 2) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("请选择开始和结束时间"));
                      },
                    }),
                  ]}
                >
                  <TimePicker.RangePicker
                    format="HH:mm"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              )}
            </Card>

            {/* 客服选择 */}
            <Card className={style.card}>
              <div className={style.sectionTitle}>客服选择</div>
              <div className={style.formBlock}>
                <AccountSelection
                  selectedOptions={accountGroupsOptions}
                  onSelect={accounts => {
                    setAccountGroupsOptions(accounts);
                  }}
                  placeholder="请选择客服"
                  showSelectedList={true}
                  selectedListMaxHeight={300}
                  accountGroups={accountGroups}
                />
              </div>
            </Card>
          </Form>
          {current === 1 && (
            <Card className={style.card}>
              <div className={style.sectionTitle}>目标设置</div>
              <div className={style.formBlock}>
                <DeviceSelection
                  selectedOptions={deviceGroupsOptions}
                  onSelect={devices => {
                    setSelectedDevices(devices);
                    setDeviceGroupsOptions(devices);
                  }}
                  placeholder="请选择设备"
                  showSelectedList={true}
                  selectedListMaxHeight={300}
                  deviceGroups={deviceGroups}
                />
              </div>
            </Card>
          )}
          {current === 2 && (
            <Card className={style.card}>
              <PoolSelection
                selectedOptions={poolGroupsOptions}
                onSelect={handlePoolSelect}
                placeholder="请选择流量池"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TrafficDistributionForm;
