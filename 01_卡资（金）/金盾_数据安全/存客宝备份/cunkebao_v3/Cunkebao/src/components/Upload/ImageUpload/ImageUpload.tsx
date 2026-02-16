import React, { useState, useEffect } from "react";
import { ImageUploader, Toast, Dialog } from "antd-mobile";
import type { ImageUploadItem } from "antd-mobile/es/components/image-uploader";
import style from "./index.module.scss";

interface UploadComponentProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  count?: number; // 最大上传数量
  accept?: string; // 文件类型
  disabled?: boolean;
  className?: string;
}

const UploadComponent: React.FC<UploadComponentProps> = ({
  value = [],
  onChange,
  count = 9,
  accept = "image/*",
  disabled = false,
  className,
}) => {
  const [fileList, setFileList] = useState<ImageUploadItem[]>([]);

  // 将value转换为fileList格式
  useEffect(() => {
    if (value && value.length > 0) {
      const files = value.map((url, index) => ({
        url: url || "",
        uid: `file-${index}`,
      }));
      setFileList(files);
    } else {
      setFileList([]);
    }
  }, [value]);

  // 文件验证
  const beforeUpload = (file: File) => {
    // 检查文件类型
    const isValidType = file.type.startsWith(accept.replace("*", ""));
    if (!isValidType) {
      Toast.show(`只能上传${accept}格式的文件！`);
      return null;
    }

    // 检查文件大小 (5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      Toast.show("文件大小不能超过5MB！");
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
        Toast.show("上传成功");
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
      Toast.show("上传失败，请重试");
      throw error;
    }
  };

  // 处理文件变化
  const handleChange = (files: ImageUploadItem[]) => {
    setFileList(files);

    // 提取URL数组并传递给父组件
    const urls = files
      .map(file => file.url)
      .filter(url => Boolean(url)) as string[];

    onChange?.(urls);
  };

  // 删除确认
  const handleDelete = () => {
    return Dialog.confirm({
      content: "确定要删除这张图片吗？",
    });
  };

  // 数量超出限制
  const handleCountExceed = (exceed: number) => {
    Toast.show(`最多选择 ${count} 张图片，你多选了 ${exceed} 张`);
  };

  return (
    <div className={`${style.uploadContainer} ${className || ""}`}>
      <ImageUploader
        value={fileList}
        onChange={handleChange}
        upload={upload}
        beforeUpload={beforeUpload}
        onDelete={handleDelete}
        onCountExceed={handleCountExceed}
        multiple={count > 1}
        maxCount={count}
        showUpload={fileList.length < count && !disabled}
        accept={accept}
      />
    </div>
  );
};

export default UploadComponent;
