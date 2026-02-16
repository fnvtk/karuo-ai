import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import {
  SearchOutlined,
  ReloadOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { Toast } from "antd-mobile";
import { Input, Button, Checkbox, Pagination } from "antd";
import styles from "./index.module.scss";
import { Empty, Avatar } from "antd-mobile";
import { useNavigate } from "react-router-dom";
import NavCommon from "@/components/NavCommon";
import { fetchTrafficPoolList, fetchScenarioOptions, addPackage } from "./api";
import type { TrafficPoolUser, ScenarioOption } from "./data";
import DataAnalysisPanel from "./DataAnalysisPanel";
import FilterModal from "./FilterModal";
import BatchAddModal from "./BatchAddModal";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
const defaultAvatar =
  "https://cdn.jsdelivr.net/gh/maokaka/static/avatar-default.png";

const TrafficPoolList: React.FC = () => {
  const navigate = useNavigate();

  // 基础状态
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<TrafficPoolUser[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  // 筛选相关
  const [showFilter, setShowFilter] = useState(false);
  const [scenarioOptions, setScenarioOptions] = useState<ScenarioOption[]>([]);

  // 公共筛选条件状态
  const [filterParams, setFilterParams] = useState({
    selectedDevices: [] as DeviceSelectionItem[],
    packageId: 0,
    scenarioId: 0,
    userValue: 0,
    userStatus: 0,
  });

  // 批量相关
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchModal, setBatchModal] = useState(false);

  // 数据分析
  const [showStats, setShowStats] = useState(false);

  // 获取列表
  const getList = async (customParams?: any) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
        keyword: search,
        packageld: filterParams.packageId,
        sceneId: filterParams.scenarioId,
        userValue: filterParams.userValue,
        addStatus: filterParams.userStatus,
        deviceld: filterParams.selectedDevices.map(d => d.id).join(),
        ...customParams, // 允许传入自定义参数覆盖
      };

      const res = await fetchTrafficPoolList(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (error) {
      // 忽略请求过于频繁的错误，避免页面崩溃
      if (error !== "请求过于频繁，请稍后再试") {
        console.error("获取列表失败:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取筛选项
  useEffect(() => {
    fetchScenarioOptions().then(res => {
      setScenarioOptions(res.list || []);
    });
  }, []);

  // 全选/反选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(list.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 单选
  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(i => i !== id),
    );
  };

  // 批量加入分组/流量池
  const handleBatchAdd = async options => {
    try {
      // 构建请求参数
      const params = {
        type: "2", // 2选择用户
        addPackageId: options.selectedPackageId, // 目标分组ID
        userIds: selectedIds.map(id => id), // 选中的用户ID数组
        // 如果有当前筛选条件，也可以传递
        ...(filterParams.packageId && {
          packageId: filterParams.packageId,
        }),
        ...(filterParams.scenarioId && {
          taskId: filterParams.scenarioId,
        }),
        ...(filterParams.userValue && {
          userValue: filterParams.userValue,
        }),
        ...(filterParams.userStatus && {
          addStatus: filterParams.userStatus,
        }),
        ...(filterParams.selectedDevices.length > 0 && {
          deviceId: filterParams.selectedDevices.map(d => d.id).join(","),
        }),
        ...(search && { keyword: search }),
      };

      console.log("批量加入请求参数:", params);

      // 调用接口
      const result = await addPackage(params);
      console.log("批量加入结果:", result);

      // 成功后刷新列表
      getList();

      // 关闭弹窗并清空选择
      setBatchModal(false);
      setSelectedIds([]);

      // 可以添加成功提示
      Toast.show({
        content: `成功将用户加入分组`,
        position: "top",
      });
    } catch (error) {
      console.error("批量加入失败:", error);
      // 可以添加错误提示
      Toast.show({ content: "批量加入失败，请重试", position: "top" });
    }
  };

  // 搜索防抖处理
  const [searchInput, setSearchInput] = useState(search);

  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      // 搜索时重置到第一页并请求列表
      setPage(1);
      getList({ keyword: searchInput, page: 1 });
    }, 500); // 500ms 防抖延迟

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const handSearch = (value: string) => {
    setSearchInput(value);
    setSelectedIds([]);
    debouncedSearch();
  };

  return (
    <Layout
      loading={loading}
      header={
        <>
          <NavCommon
            title="流量池用户列表"
            right={
              <Button
                onClick={() => setShowStats(s => !s)}
                style={{ marginLeft: 8 }}
              >
                <BarChartOutlined /> {showStats ? "收起分析" : "数据分析"}
              </Button>
            }
          />
          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索计划名称"
                value={searchInput}
                onChange={e => handSearch(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              onClick={() => getList()}
              loading={loading}
              size="large"
              icon={<ReloadOutlined />}
            ></Button>
          </div>
          {/* 数据分析面板 */}
          <DataAnalysisPanel
            showStats={showStats}
            setShowStats={setShowStats}
            onConfirm={statsData => {
              // 可以在这里处理统计数据，比如更新本地状态或发送到父组件
              console.log("收到统计数据:", statsData);
            }}
          />

          {/* 批量操作栏 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px 8px 26px",
              background: "#fff",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Checkbox
              checked={selectedIds.length === list.length && list.length > 0}
              onChange={e => handleSelectAll(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span>全选</span>
            {selectedIds.length > 0 && (
              <>
                <span
                  style={{ marginLeft: 16, color: "#1677ff" }}
                >{`已选${selectedIds.length}项`}</span>
                <Button
                  size="small"
                  color="primary"
                  style={{ marginLeft: 16 }}
                  onClick={() => setBatchModal(true)}
                >
                  批量加入分组
                </Button>
              </>
            )}
            {searchInput.length > 0 && (
              <>
                <Button
                  size="small"
                  type="primary"
                  style={{ marginLeft: 16 }}
                  onClick={() => setBatchModal(true)}
                >
                  导入当前搜索结果
                </Button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <Button
              size="small"
              style={{ marginLeft: 8 }}
              onClick={() => setShowFilter(true)}
            >
              筛选
            </Button>
          </div>
        </>
      }
      footer={
        <div className="pagination-container">
          <Pagination
            current={page}
            pageSize={20}
            total={total}
            showSizeChanger={false}
            onChange={newPage => {
              setPage(newPage);
              getList({ page: newPage });
            }}
          />
        </div>
      }
    >
      {/* 批量加入分组弹窗 */}
      <BatchAddModal
        visible={batchModal}
        onClose={() => setBatchModal(false)}
        selectedCount={selectedIds.length}
        onConfirm={data => {
          // 处理批量加入逻辑
          handleBatchAdd(data);
        }}
      />
      {/* 筛选弹窗 */}
      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onConfirm={filters => {
          // 更新公共筛选条件状态
          const newFilterParams = {
            selectedDevices: filters.selectedDevices,
            packageId: filters.packageld,
            scenarioId: filters.sceneId,
            userValue: filters.userValue,
            userStatus: filters.addStatus,
          };

          setFilterParams(newFilterParams);
          // 重置到第一页并请求列表
          setPage(1);
          getList({
            page: 1,
            packageld: newFilterParams.packageId,
            sceneId: newFilterParams.scenarioId,
            userValue: newFilterParams.userValue,
            addStatus: newFilterParams.userStatus,
            deviceld: newFilterParams.selectedDevices.map(d => d.id).join(),
          });
        }}
        scenarioOptions={scenarioOptions}
        initialFilters={filterParams}
      />
      <div className={styles.listWrap}>
        {list.length === 0 && !loading ? (
          <Empty description="暂无数据" />
        ) : (
          <div>
            {list.map(item => (
              <div key={item.id} className={styles.cardWrap}>
                <div
                  className={styles.card}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(
                      `/mine/traffic-pool/detail/${item.wechatId}/${item.id}`,
                    )
                  }
                >
                  <div className={styles.cardContent}>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={e => handleSelect(item.id, e.target.checked)}
                      style={{ marginRight: 8 }}
                      onClick={e => e.stopPropagation()}
                      className={styles.checkbox}
                    />
                    <Avatar
                      src={item.avatar || defaultAvatar}
                      style={{ "--size": "60px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className={styles.title}>
                        {item.nickname || item.identifier}
                        {/* 性别icon可自行封装 */}
                      </div>
                      <div className={styles.desc}>
                        微信号：{item.wechatId || "-"}
                      </div>
                      <div className={styles.desc}>
                        来源：{item.fromd || "-"}
                      </div>
                      <div className={styles.desc}>
                        分组：
                        {item.packages && item.packages.length
                          ? item.packages.join("，")
                          : "-"}
                      </div>
                      <div className={styles.desc}>
                        创建时间：{item.createTime}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TrafficPoolList;
