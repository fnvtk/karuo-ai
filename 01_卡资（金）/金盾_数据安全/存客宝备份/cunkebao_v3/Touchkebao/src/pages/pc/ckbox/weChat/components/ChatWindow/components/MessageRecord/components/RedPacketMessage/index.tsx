import React from "react";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import styles from "./RedPacketMessage.module.scss";

interface RedPacketData {
  nativeurl?: string;
  paymsgid?: string;
  sendertitle?: string;
  [key: string]: any;
}

interface RedPacketMessageProps {
  content: string;
  msg?: ChatRecord;
  contract?: ContractData | weChatGroup;
}

const RedPacketMessage: React.FC<RedPacketMessageProps> = ({
  content,
  msg,
  contract,
}) => {
  const renderErrorMessage = (fallbackText: string) => (
    <div className={styles.messageText}>{fallbackText}</div>
  );

  if (typeof content !== "string" || !content.trim()) {
    return renderErrorMessage("[红包消息 - 无效内容]");
  }

  try {
    const trimmedContent = content.trim();
    const jsonData: RedPacketData = JSON.parse(trimmedContent);

    // 验证是否为红包消息
    const isRedPacket =
      jsonData.nativeurl &&
      typeof jsonData.nativeurl === "string" &&
      jsonData.nativeurl.includes(
        "wxpay://c2cbizmessagehandler/hongbao/receivehongbao",
      );

    if (!isRedPacket) {
      return renderErrorMessage("[红包消息 - 格式错误]");
    }

    const title = jsonData.sendertitle || "恭喜发财，大吉大利";
    const paymsgid = jsonData.paymsgid || "";
    const nativeurl = jsonData.nativeurl || "";

    // 处理红包点击事件，发送 socket 请求
    const handleRedPacketClick = () => {
      if (!contract || !paymsgid || !nativeurl) {
        console.warn("红包点击失败：缺少必要参数", {
          contract,
          paymsgid,
          nativeurl,
        });
        return;
      }

      const isGroup = !!contract.chatroomId;
      const wechatFriendId = isGroup ? 0 : contract.id;

      // 发送 socket 请求
      useWebSocketStore.getState().sendCommand("CmdOpenLuckyMoney", {
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: wechatFriendId,
        paymsgid: paymsgid,
        nativeurl: nativeurl,
      });

      console.log("发送红包打开请求:", {
        cmdType: "CmdOpenLuckyMoney",
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: wechatFriendId,
        paymsgid: paymsgid,
        nativeurl: nativeurl,
      });
    };

    return (
      <div className={styles.redPacketMessage}>
        <div className={styles.redPacketCard} onClick={handleRedPacketClick}>
          <div className={styles.redPacketHeader}>
            <div className={styles.redPacketIcon}>🧧</div>
            <div className={styles.redPacketTitle}>{title}</div>
          </div>
          <div className={styles.redPacketFooter}>
            <span className={styles.redPacketLabel}>微信红包</span>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.warn("红包消息解析失败:", e);
    return renderErrorMessage("[红包消息 - 解析失败]");
  }
};

export default RedPacketMessage;
