# Soul 文章上传 · 环境与 TOKEN 配置

> 目标：在**新电脑**上，只要拉下两个仓库 + 配好 TOKEN，就能把文章上传到小程序、推送到飞书群。

---

## 一、需要的两个仓库

1. **书稿仓库（Mycontent / 书）**
   - 路径：`/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》`
   - 作用：存放所有 md 文章，含 `2026每日派对干货/`。
   - Git 远端：`fnvtk/Mycontent`（origin + gitea），同步脚本：`scripts/gitea_sync.sh`。

2. **永平项目仓库（内容上传 + 飞书推送）**
   - 路径示例：`/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平`
   - 根目录下有：
     - `content_upload.py`（上传到小程序 / DB）
     - `scripts/send_chapter_poster_to_feishu.py`（生成海报 + 发飞书）
     - `scripts/.env.feishu.example`（飞书 TOKEN 模板）

在新电脑上：

```bash
cd "/Users/karuo/Documents/个人"
git clone https://github.com/fnvtk/Mycontent.git "2、我写的书/《一场soul的创业实验》"

cd "/Users/karuo/Documents/开发/3、自营项目"
git clone https://github.com/fnvtk/Mycontent.git "一场soul的创业实验-永平"   # 或从 gitea 克隆同名仓库
```

---

## 二、Python 依赖

在永平项目目录安装依赖（全局或虚拟环境均可）：

```bash
cd "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"
pip install pymysql requests Pillow
```

- `pymysql`：`content_upload.py` 连接腾讯云 MySQL `soul_miniprogram.chapters`。
- `requests`、`Pillow`：`scripts/send_chapter_poster_to_feishu.py` 生成海报并调用飞书 webhook。

> **说明**：数据库连接配置（`DB_CONFIG`）在 `content_upload.py` 内部已写好，如需更换 DB 或密码，请在该脚本中修改。

---

## 三、飞书 TOKEN 配置（.env.feishu）

飞书推送脚本会从 `scripts/.env.feishu` 读取 AppID / AppSecret 等环境变量：

1. 进入脚本目录：

   ```bash
   cd "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平/scripts"
   ```

2. 基于示例创建实际配置：

   ```bash
   cp .env.feishu.example .env.feishu
   ```

3. 编辑 `.env.feishu`，填入真实值：

   ```env
   FEISHU_APP_ID=你的飞书应用AppID
   FEISHU_APP_SECRET=你的飞书应用AppSecret
   FEISHU_WIKI_NODE_TOKEN=FNP6wdvNKij7yMkb3xCce0CYnpd  # 如需用到知识库，可保留或按实际修改
   # 可选：书稿根目录
   # SOUL_BOOK_ROOT=/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》
   ```

- 飞书 App 配置参考：`02_卡人（水）/水桥_平台对接/飞书管理/运营报表_SKILL.md` 中的应用说明。
- `send_chapter_poster_to_feishu.py` 脚本内部已经写好默认的章节推送 webhook（**Soul 彩民团队** 群），一般无需修改。

---

## 四、小程序上传接口（content_upload.py）

- 文件：`/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平/content_upload.py`
- 关键配置：

  ```python
  DB_CONFIG = {
      "host": "56b4c23f6853c.gz.cdb.myqcloud.com",
      "port": 14413,
      "user": "cdb_outerroot",
      "password": "Zhiqun1984",
      "database": "soul_miniprogram",
      "charset": "utf8mb4",
  }
  ```

- 若你在新环境中使用同一数据库，**无需额外 TOKEN**，只要网络能连通腾讯云 MySQL 即可。
- 若更换为新的 DB 或账号密码，请修改 `DB_CONFIG`，保持字段名一致。

上传命令与参数见本目录下 `README.md`：

- 2026 场次（`part-2026-daily` / `chapter-2026-daily`，id 10.xx）
- 第 9 章（`part-4` / `chapter-9`，id 9.xx）

---

## 五、新电脑上的完整操作步骤小抄

1. **拉代码**
   - 克隆书稿仓库到：`/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》`
   - 克隆永平项目到：`/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平`

2. **装依赖**

   ```bash
   cd "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"
   pip install pymysql requests Pillow
   ```

3. **配置飞书 TOKEN**

   ```bash
   cd scripts
   cp .env.feishu.example .env.feishu
   # 编辑 .env.feishu 填 FEISHU_APP_ID / FEISHU_APP_SECRET
   ```

4. **写文章**
   - 按 `写作/写作规范.md` 写第 X 场，保存到指定目录（第9章或 `2026每日派对干货/`）。

5. **同步书稿到 Gitea（实时）**

   ```bash
   cd "/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》"
   bash scripts/gitea_sync.sh
   ```

6. **按需上传小程序 / 推送飞书**
   - 上传小程序：按 `上传/README.md` 中的 `content_upload.py` 命令执行。
   - 推送飞书：按 `上传/README.md` 中的 `send_chapter_poster_to_feishu.py` 命令执行（仅在你说要推送时）。

> 如需在别的电脑继承整套能力：拉 KaruoAI 仓库（含本 Skill 的基因胶囊）、书稿仓库、永平项目仓库，按本文件配置环境与 TOKEN 即可。

