import React, { useState } from "react";
import { Upload, message, Progress, Button, Modal } from "antd";
import {
  LoadingOutlined,
  FileOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloudUploadOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
} from "@ant-design/icons";
import type { UploadProps, UploadFile } from "antd/es/upload/interface";
import style from "./index.module.scss";

interface FileUploadProps {
  value?: string | string[]; // 支持单个字符串或字符串数组
  onChange?: (url: string | string[]) => void; // 支持单个字符串或字符串数组
  disabled?: boolean;
  className?: string;
  maxSize?: number; // 最大文件大小(MB)
  showPreview?: boolean; // 是否显示预览
  maxCount?: number; // 最大上传数量，默认为1
  acceptTypes?: string[]; // 接受的文件类型
}

const FileUpload: React.FC<FileUploadProps> = ({
  value = "",
  onChange,
  disabled = false,
  className,
  maxSize = 10,
  showPreview = true,
  maxCount = 1,
  acceptTypes = ["excel", "word", "ppt"],
}) => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  // 文件类型配置
  const fileTypeConfig = {
    excel: {
      accept: ".xlsx,.xls",
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ],
      icon: FileExcelOutlined,
      name: "Excel文件",
      extensions: ["xlsx", "xls"],
    },
    word: {
      accept: ".docx,.doc",
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ],
      icon: FileWordOutlined,
      name: "Word文件",
      extensions: ["docx", "doc"],
    },
    ppt: {
      accept: ".pptx,.ppt",
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
      ],
      icon: FilePptOutlined,
      name: "PPT文件",
      extensions: ["pptx", "ppt"],
    },
    pdf: {
      accept: ".pdf",
      mimeTypes: ["application/pdf"],
      icon: FileOutlined,
      name: "PDF文件",
      extensions: ["pdf"],
    },
    txt: {
      accept: ".txt",
      mimeTypes: ["text/plain"],
      icon: FileOutlined,
      name: "文本文件",
      extensions: ["txt"],
    },
    md: {
      accept: ".md",
      mimeTypes: ["text/markdown"],
      icon: FileOutlined,
      name: "Markdown文件",
      extensions: ["md"],
    },
    mp4: {
      accept: ".mp4",
      mimeTypes: ["video/mp4"],
      icon: FileOutlined,
      name: "MP4视频",
      extensions: ["mp4"],
    },
    avi: {
      accept: ".avi",
      mimeTypes: ["video/x-msvideo"],
      icon: FileOutlined,
      name: "AVI视频",
      extensions: ["avi"],
    },
  };

  // 生成accept字符串
  const generateAcceptString = () => {
    const accepts: string[] = [];

    for (const type of acceptTypes) {
      // 如果是配置中的类型键（如 "word", "pdf"）
      const config = fileTypeConfig[type as keyof typeof fileTypeConfig];
      if (config) {
        accepts.push(config.accept);
      } else {
        // 如果是扩展名（如 "doc", "docx"），直接添加
        accepts.push(`.${type}`);
      }
    }

    return accepts.filter(Boolean).join(",");
  };

  // 获取文件类型信息
  const getFileTypeInfo = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension) return null;

    // 首先尝试通过 acceptTypes 中指定的类型键来查找
    for (const type of acceptTypes) {
      const config = fileTypeConfig[type as keyof typeof fileTypeConfig];
      if (config && config.extensions.includes(extension)) {
        return config;
      }
    }

    // 如果 acceptTypes 中包含扩展名本身（如 "doc", "docx"），查找所有包含该扩展名的配置
    if (acceptTypes.includes(extension)) {
      for (const [key, config] of Object.entries(fileTypeConfig)) {
        if (config.extensions.includes(extension)) {
          return config;
        }
      }
    }

    return null;
  };

  // 获取文件图标
  const getFileIcon = (file: File) => {
    const typeInfo = getFileTypeInfo(file);
    return typeInfo ? typeInfo.icon : FileOutlined;
  };

  React.useEffect(() => {
    if (value) {
      // 处理单个字符串或字符串数组
      const urls = Array.isArray(value) ? value : [value];
      const files: UploadFile[] = urls.map((url, index) => ({
        uid: `file-${index}`,
        name: `document-${index + 1}`,
        status: "done",
        url: url || "",
      }));
      setFileList(files);
    } else {
      setFileList([]);
    }
  }, [value]);

  // 获取类型名称
  const getTypeName = (type: string) => {
    const config = fileTypeConfig[type as keyof typeof fileTypeConfig];
    if (config) return config.name;
    // 如果是扩展名，返回友好的名称
    const extensionNames: Record<string, string> = {
      doc: "Word文件",
      docx: "Word文件",
      pdf: "PDF文件",
      txt: "文本文件",
      md: "Markdown文件",
      mp4: "MP4视频",
      avi: "AVI视频",
    };
    return extensionNames[type] || `${type.toUpperCase()}文件`;
  };

  // 文件验证
  const beforeUpload = (file: File) => {
    const typeInfo = getFileTypeInfo(file);
    if (!typeInfo) {
      const allowedTypes = acceptTypes
        .map(type => getTypeName(type))
        .filter(Boolean)
        .join("、");
      message.error(`只能上传${allowedTypes}！`);
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`文件大小不能超过${maxSize}MB！`);
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
      message.success("文件上传成功！");

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
          // 单个文件模式
          onChange?.(uploadedUrl);
        } else {
          // 多个文件模式
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
        // 多个文件模式，移除对应的文件
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
      content: "确定要删除这个文件吗？",
      okText: "确定",
      cancelText: "取消",
      onOk: () => {
        if (maxCount === 1) {
          setFileList([]);
          onChange?.("");
        } else if (file) {
          // 多个文件模式，删除指定文件
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
        message.success("文件已删除");
      },
    });
    return true;
  };

  // 预览文件
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
    <div className={style.fileUploadButton}>
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
                ? "上传文档"
                : `上传文档 (${fileList.length}/${maxCount})`}
            </div>
            <div className={style.uploadSubtitle}>
              支持{" "}
              {acceptTypes
                .map(type => getTypeName(type))
                .filter(Boolean)
                .join("、")}
              ，最大 {maxSize}MB
              {maxCount > 1 && `，最多上传 ${maxCount} 个文件`}
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
    const FileIcon = file.originFileObj
      ? getFileIcon(file.originFileObj)
      : FileOutlined;

    if (file.status === "uploading") {
      return (
        <div className={style.fileItem}>
          <div className={style.fileItemContent}>
            <div className={style.fileIcon}>
              <FileIcon />
            </div>
            <div className={style.fileInfo}>
              <div className={style.fileName}>{file.name}</div>
              <div className={style.fileSize}>
                {file.size ? formatFileSize(file.size) : "计算中..."}
              </div>
            </div>
            <div className={style.fileActions}>
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
        <div className={style.fileItem}>
          <div className={style.fileItemContent}>
            <div className={style.fileIcon}>
              <FileIcon />
            </div>
            <div className={style.fileInfo}>
              <div className={style.fileName}>{file.name}</div>
              <div className={style.fileSize}>
                {file.size ? formatFileSize(file.size) : "未知大小"}
              </div>
            </div>
            <div className={style.fileActions}>
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
    <div className={`${style.fileUploadContainer} ${className || ""}`}>
      <Upload
        name="file"
        headers={{
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }}
        action={action}
        multiple={maxCount > 1}
        fileList={fileList}
        accept={generateAcceptString()}
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

      {/* 文件预览模态框 */}
      <Modal
        title="文件预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div className={style.filePreview}>
          <iframe
            src={previewUrl}
            style={{ width: "100%", height: "500px", border: "none" }}
            title="文件预览"
          />
        </div>
      </Modal>
    </div>
  );
};

export default FileUpload;
