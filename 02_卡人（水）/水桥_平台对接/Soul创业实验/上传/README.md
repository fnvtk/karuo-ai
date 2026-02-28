# Soul 文章上传 · 子类说明

> 本子类归属 **Soul创业实验** Skill。文章写好后，按本文执行上传到小程序。

---

## 前置

- 文章已按 **写作/写作规范.md** 写好，保存为 `9.xx 第X场｜主题.md`，位于书稿第9章目录。

---

## 路径与配置

| 项目 | 值 |
|:---|:---|
| 第9章文章目录 | `/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/第四篇｜真实的赚钱/第9章｜我在Soul上亲访的赚钱案例/` |
| 项目（含 content_upload） | `一场soul的创业实验-永平` 或 `一场soul的创业实验-react`（根目录有 `content_upload.py`） |
| 第9章参数 | part-4, chapter-9, price 1.0 |

---

## 上传命令

在 **永平** 或 **react** 项目根目录执行：

```bash
python3 content_upload.py --id 9.xx --title "9.xx 第X场｜标题" \
  --content-file "<文章完整路径>" --part part-4 --chapter chapter-9 --price 1.0
```

示例（9.23）：

```bash
cd "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-react"
python3 content_upload.py --id 9.23 --title "9.23 第110场｜Soul变现逻辑全程公开" \
  --content-file "/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/第四篇｜真实的赚钱/第9章｜我在Soul上亲访的赚钱案例/9.23 第110场｜Soul变现逻辑全程公开.md" \
  --part part-4 --chapter chapter-9 --price 1.0
```

- id 已存在 → **更新**；不存在 → **创建**。
- 依赖：`pip install pymysql`；数据库为腾讯云 `soul_miniprogram.chapters`。

---

## 同步飞书群（上传后必做）

上传到小程序后，**同步**推送到固定飞书群：发**前 6% 正文**（一句一行、行间空一行）+ **章节海报图**（含该章节小程序码），**不发小程序链接**。详见 `上传/推送逻辑.md`。

在永平项目下执行（`--md` 为**本篇文章**的 md 路径）：

```bash
python3 scripts/send_chapter_poster_to_feishu.py 9.xx "第X场｜标题" --md "<文章.md 完整路径>"
```

- 需配置 `scripts/.env.feishu`（FEISHU_APP_ID、FEISHU_APP_SECRET）。
- 依赖：`pip install requests Pillow`。
- 默认发到 **Soul 彩民团队** 飞书群（webhook 已写在脚本内），无需复制链接，直接运行上述命令即可。

---

## 其他

- 查看篇章结构：`python3 content_upload.py --list-structure`
- 列出章节：`python3 content_upload.py --list-chapters`
