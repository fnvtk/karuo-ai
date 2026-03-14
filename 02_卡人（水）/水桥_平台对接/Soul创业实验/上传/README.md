# Soul 文章上传 · 子类说明

> 本子类归属 **Soul创业实验** Skill。文章写好后，按本文执行上传到小程序。

---

## 前置

- 文章已按 **写作/写作规范.md** 写好。
- **第9章（第101场及以前）**：保存为 `9.xx 第X场｜主题.md`，位于第9章目录。
- **2026 场次（第102场及以后）**：保存为 `第X场｜主题.md`，位于 `2026每日派对干货/` 目录。

---

## 小程序格式规范（上传前必查）

上传到小程序的正文**不要用**以下标点，小程序内不好处理：

| 不用 | 原因 |
|:---|:---|
| `**` 加粗 | 可能被当成正文星号展示 |
| `---` 分割线 | 易错乱 |
| `→` 箭头 | 用「到」等中文替代 |
| `##` 小标题 | 用「一、二、三」或数字，或纯空行分段 |

- 每句空一行；小节用空行分段；标题不含章节号（如「9.15」）时，上传命令的 `--title` 用「主题｜副标题」即可。

---

## 路径与配置

| 项目 | 值 |
|:---|:---|
| 第9章文章目录 | `/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/第四篇｜真实的赚钱/第9章｜我在Soul上亲访的赚钱案例/` |
| **2026 场次目录** | `/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/2026每日派对干货/` |
| 项目（含 content_upload） | `一场soul的创业实验-永平`（根目录有 `content_upload.py`） |
| 第9章参数 | part-4, chapter-9, price 1.0 |
| **2026每日派对干货参数** | part-2026-daily, chapter-2026-daily, id 10.xx, price 1.0 |

---

## 上传命令

### 2026 场次（第102场及以后）→ 2026每日派对干货

第 102 场及以后的派对场次统一归入「2026每日派对干货」目录，序号为 10.01、10.02、10.03…，与后台目录结构一致。

```bash
cd "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"

# 自动生成 10.xx id（不指定 --id 则按现有最大序号+1）
python3 content_upload.py --title "第X场｜标题" \
  --content-file "<文章完整路径>" --part part-2026-daily --chapter chapter-2026-daily --price 1.0

# 或指定 id（如 10.18）
python3 content_upload.py --id 10.18 --title "第119场｜开派对的初心是早上不影响老婆睡觉" \
  --content-file "/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/2026每日派对干货/第119场｜开派对的初心是早上不影响老婆睡觉.md" \
  --part part-2026-daily --chapter chapter-2026-daily --price 1.0
```

### 第9章（第101场及以前）

```bash
python3 content_upload.py --id 9.xx --title "9.xx 第X场｜标题" \
  --content-file "<文章完整路径>" --part part-4 --chapter chapter-9 --price 1.0
```

- id 已存在 → **更新**；不存在 → **创建**。
- 依赖：`pip install pymysql`；数据库为腾讯云 `soul_miniprogram.chapters`。

---

## 同步飞书群（按需执行）

**默认不上传飞书群**。上传到小程序后，**只有在你明确说「发飞书」「推飞书」「同步飞书群」等时才执行**。推送内容：**前 6% 正文**（一句一行、行间空一行）+ **章节海报图**（含该章节小程序码），**不发小程序链接**。详见 `上传/推送逻辑.md`。

在永平项目下执行（`--md` 为**本篇文章**的 md 路径）：

```bash
python3 scripts/send_chapter_poster_to_feishu.py 9.xx "第X场｜标题" --md "<文章.md 完整路径>"
# 2026每日派对干货 的章节用 10.xx，如：
python3 scripts/send_chapter_poster_to_feishu.py 10.18 "第119场｜标题" --md "<文章.md 完整路径>"
```

- 需配置 `scripts/.env.feishu`（FEISHU_APP_ID、FEISHU_APP_SECRET）。
- 依赖：`pip install requests Pillow`。
- 默认发到 **Soul 彩民团队** 飞书群（webhook 已写在脚本内），无需复制链接，直接运行上述命令即可。

---

## 其他

- 查看篇章结构：`python3 content_upload.py --list-structure`
- 列出章节：`python3 content_upload.py --list-chapters`

### 迁移：将第102场及以后迁入 2026每日派对干货

若此前把 2026 场次放在第9章，可用迁移脚本批量移至「2026每日派对干货」，并按 10.01、10.02… 重新编号：

```bash
cd "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"
python3 scripts/migrate_2026_sections.py           # 仅预览
python3 scripts/migrate_2026_sections.py --execute # 执行迁移
```
