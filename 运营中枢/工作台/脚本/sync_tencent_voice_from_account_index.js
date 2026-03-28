#!/usr/bin/env node
/**
 * 从「00_账号与API索引.md」腾讯云表格读取 SecretId/SecretKey，合并写入卡若ai网站 site/.env.local。
 *  stdout 仅输出 OK/错误，不打印密钥。卡若本人已要求从索引同步语音用密钥时使用。
 */
const fs = require("fs");
const path = require("path");

const scriptDir = path.dirname(__filename);
const indexPath = path.resolve(scriptDir, "..", "00_账号与API索引.md");
const siteEnvPath =
  process.env.KARUO_SITE_ENV_LOCAL ||
  "/Users/karuo/Documents/开发/3、自营项目/卡若ai网站/site/.env.local";

if (!fs.existsSync(indexPath)) {
  console.error("[sync-tencent-voice] 未找到索引:", indexPath);
  process.exit(1);
}

const md = fs.readFileSync(indexPath, "utf8");
const block = md.split("### 腾讯云")[1];
if (!block) {
  console.error("[sync-tencent-voice] 未找到 ### 腾讯云 段落");
  process.exit(1);
}
const until = block.split("### ")[0];

const idM = until.match(/\|\s*SecretId（密钥）\s*\|\s*`([^`]+)`/);
const keyM = until.match(/\|\s*SecretKey\s*\|\s*`([^`]+)`/);
if (!idM || !keyM) {
  console.error("[sync-tencent-voice] 无法解析 SecretId/SecretKey 表格");
  process.exit(1);
}

const sid = idM[1].trim();
const sk = keyM[1].trim();
if (!sid || !sk) {
  console.error("[sync-tencent-voice] 解析结果为空");
  process.exit(1);
}

let envContent = "";
if (fs.existsSync(siteEnvPath)) {
  envContent = fs.readFileSync(siteEnvPath, "utf8");
}

function upsert(key, val) {
  const line = `${key}=${val}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(envContent)) envContent = envContent.replace(re, line);
  else envContent = envContent.replace(/\s*$/, "") + (envContent.trim() ? "\n" : "") + line + "\n";
}

upsert("TENCENTCLOUD_SECRET_ID", sid);
upsert("TENCENTCLOUD_SECRET_KEY", sk);
upsert("TENCENTCLOUD_REGION", process.env.TENCENTCLOUD_REGION || "ap-guangzhou");
upsert("TENCENT_ASR_ENG_TYPE", process.env.TENCENT_ASR_ENG_TYPE || "16k_zh");

const dir = path.dirname(siteEnvPath);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(siteEnvPath, envContent, "utf8");
console.log("[sync-tencent-voice] 已合并写入", siteEnvPath, "（腾讯云语音相关键）");
