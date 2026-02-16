import React, { useState } from "react";
import { Upload, message, Progress, Button, Modal } from "antd";
import {
  LoadingOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import type { UploadProps, UploadFile } from "antd/es/upload/interface";
import style from "./index.module.scss";

interface VideoUploadProps {
  value?: string | string[]; // 支持单个字符串或字符串数组
  onChange?: (url: string | string[]) => void; // 支持单个字符串或字符串数组
  disabled?: boolean;
  className?: string;
  maxSize?: number; // 最大文件大小(MB)
  showPreview?: boolean; // 是否显示预览
  maxCount?: number; // 最大上传数量，默认为1
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  value = "",
  onChange,
  disabled = false,
  className,
  maxSize = 50,
  showPreview = true,
  maxCount = 1,
}) => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  React.useEffect(() => {
    if (value) {
      // 处理单个字符串或字符串数组
      const urls = Array.isArray(value) ? value : [value];
      const files: UploadFile[] = urls.map((url, index) => ({
        uid: `file-${index}`,
        name: `video-${index + 1}`,
        status: "done",
        url: url || "",
      }));
      setFileList(files);
    } else {
      setFileList([]);
    }
  }, [value]);

  // 文件验证
  const beforeUpload = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    if (!isVideo) {
      message.error("只能上传视频文件！");
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`视频大小不能超过${maxSize}MB！`);
      return false;
    }

    return true;
  };

  // 处理文件变化
  const handleChange: UploadProps["onChange"] = info => {
    // 更新 fileList，确保所有 URL 都是字符串
    const updatedFileList = info.fileList.map(file => {
      let url = "";

      if (file.url) {
        url = file.url;
      } else if (file.response) {
        // 处理响应对象
        if (typeof file.response === "string") {
          url = file.response;
        } else if (file.response.data) {
          url =
            typeof file.response.data === "string"
              ? file.response.data
              : file.response.data.url || "";
        } else if (file.response.url) {
          url = file.response.url;
        }
      }

      return {
        ...file,
        url: url,
      };
    });

    setFileList(updatedFileList);

    // 处理上传状态
    if (info.file.status === "uploading") {
      setLoading(true);
      // 模拟上传进度
      const progress = Math.min(99, Math.random() * 100);
      setUploadProgress(progress);
    } else if (info.file.status === "done") {
      setLoading(false);
      setUploadProgress(100);
      message.success("视频上传成功！");

      // 从响应中获取上传后的URL
      let uploadedUrl = "";

      if (info.file.response) {
        if (typeof info.file.response === "string") {
          uploadedUrl = info.file.response;
        } else if (info.file.response.data) {
          uploadedUrl =
            typeof info.file.response.data === "string"
              ? info.file.response.data
              : info.file.response.data.url || "";
        } else if (info.file.response.url) {
          uploadedUrl = info.file.response.url;
        }
      }

      if (uploadedUrl) {
        if (maxCount === 1) {
          // 单个视频模式
          onChange?.(uploadedUrl);
        } else {
          // 多个视频模式
          const currentUrls = Array.isArray(value)
            ? value
            : value
              ? [value]
              : [];
          const newUrls = [...currentUrls, uploadedUrl];
          onChange?.(newUrls);
        }
      }
    } else if (info.file.status === "error") {
      setLoading(false);
      setUploadProgress(0);
      message.error("上传失败，请重试");
    } else if (info.file.status === "removed") {
      if (maxCount === 1) {
        onChange?.("");
      } else {
        // 多个视频模式，移除对应的视频
        const currentUrls = Array.isArray(value) ? value : value ? [value] : [];
        const removedIndex = info.fileList.findIndex(
          f => f.uid === info.file.uid,
        );
        if (removedIndex !== -1) {
          const newUrls = currentUrls.filter(
            (_, index) => index !== removedIndex,
          );
          onChange?.(newUrls);
        }
      }
    }
  };

  // 删除文件
  const handleRemove = (file?: UploadFile) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个视频文件吗？",
      okText: "确定",
      cancelText: "取消",
      onOk: () => {
        if (maxCount === 1) {
          setFileList([]);
          onChange?.("");
        } else if (file) {
          // 多个视频模式，删除指定视频
          const currentUrls = Array.isArray(value)
            ? value
            : value
              ? [value]
              : [];
          const fileIndex = fileList.findIndex(f => f.uid === file.uid);
          if (fileIndex !== -1) {
            const newUrls = currentUrls.filter(
              (_, index) => index !== fileIndex,
            );
            onChange?.(newUrls);
          }
        }
        message.success("视频已删除");
      },
    });
    return true;
  };

  // 预览视频
  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewVisible(true);
  };

  // 获取文件大小显示
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 自定义上传按钮
  const uploadButton = (
    <div className={style.videoUploadButton}>
      {loading ? (
        <div className={style.uploadingContainer}>
          <div className={style.uploadingIcon}>
            <LoadingOutlined spin />
          </div>
          <div className={style.uploadingText}>上传中...</div>
          <Progress
            percent={uploadProgress}
            size="small"
            showInfo={false}
            strokeColor="#1890ff"
            className={style.uploadProgress}
          />
        </div>
      ) : (
        <div className={style.uploadContent}>
          <div className={style.uploadIcon}>
            <CloudUploadOutlined />
          </div>
          <div className={style.uploadText}>
            <div className={style.uploadTitle}>
              {maxCount === 1
                ? "上传视频"
                : `上传视频 (${fileList.length}/${maxCount})`}
            </div>
            <div className={style.uploadSubtitle}>
              支持 MP4、AVI、MOV 等格式，最大 {maxSize}MB
              {maxCount > 1 && `，最多上传 ${maxCount} 个视频`}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 自定义文件列表项
  const customItemRender = (
    originNode: React.ReactElement,
    file: UploadFile,
  ) => {
    if (file.status === "uploading") {
      return (
        <div className={style.videoItem}>
          <div className={style.videoItemContent}>
            <div className={style.videoIcon}>
              <FileOutlined />
            </div>
            <div className={style.videoInfo}>
              <div className={style.videoName}>{file.name}</div>
              <div className={style.videoSize}>
                {file.size ? formatFileSize(file.size) : "计算中..."}
              </div>
            </div>
            <div className={style.videoActions}>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(file)}
                className={style.deleteBtn}
              />
            </div>
          </div>
          <Progress
            percent={uploadProgress}
            size="small"
            strokeColor="#1890ff"
            className={style.itemProgress}
          />
        </div>
      );
    }

    if (file.status === "done") {
      return (
        <div className={style.videoItem}>
          <div className={style.videoItemContent}>
            <div className={style.videoIcon}>
              <PlayCircleOutlined />
            </div>
            <div className={style.videoInfo}>
              <div className={style.videoName}>{file.name}</div>
              <div className={style.videoSize}>
                {file.size ? formatFileSize(file.size) : "未知大小"}
              </div>
            </div>
            <div className={style.videoActions}>
              {showPreview && (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file.url || "")}
                  className={style.previewBtn}
                />
              )}
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(file)}
                className={style.deleteBtn}
              />
            </div>
          </div>
        </div>
      );
    }

    return originNode;
  };

  const action = import.meta.env.VITE_API_BASE_URL + "/v1/attachment/upload";

  return (
    <div className={`${style.videoUploadContainer} ${className || ""}`}>
      <Upload
        name="file"
        headers={{
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }}
        action={action}
        multiple={maxCount > 1}
        fileList={fileList}
        accept="video/*"
        listType="text"
        showUploadList={{
          showPreviewIcon: false,
          showRemoveIcon: false,
          showDownloadIcon: false,
        }}
        disabled={disabled || loading}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        onRemove={handleRemove}
        maxCount={maxCount}
        itemRender={customItemRender}
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      {/* 视频预览模态框 */}
      <Modal
        title="视频预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div className={style.videoPreview}>
          <video
            controls
            style={{ width: "100%", maxHeight: "400px" }}
            src={previewUrl}
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      </Modal>
    </div>
  );
};

export default VideoUpload;
