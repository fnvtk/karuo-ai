import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Toast, SpinLoading, InfiniteScroll } from "antd-mobile";
import { SearchOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getCreatedGroupsList } from "../form/api";
import style from "./groups-list.module.scss";

interface Group {
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
  [key: string]: any;
}

interface GroupListPageProps {
  planId?: string;
}

const GroupListPage: React.FC<GroupListPageProps> = ({ planId: propPlanId }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = propPlanId || id;
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"all" | "createTime" | "memberCount">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!planId) return;
    fetchGroups(true);
  }, [planId]);

  useEffect(() => {
    if (!planId) return;
    const timer = setTimeout(() => {
      fetchGroups(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const fetchGroups = async (reset = false) => {
    if (!planId) return;
    const page = reset ? 1 : currentPage;
    if (reset) {
      setLoading(true);
    }
    try {
      const res = await getCreatedGroupsList({
        workbenchId: planId,
        page,
        limit: 20,
        keyword: searchKeyword || undefined,
      });
      // 注意：request 拦截器已经提取了 data 字段，所以 res 就是 data 对象
      // 接口返回结构：{ list: [...], total: 2, page: "1", limit: "10" }
      const groupsData = res?.list || (Array.isArray(res) ? res : []);
      if (reset) {
        setGroups(groupsData);
        setCurrentPage(2); // 重置后下一页是2
      } else {
        setGroups(prev => [...prev, ...groupsData]);
        setCurrentPage(prev => prev + 1);
      }
      setHasMore(groupsData.length >= 20);
    } catch (e: any) {
      // request拦截器在code !== 200时会reject并显示Toast
      // 如果拦截器没有显示错误（比如网络错误），这里才显示
      // 注意：拦截器已经在错误时显示了Toast，所以这里通常不需要再显示
    } finally {
      if (reset) {
        setLoading(false);
      }
    }
  };

  const handleLoadMore = async () => {
    if (hasMore && !loading) {
      await fetchGroups(false);
    }
  };

  // 排序（搜索和过滤由接口完成）
  const sortedGroups = [...groups].sort((a, b) => {
    if (sortBy === "createTime") {
      const timeA = new Date(a.createTime || 0).getTime();
      const timeB = new Date(b.createTime || 0).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    } else if (sortBy === "memberCount") {
      return sortOrder === "asc" ? a.memberCount - b.memberCount : b.memberCount - a.memberCount;
    }
    return 0;
  });

  const handleSortClick = (type: "createTime" | "memberCount") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (type: "createTime" | "memberCount") => {
    if (sortBy !== type) return <span style={{ fontSize: '12px' }}>⇅</span>;
    return sortOrder === "asc" ? <UpOutlined /> : <DownOutlined />;
  };

  // 群组图标颜色配置
  const iconColors = [
    { from: "#3b82f6", to: "#4f46e5" }, // blue to indigo
    { from: "#6366f1", to: "#8b5cf6" }, // indigo to purple
    { from: "#a855f7", to: "#ec4899" }, // purple to pink
    { from: "#f472b6", to: "#f43f5e" }, // pink to rose
    { from: "#fb923c", to: "#ef4444" }, // orange to red
    { from: "#14b8a6", to: "#10b981" }, // teal to emerald
    { from: "#22d3ee", to: "#3b82f6" }, // cyan to blue
  ];

  const getGroupIcon = (index: number) => {
    const colors = iconColors[index % iconColors.length];
    return { from: colors.from, to: colors.to };
  };

  const getGroupIconEmoji = (group: Group, index: number) => {
    // 可以根据群组名称或其他属性返回不同的图标
    const icons = ["groups", "star", "fiber_new", "local_fire_department", "campaign", "forum", "school"];
    return icons[index % icons.length];
  };

  if (loading) {
    return (
      <Layout
        header={<NavCommon title="所有群组列表" backFn={() => navigate(-1)} />}
      >
        <div className={style.loadingContainer}>
          <SpinLoading style={{ "--size": "48px" }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={
        <NavCommon
          title="所有群组列表"
          backFn={() => navigate(-1)}
        />
      }
    >
      <div className={style.container}>
        {/* 搜索和筛选区域 */}
        <div className={style.filterSection}>
          <div className={style.searchBox}>
            <SearchOutlined className={style.searchIcon} />
            <input
              className={style.searchInput}
              placeholder="搜索群名称、群ID、群主昵称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <div className={style.filterButtons}>
            <button
              className={`${style.filterButton} ${sortBy === "all" ? style.filterButtonActive : ""}`}
              onClick={() => {
                setSortBy("all");
                setSortOrder("desc");
              }}
            >
              全部
            </button>
            <button
              className={`${style.filterButton} ${sortBy === "createTime" ? style.filterButtonActive : ""}`}
              onClick={() => handleSortClick("createTime")}
            >
              创建时间
              <span className={style.filterIcon}>{getSortIcon("createTime")}</span>
            </button>
            <button
              className={`${style.filterButton} ${sortBy === "memberCount" ? style.filterButtonActive : ""}`}
              onClick={() => handleSortClick("memberCount")}
            >
              成员数量
              <span className={style.filterIcon}>{getSortIcon("memberCount")}</span>
            </button>
          </div>
        </div>

        {/* 群组列表 */}
        <div className={style.groupsList}>
          {sortedGroups.length > 0 ? (
            sortedGroups.map((group, index) => {
              const iconColors = getGroupIcon(index);
              return (
                <div
                  key={String(group.id)}
                  className={style.groupCard}
                  onClick={() => navigate(`/workspace/group-create/${planId}/groups/${String(group.id)}`)}
                >
                  <div className={style.groupCardContent}>
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
                          background: `linear-gradient(to bottom right, ${iconColors.from}, ${iconColors.to})`,
                        }}
                      >
                        {(group.groupName || group.name || '').charAt(0) || '👥'}
                      </div>
                    </div>
                    <div className={style.groupInfo}>
                      <h4 className={style.groupName}>{group.groupName || group.name || `群组 ${index + 1}`}</h4>
                      <div className={style.groupMeta}>
                        <span className={style.memberCount}>
                          👤 {group.memberCountText || `${group.memberCount || 0}人`}
                        </span>
                        <span className={style.createTime}>{group.createTime || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={style.emptyState}>
              <div className={style.emptyText}>暂无群组</div>
            </div>
          )}
        </div>

        {/* 无限滚动加载 */}
        {sortedGroups.length > 0 && (
          <InfiniteScroll
            loadMore={handleLoadMore}
            hasMore={hasMore}
            threshold={100}
          >
            {hasMore ? (
              <div className={style.footer}>
                <SpinLoading style={{ "--size": "24px" }} />
              </div>
            ) : (
              <div className={style.footer}>
                <p className={style.footerText}>已显示全部 {sortedGroups.length} 个群组</p>
              </div>
            )}
          </InfiniteScroll>
        )}
      </div>
    </Layout>
  );
};

export default GroupListPage;
