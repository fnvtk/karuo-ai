# 飞书妙记批量下载 TXT 说明

> 场景：飞书妙记里已有多场带「派对」「受」等关键字的视频会议（如 soul 派对 100 场），需要把这批会议的文字记录**全部下载为 TXT**。  
> **纯接口+命令行，不打开浏览器**。凭证使用飞书应用 APP_ID / APP_SECRET（环境变量或脚本默认）。

## 一、为什么不能「一键筛 100 场再导出」

- 飞书开放平台**没有**「妙记列表」或「按标题筛选妙记」的 API，只能通过**已知的妙记链接（minute_token）**逐条拉取。
- 因此流程是：**先整理好妙记 URL 列表文件 → 用命令行+接口批量拉取 TXT**。

## 二、如何拿到 URL 列表（urls.txt）

### 方法 1：在飞书妙记列表里手动收集（推荐）

1. 打开飞书（客户端或网页）→ **视频会议** → **妙记**。
2. 在列表页的**搜索框**输入关键字，例如：`派对`、`受`、`soul 派对`，得到筛选后的列表。
3. 逐条点开每条记录，在浏览器地址栏复制链接（形如 `https://xxx.feishu.cn/minutes/xxxxxxxxxx`），粘贴到文本文件，**每行一个链接**，保存为 `urls.txt`。
4. 若使用飞书客户端，可尝试「在浏览器中打开」当前妙记，再复制地址栏。

### 方法 2：只写 minute_token（也可以）

若链接形式是 `https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8`，脚本也支持在 `urls.txt` 里只写后半段 token，例如一行写 `obcnjnsx2mz7vj5q843172p8` 即可。

## 三、批量下载命令（纯接口，不打开浏览器）

在智能纪要脚本目录下执行。凭证可选：不设则用脚本内置 appid；自定义则用环境变量 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`。

```bash
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/_团队成员/水桥/智能纪要/scripts

# 批量下载，输出到默认 output
python3 batch_download_minutes_txt.py --list urls.txt

# 输出到指定目录（如 soul 派对 100 场）
python3 batch_download_minutes_txt.py --list urls.txt --output ./soul_party_100_txt

# 已存在同名 TXT 则跳过（断点续跑）
python3 batch_download_minutes_txt.py --list urls.txt --output ./soul_party_100_txt --skip-existing

# 先试跑 3 条
python3 batch_download_minutes_txt.py --list urls.txt --limit 3

# 使用自定义 appid（环境变量）
FEISHU_APP_ID=你的app_id FEISHU_APP_SECRET=你的app_secret python3 batch_download_minutes_txt.py --list urls.txt --output ./out_txt
```

## 四、输出说明

- 每条妙记会生成一个 TXT，文件名格式：`标题_日期.txt`（非法字符会替换为下划线）。
- 若应用没有「妙记文字记录」权限，该条会保存为仅含标题+时长的占位内容；可在飞书妙记页对该条手动「…」→「导出文字记录」后，用导出的文件覆盖或合并。

## 五、相关脚本

| 脚本 | 作用 |
|:---|:---|
| `batch_download_minutes_txt.py` | 从 urls.txt 批量拉取 TXT |
| `fetch_feishu_minutes.py` | 单条妙记链接 → 拉取并保存 TXT（被批量脚本复用） |

---

**版本**：2026-02-16 | 归属：水桥 · 智能纪要
