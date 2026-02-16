import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input, Button, Tag, Switch, Spin, message, Modal, Radio } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  CloseOutlined,
  DownloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { Toast, SpinLoading } from "antd-mobile";
import { Checkbox, Popup } from "antd-mobile";
import { uploadFile } from "@/api/common";
import styles from "./base.module.scss";
import { posterTemplates } from "./base.data";
import GroupSelection from "@/components/GroupSelection";
import FileUpload from "@/components/Upload/FileUpload";
import FriendSelection from "@/components/FriendSelection";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import { useUserStore } from "@/store/module/user";
import { fetchChannelList } from "@/pages/mobile/workspace/distribution-management/api";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import request from "@/api/request";

interface BasicSettingsProps {
  isEdit: boolean;
  formData: any;
  onChange: (data: any) => void;
  sceneList: any[];
  sceneLoading: boolean;
  planId?: string; // 计划ID，用于生成渠道二维码
}

interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
}

const generatePosterMaterials = (): Material[] => {
  return posterTemplates.map(template => ({
    id: template.id,
    name: template.name,
    type: "poster",
    url: template.url,
  }));
};

const BasicSettings: React.FC<BasicSettingsProps> = ({
  isEdit,
  formData,
  onChange,
  sceneList,
  sceneLoading,
  planId,
}) => {
  const { user } = useUserStore();
  const isAdmin = user?.isAdmin === 1; // 判断是否是管理员
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [materials] = useState<Material[]>(generatePosterMaterials());
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>(
    formData.posters?.length > 0 ? formData.posters : [],
  );

  // 分销相关状态
  const [distributionEnabled, setDistributionEnabled] = useState<boolean>(
    formData.distributionEnabled ?? false,
  );
  const [channelModalVisible, setChannelModalVisible] = useState(false);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelList, setChannelList] = useState<any[]>([]);
  const [tempSelectedChannelIds, setTempSelectedChannelIds] = useState<
    Array<string | number>
  >(formData.distributionChannelIds || []);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelCurrentPage, setChannelCurrentPage] = useState(1);
  const [channelTotal, setChannelTotal] = useState(0);
  const [customerReward, setCustomerReward] = useState<number | undefined>(
    formData.distributionCustomerReward
  );
  const [addReward, setAddReward] = useState<number | undefined>(
    formData.distributionAddReward
  );

  // 二维码相关状态
  const [qrCodeMap, setQrCodeMap] = useState<Record<string | number, {
    qrCode: string;
    url: string;
    loading: boolean;
  }>>({});
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [currentQrChannel, setCurrentQrChannel] = useState<{
    id: string | number;
    name: string;
    code?: string;
  } | null>(null);

  const PAGE_SIZE = 20;

  // 自定义标签相关状态
  const [customTagInput, setCustomTagInput] = useState("");
  const [customTagsOptions, setCustomTagsOptions] = useState<string[]>(
    formData.customTagsOptions || [],
  );
  const [tips, setTips] = useState(formData.tips || "");
  const [selectedScenarioTags, setSelectedScenarioTags] = useState(
    formData.scenarioTags || [],
  );
  const [selectedCustomTags, setSelectedCustomTags] = useState(
    formData.customTags || [],
  );
  // 电话获客相关状态
  const [phoneSettings, setPhoneSettings] = useState({
    autoAdd: formData.phoneSettings?.autoAdd ?? true,
    speechToText: formData.phoneSettings?.speechToText ?? true,
    questionExtraction: formData.phoneSettings?.questionExtraction ?? true,
  });


  // 新增：自定义海报相关状态
  const [customPosters, setCustomPosters] = useState<Material[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 新增：用于文件选择的ref
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // 初始化时，如果没有选择场景，默认选择海报获客
  useEffect(() => {
    if (!formData.scenario) {
      onChange({ ...formData, scenario: "haibao" });
    }
  }, [formData, onChange]);

  // 监听 formData 变化，同步自定义标签和获客标签状态
  useEffect(() => {
    setCustomTagsOptions(formData.customTagsOptions || []);
    setSelectedCustomTags(formData.customTags || []);
  }, [formData.customTagsOptions, formData.customTags]);

  // 监听获客标签变化
  useEffect(() => {
    setSelectedScenarioTags(formData.scenarioTags || []);
  }, [formData.scenarioTags]);

  useEffect(() => {
    setTips(formData.tips || "");
  }, [formData.tips]);

  // 当切换到海报场景且 tips 为空时，设置默认值
  useEffect(() => {
    if (formData.scenario === 1 && !formData.tips) {
      const defaultTips = "请注意消息，稍后加你微信";
      onChange({ ...formData, tips: defaultTips });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.scenario]);


  // 选中场景
  const handleScenarioSelect = (sceneId: number) => {
    onChange({ ...formData, scenario: sceneId });
  };

  // 选中/取消标签
  const handleScenarioTagToggle = (tag: string) => {
    const newTags = selectedScenarioTags.includes(tag)
      ? selectedScenarioTags.filter((t: string) => t !== tag)
      : [...selectedScenarioTags, tag];
    setSelectedScenarioTags(newTags);
    onChange({ ...formData, scenarioTags: newTags });
  };

  const handleCustomTagToggle = (tag: string) => {
    const newTags = selectedCustomTags.includes(tag)
      ? selectedCustomTags.filter((t: string) => t !== tag)
      : [...selectedCustomTags, tag];
    setSelectedCustomTags(newTags);
    onChange({ ...formData, customTags: newTags });
  };
  // 添加自定义标签
  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const newTag = customTagInput.trim();
    // 已存在则忽略
    if (customTagsOptions.includes(newTag)) {
      // 若未选中则顺便选中
      const maybeSelected = selectedCustomTags.includes(newTag)
        ? selectedCustomTags
        : [...selectedCustomTags, newTag];
      setSelectedCustomTags(maybeSelected);
      onChange({ ...formData, customTags: maybeSelected });
      setCustomTagInput("");
      return;
    }

    const updatedOptions = [...customTagsOptions, newTag];
    const updatedSelected = [...selectedCustomTags, newTag];
    setCustomTagsOptions(updatedOptions);
    setSelectedCustomTags(updatedSelected);
    setCustomTagInput("");
    onChange({
      ...formData,
      customTagsOptions: updatedOptions,
      customTags: updatedSelected,
    });
  };

  // 删除自定义标签
  const handleRemoveCustomTag = (tagName: string) => {
    const updatedOptions = customTagsOptions.filter(
      (tag: string) => tag !== tagName,
    );
    setCustomTagsOptions(updatedOptions);

    // 同时从选中的自定义标签中移除
    const updatedSelectedCustom = selectedCustomTags.filter(
      (t: string) => t !== tagName,
    );
    setSelectedCustomTags(updatedSelectedCustom);

    onChange({
      ...formData,
      customTagsOptions: updatedOptions,
      customTags: updatedSelectedCustom,
    });
  };

  // 新增：删除自定义海报
  const handleRemoveCustomPoster = (id: string) => {
    setCustomPosters(prev => prev.filter(p => p.id !== id));
    // 如果选中则取消选中
    if (selectedMaterials.some(m => m.id === id)) {
      setSelectedMaterials([]);
      onChange({ ...formData, posters: [] });
    }
  };

  // 修改：选中/取消选中海报
  const handleMaterialSelect = (material: Material) => {
    const isSelected = selectedMaterials.some(m => m.id === material.id);
    if (isSelected) {
      setSelectedMaterials([]);
      onChange({ ...formData, posters: [] });
    } else {
      setSelectedMaterials([material]);
      onChange({ ...formData, posters: [material] });
    }
  };

  // 新增：全屏预览
  const handlePreviewImage = (url: string) => {
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const template =
      "姓名/备注,电话号码,微信号,来源,订单金额,下单日期\n张三,13800138000,wxid_123,抖音,99.00,2024-03-03";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "订单导入模板.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // 当前选中的场景对象
  const currentScene = sceneList.find(s => s.id === formData.scenario);
  //打开订单
  const openOrder =
    formData.scenario !== 2 ? { display: "none" } : { display: "block" };

  const openPoster =
    formData.scenario !== 1 ? { display: "none" } : { display: "block" };

  const handleWechatGroupSelect = (groups: GroupSelectionItem[]) => {
    onChange({
      ...formData,
      wechatGroups: groups.map(v => v.id),
      wechatGroupsOptions: groups,
    });
  };

  // ==================== 渠道设置相关函数 ====================
  // 生成H5链接
  const generateH5Url = (channelId: string | number, channelCode?: string): string => {
    if (planId) {
      return `https://h5.ckb.quwanzhi.com/#/pages/form/input2?id=${planId}&channelId=${channelId}`;
    } else if (channelCode) {
      return `https://h5.ckb.quwanzhi.com/#/pages/form/input2?channelCode=${channelCode}`;
    }
    return "";
  };

  // 生成渠道二维码
  const generateChannelQRCode = async (channelId: string | number, channelCode?: string) => {
    const h5Url = generateH5Url(channelId, channelCode);

    if (qrCodeMap[channelId]) {
      if (!qrCodeMap[channelId].url) {
        setQrCodeMap(prev => ({
          ...prev,
          [channelId]: { ...prev[channelId], url: h5Url },
        }));
      }
      if (qrCodeMap[channelId].qrCode) {
        return;
      }
    } else {
      setQrCodeMap(prev => ({
        ...prev,
        [channelId]: {
          qrCode: "",
          url: h5Url,
          loading: true,
        },
      }));
    }

    setQrCodeMap(prev => ({
      ...prev,
      [channelId]: { ...prev[channelId], loading: true },
    }));

    try {
      const params: any = {};
      if (planId) {
        params.taskId = planId;
        params.channelId = channelId;
      } else if (channelCode) {
        params.channelCode = channelCode;
      }

      const response = await request(
        `/v1/plan/getWxMinAppCode`,
        params,
        "GET"
      );

      if (response && typeof response === 'string' && response.startsWith('data:image')) {
        setQrCodeMap(prev => ({
          ...prev,
          [channelId]: {
            qrCode: response,
            url: h5Url,
            loading: false,
          },
        }));
      } else {
        throw new Error("二维码生成失败");
      }
    } catch (error: any) {
      Toast.show({
        content: error.message || "生成二维码失败",
        position: "top",
      });
      setQrCodeMap(prev => ({
        ...prev,
        [channelId]: {
          ...prev[channelId],
          qrCode: "",
          url: h5Url,
          loading: false,
        },
      }));
    }
  };

  // 显示二维码弹窗
  const handleShowQRCode = async (channel: { id: string | number; name: string; code?: string }) => {
    setCurrentQrChannel(channel);
    setShowQrDialog(true);

    if (!qrCodeMap[channel.id]?.qrCode && !qrCodeMap[channel.id]?.loading) {
      await generateChannelQRCode(channel.id, channel.code);
    }
  };

  // 同步分销相关的外部表单数据到本地状态
  useEffect(() => {
    setDistributionEnabled(formData.distributionEnabled ?? false);
    setTempSelectedChannelIds(formData.distributionChannelIds || []);
    setCustomerReward(formData.distributionCustomerReward);
    setAddReward(formData.distributionAddReward);
  }, [
    formData.distributionEnabled,
    formData.distributionChannelIds,
    formData.distributionCustomerReward,
    formData.distributionAddReward,
  ]);

  // 加载分销渠道列表
  const loadDistributionChannels = useCallback(
    async (keyword: string = "", page: number = 1) => {
      setChannelLoading(true);
      try {
        const res = await fetchChannelList({
          page,
          limit: PAGE_SIZE,
          keyword: keyword.trim() || undefined,
          status: "enabled",
        });
        setChannelList(res.list || []);
        setChannelTotal(res.total || 0);
      } catch (error: any) {
        // 错误处理
      } finally {
        setChannelLoading(false);
      }
    },
    []
  );

  const handleToggleDistribution = (value: boolean) => {
    setDistributionEnabled(value);
    if (!value) {
      setTempSelectedChannelIds([]);
      setCustomerReward(undefined);
      setAddReward(undefined);
      onChange({
        ...formData,
        distributionEnabled: false,
        distributionChannelIds: [],
        distributionChannelsOptions: [],
        distributionCustomerReward: undefined,
        distributionAddReward: undefined,
      });
    } else {
      onChange({
        ...formData,
        distributionEnabled: true,
      });
    }
  };

  // 打开弹窗时获取第一页
  useEffect(() => {
    if (channelModalVisible) {
      setChannelSearchQuery("");
      setChannelCurrentPage(1);
      setTempSelectedChannelIds(formData.distributionChannelIds || []);
      loadDistributionChannels("", 1);
    }
  }, [channelModalVisible, loadDistributionChannels, formData.distributionChannelIds]);

  // 搜索防抖
  useEffect(() => {
    if (!channelModalVisible) return;
    const timer = setTimeout(() => {
      setChannelCurrentPage(1);
      loadDistributionChannels(channelSearchQuery, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [channelSearchQuery, channelModalVisible, loadDistributionChannels]);

  // 翻页时重新请求
  useEffect(() => {
    if (!channelModalVisible) return;
    loadDistributionChannels(channelSearchQuery, channelCurrentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelCurrentPage]);

  const handleOpenChannelModal = () => {
    setChannelModalVisible(true);
  };

  const handleChannelToggle = (channel: any) => {
    const id = channel.id;
    setTempSelectedChannelIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id],
    );
  };

  const filteredChannels = channelList;
  const channelTotalPages = Math.max(1, Math.ceil(channelTotal / PAGE_SIZE));

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      const currentPageChannels = filteredChannels.filter(
        (channel: any) => !tempSelectedChannelIds.includes(channel.id),
      );
      setTempSelectedChannelIds(prev => [
        ...prev,
        ...currentPageChannels.map((c: any) => c.id),
      ]);
    } else {
      const currentPageChannelIds = filteredChannels.map((c: any) => c.id);
      setTempSelectedChannelIds(prev =>
        prev.filter(id => !currentPageChannelIds.includes(id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    filteredChannels.length > 0 &&
    filteredChannels.every((channel: any) =>
      tempSelectedChannelIds.includes(channel.id),
    );

  const handleConfirmChannels = () => {
    const selectedOptions =
      channelList
        .filter(c => tempSelectedChannelIds.includes(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
        })) || [];

    onChange({
      ...formData,
      distributionEnabled: true,
      distributionChannelIds: tempSelectedChannelIds,
      distributionChannelsOptions: selectedOptions,
    });
    setDistributionEnabled(true);
    setChannelModalVisible(false);
  };

  const handleCancelChannels = () => {
    setChannelModalVisible(false);
    setTempSelectedChannelIds(formData.distributionChannelIds || []);
  };

  // 获取显示文本
  const getChannelDisplayText = () => {
    const selectedChannels = formData.distributionChannelsOptions || [];
    if (selectedChannels.length === 0) return "";
    return `已选择 ${selectedChannels.length} 个渠道`;
  };

  // 删除已选渠道
  const handleRemoveChannel = (id: string | number) => {
    const newChannelIds = (formData.distributionChannelIds || []).filter(
      (cid: string | number) => cid !== id
    );
    const newChannelOptions = (formData.distributionChannelsOptions || []).filter(
      (item: { id: string | number; name: string }) => item.id !== id
    );
    onChange({
      ...formData,
      distributionChannelIds: newChannelIds,
      distributionChannelsOptions: newChannelOptions,
    });
  };

  // 清除所有已选渠道
  const handleClearAllChannels = () => {
    onChange({
      ...formData,
      distributionChannelIds: [],
      distributionChannelsOptions: [],
    });
  };

  // ==================== 拉群设置相关函数 ====================
  const handleToggleGroupInvite = (value: boolean) => {
    onChange({
      ...formData,
      groupInviteEnabled: value,
    });
  };

  const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...formData,
      groupName: e.target.value,
    });
  };

  const handleFixedMembersSelect = (friends: FriendSelectionItem[]) => {
    onChange({
      ...formData,
      fixedGroupMembers: friends,
    });
  };


  return (
    <div className={styles["basic-container"]}>
      {/* 场景选择区块 */}
      <div className={styles["basic-scene-select"]}>
        {sceneLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 80,
            }}
          >
            <Spin size="large"></Spin>
          </div>
        ) : (
          <div className={styles["basic-scene-grid"]}>
            {sceneList
             .filter(scene => {
               // 编辑模式下，如果当前选中的场景 id 是 10，则显示它
               if (isEdit && formData.scenario === 10 && scene.id === 10) {
                 return true;
               }
               // 其他情况过滤掉 id 为 10 的场景
               return scene.id !== 10;
             })
             .map(scene => {
              const selected = formData.scenario === scene.id;
              // 编辑模式下，如果当前场景 id 是 10，则禁用所有场景选择
              const isDisabled = isEdit && formData.scenario === 10;
              return (
                <button
                  key={scene.id}
                  onClick={() => !isDisabled && handleScenarioSelect(scene.id)}
                  disabled={isDisabled}
                  className={
                    styles["basic-scene-btn"] +
                    (selected ? " " + styles.selected : "") +
                    (isDisabled ? " " + styles.disabled : "")
                  }
                >
                  {scene.name.replace("获客", "")}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* 计划类型选择 - 仅管理员可见 */}
      {isAdmin && (
        <>
          <div className={styles["basic-label"]}>计划类型</div>
          <div style={{ marginBottom: 16 }}>
            <Radio.Group
              value={formData.planType ?? 1}
              onChange={e => onChange({ ...formData, planType: e.target.value })}
              style={{ display: "flex", gap: 24 }}
            >
              <Radio value={0}>全局计划</Radio>
              <Radio value={1}>独立计划</Radio>
            </Radio.Group>
          </div>
        </>
      )}
      {/* 计划名称输入区 */}
      <div className={styles["basic-label"]}>计划名称</div>
      <div className={styles["basic-input-block"]}>
        <Input
          value={formData.name}
          onChange={e =>
            onChange({ ...formData, name: String(e.target.value) })
          }
          placeholder="请输入计划名称"
        />
      </div>
      <div className={styles["basic-label"]}>获客标签（可多选）</div>
      {/* 标签选择区块 */}
      {formData.scenario && (
        <div className={styles["basic-tag-list"]}>
          {(currentScene?.scenarioTags || []).map((tag: string) => (
            <Tag
              key={tag}
              color={selectedScenarioTags.includes(tag) ? "blue" : "default"}
              onClick={() => handleScenarioTagToggle(tag)}
              className={styles["basic-tag-item"]}
            >
              {tag}
            </Tag>
          ))}
          {/* 自定义标签 */}
          {customTagsOptions.map((tag: string) => (
            <Tag
              key={tag}
              color={selectedCustomTags.includes(tag) ? "blue" : "default"}
              onClick={() => handleCustomTagToggle(tag)}
              closable
              onClose={() => handleRemoveCustomTag(tag)}
              className={styles["basic-tag-item"]}
            >
              {tag}
            </Tag>
          ))}
        </div>
      )}
      {/* 自定义标签输入区 */}
      <div className={styles["basic-custom-tag-input"]}>
        <Input
          type="text"
          value={customTagInput}
          onChange={e => setCustomTagInput(e.target.value)}
          onPressEnter={handleAddCustomTag}
          placeholder="添加自定义标签"
        />
        <Button
          type="primary"
          onClick={handleAddCustomTag}
          disabled={!customTagInput.trim()}
        >
          添加
        </Button>
      </div>
      {/* 输入获客成功提示 - 只有海报场景才显示 */}
      {formData.scenario === 1 && (
        <>
          <div className={styles["basic-label"]}>请输入获客成功提示</div>
          <div className={styles["basic-success-tip"]}>
            <Input
              type="text"
              value={tips}
              onChange={e => {
                setTips(e.target.value);
                onChange({ ...formData, tips: e.target.value });
              }}
              placeholder="请输入获客成功提示"
            />
          </div>
        </>
      )}
      {/* 选素材 */}
      <div className={styles["basic-materials"]} style={openPoster}>
        <div className={styles["basic-label"]}>选择海报</div>
        <div className={styles["basic-materials-grid"]}>
          {[...materials, ...customPosters].map(material => {
            const isSelected = selectedMaterials.some(
              m => m.id === material.id,
            );
            const isCustom = material.id.startsWith("custom-");
            return (
              <div
                key={material.id}
                className={
                  styles["basic-material-card"] +
                  (isSelected ? " " + styles.selected : "")
                }
                onClick={() => handleMaterialSelect(material)}
              >
                {/* 预览按钮：自定义海报在左上，内置海报在右上 */}
                <span
                  className={styles["basic-material-preview"]}
                  onClick={e => {
                    e.stopPropagation();
                    handlePreviewImage(material.url);
                  }}
                >
                  <EyeOutlined
                    style={{ color: "#fff", width: 18, height: 18 }}
                  />
                </span>
                {/* 删除自定义海报按钮 */}
                {isCustom && (
                  <Button
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      background: "rgba(0,0,0,0.5)",
                      border: "none",
                      borderRadius: "50%",
                      zIndex: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 20,
                      color: "#ffffff",
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveCustomPoster(material.id);
                    }}
                  >
                    <CloseOutlined />
                  </Button>
                )}
                <img
                  src={material.url}
                  alt={material.name}
                  className={styles["basic-material-img"]}
                />
                <div className={styles["basic-material-name"]}>
                  {material.name}
                </div>
              </div>
            );
          })}
          {/* 添加海报卡片 */}
          <div
            className={styles["basic-add-material"]}
            onClick={() => uploadInputRef.current?.click()}
          >
            <span style={{ fontSize: 36, color: "#bbb", marginBottom: 8 }}>
              <PlusOutlined />
            </span>
            <span style={{ color: "#888" }}>添加海报</span>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (file) {
                  // 直接上传
                  try {
                    const url = await uploadFile(file);
                    const newPoster = {
                      id: `custom-${Date.now()}`,
                      name: "自定义海报",
                      type: "poster",
                      url: url,
                    };
                    setCustomPosters(prev => [...prev, newPoster]);
                  } catch (err) {
                    // 可加toast提示
                  }
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>
        {/* 全屏图片预览 */}
        <Modal
          open={isPreviewOpen}
          onCancel={() => {
            setIsPreviewOpen(false);
            setPreviewUrl(null);
          }}
          footer={null}
          width={800}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </Modal>
      </div>
      {/* 群选择 - 只有微信群场景才显示 */}
      {formData.scenario === 7 && (
        <div className={styles["basic-group-selection"]}>
          <div className={styles["basic-label"]}>选择群聊</div>
          <GroupSelection
            selectedOptions={formData.wechatGroupsOptions || []}
            onSelect={handleWechatGroupSelect}
            placeholder="请选择微信群"
            className={styles["basic-group-selector"]}
          />
        </div>
      )}

      {/* 订单导入区块 - 使用FileUpload组件 */}
      <div className={styles["basic-order-upload"]} style={openOrder}>
        <div className={styles["basic-order-upload-label"]}>订单表格上传</div>
        <div className={styles["basic-order-upload-actions"]}>
          <Button
            style={{ display: "flex", alignItems: "center", gap: 4 }}
            onClick={handleDownloadTemplate}
          >
            <DownloadOutlined style={{ fontSize: 18 }} /> 下载模板
          </Button>
        </div>
        <div className={styles["basic-order-upload-file"]}>
          <FileUpload
            value={formData.orderFileUrl || ""}
            onChange={url => onChange({ ...formData, orderFileUrl: url })}
            acceptTypes={["excel"]}
            maxCount={1}
            maxSize={10}
            showPreview={false}
          />
        </div>
        <div className={styles["basic-order-upload-tip"]}>
          支持 Excel 格式，上传后将文件保存到服务器
        </div>
      </div>
      {/* 电话获客设置区块，仅在选择电话获客场景时显示 */}
      {formData.scenario === 5 && (
        <div className={styles["basic-phone-settings"]}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
            电话获客设置
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>自动加好友</span>
              <Switch
                checked={phoneSettings.autoAdd}
                onChange={v => setPhoneSettings(s => ({ ...s, autoAdd: v }))}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>语音转文字</span>
              <Switch
                checked={phoneSettings.speechToText}
                onChange={v =>
                  setPhoneSettings(s => ({ ...s, speechToText: v }))
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>问题提取</span>
              <Switch
                checked={phoneSettings.questionExtraction}
                onChange={v =>
                  setPhoneSettings(s => ({ ...s, questionExtraction: v }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* 分销设置 */}
      <div className={styles["basic-distribution"]}>
        <div className={styles["basic-distribution-header"]}>
          <div>
            <div className={styles["basic-distribution-title"]}>分销设置</div>
            <div className={styles["basic-distribution-desc"]}>
              开启后，可将当前场景的获客用户同步到指定分销渠道
            </div>
          </div>
          <Switch
            checked={distributionEnabled}
            onChange={handleToggleDistribution}
          />
        </div>

        {distributionEnabled && (
          <>
            {/* 输入框 */}
            <div className={styles["distribution-input-wrapper"]}>
              <Input
                placeholder="选择分销渠道"
                value={getChannelDisplayText()}
                onClick={handleOpenChannelModal}
                prefix={<SearchOutlined />}
                allowClear
                onClear={handleClearAllChannels}
                size="large"
                readOnly
                style={{ cursor: "pointer" }}
              />
            </div>
            {/* 已选渠道列表 */}
            {formData.distributionChannelsOptions &&
            formData.distributionChannelsOptions.length > 0 ? (
              <div
                className={styles["distribution-selected-list"]}
                style={{
                  maxHeight: 300,
                  overflowY: "auto",
                  marginTop: 8,
                  border: "1px solid #e5e6eb",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                {formData.distributionChannelsOptions.map(
                  (item: { id: string | number; name: string; code?: string }) => (
                    <div
                      key={item.id}
                      className={styles["distribution-selected-item"]}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderBottom: "1px solid #f0f0f0",
                        fontSize: 14,
                      }}
                    >
                      {/* 渠道图标 */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "6px",
                          background:
                            "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          boxShadow: "0 2px 8px rgba(22, 119, 255, 0.25)",
                          marginRight: "12px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            color: "#fff",
                            fontWeight: 700,
                            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          }}
                        >
                          {(item.name || "渠")[0]}
                        </span>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#1a1a1a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name}
                        </div>
                        {item.code && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8c8c8c",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            编码: {item.code}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <Button
                          type="text"
                          icon={<QrcodeOutlined />}
                          size="small"
                          style={{
                            color: "#1890ff",
                            border: "none",
                            background: "none",
                            minWidth: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() => handleShowQRCode(item)}
                        />
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          style={{
                            color: "#ff4d4f",
                            border: "none",
                            background: "none",
                            minWidth: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() => handleRemoveChannel(item.id)}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : null}
            {/* 奖励金额设置 */}
            <div className={styles["distribution-rewards"]}>
              <div className={styles["basic-label"]}>获客奖励金额（元）</div>
              <Input
                type="number"
                placeholder="请输入获客奖励金额"
                value={customerReward}
                onChange={e => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  setCustomerReward(value);
                  onChange({
                    ...formData,
                    distributionCustomerReward: value,
                  });
                }}
                min={0}
                step={0.01}
                style={{ marginBottom: 12 }}
              />
              <div className={styles["basic-label"]}>添加奖励金额（元）</div>
              <Input
                type="number"
                placeholder="请输入添加奖励金额"
                value={addReward}
                onChange={e => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  setAddReward(value);
                  onChange({
                    ...formData,
                    distributionAddReward: value,
                  });
                }}
                min={0}
                step={0.01}
              />
            </div>
          </>
        )}
      </div>

      {/* 拉群设置 */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          borderRadius: 8,
          border: "1px solid #f0f0f0",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              拉群设置
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              开启后，可配置群名称和固定群成员，将用户引导到指定微信群
            </div>
          </div>
          <Switch
            checked={!!formData.groupInviteEnabled}
            onChange={handleToggleGroupInvite}
          />
        </div>

        {formData.groupInviteEnabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              placeholder="请输入群名称"
              value={formData.groupName || ""}
              onChange={handleGroupNameChange}
            />
            {/* 固定成员选择 */}
            <div>
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 4,
                  color: "#595959",
                }}
              >
                固定群成员
              </div>
              <FriendSelection
                selectedOptions={
                  (formData.fixedGroupMembers || []) as FriendSelectionItem[]
                }
                onSelect={handleFixedMembersSelect}
                placeholder="选择固定群成员"
                showSelectedList={true}
                deviceIds={formData.deviceGroups || []}
                enableDeviceFilter={true}
              />
            </div>
          </div>
        )}
      </div>

      <div className={styles["basic-footer-switch"]}>
        <span>是否启用</span>
        <Switch
          checked={formData.status === 1}
          onChange={value => onChange({ ...formData, status: value ? 1 : 0 })}
        />
      </div>

      {/* 分销渠道选择弹框 */}
      <Popup
        visible={channelModalVisible}
        onMaskClick={handleCancelChannels}
        position="bottom"
        bodyStyle={{ height: "100vh" }}
        closeOnMaskClick={false}
      >
        <Layout
          header={
            <PopupHeader
              title="选择分销渠道"
              searchQuery={channelSearchQuery}
              setSearchQuery={setChannelSearchQuery}
              searchPlaceholder="搜索渠道名称、编码..."
              loading={channelLoading}
              onRefresh={() => loadDistributionChannels(channelSearchQuery, channelCurrentPage)}
              showTabs={false}
            />
          }
          footer={
            <PopupFooter
              currentPage={channelCurrentPage}
              totalPages={channelTotalPages}
              loading={channelLoading}
              selectedCount={tempSelectedChannelIds.length}
              onPageChange={setChannelCurrentPage}
              onCancel={handleCancelChannels}
              onConfirm={handleConfirmChannels}
              isAllSelected={isCurrentPageAllSelected}
              onSelectAll={handleSelectAllCurrentPage}
            />
          }
        >
          <div className={styles["channelList"]}>
            {channelLoading && channelList.length === 0 ? (
              <div className={styles["loadingBox"]}>
                <div className={styles["loadingText"]}>加载中...</div>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className={styles["loadingBox"]}>
                <div className={styles["loadingText"]}>
                  暂无分销渠道，请先在「分销管理」中创建渠道
                </div>
              </div>
            ) : (
              <div className={styles["channelListInner"]}>
                {filteredChannels.map((channel: any) => (
                  <div key={channel.id} className={styles["channelItem"]}>
                    <div className={styles["headerRow"]}>
                      <div className={styles["checkboxContainer"]}>
                        <Checkbox
                          checked={tempSelectedChannelIds.includes(channel.id)}
                          onChange={() => handleChannelToggle(channel)}
                          className={styles["channelCheckbox"]}
                        />
                      </div>
                      <span className={styles["codeText"]}>
                        编码: {channel.code}
                      </span>
                    </div>

                    <div className={styles["mainContent"]}>
                      <div className={styles["channelContent"]}>
                        <div className={styles["channelInfoRow"]}>
                          <span className={styles["channelName"]}>
                            {channel.name}
                          </span>
                          <div
                            className={
                              channel.status === "enabled"
                                ? styles["statusEnabled"]
                                : styles["statusDisabled"]
                            }
                          >
                            {channel.status === "enabled" ? "启用" : "禁用"}
                          </div>
                        </div>
                        <div className={styles["channelInfoDetail"]}>
                          {channel.phone && (
                            <div className={styles["infoItem"]}>
                              <span className={styles["infoLabel"]}>手机号:</span>
                              <span className={styles["infoValue"]}>
                                {channel.phone}
                              </span>
                            </div>
                          )}
                          {channel.wechatId && (
                            <div className={styles["infoItem"]}>
                              <span className={styles["infoLabel"]}>微信号:</span>
                              <span className={styles["infoValue"]}>
                                {channel.wechatId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Layout>
      </Popup>

      {/* 二维码弹窗 */}
      <Popup
        visible={showQrDialog}
        onMaskClick={() => setShowQrDialog(false)}
        position="bottom"
      >
        <div style={{
          background: "#fff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: "20px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {currentQrChannel?.name || "渠道"}二维码
            </h3>
            <Button
              size="small"
              onClick={() => setShowQrDialog(false)}
            >
              关闭
            </Button>
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}>
            {currentQrChannel && (
              <>
                {qrCodeMap[currentQrChannel.id]?.loading ? (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    padding: "40px 20px",
                  }}>
                    <SpinLoading color="primary" style={{ fontSize: 32 }} />
                    <div style={{ fontSize: 14, color: "#666" }}>生成二维码中...</div>
                  </div>
                ) : (
                  <>
                    {/* 二维码显示区域 */}
                    {qrCodeMap[currentQrChannel.id]?.qrCode ? (
                      <img
                        src={qrCodeMap[currentQrChannel.id].qrCode}
                        alt="渠道二维码"
                        style={{
                          width: 200,
                          height: 200,
                          border: "1px solid #e5e6eb",
                          borderRadius: 8,
                          padding: 8,
                          background: "#fff",
                        }}
                      />
                    ) : (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                        padding: "40px 20px",
                        color: "#999",
                      }}>
                        <QrcodeOutlined style={{ fontSize: 48 }} />
                        <div style={{ fontSize: 14 }}>二维码生成失败</div>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => currentQrChannel && generateChannelQRCode(currentQrChannel.id, currentQrChannel.code)}
                        >
                          重新生成
                        </Button>
                      </div>
                    )}

                    {/* H5链接展示 */}
                    {qrCodeMap[currentQrChannel.id]?.url && (
                      <div style={{
                        width: "100%",
                        marginTop: 16,
                      }}>
                        <div style={{
                          fontSize: 14,
                          color: "#666",
                          marginBottom: 8,
                          fontWeight: 500,
                        }}>
                          H5链接
                        </div>
                        <div style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}>
                          <Input
                            value={qrCodeMap[currentQrChannel.id].url}
                            readOnly
                            style={{
                              flex: 1,
                              fontSize: 12,
                            }}
                          />
                          <Button
                            size="small"
                            onClick={() => {
                              const link = qrCodeMap[currentQrChannel.id].url;
                              navigator.clipboard.writeText(link);
                              Toast.show({
                                content: "链接已复制到剪贴板",
                                position: "top",
                              });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CopyOutlined />
                            复制
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Popup>

    </div>
  );
};

export default BasicSettings;
