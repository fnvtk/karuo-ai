import React, { useState, useRef } from "react";
import { PauseCircleFilled, SoundOutlined } from "@ant-design/icons";
import styles from "./AudioMessage.module.scss";

interface AudioMessageProps {
  audioUrl: string;
  msgId: string;
}

interface AudioData {
  durationMs?: number;
  url: string;
  text?: string;
}

// 解析音频URL，支持两种格式：纯URL字符串和JSON字符串
const parseAudioUrl = (audioUrl: string): AudioData => {
  try {
    // 尝试解析为JSON
    const parsed = JSON.parse(audioUrl);
    if (parsed.url) {
      return {
        durationMs: parsed.durationMs,
        url: parsed.url,
        text: parsed.text,
      };
    }
  } catch (error) {
    // 如果解析失败，说明是纯URL字符串
  }

  // 返回纯URL格式
  return {
    url: audioUrl,
  };
};

// 测试音频URL是否可访问（避免CORS问题）
const testAudioUrl = async (url: string): Promise<boolean> => {
  try {
    // 对于阿里云OSS等外部资源，直接返回true，让Audio对象自己处理
    // 避免fetch HEAD请求触发CORS问题
    if (url.includes(".aliyuncs.com") || url.includes("oss-")) {
      return true;
    }

    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    // 如果fetch失败（可能是CORS问题），返回true让Audio对象尝试加载
    return true;
  }
};

const AudioMessage: React.FC<AudioMessageProps> = ({ audioUrl, msgId }) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>(
    {},
  );
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // 解析音频数据
  const audioData = parseAudioUrl(audioUrl);
  const actualAudioUrl = audioData.url;
  const audioDuration = audioData.durationMs;
  const audioText = audioData.text;

  const audioId = `audio_${msgId}_${Date.now()}`;
  const isPlaying = playingAudioId === audioId;
  const progress = audioProgress[audioId] || 0;

  // 格式化时长显示
  const formatDuration = (ms?: number): string => {
    if (!ms) return "语音";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // 播放/暂停音频
  const handleAudioToggle = async () => {
    const audio = audioRefs.current[audioId];
    if (!audio) {
      // 先测试URL是否可访问
      const isUrlAccessible = await testAudioUrl(actualAudioUrl);
      if (!isUrlAccessible) {
        setAudioError("音频文件无法访问，请检查网络连接");
        return;
      }

      // 清除之前的错误状态
      setAudioError(null);

      const newAudio = new Audio();

      // 对于阿里云OSS等外部资源，不设置crossOrigin避免CORS问题
      // 只有在需要访问音频数据时才设置crossOrigin
      if (
        !actualAudioUrl.includes(".aliyuncs.com") &&
        !actualAudioUrl.includes("oss-")
      ) {
        newAudio.crossOrigin = "anonymous";
      }
      newAudio.preload = "metadata";

      audioRefs.current[audioId] = newAudio;

      newAudio.addEventListener("timeupdate", () => {
        const currentProgress =
          (newAudio.currentTime / newAudio.duration) * 100;
        setAudioProgress(prev => ({
          ...prev,
          [audioId]: currentProgress,
        }));
      });

      newAudio.addEventListener("ended", () => {
        setPlayingAudioId(null);
        setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
      });

      newAudio.addEventListener("error", e => {
        setPlayingAudioId(null);
        setAudioError("音频播放失败，请稍后重试");
      });

      // 设置音频源并尝试播放
      newAudio.src = actualAudioUrl;

      try {
        await newAudio.play();
        setPlayingAudioId(audioId);
      } catch (error) {
        setPlayingAudioId(null);
        setAudioError("音频播放失败，请检查音频格式或网络连接");
        console.error("音频播放错误:", error);
      }
    } else {
      if (isPlaying) {
        audio.pause();
        setPlayingAudioId(null);
      } else {
        // 停止其他正在播放的音频
        Object.values(audioRefs.current).forEach(a => a.pause());
        setPlayingAudioId(null);

        try {
          await audio.play();
          setPlayingAudioId(audioId);
        } catch (error) {
          setPlayingAudioId(null);
          setAudioError("音频播放失败，请稍后重试");
        }
      }
    }
  };

  return (
    <>
      <div className={styles.messageBubble}>
        {audioError && (
          <div
            className={styles.audioError}
            onClick={() => {
              setAudioError(null);
              handleAudioToggle();
            }}
            style={{ cursor: "pointer" }}
            title="点击重试"
          >
            {audioError} (点击重试)
          </div>
        )}
        <div className={styles.audioMessage}>
          <div className={styles.audioContainer} onClick={handleAudioToggle}>
            <div className={styles.audioIcon}>
              {isPlaying ? (
                <PauseCircleFilled
                  style={{ fontSize: "20px", color: "#1890ff" }}
                />
              ) : (
                <SoundOutlined style={{ fontSize: "20px", color: "#666" }} />
              )}
            </div>
            <div className={styles.audioContent}>
              <div className={styles.audioWaveform}>
                {/* 音频波形效果 */}
                {Array.from({ length: 20 }, (_, i) => (
                  <div
                    key={i}
                    className={`${styles.waveBar} ${isPlaying ? styles.playing : ""}`}
                    style={{
                      height: `${Math.random() * 20 + 10}px`,
                      animationDelay: `${i * 0.1}s`,
                      backgroundColor: progress > i * 5 ? "#1890ff" : "#d9d9d9",
                    }}
                  />
                ))}
              </div>
              <div className={styles.audioDuration}>
                {formatDuration(audioDuration)}
              </div>
            </div>
          </div>
          {progress > 0 && (
            <div className={styles.audioProgress}>
              <div
                className={styles.audioProgressBar}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <div>
        {audioText && <div className={styles.audioText}>{audioText}</div>}
      </div>
    </>
  );
};

export default AudioMessage;
