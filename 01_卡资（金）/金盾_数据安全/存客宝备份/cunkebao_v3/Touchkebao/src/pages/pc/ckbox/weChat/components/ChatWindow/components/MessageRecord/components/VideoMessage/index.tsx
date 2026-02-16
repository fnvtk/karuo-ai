import React from "react";
import { DownloadOutlined, PlayCircleFilled } from "@ant-design/icons";
import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import styles from "./VideoMessage.module.scss";

interface VideoMessageProps {
  content: string;
  msg: ChatRecord;
  contract: ContractData | weChatGroup;
}

const VideoMessage: React.FC<VideoMessageProps> = ({
  content,
  msg,
  contract,
}) => {
  // 检测是否为直接视频链接的函数
  const isDirectVideoLink = (content: string): boolean => {
    const trimmedContent = content.trim();
    return (
      trimmedContent.startsWith("http") &&
      (trimmedContent.includes(".mp4") ||
        trimmedContent.includes(".mov") ||
        trimmedContent.includes(".avi") ||
        trimmedContent.includes("video"))
    );
  };

  // 处理视频播放请求，发送socket请求获取真实视频地址
  const handleVideoPlayRequest = (tencentUrl: string, messageId: number) => {
    console.log("发送视频下载请求:", { messageId, tencentUrl });

    // 先设置加载状态
    useWeChatStore.getState().setVideoLoading(messageId, true);

    // 构建socket请求数据
    useWebSocketStore.getState().sendCommand("CmdDownloadVideo", {
      chatroomMessageId: contract.chatroomId ? messageId : 0,
      friendMessageId: contract.chatroomId ? 0 : messageId,
      seq: `${+new Date()}`, // 使用时间戳作为请求序列号
      tencentUrl: tencentUrl,
      wechatAccountId: contract.wechatAccountId,
    });
  };

  // 渲染错误消息
  const renderErrorMessage = (message: string) => (
    <div className={styles.messageText}>{message}</div>
  );

  if (typeof content !== "string" || !content.trim()) {
    return renderErrorMessage("[视频消息 - 无效内容]");
  }

  // 如果content是直接的视频链接（已预览过或下载好的视频）
  if (isDirectVideoLink(content)) {
    return (
      <div className={styles.videoMessage}>
        <div className={styles.videoContainer}>
          <video
            controls
            src={content}
            style={{ maxWidth: "100%", borderRadius: "8px" }}
          />
          <a
            href={content}
            download
            className={styles.downloadButton}
            style={{ display: "flex" }}
            onClick={e => e.stopPropagation()}
          >
            <DownloadOutlined style={{ fontSize: "18px" }} />
          </a>
        </div>
      </div>
    );
  }

  try {
    // 尝试解析JSON格式的视频数据
    if (content.startsWith("{") && content.endsWith("}")) {
      const videoData = JSON.parse(content);

      // 验证必要的视频数据字段
      if (
        videoData &&
        typeof videoData === "object" &&
        videoData.previewImage &&
        videoData.tencentUrl
      ) {
        const previewImageUrl = String(videoData.previewImage).replace(
          /[`"']/g,
          "",
        );

        // 创建点击处理函数
        const handlePlayClick = (e: React.MouseEvent, msg: ChatRecord) => {
          e.stopPropagation();
          // 如果没有视频URL且不在加载中，则发起下载请求
          if (!videoData.videoUrl && !videoData.isLoading) {
            handleVideoPlayRequest(videoData.tencentUrl, msg.id);
          }
        };

        // 如果已有视频URL，显示视频播放器
        if (videoData.videoUrl) {
          return (
            <div className={styles.videoMessage}>
              <div className={styles.videoContainer}>
                <video
                  controls
                  src={videoData.videoUrl}
                  style={{ maxWidth: "100%", borderRadius: "8px" }}
                />
                <a
                  href={videoData.videoUrl}
                  download
                  className={styles.downloadButton}
                  style={{ display: "flex" }}
                  onClick={e => e.stopPropagation()}
                >
                  <DownloadOutlined style={{ fontSize: "18px" }} />
                </a>
              </div>
            </div>
          );
        }

        // 显示预览图，根据加载状态显示不同的图标
        return (
          <div className={styles.videoMessage}>
            <div
              className={styles.videoContainer}
              onClick={e => handlePlayClick(e, msg)}
            >
              <img
                src={previewImageUrl}
                alt="视频预览"
                className={styles.videoThumbnail}
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  opacity: videoData.isLoading ? "0.7" : "1",
                }}
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement?.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="${styles.messageText}">[视频预览加载失败]</div>`;
                  }
                }}
              />
              <div className={styles.videoPlayIcon}>
                {videoData.isLoading ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
                  <PlayCircleFilled
                    style={{ fontSize: "48px", color: "#fff" }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      }
    }
    return renderErrorMessage("[视频消息]");
  } catch (e) {
    console.warn("视频消息解析失败:", e);
    return renderErrorMessage("[视频消息 - 解析失败]");
  }
};

export default VideoMessage;
