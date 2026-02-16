import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import {
  Input,
  Button,
  Tag,
  Pagination,
  Spin,
  message,
  Switch,
  Dropdown,
  Menu,
} from "antd";
import NavCommon from "@/components/NavCommon";
import {
  fetchDistributionRuleList,
  toggleDistributionRuleStatus,
  deleteDistributionRule,
} from "./api";
import type { DistributionRule } from "./data";
import {
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  PauseOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import style from "./index.module.scss";
import { useNavigate } from "react-router-dom";
import AccountListModal from "./components/AccountListModal";
import DeviceListModal from "./components/DeviceListModal";
import PoolListModal from "./components/PoolListModal";
import SendRcrodModal from "./components/SendRcrodModal";

const PAGE_SIZE = 10;

const statusMap = {
  0: { text: "待处理", color: "default" },
  1: { text: "进行中", color: "processing" },
  2: { text: "已暂停", color: "warning" },
  3: { text: "已完成", color: "success" },
  4: { text: "失败", color: "error" },
};

const TrafficDistributionList: React.FC = () => {
  const [list, setList] = useState<DistributionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  // 优化：用menuLoadingId标记当前操作的item
  const [menuLoadingId, setMenuLoadingId] = useState<number | null>(null);
  // 弹窗控制
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [sendRecordModalVisible, setSendRecordModalVisible] = useState(false);
  const [currentRule, setCurrentRule] = useState<DistributionRule | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchList(page, searchQuery);
    // eslint-disable-next-line
  }, []);

  const fetchList = async (pageNum = 1, keyword = "") => {
    setLoading(true);
    try {
      const res = await fetchDistributionRuleList({
        page: pageNum,
        limit: PAGE_SIZE,
        keyword,
      });
      const rawList: DistributionRule[] = res?.list || [];
      const normalized = rawList.map(item => ({
        ...item,
        planType: (item as any).planType ?? item.config?.planType ?? 1,
      }));
      setList(normalized);
      setTotal(Number(res?.total) || 0);
    } catch (e) {
      message.error("获取流量分发列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchList(p, searchQuery);
  };

  const handleRefresh = () => {
    fetchList(page, searchQuery);
  };

  const globalRules = list.filter(item => item.planType === 0);
  const independentRules = list.filter(item => item.planType !== 0);

  // 优化：菜单点击事件，menuLoadingId标记当前item
  const handleMenuClick = async (key: string, item: DistributionRule) => {
    setMenuLoadingId(item.id);
    try {
      if (key === "edit") {
        navigate(`/workspace/traffic-distribution/edit/${item.id}`);
      } else if (key === "pause") {
        await toggleDistributionRuleStatus(item.id, item.status === 1 ? 0 : 1);
        message.success(item.status === 1 ? "已暂停" : "已启用");
        handleRefresh();
      } else if (key === "delete") {
        await deleteDistributionRule(item.id);
        message.success("删除成功");
        handleRefresh();
      }
    } catch (e) {
      message.error("操作失败");
    } finally {
      setMenuLoadingId(null);
    }
  };

  // 新增：Switch点击切换计划状态
  const handleSwitchChange = async (
    checked: boolean,
    item: DistributionRule,
  ) => {
    setMenuLoadingId(item.id);
    try {
      await toggleDistributionRuleStatus(item.id, checked ? 1 : 0);
      message.success(checked ? "已启用" : "已暂停");
      // 本地只更新当前item的status，不刷新全列表
      setList(prevList =>
        prevList.map(rule =>
          rule.id === item.id ? { ...rule, status: checked ? 1 : 0 } : rule,
        ),
      );
    } catch (e) {
      message.error("操作失败");
    } finally {
      setMenuLoadingId(null);
    }
  };

  // 显示账号列表弹窗
  const showAccountList = (item: DistributionRule) => {
    setCurrentRule(item);
    setAccountModalVisible(true);
  };

  // 显示设备列表弹窗
  const showDeviceList = (item: DistributionRule) => {
    setCurrentRule(item);
    setDeviceModalVisible(true);
  };

  // 显示流量池列表弹窗
  const showPoolList = (item: DistributionRule) => {
    setCurrentRule(item);
    setPoolModalVisible(true);
  };

  // 显示分发统计弹窗
  const showSendRecord = (item: DistributionRule) => {
    setCurrentRule(item);
    setSendRecordModalVisible(true);
  };

  const renderCard = (item: DistributionRule) => {
    const menu = (
      <Menu onClick={({ key }) => handleMenuClick(key, item)}>
        <Menu.Item
          key="edit"
          icon={<EditOutlined />}
          disabled={menuLoadingId === item.id}
        >
          编辑计划
        </Menu.Item>
        <Menu.Item
          key="pause"
          icon={<PauseOutlined />}
          disabled={menuLoadingId === item.id}
        >
          {item.status === 1 ? "暂停计划" : "启用计划"}
        </Menu.Item>
        <Menu.Item
          key="delete"
          icon={<DeleteOutlined />}
          disabled={menuLoadingId === item.id}
          danger
        >
          删除计划
        </Menu.Item>
      </Menu>
    );

    return (
      <div key={item.id} className={style.ruleCard}>
        <div className={style.ruleHeader}>
          <span className={style.ruleName}>{item.name}</span>
          <div className={style.ruleStatus}>
            <Tag
              color={statusMap[item.status]?.color || "default"}
              style={{ fontWeight: 500, fontSize: 13 }}
            >
              {statusMap[item.status]?.text || "未知"}
            </Tag>
            <Switch
              className={style.ruleSwitch}
              checked={item.status === 1}
              size="small"
              loading={menuLoadingId === item.id}
              disabled={menuLoadingId === item.id}
              onChange={checked => handleSwitchChange(checked, item)}
            />
            {/* Dropdown 只允许传递单一元素给 menu 属性 */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: "edit",
                    icon: <EditOutlined />,
                    label: "编辑计划",
                    disabled: menuLoadingId === item.id,
                  },
                  {
                    key: "pause",
                    icon: <PauseOutlined />,
                    label: item.status === 1 ? "暂停计划" : "启用计划",
                    disabled: menuLoadingId === item.id,
                  },
                  {
                    key: "delete",
                    icon: <DeleteOutlined />,
                    label: "删除计划",
                    disabled: menuLoadingId === item.id,
                    danger: true,
                  },
                ],
                onClick: ({ key }) => handleMenuClick(key, item),
              }}
              trigger={["click"]}
              placement="bottomRight"
              disabled={menuLoadingId === item.id}
            >
              <MoreOutlined
                className={style.ruleMenu}
                style={{ cursor: "pointer" }}
              />
            </Dropdown>
          </div>
        </div>
        <div className={style.ruleMeta}>
          <div
            className={style.ruleMetaItem}
            style={{ cursor: "pointer" }}
            onClick={() => showAccountList(item)}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {item.config?.account?.length || 0}
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>分发账号</div>
          </div>
          <div
            className={style.ruleMetaItem}
            style={{ cursor: "pointer" }}
            onClick={() => showDeviceList(item)}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {item.config?.devices?.length || 0}
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>分发设备</div>
          </div>
          <div
            className={style.ruleMetaItem}
            style={{ cursor: "pointer" }}
            onClick={() => showPoolList(item)}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {item.config?.poolGroups?.length || 0}
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>流量池</div>
          </div>
        </div>
        <div className={style.ruleDivider} />
        <div className={style.ruleStats}>
          <div className={style.ruleStatsItem}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {item.config?.total?.dailyAverage || 0}
            </span>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              日均分发量
            </div>
          </div>
          <div className={style.ruleStatsItem}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {item.config?.total?.totalUsers || 0}
            </span>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              总流量池数量
            </div>
          </div>
          <div
            className={style.ruleStatsItem}
            style={{ cursor: "pointer" }}
            onClick={() => showSendRecord(item)}
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {item.config?.total?.totalUsers || 0}
            </span>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              分发统计
            </div>
          </div>
        </div>
        <div className={style.ruleFooter}>
          <span>
            <ClockCircleOutlined className={style.ruleFooterIcon} />
            上次执行：{item.config?.lastUpdated || "-"}
          </span>
          <span>
            <CalendarOutlined className={style.ruleFooterIcon} />
            创建时间：{item.createTime || "-"}
          </span>
        </div>
      </div>
    );
  };

  let content: React.ReactNode;
  if (loading) {
    content = <Spin />;
  } else if (list.length === 0) {
    content = <div className={style.empty}>暂无数据</div>;
  } else {
    content = (
      <>
        {globalRules.length > 0 && (
          <div className={style.infoBox}>
            全局流量分发计划将作用于所有账号和设备，请谨慎配置每日分配量与时间段。
          </div>
        )}

        {globalRules.length > 0 && (
          <section className={style.section}>
            <h3 className={style.sectionTitle}>
              <span className={style.sectionDot} />
              全局流量分发计划
            </h3>
            {globalRules.map(renderCard)}
          </section>
        )}

        {independentRules.length > 0 && (
          <section className={style.section}>
            <h3
              className={`${style.sectionTitle} ${style.sectionTitleIndependent}`}
            >
              <span className={style.sectionDot} />
              独立流量分发计划
            </h3>
            {independentRules.map(renderCard)}
          </section>
        )}
      </>
    );
  }

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="流量分发"
            backFn={() => navigate("/workspace")}
            right={
              <Button
                type="primary"
                onClick={() => {
                  navigate("/workspace/traffic-distribution/new");
                }}
              >
                <PlusOutlined /> 新建分发
              </Button>
            }
          />
          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索计划名称"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
              size="large"
            ></Button>
          </div>
        </>
      }
      loading={loading}
      footer={
        <div className="pagination-container">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      }
    >
      <div className={style.ruleList}>{content}</div>

      {/* 账号列表弹窗 */}
      <AccountListModal
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        ruleId={currentRule?.id}
        ruleName={currentRule?.name}
      />

      {/* 设备列表弹窗 */}
      <DeviceListModal
        visible={deviceModalVisible}
        onClose={() => setDeviceModalVisible(false)}
        ruleId={currentRule?.id}
        ruleName={currentRule?.name}
      />

      {/* 流量池列表弹窗 */}
      <PoolListModal
        visible={poolModalVisible}
        onClose={() => setPoolModalVisible(false)}
        ruleId={currentRule?.id}
        ruleName={currentRule?.name}
      />

      {/* 分发统计弹窗 */}
      <SendRcrodModal
        visible={sendRecordModalVisible}
        onClose={() => setSendRecordModalVisible(false)}
        ruleId={currentRule?.id}
        ruleName={currentRule?.name}
      />
    </Layout>
  );
};

export default TrafficDistributionList;
