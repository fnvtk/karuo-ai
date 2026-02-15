# 飞书妙记「派对/受」100 场完全下载

**纯飞书 API + token，全命令行，不打开浏览器。**

- 凭证：`FEISHU_APP_ID` / `FEISHU_APP_SECRET`（必选）；可选 `FEISHU_USER_ACCESS_TOKEN` 尝试从日历拉取带会议的日程。
- 开放平台**无妙记列表接口**，链接需在 `urls_soul_party.txt` 中维护（每行一个），或使用 Cookie 脚本拉列表。

## 一键命令（推荐）

```bash
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/_团队成员/水桥/智能纪要/scripts
export FEISHU_APP_ID=你的app_id FEISHU_APP_SECRET=你的app_secret   # 可选，有默认
./run_minutes_download_full.sh
```

脚本会：1）用 API+token 尝试收集妙记链接（若设置了 `FEISHU_USER_ACCESS_TOKEN` 会拉日历）；2）若有链接则批量下载 TXT 到 `soul_party_100_txt/`。

## 一步到位（需先拿到链接或 Cookie）

**方式 A：用 Cookie 自动拉列表再下载（推荐）**

1. 浏览器打开 https://cunkebao.feishu.cn/minutes/home ，F12 → 网络 → 刷新 → 找到请求 `list?size=20&space_name=` → 右键该请求 → 复制 → 复制为 cURL 或从请求头里复制整段 **Cookie**。
2. 在 `scripts` 目录下创建 `cookie_minutes.txt`，把复制的 Cookie 粘贴进去（仅第一行有效）；或设置环境变量 `FEISHU_MINUTES_COOKIE`。
3. 在 `scripts` 目录执行：

```bash
python3 fetch_minutes_list_by_cookie.py && python3 collect_minutes_urls_and_download.py
```

会先按「派对/受/soul」过滤并写入 `urls_soul_party.txt`，再批量下载 TXT 到 `soul_party_100_txt/`。

**方式 B：已有链接列表**

把妙记链接每行一个写入 `urls_soul_party.txt`（可保留 `#` 注释行），然后执行：

```bash
python3 collect_minutes_urls_and_download.py
```

## 脚本说明

| 脚本 | 作用 |
|------|------|
| `fetch_minutes_list_by_cookie.py` | 用 Cookie 调妙记列表 API，按标题过滤后写入 `urls_soul_party.txt` |
| `collect_minutes_urls_and_download.py` | 读 `urls_soul_party.txt`，调用批量下载，不打开浏览器 |
| `batch_download_minutes_txt.py` | 读任意 urls 文件，逐条调飞书开放接口拉 TXT |

飞书无公开「妙记列表」接口，列表只能通过上述 Cookie 方式或手动整理链接获得。
