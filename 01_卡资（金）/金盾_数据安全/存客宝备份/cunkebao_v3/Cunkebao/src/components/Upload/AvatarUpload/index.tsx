import React, { useState, useEffect } from "react";
import { Toast, Dialog } from "antd-mobile";
import { UserOutlined, CameraOutlined } from "@ant-design/icons";
import style from "./index.module.scss";

interface AvatarUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  className?: string;
  size?: number; // 头像尺寸
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value = "",
  onChange,
  disabled = false,
  className,
  size = 100,
}) => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(value);

  useEffect(() => {
    setAvatarUrl(value);
  }, [value]);

  // 文件验证
  const beforeUpload = (file: File) => {
    // 检查文件类型
    const isValidType = file.type.startsWith("image/");
    if (!isValidType) {
      Toast.show("只能上传图片文件！");
      return null;
    }

    // 检查文件大小 (5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      Toast.show("图片大小不能超过5MB！");
      return null;
    }

    return file;
  };

  // 上传函数
  const upload = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/v1/attachment/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const result = await response.json();

      if (result.code === 200) {
        Toast.show("头像上传成功");
        // 确保返回的是字符串URL
        let url = "";
        if (typeof result.data === "string") {
          url = result.data;
        } else if (result.data && typeof result.data === "object") {
          url = result.data.url || "";
        }
        return { url };
      } else {
        throw new Error(result.msg || "上传失败");
      }
    } catch (error) {
      Toast.show("头像上传失败，请重试");
      throw error;
    }
  };

  // 处理头像上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled || uploading) return;

    const validatedFile = beforeUpload(file);
    if (!validatedFile) return;

    setUploading(true);
    try {
      const result = await upload(validatedFile);
      setAvatarUrl(result.url);
      onChange?.(result.url);
    } catch (error) {
      console.error("头像上传失败:", error);
    } finally {
      setUploading(false);
    }
  };

  // 删除头像
  const handleDelete = () => {
    return Dialog.confirm({
      content: "确定要删除头像吗？",
      onConfirm: () => {
        setAvatarUrl("");
        onChange?.("");
        Toast.show("头像已删除");
      },
    });
  };

  return (
    <div className={`${style.avatarUploadContainer} ${className || ""}`}>
      <div
        className={style.avatarWrapper}
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="头像"
            className={style.avatarImage}
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className={style.avatarPlaceholder}
            style={{ width: size, height: size }}
          >
            <UserOutlined />
          </div>
        )}

        {/* 上传覆盖层 */}
        <div
          className={style.avatarUploadOverlay}
          onClick={() =>
            !disabled && !uploading && fileInputRef.current?.click()
          }
        >
          {uploading ? (
            <div className={style.uploadLoading}>上传中...</div>
          ) : (
            <CameraOutlined />
          )}
        </div>

        {/* 删除按钮 */}
        {avatarUrl && !disabled && (
          <div className={style.avatarDeleteBtn} onClick={handleDelete}>
            ×
          </div>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarChange}
        disabled={disabled || uploading}
      />

      {/* 提示文字 */}
      <div className={style.avatarTip}>
        {uploading
          ? "正在上传头像..."
          : "点击头像可更换，支持JPG、PNG格式，大小不超过5MB"}
      </div>
    </div>
  );
};

// 创建 ref
const fileInputRef = React.createRef<HTMLInputElement>();

export default AvatarUpload;
