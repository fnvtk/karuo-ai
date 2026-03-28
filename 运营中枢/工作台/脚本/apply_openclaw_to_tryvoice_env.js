#!/usr/bin/env node
/**
 * 从本机 ~/.openclaw/openclaw.json 读取网关 URL 与 token，写入「语音对话/.env」（gitignore）。
 * 不将 token 打印到 stdout。覆盖 OPENCLAW_GATEWAY_*，保留 env.example 中其余行。
 *
 * 用法：node 运营中枢/工作台/脚本/apply_openclaw_to_tryvoice_env.js
 * 可选：OPENCLAW_GATEWAY_URL_OVERRIDE=http://127.0.0.1:18789
 */
const fs = require("fs");
const path = require("path");

const home = process.env.HOME || "";
const openclawPath = path.join(home, ".openclaw", "openclaw.json");
const scriptDir = path.dirname(__filename);
const voiceDir = path.join(scriptDir, "..", "语音对话");
const examplePath = path.join(voiceDir, "env.example");
const destPath = path.join(voiceDir, ".env");

if (!fs.existsSync(openclawPath)) {
  console.error("[apply-openclaw-tryvoice] 未找到:", openclawPath);
  process.exit(1);
}
if (!fs.existsSync(examplePath)) {
  console.error("[apply-openclaw-tryvoice] 未找到:", examplePath);
  process.exit(1);
}

let o;
try {
  o = JSON.parse(fs.readFileSync(openclawPath, "utf8"));
} catch (e) {
  console.error("[apply-openclaw-tryvoice] JSON 解析失败");
  process.exit(1);
}

const token = String(o.gateway?.auth?.token ?? "").trim();
if (!token) {
  console.error("[apply-openclaw-tryvoice] openclaw.json 中无 gateway.auth.token");
  process.exit(1);
}

const port = Number(o.gateway?.port) || 18789;
const url =
  process.env.OPENCLAW_GATEWAY_URL_OVERRIDE?.trim() || `http://127.0.0.1:${port}`;

let body = fs.readFileSync(examplePath, "utf8");
body = body.replace(/^OPENCLAW_GATEWAY_URL=.*$/m, `OPENCLAW_GATEWAY_URL=${url}`);
body = body.replace(/^OPENCLAW_GATEWAY_TOKEN=.*$/m, `OPENCLAW_GATEWAY_TOKEN=${token}`);

fs.mkdirSync(voiceDir, { recursive: true });
fs.writeFileSync(destPath, body, "utf8");
console.log("[apply-openclaw-tryvoice] 已写入", destPath, "gateway=" + url);
