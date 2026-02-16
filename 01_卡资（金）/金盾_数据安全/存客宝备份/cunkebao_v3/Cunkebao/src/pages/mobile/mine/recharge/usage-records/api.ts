import request from "@/api/request";

export interface TokensUseRecordParams {
  /**
   * 来源 0未知 1好友聊天 2群聊天 3群公告 4商家 5充值
   */
  form?: string;
  /**
   * 条数
   */
  limit?: string;
  /**
   * 分页
   */
  page?: string;
  /**
   * 类型 0减少 1增加
   */
  type?: string;
  [property: string]: any;
}

export interface TokensUseRecordItem {
  id: number;
  companyId: number;
  userId: number;
  wechatAccountId: number;
  friendIdOrGroupId: number;
  form: number;
  type: number;
  tokens: number;
  balanceTokens: number;
  remarks: string;
  createTime: string;
}

export interface TokensUseRecordList {
  list: TokensUseRecordItem[];
  total?: number;
}

//算力使用明细
export function getTokensUseRecord(
  TokensUseRecordParams,
): Promise<TokensUseRecordList> {
  return request("/v1/kefu/tokensRecord/list", TokensUseRecordParams, "GET");
}
