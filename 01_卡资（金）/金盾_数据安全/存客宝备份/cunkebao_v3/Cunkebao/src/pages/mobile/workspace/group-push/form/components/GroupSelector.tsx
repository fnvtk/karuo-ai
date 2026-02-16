import React, { useImperativeHandle, forwardRef, useState } from "react";
import { Form, Card } from "antd";
import GroupSelection from "@/components/GroupSelection";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import FriendSelection from "@/components/FriendSelection";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import PoolSelection from "@/components/PoolSelection";
import { PoolSelectionItem } from "@/components/PoolSelection/data";

interface GroupSelectorProps {
  selectedGroups: GroupSelectionItem[];
  targetType: number; // 1=群推送，2=好友推送
  selectedFriends?: any[];
  selectedPools?: any[];
  onPrevious: () => void;
  onNext: (data: {
    wechatGroups?: string[];
    wechatGroupsOptions?: GroupSelectionItem[];
    wechatFriends?: string[];
    wechatFriendsOptions?: any[];
    poolGroups?: string[];
    poolGroupsOptions?: any[];
  }) => void;
}

export interface GroupSelectorRef {
  validate: () => Promise<boolean>;
  getValues: () => any;
}

const GroupSelector = forwardRef<GroupSelectorRef, GroupSelectorProps>(
  ({ selectedGroups, targetType, selectedFriends = [], selectedPools = [], onNext }, ref) => {
    const [form] = Form.useForm();
    const [friendsOptions, setFriendsOptions] = useState<FriendSelectionItem[]>(selectedFriends);
    const [poolsOptions, setPoolsOptions] = useState<PoolSelectionItem[]>(selectedPools);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      validate: async () => {
        try {
          if (targetType === 1) {
            // 群推送：必须选择群组
            form.setFieldsValue({
              wechatGroups: selectedGroups.map(item => item.id),
            });
            await form.validateFields(["wechatGroups"]);
          } else {
            // 好友推送：wechatFriends可选，但如果为空则必须选择流量池
            const friends = friendsOptions.map(item => String(item.id));
            const pools = poolsOptions.map(item => String(item.id));

            form.setFieldsValue({
              wechatFriends: friends,
              poolGroups: pools,
            });

            // 如果好友为空，则流量池必填
            if (friends.length === 0 && pools.length === 0) {
              form.setFields([
                {
                  name: "poolGroups",
                  errors: ["好友为空时，必须选择流量池"],
                },
              ]);
              throw new Error("好友为空时，必须选择流量池");
            }

            await form.validateFields(["wechatFriends", "poolGroups"]);
          }
          return true;
        } catch (error) {
          console.log("GroupSelector 表单验证失败:", error);
          return false;
        }
      },
      getValues: () => {
        return form.getFieldsValue();
      },
    }));

    // 群组选择（targetType=1）
    const handleGroupSelect = (wechatGroupsOptions: GroupSelectionItem[]) => {
      const wechatGroups = wechatGroupsOptions.map(item => item.id);
      form.setFieldValue("wechatGroups", wechatGroups);
      onNext({ wechatGroups, wechatGroupsOptions });
    };

    // 好友选择（targetType=2）
    const handleFriendSelect = (friendsOptions: FriendSelectionItem[]) => {
      setFriendsOptions(friendsOptions);
      const wechatFriends = friendsOptions.map(item => String(item.id));
      form.setFieldValue("wechatFriends", wechatFriends);
      onNext({
        wechatFriends,
        wechatFriendsOptions: friendsOptions,
        poolGroups: poolsOptions.map(p => String(p.id)),
        poolGroupsOptions: poolsOptions,
      });
    };

    // 流量池选择（targetType=2）
    const handlePoolSelect = (poolsOptions: PoolSelectionItem[]) => {
      setPoolsOptions(poolsOptions);
      const poolGroups = poolsOptions.map(item => String(item.id));
      form.setFieldValue("poolGroups", poolGroups);
      onNext({
        wechatFriends: friendsOptions.map(f => String(f.id)),
        wechatFriendsOptions: friendsOptions,
        poolGroups,
        poolGroupsOptions: poolsOptions,
      });
    };

    return (
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            groups: selectedGroups,
            friends: friendsOptions,
            pools: poolsOptions,
          }}
        >
          {targetType === 1 ? (
            // 群推送模式
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  选择推送群组
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
                  请选择要推送消息的微信群组
                </p>
              </div>

              <Form.Item
                name="wechatGroups"
                rules={[
                  {
                    required: true,
                    type: "array",
                    min: 1,
                    message: "请选择至少一个群组",
                  },
                  { type: "array", max: 50, message: "最多只能选择50个群组" },
                ]}
              >
                <GroupSelection
                  selectedOptions={selectedGroups}
                  onSelect={handleGroupSelect}
                  placeholder="选择要推送的群组"
                  readonly={false}
                  showSelectedList={true}
                  selectedListMaxHeight={300}
                />
              </Form.Item>
            </>
          ) : (
            // 好友推送模式
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  选择推送目标
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
                  可选择好友或流量池，好友为空时必须选择流量池
                </p>
              </div>

              {/* 好友选择（可选） */}
              <Form.Item
                name="wechatFriends"
                label="选择好友（可选）"
              >
                <FriendSelection
                  selectedOptions={friendsOptions}
                  onSelect={handleFriendSelect}
                  placeholder="选择要推送的好友"
                  readonly={false}
                  showSelectedList={true}
                  selectedListMaxHeight={300}
                />
              </Form.Item>

              {/* 流量池选择（当好友为空时必选） */}
              <Form.Item
                name="poolGroups"
                label="选择流量池"
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value) => {
                      const friends = getFieldValue("wechatFriends") || [];
                      if (friends.length === 0 && (!value || value.length === 0)) {
                        return Promise.reject(new Error("好友为空时，必须选择流量池"));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <PoolSelection
                  selectedOptions={poolsOptions}
                  onSelect={handlePoolSelect}
                  placeholder="选择流量池"
                  readonly={false}
                  showSelectedList={true}
                  selectedListMaxHeight={300}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Card>
    );
  },
);

GroupSelector.displayName = "GroupSelector";

export default GroupSelector;
