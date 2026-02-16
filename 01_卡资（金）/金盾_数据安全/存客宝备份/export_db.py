#!/usr/bin/env python3
"""存客宝数据库导出脚本"""
import pymysql
import os
from datetime import datetime

# 配置
DB_CONFIG = {
    'host': '56b4c23f6853c.gz.cdb.myqcloud.com',
    'port': 14413,
    'user': 'cdb_outerroot',
    'password': 'Zhiqun1984'
}

BACKUP_DIR = os.path.dirname(os.path.abspath(__file__))

def export_database(db_name):
    print(f'\n{"="*50}')
    print(f'正在导出 {db_name}...')
    print(f'{"="*50}')
    
    conn = pymysql.connect(**DB_CONFIG, database=db_name, charset='utf8mb4')
    cursor = conn.cursor()
    
    output_file = os.path.join(BACKUP_DIR, f'{db_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.sql')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f'-- Database: {db_name}\n')
        f.write(f'-- Exported at: {datetime.now()}\n')
        f.write(f'-- Host: {DB_CONFIG["host"]}\n\n')
        f.write('SET NAMES utf8mb4;\n')
        f.write('SET FOREIGN_KEY_CHECKS = 0;\n\n')
        f.write(f'CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\n')
        f.write(f'USE `{db_name}`;\n\n')
        
        # 获取所有表
        cursor.execute('SHOW TABLES')
        tables = [t[0] for t in cursor.fetchall()]
        total = len(tables)
        
        for i, table in enumerate(tables, 1):
            try:
                print(f'  [{i}/{total}] {table}...', end=' ', flush=True)
                
                # 获取建表语句
                cursor.execute(f'SHOW CREATE TABLE `{table}`')
                create_sql = cursor.fetchone()[1]
                f.write(f'-- Table: {table}\n')
                f.write(f'DROP TABLE IF EXISTS `{table}`;\n')
                f.write(f'{create_sql};\n\n')
                
                # 获取数据（分批获取，避免内存溢出）
                cursor.execute(f'SELECT COUNT(*) FROM `{table}`')
                row_count = cursor.fetchone()[0]
                
                if row_count > 0:
                    batch_size = 1000
                    f.write(f'-- Data for {table}: {row_count} rows\n')
                    
                    for offset in range(0, row_count, batch_size):
                        cursor.execute(f'SELECT * FROM `{table}` LIMIT {batch_size} OFFSET {offset}')
                        rows = cursor.fetchall()
                        
                        for row in rows:
                            values = []
                            for v in row:
                                if v is None:
                                    values.append('NULL')
                                elif isinstance(v, (int, float)):
                                    values.append(str(v))
                                elif isinstance(v, bytes):
                                    values.append(f"X'{v.hex()}'")
                                elif isinstance(v, datetime):
                                    values.append(f"'{v.strftime('%Y-%m-%d %H:%M:%S')}'")
                                else:
                                    escaped = str(v).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")
                                    values.append(f"'{escaped}'")
                            f.write(f"INSERT INTO `{table}` VALUES ({', '.join(values)});\n")
                    f.write('\n')
                
                print(f'{row_count} rows ✓')
                
            except Exception as e:
                print(f'错误: {e}')
                f.write(f'-- Error exporting {table}: {e}\n\n')
        
        f.write('SET FOREIGN_KEY_CHECKS = 1;\n')
    
    conn.close()
    file_size = os.path.getsize(output_file) / 1024 / 1024
    print(f'\n✅ 导出完成: {output_file}')
    print(f'   文件大小: {file_size:.2f} MB')
    return output_file

if __name__ == '__main__':
    import sys
    databases = sys.argv[1:] if len(sys.argv) > 1 else ['cunkebao_v3', 'cunkebao']
    
    for db in databases:
        try:
            export_database(db)
        except Exception as e:
            print(f'导出 {db} 失败: {e}')
    
    print('\n全部完成！')
