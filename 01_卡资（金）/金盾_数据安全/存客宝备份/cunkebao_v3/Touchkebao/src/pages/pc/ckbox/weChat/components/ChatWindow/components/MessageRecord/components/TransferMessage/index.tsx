import React from "react";
import { SwapOutlined } from "@ant-design/icons";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import styles from "./TransferMessage.module.scss";

interface TransferData {
  title?: string;
  feedesc?: string;
  payMemo?: string;
  transferid?: string;
  transcationid?: string;
  invalidtime?: string;
  paysubtype?: string;
  [key: string]: any;
}

interface TransferMessageProps {
  content: string;
  msg?: ChatRecord;
  contract?: ContractData | weChatGroup;
}

const TransferMessage: React.FC<TransferMessageProps> = ({
  content,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  msg, // 保留参数以保持与 RedPacketMessage 组件的一致性，未来可能会用到
  contract,
}) => {
  const renderErrorMessage = (fallbackText: string) => (
    <div className={styles.messageText}>{fallbackText}</div>
  );

  if (typeof content !== "string" || !content.trim()) {
    return renderErrorMessage("[转账消息 - 无效内容]");
  }

  try {
    const trimmedContent = content.trim();
    const jsonData: TransferData = JSON.parse(trimmedContent);

    // 验证是否为转账消息
    const isTransfer =
      jsonData.title === "微信转账" ||
      (jsonData.transferid && jsonData.feedesc);

    if (!isTransfer) {
      return renderErrorMessage("[转账消息 - 格式错误]");
    }

    const amount = jsonData.feedesc || "￥0.00";

    // 判断转账状态
    const getTransferStatus = (
      data: TransferData,
    ): { text: string; canClick: boolean } => {
      const paySubType = data.paysubtype || "";

      switch (paySubType) {
        case "1":
          return { text: "待朋友确认收钱", canClick: true };
        case "2":
          return { text: "已过期", canClick: false };
        case "3":
          return { text: "已领取", canClick: false };
        case "4":
          return { text: "已退回", canClick: false };
        default:
          // 默认情况：可能是待领取
          return { text: "待朋友确认收钱", canClick: true };
      }
    };

    const { text: statusText, canClick } = getTransferStatus(jsonData);

    // 处理转账点击事件，发送 socket 请求
    const handleTransferClick = () => {
      // 如果状态不允许点击，直接返回
      if (!canClick) {
        console.log("转账状态不允许点击:", statusText);
        return;
      }

      if (
        !contract ||
        !jsonData.transferid ||
        !jsonData.transcationid ||
        !jsonData.invalidtime ||
        !jsonData.paysubtype
      ) {
        console.warn("转账点击失败：缺少必要参数", {
          contract,
          transferid: jsonData.transferid,
          transcationid: jsonData.transcationid,
          invalidtime: jsonData.invalidtime,
          paysubtype: jsonData.paysubtype,
        });
        return;
      }

      const isGroup = !!contract.chatroomId;
      const wechatFriendId = isGroup ? 0 : contract.id;

      // 发送 socket 请求
      useWebSocketStore.getState().sendCommand("CmdReceiveTransMoney", {
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: wechatFriendId,
        transcationid: jsonData.transcationid,
        transferid: jsonData.transferid,
        invalidtime: jsonData.invalidtime,
        paysubtype: jsonData.paysubtype,
      });

      console.log("发送转账接收请求:", {
        cmdType: "CmdReceiveTransMoney",
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: wechatFriendId,
        transcationid: jsonData.transcationid,
        transferid: jsonData.transferid,
        invalidtime: jsonData.invalidtime,
        paysubtype: jsonData.paysubtype,
      });
    };

    return (
      <div className={styles.transferMessage}>
        <div
          className={`${styles.transferCard} ${!canClick ? styles.transferDisabled : ""}`}
          onClick={handleTransferClick}
        >
          <div className={styles.transferHeader}>
            <div className={styles.transferIcon}>
              <SwapOutlined style={{ fontSize: 20 }} />
            </div>
            <div className="destion">
              <div className={styles.transferAmount}>{amount}</div>
              <div className={styles.transferStatus}>{statusText}</div>
            </div>
          </div>

          <div className={styles.transferDivider}></div>
          <div className={styles.transferFooter}>
            <span className={styles.transferLabel}>微信转账</span>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.warn("转账消息解析失败:", e);
    return renderErrorMessage("[转账消息 - 解析失败]");
  }
};

export default TransferMessage;
