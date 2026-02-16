import React, { useState, useEffect } from "react";
import { Upload, message, Button } from "antd";
import {
  LoadingOutlined,
  PictureOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import type { UploadProps, UploadFile } from "antd/es/upload/interface";
import style from "./index.module.scss";

interface MainImgUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  className?: string;
  maxSize?: number; // 最大文件大小(MB)
  showPreview?: boolean; // 是否显示预览
}

const MainImgUpload: React.FC<MainImgUploadProps> = ({
  value = "",
  onChange,
  disabled = false,
  className,
  maxSize = 5,
  showPreview = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (value) {
      const files: UploadFile[] = [
        {
          uid: "main-img",
          name: "main-image",
          status: "done",
          url: value,
        },
      ];
      setFileList(files);
    } else {
      setFileList([]);
    }
  }, [value]);

  // 文件验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("只能上传图片文件！");
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过${maxSize}MB！`);
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
    } else if (info.file.status === "done") {
      setLoading(false);
      message.success("图片上传成功！");

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
        onChange?.(uploadedUrl);
      }
    } else if (info.file.status === "error") {
      setLoading(false);
      message.error("上传失败，请重试");
    } else if (info.file.status === "removed") {
      onChange?.("");
    }
  };

  // 删除文件
  const handleRemove = () => {
    setFileList([]);
    onChange?.("");
    message.success("图片已删除");
    return true;
  };

  // 预览图片
  const handlePreview = (url: string) => {
    // 使用自定义全屏预览，确保不受父级容器限制
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `;

    const img = document.createElement("img");
    img.src = url;
    img.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
    `;

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    modal.addEventListener("click", closeModal);
    modal.appendChild(img);
    document.body.appendChild(modal);

    // 添加键盘事件监听
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 自定义上传按钮
  const uploadButton = (
    <div className={style.mainImgUploadButton}>
      {loading ? (
        <div className={style.uploadingContainer}>
          <div className={style.uploadingIcon}>
            <LoadingOutlined spin />
          </div>
          <div className={style.uploadingText}>上传中...</div>
        </div>
      ) : (
        <div className={style.uploadContent}>
          <div className={style.uploadIcon}>
            <CloudUploadOutlined />
          </div>
          <div className={style.uploadText}>
            <div className={style.uploadTitle}>上传主图封面</div>
            <div className={style.uploadSubtitle}>
              支持 JPG、PNG、GIF 等格式，最大 {maxSize}MB
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
        <div className={style.mainImgItem}>
          <div className={style.mainImgItemContent}>
            <div className={style.mainImgIcon}>
              <PictureOutlined />
            </div>
            <div className={style.mainImgInfo}>
              <div className={style.mainImgName}>{file.name}</div>
              <div className={style.mainImgSize}>
                {file.size ? formatFileSize(file.size) : "计算中..."}
              </div>
            </div>
            <div className={style.mainImgActions}>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove()}
                className={style.deleteBtn}
              />
            </div>
          </div>
        </div>
      );
    }

    if (file.status === "done") {
      return (
        <div className={style.mainImgItem}>
          <div className={style.mainImgItemContent}>
            <div className={style.mainImgIcon}>
              <PictureOutlined />
            </div>
            <div className={style.mainImgInfo}>
              <div className={style.mainImgName}>{file.name}</div>
              <div className={style.mainImgSize}>
                {file.size ? formatFileSize(file.size) : "未知大小"}
              </div>
            </div>
            <div className={style.mainImgActions}>
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
                onClick={() => handleRemove()}
                className={style.deleteBtn}
              />
            </div>
          </div>
          <div
            className={style.mainImgPreview}
            onClick={e => {
              // 阻止事件冒泡，防止触发删除操作
              e.stopPropagation();
              // 点击图片预览区域时，触发文件选择
              const uploadInput = document.querySelector(
                'input[type="file"]',
              ) as HTMLInputElement;
              if (uploadInput) {
                uploadInput.click();
              }
            }}
          >
            <img
              src={file.url}
              alt={file.name}
              className={style.mainImgImage}
            />
            <div className={style.mainImgOverlay}>
              <div className={style.mainImgActions}>
                {showPreview && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={e => {
                      e.stopPropagation();
                      handlePreview(file.url || "");
                    }}
                    className={style.previewBtn}
                  />
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={e => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className={style.deleteBtn}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return originNode;
  };

  const action = import.meta.env.VITE_API_BASE_URL + "/v1/attachment/upload";

  return (
    <div className={`${style.mainImgUploadContainer} ${className || ""}`}>
      <Upload
        name="file"
        headers={{
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }}
        action={action}
        multiple={false}
        fileList={fileList}
        accept="image/*"
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
        maxCount={1}
        itemRender={customItemRender}
      >
        {fileList.length >= 1 ? null : uploadButton}
      </Upload>
    </div>
  );
};

export default MainImgUpload;
