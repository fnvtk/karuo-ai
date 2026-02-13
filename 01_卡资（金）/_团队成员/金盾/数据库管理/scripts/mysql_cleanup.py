#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云MySQL自动清理脚本
用途：定期清理日志表，防止磁盘再次爆满

使用方法：
    python3 mysql_cleanup.py

定时任务（每天凌晨3点执行）：
    crontab -e
    0 3 * * * /usr/bin/python3 /Users/karuo/Documents/个人/卡若AI/01_系统管理/数据库管理/scripts/mysql_cleanup.py >> /tmp/mysql_cleanup.log 2>&1

依赖安装：
    pip install pymysql
"""

import sys
from datetime import datetime

try:
    import pymysql
except ImportError:
    print("❌ 请先安装 pymysql: pip install pymysql")
    sys.exit(1)

# 数据库配置
DB_CONFIG = {
    'host': '56b4c23f6853c.gz.cdb.myqcloud.com',
    'port': 14413,
    'user': 'cdb_outerroot',
    'password': 'Zhiqun1984',
    'charset': 'utf8mb4',
    'connect_timeout': 30
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


def get_db_size(cursor):
    """获取数据库总大小"""
    cursor.execute("""
        SELECT ROUND(SUM(data_length + index_length)/1024/1024/1024, 2)
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
    """)
    result = cursor.fetchone()
    return result[0] if result else 0


def cleanup_table(cursor, conn, db, table, date_col, days):
    """清理单个表"""
    deleted = 0
    batch_size = 50000
    
    while True:
        try:
            cursor.execute(f"""
                DELETE FROM `{db}`.`{table}` 
                WHERE `{date_col}` < DATE_SUB(NOW(), INTERVAL {days} DAY) 
                LIMIT {batch_size}
            """)
            batch = cursor.rowcount
            conn.commit()
            deleted += batch
            
            if batch < batch_size:
                break
                
        except pymysql.Error as e:
            # 忽略表不存在或列不存在的错误
            error_msg = str(e)
            if 'Unknown column' in error_msg or "doesn't exist" in error_msg:
                return 0
            raise
    
    return deleted


def main():
    print(f"\n{'='*60}")
    print(f"🧹 MySQL自动清理 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        print("📡 连接数据库...")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✓ 连接成功")
        
        # 获取清理前大小
        size_before = get_db_size(cursor)
        print(f"📦 清理前数据库大小: {size_before} GB")
        print()
        
        total_deleted = 0
        success_count = 0
        
        for db, table, date_col, days in CLEANUP_TASKS:
            try:
                deleted = cleanup_table(cursor, conn, db, table, date_col, days)
                
                if deleted > 0:
                    print(f"✅ {db}.{table}: 删除 {deleted:,} 行 (保留{days}天)")
                    total_deleted += deleted
                    success_count += 1
                    
            except Exception as e:
                print(f"⚠️ {db}.{table}: {e}")
        
        print()
        print(f"{'='*60}")
        print(f"📊 清理统计")
        print(f"{'='*60}")
        print(f"   处理表数: {success_count}/{len(CLEANUP_TASKS)}")
        print(f"   删除总行数: {total_deleted:,}")
        
        # 获取清理后大小
        size_after = get_db_size(cursor)
        freed = size_before - size_after if size_before and size_after else 0
        print(f"   清理后大小: {size_after} GB")
        if freed > 0:
            print(f"   释放空间: {freed:.2f} GB")
        
        cursor.close()
        conn.close()
        
        print()
        print("✅ 清理完成!")
        
    except pymysql.Error as e:
        print(f"❌ 数据库错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
