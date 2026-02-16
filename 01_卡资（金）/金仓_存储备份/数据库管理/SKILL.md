---
name: 数据库管理
description: 数据库运维和优化。触发词：清理数据库、MySQL优化、MongoDB清理、数据库日志、数据库占用、binlog、慢查询、数据库备份、腾讯云数据库。包含日志清理、空间优化、定时维护脚本、自动化清理。
group: 金
triggers: MySQL、清理数据库、数据库备份
owner: 金仓
version: "1.0"
updated: "2026-02-16"
---

# 数据库管理

管理卡若本地和云端数据库，提供日志清理、空间优化、定时维护服务。

## 数据库概览

### 本地数据库

| 类型 | 路径 | 大小 |
|------|------|------|
| MongoDB | ~/数据库/mongodb | 211GB |
| MongoDB日志 | ~/数据库/mongodb/logs/mongod.log | 可截断 |

### 腾讯云 MySQL

| 项目 | 值 |
|------|-----|
| 地址 | 56b4c23f6853c.gz.cdb.myqcloud.com:14413 |
| 用户 | cdb_outerroot |
| 磁盘 | 25GB（需保持 <80% 使用率） |

---

## MySQL 日志管理

### 查看日志占用

```sql
-- 二进制日志列表
SHOW BINARY LOGS;

-- 日志总大小(GB)
SELECT ROUND(SUM(FILE_SIZE)/1024/1024/1024, 2) AS 'Size_GB' 
FROM performance_schema.binary_log_files;

-- 各数据库大小
SELECT 
    table_schema AS '数据库',
    ROUND(SUM(data_length + index_length)/1024/1024, 2) AS '大小(MB)'
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
GROUP BY table_schema
ORDER BY SUM(data_length + index_length) DESC;
```

### 清理二进制日志

```sql
-- 保留最近3天的日志
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);

-- 保留到指定日志文件
PURGE BINARY LOGS TO 'mysql-bin.000100';
```

### 设置自动过期

```sql
-- MySQL 5.x: 保留7天
SET GLOBAL expire_logs_days = 7;

-- MySQL 8.0+: 保留7天(秒)
SET GLOBAL binlog_expire_logs_seconds = 604800;

-- 查看当前设置
SHOW VARIABLES LIKE '%expire%';
```

---

## MySQL 自动清理脚本

### Python 定时清理脚本

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云MySQL自动清理脚本
用途：定期清理日志表，防止磁盘再次爆满
建议：设置 crontab 每天凌晨执行
      0 3 * * * /usr/bin/python3 /path/to/mysql_cleanup.py >> /tmp/mysql_cleanup.log 2>&1
"""

import pymysql
from datetime import datetime

DB_CONFIG = {
    'host': '56b4c23f6853c.gz.cdb.myqcloud.com',
    'port': 14413,
    'user': 'cdb_outerroot',
    'password': 'Zhiqun1984',
    'charset': 'utf8mb4'
}

# 清理配置：(数据库, 表名, 日期列, 保留天数)
CLEANUP_TASKS = [
    # lytiaocom 日志
    ('lytiaocom', 'log_v8', 'createdTime', 30),
    ('lytiaocom', 'log', 'createdTime', 30),
    ('lytiaocom', 'biz_scheduler_job_log', 'created_time', 7),
    ('lytiaocom', 'biz_scheduler_job_process', 'created_time', 3),
    ('lytiaocom', 'biz_queue_failed_job', 'failed_time', 7),
    ('lytiaocom', 'activity_learn_log', 'createdTime', 30),
    ('lytiaocom', 'user_active_log', 'createdTime', 7),
    ('lytiaocom', 'referer_log', 'createdTime', 7),
    ('lytiaocom', 'user_token', 'expiredTime', 7),
    
    # cunkebao 日志
    ('cunkebao', 'MaterialPushLog', 'dNewTime', 30),
    ('cunkebao', 'SysOperaLog', 'dNewTime', 30),
    
    # dygqshop 日志
    ('dygqshop', 'SysTaskLog', 'createTime', 30),
    
    # lkdie 日志
    ('lkdie', 'pre_security_failedlog', 'createtime', 30),
    
    # hx-private-server_v2
    ('hx-private-server_v2', 'WechatMomentTask', 'createdTime', 30),
]

def main():
    print(f"\n{'='*60}")
    print(f"🧹 MySQL自动清理 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        total_deleted = 0
        
        for db, table, date_col, days in CLEANUP_TASKS:
            try:
                deleted = 0
                while True:
                    cursor.execute(f"""
                        DELETE FROM `{db}`.`{table}` 
                        WHERE `{date_col}` < DATE_SUB(NOW(), INTERVAL {days} DAY) 
                        LIMIT 50000
                    """)
                    batch = cursor.rowcount
                    conn.commit()
                    deleted += batch
                    if batch < 50000:
                        break
                
                if deleted > 0:
                    print(f"✅ {db}.{table}: 删除 {deleted:,} 行")
                    total_deleted += deleted
                    
            except Exception as e:
                if 'Unknown column' not in str(e) and "doesn't exist" not in str(e):
                    print(f"⚠️ {db}.{table}: {e}")
        
        print(f"\n📊 总计删除: {total_deleted:,} 行")
        
        # 获取当前数据库大小
        cursor.execute("""
            SELECT ROUND(SUM(data_length + index_length)/1024/1024/1024, 2)
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        """)
        total_size = cursor.fetchone()[0]
        print(f"📦 当前数据库大小: {total_size} GB")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    main()
```

### 设置 Crontab 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨3点执行）
0 3 * * * /usr/bin/python3 /Users/karuo/Documents/个人/卡若AI/01_系统管理/数据库管理/scripts/mysql_cleanup.py >> /tmp/mysql_cleanup.log 2>&1
```

---

## MongoDB 日志管理

### 日志清理

```bash
# 截断日志（最安全，不影响服务）
> ~/数据库/mongodb/logs/mongod.log

# 通过 mongosh 轮转日志
mongosh --eval "db.adminCommand({ logRotate: 1 })"

# 查看日志大小
ls -lh ~/数据库/mongodb/logs/
```

### 清理旧数据

```javascript
// 在 mongosh 中执行
// 删除30天前的日志数据
db.logs.deleteMany({
    createdAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
})

// 查看集合大小
db.collection.stats().size / 1024 / 1024  // MB
```

---

## 腾讯云 MySQL 控制台操作

### 步骤1：清理 Binlog 日志

1. 登录腾讯云控制台：https://console.cloud.tencent.com/cdb
2. 找到实例 → 点击实例ID进入详情
3. 左侧菜单 → **备份恢复**
4. 找到 **binlog 日志** 选项卡
5. 设置 **binlog 保留时间** 为 **3天**
6. 点击 **手动清理** 按钮

### 步骤2：修改参数

1. 左侧菜单 → **参数设置**
2. 搜索并修改：

| 参数名 | 当前值 | 建议值 | 说明 |
|--------|--------|--------|------|
| expire_logs_days | 0 | **3** | binlog保留3天 |
| long_query_time | 10 | **2** | 慢查询阈值降低 |
| slow_query_log | ON | ON | 保持开启 |

3. 点击 **提交修改** → 确认重启

### 步骤3：考虑扩容（可选）

如果清理后磁盘仍然紧张：
1. 左侧菜单 → **配置调整**
2. 将磁盘从 25GB 扩容到 **50GB**
3. 费用约增加 ¥8-10/月

---

## 数据库备份

### MySQL 备份

```bash
# 导出单个数据库
mysqldump -h 56b4c23f6853c.gz.cdb.myqcloud.com -P 14413 \
    -u cdb_outerroot -p数据库名 > backup.sql

# 导出所有数据库
mysqldump -h 56b4c23f6853c.gz.cdb.myqcloud.com -P 14413 \
    -u cdb_outerroot -p --all-databases > all_backup.sql

# 压缩备份
mysqldump ... | gzip > backup.sql.gz
```

### MongoDB 备份

```bash
# 导出指定数据库
mongodump --db 数据库名 --out /path/to/backup

# 导出所有数据库
mongodump --out /path/to/backup

# 恢复
mongorestore /path/to/backup
```

---

## 监控和告警

### 磁盘使用率检查

```sql
-- 查看各表大小（从大到小）
SELECT 
    table_schema AS '数据库',
    table_name AS '表名',
    ROUND((data_length + index_length)/1024/1024, 2) AS '大小(MB)'
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
ORDER BY (data_length + index_length) DESC
LIMIT 20;
```

### 慢查询分析

```sql
-- 查看慢查询设置
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';

-- 慢查询日志位置
SHOW VARIABLES LIKE 'slow_query_log_file';
```

---

## 安全原则

| 原则 | 说明 |
|------|------|
| 保留日志 | 至少保留3天日志用于排查问题 |
| 备份优先 | 生产库清理前先备份 |
| 控制台优先 | 腾讯云操作优先使用控制台 |
| 分批删除 | 大量数据分批删除，避免锁表 |
| 低峰操作 | 选择凌晨低峰期执行清理 |

---

## 预期效果

执行完整优化后：

| 项目 | 清理前 | 清理后 |
|------|--------|--------|
| 磁盘使用 | 27.5GB (100%) | ~15GB (~60%) |
| 日志文件 | 11.9GB | ~1GB |
| 数据文件 | 12GB | ~8GB |
