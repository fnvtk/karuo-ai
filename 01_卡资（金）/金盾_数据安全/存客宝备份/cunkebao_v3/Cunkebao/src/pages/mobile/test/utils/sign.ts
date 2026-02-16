/**
 * 签名生成工具
 * 根据API文档的签名规则生成MD5签名
 */

import CryptoJS from "crypto-js";

/**
 * 生成MD5哈希值
 */
function md5(text: string): string {
  return CryptoJS.MD5(text).toString();
}

/**
 * 生成签名
 * 根据API文档的签名规则生成MD5签名
 */
export function generateSign(
  params: Record<string, any>,
  apiKey: string,
): string {
  // 第一步：移除 sign、apiKey、portrait
  const filteredParams: Record<string, any> = { ...params };
  delete filteredParams.sign;
  delete filteredParams.apiKey;
  delete filteredParams.portrait;

  // 第二步：移除空值（null 和空字符串）
  const nonEmptyParams: Record<string, any> = {};
  for (const key in filteredParams) {
    const value = filteredParams[key];
    if (value !== null && value !== "" && value !== undefined) {
      nonEmptyParams[key] = value;
    }
  }

  // 第三步：按参数名升序排序
  const sortedKeys = Object.keys(nonEmptyParams).sort();

  // 第四步：拼接参数值
  let stringToSign = "";
  for (const key of sortedKeys) {
    stringToSign += String(nonEmptyParams[key]);
  }

  // 第五步：第一次MD5
  const firstMd5 = md5(stringToSign);

  // 第六步：拼接apiKey后第二次MD5
  const finalSign = md5(firstMd5 + apiKey);

  return finalSign;
}
