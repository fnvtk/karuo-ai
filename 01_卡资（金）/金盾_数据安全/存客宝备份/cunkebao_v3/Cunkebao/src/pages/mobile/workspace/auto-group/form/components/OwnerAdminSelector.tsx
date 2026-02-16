import React, { useImperativeHandle, forwardRef } from "react";
import { Form, Card, Tabs } from "antd";
import DeviceSelection from "@/components/DeviceSelection";
import FriendSelection from "@/components/FriendSelection";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { FriendSelectionItem } from "@/components/FriendSelection/data";

interface OwnerAdminSelectorProps {
  selectedOwners: DeviceSelectionItem[];
  selectedAdmins: FriendSelectionItem[];
  onNext: (data: {
    devices: string[];
    devicesOptions: DeviceSelectionItem[];
    admins: string[];
    adminsOptions: FriendSelectionItem[];
  }) => void;
}

export interface OwnerAdminSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const OwnerAdminSelector = forwardRef<
  OwnerAdminSelectorRef,
  OwnerAdminSelectorProps
>(({ selectedOwners, selectedAdmins, onNext }, ref) => {
  const [form] = Form.useForm();
  const [owners, setOwners] = React.useState<DeviceSelectionItem[]>(
    selectedOwners || []
  );
  const [admins, setAdmins] = React.useState<FriendSelectionItem[]>(
    selectedAdmins || []
  );

  // 当外部传入的 selectedOwners 或 selectedAdmins 变化时，同步内部状态
  React.useEffect(() => {
    setOwners(selectedOwners || []);
  }, [selectedOwners]);

  React.useEffect(() => {
    setAdmins(selectedAdmins || []);
  }, [selectedAdmins]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    validate: async () => {
      // 验证群主和管理员
      if (owners.length === 0) {
        form.setFields([
          {
            name: "devices",
            errors: ["请选择一个群主"],
          },
        ]);
        return false;
      }
      if (owners.length > 1) {
        form.setFields([
          {
            name: "devices",
            errors: ["群主只能选择一个设备"],
          },
        ]);
        return false;
      }
      if (admins.length === 0) {
        form.setFields([
          {
            name: "admins",
            errors: ["请至少选择一个管理员"],
          },
        ]);
        return false;
      }
      // 清除错误
      form.setFields([
        {
          name: "devices",
          errors: [],
        },
        {
          name: "admins",
          errors: [],
        },
      ]);
      return true;
    },
    getValues: () => {
      return {
        devices: owners.map(o => o.id.toString()),
        admins: admins.map(a => a.id.toString()),
        devicesOptions: owners,
        adminsOptions: admins,
      };
    },
  }));

  // 群主选择（设备选择）
  const handleOwnersSelect = (selectedDevices: DeviceSelectionItem[]) => {
    const previousOwnerId = owners.length > 0 ? owners[0]?.id : null;
    const newOwnerId = selectedDevices.length > 0 ? selectedDevices[0]?.id : null;

    // 当群主改变时，清空已选的管理员（因为筛选条件变了）
    const shouldClearAdmins = previousOwnerId !== newOwnerId;

    setOwners(selectedDevices);
    const ownerIds = selectedDevices.map(d => d.id.toString());
    form.setFieldValue("devices", ownerIds);

    if (shouldClearAdmins) {
      setAdmins([]);
      form.setFieldValue("admins", []);
    }

    // 通知父组件数据变化
    onNext({
      devices: ownerIds,
      devicesOptions: selectedDevices,
      admins: shouldClearAdmins ? [] : admins.map(a => a.id.toString()),
      adminsOptions: shouldClearAdmins ? [] : admins,
    });
  };

  // 管理员选择
  const handleAdminsSelect = (selectedFriends: FriendSelectionItem[]) => {
    setAdmins(selectedFriends);
    const adminIds = selectedFriends.map(f => f.id.toString());
    form.setFieldValue("admins", adminIds);
    // 通知父组件数据变化
    onNext({
      devices: owners.map(o => o.id.toString()),
      devicesOptions: owners,
      admins: adminIds,
      adminsOptions: selectedFriends,
    });
  };

  const tabItems = [
    {
      key: "devices",
      label: `群主 (${owners.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: 14 }}>
              请选择一个群主（设备），该设备将作为新建群聊的群主
            </p>
          </div>
          <Form.Item
            name="devices"
            validateStatus={owners.length === 0 || owners.length > 1 ? "error" : ""}
            help={
              owners.length === 0
                ? "请选择一个群主（设备）"
                : owners.length > 1
                  ? "群主只能选择一个设备"
                  : ""
            }
          >
            <DeviceSelection
              selectedOptions={owners}
              onSelect={handleOwnersSelect}
              placeholder="选择群主（设备）"
              singleSelect={true}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "admins",
      label: `管理员 (${admins.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: 14 }}>
              {owners.length === 0
                ? "请先选择群主（设备），然后选择该设备下的好友作为管理员"
                : "请选择管理员，管理员将协助管理新建的群聊（仅显示所选设备下的好友）"}
            </p>
          </div>
          <Form.Item
            name="admins"
            validateStatus={admins.length === 0 ? "error" : ""}
            help={
              owners.length === 0
                ? "请先选择群主（设备）"
                : admins.length === 0
                  ? "请至少选择一个管理员"
                  : ""
            }
          >
            <FriendSelection
              selectedOptions={admins}
              onSelect={handleAdminsSelect}
              placeholder={owners.length === 0 ? "请先选择群主" : "选择管理员"}
              deviceIds={owners.length > 0 ? owners.map(d => d.id) : []}
              enableDeviceFilter={true}
              readonly={owners.length === 0}
            />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          devices: (selectedOwners || []).map(item => item.id.toString()),
          admins: (selectedAdmins || []).map(item => item.id.toString()),
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            选择群主和管理员
          </h2>
          <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
            请选择一个群主（设备）和管理员（好友），他们将负责管理新建的群聊
          </p>
        </div>

        <Tabs items={tabItems} />
      </Form>
    </Card>
  );
});

OwnerAdminSelector.displayName = "OwnerAdminSelector";

export default OwnerAdminSelector;
