import React, { useEffect, useState, useCallback } from "react";
import { Popup, SpinLoading, DatePicker } from "antd-mobile";
import { Button, message, Input } from "antd";
import { CloseOutlined, CalendarOutlined } from "@ant-design/icons";
import style from "./Popups.module.scss";
import { getFriendRequestTaskStats } from "../api";
import LineChart2 from "@/components/LineChart2";
interface StatisticsData {
  totalAll: number;
  totalError: number;
  totalPass: number;
  totalPassRate: number;
  totalSuccess: number;
  totalSuccessRate: number;
}

interface PoolListModalProps {
  visible: boolean;
  onClose: () => void;
  ruleId?: number;
  ruleName?: string;
}

const PoolListModal: React.FC<PoolListModalProps> = ({
  visible,
  onClose,
  ruleId,
  ruleName,
}) => {
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalAll: 0,
    totalError: 0,
    totalPass: 0,
    totalPassRate: 0,
    totalSuccess: 0,
    totalSuccessRate: 0,
  });

  const [xData, setXData] = useState<any[]>([]);
  const [yData, setYData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // 格式化日期为 YYYY-MM-DD
  const formatDate = useCallback((date: Date | null): string => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // 初始化默认时间（近7天）
  useEffect(() => {
    if (visible) {
      // 如果时间未设置，设置默认值为近7天
      if (!startTime || !endTime) {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        setStartTime(sevenDaysAgo);
        setEndTime(today);
      }
    } else {
      // 弹窗关闭时重置时间，下次打开时重新初始化
      setStartTime(null);
      setEndTime(null);
    }
  }, [visible]);

  // 当弹窗打开或有ruleId或时间筛选变化时，获取数据
  useEffect(() => {
    if (!visible || !ruleId) return;

      setLoading(true);
    const params: { startTime?: string; endTime?: string } = {};
    if (startTime) {
      params.startTime = formatDate(startTime);
    }
    if (endTime) {
      params.endTime = formatDate(endTime);
    }

    getFriendRequestTaskStats(ruleId.toString(), params)
        .then(res => {
          console.log(res);
          setXData(res.dateArray);
          setYData([
            res.allNumArray,
            res.errorNumArray,
            res.passNumArray,
            res.passRateArray,
            res.successNumArray,
            res.successRateArray,
          ]);
          setStatistics(res.totalStats);
      })
      .catch(error => {
        console.error("获取统计数据失败:", error);
        message.error("获取统计数据失败");
        })
        .finally(() => {
          setLoading(false);
        });
  }, [visible, ruleId, startTime, endTime, formatDate]);

  const title = ruleName ? `${ruleName} - 累计统计数据` : "累计统计数据";
  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: "70vh",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <div className={style.poolModal}>
        {/* 头部 */}
        <div className={style.poolModalHeader}>
          <h3 className={style.poolModalTitle}>{title}</h3>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={style.poolModalClose}
          />
        </div>

        {/* 时间筛选 */}
        <div className={style.dateFilter}>
          <div className={style.dateFilterItem}>
            <label className={style.dateFilterLabel}>开始时间</label>
            <Input
              readOnly
              placeholder="请选择开始时间"
              value={startTime ? formatDate(startTime) : ""}
              onClick={() => setShowStartTimePicker(true)}
              prefix={<CalendarOutlined />}
              className={style.dateFilterInput}
            />
            <DatePicker
              visible={showStartTimePicker}
              title="开始时间"
              value={startTime}
              max={endTime || new Date()}
              onClose={() => setShowStartTimePicker(false)}
              onConfirm={val => {
                setStartTime(val);
                setShowStartTimePicker(false);
              }}
            />
          </div>
          <div className={style.dateFilterItem}>
            <label className={style.dateFilterLabel}>结束时间</label>
            <Input
              readOnly
              placeholder="请选择结束时间"
              value={endTime ? formatDate(endTime) : ""}
              onClick={() => setShowEndTimePicker(true)}
              prefix={<CalendarOutlined />}
              className={style.dateFilterInput}
            />
            <DatePicker
              visible={showEndTimePicker}
              title="结束时间"
              value={endTime}
              min={startTime || undefined}
              max={new Date()}
              onClose={() => setShowEndTimePicker(false)}
              onConfirm={val => {
                setEndTime(val);
                setShowEndTimePicker(false);
              }}
            />
          </div>
        </div>

        {/* 统计数据表格 */}
        <div className={style.statisticsContent}>
          {loading ? (
            <div className={style.statisticsLoading}>
              <SpinLoading color="primary" />
              <div className={style.statisticsLoadingText}>
                正在加载统计数据...
              </div>
            </div>
          ) : (
            <div className={style.statisticsTable}>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>总计</div>
                <div className={style.statisticsValue}>
                  {statistics.totalAll}
                </div>
              </div>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>扫码</div>
                <div className={style.statisticsValue}>
                  {statistics.totalError}
                </div>
              </div>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>成功</div>
                <div className={style.statisticsValue}>
                  {statistics.totalSuccess}
                </div>
              </div>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>失败</div>
                <div className={style.statisticsValue}>
                  {statistics.totalError}
                </div>
              </div>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>通过</div>
                <div className={style.statisticsValue}>
                  {statistics.totalPass}
                </div>
              </div>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>成功率</div>
                <div className={style.statisticsValue}>
                  {statistics.totalSuccessRate}%
                </div>
              </div>
              <div className={style.statisticsRow}>
                <div className={style.statisticsLabel}>通过率</div>
                <div className={style.statisticsValue}>
                  {statistics.totalPassRate}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 趋势图占位 */}
        <div className={style.trendChart}>
          <div className={style.chartTitle}>趋势图</div>
          <div className={style.chartPlaceholder}>
            <LineChart2 title="趋势图" xData={xData} yData={yData} />
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default PoolListModal;
