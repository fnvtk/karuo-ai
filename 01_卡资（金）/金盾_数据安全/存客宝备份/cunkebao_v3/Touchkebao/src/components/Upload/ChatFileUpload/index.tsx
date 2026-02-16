import React, { useRef, useState } from "react";
import { Button, message } from "antd";
import {
  PaperClipOutlined,
  LoadingOutlined,
  FileOutlined,
  FileImageOutlined,
  FileVideoOutlined,
  FileAudioOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
} from "@ant-design/icons";
import { uploadFile } from "@/api/common";
import style from "./index.module.scss";

interface ChatFileUploadProps {
  onFileUploaded?: (fileInfo: {
    url: string;
    name: string;
    type: string;
    size: number;
  }) => void;
  disabled?: boolean;
  className?: string;
  maxSize?: number; // 最大文件大小(MB)
  accept?: string; // 接受的文件类型
  buttonText?: string;
  buttonIcon?: React.ReactNode;
}

const ChatFileUpload: React.FC<ChatFileUploadProps> = ({
  onFileUploaded,
  disabled = false,
  className,
  maxSize = 50, // 默认50MB
  accept = "*/*", // 默认接受所有文件类型
  buttonText = "发送文件",
  buttonIcon = <PaperClipOutlined />,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 获取文件图标
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith("image/")) {
      return <FileImageOutlined />;
    } else if (type.startsWith("video/")) {
      return <FileVideoOutlined />;
    } else if (type.startsWith("audio/")) {
      return <FileAudioOutlined />;
    } else if (type === "application/pdf") {
      return <FilePdfOutlined />;
    } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
      return <FileWordOutlined />;
    } else if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
      return <FileExcelOutlined />;
    } else if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
      return <FilePptOutlined />;
    } else {
      return <FileOutlined />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 验证文件
  const validateFile = (file: File): boolean => {
    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      return false;
    }

    // 检查文件类型（如果指定了accept）
    if (accept !== "*/*") {
      const acceptTypes = accept.split(",").map(type => type.trim());
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      const isValidType = acceptTypes.some(type => {
        if (type.startsWith(".")) {
          // 扩展名匹配
          return fileName.endsWith(type);
        } else if (type.includes("*")) {
          // MIME类型通配符匹配
          const baseType = type.replace("*", "");
          return fileType.startsWith(baseType);
        } else {
          // 精确MIME类型匹配
          return fileType === type;
        }
      });

      if (!isValidType) {
        message.error(`不支持的文件类型: ${file.type}`);
        return false;
      }
    }

    return true;
  };

  // 处理文件选择
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // 验证文件
    if (!validateFile(file)) {
      // 清空input值，允许重新选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);

    try {
      // 上传文件
      const fileUrl = await uploadFile(file);

      // 调用回调函数，传递文件信息
      onFileUploaded?.({
        url: fileUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      message.success("文件上传成功");
    } catch (error: any) {
      message.error(error.message || "文件上传失败");
    } finally {
      setUploading(false);
      // 清空input值，允许重新选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 触发文件选择
  const handleClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={`${style.chatFileUpload} ${className || ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Button
        type="text"
        icon={uploading ? <LoadingOutlined /> : buttonIcon}
        onClick={handleClick}
        disabled={disabled || uploading}
        className={style.uploadButton}
        title={buttonText}
      >
        {buttonText}
      </Button>
    </div>
  );
};

export default ChatFileUpload;
