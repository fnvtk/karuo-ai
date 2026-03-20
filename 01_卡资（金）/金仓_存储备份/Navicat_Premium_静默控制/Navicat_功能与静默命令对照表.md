# Navicat 功能与静默命令对照表

> 不打开 Navicat，用系统自带或常用 CLI 实现相同能力。卡若AI 执行「数据库备份/查询/导入导出」时优先用本表命令。

---

## MySQL / MariaDB

| Navicat 功能     | 静默命令 / 方式 |
|------------------|-----------------|
| 连接并执行 SQL   | `mysql -h HOST -P PORT -u USER -p DBNAME -e "SELECT ..."` 或 `mysql ... < script.sql` |
| 备份整个库       | `mysqldump -h HOST -P PORT -u USER -p DBNAME > backup.sql` |
| 仅表结构         | `mysqldump --no-data ...` |
| 恢复             | `mysql -h HOST -P PORT -u USER -p DBNAME < backup.sql` |
| 导出为 CSV       | `mysql ... -e "SELECT ..." \| sed 's/\t/,/g' > out.csv` 或脚本用 pymysql + csv |

---

## MongoDB

| Navicat 功能     | 静默命令 / 方式 |
|------------------|-----------------|
| 连接并执行       | `mongosh "mongodb://USER:PASS@HOST:PORT/DB" --eval "db.collection.find()"` |
| 备份（dump）     | `mongodump --uri="mongodb://..." --out=/path/to/dump` |
| 恢复             | `mongorestore --uri="mongodb://..." /path/to/dump` |
| 导出集合为 JSON  | `mongoexport --uri="..." -c COLLECTION -o out.json` |
| 导出为 CSV       | `mongoexport ... --type=csv -f "field1,field2" -o out.csv` |

---

## PostgreSQL

| Navicat 功能     | 静默命令 / 方式 |
|------------------|-----------------|
| 连接并执行 SQL   | `psql -h HOST -p PORT -U USER -d DBNAME -c "SELECT ..."` 或 `psql ... -f script.sql` |
| 备份             | `pg_dump -h HOST -p PORT -U USER DBNAME > backup.sql` |
| 恢复             | `psql -h HOST -p PORT -U USER -d DBNAME -f backup.sql` |

---

## SQLite

| Navicat 功能     | 静默命令 / 方式 |
|------------------|-----------------|
| 连接并执行       | `sqlite3 /path/to/db.sqlite "SELECT ..."` 或 `sqlite3 db.sqlite < script.sql` |
| 备份             | `cp db.sqlite backup.sqlite` 或 `sqlite3 db.sqlite ".backup backup.sqlite"` |
| 导出为 CSV       | `sqlite3 -header -csv db.sqlite "SELECT * FROM t" > out.csv` |

---

## 本机约定（卡若AI）

- **MongoDB**：本机统一 `localhost:27017`，库名见 `运营中枢/工作台/本机数据库统一规则.md`（如 `karuo_site`）。
- **MySQL**：本机/腾讯云等见同目录上级 `数据库管理/SKILL.md` 与《00_账号与API索引》中的连接信息；脚本中勿写死密码，用环境变量或《00》中约定方式。

---

## 版本记录

| 日期       | 变更 |
|------------|------|
| 2026-03-19 | 初版：MySQL/MongoDB/PostgreSQL/SQLite 静默命令对照。 |
| 2026-03-19 | 迁至金仓 Navicat_Premium_静默控制 目录。 |
