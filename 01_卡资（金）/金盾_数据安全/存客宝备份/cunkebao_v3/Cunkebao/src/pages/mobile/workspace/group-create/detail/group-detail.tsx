import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Toast, SpinLoading, Dialog, Input, TextArea } from "antd-mobile";
import {
  EditOutlined,
  QrcodeOutlined,
  SearchOutlined,
  SyncOutlined,
  LogoutOutlined,
  StarOutlined,
  CloseCircleOutlined,
  ScheduleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getCreatedGroupDetail, syncGroupInfo, modifyGroupInfo, quitGroup } from "../form/api";
import style from "./group-detail.module.scss";

interface GroupMember {
  id?: string;
  friendId?: number;
  nickname?: string;
  wechatId?: string;
  avatar?: string;
  isOwner?: number; // 1表示是群主，0表示不是
  isGroupAdmin?: boolean;
  joinStatus?: string; // "auto" | "manual" - 入群状态
  isQuit?: number; // 0/1 - 是否已退群
  joinTime?: string; // 入群时间
  alias?: string; // 成员别名
  remark?: string; // 成员备注
  [key: string]: any;
}

interface GroupDetail {
  id: string;
  name: string;
  createTime?: string;
  planName?: string;
  groupAdmin?: {
    id: string;
    nickname?: string;
    wechatId?: string;
    avatar?: string;
  };
  announcement?: string;
  memberCount?: number;
  members?: GroupMember[];
  [key: string]: any;
}

const GroupDetailPage: React.FC = () => {
  const { id, groupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editAnnouncementVisible, setEditAnnouncementVisible] = useState(false);
  const [editAnnouncementValue, setEditAnnouncementValue] = useState("");

  useEffect(() => {
    if (!id || !groupId) return;
    fetchGroupDetail();
  }, [id, groupId]);

  const fetchGroupDetail = async () => {
    if (!id || !groupId) return;
    setLoading(true);
    try {
      const res = await getCreatedGroupDetail({
        workbenchId: id,
        groupId: groupId,
      });
      const data = res?.data || res || {};

      // 处理成员数据，确保有id字段
      const members = (data.members || []).map((member: any) => ({
        ...member,
        id: String(member.friendId || member.id || member.wechatId || ''),
      }));

      const detailData: GroupDetail = {
        id: String(data.id || groupId),
        name: data.groupName || data.name || "未命名群组",
        createTime: data.createTime || "",
        planName: data.workbenchName || data.planName || "",
        groupAdmin: data.ownerWechatId || data.ownerNickname
          ? {
              id: String(data.ownerWechatId || ""),
              nickname: data.ownerNickname,
              wechatId: data.ownerWechatId,
              avatar: data.ownerAvatar,
            }
          : undefined,
        announcement: data.announce || data.announcement, // 接口返回的字段是 announce
        memberCount: data.memberCount || members.length || 0,
        members: members,
        avatar: data.avatar || data.groupAvatar,
        groupAvatar: data.groupAvatar,
      };

      setGroupDetail(detailData);
    } catch (e: any) {
      Toast.show({ content: e?.message || "获取群组详情失败", position: "top" });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = () => {
    if (!groupDetail) return;
    setEditNameValue(groupDetail.name);
    setEditNameVisible(true);
  };

  const handleConfirmEditName = async () => {
    if (!id || !groupId || !editNameValue.trim()) {
      Toast.show({ content: "群名称不能为空", position: "top" });
      return;
    }

    try {
      await modifyGroupInfo({
        workbenchId: id,
        groupId: groupId,
        chatroomName: editNameValue.trim(),
      });
      Toast.show({ content: "修改成功", position: "top" });
      setEditNameVisible(false);
      // 刷新群详情
      fetchGroupDetail();
    } catch (e: any) {
      Toast.show({
        content: e?.message || "修改群名称失败",
        position: "top"
      });
    }
  };

  const handleEditAnnouncement = () => {
    if (!groupDetail) return;
    setEditAnnouncementValue(groupDetail.announcement || "");
    setEditAnnouncementVisible(true);
  };

  const handleConfirmEditAnnouncement = async () => {
    if (!id || !groupId) {
      return;
    }

    try {
      await modifyGroupInfo({
        workbenchId: id,
        groupId: groupId,
        announce: editAnnouncementValue.trim() || undefined,
      });
      Toast.show({ content: "修改成功", position: "top" });
      setEditAnnouncementVisible(false);
      setEditAnnouncementValue("");
      // 刷新群详情
      fetchGroupDetail();
    } catch (e: any) {
      Toast.show({
        content: e?.message || "修改群公告失败",
        position: "top"
      });
    }
  };

  const handleShowQRCode = () => {
    Toast.show({ content: "群二维码功能待实现", position: "top" });
  };

  const handleSyncGroup = async () => {
    if (!id || !groupId) {
      Toast.show({ content: "参数错误", position: "top" });
      return;
    }

    setSyncing(true);
    try {
      const res = await syncGroupInfo({
        workbenchId: id,
        groupId: groupId,
      });
      const data = res?.data || res || {};

      const successMessages: string[] = [];
      if (data.groupInfoSynced) {
        successMessages.push("群信息同步成功");
      }
      if (data.memberInfoSynced) {
        successMessages.push("群成员信息同步成功");
      }

      if (successMessages.length > 0) {
        Toast.show({
          content: successMessages.join("，"),
          position: "top"
        });
        // 同步成功后刷新群详情
        await fetchGroupDetail();
      } else {
        Toast.show({
          content: res?.msg || "同步完成",
          position: "top"
        });
      }
    } catch (e: any) {
      Toast.show({
        content: e?.message || "同步群信息失败",
        position: "top"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisbandGroup = () => {
    Dialog.confirm({
      content: "确定要退出该群组吗？",
      confirmText: "确定",
      cancelText: "取消",
      onConfirm: async () => {
        if (!id || !groupId) {
          Toast.show({ content: "参数错误", position: "top" });
          return;
        }

        try {
          await quitGroup({
            workbenchId: id,
            groupId: groupId,
          });
          Toast.show({ content: "退出群组成功", position: "top" });
          // 退出成功后返回上一页
          navigate(-1);
        } catch (e: any) {
          Toast.show({
            content: e?.message || "退出群组失败",
            position: "top"
          });
        }
      },
    });
  };

  const handleRemoveMember = (memberId: string) => {
    Dialog.confirm({
      content: "确定要移除此成员吗？",
      confirmText: "确定",
      cancelText: "取消",
      onConfirm: () => {
        Toast.show({ content: "移除成员功能待实现", position: "top" });
      },
    });
  };

  // 过滤成员
  const filteredMembers = groupDetail?.members?.filter((member) => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      member.nickname?.toLowerCase().includes(keyword) ||
      member.wechatId?.toLowerCase().includes(keyword)
    );
  }) || [];

  // 群组图标颜色
  const iconColors = {
    from: "#3b82f6",
    to: "#4f46e5",
  };

  if (loading) {
    return (
      <Layout
        header={<NavCommon title="群详情" backFn={() => navigate(-1)} />}
      >
        <div className={style.loadingContainer}>
          <SpinLoading style={{ "--size": "48px" }} />
        </div>
      </Layout>
    );
  }

  if (!groupDetail) {
    return (
      <Layout
        header={<NavCommon title="群详情" backFn={() => navigate(-1)} />}
      >
        <div className={style.emptyContainer}>
          <div className={style.emptyText}>未找到该群组</div>
          <button
            className={style.backButton}
            onClick={() => navigate(-1)}
          >
            返回
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={
        <NavCommon
          title="群详情"
          backFn={() => navigate(-1)}
        />
      }
    >
      <div className={style.container}>
        {/* 同步遮罩层 */}
        {syncing && (
          <div className={style.syncOverlay}>
            <div className={style.syncContent}>
              <SpinLoading style={{ "--size": "32px" }} />
              <div className={style.syncText}>同步中...</div>
            </div>
          </div>
        )}
        {/* 群组信息卡片 */}
        <section className={style.groupInfoCard}>
          {groupDetail.avatar || groupDetail.groupAvatar ? (
            <img
              className={style.groupIconLarge}
              src={groupDetail.avatar || groupDetail.groupAvatar}
              alt={groupDetail.name || ""}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div
            className={style.groupIconLarge}
            style={{
              display: groupDetail.avatar || groupDetail.groupAvatar ? 'none' : 'flex',
              background: `linear-gradient(to bottom right, ${iconColors.from}, ${iconColors.to})`,
            }}
          >
            {(groupDetail.name || '').charAt(0) || '👥'}
          </div>
          <h2 className={style.groupTitle}>{groupDetail.name}</h2>
          <div className={style.createTimeInfo}>
            <ScheduleOutlined className={style.createTimeIcon} />
            创建于 {groupDetail.createTime || "-"}
          </div>
          <div className={style.actionButtons}>
            <button className={style.actionButton} onClick={handleEditName}>
              <EditOutlined className={style.actionButtonIcon} />
              修改名称
            </button>
            {/* 群二维码功能暂时隐藏 */}
            {/* <button className={style.actionButton} onClick={handleShowQRCode}>
              <QrcodeOutlined className={style.actionButtonIcon} />
              群二维码
            </button> */}
          </div>
        </section>

        {/* 基本信息 */}
        <section className={style.basicInfoCard}>
          <h3 className={style.sectionTitle}>
            <span className={style.sectionTitleDot}></span>
            基本信息
          </h3>
          <div className={style.basicInfoList}>
            <div className={style.basicInfoItem}>
              <span className={style.basicInfoLabel}>所属计划</span>
              <div className={style.basicInfoValue}>
                <span className={style.planIcon}>📋</span>
                {groupDetail.planName || "-"}
              </div>
            </div>
            <div className={style.basicInfoDivider}></div>
            <div className={style.basicInfoItem}>
              <span className={style.basicInfoLabel}>群主</span>
              <div className={style.basicInfoValue}>
                {groupDetail.groupAdmin ? (
                  <>
                    <span className={style.adminAvatar}>
                      {groupDetail.groupAdmin.avatar ? (
                        <img
                          src={groupDetail.groupAdmin.avatar}
                          alt={groupDetail.groupAdmin.nickname || ""}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove(
                              style.hidden
                            );
                          }}
                        />
                      ) : null}
                      <span className={style.adminAvatarText}>
                        {groupDetail.groupAdmin.nickname?.charAt(0)?.toUpperCase() || "A"}
                      </span>
                    </span>
                    {groupDetail.groupAdmin.wechatId || "-"}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div className={style.basicInfoDivider}></div>
            <div className={style.basicInfoItem}>
              <span className={style.basicInfoLabel}>群公告</span>
              <div
                className={style.basicInfoValue}
                style={{ cursor: "pointer" }}
                onClick={handleEditAnnouncement}
              >
                {groupDetail.announcement ? (
                  groupDetail.announcement
                ) : (
                  <span className={style.noAnnouncement}>
                    未设置
                    <span className={style.chevronIcon}>›</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 群成员 */}
        <section className={style.membersCard}>
          <div className={style.membersHeader}>
            <h3 className={style.sectionTitle}>
              <span className={style.sectionTitleDot}></span>
              群成员
              <span className={style.memberCountBadge}>
                {groupDetail.memberCount || 0}人
              </span>
            </h3>
            <button
              className={style.searchButton}
              onClick={() => setShowSearch(!showSearch)}
              title="搜索成员"
            >
              <SearchOutlined />
            </button>
          </div>

          {showSearch && (
            <div className={style.searchBox}>
              <input
                className={style.searchInput}
                placeholder="搜索成员..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          )}

          <div className={style.membersList}>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const isGroupAdmin = member.isOwner === 1 || member.isGroupAdmin || member.id === groupDetail.groupAdmin?.id;
                return (
                  <div key={member.friendId || member.id || member.wechatId} className={style.memberItem}>
                    <div className={style.memberInfo}>
                      <div className={style.memberAvatarWrapper}>
                        {member.avatar ? (
                          <img
                            className={style.memberAvatar}
                            src={member.avatar}
                            alt={member.nickname || ""}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className={style.memberAvatarPlaceholder}>
                            {member.nickname?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        {isGroupAdmin && (
                          <div className={style.adminBadge}>
                            <StarOutlined className={style.adminBadgeIcon} />
                          </div>
                        )}
                      </div>
                      <div className={style.memberInfoText}>
                        <div className={style.memberNameRow}>
                          <span className={style.memberName}>
                            {member.nickname || "-"}
                          </span>
                          {member.isQuit === 1 && (
                            <span className={style.quitTag}>已退群</span>
                          )}
                          {member.joinStatus && (
                            <span className={style.joinStatusTag}>
                              {member.joinStatus === "auto" ? "自动" : "手动"}
                            </span>
                          )}
                        </div>
                        <div className={style.memberWechatId}>
                          {member.wechatId || "-"}
                        </div>
                        {(member.alias || member.remark) && (
                          <div className={style.memberExtraInfo}>
                            {member.alias && <span>别名：{member.alias}</span>}
                            {member.alias && member.remark && <span className={style.divider}>|</span>}
                            {member.remark && <span>备注：{member.remark}</span>}
                          </div>
                        )}
                        {member.joinTime && (
                          <div className={style.memberJoinTime}>
                            入群时间：{member.joinTime}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={style.memberActions}>
                      {isGroupAdmin ? (
                        <span className={style.adminTag}>群主</span>
                      ) : (
                        // 移除成员功能暂时隐藏
                        // <button
                        //   className={style.removeButton}
                        //   onClick={() => handleRemoveMember(String(member.friendId || member.id || member.wechatId || ''))}
                        // >
                        //   <CloseCircleOutlined />
                        // </button>
                        null
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={style.emptyMembers}>
                <div className={style.emptyMembersText}>
                  {searchKeyword ? "未找到匹配的成员" : "暂无成员"}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 操作按钮 */}
        <section className={style.actionsSection}>
          <button className={style.actionCard} onClick={handleSyncGroup}>
            <div className={style.actionCardIcon}>
              <SyncOutlined />
            </div>
            <span className={style.actionCardText}>同步群信息</span>
          </button>
          <button
            className={`${style.actionCard} ${style.actionCardDanger}`}
            onClick={handleDisbandGroup}
          >
            <div className={`${style.actionCardIcon} ${style.actionCardIconDanger}`}>
              <LogoutOutlined />
            </div>
            <span className={`${style.actionCardText} ${style.actionCardTextDanger}`}>
              解散/退出群组
            </span>
          </button>
        </section>
      </div>

      {/* 修改群名称弹窗 */}
      <Dialog
        visible={editNameVisible}
        content={
          <div style={{ padding: "16px 0" }}>
            <div style={{ marginBottom: "8px", fontSize: "14px", color: "#666", fontWeight: 500 }}>
              群名称
            </div>
            <Input
              placeholder="请输入群名称"
              value={editNameValue}
              onChange={(val) => setEditNameValue(val)}
              style={{
                fontSize: "14px",
                padding: "10px 12px",
                border: "1px solid #e5e5e5",
                borderRadius: "6px",
                backgroundColor: "#fff",
              }}
              maxLength={30}
            />
          </div>
        }
        closeOnAction
        onClose={() => {
          setEditNameVisible(false);
          setEditNameValue("");
        }}
        actions={[
          {
            key: "cancel",
            text: "取消",
            onClick: () => {
              setEditNameVisible(false);
              setEditNameValue("");
            },
          },
          {
            key: "confirm",
            text: "确定",
            primary: true,
            onClick: handleConfirmEditName,
          },
        ]}
      />

      {/* 修改群公告弹窗 */}
      <Dialog
        visible={editAnnouncementVisible}
        content={
          <div style={{ padding: "16px 0" }}>
            <div style={{ marginBottom: "8px", fontSize: "14px", color: "#666", fontWeight: 500 }}>
              群公告
            </div>
            <TextArea
              placeholder="请输入群公告"
              value={editAnnouncementValue}
              onChange={(val) => setEditAnnouncementValue(val)}
              style={{
                fontSize: "14px",
                padding: "10px 12px",
                border: "1px solid #e5e5e5",
                borderRadius: "6px",
                backgroundColor: "#fff",
                minHeight: "120px",
              }}
              rows={5}
              maxLength={500}
              showCount
            />
          </div>
        }
        closeOnAction
        onClose={() => {
          setEditAnnouncementVisible(false);
          setEditAnnouncementValue("");
        }}
        actions={[
          {
            key: "cancel",
            text: "取消",
            onClick: () => {
              setEditAnnouncementVisible(false);
              setEditAnnouncementValue("");
            },
          },
          {
            key: "confirm",
            text: "确定",
            primary: true,
            onClick: handleConfirmEditAnnouncement,
          },
        ]}
      />
    </Layout>
  );
};

export default GroupDetailPage;
