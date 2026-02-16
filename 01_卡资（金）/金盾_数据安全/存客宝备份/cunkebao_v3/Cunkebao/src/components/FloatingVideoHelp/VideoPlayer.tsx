import React, { useRef, useEffect } from "react";
import { CloseOutlined } from "@ant-design/icons";
import styles from "./VideoPlayer.module.scss";

interface VideoPlayerProps {
  /** 视频URL */
  videoUrl: string;
  /** 是否显示播放器 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 视频标题 */
  title?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  visible,
  onClose,
  title = "操作视频",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && videoRef.current) {
      // 播放器打开时播放视频
      videoRef.current.play().catch(err => {
        console.error("视频播放失败:", err);
      });
      // 阻止背景滚动
      document.body.style.overflow = "hidden";
    } else if (videoRef.current) {
      // 播放器关闭时暂停视频
      videoRef.current.pause();
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  // 点击遮罩层关闭
  const handleMaskClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 如果点击的是遮罩层本身（不是视频容器），则关闭
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  // 阻止事件冒泡
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={styles.modalMask}
      onClick={handleMaskClick}
    >
      <div className={styles.videoContainer} onClick={handleContentClick}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeButton} onClick={handleClose}>
            <CloseOutlined />
          </button>
        </div>
        <div className={styles.videoWrapper}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className={styles.video}
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5"
            x5-video-player-fullscreen="true"
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
