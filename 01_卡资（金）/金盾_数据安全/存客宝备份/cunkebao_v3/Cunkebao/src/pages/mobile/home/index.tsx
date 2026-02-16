import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavCommon from "@/components/NavCommon";
import {
  MobileOutlined,
  MessageOutlined,
  TeamOutlined,
  RiseOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import MeauMobile from "@/components/MeauMobile/MeauMoible";
import Layout from "@/components/Layout/Layout";
import LineChart from "@/components/LineChart";
import {
  getPlanStats,
  getSevenDayStats,
  getTodayStats,
  getDashboard,
} from "./api";
import style from "./index.module.scss";
import UpdateNotification from "@/components/UpdateNotification";

interface DashboardData {
  deviceNum?: number;
  wechatNum?: number;
  aliveWechatNum?: number;
}

interface SevenDayStatsData {
  date?: string[];
  allNum?: number[];
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [sceneStats, setSceneStats] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [sevenDayStats, setSevenDayStats] = useState<SevenDayStatsData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 并行请求多个接口
        const [dashboardResult, planStatsResult, sevenDayResult, todayResult] =
          await Promise.allSettled([
            getDashboard(),
            getPlanStats({ num: 4 }),
            getSevenDayStats(),
            getTodayStats(),
          ]);

        // 处理仪表板数据
        if (dashboardResult.status === "fulfilled") {
          setDashboard(dashboardResult.value);
        } else {
          console.warn("仪表板API失败:", dashboardResult.reason);
        }

        // 处理计划统计数据
        if (planStatsResult.status === "fulfilled") {
          setSceneStats(planStatsResult.value);
        } else {
          console.warn("计划统计API失败:", planStatsResult.reason);
        }

        // 处理七天统计数据
        if (sevenDayResult.status === "fulfilled") {
          setSevenDayStats(sevenDayResult.value);
        } else {
          console.warn("七天统计API失败:", sevenDayResult.reason);
        }

        // 处理今日统计数据
        if (todayResult.status === "fulfilled") {
          const todayStatsData = [
            {
              label: "同步朋友圈",
              value: todayResult.value?.momentsNum || 0,
              icon: (
                <MessageOutlined style={{ fontSize: 16, color: "#8b5cf6" }} />
              ),
              color: "#8b5cf6",
              path: "/workspace/moments-sync",
            },
            {
              label: "群发任务",
              value: todayResult.value?.groupPushNum || 0,
              icon: <TeamOutlined style={{ fontSize: 16, color: "#f97316" }} />,
              color: "#f97316",
              path: "/workspace/group-push",
            },
            {
              label: "获客转化率",
              value: todayResult.value?.passRate || "0%",
              icon: <RiseOutlined style={{ fontSize: 16, color: "#22c55e" }} />,
              color: "#22c55e",
              path: "/scenarios",
            },
            {
              label: "系统活跃度",
              value: todayResult.value?.sysActive || "0%",
              icon: (
                <LineChartOutlined style={{ fontSize: 16, color: "#3b82f6" }} />
              ),
              color: "#3b82f6",
              path: "/workspace",
            },
          ];
          setTodayStats(todayStatsData);
        } else {
          console.warn("今日统计API失败:", todayResult.reason);
        }
      } catch (error) {
        console.error("获取数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDevicesClick = () => {
    navigate("/mine/devices");
  };

  const handleWechatClick = () => {
    navigate("/wechat-accounts");
  };

  const handleAliveWechatClick = () => {
    navigate("/wechat-accounts?wechatStatus=1");
  };

  return (
    <Layout
      header={<NavCommon left={<></>} title="存客宝" />}
      footer={<MeauMobile activeKey="home" />}
      loading={isLoading}
    >
      <div className={style["home-page"]}>
        <div className={style["content-wrapper"]}>
          {/* 统计卡片 */}
          <div className={style["stats-grid"]}>
            <div className={style["stat-card"]} onClick={handleDevicesClick}>
              <div className={style["stat-label"]}>设备数量</div>
              <div className={style["stat-value"]}>
                <span>{dashboard.deviceNum || 0}</span>
                <MobileOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
              </div>
            </div>
            <div className={style["stat-card"]} onClick={handleWechatClick}>
              <div className={style["stat-label"]}>微信号数量</div>
              <div className={style["stat-value"]}>
                <span>{dashboard.wechatNum || 0}</span>
                <TeamOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
              </div>
            </div>
            <div
              className={style["stat-card"]}
              onClick={handleAliveWechatClick}
            >
              <div className={style["stat-label"]}>在线微信号</div>
              <div className={style["stat-value"]}>
                <span>{dashboard.aliveWechatNum || 0}</span>
                <LineChartOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
              </div>
              <div className={style["progress-bar"]}>
                <div
                  className={style["progress-fill"]}
                  style={{
                    width: `${
                      (dashboard.wechatNum || 0) > 0
                        ? ((dashboard.aliveWechatNum || 0) /
                            (dashboard.wechatNum || 1)) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* 场景获客统计 */}
          <div className={style["section"]}>
            <div className={style["section-header"]}>
              <h2 className={style["section-title"]}>场景获客统计</h2>
            </div>
            <div className={style["scene-grid"]}>
              {sceneStats.map(scenario => (
                <div
                  key={scenario.id}
                  className={style["scene-item"]}
                  onClick={() =>
                    navigate(
                      `/scenarios/list/${scenario.id}/${encodeURIComponent(
                        scenario.name,
                      )}`,
                    )
                  }
                >
                  <div className={style["scene-icon"]}>
                    <img
                      src={scenario.image || "/placeholder.svg"}
                      alt={scenario.name}
                      className={style["scene-image"]}
                    />
                  </div>
                  <div className={style["scene-value"]}>{scenario.allNum}</div>
                  <div className={style["scene-label"]}>{scenario.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 今日数据统计 */}
          <div className={style["section"]}>
            <div className={style["section-header"]}>
              <h2 className={style["section-title"]}>今日数据</h2>
            </div>
            <div className={style["today-grid"]}>
              {todayStats.map((stat, index) => (
                <div
                  key={index}
                  className={style["today-item"]}
                  onClick={() => stat.path && navigate(stat.path)}
                >
                  <div className={style["today-icon"]}>{stat.icon}</div>
                  <div>
                    <div className={style["today-value"]}>{stat.value}</div>
                    <div className={style["today-label"]}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 趋势图表 - 保持原有实现 */}
          <div className={style["section"]}>
            <div className={style["section-header"]}>
              <span className={style["section-title"]}>获客趋势</span>
            </div>
            <div className={style["chart-container"]}>
              <LineChart
                xData={sevenDayStats.date || []}
                yData={sevenDayStats.allNum || []}
              />
            </div>
          </div>
        </div>
      </div>
      <UpdateNotification position="top" autoReload={false} showToast={true} />
    </Layout>
  );
};

export default Home;
