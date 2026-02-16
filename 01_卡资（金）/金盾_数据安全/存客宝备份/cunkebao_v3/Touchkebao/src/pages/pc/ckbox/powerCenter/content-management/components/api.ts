import request from "@/api/request";
export interface listData {
  id: number;
  content: "";
  momentContentType: number;
  picUrlList: string[];
  videoUrl: string;
  link: string[];
  publicMode: number;
  isSend: number;
  createTime: number;
  sendTime: number;
  accountCount: number;
}

interface listResponse {
  list: listData[];
  total: number;
}
// 朋友圈定时发布 - 列表
export const getMomentList = (data: {
  page: number;
  limit: number;
}): Promise<listResponse> => {
  return request("/v1/kefu/moments/list", data, "GET");
};

export interface MomentRequest {
  id?: number;
  /**
   * 朋友圈内容
   */
  content: string;
  /**
   * 标签列表
   */
  "labels[]"?: string[];
  /**
   * 链接信息-描述  type4有效
   */
  "link[desc]"?: string[];
  /**
   * 链接信息-图标  type4有效
   */
  "link[image]"?: string[];
  /**
   * 链接信息-链接  type4有效
   */
  "link[url]"?: string[];
  /**
   * 图片列表  type2有效
   */
  "picUrlList[]"?: string[];
  /**
   * 定时发布时间
   */
  timingTime?: string;
  /**
   * 内容类型 1文本 2图文 3视频 4链接
   */
  type: string;
  /**
   * 视频链接  type3有效
   */
  videoUrl?: string;
  /**
   * 微信账号ID列表
   */
  "wechatIds[]"?: string[];
  [property: string]: any;
}

// 朋友圈定时发布 - 添加
export const addMoment = (data: MomentRequest) => {
  return request("/v1/kefu/moments/add", data, "POST");
};

// 朋友圈定时发布 - 编辑
export const updateMoment = (data: MomentRequest) => {
  return request("/v1/kefu/moments/update", data, "POST");
};

// 朋友圈定时发布 - 删除
export const deleteMoment = (data: { id: number }) => {
  return request("/v1/kefu/moments/delete", data, "DELETE");
};
