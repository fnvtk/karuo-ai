import React, { useState } from "react";
import { Button, Modal, Select, Input, message } from "antd";
import { ShareAltOutlined } from "@ant-design/icons";
import {
  getTransferableAgentList,
  WechatFriendAllot,
  WechatFriendRebackAllot,
  WechatChatroomAllot,
} from "@/pages/pc/ckbox/weChat/api";
import { dataProcessing } from "@/api/ai";
import { useCurrentContact } from "@/store/module/weChat/weChat";
import { ContactManager } from "@/utils/dbAction/contact";
import { MessageManager } from "@/utils/dbAction/message";
import { useUserStore } from "@/store/module/user";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useMessageStore } from "@weChatStore/message";
import { useContactStore } from "@weChatStore/contacts";
const { TextArea } = Input;
const { Option } = Select;

interface ToContractProps {
  className?: string;
  disabled?: boolean;
}
interface DepartItem {
  id: number;
  userName: string;
  realName: string;
  nickname: string;
  avatar: string;
  memo: string;
  departmentId: number;
  alive: boolean;
}

const ToContract: React.FC<ToContractProps> = ({
  className,
  disabled = false,
}) => {
  const currentContact = useCurrentContact();
  const clearCurrentContact = useWeChatStore(
    state => state.clearCurrentContact,
  );
  const removeSessionById = useMessageStore(state => state.removeSessionById);
  const deleteContact = useContactStore(state => state.deleteContact);
  const [visible, setVisible] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [customerServiceList, setCustomerServiceList] = useState<DepartItem[]>(
    [],
  );
  // 打开弹窗
  const openModal = () => {
    setVisible(true);
    getTransferableAgentList().then(data => {
      setCustomerServiceList(data.list);
    });
  };

  // 关闭弹窗并重置状态
  const closeModal = () => {
    setVisible(false);
    setSelectedTarget(null);
    setComment("");
    setLoading(false);
  };

  // 确定转给他人
  const handleConfirm = async () => {
    if (!selectedTarget) {
      message.warning("请选择目标客服");
      return;
    }

    try {
      setLoading(true);

      // 调用转接接口：区分好友 / 群聊
      if (currentContact) {
        const isGroup =
          "chatroomId" in currentContact && !!currentContact.chatroomId;

        if (isGroup) {
          // 群聊转移：使用 WechatChatroomAllot
          await WechatChatroomAllot({
            wechatChatroomId: currentContact.id,
            toAccountId: selectedTarget as number,
            notifyReceiver: true,
            comment: comment.trim(),
          });
          dataProcessing({
            type: "CmdAllotFriend",
            wechatChatroomId: currentContact.id,
            toAccountId: selectedTarget as number,
            wechatAccountId: currentContact.wechatAccountId,
          });
        } else {
          // 好友转移：使用 WechatFriendAllot
          await WechatFriendAllot({
            wechatFriendId: currentContact.id,
            toAccountId: selectedTarget as number,
            notifyReceiver: true,
            comment: comment.trim(),
          });
          dataProcessing({
            type: "CmdAllotFriend",
            wechatFriendId: currentContact.id,
            toAccountId: selectedTarget as number,
            wechatAccountId: currentContact.wechatAccountId,
          });
        }
      }

      // 先关闭弹窗
      closeModal();

      // 删除本地数据库记录并关闭聊天窗口
      try {
        const currentUserId = useUserStore.getState().user?.id || 0;
        const contactType = "chatroomId" in currentContact ? "group" : "friend";

        // 1. 立即从Store中删除会话（更新UI）
        removeSessionById(currentContact.id, contactType);

        // 2. 从会话列表数据库删除
        await MessageManager.deleteSession(
          currentUserId,
          currentContact.id,
          contactType,
        );
        console.log("✅ 已从会话列表删除");

        // 3. 从联系人数据库删除
        await ContactManager.deleteContact(currentContact.id);
        console.log("✅ 已从联系人数据库删除");

        // 4. 从联系人Store中删除（更新联系人列表UI）
        try {
          await deleteContact(currentContact.id);
          console.log("✅ 已从联系人列表Store删除");
        } catch (error) {
          console.error("从联系人Store删除失败:", error);
        }

        // 5. 清空当前选中的联系人（关闭聊天窗口）
        clearCurrentContact();

        message.success("转接成功，已清理本地数据");
      } catch (deleteError) {
        console.error("删除本地数据失败:", deleteError);
        message.error("删除本地数据失败");
      }
    } catch (error) {
      console.error("转接失败:", error);
      message.error("转接失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 一键转回
  const handleReturn = async () => {
    try {
      setLoading(true);

      // 调用转回接口
      if (currentContact) {
        if ("chatroomId" in currentContact && currentContact.chatroomId) {
          await WechatFriendRebackAllot({
            wechatChatroomId: currentContact.id,
          });
        } else {
          await WechatFriendRebackAllot({
            wechatFriendId: currentContact.id,
          });
        }
      }

      // 先关闭弹窗
      closeModal();

      // 删除本地数据库记录并关闭聊天窗口
      try {
        const currentUserId = useUserStore.getState().user?.id || 0;
        const contactType = "chatroomId" in currentContact ? "group" : "friend";

        // 1. 立即从Store中删除会话（更新UI）
        removeSessionById(currentContact.id, contactType);

        // 2. 从会话列表数据库删除
        await MessageManager.deleteSession(
          currentUserId,
          currentContact.id,
          contactType,
        );
        console.log("✅ 已从会话列表删除");

        // 3. 从联系人数据库删除
        await ContactManager.deleteContact(currentContact.id);
        console.log("✅ 已从联系人数据库删除");

        // 4. 从联系人Store中删除（更新联系人列表UI）
        try {
          await deleteContact(currentContact.id);
          console.log("✅ 已从联系人列表Store删除");
        } catch (error) {
          console.error("从联系人Store删除失败:", error);
        }

        // 5. 清空当前选中的联系人（关闭聊天窗口）
        clearCurrentContact();

        message.success("转回成功，已清理本地数据");
      } catch (deleteError) {
        console.error("删除本地数据失败:", deleteError);
        message.error("删除本地数据失败");
      }
    } catch (error) {
      console.error("转回失败:", error);
      message.error("转回失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={className}
        onClick={openModal}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <ShareAltOutlined />
        转给他人
      </div>

      <Modal
        title="转给他人"
        open={visible}
        onCancel={closeModal}
        width={400}
        centered
        maskClosable={!loading}
        footer={[
          <div
            key="footer"
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* <Button onClick={handleReturn} disabled={loading}>
              一键转回
            </Button> */}
            <div>
              <Button
                onClick={closeModal}
                disabled={loading}
                style={{ marginRight: "8px" }}
              >
                取消
              </Button>
              <Button
                type="primary"
                loading={loading}
                onClick={handleConfirm}
                disabled={!selectedTarget}
              >
                确定
              </Button>
            </div>
          </div>,
        ]}
      >
        <div style={{ padding: "20px 0" }}>
          {/* 目标客服选择 */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{ marginBottom: "8px", fontSize: "14px", color: "#333" }}
            >
              目标客服
            </div>
            <Select
              placeholder="请选择目标客服"
              value={selectedTarget}
              onChange={setSelectedTarget}
              style={{ width: "100%" }}
              size="large"
              disabled={loading}
            >
              {customerServiceList.map(item => (
                <Option key={item.id} value={item.id}>
                  {item.nickname || item.realName} - {item.userName}
                </Option>
              ))}
            </Select>
          </div>

          {/* 附言输入 */}
          <div>
            <div
              style={{ marginBottom: "8px", fontSize: "14px", color: "#333" }}
            >
              附言
            </div>
            <TextArea
              placeholder="请输入附言内容"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={300}
              showCount
              style={{ resize: "none" }}
              disabled={loading}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ToContract;
