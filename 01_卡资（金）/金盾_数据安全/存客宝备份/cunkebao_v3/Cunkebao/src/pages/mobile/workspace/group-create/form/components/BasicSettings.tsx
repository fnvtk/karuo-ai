import React, { useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { Radio, Switch } from "antd";
import { Input } from "antd";
import { Toast, Avatar, Popup } from "antd-mobile";
import { ClockCircleOutlined, InfoCircleOutlined, DeleteOutlined, UserAddOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import FriendSelection from "@/components/FriendSelection";
import DeviceSelection from "@/components/DeviceSelection";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { GroupCreateFormData } from "../types";
import style from "./BasicSettings.module.scss";
import { useUserStore } from "@/store/module/user";

interface BasicSettingsProps {
  formData: GroupCreateFormData;
  onChange: (data: Partial<GroupCreateFormData>) => void;
}

export interface BasicSettingsRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const BasicSettings = forwardRef<BasicSettingsRef, BasicSettingsProps>(
  ({ formData, onChange }, ref) => {
    const { user } = useUserStore();
    const isAdmin = user?.isAdmin === 1;
    const [executorSelectionVisible, setExecutorSelectionVisible] = useState(false);
    const [groupAdminSelectionVisible, setGroupAdminSelectionVisible] = useState(false);
    const [fixedWechatIdsSelectionVisible, setFixedWechatIdsSelectionVisible] = useState(false);
    const [manualWechatIdInput, setManualWechatIdInput] = useState("");


    // 处理执行智能体选择（单选设备）
    const handleExecutorSelect = (devices: DeviceSelectionItem[]) => {
      if (devices.length > 0) {
        const selectedDevice = devices[0];
        // 自动设置群名称为执行智能体的名称（优先使用 nickname，其次 memo，最后 wechatId），加上"的群"后缀
        const executorName = selectedDevice.nickname || selectedDevice.memo || selectedDevice.wechatId || "";
        onChange({
          executor: selectedDevice,
          executorId: selectedDevice.id,
          groupNameTemplate: executorName ? `${executorName}的群` : "", // 设置为"XXX的群"格式
        });
      } else {
        onChange({
          executor: undefined,
          executorId: undefined,
          groupNameTemplate: "", // 清空群名称
        });
      }
      setExecutorSelectionVisible(false);
    };

    // 处理固定微信号选择（必须3个）
    const handleFixedWechatIdsSelect = (friends: FriendSelectionItem[]) => {
      // 检查总数是否超过3个（包括已添加的手动微信号）
      const currentManualCount = (formData.wechatGroupsOptions || []).filter(f => f.isManual).length;
      const newSelectedCount = friends.length;
      if (currentManualCount + newSelectedCount > 3) {
        Toast.show({ content: "固定微信号最多只能选择3个", position: "top" });
        return;
      }
      // 标记为选择的（非手动添加），确保所有从选择弹窗来的都标记为非手动
      const selectedFriends = friends.map(f => ({ ...f, isManual: false }));
      // 合并已添加的手动微信号和新的选择
      const manualFriends = (formData.wechatGroupsOptions || []).filter(f => f.isManual === true);
      onChange({
        wechatGroups: [...manualFriends, ...selectedFriends].map(f => f.id),
        wechatGroupsOptions: [...manualFriends, ...selectedFriends],
      });
      setFixedWechatIdsSelectionVisible(false);
    };

    // 打开固定微信号选择弹窗前检查是否已选择执行智能体
    const handleOpenFixedWechatIdsSelection = () => {
      if (!formData.executorId) {
        Toast.show({ content: "请先选择执行智能体", position: "top" });
        return;
      }
      setFixedWechatIdsSelectionVisible(true);
    };

    // 打开群管理员选择弹窗
    const handleOpenGroupAdminSelection = () => {
      if (selectedWechatIds.length === 0) {
        Toast.show({
          content: manualAddedWechatIds.length > 0
            ? "群管理员只能从已选择的微信号中选择，不能选择手动添加的微信号"
            : "请先选择固定微信号",
          position: "top"
        });
        return;
      }
      // 如果当前选择的群管理员是手动添加的，清空选择
      if (formData.groupAdminWechatIdOption && formData.groupAdminWechatIdOption.isManual) {
        onChange({
          groupAdminWechatIdOption: undefined,
          groupAdminWechatId: undefined,
        });
      }
      setGroupAdminSelectionVisible(true);
    };

    // 处理群管理员选择（单选）
    const handleGroupAdminSelect = (friends: FriendSelectionItem[]) => {
      if (friends.length > 0) {
        onChange({
          groupAdminWechatIdOption: friends[0],
          groupAdminWechatId: friends[0].id,
        });
      } else {
        onChange({
          groupAdminWechatIdOption: undefined,
          groupAdminWechatId: undefined,
        });
      }
      setGroupAdminSelectionVisible(false);
    };

    // 手动添加微信号
    const handleAddManualWechatId = () => {
      if (!manualWechatIdInput.trim()) {
        Toast.show({ content: "请输入微信号", position: "top" });
        return;
      }
      const existingIds = formData.wechatGroupsOptions.map(f => f.wechatId.toLowerCase());
      if (existingIds.includes(manualWechatIdInput.trim().toLowerCase())) {
        Toast.show({ content: "该微信号已添加", position: "top" });
        return;
      }
      if (formData.wechatGroupsOptions.length >= 3) {
        Toast.show({ content: "固定微信号最多只能添加3个", position: "top" });
        return;
      }
      // 创建临时好友项，标记为手动添加
      const newFriend: FriendSelectionItem = {
        id: Date.now(), // 临时ID
        wechatId: manualWechatIdInput.trim(),
        nickname: manualWechatIdInput.trim(),
        avatar: "",
        isManual: true, // 标记为手动添加
      };
      onChange({
        wechatGroups: [...formData.wechatGroups, newFriend.id],
        wechatGroupsOptions: [...formData.wechatGroupsOptions, newFriend],
      });
      setManualWechatIdInput("");
    };

    // 移除固定微信号
    const handleRemoveFixedWechatId = (id: number) => {
      const removedFriend = formData.wechatGroupsOptions.find(f => f.id === id);
      const newOptions = formData.wechatGroupsOptions.filter(f => f.id !== id);
      const updateData: Partial<GroupCreateFormData> = {
        wechatGroups: formData.wechatGroups.filter(fid => fid !== id),
        wechatGroupsOptions: newOptions,
      };
      // 如果移除的是群管理员，也要清除群管理员设置
      if (formData.groupAdminWechatId === id) {
        updateData.groupAdminWechatId = undefined;
        updateData.groupAdminWechatIdOption = undefined;
      }
      onChange(updateData);
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        // 验证必填字段
        if (!formData.name?.trim()) {
          Toast.show({ content: "请输入计划名称", position: "top" });
          return false;
        }
        if (!formData.executorId) {
          Toast.show({ content: "请选择执行智能体", position: "top" });
          return false;
        }
        // 固定微信号不是必填的，移除验证
        if (!formData.groupNameTemplate?.trim()) {
          Toast.show({ content: "请输入群名称模板", position: "top" });
          return false;
        }
        // 群名称模板长度验证（2-100个字符）
        const groupNameTemplateLength = formData.groupNameTemplate.trim().length;
        if (groupNameTemplateLength < 2 || groupNameTemplateLength > 100) {
          Toast.show({ content: "群名称模板长度应在2-100个字符之间", position: "top" });
          return false;
        }
        return true;
      },
      getValues: () => {
        return formData;
      },
    }));

    // 区分已选择的微信号（从下拉选择）和已添加的微信号（手动输入）
    // 如果 isManual 未定义，默认为 false（即选择的）
    const selectedWechatIds = (formData.wechatGroupsOptions || []).filter(f => !f.isManual);
    const manualAddedWechatIds = (formData.wechatGroupsOptions || []).filter(f => f.isManual === true);

    return (
      <div className={style.container}>
        {/* 计划类型和计划名称 */}
        <div className={style.card}>
          {/* 计划类型：去掉 isPlanType 限制，只要当前用户为管理员即可配置 */}
          {isAdmin && (
          <div>
            <label className={style.label}>计划类型</label>
            <Radio.Group
              value={formData.planType}
              onChange={e => onChange({ planType: e.target.value })}
              className={style.radioGroup}
            >
              <Radio value={0}>全局计划</Radio>
              <Radio value={1}>独立计划</Radio>
            </Radio.Group>
          </div>
          )}
          <div style={{ marginTop: "16px" }}>
            <label className={style.label}>
              计划名称 <span className={style.labelRequired}>*</span>
            </label>
            <input
              type="text"
              className={style.input}
              value={formData.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="请输入计划名称"
            />
          </div>
        </div>

        {/* 执行智能体 */}
        <div className={style.card}>
          <label className={style.label}>
            <span className={style.labelRequired}>*</span>执行智能体
          </label>
          <div
            className={style.executorSelector}
            onClick={() => setExecutorSelectionVisible(true)}
          >
            {formData.executor ? (
              <div className={style.executorContent}>
                <div className={style.executorAvatar}>
                  {formData.executor.avatar ? (
                    <img src={formData.executor.avatar} alt={formData.executor.memo || formData.executor.wechatId} />
                  ) : (
                    <span style={{ fontSize: "20px" }}>🤖</span>
                  )}
                  <div className={style.statusDot} style={{ background: formData.executor.status === "online" ? "#10b981" : "#94a3b8" }}></div>
                </div>
                <div className={style.executorInfo}>
                  <div className={style.executorName}>
                    {formData.executor.nickname || formData.executor.memo || formData.executor.wechatId}
                  </div>
                  <div className={style.executorId}>ID: {formData.executor.wechatId}</div>
                </div>
              </div>
            ) : (
              <div className={style.executorContent}>
                <div className={style.executorAvatar}>
                  <span style={{ fontSize: "20px", color: "#94a3b8" }}>🤖</span>
                </div>
                <div className={style.executorInfo}>
                  <div className={style.executorName} style={{ color: "#cbd5e1" }}>
                    请选择执行智能体
                  </div>
                </div>
              </div>
            )}
            <span className={style.executorExpand}>▼</span>
          </div>
        </div>

        {/* 固定微信号 */}
        <div className={style.card}>
          <div style={{ marginBottom: "12px" }}>
            <label className={style.label}>
              固定微信号 <span className={style.labelRequired}>*</span>
              <InfoCircleOutlined className={style.infoIcon} />
            </label>
          </div>

          {/* 点击选择框 */}
          <div
            className={`${style.wechatSelectInput} ${!formData.executorId ? style.disabled : ''}`}
            onClick={handleOpenFixedWechatIdsSelection}
          >
            <div className={style.selectInputWrapper}>
              <span className={style.selectInputPlaceholder}>
                {(selectedWechatIds.length + manualAddedWechatIds.length) > 0
                  ? `已选择 ${selectedWechatIds.length + manualAddedWechatIds.length} 个微信号`
                  : '请选择微信号'}
              </span>
              <span className={style.selectInputArrow}>▼</span>
            </div>
          </div>

          {/* 已选择的微信号列表 */}
          {selectedWechatIds.length > 0 && (
            <div className={style.selectedList}>
              <p className={style.manualAddLabel}>已选择的微信号:</p>
              {selectedWechatIds.map(friend => (
                <div key={friend.id} className={style.selectedItem}>
                  <div className={style.selectedItemContent}>
                    <div className={style.selectedItemAvatar}>
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.nickname} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#94a3b8" }}>
                          {friend.nickname?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className={style.selectedItemInfo}>
                      <div className={style.selectedItemName}>{friend.nickname || friend.wechatId}</div>
                      <div className={style.selectedItemId}>微信ID: {friend.wechatId}</div>
                    </div>
                  </div>
                  <button
                    className={style.deleteButton}
                    onClick={() => handleRemoveFixedWechatId(friend.id)}
                  >
                    <DeleteOutlined style={{ fontSize: "18px" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 手动添加微信号 */}
          <div className={style.manualAdd}>
            <p className={style.manualAddLabel}>搜索不到?请输入微信号添加</p>
            <div className={style.manualAddInput}>
              <div className={style.manualAddInputWrapper}>
                <UserAddOutlined className={style.manualAddIcon} />
                <input
                  type="text"
                  className={style.manualAddInputField}
                  value={manualWechatIdInput}
                  onChange={e => setManualWechatIdInput(e.target.value)}
                  placeholder="请输入微信号"
                />
              </div>
              <button className={style.manualAddButton} onClick={handleAddManualWechatId}>
                <span>添</span>
                <span className={style.buttonText2}>加</span>
              </button>
            </div>
          </div>

          {/* 已添加的微信号列表（手动输入的） */}
          {manualAddedWechatIds.length > 0 && (
            <div className={style.addedList}>
              <p className={style.manualAddLabel}>已添加的微信号:</p>
              {manualAddedWechatIds.map((friend, index) => (
                <div key={friend.id} className={style.addedItem}>
                  <div className={style.addedItemContent}>
                    <div className={style.addedItemNumber}>{index + 1}</div>
                    <div className={style.addedItemInfo}>
                      <div className={style.addedItemName}>{friend.nickname || friend.wechatId}</div>
                      <div className={style.addedItemId}>微信ID: {friend.wechatId}</div>
                      <div className={style.addedItemStatus}>{friend.wechatId} 已发起好友申请</div>
                    </div>
                  </div>
                  <button
                    className={style.deleteButton}
                    onClick={() => handleRemoveFixedWechatId(friend.id)}
                  >
                    <DeleteOutlined style={{ fontSize: "18px" }} />
                  </button>
                </div>
              ))}
              <p className={style.addedCount}>已添加 {(selectedWechatIds.length + manualAddedWechatIds.length)}/3 个微信号</p>
            </div>
          )}
        </div>

        {/* 群管理员 */}
        <div className={style.card}>
          <div className={style.groupAdminHeader}>
            <div className={style.groupAdminLabelWrapper}>
              <label className={style.label}>群管理员</label>
              <InfoCircleOutlined className={style.infoIcon} />
            </div>
            <Switch
              checked={formData.groupAdminEnabled}
              onChange={checked => onChange({ groupAdminEnabled: checked })}
            />
          </div>
          {formData.groupAdminEnabled && (
            <div
              className={`${style.wechatSelectInput} ${selectedWechatIds.length === 0 ? style.disabled : ''}`}
              onClick={handleOpenGroupAdminSelection}
            >
              <div className={style.selectInputWrapper}>
                <span className={style.selectInputPlaceholder}>
                  {formData.groupAdminWechatIdOption
                    ? (formData.groupAdminWechatIdOption.nickname || formData.groupAdminWechatIdOption.wechatId)
                    : '请选择群管理员微信号'}
                </span>
                <span className={style.selectInputArrow}>▼</span>
              </div>
            </div>
          )}
          <p className={style.groupAdminHint}>开启后，所选微信号将自动成为群管理员。</p>
        </div>

        {/* 群名称 */}
        <div className={style.card}>
          <label className={style.label}>群名称</label>
          <input
            type="text"
            className={style.input}
            value={formData.groupNameTemplate}
            onChange={e => onChange({ groupNameTemplate: e.target.value })}
            placeholder="请输入群名称"
          />
        </div>

        {/* 群人数配置 */}
        <div className={style.card}>
          <label className={style.label}>群人数配置</label>

          <div className={style.groupSizeConfig}>
            {/* 每日最大建群数 */}
            <div>
              <label className={style.groupSizeLabel}>每日最大建群数</label>
              <input
                type="number"
                className={style.input}
                value={formData.maxGroupsPerDay || ""}
                onChange={e => onChange({ maxGroupsPerDay: Number(e.target.value) || 0 })}
                placeholder="请输入数量"
              />
            </div>

            {/* 群组最小人数和最大人数 */}
            <div className={style.groupSizeRow}>
              <div className={style.groupSizeItem}>
                <label className={style.groupSizeLabel}>群组最小人数</label>
                <input
                  type="number"
                  className={style.input}
                  value={formData.groupSizeMin || ""}
                  onChange={e => {
                    const value = Number(e.target.value) || 0;
                    onChange({ groupSizeMin: value < 3 ? 3 : value });
                  }}
                  placeholder="如: 3"
                  min={3}
                />
              </div>
              <div className={style.groupSizeItem}>
                <label className={style.groupSizeLabel}>群组最大人数</label>
                <input
                  type="number"
                  className={style.input}
                  value={formData.groupSizeMax || ""}
                  onChange={e => {
                    const value = Number(e.target.value) || 0;
                    onChange({ groupSizeMax: value > 38 ? 38 : value });
                  }}
                  placeholder="如: 40"
                  max={38}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 执行时间 */}
        <div className={style.card}>
          <label className={style.label}>执行时间</label>
          <div className={style.timeRangeContainer}>
            <div className={style.timeInputWrapper}>
              <input
                type="time"
                className={style.timeInput}
                value={formData.startTime || "09:00"}
                onChange={e => onChange({ startTime: e.target.value || "09:00" })}
              />
              <ClockCircleOutlined className={style.timeIcon} />
            </div>
            <span className={style.timeSeparator}>-</span>
            <div className={style.timeInputWrapper}>
              <input
                type="time"
                className={style.timeInput}
                value={formData.endTime || "21:00"}
                onChange={e => onChange({ endTime: e.target.value || "21:00" })}
              />
              <ClockCircleOutlined className={style.timeIcon} />
            </div>
          </div>
        </div>

        {/* 是否启用 */}
        <div className={style.card}>
          <div className={style.statusSwitchContainer}>
            <label className={style.label} style={{ marginBottom: 0 }}>是否启用</label>
            <Switch
              checked={formData.status === 1}
              onChange={(checked) => onChange({ status: checked ? 1 : 0 })}
            />
          </div>
        </div>


        {/* 隐藏的选择组件 */}
        <div style={{ display: "none" }}>
          <DeviceSelection
            selectedOptions={formData.executor ? [formData.executor] : []}
            onSelect={handleExecutorSelect}
            placeholder="选择执行智能体"
            showInput={false}
            showSelectedList={false}
            singleSelect={true}
            mode="dialog"
            open={executorSelectionVisible}
            onOpenChange={setExecutorSelectionVisible}
          />
          <FriendSelection
            visible={fixedWechatIdsSelectionVisible}
            onVisibleChange={setFixedWechatIdsSelectionVisible}
            selectedOptions={selectedWechatIds}
            onSelect={handleFixedWechatIdsSelect}
            placeholder="选择微信号"
            showInput={false}
            showSelectedList={false}
            deviceIds={formData.executorId ? [formData.executorId] : []}
            enableDeviceFilter={true}
          />
        </div>

        {/* 群管理员选择弹窗 - 只显示固定微信号列表 */}
        <Popup
          visible={groupAdminSelectionVisible}
          onMaskClick={() => setGroupAdminSelectionVisible(false)}
          position="bottom"
          bodyStyle={{ height: "60vh" }}
        >
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>选择群管理员微信号</h3>
                <button
                  onClick={() => setGroupAdminSelectionVisible(false)}
                  style={{ background: "none", border: "none", fontSize: "16px", color: "#3b82f6", cursor: "pointer" }}
                >
                  取消
                </button>
              </div>
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                {selectedWechatIds.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    {manualAddedWechatIds.length > 0
                      ? "群管理员只能从已选择的微信号中选择，不能选择手动添加的微信号"
                      : "暂无固定微信号可选"}
                  </div>
                ) : (
                  selectedWechatIds.map(friend => {
                    const isSelected = formData.groupAdminWechatIdOption?.id === friend.id;
                    return (
                      <div
                        key={friend.id}
                        onClick={() => {
                          onChange({
                            groupAdminWechatIdOption: friend,
                            groupAdminWechatId: friend.id,
                          });
                          setGroupAdminSelectionVisible(false);
                        }}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          border: `1px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                          background: isSelected ? "#eff6ff" : "#fff",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "#3b82f6";
                            e.currentTarget.style.background = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.background = "#fff";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "#e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden"
                          }}>
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.nickname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: "14px", color: "#94a3b8" }}>
                                {friend.nickname?.charAt(0) || friend.wechatId?.charAt(0) || "?"}
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b", marginBottom: "2px" }}>
                              {friend.nickname || friend.wechatId}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              微信ID: {friend.wechatId}
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ color: "#3b82f6", fontSize: "16px" }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Popup>
      </div>
    );
  },
);

BasicSettings.displayName = "BasicSettings";

export default BasicSettings;
