import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import {
  Input,
  Button,
  Card,
  Switch,
  Form,
  InputNumber,
  Select,
  Radio,
} from "antd";

const { TextArea } = Input;
import { fetchSocialMediaList, fetchPromotionSiteList } from "../index.api";
import { useUserStore } from "@/store/module/user";

interface BasicSettingsProps {
  defaultValues?: {
    name: string;
    startTime: string; // 允许推送的开始时间
    endTime: string; // 允许推送的结束时间
    maxPerDay: number;
    pushOrder: number; // 1: 按最早, 2: 按最新
    isLoop: number; // 0: 否, 1: 是
    pushType: number; // 0: 定时推送, 1: 立即推送
    status: number; // 0: 否, 1: 是
    isRandomTemplate?: number; // 是否随机模板：0=否，1=是
    postPushTags?: string[]; // 推送后标签数组
    targetType?: number; // 1=群推送，2=好友推送
    groupPushSubType?: number; // 1=群群发，2=群公告
    // 好友推送间隔设置
    friendIntervalMin?: number;
    friendIntervalMax?: number;
    messageIntervalMin?: number;
    messageIntervalMax?: number;
    // 群公告相关
    announcementContent?: string;
    enableAiRewrite?: number;
    aiRewritePrompt?: string;
    socialMediaId?: string;
    promotionSiteId?: string;
  };
  onNext: (values: any) => void;
  onSave: (values: any) => void;
  loading?: boolean;
}

export interface BasicSettingsRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const BasicSettings = forwardRef<BasicSettingsRef, BasicSettingsProps>(
  (
    {
      defaultValues = {
        name: "",
        startTime: "06:00", // 允许推送的开始时间
        endTime: "23:59", // 允许推送的结束时间
        maxPerDay: 20,
        pushOrder: 1,
        isLoop: 0, // 0: 否, 1: 是
        pushType: 0, // 0: 定时推送, 1: 立即推送
        status: 0, // 0: 否, 1: 是
        targetType: 1, // 默认1=群推送
        groupPushSubType: 1, // 默认1=群群发
        socialMediaId: undefined,
        promotionSiteId: undefined,
      },
    },
    ref,
  ) => {
    const { user } = useUserStore();
    const isAdmin = user?.isAdmin === 1;
    const [form] = Form.useForm();
    const [, forceUpdate] = useState({});
    const [socialMediaList, setSocialMediaList] = useState([]);
    const [promotionSiteList, setPromotionSiteList] = useState([]);
    const [loadingSocialMedia, setLoadingSocialMedia] = useState(false);
    const [loadingPromotionSite, setLoadingPromotionSite] = useState(false);

    // 确保组件初始化时能正确显示按钮状态
    useEffect(() => {
      forceUpdate({});
    }, []);

    // 监听 defaultValues 变化，更新表单值（用于编辑模式的数据回填）
    useEffect(() => {
      if (defaultValues) {
        form.setFieldsValue(defaultValues);
        forceUpdate({}); // 强制更新以刷新按钮状态

        // 如果有社交媒体ID，加载对应的推广站点列表
        if (defaultValues.socialMediaId && defaultValues.socialMediaId !== "") {
          const socialMediaIdNum = Number(defaultValues.socialMediaId);
          if (!isNaN(socialMediaIdNum)) {
            setLoadingPromotionSite(true);
            fetchPromotionSiteList(socialMediaIdNum)
              .then(res => {
                setPromotionSiteList(res);
              })
              .finally(() => {
                setLoadingPromotionSite(false);
              });
          }
        }
      }
    }, [defaultValues, form]);

    // 组件挂载时获取社交媒体列表
    useEffect(() => {
      setLoadingSocialMedia(true);
      fetchSocialMediaList()
        .then(res => {
          setSocialMediaList(res);
        })
        .finally(() => {
          setLoadingSocialMedia(false);
        });
    }, []);

    // 监听社交媒体选择变化
    const handleSocialMediaChange = value => {
      form.setFieldsValue({ socialMediaId: value });
      // 清空推广站点选择
      form.setFieldsValue({ promotionSiteId: undefined });
      setPromotionSiteList([]);

      if (value) {
        setLoadingPromotionSite(true);
        fetchPromotionSiteList(value)
          .then(res => {
            setPromotionSiteList(res);
          })
          .finally(() => {
            setLoadingPromotionSite(false);
          });
      }
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          await form.validateFields();
          return true;
        } catch (error) {
          console.log("BasicSettings 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));
    const handlePushOrderChange = (value: number) => {
      form.setFieldsValue({ pushOrder: value });
      forceUpdate({}); // 强制组件重新渲染
    };
    return (
      <div style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={defaultValues}
          onValuesChange={(changedValues, allValues) => {
            // 当pushOrder值变化时，强制更新组件
            if ("pushOrder" in changedValues) {
              forceUpdate({});
            }
          }}
        >
          {/* 计划类型和任务名称 */}
          <Card style={{ marginBottom: 16 }}>
            {/* 计划类型：仅管理员可见 */}
            {isAdmin && (
              <Form.Item label="计划类型" name="planType" initialValue={1}>
                <Radio.Group>
                  <Radio value={0}>全局计划</Radio>
                  <Radio value={1}>独立计划</Radio>
                </Radio.Group>
              </Form.Item>
            )}

            {/* 任务名称 */}
            <Form.Item
              label="任务名称"
              name="name"
              rules={[
                { required: true, message: "请输入任务名称" },
                { min: 2, max: 50, message: "任务名称长度在2-50个字符之间" },
              ]}
            >
              <Input placeholder="请输入任务名称" />
            </Form.Item>
          </Card>

          {/* 推送目标类型 - 暂时隐藏，但保留默认值 */}
          <Form.Item
            name="targetType"
            hidden
            initialValue={1}
          >
            <Input type="hidden" />
          </Form.Item>

          {/* 群推送子类型 - 暂时隐藏，但保留默认值 */}
          <Form.Item
            name="groupPushSubType"
            hidden
            initialValue={1}
          >
            <Input type="hidden" />
          </Form.Item>

          {/* 推送类型和时间段 */}
          <Card style={{ marginBottom: 16 }}>
            {/* 推送类型 */}
            <Form.Item
              label="推送类型"
              name="pushType"
              rules={[{ required: true, message: "请选择推送类型" }]}
            >
              <Radio.Group>
                <Radio value={0}>定时推送</Radio>
                <Radio value={1}>立即推送</Radio>
              </Radio.Group>
            </Form.Item>
            {/* 允许推送的时间段 - 只在定时推送时显示 */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.pushType !== currentValues.pushType
              }
            >
              {({ getFieldValue }) => {
                // 只在pushType为0（定时推送）时显示时间段设置
                return getFieldValue("pushType") === 0 ? (
                  <Form.Item label="允许推送的时间段">
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <Form.Item
                        name="startTime"
                        noStyle
                        rules={[{ required: true, message: "请选择开始时间" }]}
                      >
                        <Input type="time" style={{ width: 120 }} />
                      </Form.Item>
                      <span style={{ color: "#888" }}>至</span>
                      <Form.Item
                        name="endTime"
                        noStyle
                        rules={[{ required: true, message: "请选择结束时间" }]}
                      >
                        <Input type="time" style={{ width: 120 }} />
                      </Form.Item>
                    </div>
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
          </Card>

          {/* 每日推送和推送顺序 - 群公告时隐藏 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.targetType !== currentValues.targetType ||
              prevValues.groupPushSubType !== currentValues.groupPushSubType
            }
          >
            {({ getFieldValue }) => {
              const isGroupAnnouncement = getFieldValue("targetType") === 1 && getFieldValue("groupPushSubType") === 2;
              return !isGroupAnnouncement ? (
                <Card style={{ marginBottom: 16 }}>
                  {/* 每日推送 */}
                  <Form.Item
                    label="每日推送"
                    name="maxPerDay"
                    rules={[
                      { required: true, message: "请输入每日推送数量" },
                      {
                        type: "number",
                        min: 1,
                        max: 100,
                        message: "每日推送数量在1-100之间",
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: 120 }}
                      addonAfter="条内容"
                    />
                  </Form.Item>

                  {/* 推送顺序 */}
                  <Form.Item
                    label="推送顺序"
                    name="pushOrder"
                    rules={[{ required: true, message: "请选择推送顺序" }]}
                  >
                    <div style={{ display: "flex" }}>
                      <Button
                        type={
                          form.getFieldValue("pushOrder") == 1 ? "primary" : "default"
                        }
                        style={{ borderRadius: "6px 0 0 6px" }}
                        onClick={() => handlePushOrderChange(1)}
                      >
                        按最早
                      </Button>
                      <Button
                        type={
                          form.getFieldValue("pushOrder") == 2 ? "primary" : "default"
                        }
                        style={{ borderRadius: "0 6px 6px 0", marginLeft: -1 }}
                        onClick={() => handlePushOrderChange(2)}
                      >
                        按最新
                      </Button>
                    </div>
                  </Form.Item>
                </Card>
              ) : null;
            }}
          </Form.Item>

          {/* 京东联盟和随机模板 - 仅群推送显示，群公告时隐藏 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.targetType !== currentValues.targetType ||
              prevValues.groupPushSubType !== currentValues.groupPushSubType
            }
          >
            {({ getFieldValue }) => {
              const isGroupAnnouncement = getFieldValue("targetType") === 1 && getFieldValue("groupPushSubType") === 2;
              return getFieldValue("targetType") === 1 && !isGroupAnnouncement ? (
                <Card style={{ marginBottom: 16 }}>
                  {/* 京东联盟 */}
                  <Form.Item label="京东联盟" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                      <Form.Item name="socialMediaId" noStyle>
                        <Select
                          placeholder="请选择社交媒体"
                          style={{ width: 200 }}
                          loading={loadingSocialMedia}
                          onChange={handleSocialMediaChange}
                          options={socialMediaList.map(item => ({
                            label: item.name,
                            value: item.id,
                          }))}
                        />
                      </Form.Item>

                      <Form.Item name="promotionSiteId" noStyle>
                        <Select
                          placeholder="请选择推广站点"
                          style={{ width: 200 }}
                          loading={loadingPromotionSite}
                          disabled={!form.getFieldValue("socialMediaId")}
                          options={promotionSiteList.map(item => ({
                            label: item.name,
                            value: item.id,
                          }))}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>

                  {/* 是否随机模板 */}
                  <Form.Item
                    label="是否随机模板"
                    name="isRandomTemplate"
                    valuePropName="checked"
                    getValueFromEvent={checked => (checked ? 1 : 0)}
                    getValueProps={value => ({ checked: value === 1 })}
                  >
                    <Switch />
                  </Form.Item>
                </Card>
              ) : null;
            }}
          </Form.Item>

          {/* 推送后标签、循环推送和是否启用 */}
          <Card style={{ marginBottom: 16 }}>
            {/* 推送后标签 - 仅好友推送显示 */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.targetType !== currentValues.targetType
              }
            >
              {({ getFieldValue }) => {
                return getFieldValue("targetType") === 2 ? (
                  <Form.Item
                    label="推送后标签"
                    name="postPushTags"
                    tooltip="推送后自动添加的标签，多个标签用逗号分隔"
                  >
                    <Input
                      placeholder="请输入标签，多个用逗号分隔"
                      onChange={e => {
                        const tags = e.target.value
                          .split(",")
                          .map(tag => tag.trim())
                          .filter(tag => tag.length > 0);
                        form.setFieldValue("postPushTags", tags);
                      }}
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            {/* 是否循环推送 - 群推送和好友推送都显示，群公告时隐藏，好友推送默认为否 */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.targetType !== currentValues.targetType ||
                prevValues.groupPushSubType !== currentValues.groupPushSubType
              }
            >
              {({ getFieldValue }) => {
                const isGroupAnnouncement = getFieldValue("targetType") === 1 && getFieldValue("groupPushSubType") === 2;
                return !isGroupAnnouncement ? (
                  <Form.Item
                    label="是否循环推送"
                    name="isLoop"
                    valuePropName="checked"
                    getValueFromEvent={checked => (checked ? 1 : 0)}
                    getValueProps={value => ({ checked: value === 1 })}
                    initialValue={0} // 默认为否
                  >
                    <Switch />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            {/* 是否启用 */}
            <Form.Item
              label="是否启用"
              name="status"
              valuePropName="checked"
              getValueFromEvent={checked => (checked ? 1 : 0)}
              getValueProps={value => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
          </Card>

          {/* 推送间隔设置 - 仅好友推送显示 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.targetType !== currentValues.targetType
            }
          >
            {({ getFieldValue }) => {
              return getFieldValue("targetType") === 2 ? (
                <Card style={{ marginBottom: 16 }}>
                  <Form.Item label="目标间间隔（秒）">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Form.Item
                        name="friendIntervalMin"
                        noStyle
                        rules={[{ required: true, message: "请输入最小间隔" }]}
                      >
                        <InputNumber
                          min={1}
                          placeholder="最小"
                          style={{ width: 100 }}
                        />
                      </Form.Item>
                      <span style={{ color: "#888" }}>至</span>
                      <Form.Item
                        name="friendIntervalMax"
                        noStyle
                        rules={[{ required: true, message: "请输入最大间隔" }]}
                      >
                        <InputNumber
                          min={1}
                          placeholder="最大"
                          style={{ width: 100 }}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                  <Form.Item label="消息间间隔（秒）">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Form.Item
                        name="messageIntervalMin"
                        noStyle
                        rules={[{ required: true, message: "请输入最小间隔" }]}
                      >
                        <InputNumber
                          min={1}
                          placeholder="最小"
                          style={{ width: 100 }}
                        />
                      </Form.Item>
                      <span style={{ color: "#888" }}>至</span>
                      <Form.Item
                        name="messageIntervalMax"
                        noStyle
                        rules={[{ required: true, message: "请输入最大间隔" }]}
                      >
                        <InputNumber
                          min={1}
                          placeholder="最大"
                          style={{ width: 100 }}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                </Card>
              ) : null;
            }}
          </Form.Item>

          {/* 群公告设置 - 仅当targetType=1且groupPushSubType=2时显示 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.targetType !== currentValues.targetType ||
              prevValues.groupPushSubType !== currentValues.groupPushSubType
            }
          >
            {({ getFieldValue }) => {
              return getFieldValue("targetType") === 1 &&
                getFieldValue("groupPushSubType") === 2 ? (
                <Card style={{ marginBottom: 16 }}>
                  <Form.Item
                    label="群公告内容"
                    name="announcementContent"
                    rules={[
                      { required: true, message: "请输入群公告内容" },
                      { min: 1, max: 500, message: "群公告内容长度在1-500个字符之间" },
                    ]}
                  >
                    <TextArea
                      rows={4}
                      placeholder="请输入群公告内容"
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>
                  <Form.Item
                    label="是否启用AI改写"
                    name="enableAiRewrite"
                    valuePropName="checked"
                    getValueFromEvent={checked => (checked ? 1 : 0)}
                    getValueProps={value => ({ checked: value === 1 })}
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.enableAiRewrite !== currentValues.enableAiRewrite
                    }
                  >
                    {({ getFieldValue }) => {
                      return getFieldValue("enableAiRewrite") === 1 ? (
                        <Form.Item
                          label="AI改写提示词"
                          name="aiRewritePrompt"
                          rules={[
                            { required: true, message: "请输入AI改写提示词" },
                          ]}
                        >
                          <TextArea
                            rows={3}
                            placeholder="请输入AI改写提示词"
                          />
                        </Form.Item>
                      ) : null;
                    }}
                  </Form.Item>
                </Card>
              ) : null;
            }}
          </Form.Item>

          {/* 推送类型提示 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.pushType !== currentValues.pushType
            }
          >
            {({ getFieldValue }) => {
              const pushType = getFieldValue("pushType");
              if (pushType === 1) {
                return (
                  <Card style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        background: "#fffbe6",
                        border: "1px solid #ffe58f",
                        borderRadius: 4,
                        padding: 8,
                        color: "#ad8b00",
                      }}
                    >
                      如果启用立即推送，系统会把内容库里所有的内容按顺序推送到指定的社群
                    </div>
                  </Card>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </div>
    );
  },
);

BasicSettings.displayName = "BasicSettings";

export default BasicSettings;
