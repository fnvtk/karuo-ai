# 卡若 AI · 语音对话（运行时）

> 工作台内置：**本机浏览器语音 ↔ OpenClaw 网关（18789）** 的启动说明与验收矩阵。  
> 配置与密钥放在本目录 `.env`（由 `env.example` 复制），勿提交 Git。

## 能力说明

- **下一站逐步操作（含腾讯云/火山/浏览器/Cursor 用量等可点链接）**：[下一站操作清单_含链接.md](./下一站操作清单_含链接.md)
- 唤醒词、按住说话、流式识别与播报、多 Agent 槽位等，以本目录 **[语音能力验收矩阵.md](./语音能力验收矩阵.md)** 勾选进度为准。
- 默认在本机打开 **7860** 端口 Web 界面完成对话（端口见 [项目与端口注册表.md](../项目与端口注册表.md)）。

## 前置条件

1. **OpenClaw 网关已可达**（本机或内网地址；见 [阿猫Mac_OpenClaw配置情况分析.md](../阿猫Mac_OpenClaw配置情况分析.md)）。
2. **语音运行时源码目录**已就绪（默认与本机调研克隆一致）：  
   `/Users/karuo/Documents/开发/7.项目调研/tryvoice-oss/AaronZ021_tryvoice-oss`  
   若路径不同：`export VOICE_RUNTIME_SRC=/你的路径`  
3. 在该目录内**首次**已执行 `bash scripts/setup.sh`（生成 `.venv`、安装依赖；需 Python 3.9+，完整前端构建需 Node 20+）。

## 启动

1. `cp env.example .env`
2. 编辑 `.env`：填写 `OPENCLAW_GATEWAY_TOKEN`（与网关 `gateway.auth.token` 一致），按需修改 `OPENCLAW_GATEWAY_URL`。
3. 执行：  
   `bash "/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台/脚本/start_voice_runtime.sh"`  

常用参数示例：  
`bash .../start_voice_runtime.sh -- --host 0.0.0.0 --port 7860`

## 与官网控制台

- **卡若ai网站控制台**：`ChatPanel` 已支持 **「说完即发」**（麦克风转写后直接走流式对话）、**「朗读回复」**（流式结束后浏览器 `speechSynthesis` 中文朗读）、**单条助手气泡上的「朗读本条」**。开关会写入浏览器 `localStorage`。
- **本目录运行时**：仍用于 **唤醒词 / 多槽位 / 与 OpenClaw 同构的完整语音栈**（默认 7860）；与控制台互为补充。

## 回廊洗字

- 词库：`/Users/karuo/Documents/个人/卡若AI/运营中枢/参考资料/卡若闽南口音_ASR纠错库.json`
- 脚本：`/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台/脚本/apply_karuo_voice_corrections.py`
- 转写后自动纠错：见验收矩阵「卡若增强」行（实施时在 transcript 出口挂钩）。

## 许可说明

- 默认源码目录所依赖的上游包为 **Apache-2.0**；若自行更换实现，请保留对应 `NOTICE` / `LICENSE`。
