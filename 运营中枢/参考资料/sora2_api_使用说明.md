# Sora 2 生成 API 使用说明

> 脚本位置：`运营中枢/scripts/sora2_generate.py`  
> 输出目录：`/Users/karuo/Documents/卡若Ai的文件夹/导出/`

## 前置条件

1. **API Key**：需 OpenAI 已开通 Sora 2 权限的账号，在环境变量中设置：
   ```bash
   export OPENAI_API_KEY="sk-xxx"
   ```
2. **权限说明**：Sora 2 API 目前为预览，需在 [OpenAI 控制台](https://platform.openai.com/) 确认账号已开通 Video API；未开通需联系 OpenAI 申请。

## 命令行用法

```bash
# 进入工作台
cd /Users/karuo/Documents/个人/卡若AI

# 仅文本生成（必填 prompt）
python 运营中枢/scripts/sora2_generate.py "一只橘猫在窗台上打哈欠，阳光洒进来"

# 指定模型、分辨率、时长
python 运营中枢/scripts/sora2_generate.py "海边日落延时" -m sora-2-pro -s 1792x1024 --seconds 12

# 首帧参考图（图生视频）
python 运营中枢/scripts/sora2_generate.py "她转身微笑，慢慢走出画面" -i /path/to/sample_720p.jpeg
```

### 参数一览

| 参数 | 简写 | 默认 | 说明 |
|:---|:---|:---|:---|
| prompt | -p | 必填 | 视频描述文案 |
| model | -m | sora-2 | sora-2 / sora-2-pro |
| size | -s | 1280x720 | 720x1280 / 1280x720 / 1024x1792 / 1792x1024 |
| seconds | — | 8 | 4 / 8 / 12 |
| input-reference | -i | — | 首帧参考图路径（可选） |
| output-dir | -o | 卡若Ai的文件夹/导出 | MP4 保存目录 |
| poll-interval | — | 15 | 轮询间隔（秒） |
| max-wait | — | 20 | 最长等待（分钟） |

## 在代码中调用

```python
from pathlib import Path
import sys
sys.path.insert(0, "/Users/karuo/Documents/个人/卡若AI/运营中枢/scripts")
from sora2_generate import create_and_download, get_api_key, create_video, get_video_status, download_video

# 一键生成并下载
out_path = create_and_download(
    prompt="一只橘猫在窗台上打哈欠",
    model="sora-2",
    size="1280x720",
    seconds="8",
    output_dir=Path("/Users/karuo/Documents/卡若Ai的文件夹/导出"),
)
# out_path 为最终 MP4 路径
```

## API 端点摘要（直连用）

- **创建任务**：`POST https://api.openai.com/v1/videos`  
  - Content-Type: multipart/form-data  
  - 字段：prompt（必填）, model, size, seconds, input_reference（文件可选）
- **查询状态**：`GET https://api.openai.com/v1/videos/{video_id}`
- **下载视频**：`GET https://api.openai.com/v1/videos/{video_id}/content`  
  - 可选 `?variant=thumbnail` 或 `?variant=spritesheet`

定价（参考）：sora-2 约 $0.10/秒，sora-2-pro 约 $0.30–0.50/秒（按分辨率）。
