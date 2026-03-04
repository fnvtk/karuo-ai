# n8n 工作流：一键下载抖音视频文案

## 功能

- 在 n8n 中执行一次即可：输入抖音链接 → 自动解析文案并保存到本机，可选下载无水印视频。
- 依赖同编排内的 **抖音解析 API**（`website-douyin-api`，端口 3099），与 n8n 同属 website 分组。

## 一键完成（全自动）

### 1. 确保服务已启动（一条命令）

```bash
cd /Users/karuo/Documents/开发/2、私域银行/神射手 && docker compose up -d douyin-api n8n
```

### 2. 在 n8n 中导入工作流（唯一需手动的一步）

1. 打开 n8n：http://localhost:5678
2. 左上角 **菜单** → **Workflows** → **Import from File**（或 **Import from URL**）
3. 选择本目录下的 **`n8n_一键下载抖音视频文案.json`** 导入  
   （路径：`卡若AI/03_卡木（木）/木叶_视频内容/抖音视频解析/n8n_一键下载抖音视频文案.json`）
4. 保存工作流（可命名如「一键下载抖音视频文案」）

### 3. 使用方式

- **方式一（推荐）**：执行前点击节点「**设置链接与是否下载**」，将 `url` 改为要解析的抖音链接（如 `https://v.douyin.com/xxx`），`download` 为 `true` 则同时下载视频，为 `false` 则仅解析文案。然后点击 **Test workflow** 或 **Execute Workflow**。
- **方式二**：用「**Execute Workflow**」时在输入数据中传入一条数据：`{"url": "https://v.douyin.com/xxx", "download": true}`。

### 4. 结果

- 文案会保存到本机：`/Users/karuo/Documents/卡若Ai的文件夹/视频/{aweme_id}_文案.json` 与 `{aweme_id}_文案.txt`
- 若 `download: true`，视频会保存到同目录下
- n8n 最后一个节点会输出 API 返回的 JSON（aweme_id、title、desc、hashtags、caption_txt_path、video_path 等）

## 端口与编排

| 服务        | 容器名             | 端口  | 说明           |
|-------------|--------------------|-------|----------------|
| 抖音解析 API | website-douyin-api | 3099  | 供 n8n 调用    |
| n8n         | website-n8n        | 5678  | 工作流编辑与执行 |

两者均在 **神射手** 同一 docker-compose 下，网络互通，n8n 内请求地址为 `http://douyin-api:3099/parse`。

## 故障排查

- **调用抖音解析API 报错**：确认 `docker ps` 中 `website-douyin-api` 在运行，且 n8n 与 douyin-api 在同一 compose 网络（均为 website）。
- **解析失败**：检查链接是否为抖音短链或完整视频链接；若被风控，可在本机用脚本 `douyin_parse.py` 或 MCP 浏览器兜底。
