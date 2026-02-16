import React, { useState } from "react";
import { Card, Select, Button, Space, Tag, List, message, Modal } from "antd";
import { DatabaseOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import PoolSelection from "@/components/PoolSelection";
import { PoolSelectionItem } from "@/components/PoolSelection/data";
import { setAiSettings } from "./api";
import styles from "./index.module.scss";

const { Option } = Select;

const ReceptionSettings: React.FC = () => {
  const [selectedPools, setSelectedPools] = useState<PoolSelectionItem[]>([]);
  const [mode, setMode] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { value: 0, label: "人工接待" },
    { value: 1, label: "AI辅助" },
    { value: 2, label: "AI接管" },
  ];

  // 处理流量池选择
  const handlePoolSelect = (pools: PoolSelectionItem[]) => {
    setSelectedPools(pools);
  };

  // 处理接待模式选择
  const handleModeChange = (value: number) => {
    setMode(value);
  };

  // 处理批量设置
  const handleBatchSet = async () => {
    if (selectedPools.length === 0) {
      message.warning("请先选择流量池");
      return;
    }

    const selectedModeLabel =
      typeOptions.find(opt => opt.value === mode)?.label || "人工接待";
    const poolNames = selectedPools
      .map(pool => pool.name || pool.nickname)
      .join("、");

    Modal.confirm({
      title: "确认批量设置",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您即将对以下流量池进行批量设置：</p>
          <div
            style={{
              margin: "12px 0",
              padding: "8px 12px",
              background: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <strong>流量池：</strong>
            {poolNames}
          </div>
          <div
            style={{
              margin: "12px 0",
              padding: "8px 12px",
              background: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <strong>接待模式：</strong>
            {selectedModeLabel}
          </div>
          <p style={{ color: "#ff4d4f", marginTop: "12px" }}>
            此操作将影响 {selectedPools.length}{" "}
            个流量池的接待设置，确定要继续吗？
          </p>
        </div>
      ),
      okText: "确认设置",
      cancelText: "取消",
      okType: "primary",
      onOk: async () => {
        setLoading(true);
        try {
          const packageIds = selectedPools.map(pool => pool.id);
          const params = {
            isUpdata: "1", // 1表示更新，0表示新增
            packageId: packageIds,
            type: mode,
          };

          const response = await setAiSettings(params);
          if (response) {
            message.success(
              `成功为 ${selectedPools.length} 个流量池设置接待模式为"${selectedModeLabel}"`,
            );
            // 可以在这里刷新流量池状态列表
          }
        } catch (error) {
          console.error("批量设置失败:", error);
          message.error("批量设置失败，请重试");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <Card
          title={
            <Space size={8}>
              <DatabaseOutlined />
              <span>全局接待模式</span>
            </Space>
          }
        >
          <div className={styles.tip}>
            支持按流量池批量设置，单个客户设置将覆盖流量池默认配置
          </div>

          <div className={styles.formItem}>
            <div className={styles.label}>选择流量池</div>
            <PoolSelection
              selectedOptions={selectedPools}
              onSelect={handlePoolSelect}
              placeholder="请选择流量池"
              showSelectedList={true}
              selectedListMaxHeight={200}
            />
          </div>

          <div className={styles.formItem}>
            <div className={styles.label}>接待模式</div>
            <Select
              value={mode}
              onChange={handleModeChange}
              style={{ width: "100%" }}
            >
              {typeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </div>

          <Button
            type="primary"
            block
            className={styles.primaryBtn}
            onClick={handleBatchSet}
            loading={loading}
          >
            批量设置
          </Button>
        </Card>
      </div>

      <div className={styles.right}>
        <Card
          title={
            <Space size={8}>
              <DatabaseOutlined />
              <span>流量池状态</span>
            </Space>
          }
        >
          {selectedPools.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={selectedPools}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name || item.nickname}
                    description={`${item.num || 0} 个客户`}
                  />
                  <Tag color="blue">
                    {typeOptions.find(opt => opt.value === mode)?.label ||
                      "人工接待"}
                  </Tag>
                </List.Item>
              )}
            />
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>请先选择流量池</div>
              <div className={styles.emptyDesc}>
                选择流量池后将显示其状态信息
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ReceptionSettings;
