#!/usr/bin/env python3
"""
飞书管理 - 命令行工具
作者: 卡若
功能: 快速下载云盘、导出妙记、同步知识库

使用示例:
    # 下载云盘文件
    python feishu_cli.py drive --output ~/Downloads/飞书备份
    
    # 导出妙记
    python feishu_cli.py minutes --start 2026-01-01 --end 2026-01-23 --output ~/Downloads/妙记
    
    # 同步知识库
    python feishu_cli.py wiki --output ~/Downloads/知识库
    
    # 搜索文档
    python feishu_cli.py search --keyword "项目文档" --output ~/Downloads/搜索结果
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime, timedelta

# API配置
API_BASE = "http://localhost:5050/api"

# 颜色输出
class Color:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    END = '\033[0m'

def log(msg, color=None):
    if color:
        print(f"{color}{msg}{Color.END}")
    else:
        print(msg)

def check_service():
    """检查API服务是否运行"""
    try:
        resp = requests.get(f"{API_BASE}/health", timeout=3)
        data = resp.json()
        if data.get('status') == 'ok':
            if data.get('has_user_token'):
                log(f"✅ 服务正常 | 已登录: {data.get('user_name', '未知')}", Color.GREEN)
                return True
            else:
                log("⚠️ 服务正常但未授权，请先在Web界面完成授权", Color.YELLOW)
                log("   打开: http://localhost:5050 进行授权", Color.YELLOW)
                return False
        return False
    except:
        log("❌ API服务未启动，请先运行: ./start.sh", Color.RED)
        return False

def download_file(content: str, filepath: str):
    """保存内容到文件"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    log(f"  📄 保存: {filepath}", Color.CYAN)

# ============== 云盘操作 ==============

def cmd_drive(args):
    """云盘文件下载"""
    log("\n🦋 飞书云盘下载", Color.GREEN)
    log("=" * 50)
    
    if not check_service():
        return
    
    output_dir = os.path.expanduser(args.output or "~/Downloads/飞书云盘")
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取文件列表
    log("\n📂 获取云盘文件列表...")
    resp = requests.get(f"{API_BASE}/drive/files")
    data = resp.json()
    
    if data.get('code') != 0:
        log(f"❌ 获取失败: {data.get('msg')}", Color.RED)
        return
    
    files = data.get('data', {}).get('files', [])
    log(f"📊 找到 {len(files)} 个文件/文件夹")
    
    # 筛选可下载的文件
    downloadable = [f for f in files if f.get('type') != 'folder']
    folders = [f for f in files if f.get('type') == 'folder']
    
    log(f"   - 文件: {len(downloadable)} 个")
    log(f"   - 文件夹: {len(folders)} 个")
    
    if not downloadable:
        log("⚠️ 没有可下载的文件", Color.YELLOW)
        return
    
    # 下载文件
    log(f"\n📥 开始下载到: {output_dir}")
    items = [{
        'token': f.get('token'),
        'name': f.get('name', '未命名'),
        'type': f.get('type', 'docx')
    } for f in downloadable]
    
    resp = requests.post(f"{API_BASE}/batch/export", json={'items': items})
    results = resp.json().get('data', {}).get('results', [])
    
    success_count = 0
    for r in results:
        if r.get('success') and r.get('content'):
            filepath = os.path.join(output_dir, f"{r.get('name', '未命名')}.md")
            download_file(r.get('content'), filepath)
            success_count += 1
    
    log(f"\n✅ 下载完成! 成功: {success_count}/{len(items)}", Color.GREEN)
    log(f"📁 保存位置: {output_dir}")

# ============== 妙记操作 ==============

def cmd_minutes(args):
    """妙记导出"""
    log("\n🎙️ 飞书妙记导出", Color.GREEN)
    log("=" * 50)
    
    if not check_service():
        return
    
    output_dir = os.path.expanduser(args.output or "~/Downloads/飞书妙记")
    os.makedirs(output_dir, exist_ok=True)
    
    # 时间范围
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    if args.start:
        start_date = datetime.strptime(args.start, '%Y-%m-%d')
    if args.end:
        end_date = datetime.strptime(args.end, '%Y-%m-%d')
    
    log(f"📅 时间范围: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}")
    
    # 获取妙记列表
    log("\n📋 获取妙记列表...")
    params = {
        'start_time': int(start_date.timestamp()),
        'end_time': int(end_date.timestamp())
    }
    resp = requests.get(f"{API_BASE}/minutes", params=params)
    data = resp.json()
    
    if data.get('code') != 0:
        log(f"❌ 获取失败: {data.get('msg')}", Color.RED)
        return
    
    minutes = data.get('data', {}).get('minutes', [])
    log(f"📊 找到 {len(minutes)} 个妙记")
    
    if not minutes:
        log("⚠️ 该时间范围内没有妙记", Color.YELLOW)
        return
    
    # 导出妙记
    log(f"\n📥 开始导出到: {output_dir}")
    success_count = 0
    
    for m in minutes:
        token = m.get('minute_token')
        title = m.get('title', '未命名妙记')
        create_time = m.get('create_time', 0)
        
        log(f"\n  处理: {title}")
        
        # 获取转写内容
        resp = requests.get(f"{API_BASE}/minutes/{token}/transcript")
        transcript_data = resp.json()
        
        if transcript_data.get('code') == 0:
            transcript = transcript_data.get('data', {})
            
            # 格式化内容
            content = f"# {title}\n\n"
            content += f"**创建时间**: {datetime.fromtimestamp(create_time).strftime('%Y-%m-%d %H:%M')}\n\n"
            content += "---\n\n"
            
            # 提取转写文本
            paragraphs = transcript.get('paragraphs', [])
            for p in paragraphs:
                speaker = p.get('speaker', {}).get('user_name', '未知')
                sentences = p.get('sentences', [])
                text = ''.join([s.get('text', '') for s in sentences])
                content += f"**{speaker}**: {text}\n\n"
            
            # 保存
            safe_title = "".join(c for c in title if c.isalnum() or c in ' _-中文')
            date_str = datetime.fromtimestamp(create_time).strftime('%Y%m%d')
            filepath = os.path.join(output_dir, f"{date_str}_{safe_title}.md")
            download_file(content, filepath)
            success_count += 1
        else:
            log(f"  ⚠️ 获取转写失败: {transcript_data.get('msg')}", Color.YELLOW)
    
    log(f"\n✅ 导出完成! 成功: {success_count}/{len(minutes)}", Color.GREEN)
    log(f"📁 保存位置: {output_dir}")

# ============== 知识库操作 ==============

def cmd_wiki(args):
    """知识库同步"""
    log("\n📚 飞书知识库同步", Color.GREEN)
    log("=" * 50)
    
    if not check_service():
        return
    
    output_dir = os.path.expanduser(args.output or "~/Downloads/飞书知识库")
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取知识库列表
    log("\n📖 获取知识库列表...")
    resp = requests.get(f"{API_BASE}/wiki/spaces")
    data = resp.json()
    
    if data.get('code') != 0:
        log(f"❌ 获取失败: {data.get('msg')}", Color.RED)
        return
    
    spaces = data.get('data', {}).get('items', [])
    log(f"📊 找到 {len(spaces)} 个知识库")
    
    for space in spaces:
        log(f"   - {space.get('name', '未命名')}")
    
    if not spaces:
        log("⚠️ 没有可访问的知识库", Color.YELLOW)
        return
    
    # 同步每个知识库
    total_docs = 0
    
    for space in spaces:
        space_id = space.get('space_id')
        space_name = space.get('name', '未命名')
        space_dir = os.path.join(output_dir, space_name)
        os.makedirs(space_dir, exist_ok=True)
        
        log(f"\n📂 同步知识库: {space_name}")
        
        # 获取节点
        resp = requests.get(f"{API_BASE}/wiki/spaces/{space_id}/nodes")
        nodes_data = resp.json()
        
        if nodes_data.get('code') != 0:
            log(f"  ⚠️ 获取节点失败", Color.YELLOW)
            continue
        
        nodes = nodes_data.get('data', {}).get('items', [])
        log(f"   找到 {len(nodes)} 个文档")
        
        # 导出节点
        items = [{
            'node_token': n.get('node_token'),
            'space_id': space_id,
            'title': n.get('title', '未命名')
        } for n in nodes]
        
        if items:
            resp = requests.post(f"{API_BASE}/wiki/export", json={'items': items})
            results = resp.json().get('data', {}).get('results', [])
            
            for r in results:
                if r.get('success') and r.get('content'):
                    title = r.get('title', '未命名')
                    safe_title = "".join(c for c in title if c.isalnum() or c in ' _-中文')
                    filepath = os.path.join(space_dir, f"{safe_title}.md")
                    download_file(r.get('content'), filepath)
                    total_docs += 1
    
    log(f"\n✅ 同步完成! 共导出 {total_docs} 个文档", Color.GREEN)
    log(f"📁 保存位置: {output_dir}")

# ============== 搜索操作 ==============

def cmd_search(args):
    """文档搜索"""
    log("\n🔍 飞书文档搜索", Color.GREEN)
    log("=" * 50)
    
    if not check_service():
        return
    
    keyword = args.keyword
    if not keyword:
        log("❌ 请提供搜索关键词 --keyword", Color.RED)
        return
    
    output_dir = os.path.expanduser(args.output or "~/Downloads/飞书搜索")
    os.makedirs(output_dir, exist_ok=True)
    
    log(f"🔎 搜索关键词: {keyword}")
    
    # 执行搜索
    resp = requests.post(f"{API_BASE}/search", json={
        'query': keyword,
        'doc_types': ['doc', 'docx', 'sheet']
    })
    data = resp.json()
    
    if data.get('code') != 0:
        log(f"❌ 搜索失败: {data.get('msg')}", Color.RED)
        return
    
    docs = data.get('data', {}).get('docs', [])
    log(f"📊 找到 {len(docs)} 个结果")
    
    if not docs:
        log("⚠️ 没有找到匹配的文档", Color.YELLOW)
        return
    
    for doc in docs:
        log(f"   - {doc.get('title', '未命名')} ({doc.get('docs_type', 'doc')})")
    
    # 下载搜索结果
    log(f"\n📥 开始下载到: {output_dir}")
    items = [{
        'token': d.get('token'),
        'name': d.get('title', '未命名'),
        'type': d.get('docs_type', 'docx')
    } for d in docs]
    
    resp = requests.post(f"{API_BASE}/batch/export", json={'items': items})
    results = resp.json().get('data', {}).get('results', [])
    
    success_count = 0
    for r in results:
        if r.get('success') and r.get('content'):
            title = r.get('name', '未命名')
            safe_title = "".join(c for c in title if c.isalnum() or c in ' _-中文')
            filepath = os.path.join(output_dir, f"{safe_title}.md")
            download_file(r.get('content'), filepath)
            success_count += 1
    
    log(f"\n✅ 下载完成! 成功: {success_count}/{len(items)}", Color.GREEN)
    log(f"📁 保存位置: {output_dir}")

# ============== 主程序 ==============

def main():
    parser = argparse.ArgumentParser(
        description='飞书管理命令行工具 - 卡若出品',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python feishu_cli.py drive --output ~/Downloads/云盘备份
  python feishu_cli.py minutes --start 2026-01-01 --end 2026-01-23
  python feishu_cli.py wiki --output ~/Downloads/知识库
  python feishu_cli.py search --keyword "项目文档"
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # drive命令
    drive_parser = subparsers.add_parser('drive', help='下载云盘文件')
    drive_parser.add_argument('--output', '-o', help='输出目录')
    drive_parser.add_argument('--folder', '-f', help='指定文件夹')
    
    # minutes命令
    minutes_parser = subparsers.add_parser('minutes', help='导出妙记')
    minutes_parser.add_argument('--output', '-o', help='输出目录')
    minutes_parser.add_argument('--start', '-s', help='开始日期 (YYYY-MM-DD)')
    minutes_parser.add_argument('--end', '-e', help='结束日期 (YYYY-MM-DD)')
    
    # wiki命令
    wiki_parser = subparsers.add_parser('wiki', help='同步知识库')
    wiki_parser.add_argument('--output', '-o', help='输出目录')
    wiki_parser.add_argument('--space', help='指定知识库名称')
    
    # search命令
    search_parser = subparsers.add_parser('search', help='搜索文档')
    search_parser.add_argument('--keyword', '-k', required=True, help='搜索关键词')
    search_parser.add_argument('--output', '-o', help='输出目录')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'drive':
        cmd_drive(args)
    elif args.command == 'minutes':
        cmd_minutes(args)
    elif args.command == 'wiki':
        cmd_wiki(args)
    elif args.command == 'search':
        cmd_search(args)

if __name__ == '__main__':
    main()
