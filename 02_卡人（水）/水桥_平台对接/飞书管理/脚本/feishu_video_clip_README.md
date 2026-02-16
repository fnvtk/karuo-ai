# 飞书视频智能切片工具使用说明

## 功能

1. **从飞书妙记链接下载视频**（如果API支持）
2. **转录视频**（使用MLX Whisper）
3. **AI智能识别高光片段**并生成主题
4. **批量切片**视频
5. **发送到飞书群**（通过webhook）

## 使用方法

### 方式1：从飞书链接处理

```bash
python3 feishu_video_clip.py \
  --url "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566" \
  --clips 5
```

### 方式2：处理本地视频文件

如果视频已经下载到本地：

```bash
python3 feishu_video_clip.py \
  --video "/path/to/video.mp4" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx" \
  --clips 5 \
  --output ~/Downloads/clips
```

## 参数说明

| 参数 | 简写 | 说明 | 必填 |
|:---|:---|:---|:---|
| `--url` | `-u` | 飞书妙记链接 | 方式1必填 |
| `--video` | `-v` | 本地视频文件路径 | 方式2必填 |
| `--webhook` | `-w` | 飞书群webhook地址 | 可选 |
| `--output` | `-o` | 输出目录 | 可选（默认：~/Downloads/feishu_clips） |
| `--clips` | `-c` | 切片数量 | 可选（默认：5） |

## 前置条件

1. **飞书API授权**：需要先运行 `feishu_api.py` 完成授权
2. **MLX Whisper环境**：需要安装并配置MLX Whisper
3. **FFmpeg**：需要安装FFmpeg用于视频处理
4. **Python依赖**：`pip3 install requests openai`（或使用Gemini API）

## 工作流程

```
1. 提取minute_token（从URL）
   ↓
2. 获取视频下载链接（或使用本地视频）
   ↓
3. 下载视频（如果需要）
   ↓
4. 提取音频并转录（MLX Whisper）
   ↓
5. AI识别高光片段（生成主题、Hook、CTA）
   ↓
6. 批量切片视频
   ↓
7. 发送到飞书群（如果提供了webhook）
```

## 输出文件

脚本会在输出目录生成：

```
output_dir/
├── video_{minute_token}.mp4    # 原始视频
├── video_{minute_token}.wav     # 提取的音频
├── video_{minute_token}.srt     # 转录字幕
├── highlights.json              # AI识别的高光片段
└── clips/                       # 切片视频目录
    ├── 01_片段1.mp4
    ├── 02_片段2.mp4
    └── ...
```

## 注意事项

1. **视频下载**：如果API无法获取视频下载链接，脚本会提示手动下载
2. **转录时间**：2.5小时视频约需3分钟转录
3. **AI识别**：需要配置OpenAI API Key或Gemini API Key
4. **文件大小**：切片后的视频文件会保存在本地，webhook只发送消息，不直接上传文件

## 故障排查

### 问题1：无法获取视频下载链接

**解决**：
- 手动从飞书下载视频
- 使用 `--video` 参数指定本地视频文件

### 问题2：转录失败

**检查**：
- MLX Whisper环境是否正确配置
- 音频文件是否成功提取

### 问题3：AI识别失败

**检查**：
- OpenAI API Key或Gemini API Key是否正确配置
- 网络连接是否正常

### 问题4：发送到飞书群失败

**检查**：
- webhook地址是否正确
- webhook是否已启用
- 消息格式是否符合飞书要求

## 示例

### 完整示例

```bash
# 1. 确保飞书API服务运行
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts
python3 feishu_api.py  # 在另一个终端运行

# 2. 运行切片工具
python3 feishu_video_clip.py \
  --url "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566" \
  --clips 5 \
  --output ~/Downloads/feishu_clips
```

### 仅处理本地视频

```bash
python3 feishu_video_clip.py \
  --video ~/Downloads/meeting.mp4 \
  --clips 3 \
  --output ~/Downloads/clips
```

## 更新日志

- **2026-01-28**: 初始版本
  - 支持从飞书链接下载视频
  - 支持处理本地视频
  - AI智能识别高光片段
  - 批量切片并发送到飞书群
