import React, { useEffect, useState, useRef, useCallback } from "react";
import { List, Avatar, Badge, Modal, Input, message } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PushpinOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import styles from "./com.module.scss";
import {
  getMessageList,
  dataProcessing,
  updateConfig,
  getWechatFriendDetail,
  getWechatChatroomDetail,
} from "./api";
import { useMessageStore } from "@weChatStore/message";
import { useWebSocketStore } from "@storeModule/websocket/websocket";
import { useCustomerStore } from "@weChatStore/customer";
import { useContactStore } from "@weChatStore/contacts";
import { useWeChatStore } from "@weChatStore/weChat";
import { useUserStore } from "@storeModule/user";
import { MessageManager } from "@/utils/dbAction/message";
import { ContactManager } from "@/utils/dbAction/contact";
import { formatWechatTime } from "@/utils/common";
import { messageFilter } from "@/utils/filter";
import { ChatSession } from "@/utils/db";
import { VirtualSessionList } from "@/components/VirtualSessionList";
interface MessageListProps {}

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: (session: ChatSession) => void;
  onContextMenu: (e: React.MouseEvent, session: ChatSession) => void;
}

const SessionItem: React.FC<SessionItemProps> = React.memo(
  ({ session, isActive, onClick, onContextMenu }) => {
    return (
      <div
        className={`${styles.messageItem} ${isActive ? styles.active : ""} ${
          (session.config as any)?.top ? styles.pinned : ""
        }`}
        onClick={() => onClick(session)}
        onContextMenu={e => onContextMenu(e, session)}
      >
        <div className={styles.messageInfo}>
          <Badge count={session.config.unreadCount || 0} size="small">
            <Avatar
              size={48}
              src={session.avatar}
              icon={
                session?.type === "group" ? <TeamOutlined /> : <UserOutlined />
              }
            />
          </Badge>
          <div className={styles.messageDetails}>
            <div className={styles.messageHeader}>
              <div className={styles.messageName}>
                {session.conRemark || session.nickname || session.wechatId}
              </div>
              <div className={styles.messageTime}>
                {formatWechatTime(session?.lastUpdateTime)}
              </div>
            </div>
            <div className={styles.messageContent}>
              {messageFilter(session.content)}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isActive === next.isActive && prev.session === next.session,
) as React.FC<SessionItemProps>;

SessionItem.displayName = "SessionItem";

const MessageList: React.FC<MessageListProps> = () => {
  const searchKeyword = useContactStore(state => state.searchKeyword);
  const { setCurrentContact, currentContract } = useWeChatStore();
  const { currentCustomer } = useCustomerStore();
  const { sendCommand } = useWebSocketStore();
  const { user } = useUserStore();
  const currentUserId = user?.id || 0;

  // Store状态
  const {
    hasLoadedOnce,
    setHasLoadedOnce,
    sessions: storeSessions, // 新架构的sessions（已过滤）
    setSessions: setSessionState,
    // 新架构的SessionStore方法
    switchAccount,
    setSearchKeyword,
    setAllSessions,
    buildIndexes,
    selectedAccountId,
  } = useMessageStore();
  // 使用新架构的sessions作为主要数据源，保留filteredSessions作为fallback
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [syncing, setSyncing] = useState(false); // 同步状态
  const hasEnrichedRef = useRef(false); // 是否已做过未知联系人补充
  const virtualListRef = useRef<HTMLDivElement>(null); // 虚拟列表容器引用

  // 决定使用哪个数据源：优先使用新架构的sessions，否则使用本地filteredSessions
  const displaySessions =
    storeSessions.length > 0 ? storeSessions : filteredSessions;

  // 右键菜单相关状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    session: ChatSession | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    session: null,
  });

  // 修改备注相关状态
  const [editRemarkModal, setEditRemarkModal] = useState<{
    visible: boolean;
    session: ChatSession | null;
    remark: string;
  }>({
    visible: false,
    session: null,
    remark: "",
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const previousUserIdRef = useRef<number | null>(null);
  const loadRequestRef = useRef(0);
  const autoClickRef = useRef(false);

  // 右键菜单事件处理
  const handleContextMenu = (e: React.MouseEvent, session: ChatSession) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      session,
    });
  };

  // 隐藏右键菜单
  const hideContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      session: null,
    });
  };

  // 置顶/取消置顶
  const handleTogglePin = async (session: ChatSession) => {
    const currentPinned = session.config?.top || 0;
    const newPinned = currentPinned === 1 ? 0 : 1;

    try {
      // 1. 立即更新UI并重新排序（乐观更新）
      setSessionState(prev => {
        const updatedSessions = prev.map(s =>
          s.id === session.id
            ? {
                ...s,
                config: { ...s.config, top: newPinned },
                sortKey: "", // 会重新计算
              }
            : s,
        );

        // 重新排序
        return updatedSessions.sort((a, b) => {
          const aKey = MessageManager["generateSortKey"](a);
          const bKey = MessageManager["generateSortKey"](b);
          return bKey.localeCompare(aKey);
        });
      });

      // 2. 后台调用API
      const params: any = {
        type: "CmdPinToTop",
        wechatAccountId: session.wechatAccountId,
        isTop: newPinned,
      };

      if (session.type === "friend") {
        params.wechatFriendId = session.id;
      } else if (session.type === "group") {
        params.wechatChatroomId = session.id;
      }

      await dataProcessing(params);

      // 3. 后台更新数据库
      await MessageManager.togglePin(
        currentUserId,
        session.id,
        session.type,
        newPinned,
      );

      message.success(`${newPinned === 1 ? "置顶" : "取消置顶"}成功`);
    } catch (error) {
      // 4. 失败时回滚UI
      setSessionState(prev =>
        prev.map(s =>
          s.id === session.id
            ? { ...s, config: { ...s.config, top: currentPinned } }
            : s,
        ),
      );
      message.error(`${newPinned ? "置顶" : "取消置顶"}失败`);
    }

    hideContextMenu();
  };

  // 删除会话
  const handleDelete = (session: ChatSession) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除与 ${session.conRemark || session.nickname} 的会话吗？`,
      onOk: async () => {
        try {
          // 1. 立即从UI移除
          setSessionState(prev => prev.filter(s => s.id !== session.id));

          // 2. 后台调用API
          await updateConfig({
            id: session.id,
            config: { chat: false },
          });

          // 3. 后台从数据库删除
          await MessageManager.deleteSession(
            currentUserId,
            session.id,
            session.type,
          );

          message.success("删除成功");
        } catch (error) {
          // 4. 失败时恢复UI
          setSessionState(prev => [...prev, session]);
          message.error("删除失败");
        }

        hideContextMenu();
      },
    });
  };

  // 修改备注
  const handleEditRemark = (session: ChatSession) => {
    setEditRemarkModal({
      visible: true,
      session: session as any,
      remark: session.conRemark || "",
    });
    hideContextMenu();
  };

  // 保存备注
  const handleSaveRemark = async () => {
    if (!editRemarkModal.session) return;

    const session = editRemarkModal.session;
    const isGroup = "chatroomId" in session;
    const sessionData = displaySessions.find(s => s.id === session.id);
    if (!sessionData) return;

    const oldRemark = session.conRemark;

    try {
      // 1. 立即更新UI
      setSessionState(prev =>
        prev.map(s =>
          s.id === session.id ? { ...s, conRemark: editRemarkModal.remark } : s,
        ),
      );

      // 2. 后台调用API
      if (isGroup) {
        // 群聊备注修改
        sendCommand("CmdModifyGroupRemark", {
          wechatAccountId: session.wechatAccountId,
          chatroomId: (session as any).chatroomId,
          newRemark: editRemarkModal.remark,
        });
        await dataProcessing({
          type: "CmdModifyGroupRemark",
          wechatAccountId: session.wechatAccountId,
          wechatFriendId: session.id,
          newRemark: editRemarkModal.remark,
        });
      } else {
        // 好友备注修改
        sendCommand("CmdModifyFriendRemark", {
          wechatAccountId: session.wechatAccountId,
          wechatFriendId: session.id,
          newRemark: editRemarkModal.remark,
        });
        await dataProcessing({
          type: "CmdModifyFriendRemark",
          wechatAccountId: session.wechatAccountId,
          wechatFriendId: session.id,
          newRemark: editRemarkModal.remark,
        });
      }

      // 3. 后台更新数据库
      await MessageManager.updateRemark(
        currentUserId,
        session.id,
        sessionData.type,
        editRemarkModal.remark,
      );

      message.success("备注更新成功");
    } catch (error) {
      // 4. 失败时回滚UI
      setSessionState(prev =>
        prev.map(s =>
          s.id === session.id ? { ...s, conRemark: oldRemark } : s,
        ),
      );
      console.error("更新备注失败:", error);
      message.error("备注更新失败，请重试");
    }

    setEditRemarkModal({
      visible: false,
      session: null,
      remark: "",
    });
  };

  // 点击外部隐藏菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        hideContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.visible]);

  // ==================== 数据加载 & 未知联系人补充 ====================

  // 同步完成后，检查是否存在"未知联系人"或缺失头像/昵称的会话，并异步补充详情
  const enrichUnknownContacts = async () => {
    if (!currentUserId) return;
    if (hasEnrichedRef.current) return; // 避免重复执行

    // 只在会话有数据时执行（使用displaySessions）
    const sessionsToCheck =
      displaySessions.length > 0 ? displaySessions : filteredSessions;
    if (!sessionsToCheck || sessionsToCheck.length === 0) return;

    const needEnrich = sessionsToCheck.filter(s => {
      const noName = !s.conRemark && !s.nickname && !s.wechatId;
      const isUnknownNickname = s.nickname === "未知联系人";
      const noAvatar = !s.avatar;
      return noName || isUnknownNickname || noAvatar;
    });

    if (needEnrich.length === 0) {
      hasEnrichedRef.current = true;
      return;
    }

    hasEnrichedRef.current = true;

    // 逐个异步拉取详情，失败不打断整体流程
    for (const session of needEnrich) {
      try {
        let detailResult: any = null;
        if (session.type === "friend") {
          detailResult = await getWechatFriendDetail({ id: session.id });
        } else {
          detailResult = await getWechatChatroomDetail({ id: session.id });
        }

        const detail = detailResult?.detail;
        if (!detail) continue;

        // 更新会话列表 UI
        setSessionState(prev =>
          prev.map(s =>
            s.id === session.id && s.type === session.type
              ? {
                  ...s,
                  avatar:
                    session.type === "group"
                      ? detail.chatroomAvatar || s.avatar
                      : detail.avatar || s.avatar,
                  nickname: detail.nickname || s.nickname,
                  conRemark: detail.conRemark || s.conRemark,
                  wechatId: detail.wechatId || s.wechatId,
                }
              : s,
          ),
        );

        // 同步到会话数据库
        await MessageManager.updateSession({
          userId: currentUserId,
          id: session.id,
          type: session.type,
          avatar:
            session.type === "group"
              ? detail.chatroomAvatar || session.avatar
              : detail.avatar || session.avatar,
          nickname: detail.nickname || session.nickname,
          conRemark: detail.conRemark || session.conRemark,
          wechatId: detail.wechatId || session.wechatId,
        });

        // 同步到联系人数据库（方便后续搜索、其它页面使用）
        const contactBase: any = {
          serverId: `${session.type}_${session.id}`,
          userId: currentUserId,
          id: session.id,
          type: session.type,
          wechatAccountId: detail.wechatAccountId,
          nickname: detail.nickname || "",
          conRemark: detail.conRemark || "",
          avatar:
            session.type === "group"
              ? detail.chatroomAvatar || ""
              : detail.avatar || "",
          lastUpdateTime: new Date().toISOString(),
          sortKey: "",
          searchKey: (detail.conRemark || detail.nickname || "").toLowerCase(),
        };

        if (session.type === "group") {
          Object.assign(contactBase, {
            chatroomId: detail.chatroomId,
            chatroomOwner: detail.chatroomOwner,
            selfDisplayName: detail.selfDisplyName,
            notice: detail.notice,
          });
        } else {
          Object.assign(contactBase, {
            wechatFriendId: detail.id,
            wechatId: detail.wechatId,
            alias: detail.alias,
            gender: detail.gender,
            region: detail.region,
            signature: detail.signature,
            phone: detail.phone,
            quanPin: detail.quanPin,
            groupId: detail.groupId,
          });
        }

        // 使用 upsert 逻辑：如果已存在就更新，不存在则新增
        const existContact = await ContactManager.getContactByIdAndType(
          currentUserId,
          session.id,
          session.type,
        );
        if (existContact) {
          await ContactManager.updateContact(contactBase);
        } else {
          await ContactManager.addContact(contactBase);
        }
      } catch (error) {
        console.error("补拉未知联系人详情失败:", error, session);
      }
    }
  };

  // 与服务器同步数据（优化版：逐页同步，立即更新UI）
  const syncWithServer = async () => {
    if (!currentUserId) return;

    setSyncing(true); // 开始同步，显示同步状态栏

    try {
      let page = 1;
      const limit = 500;
      let hasMore = true;
      let totalProcessed = 0;
      let successCount = 0;
      let failCount = 0;

      // 分页获取会话列表，每页成功后立即同步
      while (hasMore) {
        try {
          const result: any = await getMessageList({
            page,
            limit,
          });

          if (!result || !Array.isArray(result) || result.length === 0) {
            hasMore = false;
            break;
          }

          // 立即处理这一页的数据
          const friends = result.filter(
            (msg: any) => msg.dataType === "friend" || !msg.chatroomId,
          );
          const groups = result
            .filter((msg: any) => msg.dataType === "group" || msg.chatroomId)
            .map((msg: any) => ({
              ...msg,
              chatroomAvatar: msg.chatroomAvatar || msg.avatar || "",
            }));

          // 立即同步这一页到数据库（会触发UI更新）
          // 分页同步时跳过删除检查，避免误删其他页的会话
          await MessageManager.syncSessions(
            currentUserId,
            {
              friends,
              groups,
            },
            { skipDelete: true },
          );

          totalProcessed += result.length;
          successCount++;

          // 判断是否还有下一页
          if (result.length < limit) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (error) {
          // 忽略单页失败，继续处理下一页
          console.error(`第${page}页同步失败:`, error);
          failCount++;

          // 如果连续失败太多，停止同步
          if (failCount >= 3) {
            console.warn("连续失败次数过多，停止同步");
            break;
          }

          // 继续下一页
          page++;
          if (page > 100) {
            // 防止无限循环
            hasMore = false;
          }
        }
      }

      console.log(
        `会话同步完成: 成功${successCount}页, 失败${failCount}页, 共处理${totalProcessed}条数据`,
      );
      // 同步完成后，异步补充未知联系人信息
      enrichUnknownContacts();
    } catch (error) {
      console.error("同步服务器数据失败:", error);
    } finally {
      setSyncing(false); // 同步完成，更新状态栏
    }
  };

  // 手动触发同步的函数
  const handleManualSync = async () => {
    if (syncing) return; // 如果正在同步，不重复触发
    setSyncing(true);
    try {
      await syncWithServer();
    } catch (error) {
      console.error("手动同步失败:", error);
    } finally {
      setSyncing(false);
    }
  };

  // 切换账号时重置加载状态
  useEffect(() => {
    if (!currentUserId) return;
    if (previousUserIdRef.current === currentUserId) return;
    previousUserIdRef.current = currentUserId;
    setHasLoadedOnce(false);
    setSessionState([]);
    autoClickRef.current = false; // 重置自动点击标记
  }, [currentUserId, setHasLoadedOnce, setSessionState]);

  // 初始化加载会话列表
  useEffect(() => {
    if (!currentUserId || currentUserId === 0) {
      console.warn("currentUserId 无效，跳过加载:", currentUserId);
      return;
    }

    let isCancelled = false;
    const requestId = ++loadRequestRef.current;

    const initializeSessions = async () => {
      try {
        const cachedSessions =
          await MessageManager.getUserSessions(currentUserId);

        if (isCancelled || loadRequestRef.current !== requestId) {
          return;
        }

        // 有缓存数据立即显示
        if (cachedSessions.length > 0) {
          setSessionState(cachedSessions);
          // 同步到新架构的SessionStore（构建索引）
          if (cachedSessions.length > 100) {
            setAllSessions(cachedSessions);
          } else {
            buildIndexes(cachedSessions);
          }
        }

        const needsFullSync = cachedSessions.length === 0 || !hasLoadedOnce;

        if (needsFullSync) {
          // 不等待同步完成，让它在后台进行，第一页数据同步后会立即更新UI
          syncWithServer()
            .then(() => {
              if (!isCancelled && loadRequestRef.current === requestId) {
                setHasLoadedOnce(true);
              }
            })
            .catch(error => {
              console.error("同步失败:", error);
            });
        } else {
          // 后台同步
          syncWithServer().catch(error => {
            console.error("后台同步失败:", error);
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("初始化会话列表失败:", error);
        }
      }
    };

    initializeSessions();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // 订阅数据库变更，自动更新Store
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const unsubscribe = MessageManager.onSessionsUpdate(
      ({ userId: ownerId, sessions: updatedSessions }) => {
        if (ownerId !== currentUserId) return;
        setSessionState(updatedSessions);
      },
    );

    return unsubscribe;
  }, [currentUserId, setSessionState]);

  // 同步账号切换到新架构的SessionStore
  useEffect(() => {
    const accountId = currentCustomer?.id || 0;
    if (accountId !== selectedAccountId) {
      switchAccount(accountId);
    }
  }, [currentCustomer, selectedAccountId, switchAccount]);

  // 同步搜索关键词到新架构的SessionStore
  useEffect(() => {
    if (searchKeyword !== undefined) {
      setSearchKeyword(searchKeyword);
    }
  }, [searchKeyword, setSearchKeyword]);

  // 数据加载时构建索引（新架构）
  useEffect(() => {
    // 使用storeSessions或displaySessions来构建索引
    const sessionsToIndex =
      storeSessions.length > 0 ? storeSessions : displaySessions;
    if (sessionsToIndex.length > 0) {
      // 首次加载或数据更新时，构建索引
      if (sessionsToIndex.length > 100) {
        // 大数据量时使用新架构的索引
        buildIndexes(sessionsToIndex);
      }
    }
  }, [storeSessions, displaySessions, buildIndexes]);

  // 根据客服和搜索关键词筛选会话（保留原有逻辑作为fallback）
  useEffect(() => {
    const filterSessions = async () => {
      // 如果新架构的sessions有数据，优先使用（已通过switchAccount过滤）
      if (storeSessions.length > 0) {
        // 新架构已处理过滤，但需要补充wechatId（如果需要）
        const keyword = searchKeyword?.trim().toLowerCase() || "";
        if (keyword) {
          const sessionsNeedingWechatId = storeSessions.filter(
            v => !v.wechatId && v.type === "friend",
          );

          if (sessionsNeedingWechatId.length > 0) {
            const contactPromises = sessionsNeedingWechatId.map(session =>
              ContactManager.getContactByIdAndType(
                currentUserId,
                session.id,
                session.type,
              ),
            );
            const contacts = await Promise.all(contactPromises);

            // 注意：这里不能直接修改storeSessions，需要更新到store
            const updatedSessions = [...storeSessions];
            contacts.forEach((contact, index) => {
              if (contact && contact.wechatId) {
                const session = sessionsNeedingWechatId[index];
                const sessionIndex = updatedSessions.findIndex(
                  s => s.id === session.id && s.type === session.type,
                );
                if (sessionIndex !== -1) {
                  updatedSessions[sessionIndex] = {
                    ...updatedSessions[sessionIndex],
                    wechatId: contact.wechatId,
                  };
                }
              }
            });
            // 更新到store（如果需要）
            // setSessionState(updatedSessions);
          }
        }
        // 新架构已处理，不需要设置filteredSessions
        return;
      }

      // Fallback: 原有过滤逻辑（当新架构未启用时）
      let filtered = [...(filteredSessions.length > 0 ? filteredSessions : [])];

      // 根据当前选中的客服筛选
      if (currentCustomer && currentCustomer.id !== 0) {
        filtered = filtered.filter(
          v => v.wechatAccountId === currentCustomer.id,
        );
      }

      const keyword = searchKeyword?.trim().toLowerCase() || "";

      // 根据搜索关键词进行模糊匹配（支持搜索昵称、备注名、微信号）
      if (keyword) {
        // 如果搜索关键词可能是微信号，需要从联系人表补充 wechatId
        const sessionsNeedingWechatId = filtered.filter(
          v => !v.wechatId && v.type === "friend",
        );

        // 批量从联系人表获取 wechatId
        if (sessionsNeedingWechatId.length > 0) {
          const contactPromises = sessionsNeedingWechatId.map(session =>
            ContactManager.getContactByIdAndType(
              currentUserId,
              session.id,
              session.type,
            ),
          );
          const contacts = await Promise.all(contactPromises);

          // 补充 wechatId 到会话数据
          contacts.forEach((contact, index) => {
            if (contact && contact.wechatId) {
              const session = sessionsNeedingWechatId[index];
              const sessionIndex = filtered.findIndex(
                s => s.id === session.id && s.type === session.type,
              );
              if (sessionIndex !== -1) {
                filtered[sessionIndex] = {
                  ...filtered[sessionIndex],
                  wechatId: contact.wechatId,
                };
              }
            }
          });
        }

        filtered = filtered.filter(v => {
          const nickname = (v.nickname || "").toLowerCase();
          const conRemark = (v.conRemark || "").toLowerCase();
          const wechatId = (v.wechatId || "").toLowerCase();
          return (
            nickname.includes(keyword) ||
            conRemark.includes(keyword) ||
            wechatId.includes(keyword)
          );
        });
      }

      setFilteredSessions(filtered);
    };

    // 搜索过滤做简单防抖，减少频繁重算
    const timer = window.setTimeout(() => {
      filterSessions();
    }, 200);

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [
    storeSessions,
    currentCustomer,
    searchKeyword,
    currentUserId,
    filteredSessions,
  ]);

  // 渲染完毕后自动点击第一个聊天记录
  useEffect(() => {
    // 只在以下条件满足时自动点击：
    // 1. 有过滤后的会话列表
    // 2. 当前没有选中的联系人
    // 3. 还没有自动点击过
    // 4. 不在搜索状态（避免搜索时自动切换）
    if (
      displaySessions.length > 0 &&
      !currentContract &&
      !autoClickRef.current &&
      !searchKeyword?.trim()
    ) {
      // 延迟一点时间确保DOM已渲染
      const timer = setTimeout(() => {
        const firstSession = displaySessions[0];
        if (firstSession) {
          autoClickRef.current = true;
          onContactClick(firstSession);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySessions, currentContract, searchKeyword]);

  // ==================== WebSocket消息处理 ====================

  // 监听WebSocket消息更新（静默更新模式）
  useEffect(() => {
    const handleNewMessage = async (event: CustomEvent) => {
      const { message: msgData, sessionId, type } = event.detail;

      // 从联系人表查询完整信息（确保头像、wechatAccountId等字段完整）
      const contact = await ContactManager.getContactByIdAndType(
        currentUserId,
        sessionId,
        type,
      );

      // 检查会话是否存在
      const existingSession = await MessageManager.getSessionByContactId(
        currentUserId,
        sessionId,
        type,
      );

      if (existingSession) {
        // 已存在的会话：更新消息内容、未读数，同时更新联系人信息（头像、昵称等）
        const updateData: any = {
          content: msgData.content,
          lastUpdateTime: new Date().toISOString(),
          config: {
            ...existingSession.config,
            unreadCount: (existingSession.config?.unreadCount || 0) + 1,
          },
        };

        // 如果查到了联系人信息，同步更新头像、昵称等字段
        if (contact) {
          updateData.avatar = contact.avatar;
          updateData.wechatAccountId = contact.wechatAccountId;
          updateData.nickname = contact.nickname;
          updateData.conRemark = contact.conRemark;
          updateData.content = msgData.content;
        }

        // 更新到数据库
        await MessageManager.updateSession({
          userId: currentUserId,
          id: sessionId,
          type,
          ...updateData,
        });
      } else {
        // 新会话：从联系人表构建完整会话
        if (contact) {
          // 使用完整联系人信息构建会话
          const newSession = MessageManager.buildSessionFromContact(
            contact as any,
            currentUserId,
          );

          // 更新会话内容和未读数
          newSession.content = msgData.content;
          newSession.lastUpdateTime = new Date().toISOString();
          newSession.config.unreadCount = 1;
          // 添加到数据库
          await MessageManager.addSession(newSession);
        } else {
          // 联系人表中不存在，从接口获取详细信息
          console.warn(
            `联系人表中未找到 ID: ${sessionId}, 类型: ${type}，从接口获取详细信息`,
          );

          try {
            // 请求接口获取联系人/群组详情
            let detailResult: any = null;
            if (type === "friend") {
              detailResult = await getWechatFriendDetail({ id: sessionId });
            } else {
              detailResult = await getWechatChatroomDetail({ id: sessionId });
            }

            if (detailResult?.detail) {
              const contactDetail = detailResult.detail;

              // 构建联系人数据并存入联系人数据库
              const newContact = {
                serverId: `${type}_${sessionId}`,
                userId: currentUserId,
                id: sessionId,
                type,
                wechatAccountId: contactDetail.wechatAccountId,
                nickname: contactDetail.nickname || "",
                conRemark: contactDetail.conRemark || "",
                avatar:
                  type === "group"
                    ? contactDetail.chatroomAvatar || ""
                    : contactDetail.avatar || "",
                lastUpdateTime: new Date().toISOString(),
                sortKey: "",
                searchKey: (
                  contactDetail.conRemark ||
                  contactDetail.nickname ||
                  ""
                ).toLowerCase(),
              };

              // 添加群组特有字段
              if (type === "group") {
                Object.assign(newContact, {
                  chatroomId: contactDetail.chatroomId,
                  chatroomOwner: contactDetail.chatroomOwner,
                  selfDisplayName: contactDetail.selfDisplyName,
                  notice: contactDetail.notice,
                });
              } else {
                // 添加好友特有字段
                Object.assign(newContact, {
                  wechatFriendId: contactDetail.id,
                  wechatId: contactDetail.wechatId,
                  alias: contactDetail.alias,
                  gender: contactDetail.gender,
                  region: contactDetail.region,
                  signature: contactDetail.signature,
                  phone: contactDetail.phone,
                  quanPin: contactDetail.quanPin,
                  groupId: contactDetail.groupId,
                });
              }

              // 存入联系人数据库
              await ContactManager.addContact(newContact as any);
              console.log("✅ 新联系人已存入数据库:", newContact);

              // 使用完整联系人信息构建会话
              const newSession = MessageManager.buildSessionFromContact(
                contactDetail as any,
                currentUserId,
              );

              // 更新会话内容和未读数
              newSession.content = msgData.content;
              newSession.lastUpdateTime = new Date().toISOString();
              newSession.config.unreadCount = 1;

              // 添加到会话数据库
              await MessageManager.addSession(newSession);
              console.log("✅ 新会话已创建:", newSession);
            } else {
              // 接口也没有返回数据，使用最基础的兜底方案
              console.error("接口未返回联系人详情，使用基础数据创建会话");
              const newSession: ChatSession = {
                serverId: `${type}_${sessionId}`,
                userId: currentUserId,
                id: sessionId,
                type,
                wechatAccountId: msgData.wechatAccountId || 0,
                nickname: msgData.nickname || "未知联系人",
                conRemark: msgData.conRemark || "",
                avatar:
                  type === "group"
                    ? msgData.chatroomAvatar || ""
                    : msgData.avatar || "",
                content: msgData.content,
                lastUpdateTime: new Date().toISOString(),
                config: {
                  unreadCount: 1,
                  top: 0,
                },
                sortKey: "",
                phone: msgData.phone || "",
                region: msgData.region || "",
              };

              await MessageManager.addSession(newSession);
            }
          } catch (error) {
            console.error("获取联系人详情失败:", error);
            // 失败时使用消息数据创建简化会话
            const newSession: ChatSession = {
              serverId: `${type}_${sessionId}`,
              userId: currentUserId,
              id: sessionId,
              type,
              wechatAccountId: msgData.wechatAccountId || 0,
              nickname: msgData.nickname || "未知联系人",
              conRemark: msgData.conRemark || "",
              avatar:
                type === "group"
                  ? msgData.chatroomAvatar || ""
                  : msgData.avatar || "",
              content: msgData.content,
              lastUpdateTime: new Date().toISOString(),
              config: {
                unreadCount: 1,
                top: 0,
              },
              sortKey: "",
              phone: msgData.phone || "",
              region: msgData.region || "",
            };

            await MessageManager.addSession(newSession);
          }
        }
      }

      // MessageManager 的回调会自动把最新数据发给 Store
    };

    window.addEventListener(
      "chatMessageReceived",
      handleNewMessage as EventListener,
    );

    return () => {
      window.removeEventListener(
        "chatMessageReceived",
        handleNewMessage as EventListener,
      );
    };
  }, [currentUserId]);

  // ==================== 会话操作 ====================

  // 点击会话
  const onContactClick = async (session: ChatSession) => {
    console.log("onContactClick", session);

    // 设置当前会话
    setCurrentContact(session as any);

    // 标记为已读（不更新时间和排序）
    if (session.config.unreadCount > 0) {
      // 立即更新UI（只更新未读数量）
      setSessionState(prev =>
        prev.map(s =>
          s.id === session.id
            ? { ...s, config: { ...s.config, unreadCount: 0 } }
            : s,
        ),
      );

      // 后台更新数据库
      MessageManager.markAsRead(currentUserId, session.id, session.type);
    }
  };

  // 渲染同步状态提示栏
  const renderSyncStatusBar = () => (
    <div className={styles.syncStatusBar}>
      {syncing ? (
        <div className={styles.syncStatusContent}>
          <span className={styles.syncStatusText}>
            <LoadingOutlined style={{ marginRight: "10px" }} /> 同步中...
          </span>
        </div>
      ) : (
        <div className={styles.syncStatusContent}>
          <span className={styles.syncStatusText}>
            <CheckCircleOutlined
              style={{ color: "green", marginRight: "10px" }}
            />
            同步完成
          </span>
          <span className={styles.syncButton} onClick={handleManualSync}>
            同步
          </span>
        </div>
      )}
    </div>
  );

  // 计算虚拟列表容器高度
  const [containerHeight, setContainerHeight] = useState(600);
  useEffect(() => {
    const updateHeight = () => {
      if (virtualListRef.current) {
        const rect = virtualListRef.current.getBoundingClientRect();
        setContainerHeight(rect.height || 600);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // 渲染会话项（用于虚拟滚动）
  const renderSessionItem = useCallback(
    (session: ChatSession, index: number) => {
      return (
        <SessionItem
          key={session.id}
          session={session}
          isActive={!!currentContract && currentContract.id === session.id}
          onClick={onContactClick}
          onContextMenu={handleContextMenu}
        />
      );
    },
    [currentContract, onContactClick, handleContextMenu],
  );

  return (
    <div className={styles.messageList} ref={virtualListRef}>
      {/* 同步状态提示栏 */}
      {renderSyncStatusBar()}

      {/* 虚拟滚动列表 */}
      {displaySessions.length > 0 ? (
        <VirtualSessionList
          sessions={displaySessions}
          containerHeight={containerHeight - 50} // 减去同步状态栏高度
          selectedSessionId={currentContract?.id}
          renderItem={renderSessionItem}
          onItemClick={onContactClick}
          onItemContextMenu={handleContextMenu}
          className={styles.virtualList}
        />
      ) : (
        <div className={styles.emptyList}>{!syncing ? "暂无会话" : null}</div>
      )}

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.session && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
        >
          <div
            className={styles.menuItem}
            onClick={() => handleTogglePin(contextMenu.session!)}
          >
            <PushpinOutlined />
            {(contextMenu.session.config as any)?.top ? "取消置顶" : "置顶"}
          </div>
          <div
            className={styles.menuItem}
            onClick={() => handleEditRemark(contextMenu.session!)}
          >
            <EditOutlined />
            修改备注
          </div>
          <div
            className={styles.menuItem}
            onClick={() => handleDelete(contextMenu.session!)}
          >
            <DeleteOutlined />
            删除
          </div>
        </div>
      )}

      {/* 修改备注Modal */}
      <Modal
        title="修改备注"
        open={editRemarkModal.visible}
        onOk={handleSaveRemark}
        onCancel={() =>
          setEditRemarkModal({
            visible: false,
            session: null,
            remark: "",
          })
        }
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={editRemarkModal.remark}
          onChange={e =>
            setEditRemarkModal(prev => ({
              ...prev,
              remark: e.target.value,
            }))
          }
          placeholder="请输入备注"
          maxLength={20}
        />
      </Modal>
    </div>
  );
};

export default MessageList;
