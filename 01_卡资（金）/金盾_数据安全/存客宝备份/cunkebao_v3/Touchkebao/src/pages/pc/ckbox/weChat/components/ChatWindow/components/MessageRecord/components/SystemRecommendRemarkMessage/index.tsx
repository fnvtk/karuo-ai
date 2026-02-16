import React from "react";
import styles from "./index.module.scss";
import { WarningOutlined } from "@ant-design/icons";

interface SystemRecommendRemarkMessageProps {
  content: string;
}

const SystemRecommendRemarkMessage: React.FC<
  SystemRecommendRemarkMessageProps
> = ({ content }) => {
  // 解析XML内容
  const parseSystemMessage = (xmlContent: string) => {
    try {
      // 使用正则表达式提取关键信息
      const templateMatch = xmlContent.match(
        /<template><!\[CDATA\[(.*?)\]\]><\/template>/,
      );
      const phoneMatch = xmlContent.match(/<phone>(.*?)<\/phone>/);
      const talkerMatch = xmlContent.match(/<talker>(.*?)<\/talker>/);
      const remarkMatch = xmlContent.match(/<remark>(.*?)<\/remark>/);

      const template = templateMatch ? templateMatch[1] : "";
      const phone = phoneMatch ? phoneMatch[1] : "";
      const talker = talkerMatch ? talkerMatch[1] : "";
      const remark = remarkMatch ? remarkMatch[1] : "";

      // 处理模板文本，替换占位符
      let displayText = template;
      if (phone) {
        displayText = displayText.replace(/\$remark_msg_native_url\$/, phone);
      }

      return {
        template: displayText,
        phone,
        talker,
        remark,
        hasRemark: !!remark.trim(),
      };
    } catch (error) {
      console.warn("解析系统推荐备注消息失败:", error);
      return {
        template: "系统推荐添加备注",
        phone: "",
        talker: "",
        remark: "",
        hasRemark: false,
      };
    }
  };

  const messageData = parseSystemMessage(content);

  return (
    <div className={styles.systemRecommendRemarkMessage}>
      <div className={styles.systemMessageText}>
        <WarningOutlined style={{ fontSize: 16 }} />
        &nbsp;
        {messageData.template}
      </div>
    </div>
  );
};

export default SystemRecommendRemarkMessage;
