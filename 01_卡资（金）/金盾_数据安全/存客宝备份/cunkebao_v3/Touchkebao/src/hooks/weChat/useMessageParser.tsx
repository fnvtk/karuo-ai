import React, { useCallback } from "react";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { getEmojiPath } from "@/components/EmojiSeclection/wechatEmoji";
import AudioMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/AudioMessage/AudioMessage";
import SmallProgramMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/SmallProgramMessage";
import VideoMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/VideoMessage";
import LocationMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/LocationMessage";
import SystemRecommendRemarkMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/SystemRecommendRemarkMessage/index";
import RedPacketMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/RedPacketMessage";
import TransferMessage from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/components/TransferMessage";
import styles from "@/pages/pc/ckbox/weChat/components/ChatWindow/components/MessageRecord/com.module.scss";

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const FILE_EXT_REGEX = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z)$/i;

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

interface ImageContentOptions {
  src: string;
  alt: string;
  fallbackText: string;
  style?: React.CSSProperties;
  wrapperClassName?: string;
  withBubble?: boolean;
  onClick?: () => void;
}

const renderImageContent = ({
  src,
  alt,
  fallbackText,
  style = {
    maxWidth: "200px",
    maxHeight: "200px",
    borderRadius: "8px",
  },
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
    style: {
      maxWidth: "120px",
      maxHeight: "120px",
    },
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

/**
 * 消息解析 Hook
 * 提取消息解析逻辑，使用 useCallback 优化性能
 */
export const useMessageParser = (contract: ContractData | weChatGroup) => {
  // 判断是否为表情包URL的工具函数
  const isEmojiUrl = useCallback((content: string): boolean => {
    return (
      content.includes("ac-weremote-s2.oss-cn-shenzhen.aliyuncs.com") ||
      /\.(gif|webp|png|jpg|jpeg)$/i.test(content) ||
      content.includes("emoji") ||
      content.includes("sticker") ||
      content.includes("expression")
    );
  }, []);

  // 解析表情包文字格式[表情名称]并替换为img标签
  const parseEmojiText = useCallback((text: string): React.ReactNode[] => {
    const emojiRegex = /\[([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
      // 添加表情前的文字
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // 获取表情名称并查找对应路径
      const emojiName = match[1];
      const emojiPath = getEmojiPath(emojiName as any);

      if (emojiPath) {
        // 如果找到表情，添加img标签
        parts.push(
          <img
            key={`emoji-${match.index}`}
            src={emojiPath}
            alt={emojiName}
            className={styles.emojiImage}
            style={{
              width: "20px",
              height: "20px",
              margin: "0 2px",
              display: "inline",
              lineHeight: "20px",
              float: "left",
            }}
          />,
        );
      } else {
        // 如果没找到表情，保持原文字
        parts.push(match[0]);
      }

      lastIndex = emojiRegex.lastIndex;
    }

    // 添加剩余的文字
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, []);

  // 渲染未知内容
  const renderUnknownContent = useCallback(
    (
      rawContent: string,
      trimmedContent: string,
      msg?: ChatRecord,
      contractParam?: ContractData | weChatGroup,
    ) => {
      if (isLegacyEmojiContent(trimmedContent)) {
        return renderEmojiContent(rawContent);
      }

      const jsonData = tryParseContentJson(trimmedContent);

      if (jsonData && typeof jsonData === "object") {
        // 判断是否为红包消息
        if (
          jsonData.nativeurl &&
          typeof jsonData.nativeurl === "string" &&
          jsonData.nativeurl.includes(
            "wxpay://c2cbizmessagehandler/hongbao/receivehongbao",
          )
        ) {
          return (
            <RedPacketMessage
              content={rawContent}
              msg={msg}
              contract={contractParam}
            />
          );
        }

        // 判断是否为转账消息
        if (
          jsonData.title === "微信转账" ||
          (jsonData.transferid && jsonData.feedesc)
        ) {
          return (
            <TransferMessage
              content={rawContent}
              msg={msg}
              contract={contractParam}
            />
          );
        }

        if (jsonData.type === "file" && msg && contractParam) {
          return (
            <SmallProgramMessage
              content={rawContent}
              msg={msg}
              contract={contractParam}
            />
          );
        }

        if (jsonData.type === "link" && jsonData.title && jsonData.url) {
          const { title, desc, thumbPath, url } = jsonData;

          return (
            <div
              className={`${styles.miniProgramMessage} ${styles.miniProgramType1}`}
            >
              <div
                className={`${styles.miniProgramCard} ${styles.linkCard}`}
                onClick={() => openInNewTab(url)}
              >
                {thumbPath && (
                  <img
                    src={thumbPath}
                    alt="链接缩略图"
                    className={styles.miniProgramThumb}
                    onError={event => {
                      const target = event.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                )}
                <div className={styles.miniProgramInfo}>
                  <div className={styles.miniProgramTitle}>{title}</div>
                  {desc && <div className={styles.linkDescription}>{desc}</div>}
                </div>
              </div>
              <div className={styles.miniProgramApp}>链接</div>
            </div>
          );
        }

        if (
          jsonData.previewImage &&
          (jsonData.tencentUrl || jsonData.videoUrl)
        ) {
          const previewImageUrl = String(jsonData.previewImage).replace(
            /[`"']/g,
            "",
          );
          return (
            <div className={styles.videoMessage}>
              <div className={styles.videoContainer}>
                <img
                  src={previewImageUrl}
                  alt="视频预览"
                  className={styles.videoPreview}
                  onClick={() => {
                    const videoUrl = jsonData.videoUrl || jsonData.tencentUrl;
                    if (videoUrl) {
                      openInNewTab(videoUrl);
                    }
                  }}
                  onError={event => {
                    const target = event.target as HTMLImageElement;
                    const parent = target.parentElement?.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="${styles.messageText}">[视频预览加载失败]</div>`;
                    }
                  }}
                />
                <div className={styles.playButton}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          );
        }
      }

      if (isHttpImageUrl(trimmedContent)) {
        return renderImageContent({
          src: rawContent,
          alt: "图片消息",
          fallbackText: "[图片加载失败]",
        });
      }

      if (isFileUrl(trimmedContent)) {
        return renderFileContent(trimmedContent);
      }

      return (
        <div className={styles.messageText}>{parseEmojiText(rawContent)}</div>
      );
    },
    [parseEmojiText],
  );

  // 解析消息内容，根据msgType判断消息类型并返回对应的渲染内容
  const parseMessageContent = useCallback(
    (
      content: string | null | undefined,
      msg: ChatRecord,
      msgType?: number,
    ): React.ReactNode => {
      // 处理null或undefined的内容
      if (content === null || content === undefined) {
        return <div className={styles.messageText}>消息内容不可用</div>;
      }

      // 统一的错误消息渲染函数
      const renderErrorMessage = (fallbackText: string) => (
        <div className={styles.messageText}>{fallbackText}</div>
      );

      const isStringValue = typeof content === "string";
      const rawContent = isStringValue ? content : "";
      const trimmedContent = rawContent.trim();

      switch (msgType) {
        case 1: // 文本消息
          return (
            <div className={styles.messageBubble}>
              <div className={styles.messageText}>
                {parseEmojiText(rawContent)}
              </div>
            </div>
          );

        case 3: // 图片消息
          if (!isStringValue || !trimmedContent) {
            return renderErrorMessage("[图片消息 - 无效链接]");
          }
          return renderImageContent({
            src: rawContent,
            alt: "图片消息",
            fallbackText: "[图片加载失败]",
            withBubble: true,
          });

        case 34: // 语音消息
          if (!isStringValue || !trimmedContent) {
            return renderErrorMessage("[语音消息 - 无效内容]");
          }

          return <AudioMessage audioUrl={rawContent} msgId={String(msg.id)} />;

        case 43: // 视频消息
          return (
            <VideoMessage
              content={isStringValue ? rawContent : ""}
              msg={msg}
              contract={contract}
            />
          );

        case 47: // 动图表情包（gif、其他表情包）
          if (!isStringValue || !trimmedContent) {
            return renderErrorMessage("[表情包 - 无效链接]");
          }

          if (isEmojiUrl(trimmedContent)) {
            return renderEmojiContent(rawContent);
          }
          return renderErrorMessage("[表情包]");

        case 48: // 定位消息
          return <LocationMessage content={isStringValue ? rawContent : ""} />;

        case 49: // 小程序/文章/其他：图文、文件
          return (
            <SmallProgramMessage
              content={isStringValue ? rawContent : ""}
              msg={msg}
              contract={contract}
            />
          );

        case 10002: // 系统推荐备注消息
          return (
            <SystemRecommendRemarkMessage
              content={isStringValue ? rawContent : ""}
            />
          );

        default: {
          if (!isStringValue || !trimmedContent) {
            return renderErrorMessage(
              `[未知消息类型${msgType ? ` - ${msgType}` : ""}]`,
            );
          }

          return renderUnknownContent(
            rawContent,
            trimmedContent,
            msg,
            contract,
          );
        }
      }
    },
    [contract, parseEmojiText, isEmojiUrl, renderUnknownContent],
  );

  return {
    parseMessageContent,
    parseEmojiText,
    isEmojiUrl,
  };
};
