import React from "react";
import { parseWeappMsgStr } from "@/utils/common";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import styles from "./SmallProgramMessage.module.scss";

const FILE_MESSAGE_TYPE = "file";

interface FileMessageData {
  type: string;
  title?: string;
  fileName?: string;
  filename?: string;
  url?: string;
  isDownloading?: boolean;
  fileext?: string;
  size?: number | string;
  [key: string]: any;
}

const isJsonLike = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
};

const extractFileInfoFromXml = (source: string): FileMessageData | null => {
  if (typeof source !== "string") {
    return null;
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (typeof DOMParser !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "text/xml");
      if (doc.getElementsByTagName("parsererror").length === 0) {
        const titleNode = doc.getElementsByTagName("title")[0];
        const fileExtNode = doc.getElementsByTagName("fileext")[0];
        const sizeNode =
          doc.getElementsByTagName("totallen")[0] ||
          doc.getElementsByTagName("filesize")[0];

        const result: FileMessageData = { type: FILE_MESSAGE_TYPE };
        const titleText = titleNode?.textContent?.trim();
        if (titleText) {
          result.title = titleText;
        }

        const fileExtText = fileExtNode?.textContent?.trim();
        if (fileExtText) {
          result.fileext = fileExtText;
        }

        const sizeText = sizeNode?.textContent?.trim();
        if (sizeText) {
          const sizeNumber = Number(sizeText);
          result.size = Number.isNaN(sizeNumber) ? sizeText : sizeNumber;
        }

        return result;
      }
    }
  } catch (error) {
    console.warn("extractFileInfoFromXml parse failed:", error);
  }

  const regexTitle =
    trimmed.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
    trimmed.match(/<title>([^<]+)<\/title>/i);
  const regexExt =
    trimmed.match(/<fileext><!\[CDATA\[(.*?)\]\]><\/fileext>/i) ||
    trimmed.match(/<fileext>([^<]+)<\/fileext>/i);
  const regexSize =
    trimmed.match(/<totallen>([^<]+)<\/totallen>/i) ||
    trimmed.match(/<filesize>([^<]+)<\/filesize>/i);

  if (!regexTitle && !regexExt && !regexSize) {
    return null;
  }

  const fallback: FileMessageData = { type: FILE_MESSAGE_TYPE };
  if (regexTitle?.[1]) {
    fallback.title = regexTitle[1].trim();
  }
  if (regexExt?.[1]) {
    fallback.fileext = regexExt[1].trim();
  }
  if (regexSize?.[1]) {
    const sizeNumber = Number(regexSize[1]);
    fallback.size = Number.isNaN(sizeNumber) ? regexSize[1].trim() : sizeNumber;
  }

  return fallback;
};

const resolveFileMessageData = (
  messageData: any,
  msg: ChatRecord,
  rawContent: string,
): FileMessageData | null => {
  const meta =
    msg?.fileDownloadMeta && typeof msg.fileDownloadMeta === "object"
      ? { ...(msg.fileDownloadMeta as Record<string, any>) }
      : null;

  if (messageData && typeof messageData === "object") {
    if (messageData.type === FILE_MESSAGE_TYPE) {
      return {
        type: FILE_MESSAGE_TYPE,
        ...messageData,
        ...(meta || {}),
      };
    }

    if (typeof messageData.contentXml === "string") {
      const xmlData = extractFileInfoFromXml(messageData.contentXml);
      if (xmlData || meta) {
        return {
          ...(xmlData || {}),
          ...(meta || {}),
          type: FILE_MESSAGE_TYPE,
        };
      }
    }
  }

  if (typeof rawContent === "string") {
    const xmlData = extractFileInfoFromXml(rawContent);
    if (xmlData || meta) {
      return {
        ...(xmlData || {}),
        ...(meta || {}),
        type: FILE_MESSAGE_TYPE,
      };
    }
  }

  if (meta) {
    return {
      type: FILE_MESSAGE_TYPE,
      ...meta,
    };
  }

  return null;
};

interface SmallProgramMessageProps {
  content: string;
  msg: ChatRecord;
  contract: ContractData | weChatGroup;
}

const SmallProgramMessage: React.FC<SmallProgramMessageProps> = ({
  content,
  msg,
  contract,
}) => {
  const sendCommand = useWebSocketStore(state => state.sendCommand);
  const setFileDownloading = useWeChatStore(state => state.setFileDownloading);

  // 统一的错误消息渲染函数
  const renderErrorMessage = (fallbackText: string) => (
    <div className={styles.messageText}>{fallbackText}</div>
  );

  if (typeof content !== "string" || !content.trim()) {
    return renderErrorMessage("[小程序/文章/文件消息 - 无效内容]");
  }

  try {
    const trimmedContent = content.trim();
    const isJsonContent = isJsonLike(trimmedContent);
    const messageData = isJsonContent ? JSON.parse(trimmedContent) : null;

    if (messageData && typeof messageData === "object") {
      if (messageData.type === "link") {
        const { title, desc, thumbPath, url } = messageData;

        return (
          <div
            className={`${styles.miniProgramMessage} ${styles.articleMessage}`}
          >
            <div
              className={`${styles.miniProgramCard} ${styles.articleCard}`}
              onClick={() => window.open(url, "_blank")}
            >
              <div className={styles.articleTitle}>{title}</div>
              <div className={styles.articleContent}>
                <div className={styles.articleTextArea}>
                  {desc && (
                    <div className={styles.articleDescription}>{desc}</div>
                  )}
                </div>
                {thumbPath && (
                  <div className={styles.articleImageArea}>
                    <img
                      src={thumbPath}
                      alt="文章缩略图"
                      className={styles.articleImage}
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className={styles.miniProgramApp}>文章</div>
          </div>
        );
      }

      if (messageData.type === "miniprogram") {
        try {
          const parsedData = parseWeappMsgStr(trimmedContent);

          if (parsedData.appmsg) {
            const { appmsg } = parsedData;
            const title = appmsg.title || "小程序消息";
            const appName =
              appmsg.sourcedisplayname || appmsg.appname || "小程序";
            const miniProgramType =
              appmsg.weappinfo && appmsg.weappinfo.type
                ? parseInt(appmsg.weappinfo.type)
                : 1;

            if (miniProgramType === 2) {
              return (
                <div
                  className={`${styles.miniProgramMessage} ${styles.miniProgramType2}`}
                >
                  <div
                    className={`${styles.miniProgramCard} ${styles.miniProgramCardType2}`}
                  >
                    <div className={styles.miniProgramAppTop}>{appName}</div>
                    <div className={styles.miniProgramTitle}>{title}</div>
                    <div className={styles.miniProgramImageArea}>
                      <img
                        src={parsedData.previewImage}
                        alt="小程序图片"
                        className={styles.miniProgramImage}
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <div className={styles.miniProgramContent}>
                      <div className={styles.miniProgramIdentifier}>小程序</div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                className={`${styles.miniProgramMessage} ${styles.miniProgramType1}`}
              >
                <div className={styles.miniProgramCard}>
                  <img
                    src={parsedData.previewImage}
                    alt="小程序缩略图"
                    className={styles.miniProgramThumb}
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <div className={styles.miniProgramInfo}>
                    <div className={styles.miniProgramTitle}>{title}</div>
                  </div>
                </div>
                <div className={styles.miniProgramApp}>{appName}</div>
              </div>
            );
          }
        } catch (parseError) {
          console.error("parseWeappMsgStr解析失败:", parseError);
          return renderErrorMessage("[小程序消息 - 解析失败]");
        }
      }
    }

    const rawContentForResolve =
      messageData && typeof messageData.contentXml === "string"
        ? messageData.contentXml
        : trimmedContent;
    const fileMessageData = resolveFileMessageData(
      messageData,
      msg,
      rawContentForResolve,
    );

    if (fileMessageData && fileMessageData.type === FILE_MESSAGE_TYPE) {
      const {
        url = "",
        title,
        fileName,
        filename,
        fileext,
        isDownloading = false,
      } = fileMessageData;
      const resolvedFileName =
        title ||
        fileName ||
        filename ||
        (typeof url === "string" && url
          ? url.split("/").pop()?.split("?")[0]
          : "") ||
        "文件";
      const resolvedExtension = (
        fileext ||
        resolvedFileName.split(".").pop() ||
        ""
      ).toLowerCase();

      const iconMap: Record<string, string> = {
        pdf: "📕",
        doc: "📘",
        docx: "📘",
        xls: "📗",
        xlsx: "📗",
        ppt: "📙",
        pptx: "📙",
        txt: "📝",
        zip: "🗜️",
        rar: "🗜️",
        "7z": "🗜️",
        jpg: "🖼️",
        jpeg: "🖼️",
        png: "🖼️",
        gif: "🖼️",
        mp4: "🎬",
        avi: "🎬",
        mov: "🎬",
        mp3: "🎵",
        wav: "🎵",
        flac: "🎵",
      };
      const fileIcon = iconMap[resolvedExtension] || "📄";
      const isUrlAvailable = typeof url === "string" && url.trim().length > 0;

      const handleFileDownload = () => {
        if (isDownloading || !contract || !msg?.id) return;

        setFileDownloading(msg.id, true);
        sendCommand("CmdDownloadFile", {
          wechatAccountId: contract.wechatAccountId,
          friendMessageId: contract.chatroomId ? 0 : msg.id,
          chatroomMessageId: contract.chatroomId ? msg.id : 0,
        });
      };

      const actionText = isUrlAvailable
        ? "点击查看"
        : isDownloading
          ? "下载中..."
          : "下载";
      const actionDisabled = !isUrlAvailable && isDownloading;

      const handleActionClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (isUrlAvailable) {
          try {
            window.open(url, "_blank");
          } catch (e) {
            console.error("文件打开失败:", e);
          }
          return;
        }
        handleFileDownload();
      };

      return (
        <div className={styles.fileMessage}>
          <div
            className={styles.fileCard}
            onClick={() => {
              if (isUrlAvailable) {
                window.open(url, "_blank");
              } else if (!isDownloading) {
                handleFileDownload();
              }
            }}
          >
            <div className={styles.fileIcon}>{fileIcon}</div>
            <div className={styles.fileInfo}>
              <div className={styles.fileName}>
                {resolvedFileName.length > 20
                  ? resolvedFileName.substring(0, 20) + "..."
                  : resolvedFileName}
              </div>
              <div
                className={`${styles.fileAction} ${
                  actionDisabled ? styles.fileActionDisabled : ""
                }`}
                onClick={handleActionClick}
              >
                {actionText}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return renderErrorMessage("[小程序/文件消息]");
  } catch (e) {
    console.warn("小程序/文件消息解析失败:", e);
    return renderErrorMessage("[小程序/文件消息 - 解析失败]");
  }
};

export default SmallProgramMessage;
