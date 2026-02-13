#!/usr/bin/env python3
"""
上帝之眼 - 交互式真实交易

浏览器会保持打开状态，你可以手动完成登录
然后在终端输入命令执行交易

作者: 卡若AI - 火眸
"""

import os
import sys
import asyncio
from datetime import datetime, date, timedelta

# 添加路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from brokers.xcsc_web_trader import XCSCWebTrader


async def main():
    """主程序"""
    print('\n' + '👁️'*20)
    print('      上帝之眼 - 交互式真实交易')
    print('👁️'*20)
    print()
    print('⚠️  此系统将执行真实交易！')
    print('   账号: 600201668')
    print('   券商: 湘财证券')
    print()
    
    # 初始化交易器
    trader = XCSCWebTrader()
    
    try:
        # 启动浏览器
        print('🌐 启动浏览器...')
        await trader.init_browser(headless=False)
        
        # 访问登录页
        print('📍 访问湘财证券网页版...')
        await trader.page.goto(trader.WEB_URL)
        await trader.page.wait_for_load_state('networkidle')
        
        # 自动填写账号密码
        print('📝 自动填写账号密码...')
        
        # 账号
        account_input = trader.page.locator('input[placeholder*="账号"], input[name*="account"], #account, input.account')
        if await account_input.count() > 0:
            await account_input.first.fill(trader.account)
            print('   ✓ 账号已填写')
        
        # 密码
        password_input = trader.page.locator('input[type="password"], input[placeholder*="密码"], #password')
        if await password_input.count() > 0:
            await password_input.first.fill(trader.password)
            print('   ✓ 密码已填写')
        
        print()
        print('='*60)
        print('📱 请在浏览器中完成以下操作：')
        print('   1. 输入图形验证码（如有）')
        print('   2. 点击"获取短信验证码"')
        print('   3. 输入收到的短信验证码')
        print('   4. 点击"登录"按钮')
        print('='*60)
        print()
        
        # 等待用户手动登录
        while True:
            cmd = input('登录完成后输入 "ok" 继续，输入 "quit" 退出: ').strip().lower()
            
            if cmd == 'quit':
                print('❌ 已退出')
                break
            
            if cmd == 'ok':
                trader.logged_in = True
                print('\n✅ 继续执行交易流程...')
                
                # 获取账户信息
                print('\n3️⃣ 获取账户信息...')
                balance = await trader.get_balance()
                positions = await trader.get_positions()
                
                print(f'\n💰 账户状态:')
                print(f'   总资产: ¥{balance.get("total_assets", 2570000):,.2f}')
                print(f'   可用资金: ¥{balance.get("available", 2570000):,.2f}')
                print(f'   持仓数: {len(positions)}只')
                
                # 执行选股
                print('\n4️⃣ 执行卡若五步选股...')
                signals = await five_step_selection()
                
                if not signals:
                    print('\n⚠️ 没有生成交易信号（可能是非交易时间或数据获取失败）')
                    print('   当前时间:', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                else:
                    # 显示信号
                    print(f'\n📋 交易信号 ({len(signals)}个):')
                    print('='*60)
                    
                    for i, s in enumerate(signals, 1):
                        amount = calculate_amount(s['price'], balance.get('available', 2570000))
                        value = s['price'] * amount
                        print(f'{i}. {s["code"]} {s["name"]}')
                        print(f'   价格: ¥{s["price"]:.2f} × {amount}股 = ¥{value:,.2f}')
                        print(f'   板块: {s.get("sector", "-")} | 涨幅: {s.get("change", 0):+.2%}')
                    
                    print('='*60)
                    
                    # 确认交易
                    confirm = input('\n⚠️ 确认执行真实交易？(yes/no): ').strip().lower()
                    
                    if confirm == 'yes':
                        print('\n5️⃣ 执行交易...')
                        for signal in signals:
                            amount = calculate_amount(signal['price'], balance.get('available', 2570000))
                            if amount >= 100:
                                print(f'\n📈 买入: {signal["code"]} {signal["name"]}')
                                result = await trader.buy(signal['code'], signal['price'], amount)
                                if result.get('success'):
                                    print(f'   ✅ 委托成功')
                                else:
                                    print(f'   ❌ 委托失败: {result.get("message")}')
                                await asyncio.sleep(1)
                        
                        print('\n✅ 交易执行完成！')
                    else:
                        print('\n❌ 已取消交易')
                
                # 截图
                await trader.screenshot('trade_complete.png')
                
                # 继续操作
                while True:
                    cmd2 = input('\n输入命令 (balance/positions/buy/sell/screenshot/quit): ').strip().lower()
                    
                    if cmd2 == 'quit':
                        break
                    elif cmd2 == 'balance':
                        b = await trader.get_balance()
                        print(f'可用资金: ¥{b.get("available", 0):,.2f}')
                    elif cmd2 == 'positions':
                        p = await trader.get_positions()
                        print(f'持仓数: {len(p)}')
                    elif cmd2 == 'screenshot':
                        await trader.screenshot()
                        print('截图已保存')
                    elif cmd2.startswith('buy '):
                        # buy 600519 1800 100
                        parts = cmd2.split()
                        if len(parts) == 4:
                            code, price, amount = parts[1], float(parts[2]), int(parts[3])
                            result = await trader.buy(code, price, amount)
                            print(result)
                    elif cmd2.startswith('sell '):
                        parts = cmd2.split()
                        if len(parts) == 4:
                            code, price, amount = parts[1], float(parts[2]), int(parts[3])
                            result = await trader.sell(code, price, amount)
                            print(result)
                
                break
        
    finally:
        await trader.close()
        print('\n🔒 浏览器已关闭')


async def five_step_selection():
    """卡若五步选股法"""
    signals = []
    
    try:
        import akshare as ak
        
        print('   获取板块数据...')
        df_sectors = ak.stock_board_industry_name_em()
        top_sectors = df_sectors.nlargest(2, '涨跌幅')
        
        for _, s in top_sectors.iterrows():
            print(f'   板块: {s["板块名称"]} (+{s["涨跌幅"]:.2f}%)')
        
        print('   获取个股数据...')
        for _, sector in top_sectors.iterrows():
            sector_name = sector['板块名称']
            
            try:
                df_stocks = ak.stock_board_industry_cons_em(symbol=sector_name)
                if df_stocks is not None and len(df_stocks) > 0:
                    top_stocks = df_stocks.nlargest(3, '涨跌幅')
                    
                    for _, stock in top_stocks.iterrows():
                        code = stock['代码']
                        name = stock['名称']
                        price = float(stock.get('最新价', 0))
                        change = float(stock.get('涨跌幅', 0)) / 100
                        
                        # 排除涨跌停
                        if abs(change) < 0.099 and price > 0:
                            signals.append({
                                'code': code,
                                'name': name,
                                'price': price,
                                'change': change,
                                'sector': sector_name,
                            })
            except Exception as e:
                print(f'   {sector_name} 获取失败: {e}')
        
        # 取前3个
        signals = signals[:3]
        
    except Exception as e:
        print(f'   选股失败: {e}')
    
    return signals


def calculate_amount(price, available):
    """计算买入数量"""
    amount = available * 0.15 / price
    return int(amount / 100) * 100


if __name__ == '__main__':
    asyncio.run(main())
