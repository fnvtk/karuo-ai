import React, { useState, useEffect, useMemo } from "react";
import { Card, Button } from "antd-mobile";
import { fetchTrafficPoolList } from "./api";
import type { TrafficPoolUser } from "./data";

interface DataAnalysisPanelProps {
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  onConfirm: (stats: {
    total: number;
    highValue: number;
    added: number;
    pending: number;
    failed: number;
    addSuccessRate: number;
  }) => void;
}

const DataAnalysisPanel: React.FC<DataAnalysisPanelProps> = ({
  showStats,
  setShowStats,
  onConfirm,
}) => {
  const [list, setList] = useState<TrafficPoolUser[]>([]);
  const [loading, setLoading] = useState(false);

  // 计算统计数据
  const stats = useMemo(() => {
    const total = list.length;
    const highValue = list.filter(
      u => u.tags && u.tags.includes("高价值客户池"),
    ).length;
    const added = list.filter(u => u.status === 1).length;
    const pending = list.filter(u => u.status === 0).length;
    const failed = list.filter(u => u.status === -1).length;
    const addSuccessRate = total ? Math.round((added / total) * 100) : 0;
    return { total, highValue, added, pending, failed, addSuccessRate };
  }, [list]);

  // 获取数据
  useEffect(() => {
    if (showStats) {
      setLoading(true);
      fetchTrafficPoolList({ page: 1, pageSize: 1000 }) // 获取所有数据进行统计
        .then(res => {
          setList(res.list || []);
          // 通过 onConfirm 抛出统计数据
          const total = res.list?.length || 0;
          const highValue =
            res.list?.filter(u => u.tags && u.tags.includes("高价值客户池"))
              .length || 0;
          const added = res.list?.filter(u => u.status === 1).length || 0;
          const pending = res.list?.filter(u => u.status === 0).length || 0;
          const failed = res.list?.filter(u => u.status === -1).length || 0;
          const addSuccessRate = total ? Math.round((added / total) * 100) : 0;

          onConfirm({
            total,
            highValue,
            added,
            pending,
            failed,
            addSuccessRate,
          });
        })
        .catch(error => {
          console.error("获取统计数据失败:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [showStats, onConfirm]);

  if (!showStats) return null;
  return (
    <div
      style={{
        background: "#fff",
        padding: "16px",
        margin: "8px 0",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          加载统计数据中...
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1677ff" }}>
                {stats.total}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>总用户数</div>
            </Card>
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#eb2f96" }}>
                {stats.highValue}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>高价值用户</div>
            </Card>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#52c41a" }}>
                {stats.addSuccessRate}%
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>添加成功率</div>
            </Card>
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#faad14" }}>
                {stats.added}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>已添加</div>
            </Card>
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#bfbfbf" }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>待添加</div>
            </Card>
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#ff4d4f" }}>
                {stats.failed}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>添加失败</div>
            </Card>
          </div>
        </>
      )}
      <Button
        size="small"
        style={{ marginTop: 12 }}
        onClick={() => setShowStats(false)}
      >
        收起分析
      </Button>
    </div>
  );
};

export default DataAnalysisPanel;
