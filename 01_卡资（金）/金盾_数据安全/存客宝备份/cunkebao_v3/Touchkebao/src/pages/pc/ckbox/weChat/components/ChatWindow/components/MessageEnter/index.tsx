import React, { useEffect, useState, useCallback, useRef } from "react";
import { Layout, Button, message, Tooltip } from "antd";
import {
  SendOutlined,
  FolderOutlined,
  PictureOutlined,
  ExportOutlined,
  CloseOutlined,
  MessageOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { ContractData, weChatGroup, ChatRecord } from "@/pages/pc/ckbox/data";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { EmojiPicker } from "@/components/EmojiSeclection";
import { EmojiInfo } from "@/components/EmojiSeclection/wechatEmoji";
import SimpleFileUpload from "@/components/Upload/SimpleFileUpload";
import AudioRecorder from "@/components/Upload/AudioRecorder";
import ToContract from "./components/toContract";
import styles from "./MessageEnter.module.scss";
import {
  clearAiRequestQueue,
  manualTriggerAi,
} from "@/store/module/weChat/weChat";
import {
  useUIStateSelectors,
  useAISelectors,
} from "@/hooks/weChat/useWeChatSelectors";
import { useWeChatActions } from "@/hooks/weChat/useWeChatSelectors";
import { useContactStore } from "@/store/module/weChat/contacts";
import SelectMap from "./components/selectMap";
const { Footer } = Layout;

interface MessageEnterProps {
  contract: ContractData | weChatGroup;
}

const { sendCommand } = useWebSocketStore.getState();

const FileType = {
  TEXT: 1,
  IMAGE: 2,
  VIDEO: 3,
  AUDIO: 4,
  FILE: 5,
};

const IMAGE_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "svg",
  "ico",
];

const VIDEO_FORMATS = [
  "mp4",
  "avi",
  "mov",
  "wmv",
  "flv",
  "mkv",
  "webm",
  "3gp",
  "rmvb",
];

// 根据文件格式判断消息类型（纯函数，放在组件外避免重复创建）
const getMsgTypeByFileFormat = (filePath: string): number => {
  const extension = filePath.toLowerCase().split(".").pop() || "";

  if (IMAGE_FORMATS.includes(extension)) {
    return 3; // 图片
  }

  if (VIDEO_FORMATS.includes(extension)) {
    return 43; // 视频
  }

  // 其他格式默认为文件
  return 49; // 文件
};

const InputToolbar = React.memo(
  ({
    isAiAssist,
    isAiTakeover,
    isLoadingAiChat,
    onEmojiSelect,
    onFileUploaded,
    onAudioUploaded,
    onOpenMap,
    onManualTriggerAi,
    onOpenChatRecord,
  }: {
    isAiAssist: boolean;
    isAiTakeover: boolean;
    isLoadingAiChat: boolean;
    onEmojiSelect: (emoji: EmojiInfo) => void;
    onFileUploaded: (
      filePath: { url: string; name: string; durationMs?: number },
      fileType: number,
    ) => void;
    onAudioUploaded: (audioData: {
      name: string;
      url: string;
      durationMs?: number;
    }) => void;
    onOpenMap: () => void;
    onManualTriggerAi: () => void;
    onOpenChatRecord: () => void;
  }) => {
    return (
      <div className={styles.inputToolbar}>
        <div className={styles.leftTool}>
          <EmojiPicker onEmojiSelect={onEmojiSelect} />
          <SimpleFileUpload
            onFileUploaded={fileInfo => onFileUploaded(fileInfo, FileType.FILE)}
            maxSize={10}
            type={4}
            slot={
              <Button
                className={styles.toolbarButton}
                type="text"
                icon={<FolderOutlined />}
              />
            }
          />
          <SimpleFileUpload
            onFileUploaded={fileInfo =>
              onFileUploaded(fileInfo, FileType.IMAGE)
            }
            maxSize={10}
            type={1}
            slot={
              <Button
                className={styles.toolbarButton}
                type="text"
                icon={<PictureOutlined />}
              />
            }
          />

          <AudioRecorder
            onAudioUploaded={onAudioUploaded}
            className={styles.toolbarButton}
          />
          <Button
            className={styles.toolbarButton}
            type="text"
            icon={<EnvironmentOutlined />}
            onClick={onOpenMap}
          />

          {/* AI模式下显示重新生成按钮 */}
          {(isAiAssist || isAiTakeover) && (
            <Tooltip title="重新生成AI回复">
              <Button
                className={styles.toolbarButton}
                type="text"
                icon={<ReloadOutlined />}
                onClick={onManualTriggerAi}
                disabled={isLoadingAiChat}
              />
            </Tooltip>
          )}
        </div>
        <div className={styles.rightTool}>
          <ToContract className={styles.rightToolItem} />
          <div
            style={{
              fontSize: "12px",
              cursor: "pointer",
              color: "#666",
            }}
            onClick={onOpenChatRecord}
          >
            <MessageOutlined />
            &nbsp;聊天记录
          </div>
        </div>
      </div>
    );
  },
);

InputToolbar.displayName = "InputToolbar";

const MemoSelectMap: React.FC<React.ComponentProps<typeof SelectMap>> =
  React.memo(props => <SelectMap {...props} />);

MemoSelectMap.displayName = "MemoSelectMap";

const MessageEnterComponent: React.FC<MessageEnterProps> = ({ contract }) => {
  const [inputValue, setInputValue] = useState("");
  // ✅ 使用 useRef 存储 inputValue，避免 handleSend 依赖变化
  const inputValueRef = useRef(inputValue);

  // 同步 inputValue 到 ref
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  // ✅ 使用优化的 selector（合并多个 selector，减少重渲染）
  const { EnterModule, showChatRecordModel } = useUIStateSelectors();
  const { isLoadingAiChat, quoteMessageContent, aiQuoteMessageContent } =
    useAISelectors();

  const {
    updateShowCheckbox,
    updateEnterModule,
    addMessage,
    updateShowChatRecordModel,
    updateIsLoadingAiChat,
    updateQuoteMessageContent,
  } = useWeChatActions();

  const setTransmitModal = useContactStore(state => state.setTransmitModal);

  // 判断接待类型
  const isAiAssist = aiQuoteMessageContent === 1; // AI辅助
  const isAiTakeover = aiQuoteMessageContent === 2; // AI接管

  // 取消AI生成
  const handleCancelAi = useCallback(() => {
    clearAiRequestQueue("用户手动取消");
    updateIsLoadingAiChat(false);
    updateQuoteMessageContent("");
    message.info("已取消AI生成");
  }, [updateIsLoadingAiChat, updateQuoteMessageContent]);

  // 监听输入框变化 - 用户开始输入时取消AI
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // 如果用户开始输入（且不是AI填充的内容），取消AI请求
      if (newValue && newValue !== quoteMessageContent && isLoadingAiChat) {
        console.log("👤 用户开始输入，取消AI生成");
        clearAiRequestQueue("用户开始输入");
        updateIsLoadingAiChat(false);
        updateQuoteMessageContent("");
      }
    },
    [
      isLoadingAiChat,
      quoteMessageContent,
      updateIsLoadingAiChat,
      updateQuoteMessageContent,
    ],
  );

  // 手动触发AI生成
  const handleManualTriggerAi = useCallback(async () => {
    const success = await manualTriggerAi();
    if (success) {
      message.success("AI正在生成回复...");
    } else {
      message.warning("无法生成AI回复，请检查消息记录");
    }
  }, []);

  // ✅ 发送消息（使用 useRef 避免依赖 inputValue，减少函数重新创建）
  const handleSend = useCallback(
    async (content?: string) => {
      const messageContent = content || inputValueRef.current; // 优先使用传入的内容，否则使用 ref

      if (!messageContent || !messageContent.trim()) {
        console.warn("消息内容为空，取消发送");
        return;
      }

      // 用户主动发送消息时，取消AI请求
      if (!content && isLoadingAiChat) {
        console.log("👤 用户主动发送消息，取消AI生成");
        clearAiRequestQueue("用户主动发送");
        updateIsLoadingAiChat(false);
      }

      console.log("handleSend", messageContent);
      const messageId = +Date.now();
      // 构造本地消息对象
      const localMessage: ChatRecord = {
        id: messageId, // 使用时间戳作为临时ID
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: contract?.chatroomId ? 0 : contract.id,
        wechatChatroomId: contract?.chatroomId ? contract.id : 0,
        tenantId: 0,
        accountId: 0,
        synergyAccountId: 0,
        content: messageContent,
        msgType: 1,
        msgSubType: 0,
        msgSvrId: "",
        isSend: true, // 标记为发送中
        createTime: new Date().toISOString(),
        isDeleted: false,
        deleteTime: "",
        sendStatus: 1,
        wechatTime: Date.now(),
        origin: 0,
        msgId: 0,
        recalled: false,
        seq: messageId,
      };
      // 先插入本地数据
      addMessage(localMessage);

      // 再发送消息到服务器
      const params = {
        wechatAccountId: contract.wechatAccountId,
        wechatChatroomId: contract?.chatroomId ? contract.id : 0,
        wechatFriendId: contract?.chatroomId ? 0 : contract.id,
        msgSubType: 0,
        msgType: 1,
        content: messageContent,
        seq: messageId,
      };
      sendCommand("CmdSendMessage", params);

      // 清空输入框和AI回复内容
      setInputValue("");
      updateQuoteMessageContent("");
    },
    [
      addMessage,
      contract.id,
      contract.wechatAccountId,
      contract?.chatroomId,
      // ✅ 移除 inputValue 依赖，使用 ref 代替
      isLoadingAiChat,
      updateIsLoadingAiChat,
      updateQuoteMessageContent,
    ],
  );

  // AI 消息处理 - 只处理AI辅助模式
  // AI接管模式已经在weChat.ts中直接发送，不经过此组件
  // 快捷语填充：当 quoteMessageContent 更新时，填充到输入框
  useEffect(() => {
    if (quoteMessageContent) {
      // AI辅助模式 & 快捷语模式：都直接填充输入框
      setInputValue(quoteMessageContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteMessageContent, aiQuoteMessageContent, isAiAssist]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 中文等输入法候选阶段，忽略 Enter，避免误触发送和卡顿感
      if ((e.nativeEvent as any).isComposing) {
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        handleSend();
      }
      // Ctrl+Enter 换行由浏览器原生 textarea 处理，不需要阻止默认行为
    },
    [handleSend],
  );

  // 处理表情选择
  const handleEmojiSelect = useCallback((emoji: EmojiInfo) => {
    setInputValue(prevValue => prevValue + `[${emoji.name}]`);
  }, []);

  const handleFileUploaded = useCallback(
    (
      filePath: { url: string; name: string; durationMs?: number },
      fileType: number,
    ) => {
      console.log("handleFileUploaded: ", fileType, filePath);

      // msgType(1:文本 3:图片 43:视频 47:动图表情包（gif、其他表情包） 49:小程序/其他：图文、文件)
      let msgType = 1;
      let content: any = "";
      if ([FileType.TEXT].includes(fileType)) {
        msgType = getMsgTypeByFileFormat(filePath.url);
      } else if ([FileType.IMAGE].includes(fileType)) {
        msgType = 3;
        content = filePath.url;
      } else if ([FileType.AUDIO].includes(fileType)) {
        msgType = 34;
        content = JSON.stringify({
          url: filePath.url,
          durationMs: filePath.durationMs,
        });
      } else if ([FileType.FILE].includes(fileType)) {
        msgType = getMsgTypeByFileFormat(filePath.url);
        if (msgType === 3) {
          content = filePath.url;
        }
        if (msgType === 43) {
          content = filePath.url;
        }

        if (msgType === 49) {
          content = JSON.stringify({
            type: "file",
            title: filePath.name,
            url: filePath.url,
          });
        }
      }
      const messageId = +Date.now();

      const params = {
        wechatAccountId: contract.wechatAccountId,
        wechatChatroomId: contract?.chatroomId ? contract.id : 0,
        wechatFriendId: contract?.chatroomId ? 0 : contract.id,
        msgSubType: 0,
        msgType,
        content: content,
        seq: messageId,
      };

      // 构造本地消息对象
      const localMessage: ChatRecord = {
        id: messageId, // 使用时间戳作为临时ID
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: contract?.chatroomId ? 0 : contract.id,
        wechatChatroomId: contract?.chatroomId ? contract.id : 0,
        tenantId: 0,
        accountId: 0,
        synergyAccountId: 0,
        content: params.content,
        msgType: msgType,
        msgSubType: 0,
        msgSvrId: "",
        isSend: true, // 标记为发送中
        createTime: new Date().toISOString(),
        isDeleted: false,
        deleteTime: "",
        sendStatus: 1,
        wechatTime: Date.now(),
        origin: 0,
        msgId: 0,
        recalled: false,
        seq: messageId,
      };
      // 先插入本地数据
      addMessage(localMessage);

      sendCommand("CmdSendMessage", params);
    },
    [addMessage, contract.wechatAccountId, contract.chatroomId, contract.id],
  );

  const handleCancelAction = useCallback(() => {
    if (!EnterModule) return;
    updateShowCheckbox(false);
    updateEnterModule("common");
  }, [EnterModule, updateShowCheckbox, updateEnterModule]);

  const handTurnRignt = useCallback(() => {
    setTransmitModal(true);
  }, [setTransmitModal]);

  const openChatRecordModel = useCallback(() => {
    updateShowChatRecordModel(!showChatRecordModel);
  }, [showChatRecordModel, updateShowChatRecordModel]);

  const [mapVisible, setMapVisible] = useState(false);

  const handleOpenMap = useCallback(() => {
    setMapVisible(true);
  }, []);

  const handleAudioUploaded = useCallback(
    (audioData: { name: string; url: string; durationMs?: number }) => {
      handleFileUploaded(
        {
          name: audioData.name,
          url: audioData.url,
          durationMs: audioData.durationMs,
        },
        FileType.AUDIO,
      );
    },
    [handleFileUploaded],
  );

  return (
    <>
      {/* 聊天输入 */}
      <Footer className={styles.chatFooter}>
        {isLoadingAiChat ? (
          <div className={styles.aiLoadingContainer}>
            <div className={styles.aiLoadingContent}>
              <div className={styles.aiLoadingIcon}>
                {/* WiFi式波纹 - 左侧 */}
                <div className={styles.waveLeft}>
                  <div className={styles.wave1}></div>
                  <div className={styles.wave2}></div>
                  <div className={styles.wave3}></div>
                </div>

                {/* 中心大脑图标 */}
                <div className={styles.brainIcon}>🧠</div>

                {/* WiFi式波纹 - 右侧 */}
                <div className={styles.waveRight}>
                  <div className={styles.wave1}></div>
                  <div className={styles.wave2}></div>
                  <div className={styles.wave3}></div>
                </div>
              </div>
              <div className={styles.aiLoadingTextRow}>
                <div className={styles.aiLoadingText}>
                  <span className={styles.loadingTextMain}>AI 正在思考</span>
                  <span className={styles.loadingDots}>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
                <Button
                  className={styles.cancelAiButton}
                  onClick={handleCancelAi}
                  size="small"
                  icon={<CloseOutlined />}
                >
                  取消生成
                </Button>
              </div>
              <div className={styles.aiLoadingSubText}>
                正在分析消息内容，为您生成智能回复
              </div>
            </div>
          </div>
        ) : (
          <>
            {["common"].includes(EnterModule) && (
              <div className={styles.inputContainer}>
                <InputToolbar
                  isAiAssist={isAiAssist}
                  isAiTakeover={isAiTakeover}
                  isLoadingAiChat={isLoadingAiChat}
                  onEmojiSelect={handleEmojiSelect}
                  onFileUploaded={handleFileUploaded}
                  onAudioUploaded={handleAudioUploaded}
                  onOpenMap={handleOpenMap}
                  onManualTriggerAi={handleManualTriggerAi}
                  onOpenChatRecord={openChatRecordModel}
                />

                <div className={styles.inputArea}>
                  <div className={styles.inputWrapper}>
                    <textarea
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      placeholder="输入消息..."
                      className={styles.messageInput}
                      rows={2}
                    />

                    <div className={styles.sendButtonArea}>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim()}
                        className={styles.sendButton}
                      >
                        发送
                      </Button>
                    </div>
                  </div>
                </div>

                <div className={styles.inputHint}>
                  按下Ctrl+Enter换行，Enter发送
                </div>
              </div>
            )}
            {["multipleForwarding"].includes(EnterModule) && (
              <div className={styles.multipleForwardingBar}>
                <div className={styles.actionButton} onClick={handTurnRignt}>
                  <ExportOutlined className={styles.actionIcon} />
                  <span className={styles.actionText}>转发</span>
                </div>

                <div
                  className={styles.actionButton}
                  onClick={handleCancelAction}
                >
                  <CloseOutlined className={styles.actionIcon} />
                  <span className={styles.actionText}>取消</span>
                </div>
              </div>
            )}
          </>
        )}
      </Footer>
      <MemoSelectMap
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        contract={contract}
        addMessage={addMessage}
      />
    </>
  );
};

// ✅ 使用 React.memo 优化 MessageEnter 组件，避免不必要的重渲染
const MessageEnter = React.memo(
  MessageEnterComponent,
  (prev, next) => {
    // 只有当联系人 ID 变化时才重新渲染
    return prev.contract.id === next.contract.id;
  },
);

MessageEnter.displayName = "MessageEnter";

export default MessageEnter;
