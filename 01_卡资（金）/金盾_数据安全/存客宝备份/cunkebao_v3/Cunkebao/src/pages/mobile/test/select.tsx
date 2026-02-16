import React, { useState } from "react";
import { Tabs, Tag } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import DeviceSelection from "@/components/DeviceSelection";
import FriendSelection from "@/components/FriendSelection";
import GroupSelection from "@/components/GroupSelection";
import ContentSelection from "@/components/ContentSelection";
import AccountSelection from "@/components/AccountSelection";
import PoolSelection from "@/components/PoolSelection";
import { isDevelopment } from "@/utils/env";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { ContentItem } from "@/components/ContentSelection/data";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { AccountItem } from "@/components/AccountSelection/data";
import { PoolSelectionItem } from "@/components/PoolSelection/data";
const ComponentTest: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pools");

  // 设备选择状态
  const [selectedDevices, setSelectedDevices] = useState<DeviceSelectionItem[]>(
    [],
  );

  // 群组选择状态
  const [selectedGroups, setSelectedGroups] = useState<GroupSelectionItem[]>(
    [],
  );

  // 内容库选择状态
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);

  const [selectedAccounts, setSelectedAccounts] = useState<AccountItem[]>([]);
  // 好友选择状态
  const [selectedFriendsOptions, setSelectedFriendsOptions] = useState<
    FriendSelectionItem[]
  >([]);

  // 流量池选择状态
  const [selectedPools, setSelectedPools] = useState<PoolSelectionItem[]>([]);
  return (
    <Layout header={<NavCommon title="组件调试" />}>
      <div style={{ padding: 16 }}>
        {isDevelopment && (
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <Tag color="orange" style={{ fontSize: "12px" }}>
              开发环境 - 组件测试
            </Tag>
          </div>
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.Tab title="好友选择" key="friends">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>FriendSelection 组件测试</h3>
              <FriendSelection
                selectedOptions={selectedFriendsOptions}
                onSelect={setSelectedFriendsOptions}
                placeholder="请选择微信好友"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
            </div>
          </Tabs.Tab>
          <Tabs.Tab title="内容库选择" key="libraries">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>ContentSelection 组件测试</h3>
              <ContentSelection
                selectedOptions={selectedContent}
                onSelect={setSelectedContent}
                placeholder="请选择内容库"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <strong>已选内容库:</strong> {selectedContent.length} 个
                <br />
                <strong>内容库ID:</strong>{" "}
                {selectedContent.map(c => c.id).join(", ") || "无"}
              </div>
            </div>
          </Tabs.Tab>

          <Tabs.Tab title="群组选择" key="groups2">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>GroupSelection 组件测试</h3>
              <GroupSelection
                selectedOptions={selectedGroups}
                onSelect={setSelectedGroups}
                placeholder="请选择微信群组"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <strong>已选群组:</strong> {selectedGroups.length} 个
                <br />
                <strong>群组ID:</strong>{" "}
                {selectedGroups.map(g => g.id).join(", ") || "无"}
              </div>
            </div>
          </Tabs.Tab>

          <Tabs.Tab title="设备选择" key="devices">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>DeviceSelection 组件测试</h3>
              <DeviceSelection
                selectedOptions={selectedDevices}
                onSelect={setSelectedDevices}
                placeholder="请选择设备"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <strong>已选设备:</strong> {selectedDevices.length} 个
                <br />
                <strong>设备ID:</strong>
                {selectedDevices.map(d => d.id).join(", ") || "无"}
              </div>
            </div>
          </Tabs.Tab>

          <Tabs.Tab title="账号选择" key="accounts">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>AccountSelection 组件测试</h3>
              <AccountSelection
                selectedOptions={selectedAccounts}
                onSelect={setSelectedAccounts}
                placeholder="请选择账号"
                showSelectedList={true}
                selectedListMaxHeight={300}
                // 可根据实际API和props补充其它参数
              />
              <div style={{ marginTop: 16 }}>
                <strong>已选账号：</strong>
                {selectedAccounts.length > 0
                  ? selectedAccounts.join(", ")
                  : "无"}
              </div>
            </div>
          </Tabs.Tab>

          <Tabs.Tab title="群组选择" key="groups">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>GroupSelection 组件测试</h3>
              <GroupSelection
                selectedOptions={selectedGroups}
                onSelect={setSelectedGroups}
                placeholder="请选择微信群组"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <strong>已选群组:</strong> {selectedGroups.length} 个
                <br />
                <strong>群组ID:</strong>{" "}
                {selectedGroups.map(g => g.id).join(", ") || "无"}
              </div>
            </div>
          </Tabs.Tab>

          <Tabs.Tab title="流量池选择" key="pools">
            <div style={{ padding: "16px 0" }}>
              <h3 style={{ marginBottom: 16 }}>PoolSelection 组件测试</h3>
              <PoolSelection
                selectedOptions={selectedPools}
                onSelect={setSelectedPools}
                placeholder="请选择流量池"
                showSelectedList={true}
                selectedListMaxHeight={300}
              />
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <strong>已选流量池:</strong> {selectedPools.length} 个
                <br />
                <strong>流量池ID:</strong>{" "}
                {selectedPools.map(p => p.id).join(", ") || "无"}
              </div>
            </div>
          </Tabs.Tab>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ComponentTest;
