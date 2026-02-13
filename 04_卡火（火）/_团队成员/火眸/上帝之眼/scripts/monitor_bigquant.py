#!/usr/bin/env python3
"""
监控BigQuant网站恢复状态

网站恢复后会发出提示，你就可以去绑定券商了

使用方式:
    python3 monitor_bigquant.py
"""

import time
import requests
from datetime import datetime

def check_bigquant():
    """检查BigQuant是否恢复"""
    urls = [
        'https://bigquant.com',
        'https://bigquant.com/trading/group',
    ]
    
    for url in urls:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200 and '502' not in r.text:
                return True, url
        except:
            pass
    
    return False, None

def main():
    print('='*60)
    print('🔍 监控BigQuant网站恢复状态')
    print('='*60)
    print()
    print('网站恢复后，请立即访问:')
    print('  https://bigquant.com/trading/group')
    print('绑定湘财证券: 600201668 / 6389003')
    print()
    print('按 Ctrl+C 停止监控')
    print()
    
    check_count = 0
    
    while True:
        check_count += 1
        now = datetime.now().strftime('%H:%M:%S')
        
        is_up, url = check_bigquant()
        
        if is_up:
            print()
            print('🎉'*20)
            print(f'  BigQuant网站已恢复！')
            print(f'  时间: {now}')
            print(f'  URL: {url}')
            print('🎉'*20)
            print()
            print('请立即访问:')
            print('  https://bigquant.com/trading/group')
            print('绑定湘财证券!')
            
            # 播放提示音
            try:
                import os
                os.system('say "BigQuant网站恢复了，请立即绑定券商"')
            except:
                pass
            
            break
        else:
            print(f'[{now}] 检查 #{check_count} - 仍在维护中...')
        
        # 每60秒检查一次
        time.sleep(60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\n👋 监控已停止')
