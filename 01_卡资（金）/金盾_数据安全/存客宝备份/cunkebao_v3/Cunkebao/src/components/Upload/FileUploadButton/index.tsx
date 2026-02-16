import React, { useState } from "react";
import { Upload, message, Button } from "antd";
import {
  LoadingOutlined,
  CloudUploadOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd/es/upload/interface";
import style from "./index.module.scss";

export interface FileUploadResult {
  fileName: string; // 文件名
  fileUrl: string; // 文件URL
}

interface FileUploadProps {
  onChange?: (result: FileUploadResult) => void; // 上传成功后的回调，返回文件名和URL
  disabled?: boolean;
  className?: string;
  maxSize?: number; // 最大文件大小(MB)
  acceptTypes?: string[]; // 接受的文件类型
  buttonText?: string; // 按钮文本
  buttonType?: "default" | "primary" | "dashed" | "text" | "link"; // 按钮类型
  block?: boolean;
  size?: "small" | "middle" | "large";
  showSuccessMessage?: boolean; // 是否显示上传成功提示，默认不显示
}

const FileUpload: React.FC<FileUploadProps> = ({
  onChange,
  disabled = false,
  className,
  maxSize = 10,
  acceptTypes = ["excel", "word", "ppt"],
  buttonText = "上传文件",
  buttonType = "primary",
  block = false,
  size = "middle",
  showSuccessMessage = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>(""); // 保存文件名

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
    doc: {
      accept: ".doc,.docx",
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ],
      icon: FileWordOutlined,
      name: "Word文件",
      extensions: ["doc", "docx"],
    },
    docx: {
      accept: ".docx,.doc",
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ],
      icon: FileWordOutlined,
      name: "Word文件",
      extensions: ["docx", "doc"],
    },
    md: {
      accept: ".md",
      mimeTypes: ["text/markdown"],
      icon: FileOutlined,
      name: "Markdown文件",
      extensions: ["md"],
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
      for (const [, config] of Object.entries(fileTypeConfig)) {
        if (config.extensions.includes(extension)) {
          return config;
        }
      }
    }

    return null;
  };

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
    };
    return extensionNames[type] || `${type.toUpperCase()}文件`;
  };

  // 文件验证
  const beforeUpload = (file: File) => {
    // 保存文件名
    setFileName(file.name);

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
    // 处理上传状态
    if (info.file.status === "uploading") {
      setLoading(true);
    } else if (info.file.status === "done") {
      setLoading(false);
      if (showSuccessMessage) {
        message.success("文件上传成功！");
      }

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

      // 获取文件名，优先使用保存的文件名，如果没有则使用文件对象的名称
      const finalFileName = fileName || info.file.name || "";

      if (uploadedUrl && finalFileName) {
        onChange?.({
          fileName: finalFileName,
          fileUrl: uploadedUrl,
        });
        // 清空保存的文件名，为下次上传做准备
        setFileName("");
      }
    } else if (info.file.status === "error") {
      setLoading(false);
      message.error("上传失败，请重试");
      // 清空保存的文件名
      setFileName("");
    }
  };

  const action = import.meta.env.VITE_API_BASE_URL + "/v1/attachment/upload";

  return (
    <div className={style.uploadButtonWrapper}>
      <Upload
        name="file"
        headers={{
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }}
        action={action}
        accept={generateAcceptString()}
        showUploadList={false}
        disabled={disabled || loading}
        beforeUpload={beforeUpload}
        onChange={handleChange}
      >
        <Button
          type={buttonType}
          icon={loading ? <LoadingOutlined /> : <CloudUploadOutlined />}
          loading={loading}
          disabled={disabled}
          className={style.uploadButton}
          block
          size={size}
        >
          {buttonText}
        </Button>
      </Upload>
    </div>
  );
};

export default FileUpload;
