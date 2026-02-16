import React from "react";
import { Input, Switch } from "antd";
import styles from "./base.module.scss";
import FriendSelection from "@/components/FriendSelection";
import type { FriendSelectionItem } from "@/components/FriendSelection/data";

interface GroupSettingsProps {
  formData: any;
  onChange: (data: any) => void;
}

const GroupSettings: React.FC<GroupSettingsProps> = ({ formData, onChange }) => {
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
            {/* 固定成员选择，复用好友选择组件 */}
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
                // 根据已选择设备过滤好友列表
                deviceIds={formData.deviceGroups || []}
                enableDeviceFilter={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSettings;
