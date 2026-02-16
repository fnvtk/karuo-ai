import React, { useState, useEffect, useCallback } from "react";
import { Input, Button, Switch } from "antd";
import { Toast, SpinLoading } from "antd-mobile";
import {
  SearchOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { Checkbox, Popup } from "antd-mobile";
import styles from "./base.module.scss";
import { fetchChannelList } from "@/pages/mobile/workspace/distribution-management/api";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import request from "@/api/request";

interface DistributionSettingsProps {
  formData: any;
  onChange: (data: any) => void;
  planId?: string; // 计划ID，用于生成二维码
}

const DistributionSettings: React.FC<DistributionSettingsProps> = ({
  formData,
  onChange,
  planId,
}) => {
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

  // 生成H5链接（独立生成，不依赖二维码）
  const generateH5Url = (channelId: string | number, channelCode?: string): string => {
    // 生成H5链接，参考列表中的实现
    // 格式: https://h5.ckb.quwanzhi.com/#/pages/form/input2?id={planId}&channelId={channelId}
    if (planId) {
      return `https://h5.ckb.quwanzhi.com/#/pages/form/input2?id=${planId}&channelId=${channelId}`;
    } else if (channelCode) {
      // 新建状态，使用渠道code
      return `https://h5.ckb.quwanzhi.com/#/pages/form/input2?channelCode=${channelCode}`;
    }
    return "";
  };

  // 生成渠道二维码
  const generateChannelQRCode = async (channelId: string | number, channelCode?: string) => {
    // 先生成H5链接（无论二维码是否成功都要显示）
    const h5Url = generateH5Url(channelId, channelCode);

    // 如果已经有二维码数据，只更新H5链接（如果还没有）
    if (qrCodeMap[channelId]) {
      if (!qrCodeMap[channelId].url) {
        setQrCodeMap(prev => ({
          ...prev,
          [channelId]: { ...prev[channelId], url: h5Url },
        }));
      }
      // 如果已经有二维码，直接返回
      if (qrCodeMap[channelId].qrCode) {
        return;
      }
    } else {
      // 初始化，先设置H5链接
      setQrCodeMap(prev => ({
        ...prev,
        [channelId]: {
          qrCode: "",
          url: h5Url,
          loading: true,
        },
      }));
    }

    // 设置加载状态
    setQrCodeMap(prev => ({
      ...prev,
      [channelId]: { ...prev[channelId], loading: true },
    }));

    try {
      // 参考列表生成的参数，使用计划ID和渠道ID/code生成二维码
      // 如果是在新建状态（没有planId），使用渠道code；如果有planId，使用planId和channelId
      const params: any = {};
      if (planId) {
        params.taskId = planId;
        params.channelId = channelId;
      } else if (channelCode) {
        params.channelCode = channelCode;
      }

      // 调用API生成二维码，参考列表中的实现
      // 接口返回格式: { code: 200, msg: "获取小程序码成功", data: "data:image/png;base64,..." }
      const response = await request(
        `/v1/plan/getWxMinAppCode`,
        params,
        "GET"
      );

      // response 已经是 base64 字符串（因为 request 拦截器返回了 res.data.data）
      if (response && typeof response === 'string' && response.startsWith('data:image')) {
        setQrCodeMap(prev => ({
          ...prev,
          [channelId]: {
            qrCode: response, // base64 图片数据
            url: h5Url, // H5链接（确保即使失败也有）
            loading: false,
          },
        }));
      } else {
        throw new Error("二维码生成失败");
      }
    } catch (error: any) {
      // 即使二维码生成失败，也要保留H5链接
      Toast.show({
        content: error.message || "生成二维码失败",
        position: "top",
      });
      setQrCodeMap(prev => ({
        ...prev,
        [channelId]: {
          ...prev[channelId],
          qrCode: "", // 二维码为空
          url: h5Url, // H5链接保留
          loading: false,
        },
      }));
    }
  };

  // 显示二维码弹窗
  const handleShowQRCode = async (channel: { id: string | number; name: string; code?: string }) => {
    setCurrentQrChannel(channel);
    setShowQrDialog(true);

    // 如果还没有生成二维码，则生成
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

  // 加载分销渠道列表，支持keyword和分页，强制只获取启用的渠道
  const loadDistributionChannels = useCallback(
    async (keyword: string = "", page: number = 1) => {
      setChannelLoading(true);
      try {
        const res = await fetchChannelList({
          page,
          limit: PAGE_SIZE,
          keyword: keyword.trim() || undefined,
          status: "enabled", // 强制只获取启用的渠道
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
    // 关闭时清空已选渠道和奖励金额
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
      // 复制一份已选渠道到临时变量
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

  // 直接使用从API返回的渠道列表（API已过滤为只返回启用的）
  const filteredChannels = channelList;

  const channelTotalPages = Math.max(1, Math.ceil(channelTotal / PAGE_SIZE));

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      // 全选：添加当前页面所有未选中的渠道
      const currentPageChannels = filteredChannels.filter(
        (channel: any) => !tempSelectedChannelIds.includes(channel.id),
      );
      setTempSelectedChannelIds(prev => [
        ...prev,
        ...currentPageChannels.map((c: any) => c.id),
      ]);
    } else {
      // 取消全选：移除当前页面的所有渠道
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
    // 取消时恢复为表单中的已有值
    setTempSelectedChannelIds(formData.distributionChannelIds || []);
  };

  // 获取显示文本（参考设备选择）
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

  return (
    <div className={styles["basic-container"]}>
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
            {/* 输入框 - 参考设备选择样式 */}
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
            {/* 已选渠道列表 - 参考设备选择样式 */}
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

      {/* 分销渠道选择弹框 - 参考设备选择样式 */}
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
                    {/* 顶部行：选择框和编码 */}
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

                    {/* 主要内容区域：渠道信息 */}
                    <div className={styles["mainContent"]}>
                      {/* 渠道信息 */}
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

      {/* 二维码弹窗 - 参考列表中的实现 */}
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

                    {/* H5链接展示 - 无论二维码是否成功都要显示 */}
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

export default DistributionSettings;
