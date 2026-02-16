import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Input,
  Button,
  Avatar,
  Checkbox,
  Empty,
  Spin,
  message,
  Pagination,
  Slider,
  Select,
  Switch,
} from "antd";
import {
  SearchOutlined,
  CloseOutlined,
  UserOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import styles from "./PushTaskModal.module.scss";
import { useCustomerStore } from "@/store/module/weChat/customer";
import { getContactList, getGroupList } from "@/pages/pc/ckbox/weChat/api";

const DEFAULT_FRIEND_INTERVAL: [number, number] = [3, 10];
const DEFAULT_MESSAGE_INTERVAL: [number, number] = [1, 3];

export type PushType =
  | "friend-message"
  | "group-message"
  | "group-announcement";

interface PushTaskModalProps {
  visible: boolean;
  pushType: PushType;
  onCancel: () => void;
  onConfirm?: () => void;
}

interface WeChatAccount {
  id: number;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  wechatId?: string;
}

interface ContactItem {
  id: number;
  nickname: string;
  avatar?: string;
  conRemark?: string;
  wechatId?: string;
  gender?: number;
  region?: string;
  type?: "friend" | "group";
}

const PushTaskModal: React.FC<PushTaskModalProps> = ({
  visible,
  pushType,
  onCancel,
  onConfirm,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<ContactItem[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [friendInterval, setFriendInterval] = useState<[number, number]>([
    ...DEFAULT_FRIEND_INTERVAL,
  ]);
  const [messageInterval, setMessageInterval] = useState<[number, number]>([
    ...DEFAULT_MESSAGE_INTERVAL,
  ]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [aiRewriteEnabled, setAiRewriteEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // 步骤2数据
  const [contactsData, setContactsData] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [step2Page, setStep2Page] = useState(1);
  const [step2SearchValue, setStep2SearchValue] = useState("");
  const step2PageSize = 20;

  const customerList = useCustomerStore(state => state.customerList);

  // 获取标题和描述
  const getTitle = () => {
    switch (pushType) {
      case "friend-message":
        return "好友消息推送";
      case "group-message":
        return "群消息推送";
      case "group-announcement":
        return "群公告推送";
      default:
        return "消息推送";
    }
  };

  const getSubtitle = () => {
    return "智能批量推送，AI智能话术改写";
  };

  // 步骤2的标题
  const getStep2Title = () => {
    switch (pushType) {
      case "friend-message":
        return "选择好友";
      case "group-message":
      case "group-announcement":
        return "选择群";
      default:
        return "选择";
    }
  };

  // 重置状态
  const handleClose = () => {
    setCurrentStep(1);
    setSearchKeyword("");
    setSelectedAccounts([]);
    setSelectedContacts([]);
    setMessageContent("");
    setFriendInterval([...DEFAULT_FRIEND_INTERVAL]);
    setMessageInterval([...DEFAULT_MESSAGE_INTERVAL]);
    setSelectedTag("");
    setAiRewriteEnabled(false);
    setAiPrompt("");
    setStep2Page(1);
    setStep2SearchValue("");
    setContactsData([]);
    onCancel();
  };

  // 步骤1：过滤微信账号
  const filteredAccounts = useMemo(() => {
    if (!searchKeyword.trim()) return customerList;
    const keyword = searchKeyword.toLowerCase();
    return customerList.filter(
      account =>
        (account.nickname || "").toLowerCase().includes(keyword) ||
        (account.wechatId || "").toLowerCase().includes(keyword),
    );
  }, [customerList, searchKeyword]);

  // 步骤1：切换账号选择
  const handleAccountToggle = (account: any) => {
    setSelectedAccounts(prev => {
      const isSelected = prev.some(a => a.id === account.id);
      if (isSelected) {
        return prev.filter(a => a.id !== account.id);
      }
      return [...prev, account];
    });
  };

  // 步骤1：全选/取消全选
  const handleSelectAll = () => {
    if (selectedAccounts.length === filteredAccounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts([...filteredAccounts]);
    }
  };

  // 步骤2：加载好友/群数据
  const loadStep2Data = async () => {
    if (selectedAccounts.length === 0) return;

    setLoadingContacts(true);
    try {
      const accountIds = selectedAccounts.map(a => a.id);
      const params: any = {
        page: step2Page,
        limit: step2PageSize,
      };

      if (step2SearchValue.trim()) {
        params.keyword = step2SearchValue.trim();
      }

      let response;
      if (pushType === "friend-message") {
        // 好友消息推送：获取好友列表
        response = await getContactList(params);
      } else {
        // 群消息推送/群公告推送：获取群列表
        response = await getGroupList(params);
      }

      const data = response.data || response.list || [];
      setContactsData(data);
    } catch (error) {
      console.error("加载数据失败:", error);
      message.error("加载数据失败");
    } finally {
      setLoadingContacts(false);
    }
  };

  // 步骤2：当进入步骤2时加载数据
  useEffect(() => {
    if (currentStep === 2 && selectedAccounts.length > 0) {
      loadStep2Data();
    }
  }, [currentStep, selectedAccounts, step2Page, step2SearchValue, pushType]);

  // 步骤2：过滤联系人
  const filteredContacts = useMemo(() => {
    if (!step2SearchValue.trim()) return contactsData;
    const keyword = step2SearchValue.toLowerCase();
    return contactsData.filter(
      contact =>
        contact.nickname?.toLowerCase().includes(keyword) ||
        contact.conRemark?.toLowerCase().includes(keyword) ||
        contact.wechatId?.toLowerCase().includes(keyword),
    );
  }, [contactsData, step2SearchValue]);

  // 步骤2：分页显示
  const paginatedContacts = useMemo(() => {
    const start = (step2Page - 1) * step2PageSize;
    const end = start + step2PageSize;
    return filteredContacts.slice(start, end);
  }, [filteredContacts, step2Page]);

  // 步骤2：切换联系人选择
  const handleContactToggle = (contact: ContactItem) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      }
      return [...prev, contact];
    });
  };

  // 步骤2：移除已选联系人
  const handleRemoveContact = (contactId: number) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  // 步骤2：全选当前页
  const handleSelectAllContacts = () => {
    if (paginatedContacts.length === 0) return;
    const allSelected = paginatedContacts.every(contact =>
      selectedContacts.some(c => c.id === contact.id),
    );
    if (allSelected) {
      // 取消全选当前页
      const currentPageIds = paginatedContacts.map(c => c.id);
      setSelectedContacts(prev =>
        prev.filter(c => !currentPageIds.includes(c.id)),
      );
    } else {
      // 全选当前页
      const toAdd = paginatedContacts.filter(
        contact => !selectedContacts.some(c => c.id === contact.id),
      );
      setSelectedContacts(prev => [...prev, ...toAdd]);
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedAccounts.length === 0) {
        message.warning("请至少选择一个微信账号");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedContacts.length === 0) {
        message.warning(
          `请至少选择一个${pushType === "friend-message" ? "好友" : "群"}`,
        );
        return;
      }
      setCurrentStep(3);
    }
  };

  // 上一步
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 发送
  const handleSend = () => {
    if (!messageContent.trim()) {
      message.warning("请输入消息内容");
      return;
    }
    // TODO: 实现发送逻辑
    console.log("发送推送", {
      pushType,
      accounts: selectedAccounts,
      contacts: selectedContacts,
      messageContent,
      friendInterval,
      messageInterval,
      selectedTag,
      aiRewriteEnabled,
      aiPrompt,
    });
    message.success("推送任务已创建");
    handleClose();
    if (onConfirm) onConfirm();
  };

  // 渲染步骤1：选择微信账号
  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>选择微信账号</h3>
        <p>可选择多个微信账号进行推送</p>
      </div>
      <div className={styles.searchBar}>
        <Input
          placeholder="请输入昵称/微信号进行搜索"
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          allowClear
        />
      </div>
      <div className={styles.accountSelection}>
        <div className={styles.selectionControls}>
          <Checkbox
            checked={
              filteredAccounts.length > 0 &&
              selectedAccounts.length === filteredAccounts.length
            }
            indeterminate={
              selectedAccounts.length > 0 &&
              selectedAccounts.length < filteredAccounts.length
            }
            onChange={handleSelectAll}
            disabled={filteredAccounts.length === 0}
          >
            全选
          </Checkbox>
        </div>
        <div className={styles.accountCards}>
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map(account => {
              const isSelected = selectedAccounts.some(
                a => a.id === account.id,
              );
              return (
                <div
                  key={account.id}
                  className={`${styles.accountCard} ${isSelected ? styles.selected : ""}`}
                  onClick={() => handleAccountToggle(account)}
                >
                  <Avatar
                    src={account.avatar}
                    size={48}
                    style={{ backgroundColor: "#1890ff" }}
                  >
                    {!account.avatar &&
                      (account.nickname || account.name || "").charAt(0)}
                  </Avatar>
                  <div className={styles.cardName}>
                    {account.nickname || account.name || "未知"}
                  </div>
                  <div
                    className={`${styles.onlineStatus} ${account.isOnline ? styles.online : styles.offline}`}
                  >
                    {account.isOnline ? "在线" : "离线"}
                  </div>
                  {isSelected && (
                    <CheckCircleOutlined className={styles.checkmark} />
                  )}
                </div>
              );
            })
          ) : (
            <Empty
              description={searchKeyword ? "未找到匹配的账号" : "暂无微信账号"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </div>
    </div>
  );

  // 渲染步骤2：选择好友/群
  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <div className={styles.step2Content}>
        <div className={styles.searchContainer}>
          <Input
            placeholder="筛选好友"
            prefix={<SearchOutlined />}
            value={step2SearchValue}
            onChange={e => setStep2SearchValue(e.target.value)}
            allowClear
          />
          <Button onClick={handleSelectAllContacts}>全选</Button>
        </div>
        <div className={styles.contentBody}>
          {/* 左侧：好友/群列表 */}
          <div className={styles.contactList}>
            <div className={styles.listHeader}>
              <span>
                {getStep2Title()}列表(共{filteredContacts.length}个)
              </span>
            </div>
            <div className={styles.listContent}>
              {loadingContacts ? (
                <div className={styles.loadingContainer}>
                  <Spin size="large" />
                  <span>加载中...</span>
                </div>
              ) : paginatedContacts.length > 0 ? (
                paginatedContacts.map(contact => {
                  const isSelected = selectedContacts.some(
                    c => c.id === contact.id,
                  );
                  return (
                    <div
                      key={contact.id}
                      className={`${styles.contactItem} ${isSelected ? styles.selected : ""}`}
                      onClick={() => handleContactToggle(contact)}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar
                        src={contact.avatar}
                        size={40}
                        icon={
                          contact.type === "group" ? (
                            <TeamOutlined />
                          ) : (
                            <UserOutlined />
                          )
                        }
                      />
                      <div className={styles.contactInfo}>
                        <div className={styles.contactName}>
                          {contact.nickname}
                        </div>
                        {contact.conRemark && (
                          <div className={styles.conRemark}>
                            {contact.conRemark}
                          </div>
                        )}
                      </div>
                      {contact.type === "group" && (
                        <TeamOutlined className={styles.groupIcon} />
                      )}
                    </div>
                  );
                })
              ) : (
                <Empty
                  description={
                    step2SearchValue
                      ? "未找到匹配的" + getStep2Title()
                      : "暂无" + getStep2Title()
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
            {filteredContacts.length > 0 && (
              <div className={styles.paginationContainer}>
                <Pagination
                  size="small"
                  current={step2Page}
                  pageSize={step2PageSize}
                  total={filteredContacts.length}
                  onChange={p => setStep2Page(p)}
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>

          {/* 右侧：已选列表 */}
          <div className={styles.selectedList}>
            <div className={styles.listHeader}>
              <span>
                已选{getStep2Title()}列表(共{selectedContacts.length}个)
              </span>
              {selectedContacts.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setSelectedContacts([])}
                >
                  全取消
                </Button>
              )}
            </div>
            <div className={styles.listContent}>
              {selectedContacts.length > 0 ? (
                selectedContacts.map(contact => (
                  <div key={contact.id} className={styles.selectedItem}>
                    <div className={styles.contactInfo}>
                      <Avatar
                        src={contact.avatar}
                        size={40}
                        icon={
                          contact.type === "group" ? (
                            <TeamOutlined />
                          ) : (
                            <UserOutlined />
                          )
                        }
                      />
                      <div className={styles.contactName}>
                        <div>{contact.nickname}</div>
                        {contact.conRemark && (
                          <div className={styles.conRemark}>
                            {contact.conRemark}
                          </div>
                        )}
                      </div>
                      {contact.type === "group" && (
                        <TeamOutlined className={styles.groupIcon} />
                      )}
                    </div>
                    <CloseOutlined
                      className={styles.removeIcon}
                      onClick={() => handleRemoveContact(contact.id)}
                    />
                  </div>
                ))
              ) : (
                <Empty
                  description={`请选择${getStep2Title()}`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染步骤3：一键群发
  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <div className={styles.step3Content}>
        <div className={styles.messagePreview}>
          <div className={styles.previewTitle}>模拟推送内容</div>
          <div className={styles.messageBubble}>
            {messageContent || "开始添加消息内容..."}
          </div>
        </div>

        <div className={styles.messageInputArea}>
          <Input.TextArea
            className={styles.messageInput}
            placeholder="请输入内容"
            value={messageContent}
            onChange={e => setMessageContent(e.target.value)}
            rows={4}
            onKeyDown={e => {
              if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                setMessageContent(prev => prev + "\n");
              }
            }}
          />
          <div className={styles.attachmentButtons}>
            <Button type="text" icon="😊" />
            <Button type="text" icon="🖼️" />
            <Button type="text" icon="📎" />
            <Button type="text" icon="🔗" />
            <Button type="text" icon="⭐" />
          </div>
          <div className={styles.aiRewriteSection}>
            <Switch checked={aiRewriteEnabled} onChange={setAiRewriteEnabled} />
            <span style={{ marginLeft: 8 }}>AI智能话术改写</span>
            {aiRewriteEnabled && (
              <Input
                placeholder="输入改写提示词"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                style={{ marginLeft: 12, width: 200 }}
              />
            )}
            <Button type="primary" style={{ marginLeft: 12 }}>
              + 添加
            </Button>
          </div>
          <div className={styles.messageHint}>
            按住CTRL+ENTER换行,已配置1个话术组,已选择0个进行推送
          </div>
        </div>

        <div className={styles.settingsPanel}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>好友间间隔</div>
            <div className={styles.settingControl}>
              <span>间隔时间(秒)</span>
              <Slider
                range
                min={1}
                max={60}
                value={friendInterval}
                onChange={value => setFriendInterval(value as [number, number])}
                style={{ flex: 1, margin: "0 16px" }}
              />
              <span>
                {friendInterval[0]} - {friendInterval[1]}
              </span>
            </div>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>消息间间隔</div>
            <div className={styles.settingControl}>
              <span>间隔时间(秒)</span>
              <Slider
                range
                min={1}
                max={60}
                value={messageInterval}
                onChange={value =>
                  setMessageInterval(value as [number, number])
                }
                style={{ flex: 1, margin: "0 16px" }}
              />
              <span>
                {messageInterval[0]} - {messageInterval[1]}
              </span>
            </div>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>完成打标签</div>
            <div className={styles.settingControl}>
              <Select
                value={selectedTag}
                onChange={setSelectedTag}
                placeholder="选择标签"
                style={{ width: 200 }}
              >
                <Select.Option value="potential">潜在客户</Select.Option>
                <Select.Option value="customer">客户</Select.Option>
                <Select.Option value="partner">合作伙伴</Select.Option>
              </Select>
            </div>
          </div>
        </div>

        <div className={styles.pushPreview}>
          <div className={styles.previewTitle}>推送预览</div>
          <ul>
            <li>推送账号: {selectedAccounts.length}个</li>
            <li>
              推送{getStep2Title()}: {selectedContacts.length}个
            </li>
            <li>话术组数: 0个</li>
            <li>随机推送: 否</li>
            <li>预计耗时: ~1分钟</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      width={1200}
      className={styles.pushTaskModal}
      footer={null}
      closable={false}
    >
      <div className={styles.modalHeader}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleClose}
          className={styles.backButton}
        >
          返回
        </Button>
        <div className={styles.headerTitle}>
          <h2>{getTitle()}</h2>
          <p>{getSubtitle()}</p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className={styles.steps}>
        <div
          className={`${styles.step} ${currentStep >= 1 ? styles.active : ""} ${currentStep > 1 ? styles.completed : ""}`}
        >
          <div className={styles.stepIcon}>
            {currentStep > 1 ? <CheckCircleOutlined /> : "1"}
          </div>
          <span>选择微信</span>
        </div>
        <div
          className={`${styles.step} ${currentStep >= 2 ? styles.active : ""} ${currentStep > 2 ? styles.completed : ""}`}
        >
          <div className={styles.stepIcon}>
            {currentStep > 2 ? <CheckCircleOutlined /> : "2"}
          </div>
          <span>选择{getStep2Title()}</span>
        </div>
        <div
          className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}
        >
          <div className={styles.stepIcon}>3</div>
          <span>一键群发</span>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className={styles.stepBody}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* 底部操作栏 */}
      <div className={styles.modalFooter}>
        <div className={styles.footerLeft}>
          {currentStep === 1 && (
            <span>已选择{selectedAccounts.length}个微信账号</span>
          )}
          {currentStep === 2 && (
            <span>
              已选择{selectedContacts.length}个{getStep2Title()}
            </span>
          )}
          {currentStep === 3 && (
            <span>
              推送账号: {selectedAccounts.length}个, 推送{getStep2Title()}:{" "}
              {selectedContacts.length}个
            </span>
          )}
        </div>
        <div className={styles.footerRight}>
          {currentStep === 1 && (
            <>
              <Button onClick={handleSelectAll}>清空选择</Button>
              <Button type="primary" onClick={handleNext}>
                下一步 &gt;
              </Button>
            </>
          )}
          {currentStep === 2 && (
            <>
              <Button onClick={handlePrev}>上一步</Button>
              <Button type="primary" onClick={handleNext}>
                下一步 &gt;
              </Button>
            </>
          )}
          {currentStep === 3 && (
            <>
              <Button onClick={handlePrev}>上一步</Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
              >
                一键发送
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PushTaskModal;
