---
name: Soul文章上传
description: 《一场soul的创业实验》第9章文章写入小程序后端，写好即传，id 已存在则更新不重复
triggers: Soul文章上传、Soul派对文章、第9章上传、soul 上传、写soul文章
owner: 水桥
group: 水
version: "1.0"
updated: "2026-02-20"
---

# Soul文章上传 Skill

> 写好文章直接上传到 Soul 小程序，id 已存在则更新，保持不重复。 —— 水桥

---

## 触发条件

用户说以下关键词时自动激活：
- Soul文章上传、Soul派对文章、第9章上传
- soul 上传、写soul文章、上传到soul
- 写好文章上传、文章写好了上传

---

## 核心配置

| 项目 | 路径/值 |
|:---|:---|
| Soul 项目根目录 | `/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验` |
| 第9章文章目录 | `/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/第四篇｜真实的赚钱/第9章｜我在Soul上亲访的赚钱案例/` |
| 上传脚本 | `一场soul的创业实验/scripts/upload_soul_article.sh` |
| 底层工具 | `一场soul的创业实验/content_upload.py` |
| 第9章固定参数 | part-4（第四篇｜真实的赚钱）, chapter-9（第9章｜我在Soul上亲访的赚钱案例） |

---

## 执行步骤

### 1. 写好文章

文章放在第9章目录，文件名格式：`9.xx 第X场｜主题.md`

示例：`9.18 第105场｜创业社群、直播带货与程序员.md`

### 2. 执行上传

```bash
/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/scripts/upload_soul_article.sh "/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/第四篇｜真实的赚钱/第9章｜我在Soul上亲访的赚钱案例/9.xx 第X场｜标题.md"
```

### 3. 一键命令（替换为实际文件路径）

```bash
cd /Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验
./scripts/upload_soul_article.sh "<文章完整路径>"
```

---

## 输出说明

| 返回 | 含义 |
|:---|:---|
| `"action": "创建"` | 新章节已写入 |
| `"action": "更新"` | 同 id 已存在，内容已更新（不重复） |

---

## 配套脚本

| 脚本 | 用途 |
|:---|:---|
| `content_upload.py` | 直连数据库，创建/更新章节（依赖 pymysql） |
| `scripts/upload_soul_article.sh` | 从文件名提取 id、title，调用 content_upload |

### 手动调用 content_upload（高级）

```bash
cd /Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验

# 上传指定文章
python3 content_upload.py --id 9.18 --title "9.18 第105场｜主题" \
  --content-file "<文章路径>" --part part-4 --chapter chapter-9 --price 1.0

# 查看篇章结构
python3 content_upload.py --list-structure

# 列出所有章节
python3 content_upload.py --list-chapters
```

---

## API 接口（备用）

管理后台 API（需 Token）：

| 接口 | 说明 |
|:---|:---|
| `POST /api/admin` | 登录获取 Token，Body: `{"username":"admin","password":"admin123"}` |
| `POST /api/db/book` | 创建/更新章节，Header: `Authorization: Bearer {token}` |

正式环境：`https://soulapi.quwanzhi.com`
开发环境：`https://souldev.quwanzhi.com`

---

## 经验与注意

### 1. 不重复机制

- 以 `id`（如 9.18）为唯一键
- id 已存在 → **更新**；不存在 → **创建**
- 同一场次多次上传不会重复，只会覆盖

### 2. 文件名规范

- 格式：`9.xx 第X场｜主题.md`
- id 从文件名提取，必须形如 `9.18`（章.节）

### 3. 环境依赖

```bash
pip3 install pymysql
```

### 4. 与书的对应关系

- 书稿目录：`个人/2、我写的书/《一场soul的创业实验》/第四篇｜真实的赚钱/第9章｜...`
- 小程序内容来源：腾讯云 MySQL `soul_miniprogram.chapters`
- content_upload 直连数据库，与 API 共用同一数据源

### 5. 发海报到飞书

上传成功后自动生成海报图片（含小程序码）并发送到飞书群，**不发链接**，直接发图。

- 海报格式与小程序「生成海报」一致：Soul创业派对、标题、金句、日期、小程序码
- 小程序码由 Soul 后端 `/api/miniprogram/qrcode` 生成
- 需配置：`scripts/.env.feishu` 或环境变量 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`（与 webhook 同租户）
- 依赖：`pip install Pillow requests`

手动发：`python3 scripts/send_poster_to_feishu.py "<文章路径>"` 或 `--id 9.15`
仅保存本地：`python3 scripts/send_poster_to_feishu.py "<路径>" --save poster.png`

### 6. 工作流建议

1. 根据 Soul 派对 TXT 写好文章（按书格式：一句一行、金句开头、日期、`---` 分段）
2. 保存为 `9.xx 第X场｜主题.md` 到第9章目录
3. 执行 `upload_soul_article.sh "<文章路径>"`
4. 检查返回为「创建」或「更新」，海报会自动发到飞书群

---

## 版本记录

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| 1.0 | 2026-02-20 | 初版，从 Soul 项目抽取为独立技能 |
