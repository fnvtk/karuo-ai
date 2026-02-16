import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Toast,
  SpinLoading,
  Dialog,
  Popup,
  Card,
  Tag,
  InfiniteScroll,
} from "antd-mobile";
import { Input } from "antd";
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
  QrcodeOutlined,
  EditOutlined,
  MoreOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import {
  getPlanList,
  getPlanDetail,
  copyPlan,
  deletePlan,
  getWxMinAppCode,
} from "./api";
import style from "./index.module.scss";
import { Task, ApiSettings, PlanDetail } from "./data";
import PlanApi from "./planApi";
import { buildApiUrl } from "@/utils/apiUrl";
import DeviceListModal from "./components/DeviceListModal";
import AccountListModal from "./components/AccountListModal";
import OreadyAdd from "./components/OreadyAdd";
import PoolListModal from "./components/PoolListModal";

const ScenarioList: React.FC = () => {
  const { scenarioId, scenarioName } = useParams<{
    scenarioId: string;
    scenarioName: string;
  }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [currentApiSettings, setCurrentApiSettings] = useState<ApiSettings>({
    apiKey: "",
    webhookUrl: "",
    taskId: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImg, setQrImg] = useState<any>("");
  const [currentTaskId, setCurrentTaskId] = useState<string>("");
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // 设备列表弹窗状态
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  // 账号列表弹窗状态
  const [showAccountList, setShowAccountList] = useState(false);

  // 已添加弹窗状态
  const [showOreadyAdd, setShowOreadyAdd] = useState(false);

  // 通过率弹窗状态
  const [showPoolList, setShowPoolList] = useState(false);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 获取计划列表数据
  const fetchPlanList = async (page: number, isLoadMore: boolean = false) => {
    if (!scenarioId) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoadingTasks(true);
    }

    try {
      const response = await getPlanList({
        sceneId: scenarioId,
        page: page,
        limit: limit,
      });

      if (response && response.list) {
        // 处理 planType 字段
        const processedList = response.list.map((task: any) => ({
          ...task,
          planType: task.planType ?? task.config?.planType ?? 1, // 默认独立计划
        }));

        if (isLoadMore) {
          // 加载更多时，追加数据
          setTasks(prev => [...prev, ...processedList]);
        } else {
          // 首次加载或刷新时，替换数据
          setTasks(processedList);
        }

        // 更新分页信息
        setTotal(response.total || 0);
        setHasMore(processedList.length === limit);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("获取计划列表失败:", error);
      if (!isLoadMore) {
        setTasks([]);
      }
      Toast.show({
        content: "获取数据失败",
        position: "top",
      });
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoadingTasks(false);
      }
    }
  };

  useEffect(() => {
    const fetchScenarioData = async () => {
      if (!scenarioId) return;
      setLoading(true);

      try {
        await fetchPlanList(1, false);
      } catch (error) {
        console.error("获取场景数据失败:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScenarioData();
  }, [scenarioId]);

  // 加载更多
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || loadingTasks) return;
    const nextPage = currentPage + 1;
    await fetchPlanList(nextPage, true);
  };

  const handleCopyPlan = async (taskId: string) => {
    const taskToCopy = tasks.find(task => task.id === taskId);
    if (!taskToCopy) return;

    try {
      await copyPlan(taskId);
      Toast.show({
        content: `已成功复制"${taskToCopy.name}"`,
        position: "top",
      });
      // 刷新列表
      handleRefresh();
    } catch (error) {
      Toast.show({
        content: "复制失败，请重试",
        position: "top",
      });
    }
  };

  const handleDeletePlan = async (taskId: string) => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) return;

    const result = await Dialog.confirm({
      content: `确定要删除"${taskToDelete.name}"吗？`,
      confirmText: "删除",
      cancelText: "取消",
    });

    if (result) {
      try {
        await deletePlan(taskId);
        Toast.show({
          content: "计划已删除",
          position: "top",
        });
        // 刷新列表
        handleRefresh();
      } catch (error) {
        Toast.show({
          content: "删除失败，请重试",
          position: "top",
        });
      }
    }
  };

  const handleOpenApiSettings = async (taskId: string) => {
    try {
      const response: PlanDetail = await getPlanDetail(taskId);
      if (response) {
        // 处理webhook URL，使用工具函数构建完整地址
        const webhookUrl = buildApiUrl(
          response.textUrl?.fullUrl || `webhook/${taskId}`,
        );

        setCurrentApiSettings({
          apiKey: response.apiKey || "demo-api-key-123456",
          webhookUrl: webhookUrl,
          taskId: taskId,
        });
        setShowApiDialog(true);
      }
    } catch (error) {
      Toast.show({
        content: "获取计划接口失败",
        position: "top",
      });
    }
  };

  const handleCreateNewPlan = () => {
    navigate(`/scenarios/new/${scenarioId}`);
  };

  const handleShowQrCode = async (taskId: string) => {
    setQrLoading(true);
    setShowQrDialog(true);
    setQrImg("");
    setCurrentTaskId(taskId); // 设置当前任务ID

    try {
      const response = await getWxMinAppCode(taskId);
      setQrImg(response);
    } catch (error) {
      Toast.show({
        content: "获取二维码失败",
        position: "top",
      });
    } finally {
      setQrLoading(false);
    }
  };

  // 处理设备列表弹窗
  const handleShowDeviceList = (task: Task) => {
    setCurrentTask(task);
    setShowDeviceList(true);
  };

  // 处理账号列表弹窗
  const handleShowAccountList = (task: Task) => {
    setCurrentTask(task);
    setShowAccountList(true);
  };

  // 处理已添加弹窗
  const handleShowOreadyAdd = (task: Task) => {
    setCurrentTask(task);
    setShowOreadyAdd(true);
  };

  // 处理通过率弹窗
  const handleShowPoolList = (task: Task) => {
    setCurrentTask(task);
    setShowPoolList(true);
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "success";
      case 0:
        return "default";
      case -1:
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return "进行中";
      case 0:
        return "已暂停";
      case -1:
        return "已停止";
      default:
        return "未知";
    }
  };

  const handleRefresh = async () => {
    // 重置分页状态
    setCurrentPage(1);
    setHasMore(true);
    await fetchPlanList(1, false);
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 分隔全局计划和独立计划
  const globalPlans = filteredTasks.filter(task => task.planType === 0);
  const independentPlans = filteredTasks.filter(task => task.planType === 1 || !task.planType);

  // 生成操作菜单
  const getActionMenu = (task: Task) => [
    {
      key: "edit",
      text: "编辑计划",
      icon: <EditOutlined />,
      onClick: () => {
        setShowActionMenu(null);
        navigate(`/scenarios/edit/${task.id}`);
      },
    },
    {
      key: "copy",
      text: "复制计划",
      icon: <CopyOutlined />,
      onClick: () => {
        setShowActionMenu(null);
        handleCopyPlan(task.id);
      },
    },
    {
      key: "settings",
      text: "计划接口",
      icon: <SettingOutlined />,
      onClick: () => {
        setShowActionMenu(null);
        handleOpenApiSettings(task.id);
      },
    },

    {
      key: "delete",
      text: "删除计划",
      icon: <DeleteOutlined />,
      onClick: () => {
        setShowActionMenu(null);
        handleDeletePlan(task.id);
      },
      danger: true,
    },
  ];

  const deviceCount = (task: Task) => {
    return Array.isArray(task.reqConf?.device)
      ? task.reqConf!.device.length
      : Array.isArray(task.reqConf?.selectedDevices)
        ? task.reqConf!.selectedDevices.length
        : 0;
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            backFn={() => navigate("/scenarios")}
            title={scenarioName || ""}
            right={
              scenarioId !== "10" ? (
              <Button
                size="small"
                color="primary"
                onClick={handleCreateNewPlan}
              >
                <PlusOutlined /> 新建计划
              </Button>
              ) : null
            }
          />

          {/* 搜索栏 */}
          <div className={style["search-bar"]}>
            <div className={style["search-input-wrapper"]}>
              <Input
                placeholder="搜索计划名称"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              size="small"
              onClick={handleRefresh}
              loading={loadingTasks}
              className="refresh-btn"
            >
              <ReloadOutlined />
            </Button>
          </div>
        </>
      }
      loading={loading}
    >
      <div className={style["scenario-list-page"]}>
        {/* 全局计划提示 */}
        {globalPlans.length > 0 && (
          <div className={style["info-box"]}>
            <span className={style["info-icon"]}>ℹ</span>
            <p className={style["info-text"]}>
              全局获客计划将应用于所有设备，包含新添加的设备，请确保设置合理的规则。
            </p>
          </div>
        )}

        {/* 计划列表 */}
        <div className={style["plan-list"]}>
          {filteredTasks.length === 0 ? (
            <div className={style["empty-state"]}>
              <div className={style["empty-text"]}>
                {searchTerm ? "没有找到匹配的计划" : "暂无计划"}
              </div>
              {scenarioId !== "10" && (
              <Button
                color="primary"
                onClick={handleCreateNewPlan}
                className={style["create-first-btn"]}
              >
                <PlusOutlined /> 创建第一个计划
              </Button>
              )}
            </div>
          ) : (
            <>
              {/* 全局获客计划 */}
              {globalPlans.length > 0 && (
                <section className={style["section"]}>
                  <h2 className={style["section-title"]}>
                    <div className={style["section-dot"]}></div>
                    全局获客计划
                  </h2>
                  <div className={style["plan-list-group"]}>
                    {globalPlans.map(task => (
                <Card key={task.id} className={style["plan-item"]}>
                  {/* 头部：标题、状态和操作菜单 */}
                  <div className={style["plan-header"]}>
                    <div className={style["plan-name"]}>{task.name}</div>
                    <div className={style["plan-header-right"]}>
                      <Tag color={getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </Tag>
                      <Button
                        size="mini"
                        fill="none"
                        className={style["more-btn"]}
                        onClick={e => {
                          e.stopPropagation(); // 阻止事件冒泡
                          setShowActionMenu(task.id);
                        }}
                      >
                        <MoreOutlined />
                      </Button>
                    </div>
                  </div>

                  {/* 统计数据网格 */}
                  <div className={style["stats-grid"]}>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowDeviceList(task);
                      }}
                    >
                      <div className={style["stat-label"]}>设备数</div>
                      <div className={style["stat-value"]}>
                        {deviceCount(task)}
                      </div>
                    </div>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowAccountList(task);
                      }}
                    >
                      <div className={style["stat-label"]}>已获客</div>
                      <div className={style["stat-value"]}>
                        {task?.acquiredCount || 0}
                      </div>
                    </div>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowOreadyAdd(task);
                      }}
                    >
                      <div className={style["stat-label"]}>已添加</div>
                      <div className={style["stat-value"]}>
                        {task.passCount || 0}
                      </div>
                    </div>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowPoolList(task);
                      }}
                    >
                      <div className={style["stat-label"]}>通过率</div>
                      <div className={style["stat-value"]}>
                        {task.passRate}%
                      </div>
                    </div>
                  </div>

                  {/* 底部：上次执行时间 */}
                  <div className={style["plan-footer"]}>
                    <div className={style["last-execution"]}>
                      <ClockCircleOutlined />
                      <span>上次执行: {task.lastUpdated || "--"}</span>
                    </div>
                    <div>
                      <QrcodeOutlined
                        onClick={() => {
                          setShowActionMenu(null);
                          handleShowQrCode(task.id);
                        }}
                      />
                    </div>
                  </div>
                </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* 独立获客计划 */}
              {independentPlans.length > 0 && (
                <section className={style["section"]}>
                  <h2 className={`${style["section-title"]} ${style["section-title-independent"]}`}>
                    <div className={`${style["section-dot"]} ${style["section-dot-independent"]}`}></div>
                    独立获客计划
                  </h2>
                  <div className={style["plan-list-group"]}>
                    {independentPlans.map(task => (
                <Card key={task.id} className={style["plan-item"]}>
                  {/* 头部：标题、状态和操作菜单 */}
                  <div className={style["plan-header"]}>
                    <div className={style["plan-name"]}>{task.name}</div>
                    <div className={style["plan-header-right"]}>
                      <Tag color={getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </Tag>
                      <Button
                        size="mini"
                        fill="none"
                        className={style["more-btn"]}
                        onClick={e => {
                          e.stopPropagation(); // 阻止事件冒泡
                          setShowActionMenu(task.id);
                        }}
                      >
                        <MoreOutlined />
                      </Button>
                    </div>
                  </div>

                  {/* 统计数据网格 */}
                  <div className={style["stats-grid"]}>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowDeviceList(task);
                      }}
                    >
                      <div className={style["stat-label"]}>设备数</div>
                      <div className={style["stat-value"]}>
                        {deviceCount(task)}
                      </div>
                    </div>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowAccountList(task);
                      }}
                    >
                      <div className={style["stat-label"]}>已获客</div>
                      <div className={style["stat-value"]}>
                        {task?.acquiredCount || 0}
                      </div>
                    </div>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowOreadyAdd(task);
                      }}
                    >
                      <div className={style["stat-label"]}>已添加</div>
                      <div className={style["stat-value"]}>
                        {task.passCount || 0}
                      </div>
                    </div>
                    <div
                      className={style["stat-item"]}
                      onClick={e => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                        handleShowPoolList(task);
                      }}
                    >
                      <div className={style["stat-label"]}>通过率</div>
                      <div className={style["stat-value"]}>
                        {task.passRate}%
                      </div>
                    </div>
                  </div>

                  {/* 底部：上次执行时间 */}
                  <div className={style["plan-footer"]}>
                    <div className={style["last-execution"]}>
                      <ClockCircleOutlined />
                      <span>上次执行: {task.lastUpdated || "--"}</span>
                    </div>
                    <div>
                      <QrcodeOutlined
                        onClick={() => {
                          setShowActionMenu(null);
                          handleShowQrCode(task.id);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
                  </div>
                </section>
              )}

              {/* 上拉加载更多 */}
              <InfiniteScroll
                loadMore={handleLoadMore}
                hasMore={hasMore}
                threshold={100}
              >
                {loadingMore && (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <SpinLoading color="primary" style={{ fontSize: 16 }} />
                    <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>
                      加载中...
                    </span>
                  </div>
                )}
                {!hasMore && filteredTasks.length > 0 && (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#999",
                      fontSize: 12,
                    }}
                  >
                    没有更多了
                  </div>
                )}
              </InfiniteScroll>
            </>
          )}
        </div>

        {/* 计划接口弹窗 */}
        <PlanApi
          visible={showApiDialog}
          onClose={() => setShowApiDialog(false)}
          apiKey={currentApiSettings.apiKey}
          webhookUrl={currentApiSettings.webhookUrl}
          taskId={currentApiSettings.taskId}
        />

        {/* 操作菜单弹窗 */}
        <Popup
          visible={!!showActionMenu}
          onMaskClick={() => setShowActionMenu(null)}
          position="bottom"
          bodyStyle={{ height: "auto", maxHeight: "60vh" }}
        >
          <div className={style["action-menu-dialog"]}>
            <div className={style["dialog-header"]}>
              <h3>操作菜单</h3>
              <Button size="small" onClick={() => setShowActionMenu(null)}>
                关闭
              </Button>
            </div>
            <div className={style["dialog-content"]}>
              {showActionMenu &&
                getActionMenu(tasks.find(t => t.id === showActionMenu)!).map(
                  item => (
                    <div
                      key={item.key}
                      className={`${style["action-menu-item"]} ${item.danger ? style["danger"] : ""}`}
                      onClick={item.onClick}
                    >
                      <span className={style["action-icon"]}>{item.icon}</span>
                      <span className={style["action-text"]}>{item.text}</span>
                    </div>
                  ),
                )}
            </div>
          </div>
        </Popup>

        {/* 二维码弹窗 */}
        <Popup
          visible={showQrDialog}
          onMaskClick={() => setShowQrDialog(false)}
          position="bottom"
        >
          <div className={style["qr-dialog"]}>
            <div className={style["dialog-header"]}>
              <h3>小程序二维码</h3>
              <Button size="small" onClick={() => setShowQrDialog(false)}>
                关闭
              </Button>
            </div>
            <div className={style["dialog-content"]}>
              {qrLoading ? (
                <div className={style["qr-loading"]}>
                  <SpinLoading color="primary" />
                  <div>生成二维码中...</div>
                </div>
              ) : (
                <>
                  {/* 二维码显示区域 */}
                  {qrImg ? (
                    <img
                      src={qrImg}
                      alt="小程序二维码"
                      className={style["qr-image"]}
                    />
                  ) : (
                    <div className={style["qr-error"]}>
                      <QrcodeOutlined style={{ fontSize: 48, color: "#999", marginBottom: 12 }} />
                      <div>二维码生成失败</div>
                    </div>
                  )}

                  {/* H5链接展示 - 无论二维码是否成功都要显示 */}
                  {currentTaskId && (
                    <div className={style["qr-link-section"]}>
                      <div className={style["link-label"]}>H5链接</div>
                      <div className={style["link-input-wrapper"]}>
                        <Input
                          value={`https://h5.ckb.quwanzhi.com/#/pages/form/input2?id=${currentTaskId}`}
                          readOnly
                          className={style["link-input"]}
                          placeholder="H5链接"
                        />
                        <Button
                          size="small"
                          onClick={() => {
                            const link = `https://h5.ckb.quwanzhi.com/#/pages/form/input2?id=${currentTaskId}`;
                            navigator.clipboard.writeText(link);
                            Toast.show({
                              content: "链接已复制到剪贴板",
                              position: "top",
                            });
                          }}
                          className={style["copy-button"]}
                        >
                          <CopyOutlined />
                          复制
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Popup>

        {/* 设备列表弹窗 */}
        <DeviceListModal
          visible={showDeviceList}
          onClose={() => setShowDeviceList(false)}
          ruleId={currentTask?.id ? parseInt(currentTask.id) : undefined}
          ruleName={currentTask?.name}
        />

        {/* 账号列表弹窗 */}
        <AccountListModal
          visible={showAccountList}
          onClose={() => setShowAccountList(false)}
          ruleId={currentTask?.id ? parseInt(currentTask.id) : undefined}
          ruleName={currentTask?.name}
        />

        {/* 已添加弹窗 */}
        <OreadyAdd
          visible={showOreadyAdd}
          onClose={() => setShowOreadyAdd(false)}
          ruleId={currentTask?.id ? parseInt(currentTask.id) : undefined}
          ruleName={currentTask?.name}
        />

        {/* 通过率弹窗 */}
        <PoolListModal
          visible={showPoolList}
          onClose={() => setShowPoolList(false)}
          ruleId={currentTask?.id ? parseInt(currentTask.id) : undefined}
          ruleName={currentTask?.name}
        />
      </div>
    </Layout>
  );
};

export default ScenarioList;
