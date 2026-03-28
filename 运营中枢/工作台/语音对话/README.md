# 卡若 AI · 语音对话（运行时）

> 工作台内置：**本机浏览器语音 ↔ OpenClaw 网关（18789）** 的启动说明与验收矩阵。  
> 配置与密钥放在本目录 `.env`（由 `env.example` 复制），勿提交 Git。

## 能力说明

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

- 当前：官网 `VoiceButton` 仍为「口述填入输入框」；**完整语音对话回合**由本运行时页面承担。
- 后续：可将同一套 WebSocket 能力嵌入卡若控制台（与矩阵中「WebSocket」章节对齐）。

## 回廊洗字

- 词库：`/Users/karuo/Documents/个人/卡若AI/运营中枢/参考资料/卡若闽南口音_ASR纠错库.json`
- 脚本：`/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台/脚本/apply_karuo_voice_corrections.py`
- 转写后自动纠错：见验收矩阵「卡若增强」行（实施时在 transcript 出口挂钩）。

## 许可说明

- 默认源码目录所依赖的上游包为 **Apache-2.0**；若自行更换实现，请保留对应 `NOTICE` / `LICENSE`。
