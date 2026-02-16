import React, { useState } from "react";
import { Modal, Input, Button, message, Select } from "antd";
import { SearchOutlined, DownOutlined } from "@ant-design/icons";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { useCustomerStore } from "@/store/module/weChat/customer";
import styles from "./index.module.scss";

interface AddFriendsProps {
  visible: boolean;
  onCancel: () => void;
}

const AddFriends: React.FC<AddFriendsProps> = ({ visible, onCancel }) => {
  const [searchValue, setSearchValue] = useState("");
  const [greeting, setGreeting] = useState("我是老坑爹-解放双手,释放时间");
  const [remark, setRemark] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { sendCommand } = useWebSocketStore();
  const currentCustomer = useCustomerStore(state => state.currentCustomer);

  // 获取标签列表（从 currentCustomer.labels 字符串数组）
  const tags = currentCustomer?.labels || [];

  // 重置表单
  const handleReset = () => {
    setSearchValue("");
    setGreeting("我是老坑爹-解放双手,释放时间");
    setRemark("");
    setSelectedTag(undefined);
  };

  // 处理取消
  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  // 判断是否为手机号（11位数字）
  const isPhoneNumber = (value: string): boolean => {
    return /^1[3-9]\d{9}$/.test(value.trim());
  };

  // 处理添加好友
  const handleAddFriend = async () => {
    if (!searchValue.trim()) {
      message.warning("请输入微信号或手机号");
      return;
    }

    if (!currentCustomer?.id) {
      message.error("请先选择客服账号");
      return;
    }

    setLoading(true);
    try {
      const trimmedValue = searchValue.trim();
      const isPhone = isPhoneNumber(trimmedValue);

      // 发送添加好友命令
      sendCommand("CmdSendFriendRequest", {
        WechatAccountId: currentCustomer.id,
        TargetWechatId: isPhone ? "" : trimmedValue,
        Phone: isPhone ? trimmedValue : "",
        Message: greeting.trim() || "我是老坑爹-解放双手,释放时间",
        Remark: remark.trim() || "",
        Labels: selectedTag || "",
      });

      message.success("好友请求已发送");
      handleCancel();
    } catch (error) {
      console.error("添加好友失败:", error);
      message.error("添加好友失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      className={styles.addFriendModal}
      width={480}
      closable={false}
    >
      <div className={styles.modalContent}>
        {/* 搜索输入框 */}
        <div className={styles.searchInputWrapper}>
          <Input
            placeholder="请输入微信号/手机号"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onPressEnter={handleAddFriend}
            disabled={loading}
            allowClear
          />
        </div>

        {/* 提示文字 */}
        <div className={styles.tipText}>你需要发送验证申请,等待对方通过</div>

        {/* 验证消息文本区域 */}
        <div className={styles.greetingWrapper}>
          <Input.TextArea
            value={greeting}
            onChange={e => setGreeting(e.target.value)}
            rows={4}
            disabled={loading}
            maxLength={200}
          />
        </div>

        {/* 备注输入框 */}
        <div className={styles.formRow}>
          <span className={styles.label}>备注:</span>
          <Input
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="请输入备注"
            disabled={loading}
            className={styles.inputField}
          />
        </div>

        {/* 标签选择器 */}
        <div className={styles.formRow}>
          <span className={styles.label}>标签:</span>
          <Select
            value={selectedTag}
            onChange={setSelectedTag}
            placeholder="请选择标签"
            disabled={loading}
            className={styles.selectField}
            suffixIcon={<DownOutlined />}
            allowClear
          >
            {tags.map(tag => (
              <Select.Option key={tag} value={tag}>
                {tag}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* 底部按钮 */}
        <div className={styles.buttonGroup}>
          <Button
            type="primary"
            onClick={handleAddFriend}
            loading={loading}
            className={styles.addButton}
          >
            加为好友
          </Button>
          <Button
            onClick={handleCancel}
            disabled={loading}
            className={styles.cancelButton}
          >
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddFriends;
