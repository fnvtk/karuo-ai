# 飞书任务：命令行与 API 优先 · 经验总结

> 卡若AI 执行原则：凡飞书相关任务，**优先用命令行 + API + TOKEN**，先查本经验与 `00_账号与API索引.md`，不额外打开网页操作。有已完成过的 TOKEN/会议/妙记流程，直接复用。

---

## 一、执行顺序（强制）

1. **先查本经验**：本文件 + `_共享模块/工作台/00_账号与API索引.md`（飞书 Token 小节）
2. **能用 API+TOKEN 的，一律命令行完成**：不先打开浏览器、不手动复制 Cookie，除非 API 确实不可用
3. **飞书开放平台凭证**：`FEISHU_APP_ID` / `FEISHU_APP_SECRET` → 获取 `tenant_access_token`，用于妙记、会议等开放接口

---

## 二、飞书 TOKEN 与账号（已完成过的）

| 用途 | 位置 | 说明 |
|:---|:---|:---|
| **应用凭证** | 智能纪要脚本内置 / 环境变量 `FEISHU_APP_ID` `FEISHU_APP_SECRET` | 默认 `cli_a48818290ef8100d` / 对应 secret，用于 tenant_access_token |
| **用户访问令牌** | `00_账号与API索引.md` § 六 · access_token / refresh_token | 用于日历等需用户身份的接口；过期后需重新授权 |
| **飞书项目（玩值电竞）** | 同上 § 飞书项目 | Plugin Token、project_key，用于需求同步 |

---

## 三、飞书妙记 / 会议（已完成过的流程）

### 3.1 单条妙记 → TXT（全命令行）

- **接口**：`GET /open-apis/minutes/v1/minutes/{minute_token}`、`/transcripts`、`/speakers`
- **凭证**：tenant_access_token（由 APP_ID + APP_SECRET 获取）
- **命令**：
  ```bash
  cd 02_卡人（水）/_团队成员/水桥/智能纪要/scripts
  python3 fetch_feishu_minutes.py "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8"
  ```

### 3.2 批量妙记 TXT（Soul/派对 多场）

- **开放平台无「妙记列表」接口**，只能对「已知链接」批量拉取。
- **链接来源二选一**：
  - **Cookie**：浏览器 F12 → 网络 → 请求 `list?size=20&space_name=` → 复制 Cookie → 写入 `scripts/cookie_minutes.txt` 或 `FEISHU_MINUTES_COOKIE`
  - **手动/控制台**：妙记列表页搜索「派对」或「soul」后，用 `scripts/获取100场链接-浏览器控制台.txt` 内脚本复制链接，粘贴到 `urls_soul_party.txt`
- **一键命令（先拉列表再下载，直到当前列表全部完成）**：
  ```bash
  cd 02_卡人（水）/_团队成员/水桥/智能纪要/scripts
  export FEISHU_APP_ID=你的appid FEISHU_APP_SECRET=你的secret   # 不设则用脚本默认
  python3 run_soul_minutes_download_all.py
  ```
- **仅批量下载（已有 urls 文件）**：
  ```bash
  python3 batch_download_minutes_txt.py --list urls_soul_party.txt --output ../soul_party_100_txt --skip-existing
  ```
- **输出目录**：`智能纪要/soul_party_100_txt/`，每场一个 TXT（标题_日期.txt）

### 3.3 产研会议日报（已有流程）

- 单条妙记链接或本地导出 txt → 生成总结+图 → 发飞书会议纪要群（全命令行）：
  ```bash
  python3 daily_chanyan_to_feishu.py "https://cunkebao.feishu.cn/minutes/xxx"
  # 或
  python3 daily_chanyan_to_feishu.py --file "产研团队 第20场 20260128 许永平.txt"
  ```

---

## 四、脚本与入口汇总

| 脚本 | 作用 | 凭证 |
|:---|:---|:---|
| `fetch_feishu_minutes.py` | 单条妙记 URL → 拉取并保存 TXT | tenant_access_token（APP_ID/SECRET） |
| `batch_download_minutes_txt.py` | urls 文件 → 批量拉取 TXT | 同上 |
| `fetch_minutes_list_by_cookie.py` | Cookie → 妙记列表 API → 过滤 派对/soul → 写 urls_soul_party.txt | Cookie（文件或 FEISHU_MINUTES_COOKIE） |
| `feishu_api_collect_minutes.py` | 尝试用 API+user_token 从日历拉取（开放平台无妙记列表则无结果） | tenant + 可选 FEISHU_USER_ACCESS_TOKEN |
| `run_soul_minutes_download_all.py` | 若有 Cookie 则拉列表 → 再批量下载，直到完成 | APP 凭证 + 可选 Cookie |
| `run_minutes_download_full.sh` | 同上，Shell 入口 | 同上 |

---

## 五、Soul 全部视频文本「直到全部完成」的推荐流程

1. **拿到链接列表**（二选一）  
   - 在 `scripts` 下创建 `cookie_minutes.txt`，粘贴从浏览器复制的 Cookie → 运行 `python3 run_soul_minutes_download_all.py`（会先拉列表再下载）  
   - 或按 `scripts/获取100场链接-浏览器控制台.txt` 在妙记列表页跑脚本，把复制出的链接粘贴到 `urls_soul_party.txt`
2. **执行下载**  
   ```bash
   cd 02_卡人（水）/_团队成员/水桥/智能纪要/scripts
   python3 run_soul_minutes_download_all.py
   ```  
   脚本会用 API+TOKEN 对当前列表中的链接全部拉取 TXT，已存在的会跳过，直到当前列表全部完成。
3. **凭证**：不设则用脚本内置 APP_ID/APP_SECRET；自定义则 `export FEISHU_APP_ID=... FEISHU_APP_SECRET=...`

---

**版本**：2026-02-16 | 归属：水桥 · 智能纪要 · 飞书
