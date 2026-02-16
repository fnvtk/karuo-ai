import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  NavBar,
  Card,
  Tabs,
  Button,
  SpinLoading,
  Popup,
  Toast,
  Avatar,
  Tag,
  Switch,
  DatePicker,
  InfiniteScroll,
} from "antd-mobile";
import { Input, Select } from "antd";
import NavCommon from "@/components/NavCommon";
import {
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import style from "./detail.module.scss";
import {
  getWechatAccountDetail,
  getWechatFriends,
  transferWechatFriends,
  getWechatAccountOverview,
  getWechatMoments,
  exportWechatMoments,
  getKefuAccountsList,
  transferFriend,
} from "./api";
import DeviceSelection from "@/components/DeviceSelection";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import dayjs from "dayjs";

import { WechatAccountSummary, Friend, MomentItem } from "./data";

const WechatAccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [accountSummary, setAccountSummary] =
    useState<WechatAccountSummary | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<DeviceSelectionItem[]>([]);
  const [inheritInfo, setInheritInfo] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingInfo, setLoadingInfo] = useState(true);

  // 好友列表相关状态
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsPage, setFriendsPage] = useState(1);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [isFetchingFriends, setIsFetchingFriends] = useState(false);
  const [hasFriendLoadError, setHasFriendLoadError] = useState(false);
  const [isFriendsEmpty, setIsFriendsEmpty] = useState(false);
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [momentsPage, setMomentsPage] = useState(1);
  const [momentsTotal, setMomentsTotal] = useState(0);
  const [isFetchingMoments, setIsFetchingMoments] = useState(false);
  const [momentsError, setMomentsError] = useState<string | null>(null);
  const MOMENTS_LIMIT = 10;

  // 导出相关状态
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportKeyword, setExportKeyword] = useState("");
  const [exportType, setExportType] = useState<number | undefined>(undefined);
  const [exportStartTime, setExportStartTime] = useState<Date | null>(null);
  const [exportEndTime, setExportEndTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 迁移好友相关状态
  const [showTransferFriendPopup, setShowTransferFriendPopup] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [kefuAccounts, setKefuAccounts] = useState<any[]>([]);
  const [selectedKefuAccountId, setSelectedKefuAccountId] = useState<string>("");
  const [transferComment, setTransferComment] = useState<string>("");
  const [transferFriendLoading, setTransferFriendLoading] = useState(false);
  const [loadingKefuAccounts, setLoadingKefuAccounts] = useState(false);

  // 获取基础信息
  const fetchAccountInfo = useCallback(async () => {
    if (!id) return;
    setLoadingInfo(true);
    try {
      const response = await getWechatAccountDetail(id);
      if (response && response.userInfo) {
        setAccountInfo(response.userInfo);
        // 构造 summary 数据结构
        setAccountSummary({
          accountAge: response.accountAge,
          activityLevel: response.activityLevel,
          accountWeight: response.accountWeight,
          statistics: response.statistics,
          restrictions: response.restrictions || [],
        });
      } else {
        Toast.show({
          content: "获取账号信息失败",
          position: "top",
        });
      }
    } catch (e) {
      Toast.show({ content: "获取账号信息失败", position: "top" });
    } finally {
      setLoadingInfo(false);
    }
  }, [id]);

  // 计算账号价值
  // 规则：
  // 1. 1个好友3块
  // 2. 1个群1块
  // 3. 修改过微信号10块
  const calculateAccountValue = useCallback(() => {
    // 获取好友数量（优先使用概览数据，其次使用好友列表总数，最后使用账号信息）
    const friendsCount = overviewData?.totalFriends || friendsTotal || accountInfo?.friendShip?.totalFriend || 0;

    // 获取群数量（优先使用概览数据，其次使用账号信息）
    const groupsCount = overviewData?.highValueChatrooms || accountInfo?.friendShip?.groupNumber || 0;

    // 判断是否修改过微信号
    // 注意：需要根据实际API返回的字段来判断，可能的字段名：
    // - isWechatIdModified (布尔值)
    // - wechatIdModified (布尔值)
    // - hasModifiedWechatId (布尔值)
    // - wechatIdChangeCount (数字，大于0表示修改过)
    // 如果API没有返回该字段，需要后端添加或根据其他逻辑判断
    const isWechatIdModified =
      accountInfo?.isWechatIdModified ||
      accountInfo?.wechatIdModified ||
      accountInfo?.hasModifiedWechatId ||
      (accountInfo?.wechatIdChangeCount && accountInfo.wechatIdChangeCount > 0) ||
      false;

    // 计算各部分价值
    const friendsValue = friendsCount * 3; // 好友数 * 3
    const groupsValue = groupsCount * 1; // 群数 * 1
    const wechatIdModifiedValue = isWechatIdModified ? 10 : 0; // 修改过微信号 ? 10 : 0

    // 计算总价值
    const totalValue = friendsValue + groupsValue + wechatIdModifiedValue;

    return {
      value: totalValue,
      formatted: `¥${totalValue.toLocaleString()}`,
      breakdown: {
        friends: friendsValue,
        groups: groupsValue,
        wechatIdModified: wechatIdModifiedValue,
        friendsCount,
        groupsCount,
        isWechatIdModified,
      },
    };
  }, [overviewData, friendsTotal, accountInfo]);

  // 计算今日价值变化
  // 规则：
  // 1. 今日新增好友 * 3块
  // 2. 今日新增群 * 1块
  const calculateTodayValueChange = useCallback(() => {
    // 获取今日新增好友数
    const todayNewFriends = overviewData?.todayNewFriends || accountSummary?.statistics?.todayAdded || 0;

    // 获取今日新增群数
    const todayNewChatrooms = overviewData?.todayNewChatrooms || 0;

    // 计算今日价值变化
    const friendsValueChange = todayNewFriends * 3; // 今日新增好友数 * 3
    const groupsValueChange = todayNewChatrooms * 1; // 今日新增群数 * 1

    const totalChange = friendsValueChange + groupsValueChange;

    return {
      change: totalChange,
      formatted: totalChange >= 0 ? `+${totalChange.toLocaleString()}` : `${totalChange.toLocaleString()}`,
      isPositive: totalChange >= 0,
      breakdown: {
        friends: friendsValueChange,
        groups: groupsValueChange,
        todayNewFriends,
        todayNewChatrooms,
      },
    };
  }, [overviewData, accountSummary]);

  // 获取概览数据
  const fetchOverviewData = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getWechatAccountOverview(id);
      if (response) {
        setOverviewData(response);
      }
    } catch (e) {
      console.error("获取概览数据失败:", e);
    }
  }, [id]);

  // 获取好友列表 - 封装为独立函数
  const fetchFriendsList = useCallback(
    async (page: number = 1, keyword: string = "", append: boolean = false) => {
      if (!id) return;

      setIsFetchingFriends(true);
      setHasFriendLoadError(false);

      try {
        const response = await getWechatFriends({
          wechatAccount: id,
          page: page,
          limit: 20,
          keyword: keyword,
        });

        const newFriends = response.list.map((friend: any) => {
          const memoTags = Array.isArray(friend.memo)
            ? friend.memo
            : friend.memo
              ? String(friend.memo)
                  .split(/[,\s，、]+/)
                  .filter(Boolean)
              : [];

          const tagList = Array.isArray(friend.tags)
            ? friend.tags
            : friend.tags
              ? [friend.tags]
              : [];

          return {
            id: friend.id.toString(),
            friendId: friend.friendId || friend.id?.toString() || "",
            avatar: friend.avatar || "/placeholder.svg",
            nickname: friend.nickname || "未知用户",
            wechatId: friend.wechatId || "",
            accountUserName: friend.accountUserName || "",
            accountRealName: friend.accountRealName || "",
            remark: friend.notes || "",
            addTime:
              friend.createTime || new Date().toISOString().split("T")[0],
            lastInteraction:
              friend.lastInteraction || new Date().toISOString().split("T")[0],
            tags: memoTags.map((tag: string, index: number) => ({
              id: `tag-${index}`,
              name: tag,
              color: getRandomTagColor(),
            })),
            statusTags: tagList,
            region: friend.region || "未知",
            source: friend.source || "未知",
            notes: friend.notes || "",
            value: friend.value,
            valueFormatted: friend.valueFormatted,
          };
        });

        setFriends(prev => (append ? [...prev, ...newFriends] : newFriends));
        setFriendsTotal(response.total);
        setFriendsPage(page);
        setIsFriendsEmpty(newFriends.length === 0 && !append);
      } catch (error) {
        console.error("获取好友列表失败:", error);
        setHasFriendLoadError(true);
        if (!append) {
          setFriends([]);
          setIsFriendsEmpty(true);
        }
        Toast.show({
          content: "获取好友列表失败，请检查网络连接",
          position: "top",
        });
      } finally {
        setIsFetchingFriends(false);
      }
    },
    [id],
  );

  const fetchMomentsList = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!id) return;
      setIsFetchingMoments(true);
      setMomentsError(null);
      try {
        const response = await getWechatMoments({
          wechatId: id,
          page,
          limit: MOMENTS_LIMIT,
        });

        const list: MomentItem[] = (response.list || []).map((moment: any) => ({
          id: moment.id?.toString() || Math.random().toString(),
          snsId: moment.snsId,
          type: moment.type,
          content: moment.content || "",
          resUrls: moment.resUrls || [],
          commentList: moment.commentList || [],
          likeList: moment.likeList || [],
          createTime: moment.createTime || "",
          momentEntity: moment.momentEntity || {},
        }));

        setMoments(prev => (append ? [...prev, ...list] : list));
        setMomentsTotal(response.total || list.length);
        setMomentsPage(page);
      } catch (error) {
        console.error("获取朋友圈数据失败:", error);
        setMomentsError("获取朋友圈数据失败");
        if (!append) {
          setMoments([]);
        }
      } finally {
        setIsFetchingMoments(false);
      }
    },
    [id],
  );

  // 搜索好友
  const handleSearch = useCallback(() => {
    setFriendsPage(1);
    fetchFriendsList(1, searchQuery, false);
  }, [searchQuery, fetchFriendsList]);

  // 刷新好友列表
  const handleRefreshFriends = useCallback(() => {
    fetchFriendsList(friendsPage, searchQuery, false);
  }, [friendsPage, searchQuery, fetchFriendsList]);

  // 加载更多好友
  const handleLoadMoreFriends = async () => {
    if (isFetchingFriends) return;
    if (friends.length >= friendsTotal) return;
    await fetchFriendsList(friendsPage + 1, searchQuery, true);
  };

  // 初始化数据
  useEffect(() => {
    if (id) {
      fetchAccountInfo();
      fetchOverviewData();
    }
  }, [id, fetchAccountInfo, fetchOverviewData]);

  // 监听标签切换 - 只在切换到好友列表时请求一次
  useEffect(() => {
    if (activeTab === "friends" && id) {
      setIsFriendsEmpty(false);
      setHasFriendLoadError(false);
      fetchFriendsList(1, searchQuery, false);
    }
  }, [activeTab, id, fetchFriendsList, searchQuery]);

  useEffect(() => {
    if (activeTab === "moments" && id) {
      if (moments.length === 0) {
        fetchMomentsList(1, false);
      }
    }
  }, [activeTab, id, fetchMomentsList, moments.length]);

  // 工具函数
  const getRandomTagColor = (): string => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-red-100 text-red-800",
      "bg-pink-100 text-pink-800",
      "bg-emerald-100 text-emerald-800",
      "bg-amber-100 text-amber-800",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleTransferFriends = () => {
    setSelectedDevices([]);
    setInheritInfo(true);
    // 设置默认打招呼内容，使用当前微信账号昵称
    const nickname = accountInfo?.nickname || "未知";
    setGreeting(`我是${nickname}的新号，请通过`);
    setFirstMessage("这个是我的新号，重新加你一下，以后业务就用这个号！");
    setShowTransferConfirm(true);
  };

  const confirmTransferFriends = async () => {
    if (!id) {
      Toast.show({
        content: "微信账号ID不存在",
        position: "top",
      });
      return;
    }

    if (selectedDevices.length === 0) {
      Toast.show({
        content: "请选择至少一个目标设备",
        position: "top",
      });
      return;
    }

    try {
      setTransferLoading(true);

      // 调用好友转移API
      await transferWechatFriends({
        wechatId: id,
        devices: selectedDevices.map(device => device.id),
        inherit: inheritInfo,
        greeting: greeting.trim(),
        firstMessage: firstMessage.trim()
      });

      Toast.show({
        content: "好友转移计划已创建，请在场景获客中查看详情",
        position: "top",
      });
      setShowTransferConfirm(false);
      setSelectedDevices([]);
      setFirstMessage("");
      navigate("/scenarios");
    } catch (error) {
      console.error("好友转移失败:", error);
      Toast.show({
        content: "好友转移失败，请重试",
        position: "top",
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const getRestrictionLevelColor = (level: number) => {
    switch (level) {
      case 3:
        return "text-red-600";
      case 2:
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/\//g, "-");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowTransferFriendPopup(true);
    // 加载客服账号列表
    fetchKefuAccounts();
  };

  // 获取客服账号列表
  const fetchKefuAccounts = useCallback(async () => {
    setLoadingKefuAccounts(true);
    try {
      const response = await getKefuAccountsList();
      // 数据结构：{ code: 200, msg: "success", data: { total: 7, list: [...] } }
      const accountsList = response?.data?.list || response?.list || (Array.isArray(response) ? response : []);
      setKefuAccounts(accountsList);
    } catch (error) {
      console.error("获取客服账号列表失败:", error);
      Toast.show({
        content: "获取客服账号列表失败",
        position: "top",
      });
    } finally {
      setLoadingKefuAccounts(false);
    }
  }, []);

  // 确认转移好友
  const handleConfirmTransferFriend = async () => {
    if (!selectedFriend) {
      Toast.show({ content: "请选择好友", position: "top" });
      return;
    }
    if (!selectedKefuAccountId) {
      Toast.show({ content: "请选择目标客服账号", position: "top" });
      return;
    }

    setTransferFriendLoading(true);
    try {
      await transferFriend({
        friendId: selectedFriend.friendId || selectedFriend.id,
        toAccountId: selectedKefuAccountId,
        comment: transferComment || undefined,
      });

      Toast.show({ content: "转移成功", position: "top" });
      setShowTransferFriendPopup(false);
      setSelectedFriend(null);
      setSelectedKefuAccountId("");
      setTransferComment("");
      // 刷新好友列表
      fetchFriendsList(1, searchQuery, false);
    } catch (error: any) {
      console.error("转移好友失败:", error);
      Toast.show({
        content: error?.message || "转移失败，请重试",
        position: "top",
      });
    } finally {
      setTransferFriendLoading(false);
    }
  };

  const handleLoadMoreMoments = async () => {
    if (isFetchingMoments) return;
    if (moments.length >= momentsTotal) return;
    await fetchMomentsList(momentsPage + 1, true);
  };

  // 处理朋友圈导出
  const handleExportMoments = useCallback(async () => {
    if (!id) {
      Toast.show({ content: "微信ID不存在", position: "top" });
      return;
    }

    // 验证时间范围不超过1个月
    if (exportStartTime && exportEndTime) {
      const maxDate = dayjs(exportStartTime).add(1, "month").toDate();
      if (exportEndTime > maxDate) {
        Toast.show({
          content: "日期范围不能超过1个月",
          position: "top",
        });
        return;
      }
    }

    setExportLoading(true);
    try {
      // 格式化时间
      const formatDate = (date: Date | null): string | undefined => {
        if (!date) return undefined;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      await exportWechatMoments({
        wechatId: id,
        keyword: exportKeyword || undefined,
        type: exportType,
        startTime: formatDate(exportStartTime),
        endTime: formatDate(exportEndTime),
      });

      Toast.show({ content: "导出成功", position: "top" });
      // 重置筛选条件（先重置，再关闭弹窗）
      setExportKeyword("");
      setExportType(undefined);
      setExportStartTime(null);
      setExportEndTime(null);
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
      // 延迟关闭弹窗，确保Toast显示
      setTimeout(() => {
        setShowExportPopup(false);
      }, 500);
    } catch (error: any) {
      console.error("导出失败:", error);
      const errorMessage = error?.message || "导出失败，请重试";
      Toast.show({
        content: errorMessage,
        position: "top",
        duration: 2000,
      });
      // 确保loading状态被重置
      setExportLoading(false);
    } finally {
      setExportLoading(false);
    }
  }, [id, exportKeyword, exportType, exportStartTime, exportEndTime]);

  const formatMomentDateParts = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return { day: "--", month: "--" };
    }
    const day = date.getDate().toString().padStart(2, "0");
    const month = `${date.getMonth() + 1}月`;
    return { day, month };
  };

  const formatMomentTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString || "--";
    }
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <Layout header={<NavCommon title="微信号详情" />} loading={loadingInfo}>
      <div className={style["wechat-account-detail-page"]}>
        {/* 账号基本信息卡片 */}
        <Card className={style["account-card"]}>
          <div className={style["account-info"]}>
            <div className={style["avatar-section"]}>
              <Avatar
                src={accountInfo?.avatar || "/placeholder.svg"}
                className={style["avatar"]}
              />
            </div>
            <div className={style["info-section"]}>
              <div className={style["name-row"]}>
                <h2 className={style["nickname"]}>
                  {accountInfo?.nickname || "未知昵称"}
                </h2>
              </div>
              <p className={style["wechat-id"]}>
                微信号：{accountInfo?.wechatId || "未知"}
              </p>
              <div className={style["action-buttons"]}>
                <Button
                  size="small"
                  fill="outline"
                  className={style["action-btn"]}
                  onClick={handleTransferFriends}
                >
                  <UserOutlined /> 好友转移
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 标签页 */}
        <Card className={style["tabs-card"]}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            className={style["tabs"]}
          >
            <Tabs.Tab title="概览" key="overview">
              <div className={style["overview-content"]}>
                {/* 健康分评估区域 */}
                <div className={style["health-score-section"]}>
                  <div className={style["health-score-title"]}>健康分评估</div>
                  <div className={style["health-score-info"]}>
                    <div className={style["health-score-status"]}>
                      <span className={style["status-tag"]}>{overviewData?.healthScoreAssessment?.statusTag || "已添加加人"}</span>
                      <span className={style["status-time"]}>最后添加时间: {overviewData?.healthScoreAssessment?.lastAddTime || "-"}</span>
                    </div>
                    <div className={style["health-score-display"]}>
                      <div className={style["score-circle-wrapper"]}>
                        <div className={style["score-circle"]}>
                          <div className={style["score-number"]}>
                            {overviewData?.healthScoreAssessment?.score || 0}
                          </div>
                          <div className={style["score-label"]}>SCORE</div>
                        </div>
                      </div>
                      <div className={style["health-score-stats"]}>
                        <div className={style["stats-row"]}>
                          <div className={style["stats-label"]}>每日限额</div>
                          <div className={style["stats-value"]}>{overviewData?.healthScoreAssessment?.dailyLimit || 0} 人</div>
                        </div>
                        <div className={style["stats-row"]}>
                          <div className={style["stats-label"]}>今日已加</div>
                          <div className={style["stats-value"]}>{overviewData?.healthScoreAssessment?.todayAdded || 0} 人</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 账号价值和好友数量区域 */}
                <div className={style["account-stats-grid"]}>
                  {/* 账号价值 */}
                  <div className={style["stat-card"]}>
                    <div className={style["stat-header"]}>
                      <div className={style["stat-title"]}>账号价值</div>
                      <div className={style["stat-icon-up"]}></div>
                    </div>
                    <div className={style["stat-value"]}>
                      {calculateAccountValue().formatted}
                    </div>
                  </div>

                  {/* 今日价值变化 */}
                  <div className={style["stat-card"]}>
                    <div className={style["stat-header"]}>
                      <div className={style["stat-title"]}>今日价值变化</div>
                      <div className={style["stat-icon-plus"]}></div>
                    </div>
                    <div className={calculateTodayValueChange().isPositive ? style["stat-value-positive"] : style["stat-value-negative"]}>
                      {calculateTodayValueChange().formatted}
                    </div>
                  </div>
                </div>

                {/* 好友数量和今日新增好友区域 */}
                <div className={style["account-stats-grid"]}>
                  {/* 好友总数 */}
                  <div className={style["stat-card"]}>
                    <div className={style["stat-header"]}>
                      <div className={style["stat-title"]}>好友总数</div>
                      <div className={style["stat-icon-people"]}></div>
                    </div>
                    <div className={style["stat-value"]}>
                      {overviewData?.totalFriends || accountInfo?.friendShip?.totalFriend || "0"}
                    </div>
                  </div>

                  {/* 今日新增好友 */}
                  <div className={style["stat-card"]}>
                    <div className={style["stat-header"]}>
                      <div className={style["stat-title"]}>今日新增好友</div>
                      <div className={style["stat-icon-plus"]}></div>
                    </div>
                    <div className={style["stat-value-positive"]}>
                      +{overviewData?.todayNewFriends || accountSummary?.statistics.todayAdded || "0"}
                    </div>
                  </div>
                </div>

                {/* 高价群聊区域 */}
                <div className={style["account-stats-grid"]}>
                  {/* 高价群聊 */}
                  <div className={style["stat-card"]}>
                    <div className={style["stat-header"]}>
                      <div className={style["stat-title"]}>高价群聊</div>
                      <div className={style["stat-icon-chat"]}></div>
                    </div>
                    <div className={style["stat-value"]}>
                      {overviewData?.highValueChatrooms || accountInfo?.friendShip?.groupNumber || "0"}
                    </div>
                  </div>

                  {/* 今日新增群聊 */}
                  <div className={style["stat-card"]}>
                    <div className={style["stat-header"]}>
                      <div className={style["stat-title"]}>今日新增群聊</div>
                      <div className={style["stat-icon-plus"]}></div>
                    </div>
                    <div className={style["stat-value-positive"]}>
                      +{overviewData?.todayNewChatrooms || "0"}
                    </div>
                  </div>
                </div>


              </div>
            </Tabs.Tab>

            <Tabs.Tab title="健康分" key="health">
              <div className={style["health-content"]}>
                {/* 健康分评估区域 */}
                <div className={style["health-score-section"]}>
                  <div className={style["health-score-title"]}>健康分评估</div>
                  <div className={style["health-score-info"]}>
                    <div className={style["health-score-status"]}>
                      <span className={style["status-tag"]}>{overviewData?.healthScoreAssessment?.statusTag || "已添加加人"}</span>
                      <span className={style["status-time"]}>最后添加时间: {overviewData?.healthScoreAssessment?.lastAddTime || "18:44:14"}</span>
                    </div>
                    <div className={style["health-score-display"]}>
                      <div className={style["score-circle-wrapper"]}>
                        <div className={style["score-circle"]}>
                          <div className={style["score-number"]}>
                            {overviewData?.healthScoreAssessment?.score || 0}
                          </div>
                          <div className={style["score-label"]}>SCORE</div>
                        </div>
                      </div>
                      <div className={style["health-score-stats"]}>
                        <div className={style["stats-row"]}>
                          <div className={style["stats-label"]}>每日限额</div>
                          <div className={style["stats-value"]}>{overviewData?.healthScoreAssessment?.dailyLimit || 0} 人</div>
                        </div>
                        <div className={style["stats-row"]}>
                          <div className={style["stats-label"]}>今日已加</div>
                          <div className={style["stats-value"]}>{overviewData?.healthScoreAssessment?.todayAdded || 0} 人</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 基础构成 */}
                <div className={style["health-section"]}>
                  <div className={style["health-section-title"]}>基础构成</div>
                  {(overviewData?.healthScoreAssessment?.baseComposition &&
                    overviewData.healthScoreAssessment.baseComposition.length > 0
                    ? overviewData.healthScoreAssessment.baseComposition
                    : [
                        { name: "账号基础分", formatted: "+60" },
                        { name: "已修改微信号", formatted: "+10" },
                        { name: "好友数量加成", formatted: "+12", friendCount: 5595 },
                      ]
                  ).map((item, index) => (
                    <div className={style["health-item"]} key={`${item.name}-${index}`}>
                      <div className={style["health-item-label"]}>
                        {item.name}
                        {item.friendCount ? ` (${item.friendCount})` : ""}
                      </div>
                      <div
                        className={
                          (item.score ?? 0) >= 0
                            ? style["health-item-value-positive"]
                            : style["health-item-value-negative"]
                        }
                      >
                        {item.formatted || `${item.score ?? 0}`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 动态记录 */}
                <div className={style["health-section"]}>
                  <div className={style["health-section-title"]}>动态记录</div>
                  {overviewData?.healthScoreAssessment?.dynamicRecords &&
                  overviewData.healthScoreAssessment.dynamicRecords.length > 0 ? (
                    overviewData.healthScoreAssessment.dynamicRecords.map(
                      (record, index) => (
                        <div className={style["health-item"]} key={`record-${index}`}>
                          <div className={style["health-item-label"]}>
                            <span className={style["health-item-icon-warning"]}></span>
                            {record.name || record.description || "记录"}
                            {record.statusTag && (
                              <span className={style["health-item-tag"]}>
                                {record.statusTag}
                              </span>
                            )}
                          </div>
                          <div
                            className={
                              (record.score ?? 0) >= 0
                                ? style["health-item-value-positive"]
                                : style["health-item-value-negative"]
                            }
                          >
                            {record.formatted ||
                              (record.score && record.score > 0
                                ? `+${record.score}`
                                : record.score || "-")}
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div className={style["health-empty"]}>暂无动态记录</div>
                  )}
                </div>
              </div>
            </Tabs.Tab>


            <Tabs.Tab
              title={`好友${activeTab === "friends" && friendsTotal > 0 ? ` (${friendsTotal.toLocaleString()})` : ""}`}
              key="friends"
            >
              <div className={style["friends-content"]}>
                {/* 搜索栏 */}
                <div className={style["search-bar"]}>
                  <div className={style["search-input-wrapper"]}>
                    <Input
                      placeholder="搜索好友昵称/微信号"
                      value={searchQuery}
                      onChange={(e: any) => setSearchQuery(e.target.value)}
                      prefix={<SearchOutlined />}
                      allowClear
                      size="large"
                      onPressEnter={handleSearch}
                    />
                  </div>
                  <Button
                    size="small"
                    onClick={handleRefreshFriends}
                    loading={isFetchingFriends}
                    className={style["refresh-btn"]}
                  >
                    <ReloadOutlined />
                  </Button>
                </div>

                {/* 好友概要 */}
                <div className={style["friends-summary"]}>
                  <div className={style["summary-item"]}>
                    <div className={style["summary-label"]}>好友总数</div>
                    <div className={style["summary-value"]}>
                      {friendsTotal || overviewData?.totalFriends || 0}
                    </div>
                  </div>
                  <div className={style["summary-divider"]} />
                  <div className={style["summary-item"]}>
                    <div className={style["summary-label"]}>好友总估值</div>
                    <div className={style["summary-value-highlight"]}>
                      {calculateAccountValue().formatted}
                    </div>
                  </div>
                </div>

                {/* 好友列表 */}
                <div className={style["friends-list"]}>
                  {isFetchingFriends && friends.length === 0 ? (
                    <div className={style["loading"]}>
                      <SpinLoading color="primary" style={{ fontSize: 32 }} />
                    </div>
                  ) : isFriendsEmpty ? (
                    <div className={style["empty"]}>暂无好友数据</div>
                  ) : hasFriendLoadError ? (
                    <div className={style["error"]}>
                      <p>加载失败，请重试</p>
                      <Button
                        size="small"
                        onClick={() =>
                          fetchFriendsList(friendsPage, searchQuery, false)
                        }
                      >
                        重试
                      </Button>
                    </div>
                  ) : (
                    <>
                      {friends.map(friend => (
                        <div
                          key={friend.id}
                          className={style["friend-card"]}
                          onClick={() => handleFriendClick(friend)}
                        >
                          <div className={style["friend-avatar"]}>
                            <Avatar src={friend.avatar} />
                          </div>
                          <div className={style["friend-main"]}>
                            <div className={style["friend-header"]}>
                              <div className={style["friend-name"]}>
                                {friend.nickname || "未知好友"}
                              </div>
                              <div className={style["friend-value"]}>
                                <div className={style["value-amount"]}>
                                  {friend.valueFormatted
                                    || (typeof friend.value === "number"
                                      ? `¥${friend.value.toLocaleString()}`
                                      : "¥3")}
                                </div>
                              </div>
                            </div>
                            <div className={style["friend-info"]}>
                              <div className={style["friend-info-item"]}>
                                <span className={style["info-label"]}>微信号：</span>
                                <span className={style["info-value"]}>
                                  {friend.wechatId || "-"}
                                </span>
                              </div>
                              {(friend.accountUserName || friend.accountRealName) && (
                                <div className={style["friend-info-item"]}>
                                  <span className={style["info-label"]}>归属：</span>
                                  <span className={style["info-value"]}>
                                    {friend.accountUserName || ""}
                                    {friend.accountRealName && `(${friend.accountRealName})`}
                                  </span>
                                </div>
                              )}
                            </div>
                            {(friend.statusTags?.length > 0 || friend.remark) && (
                              <div className={style["friend-tags"]}>
                                {friend.statusTags?.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className={style["friend-tag"]}
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {friend.remark && (
                                  <span className={style["friend-tag"]}>
                                    {friend.remark}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* 无限滚动加载 */}
                <InfiniteScroll
                  loadMore={handleLoadMoreFriends}
                  hasMore={friends.length < friendsTotal}
                  threshold={100}
                >
                  {isFetchingFriends && friends.length > 0 && (
                    <div className={style["friends-loading"]}>
                      <SpinLoading color="primary" style={{ fontSize: 16 }} />
                      <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>
                        加载中...
                      </span>
                    </div>
                  )}
                  {friends.length >= friendsTotal && friends.length > 0 && (
                    <div className={style["friends-no-more"]}>
                      <span style={{ color: "#999", fontSize: 12 }}>没有更多了</span>
                    </div>
                  )}
                </InfiniteScroll>
              </div>
            </Tabs.Tab>


            <Tabs.Tab title="朋友圈" key="moments">
              {/* 功能按钮栏 - 移到白色背景上 */}
              <div className={style["moments-action-bar"]}>
                <div className={style["action-button"]}>
                  <FileTextOutlined />
                </div>
                <div className={style["action-button"]}>
                  <PictureOutlined />
                </div>
                <div className={style["action-button"]}>
                  <VideoCameraOutlined />
                </div>
                <div
                  className={style["action-button-dark"]}
                  onClick={() => {
                    // 默认设置近7天
                    const today = new Date();
                    const sevenDaysAgo = dayjs(today).subtract(30, "day").toDate();
                    setExportStartTime(sevenDaysAgo);
                    setExportEndTime(today);
                    setShowExportPopup(true);
                  }}
                >
                  <DownloadOutlined />
                </div>
              </div>

              <div className={style["moments-content"]}>
                {/* 朋友圈列表 */}
                <div className={style["moments-list"]}>
                  {isFetchingMoments && moments.length === 0 ? (
                    <div className={style["loading"]}>
                      <SpinLoading color="primary" style={{ fontSize: 32 }} />
                    </div>
                  ) : momentsError ? (
                    <div className={style["error"]}>{momentsError}</div>
                  ) : moments.length === 0 ? (
                    <div className={style["empty"]}>暂无朋友圈内容</div>
                  ) : (
                    moments.map(moment => {
                      const { day, month } = formatMomentDateParts(
                        moment.createTime,
                      );
                      const timeAgo = formatMomentTimeAgo(moment.createTime);
                      const imageCount = moment.resUrls?.length || 0;
                      // 根据图片数量选择对应的grid类，参考素材管理的实现
                      let gridClass = "";
                      if (imageCount === 1) gridClass = style["single"];
                      else if (imageCount === 2) gridClass = style["double"];
                      else if (imageCount === 3) gridClass = style["triple"];
                      else if (imageCount === 4) gridClass = style["quad"];
                      else if (imageCount > 4) gridClass = style["grid"];

                      return (
                        <div className={style["moment-item"]} key={moment.id}>
                          <div className={style["moment-date"]}>
                            <div className={style["date-day"]}>{day}</div>
                            <div className={style["date-month"]}>{month}</div>
                          </div>
                          <div className={style["moment-content"]}>
                            {moment.content && (
                              <div className={style["moment-text"]}>
                                {moment.content}
                              </div>
                            )}
                            {imageCount > 0 && (
                              <div className={style["moment-images"]}>
                                <div
                                  className={`${style["image-grid"]} ${gridClass}`}
                                >
                                  {moment.resUrls
                                    .slice(0, 9)
                                    .map((url, index) => (
                                      <img
                                        key={`${moment.id}-img-${index}`}
                                        src={url}
                                        alt="朋友圈图片"
                                      />
                                    ))}
                                  {imageCount > 9 && (
                                    <div className={style["image-more"]}>
                                      +{imageCount - 9}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className={style["moment-footer"]}>
                              <span className={style["moment-time"]}>
                                {timeAgo}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <InfiniteScroll
                  loadMore={handleLoadMoreMoments}
                  hasMore={moments.length < momentsTotal}
                  threshold={100}
                >
                  {isFetchingMoments && moments.length > 0 && (
                    <div className={style["moments-loading"]}>
                      <SpinLoading color="primary" style={{ fontSize: 16 }} />
                      <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>
                        加载中...
                      </span>
                    </div>
                  )}
                  {moments.length >= momentsTotal && moments.length > 0 && (
                    <div className={style["moments-no-more"]}>
                      <span style={{ color: "#999", fontSize: 12 }}>没有更多了</span>
                    </div>
                  )}
                </InfiniteScroll>
              </div>
            </Tabs.Tab>

          </Tabs>
        </Card>
      </div>

      {/* 限制记录详情弹窗 */}
      <Popup
        visible={showRestrictions}
        onMaskClick={() => setShowRestrictions(false)}
        bodyStyle={{ borderRadius: "16px 16px 0 0" }}
      >
        <div className={style["popup-content"]}>
          <div className={style["popup-header"]}>
            <h3>限制记录详情</h3>
            <Button
              size="small"
              fill="outline"
              onClick={() => setShowRestrictions(false)}
            >
              关闭
            </Button>
          </div>
          <p className={style["popup-description"]}>每次限制恢复时间为24小时</p>
          {accountSummary && accountSummary.restrictions && (
            <div className={style["restrictions-detail"]}>
              {accountSummary.restrictions.map(restriction => (
                <div
                  key={restriction.id}
                  className={style["restriction-detail-item"]}
                >
                  <div className={style["restriction-detail-info"]}>
                    <div className={style["restriction-detail-reason"]}>
                      {restriction.reason}
                    </div>
                    <div className={style["restriction-detail-date"]}>
                      {formatDateTime(restriction.date)}
                    </div>
                  </div>
                  <span
                    className={`${style["restriction-detail-level"]} ${getRestrictionLevelColor(restriction.level)}`}
                  >
                    {restriction.level === 3
                      ? "高风险"
                      : restriction.level === 2
                        ? "中风险"
                        : "低风险"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>

      {/* 好友转移确认弹窗 */}
      <Popup
        visible={showTransferConfirm}
        onMaskClick={() => setShowTransferConfirm(false)}
        bodyStyle={{ borderRadius: "16px 16px 0 0" }}
      >
        <div className={style["popup-content"]}>
          <div className={style["popup-header"]}>
            <h3>确认好友转移</h3>
          </div>
          <p className={style["popup-description"]}>
            确定要将该微信号的好友转移到其他账号吗？此操作将创建一个好友转移计划。
          </p>

          <div className={style["transfer-form"]}>
            {/* 设备选择 */}
            <div className={style["form-item"]}>
              <div className={style["form-label"]}>迁移的新设备</div>
              <div className={style["form-control"]}>
                <DeviceSelection
                  selectedOptions={selectedDevices}
                  onSelect={setSelectedDevices}
                  placeholder="请选择目标设备"
                  showSelectedList={true}
                />
              </div>
            </div>

            {/* 同步原有信息 */}
            <div className={style["form-item"]}>
              <div className={style["form-label"]}>同步原有信息</div>
              <div className={style["form-control-switch"]}>
                <Switch
                  checked={inheritInfo}
                  onChange={setInheritInfo}
                />
                <span className={style["switch-label"]}>
                  {inheritInfo ? "是" : "否"}
                </span>
              </div>
            </div>

            {/* 打招呼 */}
            <div className={style["form-item"]}>
              <div className={style["form-label"]}>打招呼</div>
              <div className={style["form-control"]}>
                <Input.TextArea
                  placeholder="请输入打招呼内容（可选）"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={3}
                  maxLength={200}
                  showCount
                  style={{ resize: "none" }}
                />
              </div>
            </div>

            {/* 通过后首次消息 */}
            <div className={style["form-item"]}>
              <div className={style["form-label"]}>好友通过后的首次消息</div>
              <div className={style["form-control"]}>
                <Input.TextArea
                  placeholder="请输入好友通过验证后发送的首条消息（可选）"
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  rows={3}
                  maxLength={200}
                  showCount
                  style={{ resize: "none" }}
                />
              </div>
            </div>
          </div>

          <div className={style["popup-actions"]}>
            <Button
              block
              color="primary"
              onClick={confirmTransferFriends}
              loading={transferLoading}
              disabled={transferLoading}
            >
              {transferLoading ? "转移中..." : "确认转移"}
            </Button>
            <Button
              block
              color="danger"
              fill="outline"
              onClick={() => {
                setShowTransferConfirm(false);
                setSelectedDevices([]);
                // 重置为默认打招呼内容
                const nickname = accountInfo?.nickname || "未知";
                setGreeting(`这个是${nickname}的新号，之前那个号没用了，重新加一下您`);
                setFirstMessage("");
              }}
            >
              取消
            </Button>
          </div>
        </div>
      </Popup>

      {/* 朋友圈导出弹窗 */}
      <Popup
        visible={showExportPopup}
        onMaskClick={() => {
          setShowExportPopup(false);
          setShowStartTimePicker(false);
          setShowEndTimePicker(false);
        }}
        bodyStyle={{ borderRadius: "16px 16px 0 0" }}
      >
        <div className={style["popup-content"]}>
          <div className={style["popup-header"]}>
            <h3>导出朋友圈</h3>
            <Button
              size="small"
              fill="outline"
              onClick={() => {
                setShowExportPopup(false);
                setShowStartTimePicker(false);
                setShowEndTimePicker(false);
              }}
            >
              关闭
            </Button>
          </div>

          <div className={style["export-form"]}>
            {/* 关键词搜索 */}
            <div className={style["form-item"]}>
              <label>关键词搜索</label>
              <Input
                placeholder="请输入关键词"
                value={exportKeyword}
                onChange={e => setExportKeyword(e.target.value)}
                allowClear
              />
            </div>

            {/* 类型筛选 */}
            <div className={style["form-item"]}>
              <label>类型筛选</label>
              <div className={style["type-selector"]}>
                <div
                  className={`${style["type-option"]} ${
                    exportType === undefined ? style["active"] : ""
                  }`}
                  onClick={() => setExportType(undefined)}
                >
                  全部
                </div>
                <div
                  className={`${style["type-option"]} ${
                    exportType === 4 ? style["active"] : ""
                  }`}
                  onClick={() => setExportType(4)}
                >
                  文本
                </div>
                <div
                  className={`${style["type-option"]} ${
                    exportType === 1 ? style["active"] : ""
                  }`}
                  onClick={() => setExportType(1)}
                >
                  图片
                </div>
                <div
                  className={`${style["type-option"]} ${
                    exportType === 3 ? style["active"] : ""
                  }`}
                  onClick={() => setExportType(3)}
                >
                  视频
                </div>
              </div>
            </div>

            {/* 开始时间 */}
            <div className={style["form-item"]}>
              <label>开始时间</label>
              <Input
                readOnly
                placeholder="请选择开始时间"
                value={
                  exportStartTime
                    ? exportStartTime.toLocaleDateString("zh-CN")
                    : ""
                }
                onClick={() => setShowStartTimePicker(true)}
              />
              <DatePicker
                visible={showStartTimePicker}
                title="开始时间"
                value={exportStartTime}
                max={exportEndTime || new Date()}
                onClose={() => setShowStartTimePicker(false)}
                onConfirm={val => {
                  setExportStartTime(val);
                  setShowStartTimePicker(false);
                }}
                onCancel={() => setShowStartTimePicker(false)}
              />
            </div>

            {/* 结束时间 */}
            <div className={style["form-item"]}>
              <label>结束时间</label>
              <Input
                readOnly
                placeholder="请选择结束时间"
                value={
                  exportEndTime ? exportEndTime.toLocaleDateString("zh-CN") : ""
                }
                onClick={() => setShowEndTimePicker(true)}
              />
              <DatePicker
                visible={showEndTimePicker}
                title="结束时间"
                value={exportEndTime}
                min={exportStartTime || undefined}
                max={new Date()}
                onClose={() => setShowEndTimePicker(false)}
                onConfirm={val => {
                  setExportEndTime(val);
                  setShowEndTimePicker(false);
                }}
              />
            </div>
          </div>

          <div className={style["popup-footer"]}>
            <Button
              block
              color="primary"
              onClick={handleExportMoments}
              loading={exportLoading}
              disabled={exportLoading}
            >
              {exportLoading ? "导出中..." : "确认导出"}
            </Button>
            <Button
              block
              color="danger"
              fill="outline"
              onClick={() => {
                setShowExportPopup(false);
                setExportKeyword("");
                setExportType(undefined);
                setExportStartTime(null);
                setExportEndTime(null);
                setShowStartTimePicker(false);
                setShowEndTimePicker(false);
              }}
              style={{ marginTop: 12 }}
            >
              取消
            </Button>
          </div>
        </div>
      </Popup>

      {/* 迁移好友弹窗 */}
      <Popup
        visible={showTransferFriendPopup}
        onMaskClick={() => {
          setShowTransferFriendPopup(false);
          setSelectedFriend(null);
          setSelectedKefuAccountId("");
          setTransferComment("");
        }}
        bodyStyle={{ borderRadius: "16px 16px 0 0" }}
      >
        <div className={style["popup-content"]}>
          <div className={style["popup-header"]}>
            <h3>迁移好友</h3>
            <Button
              size="small"
              fill="outline"
              onClick={() => {
                setShowTransferFriendPopup(false);
                setSelectedFriend(null);
                setSelectedKefuAccountId("");
                setTransferComment("");
              }}
            >
              关闭
            </Button>
          </div>

          <div className={style["export-form"]}>
            {/* 好友信息 */}
            {selectedFriend && (
              <div className={style["form-item"]}>
                <label>好友信息</label>
                <div className={style["friend-info-card"]}>
                  <Avatar src={selectedFriend.avatar} style={{ width: 40, height: 40 }} />
                  <div className={style["friend-info-text"]}>
                    <div className={style["friend-info-name"]}>
                      {selectedFriend.nickname || "未知好友"}
                    </div>
                    <div className={style["friend-info-id"]}>
                      {selectedFriend.wechatId || "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 选择客服账号 */}
            <div className={style["form-item"]}>
              <label>选择客服账号</label>
              {loadingKefuAccounts ? (
                <div className={style["loading-accounts"]}>
                  <SpinLoading color="primary" style={{ fontSize: 16 }} />
                  <span style={{ marginLeft: 8 }}>加载中...</span>
                </div>
              ) : kefuAccounts.length === 0 ? (
                <div className={style["empty-accounts"]}>暂无客服账号</div>
              ) : (
                <Select
                  placeholder="请选择客服账号"
                  value={selectedKefuAccountId || undefined}
                  onChange={(value: string) => setSelectedKefuAccountId(value)}
                  style={{ width: "100%" }}
                  allowClear
                >
                  {kefuAccounts.map((account: any) => {
                    const displayName = `${account.userName || ""}(${account.realName || ""})`;
                    return (
                      <Select.Option key={account.id} value={String(account.id)}>
                        {displayName}
                      </Select.Option>
                    );
                  })}
                </Select>
              )}
            </div>

            {/* 备注 */}
            <div className={style["form-item"]}>
              <label>备注（可选）</label>
              <Input
                placeholder="请输入备注信息"
                value={transferComment}
                onChange={e => setTransferComment(e.target.value)}
                allowClear
              />
            </div>
          </div>

          <div className={style["popup-footer"]}>
            <Button
              block
              color="primary"
              onClick={handleConfirmTransferFriend}
              loading={transferFriendLoading}
              disabled={transferFriendLoading || !selectedKefuAccountId}
            >
              {transferFriendLoading ? "转移中..." : "确认转移"}
            </Button>
            <Button
              block
              color="danger"
              fill="outline"
              onClick={() => {
                setShowTransferFriendPopup(false);
                setSelectedFriend(null);
                setSelectedKefuAccountId("");
                setTransferComment("");
              }}
              style={{ marginTop: 12 }}
            >
              取消
            </Button>
          </div>
        </div>
      </Popup>
    </Layout>
  );
};

export default WechatAccountDetail;
