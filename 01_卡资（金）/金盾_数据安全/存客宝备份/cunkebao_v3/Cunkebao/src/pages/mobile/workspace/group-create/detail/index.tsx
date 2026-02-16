import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Toast, SpinLoading } from "antd-mobile";
import { EditOutlined, ScheduleOutlined, HistoryOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getGroupCreateDetail, getCreatedGroupsList } from "../form/api";
import style from "./index.module.scss";

interface GroupCreateDetail {
  id: string;
  name: string;
  planType: number; // 0-全局计划, 1-独立计划
  status: number; // 1-启用, 0-禁用
  createTime?: string;
  updateTime?: string;
  createdGroupsCount?: number; // 已建群数
  totalMembersCount?: number; // 总人数
  groupSizeMax?: number; // 群组最大人数
  config?: {
    deviceGroupsOptions?: Array<{
      id: number;
      nickname?: string;
      memo?: string;
      wechatId?: string;
    }>;
    wechatGroupsOptions?: Array<{
      id: number;
      wechatId?: string;
      nickname?: string;
    }>;
    groupAdminWechatId?: number;
    groupNameTemplate?: string;
  };
  groups?: Array<{
    id: string;
    name: string;
    memberCount: number;
    createTime: string;
    members?: Array<{
      id: string;
      avatar?: string;
      nickname?: string;
    }>;
  }>;
  [key: string]: any;
}

const GroupCreateDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GroupCreateDetail | null>(null);
  const [groups, setGroups] = useState<Array<{
    id: number | string;
    name?: string;
    groupName?: string;
    memberCount: number;
    memberCountText?: string;
    createTime: string;
    avatar?: string;
    groupAvatar?: string;
    memberAvatars?: Array<{
      avatar?: string;
      wechatId?: string;
      nickname?: string;
    }>;
    ownerNickname?: string;
    ownerWechatId?: string;
    ownerAvatar?: string;
  }>>([]);

  useEffect(() => {
    if (!id) return;
    fetchDetail();
    fetchGroups();
  }, [id]);

  const fetchGroups = async () => {
    if (!id) return;
    try {
      const res = await getCreatedGroupsList({
        workbenchId: id,
        page: 1,
        limit: 10,
      });
      const groupsData = res?.list || res?.data?.list || res?.data || [];
      setGroups(groupsData);
    } catch (e: any) {
      // 静默失败，不影响主详情展示
      console.error("获取群组列表失败:", e);
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getGroupCreateDetail(id!);
      const config = res.config || {};
      const stats = config.stats || {};

      const detailData: GroupCreateDetail = {
        id: String(res.id),
        name: res.name || "",
        planType: config.planType ?? res.planType ?? 1,
        status: res.status ?? 1,
        createTime: res.createTime || "",
        updateTime: res.updateTime || res.createTime || "",
        createdGroupsCount: stats.createdGroupsCount ?? res.createdGroupsCount ?? 0,
        totalMembersCount: stats.totalMembersCount ?? res.totalMembersCount ?? 0,
        groupSizeMax: config.groupSizeMax || 38,
        config: {
          deviceGroupsOptions: config.deviceGroupsOptions || [],
          wechatGroupsOptions: config.wechatGroupsOptions || [],
          groupAdminWechatId: config.groupAdminWechatId,
          groupNameTemplate: config.groupNameTemplate || "",
        },
        groups: [], // 群列表通过单独的接口获取
      };
      setDetail(detailData);
    } catch (e: any) {
      Toast.show({ content: e?.message || "获取详情失败", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/workspace/group-create/${id}/edit`);
  };

  if (loading) {
    return (
      <Layout
        header={<NavCommon title="计划详情" backFn={() => navigate(-1)} />}
      >
        <div className={style.loadingContainer}>
          <SpinLoading style={{ "--size": "48px" }} />
        </div>
      </Layout>
    );
  }

  if (!detail) {
    return (
      <Layout
        header={<NavCommon title="计划详情" backFn={() => navigate(-1)} />}
      >
        <div className={style.emptyContainer}>
          <div className={style.emptyText}>未找到该计划</div>
          <Button color="primary" onClick={() => navigate("/workspace/group-create")}>
            返回列表
          </Button>
        </div>
      </Layout>
    );
  }

  const isRunning = detail.status === 1;
  const planTypeText = detail.planType === 0 ? "全局计划" : "独立计划";
  const executorDevice = detail.config?.deviceGroupsOptions?.[0];
  const executorName = executorDevice?.nickname || executorDevice?.memo || executorDevice?.wechatId || "-";
  const fixedWechatIds = detail.config?.wechatGroupsOptions || [];
  const groupAdminId = detail.config?.groupAdminWechatId;

  return (
    <Layout
      header={
        <NavCommon
          title="计划详情"
          backFn={() => navigate(-1)}
          right={
            <Button
              size="small"
              color="primary"
              onClick={handleEdit}
              style={{ marginRight: "-8px" }}
            >
              <EditOutlined /> 编辑
            </Button>
          }
        />
      }
    >
      <div className={style.container}>
        {/* 基本信息卡片 */}
        <section className={style.infoCard}>
          <div className={style.infoHeader}>
            <div>
              <h2 className={style.infoTitle}>{detail.name}</h2>
              <p className={style.infoSubtitle}>{planTypeText}</p>
            </div>
            <span className={`${style.statusBadge} ${isRunning ? style.statusRunning : style.statusStopped}`}>
              {isRunning && <span className={style.statusDot}></span>}
              {isRunning ? "运行中" : "已停止"}
            </span>
          </div>
          <div className={style.infoMeta}>
            <div className={style.metaItem}>
              <span className={style.metaLabel}>创建时间</span>
              <div className={style.metaValue}>
                <ScheduleOutlined className={style.metaIcon} />
                {detail.createTime || "-"}
              </div>
            </div>
            <div className={style.metaItem}>
              <span className={style.metaLabel}>更新时间</span>
              <div className={style.metaValue}>
                <HistoryOutlined className={style.metaIcon} />
                {detail.updateTime || "-"}
              </div>
            </div>
          </div>
        </section>

        {/* 统计信息 */}
        <section className={style.statsSection}>
          <h3 className={style.sectionTitle}>
            <span className={style.sectionTitleDot}></span>
            统计信息
          </h3>
          <div className={style.statsGrid}>
            <div className={style.statCard}>
              <div className={`${style.statIcon} ${style.statIconBlue}`}>
                👥
              </div>
              <span className={style.statNumber}>{detail.createdGroupsCount || 0}</span>
              <span className={style.statLabel}>已建群数</span>
            </div>
            <div className={style.statCard}>
              <div className={`${style.statIcon} ${style.statIconGreen}`}>
                👥
              </div>
              <span className={style.statNumber}>{detail.totalMembersCount || 0}</span>
              <span className={style.statLabel}>总人数</span>
            </div>
            <div className={style.statCard}>
              <div className={`${style.statIcon} ${style.statIconPurple}`}>
                📊
              </div>
              <span className={style.statNumber}>{detail.groupSizeMax || 38}</span>
              <span className={style.statLabel}>人/群</span>
            </div>
          </div>
        </section>

        {/* 配置信息 */}
        <section className={style.configCard}>
          <h3 className={style.sectionTitle}>
            <span className={style.sectionTitleDot}></span>
            配置信息
          </h3>
          <div className={style.configList}>
            <div className={style.configItem}>
              <span className={style.configLabel}>分组方式</span>
              <span className={style.configValue}>所有好友自动分组</span>
            </div>
            <div className={style.configDivider}></div>
            <div className={style.configItem}>
              <span className={style.configLabel}>执行设备</span>
              <div className={style.configValue}>
                <span className={style.deviceIcon}>📱</span>
                {executorName}
              </div>
            </div>
            <div className={style.configDivider}></div>
            <div className={style.configItem}>
              <span className={style.configLabel}>固定微信号</span>
              <div className={style.wechatTags}>
                {fixedWechatIds.length > 0 ? (
                  fixedWechatIds.map((wechat: any) => {
                    const isGroupAdmin = wechat.id === groupAdminId;
                    const displayText = wechat.nickname && wechat.wechatId
                      ? `${wechat.nickname}（${wechat.wechatId}）`
                      : wechat.wechatId || wechat.nickname || "-";
                    return (
                      <span
                        key={wechat.id}
                        className={`${style.wechatTag} ${isGroupAdmin ? style.wechatTagAdmin : ""}`}
                      >
                        {displayText}
                        {isGroupAdmin && (
                          <span className={style.adminBadge}>群主</span>
                        )}
                      </span>
                    );
                  })
                ) : (
                  <span className={style.configValue}>-</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 群列表 */}
        <section className={style.groupsSection}>
          <div className={style.groupsHeader}>
            <h3 className={style.sectionTitle}>
              <span className={style.sectionTitleDot}></span>
              群列表
            </h3>
            <button
              className={style.viewAllButton}
              onClick={() => navigate(`/workspace/group-create/${id}/groups`)}
            >
              查看全部
            </button>
          </div>
          <div className={style.groupsList}>
            {groups.length > 0 ? (
              groups.map((group, index) => (
                <div
                  key={String(group.id)}
                  className={style.groupCard}
                  onClick={() => navigate(`/workspace/group-create/${id}/groups/${String(group.id)}`)}
                >
                  <div className={style.groupCardHeader}>
                    <div className={style.groupCardLeft}>
                      <div className={style.groupIconWrapper}>
                        {group.avatar || group.groupAvatar ? (
                          <img
                            className={style.groupIconImg}
                            src={group.avatar || group.groupAvatar}
                            alt={group.groupName || group.name || ""}
                            onError={(e) => {
                              // 加载失败时显示默认图标
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.parentElement?.querySelector(`.${style.groupIconFallback}`) as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={style.groupIconFallback}
                          style={{
                            display: group.avatar || group.groupAvatar ? 'none' : 'flex',
                            background: `linear-gradient(to bottom right, ${
                              ['#60a5fa', '#818cf8', '#a78bfa', '#f472b6'][index % 4]
                            }, ${
                              ['#4f46e5', '#6366f1', '#8b5cf6', '#ec4899'][index % 4]
                            })`,
                          }}
                        >
                          {(group.groupName || group.name || '').charAt(0) || '👥'}
                        </div>
                      </div>
                      <div>
                        <h4 className={style.groupName}>{group.groupName || group.name || detail.config?.groupNameTemplate || `群组 ${index + 1}`}</h4>
                        <div className={style.groupMeta}>
                          <span className={style.groupMemberCount}>
                            👤 {group.memberCountText || `${group.memberCount || 0}人`}
                          </span>
                          <span className={style.groupDate}>{group.createTime || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <span className={style.chevronIcon}>›</span>
                  </div>
                  {group.memberAvatars && group.memberAvatars.length > 0 && (
                    <div className={style.groupMembers}>
                      <div className={style.memberAvatars}>
                        {group.memberAvatars.slice(0, 6).map((member, memberIndex) => (
                          <img
                            key={member.wechatId || memberIndex}
                            className={style.memberAvatar}
                            src={member.avatar || "https://via.placeholder.com/24"}
                            alt={member.nickname || ""}
                            style={{ zIndex: 6 - memberIndex }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://via.placeholder.com/24";
                            }}
                          />
                        ))}
                        {group.memberAvatars.length > 6 && (
                          <span className={style.memberMore}>
                            +{group.memberAvatars.length - 6}
                          </span>
                        )}
                      </div>
                      <span className={style.viewDetailText}>点击查看详情</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className={style.emptyGroups}>
                <div className={style.emptyGroupsText}>暂无群组</div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default GroupCreateDetail;
