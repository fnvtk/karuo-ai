import axios from "axios";
import { useUserStore } from "@/store/module/user";

/**
 * 通用文件上传方法（支持图片、文件）
 * @param {File} file - 要上传的文件对象
 * @param {string} [uploadUrl='/v1/attachment/upload'] - 上传接口地址
 * @returns {Promise<string>} - 上传成功后返回文件url
 */
export async function uploadFile(
  file: File,
  uploadUrl: string = "/v1/attachment/upload",
): Promise<string> {
  try {
    // 创建 FormData 对象用于文件上传
    const formData = new FormData();
    formData.append("file", file);

    // 获取用户token
    const { token } = useUserStore.getState();

    const fullUrl = `${(import.meta as any).env?.VITE_API_BASE_URL || "/api"}${uploadUrl}`;

    // 直接使用 axios 上传文件
    const response = await axios.post(fullUrl, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      timeout: 20000,
    });
    return response?.data?.data?.url || "";
  } catch (e: any) {
    const errorMessage =
      e.response?.data?.message || e.message || "文件上传失败";
    throw new Error(errorMessage);
  }
}
