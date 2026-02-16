"use client";

import React, { useCallback, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Switch,
  message as antdMessage,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  PictureOutlined,
  FileOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import type { CheckboxChangeEvent } from "antd/es/checkbox";

import styles from "./index.module.scss";
import { ContactItem, ScriptGroup, MessageItem } from "../../types";
import InputMessage from "./InputMessage/InputMessage";
import ContentLibrarySelector from "./ContentLibrarySelector";
import type { ContentItem } from "@/components/ContentSelection/data";
import {
  createContentLibrary,
  deleteContentLibrary,
  aiEditContent,
  type CreateContentLibraryParams,
} from "./api";

interface StepSendMessageProps {
  selectedAccounts: any[];
  selectedContacts: ContactItem[];
  targetLabel: string;
  messageContent: string;
  onMessageContentChange: (value: string) => void;
  aiRewriteEnabled: boolean;
  onAiRewriteToggle: (value: boolean) => void;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  currentScriptMessages: string[];
  onCurrentScriptMessagesChange: (messages: string[]) => void;
  currentScriptName: string;
  onCurrentScriptNameChange: (value: string) => void;
  savedScriptGroups: ScriptGroup[];
  onSavedScriptGroupsChange: (groups: ScriptGroup[]) => void;
  selectedScriptGroupIds: string[];
  onSelectedScriptGroupIdsChange: (ids: string[]) => void;
  selectedContentLibraries: ContentItem[];
  onSelectedContentLibrariesChange: (items: ContentItem[]) => void;
}

const StepSendMessage: React.FC<StepSendMessageProps> = ({
  selectedAccounts,
  selectedContacts,
  targetLabel,
  messageContent,
  onMessageContentChange,
  aiRewriteEnabled,
  onAiRewriteToggle,
  aiPrompt,
  onAiPromptChange,
  currentScriptMessages,
  onCurrentScriptMessagesChange,
  currentScriptName,
  onCurrentScriptNameChange,
  savedScriptGroups,
  onSavedScriptGroupsChange,
  selectedScriptGroupIds,
  onSelectedScriptGroupIdsChange,
  selectedContentLibraries,
  onSelectedContentLibrariesChange,
}) => {
  const [savingScriptGroup, setSavingScriptGroup] = useState(false);
  const [aiRewriting, setAiRewriting] = useState(false);
  const [deletingGroupIds, setDeletingGroupIds] = useState<string[]>([]);
  const [aiRewriteModalVisible, setAiRewriteModalVisible] = useState(false);
  const [aiRewriteModalIndex, setAiRewriteModalIndex] = useState<number | null>(
    null,
  );
  const [aiRewriteModalPrompt, setAiRewriteModalPrompt] = useState("");
  const [aiRewritingMessage, setAiRewritingMessage] = useState(false);
  const [aiRewriteResult, setAiRewriteResult] = useState<string | null>(null);

  // 将 string[] 转换为 MessageItem[]
  const messagesToItems = useCallback((messages: string[]): MessageItem[] => {
    return messages.map(msg => {
      try {
        // 尝试解析为 JSON（新格式）
        const parsed = JSON.parse(msg);
        if (parsed && typeof parsed === "object" && "type" in parsed) {
          return parsed as MessageItem;
        }
      } catch {
        // 解析失败，作为文本消息处理
      }
      // 旧格式：纯文本
      return { type: "text", content: msg };
    });
  }, []);

  // 将 MessageItem[] 转换为 string[]
  const itemsToMessages = useCallback((items: MessageItem[]): string[] => {
    return items.map(item => {
      // 如果是纯文本消息，直接返回内容（保持向后兼容）
      if (item.type === "text" && !item.fileName) {
        return item.content;
      }
      // 其他类型序列化为 JSON
      return JSON.stringify(item);
    });
  }, []);

  // 内部维护的 MessageItem[] 状态
  const [messageItems, setMessageItems] = useState<MessageItem[]>(() =>
    messagesToItems(currentScriptMessages),
  );

  // 当 currentScriptMessages 变化时，同步更新 messageItems
  React.useEffect(() => {
    setMessageItems(messagesToItems(currentScriptMessages));
  }, [currentScriptMessages, messagesToItems]);

  const handleAddMessage = useCallback(
    (content?: string | MessageItem, showSuccess?: boolean) => {
      let newItem: MessageItem;
      if (typeof content === "string") {
        const finalContent = (content || messageContent).trim();
        if (!finalContent) {
          antdMessage.warning("请输入消息内容");
          return;
        }
        newItem = { type: "text", content: finalContent };
      } else if (content && typeof content === "object") {
        newItem = content;
      } else {
        const finalContent = messageContent.trim();
        if (!finalContent) {
          antdMessage.warning("请输入消息内容");
          return;
        }
        newItem = { type: "text", content: finalContent };
      }

      const newItems = [...messageItems, newItem];
      setMessageItems(newItems);
      onCurrentScriptMessagesChange(itemsToMessages(newItems));
      onMessageContentChange("");
      if (showSuccess) {
        antdMessage.success("已添加消息内容");
      }
    },
    [
      messageContent,
      messageItems,
      onCurrentScriptMessagesChange,
      onMessageContentChange,
      itemsToMessages,
    ],
  );

  const handleRemoveMessage = useCallback(
    (index: number) => {
      const next = messageItems.filter((_, idx) => idx !== index);
      setMessageItems(next);
      onCurrentScriptMessagesChange(itemsToMessages(next));
    },
    [messageItems, onCurrentScriptMessagesChange, itemsToMessages],
  );

  const handleSaveScriptGroup = useCallback(async () => {
    if (savingScriptGroup) {
      return;
    }
    if (messageItems.length === 0) {
      antdMessage.warning("请先添加消息内容");
      return;
    }
    const groupName =
      currentScriptName.trim() || `话术组${savedScriptGroups.length + 1}`;
    const messages = itemsToMessages(messageItems);
    const params: CreateContentLibraryParams = {
      name: groupName,
      sourceType: 1,
      keywordInclude: messages,
    };
    const trimmedPrompt = aiPrompt.trim();
    if (aiRewriteEnabled && trimmedPrompt) {
      params.aiPrompt = trimmedPrompt;
    }
    let hideLoading: ReturnType<typeof antdMessage.loading> | undefined;
    try {
      setSavingScriptGroup(true);
      hideLoading = antdMessage.loading("正在保存话术组...", 0);
      const response = await createContentLibrary(params);
      hideLoading?.();
      const responseId =
        response?.id ?? response?.data?.id ?? response?.libraryId;
      const newGroup: ScriptGroup = {
        id:
          responseId !== undefined
            ? String(responseId)
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: groupName,
        messages,
      };
      onSavedScriptGroupsChange([...savedScriptGroups, newGroup]);
      setMessageItems([]);
      onCurrentScriptMessagesChange([]);
      onCurrentScriptNameChange("");
      onMessageContentChange("");
      antdMessage.success("已保存为话术组");
    } catch (error) {
      hideLoading?.();
      console.error("保存话术组失败:", error);
      antdMessage.error("保存失败，请稍后重试");
    } finally {
      setSavingScriptGroup(false);
    }
  }, [
    aiPrompt,
    aiRewriteEnabled,
    messageItems,
    currentScriptName,
    onCurrentScriptMessagesChange,
    onCurrentScriptNameChange,
    onMessageContentChange,
    onSavedScriptGroupsChange,
    savedScriptGroups,
    savingScriptGroup,
    itemsToMessages,
  ]);

  const handleAiRewrite = useCallback(async () => {
    if (!aiRewriteEnabled) {
      antdMessage.warning("请先开启AI智能话术改写");
      return;
    }
    const trimmedPrompt = aiPrompt.trim();
    const originalContent = messageContent;
    const trimmedContent = originalContent.trim();
    if (!trimmedPrompt) {
      antdMessage.warning("请输入改写提示词");
      return;
    }
    if (!trimmedContent) {
      antdMessage.warning("请输入需要改写的内容");
      return;
    }
    if (aiRewriting) {
      return;
    }
    let hideLoading: ReturnType<typeof antdMessage.loading> | undefined;
    try {
      setAiRewriting(true);
      hideLoading = antdMessage.loading("AI正在改写话术...", 0);
      const response = await aiEditContent({
        aiPrompt: trimmedPrompt,
        content: originalContent,
      });
      hideLoading?.();
      const normalizedResponse = response as {
        content?: string;
        contentAfter?: string;
        contentFront?: string;
        data?:
          | string
          | {
              content?: string;
              contentAfter?: string;
              contentFront?: string;
            };
        result?: string;
      };
      const dataField = normalizedResponse?.data;
      const dataContent =
        typeof dataField === "string"
          ? dataField
          : (dataField?.content ?? undefined);
      const dataContentAfter =
        typeof dataField === "string" ? undefined : dataField?.contentAfter;
      const dataContentFront =
        typeof dataField === "string" ? undefined : dataField?.contentFront;

      const primaryAfter =
        normalizedResponse?.contentAfter ?? dataContentAfter ?? undefined;
      const primaryFront =
        normalizedResponse?.contentFront ?? dataContentFront ?? undefined;

      let rewrittenContent = "";
      if (typeof response === "string") {
        rewrittenContent = response;
      } else if (primaryAfter) {
        rewrittenContent = primaryFront
          ? `${primaryFront}\n${primaryAfter}`
          : primaryAfter;
      } else if (typeof normalizedResponse?.content === "string") {
        rewrittenContent = normalizedResponse.content;
      } else if (typeof dataContent === "string") {
        rewrittenContent = dataContent;
      } else if (typeof normalizedResponse?.result === "string") {
        rewrittenContent = normalizedResponse.result;
      } else if (primaryFront) {
        rewrittenContent = primaryFront;
      }
      if (!rewrittenContent || typeof rewrittenContent !== "string") {
        antdMessage.error("AI改写失败，请稍后重试");
        return;
      }
      onMessageContentChange(rewrittenContent.trim());
      antdMessage.success("AI改写完成，请确认内容");
    } catch (error) {
      hideLoading?.();
      console.error("AI改写失败:", error);
      antdMessage.error("AI改写失败，请稍后重试");
    } finally {
      setAiRewriting(false);
    }
  }, [
    aiPrompt,
    aiRewriting,
    aiRewriteEnabled,
    messageContent,
    onMessageContentChange,
  ]);

  const handleOpenAiRewriteModal = useCallback((index: number) => {
    setAiRewriteModalIndex(index);
    setAiRewriteModalPrompt("");
    setAiRewriteModalVisible(true);
  }, []);

  const handleCloseAiRewriteModal = useCallback(() => {
    setAiRewriteModalVisible(false);
    setAiRewriteModalIndex(null);
    setAiRewriteModalPrompt("");
    setAiRewriteResult(null);
  }, []);

  // 执行 AI 改写，获取结果但不立即应用
  const handleAiRewriteExecute = useCallback(async () => {
    if (aiRewriteModalIndex === null) {
      return;
    }
    const trimmedPrompt = aiRewriteModalPrompt.trim();
    if (!trimmedPrompt) {
      antdMessage.warning("请输入改写提示词");
      return;
    }
    const messageToRewrite = messageItems[aiRewriteModalIndex];
    if (!messageToRewrite) {
      antdMessage.error("消息不存在");
      return;
    }
    // AI改写只支持文本消息
    if (messageToRewrite.type !== "text") {
      antdMessage.warning("AI改写仅支持文本消息");
      return;
    }
    if (aiRewritingMessage) {
      return;
    }
    try {
      setAiRewritingMessage(true);
      const response = await aiEditContent({
        aiPrompt: trimmedPrompt,
        content: messageToRewrite.content,
      });
      const normalizedResponse = response as {
        content?: string;
        contentAfter?: string;
        contentFront?: string;
        data?:
          | string
          | {
              content?: string;
              contentAfter?: string;
              contentFront?: string;
            };
        result?: string;
      };
      const dataField = normalizedResponse?.data;
      const dataContent =
        typeof dataField === "string"
          ? dataField
          : (dataField?.content ?? undefined);
      const dataContentAfter =
        typeof dataField === "string" ? undefined : dataField?.contentAfter;
      const dataContentFront =
        typeof dataField === "string" ? undefined : dataField?.contentFront;

      const primaryAfter =
        normalizedResponse?.contentAfter ?? dataContentAfter ?? undefined;
      const primaryFront =
        normalizedResponse?.contentFront ?? dataContentFront ?? undefined;

      let rewrittenContent = "";
      if (typeof response === "string") {
        rewrittenContent = response;
      } else if (primaryAfter) {
        rewrittenContent = primaryFront
          ? `${primaryFront}\n${primaryAfter}`
          : primaryAfter;
      } else if (typeof normalizedResponse?.content === "string") {
        rewrittenContent = normalizedResponse.content;
      } else if (typeof dataContent === "string") {
        rewrittenContent = dataContent;
      } else if (typeof normalizedResponse?.result === "string") {
        rewrittenContent = normalizedResponse.result;
      } else if (primaryFront) {
        rewrittenContent = primaryFront;
      }
      if (!rewrittenContent || typeof rewrittenContent !== "string") {
        antdMessage.error("AI改写失败，请稍后重试");
        return;
      }
      setAiRewriteResult(rewrittenContent.trim());
    } catch (error) {
      console.error("AI改写失败:", error);
      antdMessage.error("AI改写失败，请稍后重试");
    } finally {
      setAiRewritingMessage(false);
    }
  }, [
    aiRewriteModalIndex,
    aiRewriteModalPrompt,
    messageItems,
    aiRewritingMessage,
  ]);

  // 确认并应用 AI 改写结果
  const handleConfirmAiRewrite = useCallback(() => {
    if (aiRewriteModalIndex === null || !aiRewriteResult) {
      return;
    }
    const messageToRewrite = messageItems[aiRewriteModalIndex];
    if (!messageToRewrite) {
      antdMessage.error("消息不存在");
      return;
    }
    const newItems = [...messageItems];
    newItems[aiRewriteModalIndex] = {
      ...messageToRewrite,
      content: aiRewriteResult,
    };
    setMessageItems(newItems);
    onCurrentScriptMessagesChange(itemsToMessages(newItems));
    handleCloseAiRewriteModal();
    antdMessage.success("AI改写完成");
  }, [
    aiRewriteModalIndex,
    aiRewriteResult,
    messageItems,
    onCurrentScriptMessagesChange,
    itemsToMessages,
    handleCloseAiRewriteModal,
  ]);

  const handleApplyGroup = useCallback(
    (group: ScriptGroup) => {
      onCurrentScriptMessagesChange(group.messages);
      onCurrentScriptNameChange(group.name);
      onMessageContentChange("");
      antdMessage.success("已加载话术组");
    },
    [
      onCurrentScriptMessagesChange,
      onCurrentScriptNameChange,
      onMessageContentChange,
    ],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      if (deletingGroupIds.includes(groupId)) {
        return;
      }
      const numericGroupId = Number(groupId);
      if (Number.isNaN(numericGroupId)) {
        antdMessage.error("无法删除：缺少有效的内容库ID");
        return;
      }
      let hideLoading: ReturnType<typeof antdMessage.loading> | undefined;
      try {
        setDeletingGroupIds(prev => [...prev, groupId]);
        hideLoading = antdMessage.loading("正在删除话术组...", 0);
        await deleteContentLibrary({ id: numericGroupId });
        hideLoading?.();
        const nextGroups = savedScriptGroups.filter(
          group => group.id !== groupId,
        );
        onSavedScriptGroupsChange(nextGroups);
        if (selectedScriptGroupIds.includes(groupId)) {
          const nextSelected = selectedScriptGroupIds.filter(
            id => id !== groupId,
          );
          onSelectedScriptGroupIdsChange(nextSelected);
        }
        antdMessage.success("已删除话术组");
      } catch (error) {
        hideLoading?.();
        console.error("删除话术组失败:", error);
        antdMessage.error("删除失败，请稍后重试");
      } finally {
        setDeletingGroupIds(prev =>
          prev.filter(deletingId => deletingId !== groupId),
        );
      }
    },
    [
      deletingGroupIds,
      onSavedScriptGroupsChange,
      onSelectedScriptGroupIdsChange,
      savedScriptGroups,
      selectedScriptGroupIds,
    ],
  );

  const handleSelectChange = useCallback(
    (groupId: string) => (event: CheckboxChangeEvent) => {
      const checked = event.target.checked;
      if (checked) {
        if (!selectedScriptGroupIds.includes(groupId)) {
          onSelectedScriptGroupIdsChange([...selectedScriptGroupIds, groupId]);
        }
      } else {
        onSelectedScriptGroupIdsChange(
          selectedScriptGroupIds.filter(id => id !== groupId),
        );
      }
    },
    [onSelectedScriptGroupIdsChange, selectedScriptGroupIds],
  );

  return (
    <div className={styles.stepContent}>
      <div className={styles.step3Content}>
        <div className={styles.leftColumn}>
          {/* 1. 模拟推送内容 */}
          <div className={styles.previewHeader}>
            <div className={styles.previewHeaderTitle}>模拟推送内容</div>
          </div>

          {/* 2. 消息列表 */}
          <div className={styles.messagePreview}>
            {messageItems.length === 0 ? (
              <div className={styles.messagePlaceholder}>
                开始添加消息内容...
              </div>
            ) : (
              <div className={styles.messageList}>
                {messageItems.map((msgItem, index) => (
                  <div className={styles.messageBubbleWrapper} key={index}>
                    <div className={styles.messageBubble}>
                      <div className={styles.messageAvatar}>
                        <UserOutlined />
                      </div>
                      <div className={styles.messageContent}>
                        <div className={styles.messageBubbleInner}>
                          {msgItem.type === "text" && (
                            <div className={styles.messageText}>
                              {msgItem.content}
                            </div>
                          )}
                          {msgItem.type === "image" && (
                            <div className={styles.messageMedia}>
                              <div className={styles.messageMediaIcon}>
                                <PictureOutlined />
                              </div>
                              <img
                                src={msgItem.content}
                                alt={msgItem.fileName || "图片"}
                                className={styles.messageImage}
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                              {msgItem.fileName && (
                                <div className={styles.messageFileName}>
                                  {msgItem.fileName}
                                </div>
                              )}
                            </div>
                          )}
                          {msgItem.type === "file" && (
                            <div className={styles.messageMedia}>
                              <div className={styles.messageMediaIcon}>
                                <FileOutlined />
                              </div>
                              <div className={styles.messageFileInfo}>
                                <div className={styles.messageFileName}>
                                  {msgItem.fileName || "文件"}
                                </div>
                                {msgItem.fileSize && (
                                  <div className={styles.messageFileSize}>
                                    {msgItem.fileSize >= 1024 * 1024
                                      ? `${(msgItem.fileSize / 1024 / 1024).toFixed(2)} MB`
                                      : `${(msgItem.fileSize / 1024).toFixed(2)} KB`}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {msgItem.type === "audio" && (
                            <div className={styles.messageMedia}>
                              <div className={styles.messageMediaIcon}>
                                <SoundOutlined />
                              </div>
                              <div className={styles.messageFileInfo}>
                                <div className={styles.messageFileName}>
                                  {msgItem.fileName || "语音消息"}
                                </div>
                                {msgItem.durationMs && (
                                  <div className={styles.messageFileSize}>
                                    {Math.floor(msgItem.durationMs / 1000)}秒
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className={styles.messageActions}>
                          {msgItem.type === "text" && (
                            <Button
                              type="text"
                              size="small"
                              icon={<ReloadOutlined />}
                              onClick={() => handleOpenAiRewriteModal(index)}
                              className={styles.aiRewriteButton}
                            >
                              AI改写
                            </Button>
                          )}
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveMessage(index)}
                            className={styles.messageAction}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 消息输入组件 */}
          <div className={styles.messageInputArea}>
            <InputMessage
              defaultValue={messageContent}
              onContentChange={onMessageContentChange}
              onSend={value => handleAddMessage(value)}
              onAddMessage={message => handleAddMessage(message)}
              clearOnSend
              placeholder="请输入内容"
              hint={`按ENTER发送，按住CTRL+ENTER换行，已配置${savedScriptGroups.length}个话术组，已选择${selectedScriptGroupIds.length}个进行推送，已选${selectedContentLibraries.length}个内容库`}
            />
          </div>

          {/* 4. 话术组标题 */}
          <div className={styles.scriptNameInput}>
            <Input
              placeholder="话术组名称（可选）"
              value={currentScriptName}
              onChange={event => onCurrentScriptNameChange(event.target.value)}
            />
          </div>

          {/* 5. 创建话术组按钮 */}
          <div className={styles.createScriptGroupButton}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleSaveScriptGroup}
              disabled={currentScriptMessages.length === 0 || savingScriptGroup}
              loading={savingScriptGroup}
              block
            >
              创建为话术组
            </Button>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.pushContentHeader}>
            <div className={styles.pushContentTitle}>推送内容</div>
            <ContentLibrarySelector
              selectedContentLibraries={selectedContentLibraries}
              onSelectedContentLibrariesChange={
                onSelectedContentLibrariesChange
              }
            />
          </div>
          <div className={styles.savedScriptGroups}>
            <div className={styles.scriptGroupHeaderRow}>
              <div className={styles.scriptGroupTitle}>
                已保存话术组 ({savedScriptGroups.length})
              </div>
              <div className={styles.scriptGroupHint}>勾选后将随机均分推送</div>
            </div>
            <div className={styles.scriptGroupList}>
              {savedScriptGroups.length === 0 ? (
                <div className={styles.emptyGroup}>暂无已保存话术组</div>
              ) : (
                savedScriptGroups.map((group, index) => (
                  <div className={styles.scriptGroupItem} key={group.id}>
                    <div className={styles.scriptGroupHeader}>
                      <div className={styles.scriptGroupLeft}>
                        <Checkbox
                          checked={selectedScriptGroupIds.includes(group.id)}
                          onChange={handleSelectChange(group.id)}
                        />
                        <div className={styles.scriptGroupInfo}>
                          <div className={styles.scriptGroupName}>
                            {group.name || `话术组${index + 1}`}
                          </div>
                          <div className={styles.messageCount}>
                            {group.messages.length}条消息
                          </div>
                        </div>
                      </div>
                      <div className={styles.scriptGroupActions}>
                        <Button
                          type="text"
                          icon={<CopyOutlined />}
                          className={styles.actionButton}
                          onClick={() => handleApplyGroup(group)}
                        />
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          className={styles.actionButton}
                          onClick={() => handleDeleteGroup(group.id)}
                          loading={deletingGroupIds.includes(group.id)}
                          disabled={deletingGroupIds.includes(group.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI改写弹窗 */}
      <Modal
        title={
          <div className={styles.aiRewriteModalTitle}>
            <span className={styles.aiRewriteModalTitleIcon}>✨</span>
            <span>AI智能改写</span>
          </div>
        }
        open={aiRewriteModalVisible}
        onCancel={handleCloseAiRewriteModal}
        width={680}
        footer={[
          <Button key="cancel" onClick={handleCloseAiRewriteModal}>
            取消
          </Button>,
          <Button
            key="execute"
            type="primary"
            className={styles.aiRewriteExecuteButton}
            loading={aiRewritingMessage}
            onClick={handleAiRewriteExecute}
            disabled={!aiRewriteModalPrompt.trim()}
          >
            AI改写
          </Button>,
          <Button
            key="confirm"
            type="primary"
            className={styles.confirmButton}
            onClick={handleConfirmAiRewrite}
            disabled={!aiRewriteResult || aiRewritingMessage}
          >
            确认改写
          </Button>,
        ]}
        className={styles.aiRewriteModal}
        wrapClassName={styles.aiRewriteModalWrap}
      >
        <div className={styles.aiRewriteModalContent}>
          {/* 原文和结果对比区域 */}
          <div className={styles.aiRewriteModalCompareSection}>
            {/* 原消息内容区域 */}
            {aiRewriteModalIndex !== null && (
              <div className={styles.aiRewriteModalSection}>
                <div className={styles.aiRewriteModalSectionHeader}>
                  <span className={styles.aiRewriteModalSectionIcon}>📝</span>
                  <span className={styles.aiRewriteModalLabel}>
                    1原消息内容
                  </span>
                </div>
                <div className={styles.aiRewriteModalOriginalText}>
                  {messageItems[aiRewriteModalIndex]?.type === "text"
                    ? messageItems[aiRewriteModalIndex].content
                    : "非文本消息不支持AI改写"}
                </div>
              </div>
            )}

            {/* Loading 状态 */}
            {aiRewritingMessage && (
              <div className={styles.aiRewriteModalLoading}>
                <div className={styles.aiRewriteModalLoadingIcon}>⏳</div>
                <div className={styles.aiRewriteModalLoadingText}>
                  AI正在改写中，请稍候...
                </div>
              </div>
            )}

            {/* 分隔线 */}
            {aiRewriteModalIndex !== null && aiRewriteResult && (
              <div className={styles.aiRewriteModalDivider} />
            )}

            {/* 改写结果区域 */}
            {aiRewriteResult && (
              <div className={styles.aiRewriteModalSection}>
                <div className={styles.aiRewriteModalSectionHeader}>
                  <span className={styles.aiRewriteModalSectionIcon}>✨</span>
                  <span className={styles.aiRewriteModalLabel}>改写结果</span>
                </div>
                <div className={styles.aiRewriteModalResultText}>
                  {aiRewriteResult}
                </div>
              </div>
            )}
          </div>

          {/* 提示词输入区域 - 放在最下面 */}
          <div className={styles.aiRewriteModalSection}>
            <div className={styles.aiRewriteModalSectionHeader}>
              <span className={styles.aiRewriteModalSectionIcon}>💡</span>
              <span className={styles.aiRewriteModalLabel}>改写提示词</span>
            </div>
            <Input.TextArea
              placeholder="默认提示词为： 1、原本的字数和意思不要修改超过10%  2、出现品牌名或个人名字就去除。"
              value={aiRewriteModalPrompt}
              onChange={event => setAiRewriteModalPrompt(event.target.value)}
              rows={3}
              autoFocus
              disabled={aiRewritingMessage}
              className={styles.aiRewriteModalTextArea}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StepSendMessage;
