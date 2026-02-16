import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toast, Switch, Dialog } from "antd-mobile";
import { Dropdown, Menu } from "antd";
import { MoreOutlined, EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getGroupCreateList, toggleGroupCreateStatus, deleteGroupCreate } from "../form/api";
import style from "./index.module.scss";

interface GroupCreatePlan {
  id: string;
  name: string;
  planType: number; // 0-全局计划, 1-独立计划
  status: number; // 1-启用, 0-禁用
  groupNameTemplate?: string;
  groupSizeMax?: number;
  groupSizeMin?: number;
  updateTime?: string;
  createTime?: string;
  createdGroupsCount?: number; // 已建群数
  totalMembersCount?: number; // 总人数
  [key: string]: any;
}

const GroupCreateList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<GroupCreatePlan[]>([]);
  const [menuLoadingId, setMenuLoadingId] = useState<string | null>(null);
  const [isPlanTypeEnabled, setIsPlanTypeEnabled] = useState(false);

  // 获取列表数据
  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getGroupCreateList({ type: 4 });
      const list = res?.list || res?.data?.list || res?.data?.listData || res?.data || [];
      const isPlanTypeFlag = res?.isPlanType ?? res?.data?.isPlanType;
      setIsPlanTypeEnabled(isPlanTypeFlag === 1);
      const normalized: GroupCreatePlan[] = (list as any[]).map((item: any) => {
        const stats = item.config?.stats || {};
        return {
          id: String(item.id),
          name: item.name || "",
          planType: item.config?.planType ?? item.planType ?? 1,
          status: item.status === 1 ? 1 : 0,
          groupNameTemplate: item.config?.groupNameTemplate || item.groupNameTemplate || item.groupName || "",
          groupSizeMax: item.config?.groupSizeMax || item.groupSizeMax || 38,
          groupSizeMin: item.config?.groupSizeMin || item.groupSizeMin || 3,
          updateTime: item.updateTime || item.createTime || "",
          createTime: item.createTime || "",
          createdGroupsCount: stats.createdGroupsCount ?? item.createdGroupsCount ?? 0,
          totalMembersCount: stats.totalMembersCount ?? item.totalMembersCount ?? 0,
        };
      });
      setPlans(normalized);
    } catch (e: any) {
      Toast.show({ content: e?.message || "获取列表失败", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // 切换状态
  const handleStatusToggle = async (plan: GroupCreatePlan) => {
    try {
      const newStatus = plan.status === 1 ? 0 : 1;
      await toggleGroupCreateStatus({
        id: plan.id,
        status: newStatus,
      });
      Toast.show({ content: newStatus === 1 ? "已启用" : "已停止", position: "top" });
      // 直接更新本地状态
      setPlans(prev =>
        prev.map(p => (p.id === plan.id ? { ...p, status: newStatus } : p))
      );
    } catch (e: any) {
      Toast.show({ content: e?.message || "操作失败", position: "top" });
    }
  };

  // 删除计划
  const handleDelete = async (plan: GroupCreatePlan) => {
    const result = await Dialog.confirm({
      content: "确定要删除该计划吗？",
      confirmText: "删除",
      cancelText: "取消",
    });
    if (!result) return;

    setMenuLoadingId(plan.id);
    try {
      await deleteGroupCreate(plan.id);
      Toast.show({ content: "删除成功", position: "top" });
      fetchList();
    } catch (e: any) {
      Toast.show({ content: e?.message || "删除失败", position: "top" });
    } finally {
      setMenuLoadingId(null);
    }
  };

  // 菜单点击
  const handleMenuClick = ({ key }: { key: string }, plan: GroupCreatePlan) => {
    if (key === "detail") {
      navigate(`/workspace/group-create/${plan.id}`);
    } else if (key === "edit") {
      navigate(`/workspace/group-create/${plan.id}/edit`);
    } else if (key === "delete") {
      handleDelete(plan);
    }
  };

  // 创建新计划
  const handleCreate = () => {
    navigate("/workspace/group-create/new", {
      state: { isPlanType: isPlanTypeEnabled ? 1 : 0 },
    });
  };

  // 分隔全局计划和独立计划（仅在 isPlanType 为 1 时启用）
  const globalPlans = isPlanTypeEnabled ? plans.filter(p => p.planType === 0) : [];
  const independentPlans = isPlanTypeEnabled ? plans.filter(p => p.planType === 1) : plans;

  return (
    <Layout
      header={
        <NavCommon
          title="自动建群"
          right={
            <div style={{ marginRight: "-16px" }}>
              <Button
                size="small"
                color="primary"
                onClick={handleCreate}
              >
                <PlusOutlined /> 新建任务
              </Button>
            </div>
          }
        />
      }
      loading={loading}
    >
      <div className={style.container}>
        {/* 全局计划提示 */}
        {globalPlans.length > 0 && (
          <div className={style.infoBox}>
            <span className={style.infoIcon}>ℹ</span>
            <p className={style.infoText}>
              全局建群计划将应用与所有设备，包含新添加的设备，请确保设置合理的规则。
            </p>
          </div>
        )}

        {/* 全局建群计划 */}
        {globalPlans.length > 0 && (
          <section className={style.section}>
            <h2 className={style.sectionTitle}>
              <div className={style.sectionDot}></div>
              全局建群计划
            </h2>
            {globalPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onStatusToggle={handleStatusToggle}
                onMenuClick={handleMenuClick}
                menuLoading={menuLoadingId === plan.id}
              />
            ))}
          </section>
        )}

        {/* 独立建群计划 */}
        {independentPlans.length > 0 && (
          <section className={style.section}>
            <h2 className={`${style.sectionTitle} ${style.sectionTitleIndependent}`}>
              <div className={`${style.sectionDot} ${style.sectionDotIndependent}`}></div>
              独立建群计划
            </h2>
            <div className={style.planList}>
              {independentPlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onStatusToggle={handleStatusToggle}
                  onMenuClick={handleMenuClick}
                  menuLoading={menuLoadingId === plan.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* 空状态 */}
        {plans.length === 0 && !loading && (
          <div className={style.emptyState}>
            <div className={style.emptyIcon}>📋</div>
            <div className={style.emptyText}>暂无建群计划</div>
            <Button color="primary" onClick={handleCreate} className={style.emptyButton}>
              创建第一个计划
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

// 计划卡片组件
interface PlanCardProps {
  plan: GroupCreatePlan;
  onStatusToggle: (plan: GroupCreatePlan) => void;
  onMenuClick: (params: { key: string }, plan: GroupCreatePlan) => void;
  menuLoading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onStatusToggle,
  onMenuClick,
  menuLoading,
}) => {
  const isRunning = plan.status === 1;

  return (
    <div className={style.planCard}>
      {/* 卡片头部 */}
      <div className={style.cardHeader}>
        <div className={style.cardTitleSection}>
          <h3 className={style.cardTitle}>{plan.name}</h3>
          <span className={`${style.statusBadge} ${isRunning ? style.statusRunning : style.statusStopped}`}>
            {isRunning ? "运行中" : "已停止"}
          </span>
        </div>
        <div className={style.cardActions}>
          <Switch
            checked={isRunning}
            onChange={() => onStatusToggle(plan)}
            className={style.statusSwitch}
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: "detail",
                  icon: <EyeOutlined />,
                  label: "计划详情",
                  disabled: menuLoading,
                },
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "编辑",
                  disabled: menuLoading,
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "删除",
                  disabled: menuLoading,
                  danger: true,
                },
              ],
              onClick: (params) => onMenuClick(params, plan),
            }}
            trigger={["click"]}
            placement="bottomRight"
            disabled={menuLoading}
          >
            <button className={style.moreButton}>
              <MoreOutlined />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* 统计数据 */}
      <div className={style.cardStats}>
        <div className={style.statItem}>
          <div className={style.statHeader}>
            <span className={style.statIcon}>👥</span>
            <p className={style.statLabel}>已建群数</p>
          </div>
          <div className={style.statValue}>
            <span className={style.statNumber}>{plan.createdGroupsCount || 0}</span>
          </div>
        </div>
        <div className={style.statDivider}></div>
        <div className={style.statItem}>
          <div className={style.statHeader}>
            <span className={style.statIcon}>👥</span>
            <p className={style.statLabel}>总人数</p>
          </div>
          <div className={style.statValue}>
            <span className={style.statNumber}>{plan.totalMembersCount || 0}</span>
          </div>
        </div>
      </div>

      {/* 详细信息 */}
      <div className={style.cardDetails}>
        <div className={style.detailItem}>
          <span className={style.detailIcon}>📝</span>
          <span className={style.detailLabel}>群名称</span>
          <span className={style.detailValue}>{plan.groupNameTemplate || "-"}</span>
        </div>
        <div className={style.detailItem}>
          <span className={style.detailIcon}>⚙️</span>
          <span className={style.detailLabel}>群规模</span>
          <span className={style.detailValue}>
            {plan.groupSizeMax || 38}人/群
          </span>
        </div>
        <div className={style.detailItem}>
          <span className={style.detailIcon}>🕐</span>
          <span className={style.detailLabel}>更新时间</span>
          <span className={style.detailTime}>
            {plan.updateTime
              ? new Date(plan.updateTime).toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).replace(/\//g, "-")
              : plan.createTime
              ? new Date(plan.createTime).toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).replace(/\//g, "-")
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GroupCreateList;
