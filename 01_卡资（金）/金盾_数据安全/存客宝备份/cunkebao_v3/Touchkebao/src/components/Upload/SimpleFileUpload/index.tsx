import { uploadFile } from "@/api/common";
import React, { useRef } from "react";
import { message } from "antd";

interface SimpleFileUploadProps {
  onFileUploaded?: (filePath: { name: string; url: string }) => void;
  maxSize?: number; // 最大文件大小(MB)
  type?: number; // 1: 图片, 2: 视频, 3: 音频, 4: 文件
  slot?: React.ReactNode;
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({
  onFileUploaded,
  maxSize = 50,
  slot,
  type = 4,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accept = {
    1: "image/*",
    2: "video/*",
    3: "audio/*",
    4: "*/*",
  };

  // 验证文件
  const validateFile = (file: File): boolean => {
    if (file.size > maxSize * 1024 * 1024) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      return false;
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

    if (!validateFile(file)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      const fileUrl = await uploadFile(file);
      onFileUploaded?.({
        name: file.name,
        url: fileUrl,
      });
      message.success("文件上传成功");
    } catch (error: any) {
      console.error("文件上传失败:", error);
      message.error(error.message || "文件上传失败");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept[type]}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <span onClick={handleClick}>{slot}</span>
    </>
  );
};

export default SimpleFileUpload;
