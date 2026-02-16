import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, Checkbox } from "antd";
import { UserOutlined, LoadingOutlined } from "@ant-design/icons";
import AudioMessage from "./components/AudioMessage/AudioMessage";
import SmallProgramMessage from "./components/SmallProgramMessage";
import VideoMessage from "./components/VideoMessage";
import ClickMenu from "./components/ClickMeau";
import LocationMessage from "./components/LocationMessage";
import SystemRecommendRemarkMessage from "./components/SystemRecommendRemarkMessage/index";
import RedPacketMessage from "./components/RedPacketMessage";
import TransferMessage from "./components/TransferMessage";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { formatWechatTime } from "@/utils/common";
import { getEmojiPath } from "@/components/EmojiSeclection/wechatEmoji";
import { parseSystemMessage } from "@/utils/filter";
import styles from "./com.module.scss";
import {
  useMessageSelectors,
  useUIStateSelectors,
} from "@/hooks/weChat/useWeChatSelectors";
import { useWeChatActions } from "@/hooks/weChat/useWeChatSelectors";
import { useMessageParser } from "@/hooks/weChat/useMessageParser";
import { useMessageGrouping } from "@/hooks/weChat/useMessageGrouping";
import { Profiler } from "@sentry/react";
import { addPerformanceBreadcrumb } from "@/utils/sentry";
import { VirtualizedMessageList } from "./components/VirtualizedMessageList";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useContactStore } from "@/store/module/weChat/contacts";
import { useCustomerStore } from "@weChatStore/customer";
import {
  fetchReCallApi,
  fetchVoiceToTextApi,
  getChatroomMemberList,
} from "./api";
import TransmitModal from "./components/TransmitModal";

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const FILE_EXT_REGEX = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z)$/i;
const DEFAULT_IMAGE_STYLE: CSSProperties = {
  maxWidth: "200px",
  maxHeight: "200px",
  borderRadius: "8px",
};
const EMOJI_IMAGE_STYLE: CSSProperties = {
  maxWidth: "120px",
  maxHeight: "120px",
};

type ImageContentOptions = {
  src: string;
  alt: string;
  fallbackText: string;
  style?: CSSProperties;
  wrapperClassName?: string;
  withBubble?: boolean;
  onClick?: () => void;
};

const openInNewTab = (url: string) => window.open(url, "_blank");

const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement>,
  fallbackText: string,
) => {
  const target = event.target as HTMLImageElement;
  const parent = target.parentElement;
  if (parent) {
    parent.innerHTML = `<div class="${styles.messageText}">${fallbackText}</div>`;
  }
};

const renderImageContent = ({
  src,
  alt,
  fallbackText,
  style = DEFAULT_IMAGE_STYLE,
  wrapperClassName = styles.imageMessage,
  withBubble = false,
  onClick,
}: ImageContentOptions) => {
  const imageNode = (
    <div className={wrapperClassName}>
      <img
        src={src}
        alt={alt}
        style={style}
        onClick={onClick ?? (() => openInNewTab(src))}
        onError={event => handleImageError(event, fallbackText)}
      />
    </div>
  );

  if (withBubble) {
    return <div className={styles.messageBubble}>{imageNode}</div>;
  }

  return imageNode;
};

const renderEmojiContent = (src: string) =>
  renderImageContent({
    src,
    alt: "表情包",
    fallbackText: "[表情包加载失败]",
    style: EMOJI_IMAGE_STYLE,
    wrapperClassName: styles.emojiMessage,
  });

const renderFileContent = (url: string) => {
  const fileName = url.split("/").pop()?.split("?")[0] || "文件";
  const displayName =
    fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName;

  return (
    <div className={styles.fileMessage}>
      <div className={styles.fileCard}>
        <div className={styles.fileIcon}>📄</div>
        <div className={styles.fileInfo}>
          <div className={styles.fileName}>{displayName}</div>
          <div className={styles.fileAction} onClick={() => openInNewTab(url)}>
            点击查看
          </div>
        </div>
      </div>
    </div>
  );
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isHttpImageUrl = (value: string) =>
  isHttpUrl(value) && IMAGE_EXT_REGEX.test(value);
const isFileUrl = (value: string) =>
  isHttpUrl(value) && FILE_EXT_REGEX.test(value);

const isLegacyEmojiContent = (content: string) =>
  IMAGE_EXT_REGEX.test(content) ||
  content.includes("emoji") ||
  content.includes("sticker");

const tryParseContentJson = (content: string): Record<string, any> | null => {
  try {
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

interface MessageRecordProps {
  contract: ContractData | weChatGroup;
}
type GroupRenderItem = {
  id: number;
  identifier: string;
  nickname: string;
  avatar: string;
  groupId: number;
  chatroomId?: string;
  wechatId?: string;
};

interface MessageItemProps {
  msg: ChatRecord;
  contract: ContractData | weChatGroup;
  isGroup: boolean;
  showCheckbox: boolean;
  isSelected: boolean;
  currentCustomerAvatar?: string;
  renderGroupUser: (msg: ChatRecord) => { avatar: string; nickname: string };
  clearWechatidInContent: (sender: any, content: string) => string;
  parseMessageContent: (
    content: string | null | undefined,
    msg: ChatRecord,
    msgType?: number,
  ) => React.ReactNode;
  onCheckboxChange: (checked: boolean, msg: ChatRecord) => void;
  onContextMenu: (e: React.MouseEvent, msg: ChatRecord, isOwn: boolean) => void;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({
    msg,
    contract,
    isGroup,
    showCheckbox,
    isSelected,
    currentCustomerAvatar,
    renderGroupUser,
    clearWechatidInContent,
    parseMessageContent,
    onCheckboxChange,
    onContextMenu,
  }) => {
    if (!msg) return null;

    const isOwn = msg?.isSend;

    return (
      <div
        className={`${styles.messageItem} ${
          isOwn ? styles.ownMessage : styles.otherMessage
        }`}
        onContextMenu={e => onContextMenu(e, msg, !!isOwn)}
      >
        <div className={styles.messageContent}>
          {/* 单聊，自己不是发送方 */}
          {!isGroup && !isOwn && (
            <>
              {showCheckbox && (
                <div className={styles.checkboxContainer}>
                  <Checkbox
                    checked={isSelected}
                    onChange={e => onCheckboxChange(e.target.checked, msg)}
                  />
                </div>
              )}
              <Avatar
                size={32}
                src={contract.avatar}
                icon={<UserOutlined />}
                className={styles.messageAvatar}
              />
              <div>
                {!isOwn && (
                  <div className={styles.messageSender}>
                    {contract.nickname}
                  </div>
                )}
                <>{parseMessageContent(msg?.content, msg, msg?.msgType)}</>
              </div>
            </>
          )}

          {/* 群聊，自己不是发送方 */}
          {isGroup && !isOwn && (
            <>
              {showCheckbox && (
                <div className={styles.checkboxContainer}>
                  <Checkbox
                    checked={isSelected}
                    onChange={e => onCheckboxChange(e.target.checked, msg)}
                  />
                </div>
              )}
              <Avatar
                size={32}
                src={renderGroupUser(msg)?.avatar}
                icon={<UserOutlined />}
                className={styles.messageAvatar}
              />
              <div>
                {!isOwn && (
                  <div className={styles.messageSender}>
                    {renderGroupUser(msg)?.nickname}
                  </div>
                )}
                <>
                  {parseMessageContent(
                    clearWechatidInContent(msg?.sender, msg?.content),
                    msg,
                    msg?.msgType,
                  )}
                </>
              </div>
            </>
          )}

          {/* 自己发送的消息 */}
          {!!isOwn && (
            <>
              {showCheckbox && (
                <div className={styles.checkboxContainer}>
                  <Checkbox
                    checked={isSelected}
                    onChange={e => onCheckboxChange(e.target.checked, msg)}
                  />
                </div>
              )}
              <Avatar
                size={32}
                src={currentCustomerAvatar || ""}
                icon={<UserOutlined />}
                className={styles.messageAvatar}
              />
              <div>{parseMessageContent(msg?.content, msg, msg?.msgType)}</div>
              {msg.sendStatus === 1 && (
                <div
                  style={{
                    marginRight: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <LoadingOutlined
                    spin
                    style={{ fontSize: "16px", color: "#1890ff" }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.msg === next.msg &&
    prev.isGroup === next.isGroup &&
    prev.showCheckbox === next.showCheckbox &&
    prev.isSelected === next.isSelected &&
    prev.currentCustomerAvatar === next.currentCustomerAvatar &&
    prev.contract === next.contract,
);

MessageItem.displayName = "MessageItem";

// 导出 MessageItem 供虚拟滚动组件使用
export { MessageItem };

const MessageRecordComponent: React.FC<MessageRecordProps> = ({ contract }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageData: null as ChatRecord | null,
  });
  const [nowIsOwn, setNowIsOwn] = useState(false);
  // 选中的聊天记录状态
  const [selectedRecords, setSelectedRecords] = useState<ChatRecord[]>([]);

  // ✅ 使用优化的 selector（合并多个 selector，减少重渲染）
  const {
    currentMessages,
    currentMessagesHasMore,
    messagesLoading,
    isLoadingData,
  } = useMessageSelectors();

  const { showCheckbox } = useUIStateSelectors();

  const {
    loadChatMessages,
    updateShowCheckbox,
    updateEnterModule,
    updateSelectedChatRecords,
    updateQuoteMessageContent,
  } = useWeChatActions();

  const prevMessagesRef = useRef(currentMessages);
  const isLoadingMoreRef = useRef(false);
  const scrollPositionRef = useRef<number>(0);
  const currentCustomer = useCustomerStore(state =>
    state.customerList.find(kf => kf.id === contract.wechatAccountId),
  );

  const setTransmitModal = useContactStore(state => state.setTransmitModal);
  const [groupRender, setGroupRender] = useState<GroupRenderItem[]>([]);

  const currentContract = useWeChatStore(state => state.currentContract);

  // ✅ 使用 useMessageParser Hook（提取消息解析逻辑）
  const { parseMessageContent, parseEmojiText, isEmojiUrl } =
    useMessageParser(contract);

  // ✅ 使用 useMessageGrouping Hook（消息分组，使用 useMemo 缓存）
  const groupedMessages = useMessageGrouping(currentMessages);

  // ✅ 判断是否使用虚拟滚动（消息数量 > 50 时启用）
  const shouldUseVirtualization = groupedMessages.length > 50;

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!contract.chatroomId) {
        setGroupRender([]);
        return;
      }
      try {
        const res = await getChatroomMemberList({ groupId: contract.id });
        setGroupRender(res?.list || []);
      } catch (error) {
        console.error("获取群成员失败", error);
        setGroupRender([]);
      }
    };
    fetchGroupMembers();
  }, [contract.id, contract.chatroomId]);

  const groupMemberMap = useMemo(() => {
    const map = new Map<string, GroupRenderItem>();
    groupRender.forEach(member => {
      if (member?.identifier) {
        map.set(member.identifier, member);
      }
    });
    return map;
  }, [groupRender]);

  const renderGroupUser = useCallback(
    (msg: ChatRecord) => {
      if (!msg) {
        return { avatar: "", nickname: "" };
      }

      const member = msg.senderWechatId
        ? groupMemberMap.get(msg.senderWechatId)
        : undefined;

      return {
        avatar: member?.avatar || msg?.avatar,
        nickname: member?.nickname || msg?.senderNickname,
      };
    },
    [groupMemberMap],
  );

  // 定义 scrollToBottom 函数，在 useEffect 之前
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const prevMessages = prevMessagesRef.current;
    const prevLength = prevMessages.length;

    // 如果消息数组引用相同，跳过处理（避免不必要的滚动）
    if (prevMessages === currentMessages) {
      return;
    }

    const hasVideoStateChange = currentMessages.some((msg, index) => {
      // 首先检查消息对象本身是否为null或undefined
      if (!msg || !msg.content) return false;

      const prevMsg = prevMessages[index];
      if (!prevMsg || !prevMsg.content || prevMsg.id !== msg.id) return false;

      try {
        const currentContent =
          typeof msg.content === "string"
            ? JSON.parse(msg.content)
            : msg.content;
        const prevContent =
          typeof prevMsg.content === "string"
            ? JSON.parse(prevMsg.content)
            : prevMsg.content;

        // 检查视频状态是否发生变化（开始加载、完成加载、获得URL）
        const currentHasVideo =
          currentContent.previewImage && currentContent.tencentUrl;
        const prevHasVideo = prevContent.previewImage && prevContent.tencentUrl;

        if (currentHasVideo && prevHasVideo) {
          // 检查加载状态变化或视频URL变化
          return (
            currentContent.isLoading !== prevContent.isLoading ||
            currentContent.videoUrl !== prevContent.videoUrl
          );
        }

        return false;
      } catch (e) {
        return false;
      }
    });

    // 如果正在加载更早的消息，不自动滚动到底部
    if (isLoadingMoreRef.current && currentMessages.length > prevLength) {
      // 不滚动，等待加载完成后在另一个 useEffect 中恢复滚动位置
    } else if (currentMessages.length > prevLength && !hasVideoStateChange) {
      // 使用 setTimeout 延迟滚动，避免在渲染过程中触发状态更新
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    } else if (isLoadingData && !hasVideoStateChange) {
      // 使用 setTimeout 延迟滚动，避免在渲染过程中触发状态更新
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }

    // 更新上一次的消息状态（使用浅拷贝避免引用问题）
    prevMessagesRef.current = currentMessages;
  }, [currentMessages, isLoadingData, scrollToBottom]);

  // 监听加载状态，当加载完成时恢复滚动位置
  useEffect(() => {
    if (!messagesLoading && isLoadingMoreRef.current) {
      // 等待DOM更新后恢复滚动位置
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          const scrollHeight = container.scrollHeight;
          const newScrollTop = scrollHeight - scrollPositionRef.current;
          container.scrollTop = newScrollTop;
        }
        isLoadingMoreRef.current = false;
      });
    }
  }, [messagesLoading]);

  // 获取群成员头像
  // 清理微信ID前缀
  const clearWechatidInContent = useCallback((sender: any, content: string) => {
    try {
      return content.replace(new RegExp(`${sender?.wechatId}:\n`, "g"), "");
    } catch (err) {
      return "-";
    }
  }, []);

  // 右键菜单事件处理
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, msg: ChatRecord, isOwn: boolean) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        messageData: msg,
      });
      setNowIsOwn(isOwn);
    },
    [],
  );

  const handleCloseContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      messageData: null,
    });
  };

  // 处理checkbox选中状态变化
  const handleCheckboxChange = useCallback(
    (checked: boolean, msg: ChatRecord) => {
      setSelectedRecords(prev => {
        let next: ChatRecord[];
        if (checked) {
          next = [...prev, msg];
        } else {
          next = prev.filter(record => record.id !== msg.id);
        }
        updateSelectedChatRecords(next);
        return next;
      });
    },
    [updateSelectedChatRecords],
  );

  // 检查消息是否被选中
  const isMessageSelected = (msg: ChatRecord) => {
    return selectedRecords.some(record => record.id === msg.id);
  };

  const isGroupChat = !!contract.chatroomId;
  const loadMoreMessages = () => {
    if (messagesLoading || !currentMessagesHasMore) {
      return;
    }
    // 保存当前滚动位置（距离底部的距离）
    const container = messagesContainerRef.current;
    if (container) {
      scrollPositionRef.current = container.scrollHeight - container.scrollTop;
      isLoadingMoreRef.current = true;
    }
    loadChatMessages(false);
  };

  const handleForwardMessage = (messageData: ChatRecord) => {
    updateSelectedChatRecords([messageData]);
    setTransmitModal(true);
  };

  const handRecall = messageData => {
    // 撤回消息的处理逻辑
    fetchReCallApi({
      friendMessageId: messageData?.wechatFriendId ? messageData.id : 0,
      chatroomMessageId: messageData?.wechatFriendId ? 0 : messageData.id,
      seq: +new Date(),
    });
  };

  const handVoiceToText = messageData => {
    // 音频转文字的处理逻辑
    fetchVoiceToTextApi({
      friendMessageId: messageData?.wechatFriendId ? messageData.id : 0,
      chatroomMessageId: messageData?.wechatFriendId ? 0 : messageData.id,
      seq: +new Date(),
    });
  };

  const handQuote = (messageData: ChatRecord) => {
    const isGroupUser = !!currentContract?.chatroomId;
    const isSend = !!messageData.isSend;
    const nickname = currentContract?.nickname || "";
    const SEPARATOR = "\n----------------------------------\n";

    const rawContent = messageData.content || "";

    if (isGroupUser) {
      const groupNickname = messageData?.sender?.nickname || "";
      // 群消息里，非本人消息通常以 "wechatId:\n" 开头，清理前缀
      const content = rawContent.replace(
        `${messageData?.sender?.wechatId}:\n`,
        "",
      );
      const text = isSend ? rawContent : `@${groupNickname}：${content}`;
      updateQuoteMessageContent(`${text}${SEPARATOR}`);
      return;
    }

    const text = isSend ? rawContent : `@${nickname}：${rawContent}`;
    updateQuoteMessageContent(`${text}${SEPARATOR}`);
  };

  const handCommad = (action: string) => {
    switch (action) {
      case "transmit":
        handleForwardMessage(contextMenu.messageData);
        break;
      case "multipleForwarding":
        // 多条转发逻辑
        updateEnterModule(!showCheckbox ? "multipleForwarding" : "common");
        updateShowCheckbox(!showCheckbox);
        break;
      case "quote":
        // 引用逻辑
        handQuote(contextMenu.messageData);
        break;
      case "recall":
        // 撤回逻辑
        handRecall(contextMenu.messageData);
        break;
      case "voiceToText":
        // 音频转文字逻辑
        handVoiceToText(contextMenu.messageData);
        break;
      default:
        break;
    }
  };

  return (
    <Profiler
      name="MessageRecord"
      onRender={(id, phase, actualDuration) => {
        // ✅ 使用 Sentry 监控组件渲染性能
        if (actualDuration > 100) {
          addPerformanceBreadcrumb("MessageRecord 慢渲染", {
            duration: actualDuration,
            phase,
            messageCount: currentMessages.length,
            contractId: contract.id,
          });
        }
      }}
    >
      <div ref={messagesContainerRef} className={styles.messagesContainer}>
        <div
          className={styles.loadMore}
          onClick={loadMoreMessages}
          style={{
            cursor:
              currentMessagesHasMore && !messagesLoading
                ? "pointer"
                : "default",
            opacity: currentMessagesHasMore ? 1 : 0.6,
          }}
        >
          {currentMessagesHasMore
            ? "点击加载更早的信息"
            : "已经没有更早的消息了"}
          {messagesLoading ? <LoadingOutlined /> : ""}
        </div>
        {shouldUseVirtualization ? (
          // ✅ 使用虚拟滚动（消息数量 > 50）
          <VirtualizedMessageList
            groupedMessages={groupedMessages}
            contract={contract}
            isGroupChat={isGroupChat}
            showCheckbox={showCheckbox}
            currentCustomerAvatar={currentCustomer?.avatar || ""}
            renderGroupUser={renderGroupUser}
            clearWechatidInContent={clearWechatidInContent}
            parseMessageContent={parseMessageContent}
            isMessageSelected={isMessageSelected}
            onCheckboxChange={handleCheckboxChange}
            onContextMenu={handleContextMenu}
            containerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
            onScroll={scrollTop => {
              // 处理滚动位置，用于加载更多时保持位置
              scrollPositionRef.current = scrollTop;
            }}
          />
        ) : (
          // 原有的渲染逻辑（小列表不使用虚拟滚动）
          <>
            {groupedMessages.map((group, groupIndex) => (
              <React.Fragment key={`group-${groupIndex}`}>
                {group.messages
                  .filter(v => [10000, -10001].includes(v.msgType))
                  .map(msg => {
                    // 解析系统消息，提取纯文本（移除img标签和_wc_custom_link_标签）
                    const parsedText = parseSystemMessage(msg.content);
                    return (
                      <div key={`divider-${msg.id}`} className={styles.messageTime}>
                        {parsedText}
                      </div>
                    );
                  })}

                {group.messages
                  .filter(v => [570425393, 90000].includes(v.msgType))
                  .map(msg => {
                    // 解析JSON字符串
                    let displayContent = msg.content;
                    try {
                      const parsedContent = JSON.parse(msg.content);
                      if (
                        parsedContent &&
                        typeof parsedContent === "object" &&
                        parsedContent.content
                      ) {
                        displayContent = parsedContent.content;
                      }
                    } catch (error) {
                      // 如果解析失败，使用原始内容
                      displayContent = msg.content;
                    }
                    return (
                      <div key={`divider-${msg.id}`} className={styles.messageTime}>
                        {displayContent}
                      </div>
                    );
                  })}
                <div className={styles.messageTime}>{group.time}</div>
                {group.messages
                  .filter(
                    v => ![10000, 570425393, 90000, -10001].includes(v.msgType),
                  )
                  .map(msg => {
                    if (!msg) return null;
                    return (
                      <MessageItem
                        key={msg.id}
                        msg={msg}
                        contract={contract}
                        isGroup={isGroupChat}
                        showCheckbox={showCheckbox}
                        isSelected={isMessageSelected(msg)}
                        currentCustomerAvatar={currentCustomer?.avatar || ""}
                        renderGroupUser={renderGroupUser}
                        clearWechatidInContent={clearWechatidInContent}
                        parseMessageContent={parseMessageContent}
                        onCheckboxChange={handleCheckboxChange}
                        onContextMenu={handleContextMenu}
                      />
                    );
                  })}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        {/* 右键菜单组件 */}
        <ClickMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          messageData={contextMenu.messageData}
          isOwn={nowIsOwn}
          onClose={handleCloseContextMenu}
          onCommad={handCommad}
        />
        {/*  转发模态框 */}
        <TransmitModal />
      </div>
    </Profiler>
  );
};

// ✅ 使用 React.memo 优化 MessageRecord 组件，避免不必要的重渲染
const MessageRecord = React.memo(
  MessageRecordComponent,
  (prev, next) => {
    // 只有当联系人 ID 变化时才重新渲染
    return prev.contract.id === next.contract.id;
  },
);

MessageRecord.displayName = "MessageRecord";

export default MessageRecord;
