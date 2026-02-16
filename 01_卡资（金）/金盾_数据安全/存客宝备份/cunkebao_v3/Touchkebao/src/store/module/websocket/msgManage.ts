//消息管理器
import { useWeChatStore } from "../weChat/weChat";
import { WebSocketMessage } from "./websocket";
import { deepCopy } from "@/utils/common";
import { Messages } from "./msg.data";
import { db } from "@/utils/db";
import { Modal } from "antd";
import { useCustomerStore, updateCustomerList } from "../weChat/customer";
import { dataProcessing, asyncMessageStatus } from "@/api/ai";
import { useContactStoreNew } from "../weChat/contacts.new";
import { useMessageStore } from "../weChat/message";
import { Contact, ChatSession } from "@/utils/db";
import { MessageManager } from "@/utils/dbAction/message";
import { ContactManager } from "@/utils/dbAction/contact";
import { groupContactsCache, sessionListCache } from "@/utils/cache";
import { GroupContactData } from "../weChat/contacts.data";
import { performanceMonitor } from "@/utils/performance";
// 消息处理器类型定义
type MessageHandler = (message: WebSocketMessage) => void;

// 延迟获取 store 方法，避免循环依赖问题
const getWeChatStoreMethods = () => {
  const state = useWeChatStore.getState();
  return {
    addMessage: state.addMessage,
    recallMessage: state.recallMessage,
    receivedMsg: state.receivedMsg,
    findMessageBySeq: state.findMessageBySeq,
    findMessageById: state.findMessageById,
    updateMessage: state.updateMessage,
    updateMomentCommonLoading: state.updateMomentCommonLoading,
    addMomentCommon: state.addMomentCommon,
    setFileDownloadUrl: state.setFileDownloadUrl,
    setFileDownloading: state.setFileDownloading,
  };
};
// 消息处理器映射
const messageHandlers: Record<string, MessageHandler> = {
  // 微信账号存活状态响应
  CmdRequestWechatAccountsAliveStatusResp: message => {
    // console.log("微信账号存活状态响应", message);
    // 获取客服列表
    const customerList = deepCopy(useCustomerStore.getState().customerList);
    const wechatAccountsAliveStatus = message.wechatAccountsAliveStatus || {};

    // 遍历客服列表，更新在线状态
    const updatedCustomerList = customerList.map(customer => ({
      ...customer,
      isOnline: wechatAccountsAliveStatus[customer.id] || false,
    }));

    // 按在线状态排序，在线的排在前面
    updatedCustomerList.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });

    // 更新客服列表
    updateCustomerList(updatedCustomerList);
  },
  // 发送消息响应
  CmdSendMessageResp: (message: Messages) => {
    const { findMessageBySeq, updateMessage } = getWeChatStoreMethods();
    const msg = findMessageBySeq(message.seq);

    //异步传新消息给数据库
    goAsyncServiceData(message);
    asyncMessageStatus({
      messageId: message.friendMessage?.id || message.chatroomMessage?.id,
      wechatFriendId: message.friendMessage?.wechatFriendId,
      wechatChatroomId: message.chatroomMessage?.wechatChatroomId,
      wechatAccountId:
        message.friendMessage?.wechatAccountId ||
        message.chatroomMessage?.wechatAccountId,
    }).then(res => {
      if (msg) {
        console.log("CmdSendMessageResp 发送消息响应", res);
        updateMessage(message.seq, {
          sendStatus: 0,
          id: message.friendMessage?.id || message.chatroomMessage?.id,
        });
      }
    });
  },
  CmdSendMessageResult: message => {
    console.log("CmdSendMessageResult 发送消息结果", message);
    dataProcessing({
      chatroomMessageId: message.chatroomMessageId,
      friendMessageId: message.friendMessageId,
      sendStatus: message.sendStatus,
      type: "CmdSendMessageResult",
      wechatAccountId: 1,
      wechatTime: message?.wechatTime,
    });
  },
  // 接收消息响应
  CmdReceiveMessageResp: message => {
    console.log("CmdReceiveMessageResp 接收消息响应", message);
    // addMessage(message.friendMessage || message.chatroomMessage);
    // 在这里添加具体的处理逻辑
  },
  //收到消息
  CmdNewMessage: async (message: Messages) => {
    // 边界检查：确保消息数据有效
    if (!message || (!message.friendMessage && !message.chatroomMessage)) {
      console.warn("CmdNewMessage: 无效的消息数据", message);
      return;
    }

    return performanceMonitor.measureAsync(
      "WebSocket.CmdNewMessage",
      async () => {
        try {
          // 处理消息本身
          const { receivedMsg } = getWeChatStoreMethods();
          const msgData = message.friendMessage || message.chatroomMessage;
          if (msgData) {
            receivedMsg(msgData);
          }

          //异步传新消息给数据库（不阻塞主流程）
          try {
            goAsyncServiceData(message);
          } catch (error) {
            console.error("异步同步消息到数据库失败:", error);
          }

          // 触发会话列表更新事件
          if (msgData) {
            const sessionId = message.friendMessage
              ? message.friendMessage.wechatFriendId
              : message.chatroomMessage?.wechatChatroomId;
            const type = message.friendMessage ? "friend" : "group";
            const wechatAccountId =
              message.friendMessage?.wechatAccountId ||
              message.chatroomMessage?.wechatAccountId ||
              0;

            // 边界检查：确保sessionId有效
            if (!sessionId) {
              console.warn("CmdNewMessage: 缺少sessionId", message);
              return;
            }

            // 更新新架构的SessionStore（增量更新索引和缓存）
            try {
              const userId =
                useCustomerStore.getState().currentCustomer?.userId || 0;
              if (userId > 0) {
                // 从数据库获取更新后的会话信息（带超时保护）
                const updatedSession = await Promise.race([
                  MessageManager.getSessionByContactId(userId, sessionId, type),
                  new Promise<null>(resolve =>
                    setTimeout(() => resolve(null), 5000),
                  ), // 5秒超时
                ]);

                if (updatedSession) {
                  const messageStore = useMessageStore.getState();
                  // 增量更新索引
                  messageStore.addSession(updatedSession);
                  // 失效缓存，下次切换账号时会重新计算
                  messageStore.invalidateCache(wechatAccountId);
                  messageStore.invalidateCache(0); // 也失效"全部"的缓存

                  // 更新会话列表缓存（不阻塞主流程）
                  const cacheKey = `sessions_${wechatAccountId}`;
                  sessionListCache
                    .get<ChatSession[]>(cacheKey)
                    .then(cachedSessions => {
                      if (cachedSessions) {
                        // 更新缓存中的会话
                        const index = cachedSessions.findIndex(
                          s =>
                            s.id === updatedSession.id &&
                            s.type === updatedSession.type,
                        );
                        if (index >= 0) {
                          cachedSessions[index] = updatedSession;
                        } else {
                          cachedSessions.push(updatedSession);
                        }
                        return sessionListCache.set(cacheKey, cachedSessions);
                      }
                    })
                    .catch(error => {
                      console.error("更新会话缓存失败:", error);
                    });
                }
              }
            } catch (error) {
              console.error("更新SessionStore失败:", error);
              // 即使更新失败，也发送事件通知（降级处理）
            }

            // 发送自定义事件通知MessageList组件
            try {
              window.dispatchEvent(
                new CustomEvent("chatMessageReceived", {
                  detail: {
                    message: msgData,
                    sessionId,
                    type,
                  },
                }),
              );
            } catch (error) {
              console.error("发送消息事件失败:", error);
            }
          }
        } catch (error) {
          console.error("CmdNewMessage处理失败:", error, message);
          throw error; // 重新抛出以便性能监控记录错误
        }
      },
      {
        messageId: message.friendMessage?.id || message.chatroomMessage?.id,
        type: message.friendMessage ? "friend" : "group",
      },
    );
  },
  CmdFriendInfoChanged: async (message: WebSocketMessage) => {
    // 好友信息变更，更新ContactStore和缓存
    // 边界检查：确保消息数据有效
    if (!message || !message.friendId) {
      console.warn("CmdFriendInfoChanged: 无效的消息数据", message);
      return;
    }

    return performanceMonitor.measureAsync(
      "WebSocket.CmdFriendInfoChanged",
      async () => {
        try {
          const contactStore = useContactStoreNew.getState();
          const userId =
            useCustomerStore.getState().currentCustomer?.userId || 0;

          if (!userId) {
            console.warn("CmdFriendInfoChanged: 用户未登录");
            return;
          }

          // 从数据库获取更新后的联系人信息（带超时保护）
          const updatedContact = await Promise.race([
            ContactManager.getContactByIdAndType(
              userId,
              message.friendId,
              "friend",
            ),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)), // 5秒超时
          ]);

          if (updatedContact) {
            // 更新ContactStore中的联系人（会自动更新分组数据和搜索结果）
            contactStore.updateContact(updatedContact);

            // 更新缓存（如果联系人所在的分组已缓存，不阻塞主流程）
            const accountId = contactStore.selectedAccountId;
            const groupId = updatedContact.groupId || 0;
            const groupType = updatedContact.type === "friend" ? 1 : 2;
            const groupKey = `groupContacts_${groupId}_${groupType}_${accountId}`;

            groupContactsCache
              .get<GroupContactData>(groupKey)
              .then(cachedData => {
                if (cachedData && cachedData.contacts) {
                  const updatedContacts = cachedData.contacts.map(c =>
                    c.id === updatedContact.id ? updatedContact : c,
                  );
                  return groupContactsCache.set(groupKey, {
                    ...cachedData,
                    contacts: updatedContacts,
                  });
                }
              })
              .catch(error => {
                console.error("更新联系人缓存失败:", error);
              });
          } else {
            console.warn(
              "CmdFriendInfoChanged: 未找到联系人",
              message.friendId,
            );
          }
        } catch (error) {
          console.error("更新好友信息失败:", error);
          throw error; // 重新抛出以便性能监控记录错误
        }
      },
      { friendId: message.friendId },
    );
  },

  // 登录响应
  CmdSignInResp: message => {
    console.log("登录响应", message);
    // 在这里添加具体的处理逻辑
  },

  CmdDownloadVideoResult: message => {
    // 在这里添加具体的处理逻辑
    console.log("视频下载结果:", message);
    // setVideoUrl(message.friendMessageId, message.url);
  },
  CmdDownloadFileResult: message => {
    const { setFileDownloadUrl, setFileDownloading } = getWeChatStoreMethods();
    const messageId = message.friendMessageId || message.chatroomMessageId;

    if (!messageId) {
      console.warn("文件下载结果缺少消息ID:", message);
      return;
    }

    if (!message.url) {
      console.warn("文件下载结果缺少URL:", message);
      setFileDownloading(messageId, false);
      return;
    }

    setFileDownloadUrl(messageId, message.url);
  },

  CmdFetchMomentResult: message => {
    const { addMomentCommon, updateMomentCommonLoading } =
      getWeChatStoreMethods();
    addMomentCommon(message.result);
    updateMomentCommonLoading(false);
  },

  CmdNotify: async (message: WebSocketMessage) => {
    console.log("通知消息", message);
    // 在这里添加具体的处理逻辑
    if (["Auth failed", "Kicked out"].includes(message.notify)) {
      // 避免重复弹窗
      if ((window as any).__CKB_AUTH_FAILED_SHOWN__) {
        return;
      }
      (window as any).__CKB_AUTH_FAILED_SHOWN__ = true;

      Modal.warning({
        title: "登录失效",
        content: "认证已失效或账号在其他设备登录，请重新登录。",
        okText: "重新登录",
        onOk: async () => {
          try {
            // 被踢出时删除所有缓存数据
            localStorage.clear();
            await db.chatSessions.clear();
            await db.contactsUnified.clear();
            await db.contactLabelMap.clear();
            await db.userLoginRecords.clear();
          } finally {
            (window as any).__CKB_AUTH_FAILED_SHOWN__ = false;
            window.location.href = "/login";
          }
        },
      });
      return;
    }
  },

  //撤回消息
  CmdMessageRecalled: message => {
    const { recallMessage } = getWeChatStoreMethods();
    const MessageId = message.friendMessageId || message.chatroomMessageId;
    recallMessage(MessageId);
  },

  CmdVoiceToTextResult: message => {
    const { findMessageById, updateMessage } = getWeChatStoreMethods();
    const msg = findMessageById(
      message.friendMessageId || message.chatroomMessageId,
    );
    if (msg) {
      const content = JSON.parse(msg.content);
      updateMessage(msg.id, {
        content: JSON.stringify({
          ...content,
          text: message.text,
        }),
      });
    }
  },
};
//消息异步同步
const goAsyncServiceData = (message: Messages) => {
  const chatroomMessages = message.chatroomMessage
    ? [message.chatroomMessage]
    : null;
  const friendMessages = message.friendMessage ? [message.friendMessage] : null;
  dataProcessing({
    chatroomMessage: chatroomMessages,
    friendMessage: friendMessages,
    type: "CmdNewMessage",
    wechatAccountId:
      message.friendMessage?.wechatAccountId ||
      message.chatroomMessage?.wechatAccountId,
  });
};

// 默认处理器
const defaultHandler: MessageHandler = message => {
  console.log("未知消息类型", message.cmdType, message);
};

// 注册新的消息处理器
export const registerMessageHandler = (
  cmdType: string,
  handler: MessageHandler,
) => {
  messageHandlers[cmdType] = handler;
};

// 移除消息处理器
export const unregisterMessageHandler = (cmdType: string) => {
  delete messageHandlers[cmdType];
};

// 获取所有已注册的消息类型
export const getRegisteredMessageTypes = (): string[] => {
  return Object.keys(messageHandlers);
};

// 消息管理核心函数（带性能监控和错误处理）
export const msgManageCore = (message: WebSocketMessage) => {
  // 边界检查：确保消息有效
  if (!message) {
    console.warn("msgManageCore: 无效的消息", message);
    return;
  }

  const cmdType = message.cmdType;
  if (!cmdType) {
    console.warn("消息缺少cmdType字段", message);
    return;
  }

  // 获取对应的处理器，如果没有则使用默认处理器
  const handler = messageHandlers[cmdType] || defaultHandler;

  // 使用性能监控工具（统一监控）
  performanceMonitor.measure(
    `WebSocket.msgManageCore.${cmdType}`,
    () => {
      try {
        // 执行处理器
        const result = handler(message) as any;

        // 如果是Promise，添加错误处理
        if (
          result &&
          typeof result === "object" &&
          typeof result.then === "function"
        ) {
          result.catch((error: any) => {
            console.error(`处理消息类型 ${cmdType} 时发生异步错误:`, error);
          });
        }
      } catch (error) {
        console.error(`处理消息类型 ${cmdType} 时发生错误:`, error);
        // 不抛出错误，避免影响其他消息处理
        throw error; // 抛出以便性能监控记录错误
      }
    },
    { cmdType },
  );
};
