# 飞书视频切片 Skill

> 搞定了，清清爽爽。 —— 卡人

---

## 一句话说明

**飞书链接 → 自动获取信息 → 飞书下载（已登录无需扫码） → AI切片 → 发群**

---

## 一键命令

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/feishu_one_click.py \
  "飞书妙记链接" \
  "飞书群webhook（可选，默认产宁团队群）"
```

### 按剪辑方案图片切片（高峰时刻+想象的内容）

按「视频剪辑方案」图片整理：7 段高峰时刻 + 加速 10% + 去语助词 + 关键词高亮。**文字/标题统一简体中文**。

```bash
# 一键全自动（命令行下载视频，不打开浏览器）
# 需先配置：智能纪要/脚本/cookie_minutes.txt（飞书妙记 list 请求的 Cookie）
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_image_slice.py --url "https://cunkebao.feishu.cn/minutes/obcnzs51k1j754643vx138sx"

# 若已下载视频，直接指定路径
python3 脚本/feishu_image_slice.py --video "~/Downloads/xxx.mp4"
```

### 示例

```bash
# 示例：产研团队第20场会议
python3 feishu_one_click.py "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" --clips 5
```

---

## 流程说明

| 步骤 | 操作 | 自动化程度 |
|:---|:---|:---|
| 1. 下载视频 | Cookie + status API 命令行下载 | ✅ 全自动（不打开浏览器） |
| 2. 获取妙记信息 | 按高峰时刻方案 | ✅ 全自动 |
| 3. 批量切片 | FFmpeg | ✅ 全自动 |
| 4. 增强（封面+字幕+加速10%） | soul_enhance | ✅ 全自动 |
| 5. 发送到群 | Webhook | ✅ 全自动 |

> **注意**：需配置 `智能纪要/脚本/cookie_minutes.txt`（飞书妙记 list 请求的 Cookie），即可全自动下载。

---

## 详细流程

```
┌─────────────┐
│ 输入飞书链接 │
└──────┬──────┘
       │
       ▼
┌─────────────┐     使用APP_ID和APP_SECRET
│ 获取妙记信息 │ ←── 自动获取tenant_token
│  (API自动)  │     获取标题、时长等信息
└──────┬──────┘
       │
       ▼
┌─────────────┐     打开飞书客户端
│  下载视频   │ ←── 用户点击下载按钮
│ (飞书客户端)│     脚本自动检测下载完成
└──────┬──────┘
       │
       ▼
┌─────────────┐     根据视频信息
│ AI生成方案  │ ←── 智能生成切片时间点
│ (Gemini)    │     包含Hook和CTA文案
└──────┬──────┘
       │
       ▼
┌─────────────┐     精确切割视频
│  批量切片   │ ←── 保持画质
│  (FFmpeg)   │     自动命名
└──────┬──────┘
       │
       ▼
┌─────────────┐     发送消息卡片
│  发送到群   │ ←── 包含切片信息
│ (Webhook)   │     Hook和CTA文案
└─────────────┘
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|:---|:---|:---|:---|
| 第1个参数 | 飞书妙记链接 | ✅ | - |
| 第2个参数 | 飞书群webhook | ❌ | 产宁团队群 |
| `--clips` | 切片数量 | ❌ | 5 |
| `--output` | 输出目录 | ❌ | ~/Downloads/feishu_clips/ |

---

## 默认配置

| 配置 | 值 |
|:---|:---|
| **默认Webhook** | 产宁团队群 |
| **飞书APP_ID** | `cli_a48818290ef8100d` |
| **Gemini API** | `AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8` |

---

## 输出结果

```
~/Downloads/feishu_clips/{minute_token}/
├── video.mp4           # 原始视频
├── highlights.json     # AI切片方案（包含Hook、CTA）
└── clips/              # 切片目录
    ├── 01_片段标题1.mp4
    ├── 02_片段标题2.mp4
    └── ...
```

---

## 每个切片包含

| 内容 | 说明 |
|:---|:---|
| **主题标题** | AI生成，概括片段内容 |
| **前3秒Hook** | 抓眼球的开场文案 |
| **结尾CTA** | 引导关注/进群的文案 |
| **时间戳** | 在原视频中的位置 |

---

## Agent调用指南

### 触发词

用户说以下话时，使用此Skill：
- "把飞书链接切片"
- "这个视频切成短视频"
- "处理这个飞书妙记"
- "下载飞书视频并切片"
- "把会议录像切成切片"

### 调用命令

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/feishu_one_click.py \
  "{用户提供的飞书链接}" \
  "{用户指定的webhook或留空使用默认}"
```

### 完整示例

```bash
# 用户说："把这个链接切片发到产宁团队群"
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/feishu_one_click.py \
  "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" \
  "https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566" \
  --clips 5
```

---

## 常用Webhook

| 群名 | Webhook |
|:---|:---|
| **产宁团队**（默认） | `https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566` |

---

## 故障排查

### 问题1：获取妙记信息失败

**解决**：检查网络连接，重试即可

### 问题2：AI生成切片失败

**说明**：会自动使用备用方案（均匀切片），不影响使用

### 问题3：视频下载问题

**说明**：
1. 脚本会自动打开飞书客户端
2. 飞书已登录，**无需扫码**
3. 只需在飞书中点击下载按钮
4. 脚本会自动检测下载完成并继续

---

## 文件结构

```
飞书管理/
├── SKILL.md                      # 日志写入Skill
├── 飞书视频切片_SKILL.md          # 本文档
└── scripts/
    ├── feishu_one_click.py       # ⭐ 一键切片脚本
    ├── feishu_api.py             # API服务
    └── .feishu_tokens.json       # Token存储
```

---

## 版本

- **v2.0** | 2026-01-29
- **特性**：
  - 纯命令行操作
  - 自动获取妙记信息（无需用户授权）
  - AI智能生成切片方案
  - 自动检测视频下载完成
  - 批量切片并发送到群
