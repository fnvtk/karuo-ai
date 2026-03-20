# Navicat Premium 静默控制方案

> **目标**：不打开 Navicat GUI，用命令行/脚本完成「Navicat 能做的」数据库操作，供卡若AI 与自动化流程调用。  
> 维护：金仓；归属：金仓_存储备份。

---

## 一、Navicat 官方 CLI 能力分析

### 1.1 官方「命令行」是什么

- Navicat 文档里的「命令行界面」指**软件内部的**「命令行工具」窗口：需先**打开 Navicat**，在界面里选择「命令行工具」再执行 SQL。
- **结论**：官方没有提供「不启动 GUI、纯命令行」的独立 CLI；所有「用命令连接/用命令备份」都是在**已打开软件**的前提下，在 GUI 内操作。

### 1.2 平台差异

| 平台   | 命令行能力 |
|--------|------------|
| Windows | 部分版本支持 `Navicat.exe /backup MySQL ConnectionName` 等参数，可做备份等；文档不完整。 |
| macOS   | **未提供**等价命令行参数；无独立可执行 CLI，无法静默调起备份/导出。 |

### 1.3 若必须用 Navicat 本身

- **AppleScript / JXA**：可控制已运行的 Navicat（菜单、按钮、窗口），但会带出界面，无法做到「完全静默、不打开 APP」。
- **URL Scheme**：未在公开文档中看到 Navicat 注册 `navicat://` 等 URL Scheme；若需可自行查 `Info.plist` 的 `CFBundleURLTypes`。

---

## 二、静默控制思路（不打开 APP）

核心思路：**用各数据库原生 CLI 替代 Navicat 的查询/备份/导入导出**，实现「静默、脚本化」；Navicat 仅作「连接配置的参考来源」。

| Navicat 功能     | 静默实现方式 |
|------------------|--------------|
| 连接 MySQL       | `mysql` / `mysqldump`（或 Python `pymysql`） |
| 连接 MongoDB     | `mongosh` / `mongodump` / `mongoexport` |
| 连接 PostgreSQL  | `psql` / `pg_dump` |
| 连接 SQLite      | `sqlite3` |
| 备份/导出        | `mysqldump`、`mongodump`、`pg_dump`、复制 db 文件 |
| 导入/恢复        | `mysql < file.sql`、`mongorestore`、`psql -f` |
| 执行 SQL/查询   | 上述 CLI 或各语言驱动直接执行 |
| 数据传输/同步    | 需自行用脚本（导出→导入）或 ETL 工具；无 Navicat 时无法用其「数据传输」向导 |

连接信息从哪来：**从 Navicat 的配置里读**（见下一节），再传给上述 CLI/脚本。

---

## 三、Navicat 配置位置（macOS）

- **连接等配置**：`~/Library/Preferences/com.premiumSoft.NavicatPremium.plist`  
  或版本/产品线不同可能为：`com.premiumSoft.Navicat*` 系列 plist。
- 可用 `plutil -p ~/Library/Preferences/com.premiumSoft.NavicatPremium.plist` 查看结构；连接多为键值或嵌套字典（主机、端口、用户等），密码可能加密存储。

---

## 四、实现要点

### 4.1 本目录内容

1. **静默命令对照表**  
   见同目录 `Navicat_功能与静默命令对照表.md`，按「Navicat 功能 → 对应命令行」列表，便于卡若AI 或人工替换。

2. **从 Navicat 配置读连接信息（可选）**  
   脚本：`scripts/read_navicat_connections.py`：  
   - 读 `~/Library/Preferences/com.premiumSoft.NavicatPremium.plist`；  
   - 解析出连接名、主机、端口、用户、数据库名（密码若加密则需另填或钥匙串）；  
   - 输出为 JSON，供 `mysql`/`mongosh`/`psql` 等命令使用。  
   这样「不打开 APP」也能复用你在 Navicat 里配好的连接名与主机/端口/库名。

3. **与现有技能联动**  
   - 数据库管理（金仓）：备份、清理、维护脚本已用 `mysql`/`mongosh` 等，与本方案一致；需要时可直接引用「静默命令对照表」与「读 Navicat 连接」脚本。  
   - 本机数据库统一规则、唯一 MongoDB 约定：脚本输出的连接信息需符合现有「本机一个实例、按库名区分」等约定。

### 4.2 无法静默替代的部分

- **Navicat 独有功能**：如「数据传输」向导、部分可视化同步、报表等，无官方 CLI 时无法在不打开 APP 的前提下完全等价实现；只能通过「导出→脚本处理→导入」或其它工具链替代。

---

## 五、使用方式（卡若AI）

- 用户说「用命令行备份某库」「不打开 Navicat 执行某 SQL」等：  
  走**数据库管理** Skill，按「静默命令对照表」用 `mysqldump`/`mongosh`/`mysql` 等执行；若需用 Navicat 里已保存的连接，可先跑 `scripts/read_navicat_connections.py` 取连接参数再调用原生 CLI。
- 用户说「静默控制 Navicat」「不打开 Navicat 做 xxx」：  
  优先解释「官方无静默 CLI」，并给出「用原生 CLI + 本方案」的等价做法与文档链接（本目录 README + 对照表）。

---

## 六、版本记录

| 日期       | 变更 |
|------------|------|
| 2026-03-19 | 初版：Navicat CLI 分析、静默思路、配置路径、实现要点与使用方式。 |
| 2026-03-19 | 以原程序名命名，迁至金仓_存储备份下，移除「卡罗帮」称谓。 |
