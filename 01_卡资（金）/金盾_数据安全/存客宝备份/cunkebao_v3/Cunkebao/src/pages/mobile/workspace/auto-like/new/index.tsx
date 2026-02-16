import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { Button, Input, Switch, Spin, message, Radio } from "antd";
import Layout from "@/components/Layout/Layout";
import DeviceSelection from "@/components/DeviceSelection";
import FriendSelection from "@/components/FriendSelection";
import StepIndicator from "@/components/StepIndicator";
import NavCommon from "@/components/NavCommon";
import {
  createAutoLikeTask,
  updateAutoLikeTask,
  fetchAutoLikeTaskDetail,
} from "./api";
import { CreateLikeTaskData, ContentType } from "./data";
import { useUserStore } from "@/store/module/user";
import style from "./new.module.scss";

const contentTypeLabels: Record<ContentType, string> = {
  text: "文字",
  image: "图片",
  video: "视频",
  link: "链接",
};

const steps = [
  { id: 1, title: "基础设置", subtitle: "设置点赞规则" },
  { id: 2, title: "设备选择", subtitle: "选择执行设备" },
  { id: 3, title: "人群选择", subtitle: "选择目标人群" },
];

const NewAutoLike: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { user } = useUserStore();
  const isAdmin = user?.isAdmin === 1;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [selectAllFriends, setSelectAllFriends] = useState(false);
  const [formData, setFormData] = useState<CreateLikeTaskData>({
    planType: 1, // 默认独立计划
    name: "",
    interval: 5,
    maxLikes: 200,
    startTime: "08:00",
    endTime: "22:00",
    contentTypes: ["text", "image", "video"],
    deviceGroups: [],
    deviceGroupsOptions: [],
    wechatFriends: [],
    wechatFriendsOptions: [],
    targetTags: [],
    friendMaxLikes: 10,
    enableFriendTags: false,
    friendTags: "",
  });

  useEffect(() => {
    if (id) {
      fetchTaskDetail();
    }
  }, [id]);

  const fetchTaskDetail = async () => {
    setIsLoading(true);
    try {
      const taskDetail = await fetchAutoLikeTaskDetail(id!);
      if (taskDetail) {
        const config = (taskDetail as any).config || taskDetail;
        setFormData({
          planType: config.planType ?? (taskDetail as any).planType ?? 1,
          name: taskDetail.name || "",
          interval: config.likeInterval || config.interval || 5,
          maxLikes: config.maxLikesPerDay || config.maxLikes || 200,
          startTime: config.timeRange?.start || config.startTime || "08:00",
          endTime: config.timeRange?.end || config.endTime || "22:00",
          contentTypes: config.contentTypes || ["text", "image", "video"],
          deviceGroups: config.deviceGroups || [],
          deviceGroupsOptions: config.deviceGroupsOptions || [],
          wechatFriends: config.wechatFriends || [],
          wechatFriendsOptions: config.wechatFriendsOptions || [],
          targetTags: config.targetTags || [],
          friendMaxLikes: config.friendMaxLikes || 10,
          enableFriendTags: config.enableFriendTags || false,
          friendTags: config.friendTags || "",
        });
        setAutoEnabled(
          (taskDetail as any).status === 1 ||
            (taskDetail as any).status === "running",
        );
        // 如果 wechatFriends 为空或未设置，可能表示选择了全部好友
        setSelectAllFriends(
          !config.wechatFriends || config.wechatFriends.length === 0
        );
      }
    } catch (error) {
      message.error("获取任务详情失败");
      navigate("/workspace/auto-like");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFormData = (data: Partial<CreateLikeTaskData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
    // 滚动到顶部
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    // 滚动到顶部
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleComplete = async () => {
    if (!formData.name.trim()) {
      message.warning("请输入任务名称");
      return;
    }
    if (!formData.deviceGroups || formData.deviceGroups.length === 0) {
      message.warning("请选择执行设备");
      return;
    }
    setIsSubmitting(true);
    try {
      // 如果选择了全部好友，提交时传空数组或特殊标识
      const submitData = {
        ...formData,
        wechatFriends: selectAllFriends ? [] : formData.wechatFriends,
        wechatFriendsOptions: selectAllFriends ? [] : formData.wechatFriendsOptions,
        selectAllFriends: selectAllFriends, // 添加标识字段
      };

      if (isEditMode) {
        await updateAutoLikeTask({ ...submitData, id });
        message.success("更新成功");
      } else {
        await createAutoLikeTask(submitData);
        message.success("创建成功");
      }
      navigate("/workspace/auto-like");
    } catch (error) {
      message.error(isEditMode ? "更新失败" : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 选择全部好友（仅设置标识）
  const handleSelectAllFriends = () => {
    if (!formData.deviceGroups || formData.deviceGroups.length === 0) {
      message.warning("请先选择执行设备");
      return;
    }

    if (selectAllFriends) {
      // 取消全选标识
      setSelectAllFriends(false);
      // 清空已选好友
      handleUpdateFormData({
        wechatFriends: [],
        wechatFriendsOptions: [],
      });
    } else {
      // 设置全选标识
      setSelectAllFriends(true);
      message.success("已标记为选择全部好友");
    }
  };

  // 步骤器
  const renderStepIndicator = () => (
    <StepIndicator steps={steps} currentStep={currentStep} />
  );

  // 步骤1：基础设置
  const renderBasicSettings = () => (
    <div className={style.container}>
      {/* 计划类型和任务名称 */}
      <div className={style.card}>
        {isAdmin && (
          <div className={style.formItem}>
            <div className={style.formLabel}>计划类型</div>
            <Radio.Group
              value={formData.planType}
              onChange={e => handleUpdateFormData({ planType: e.target.value })}
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
      </div>
      </div>

      {/* 点赞间隔 */}
      <div className={style.card}>
      <div className={style.formItem}>
        <div className={style.formLabel}>点赞间隔</div>
        <div className={style.counterRow}>
          <Button
            icon={<MinusOutlined />}
            onClick={() =>
              handleUpdateFormData({
                interval: Math.max(1, formData.interval - 1),
              })
            }
            className={style.counterBtn}
          />
          <div className={style.counterInputWrapper}>
            <Input
              type="number"
              min={1}
              max={60}
              value={formData.interval}
              onChange={e =>
                handleUpdateFormData({
                  interval: Number.parseInt(e.target.value) || 1,
                })
              }
              className={style.counterInput}
            />
          </div>
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              handleUpdateFormData({ interval: formData.interval + 1 })
            }
            className={style.counterBtn}
          />
          <span className={style.counterUnit}>秒</span>
        </div>
        <div className={style.counterTip}>设置两次点赞之间的最小时间间隔</div>
      </div>
      </div>

      {/* 每日最大点赞数 */}
      <div className={style.card}>
      <div className={style.formItem}>
        <div className={style.formLabel}>每日最大点赞数</div>
        <div className={style.counterRow}>
          <Button
            icon={<MinusOutlined />}
            onClick={() =>
              handleUpdateFormData({
                maxLikes: Math.max(1, formData.maxLikes - 10),
              })
            }
            className={style.counterBtn}
          />
          <div className={style.counterInputWrapper}>
            <Input
              type="number"
              min={1}
              max={500}
              value={formData.maxLikes}
              onChange={e =>
                handleUpdateFormData({
                  maxLikes: Number.parseInt(e.target.value) || 1,
                })
              }
              className={style.counterInput}
            />
          </div>
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              handleUpdateFormData({ maxLikes: formData.maxLikes + 10 })
            }
            className={style.counterBtn}
          />
          <span className={style.counterUnit}>次/天</span>
        </div>
        <div className={style.counterTip}>设置每天最多点赞的次数</div>
      </div>
      </div>

      {/* 点赞时间范围 */}
      <div className={style.card}>
      <div className={style.formItem}>
        <div className={style.formLabel}>点赞时间范围</div>
        <div className={style.timeRow}>
          <Input
            type="time"
            value={formData.startTime}
            onChange={e => handleUpdateFormData({ startTime: e.target.value })}
            className={style.inputTime}
          />
          <span className={style.timeSeparator}>至</span>
          <Input
            type="time"
            value={formData.endTime}
            onChange={e => handleUpdateFormData({ endTime: e.target.value })}
            className={style.inputTime}
          />
        </div>
        <div className={style.counterTip}>设置每天可以点赞的时间段</div>
      </div>
      </div>

      {/* 点赞内容类型 */}
      <div className={style.card}>
      <div className={style.formItem}>
        <div className={style.formLabel}>点赞内容类型</div>
        <div className={style.contentTypes}>
          {(["text", "image", "video"] as ContentType[]).map(type => (
            <Button
              key={type}
              type={
                formData.contentTypes.includes(type) ? "primary" : "default"
              }
              ghost={!formData.contentTypes.includes(type)}
              className={style.contentTypeBtn}
              onClick={() => {
                const newTypes = formData.contentTypes.includes(type)
                  ? formData.contentTypes.filter(t => t !== type)
                  : [...formData.contentTypes, type];
                handleUpdateFormData({ contentTypes: newTypes });
              }}
            >
              {contentTypeLabels[type]}
            </Button>
          ))}
        </div>
        <div className={style.counterTip}>选择要点赞的内容类型</div>
      </div>
      </div>

      {/* 好友标签和自动开启 */}
      <div className={style.card}>
      <div className={style.formItem}>
        <div className={style.switchRow}>
          <span className={style.switchLabel}>启用好友标签</span>
          <Switch
            checked={formData.enableFriendTags}
            onChange={checked =>
              handleUpdateFormData({ enableFriendTags: checked })
            }
            className={style.switch}
          />
        </div>
        {formData.enableFriendTags && (
            <div style={{ marginTop: 12 }}>
            <Input
              placeholder="请输入标签"
              value={formData.friendTags}
              onChange={e =>
                handleUpdateFormData({ friendTags: e.target.value })
              }
              className={style.input}
            />
            <div className={style.counterTip}>只给有此标签的好友点赞</div>
          </div>
        )}
      </div>
      <div className={style.formItem}>
        <div className={style.switchRow}>
          <span className={style.switchLabel}>自动开启</span>
          <Switch
            checked={autoEnabled}
            onChange={setAutoEnabled}
            className={style.switch}
          />
        </div>
      </div>
      </div>

      <Button
        type="primary"
        block
        onClick={handleNext}
        size="large"
        className={style.mainBtn}
        disabled={!formData.name.trim()}
      >
        下一步
      </Button>
    </div>
  );

  // 步骤2：设备选择
  const renderDeviceSelection = () => (
    <div className={style.container}>
      <div className={style.card}>
      <div className={style.formItem}>
        <DeviceSelection
          selectedOptions={formData.deviceGroupsOptions}
          onSelect={devices =>
            handleUpdateFormData({
              deviceGroups: devices.map(v => v.id),
              deviceGroupsOptions: devices,
            })
          }
          showInput={true}
          showSelectedList={true}
        />
      </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
      <Button
        onClick={handlePrev}
        className={style.prevBtn}
        size="large"
          style={{ flex: 1 }}
      >
        上一步
      </Button>
      <Button
        type="primary"
        onClick={handleNext}
        className={style.nextBtn}
        size="large"
        disabled={formData.deviceGroups.length === 0}
          style={{ flex: 1 }}
      >
        下一步
      </Button>
      </div>
    </div>
  );

  // 步骤3：好友设置
  const renderFriendSettings = () => (
    <div className={style.container}>
      <div className={style.card}>
      <div className={style.formItem}>
        <div className={style.friendSelectionHeader}>
          <div className={style.formLabel}>选择好友</div>
          <Button
            type={selectAllFriends ? "primary" : "default"}
            size="small"
            onClick={handleSelectAllFriends}
            disabled={!formData.deviceGroups || formData.deviceGroups.length === 0}
            className={style.selectAllBtn}
          >
            {selectAllFriends ? "已选择全部" : "选择全部好友"}
          </Button>
        </div>
        {selectAllFriends ? (
          <div className={style.selectAllTip}>
            <span className={style.selectAllIcon}>✓</span>
            已标记为选择全部好友
          </div>
        ) : (
          <FriendSelection
            selectedOptions={formData.wechatFriendsOptions || []}
            onSelect={friends => {
              handleUpdateFormData({
                wechatFriends: friends.map(f => f.id),
                wechatFriendsOptions: friends,
              });
              // 如果手动选择了好友，取消全选标识
              if (selectAllFriends) {
                setSelectAllFriends(false);
              }
            }}
            deviceIds={formData.deviceGroups}
          />
        )}
      </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
      <Button
        onClick={handlePrev}
        className={style.prevBtn}
        size="large"
          style={{ flex: 1 }}
      >
        上一步
      </Button>
      <Button
        type="primary"
        onClick={handleComplete}
        className={style.completeBtn}
        size="large"
        loading={isSubmitting}
        disabled={
          !selectAllFriends &&
          (!formData.wechatFriends || formData.wechatFriends.length === 0)
        }
          style={{ flex: 1 }}
      >
        {isEditMode ? "更新任务" : "创建任务"}
      </Button>
      </div>
    </div>
  );

  return (
    <Layout
      header={
        <>
          <NavCommon title={isEditMode ? "编辑自动点赞" : "新建自动点赞"} />
          {renderStepIndicator()}
        </>
      }
    >
      <div className={style.formBg}>
        {isLoading ? (
          <div className={style.formLoading}>
            <Spin />
          </div>
        ) : (
          <>
            {currentStep === 1 && renderBasicSettings()}
            {currentStep === 2 && renderDeviceSelection()}
            {currentStep === 3 && renderFriendSettings()}
          </>
        )}
      </div>
    </Layout>
  );
};

export default NewAutoLike;
