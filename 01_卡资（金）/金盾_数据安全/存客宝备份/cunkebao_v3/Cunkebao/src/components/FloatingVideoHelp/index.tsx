import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PlayCircleOutlined } from "@ant-design/icons";
import VideoPlayer from "./VideoPlayer";
import { getVideoUrlByRoute } from "./videoConfig";
import styles from "./index.module.scss";

interface FloatingVideoHelpProps {
  /** 是否显示悬浮窗，默认为 true */
  visible?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

const FloatingVideoHelp: React.FC<FloatingVideoHelpProps> = ({
  visible = true,
  className,
}) => {
  const location = useLocation();
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  // 根据当前路由获取视频URL
  useEffect(() => {
    const videoUrl = getVideoUrlByRoute(location.pathname);
    setCurrentVideoUrl(videoUrl);
  }, [location.pathname]);

  const handleClick = () => {
    if (currentVideoUrl) {
      setShowPlayer(true);
    } else {
      // 如果没有对应的视频，可以显示提示
      console.warn("当前路由没有对应的操作视频");
    }
  };

  const handleClose = () => {
    setShowPlayer(false);
  };

  // 如果没有视频URL，不显示悬浮窗
  if (!visible || !currentVideoUrl) {
    return null;
  }

  return (
    <>
      <div
        className={`${styles.floatingButton} ${className || ""}`}
        onClick={handleClick}
        title="查看操作视频"
      >
        <PlayCircleOutlined className={styles.icon} />
      </div>

      {showPlayer && currentVideoUrl && (
        <VideoPlayer
          videoUrl={currentVideoUrl}
          visible={showPlayer}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default FloatingVideoHelp;
