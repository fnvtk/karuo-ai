import React, { useState, useRef, useCallback } from "react";
import { Button, message, Modal } from "antd";
import {
  AudioOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SendOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { uploadFile } from "@/api/common";

interface AudioRecorderProps {
  onAudioUploaded: (audioData: { url: string; durationMs: number }) => void;
  className?: string;
  disabled?: boolean;
  maxDuration?: number; // 最大录音时长（秒）
}

type RecordingState =
  | "idle"
  | "recording"
  | "recorded"
  | "playing"
  | "uploading";

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioUploaded,
  className,
  disabled = false,
  maxDuration = 60,
}) => {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 打开弹窗
  const openRecorder = () => {
    setVisible(true);
  };

  // 关闭弹窗并重置状态
  const closeRecorder = () => {
    if (state === "recording") {
      stopRecording();
    }
    if (state === "playing") {
      pauseAudio();
    }
    deleteRecording();
    setVisible(false);
  };

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 尝试使用MP3格式，如果不支持则回退到WebM
      const mp3Types = [
        "audio/mpeg",
        "audio/mp3",
        "audio/mpeg; codecs=mp3",
        "audio/mp4",
        "audio/mp4; codecs=mp4a.40.2",
      ];

      let mimeType = "audio/webm"; // 默认回退格式

      // 检测并选择支持的MP3格式
      for (const type of mp3Types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`使用音频格式: ${type}`);
          break;
        }
      }

      if (mimeType === "audio/webm") {
        console.log("浏览器不支持MP3格式，使用WebM格式");
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");

        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState("recording");
      setRecordingTime(0);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error("录音失败:", error);
      message.error("无法访问麦克风，请检查权限设置");
    }
  }, [maxDuration]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 播放录音
  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setState("playing");
    }
  }, [audioUrl]);

  // 暂停播放
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState("recorded");
    }
  }, []);

  // 删除录音
  const deleteRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl("");
    setRecordingTime(0);
    setState("idle");
  }, [audioUrl]);

  // 发送录音
  const sendAudio = useCallback(async () => {
    if (!audioBlob) return;

    try {
      setState("uploading");

      // 创建文件对象
      const timestamp = Date.now();
      const fileExtension =
        audioBlob.type.includes("mp3") ||
        audioBlob.type.includes("mpeg") ||
        audioBlob.type.includes("mp4")
          ? "mp3"
          : "webm";
      const audioFile = new File(
        [audioBlob],
        `audio_${timestamp}.${fileExtension}`,
        {
          type: audioBlob.type,
        },
      );

      // 打印文件格式信息
      console.log("音频文件信息:", {
        fileName: audioFile.name,
        fileType: audioFile.type,
        fileSize: audioFile.size,
        fileExtension: fileExtension,
        blobType: audioBlob.type,
      });

      // 上传文件
      const filePath = await uploadFile(audioFile);

      // 调用回调函数，传递音频URL和时长（毫秒）
      onAudioUploaded({
        url: filePath,
        durationMs: recordingTime * 1000, // 将秒转换为毫秒
      });

      // 重置状态并关闭弹窗
      deleteRecording();
      setVisible(false);
      message.success("语音发送成功");
    } catch (error) {
      console.error("语音上传失败:", error);
      message.error("语音发送失败，请重试");
      setState("recorded");
    }
  }, [audioBlob, onAudioUploaded, deleteRecording]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 渲染弹窗内容
  const renderModalContent = () => {
    switch (state) {
      case "idle":
        return (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div
              style={{ marginBottom: "20px", fontSize: "16px", color: "#666" }}
            >
              点击下方按钮开始录音
            </div>
            <Button
              type="primary"
              size="large"
              icon={<AudioOutlined />}
              onClick={startRecording}
              style={{
                borderRadius: "50%",
                width: "80px",
                height: "80px",
                fontSize: "24px",
              }}
            />
          </div>
        );

      case "recording":
        return (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "24px",
                  color: "#ff4d4f",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                {formatTime(recordingTime)}
              </div>
              <div style={{ fontSize: "14px", color: "#999" }}>
                正在录音中...
              </div>
            </div>
            <Button
              type="primary"
              danger
              size="large"
              onClick={stopRecording}
              style={{
                borderRadius: "50%",
                width: "80px",
                height: "80px",
                fontSize: "24px",
              }}
            >
              ⏹
            </Button>
          </div>
        );

      case "recorded":
      case "playing":
        return (
          <div style={{ padding: "20px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                录音时长: {formatTime(recordingTime)}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>
                {state === "playing"
                  ? "正在播放..."
                  : "录音完成，可以试听或发送"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <Button
                type="text"
                size="large"
                icon={
                  state === "playing" ? (
                    <PauseCircleOutlined />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                onClick={state === "playing" ? pauseAudio : playAudio}
                title={state === "playing" ? "暂停播放" : "播放预览"}
              />
              <Button
                type="text"
                size="large"
                icon={<DeleteOutlined />}
                onClick={deleteRecording}
                title="删除重录"
                danger
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={sendAudio}
                loading={state === ("uploading" as RecordingState)}
                style={{ minWidth: "120px" }}
              >
                发送录音
              </Button>
            </div>
          </div>
        );

      case "uploading":
        return (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Button
              type="primary"
              loading
              size="large"
              style={{ minWidth: "120px" }}
            >
              发送中...
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Button
        type="text"
        icon={<AudioOutlined />}
        onClick={openRecorder}
        className={className}
        disabled={disabled}
        title="点击录音"
      />

      <Modal
        title="录音"
        open={visible}
        onCancel={closeRecorder}
        footer={null}
        width={400}
        centered
        maskClosable={state === "idle"}
      >
        {renderModalContent()}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setState("recorded")}
            style={{ display: "none" }}
          />
        )}
      </Modal>
    </>
  );
};

export default AudioRecorder;
