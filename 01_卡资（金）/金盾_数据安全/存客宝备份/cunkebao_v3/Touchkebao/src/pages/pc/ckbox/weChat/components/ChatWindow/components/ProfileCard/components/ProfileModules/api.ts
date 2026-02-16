import request from "@/api/request";
// 更新好友信息
export interface UpdateFriendInfoParams {
  id: number;
  conRemark: string;
  phone: string;
  company: string;
  name: string;
  position: string;
  email: string;
  address: string;
  qq: string;
  remark: string;
}
export function updateFriendInfo(params: UpdateFriendInfoParams): Promise<any> {
  return request("/v1/kefu/wechatFriend/updateInfo", params, "POST");
}

// 获取好友信息
export interface GetFriendInfoParams {
  id: number;
}

export interface FriendDetailResponse {
  detail: {
    id: number;
    wechatAccountId: number;
    alias: string;
    wechatId: string;
    conRemark: string;
    nickname: string;
    pyInitial: string;
    quanPin: string;
    avatar: string;
    gender: number;
    region: string;
    addFrom: number;
    labels: any[];
    siteLabels: string[];
    signature: string;
    isDeleted: number;
    isPassed: number;
    deleteTime: number;
    accountId: number;
    extendFields: string;
    accountUserName: string;
    accountRealName: string;
    accountNickname: string;
    ownerAlias: string;
    ownerWechatId: string;
    ownerNickname: string;
    ownerAvatar: string;
    phone: string;
    thirdParty: string;
    groupId: number;
    passTime: string;
    additionalPicture: string;
    desc: string;
    country: string;
    privince: string;
    city: string;
    createTime: string;
    updateTime: string;
    R: string;
    F: string;
    M: string;
    realName: null | string;
    company: null | string;
    position: null | string;
    aiType: number;
  };
}
export function getFriendInfo(
  params: GetFriendInfoParams,
): Promise<FriendDetailResponse> {
  return request("/v1/kefu/wechatFriend/detail", params, "GET");
}
