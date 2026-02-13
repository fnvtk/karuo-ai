#!/usr/bin/env python3
"""
上帝之眼 - 真实交易系统

通过湘财证券网页版实现真实交易！
不需要安装任何客户端！

使用方式：
    python3 real_trade.py

功能：
1. 自动登录湘财证券网页版
2. 执行卡若五步选股法
3. 真实买入/卖出
4. 监控持仓和盈亏

作者: 卡若AI - 火眸
"""

import os
import sys
import yaml
import asyncio
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional

# 添加路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from brokers.xcsc_web_trader import XCSCWebTrader


class GodsEyeRealTrader:
    """上帝之眼真实交易器"""
    
    def __init__(self):
        """初始化"""
        self.trader = XCSCWebTrader()
        self.signals = []
        self.positions = []
        self.balance = {}
        
        # 策略参数
        self.params = {
            'top_sectors': 2,
            'stocks_per_sector': 3,
            'buy_count': 3,
            'single_position_ratio': 0.15,
            'stop_loss': -0.05,
        }
    
    async def start(self):
        """启动交易系统"""
        print('\n' + '👁️'*20)
        print('      上帝之眼 - 真实交易系统')
        print('👁️'*20)
        print('\n⚠️ 重要提示：此系统将执行真实交易！')
        print('   账号: 600201668')
        print('   券商: 湘财证券')
        print()
        
        try:
            # 1. 初始化浏览器
            print('1️⃣ 初始化浏览器...')
            await self.trader.init_browser(headless=False)
            
            # 2. 登录
            print('\n2️⃣ 登录湘财证券...')
            success = await self.trader.login()
            
            if not success:
                print('\n⚠️ 需要手动完成登录（可能需要短信验证码）')
                print('请在打开的浏览器中完成登录，然后按回车继续...')
                input()
                self.trader.logged_in = True
            
            # 3. 获取账户信息
            print('\n3️⃣ 获取账户信息...')
            self.balance = await self.trader.get_balance()
            self.positions = await self.trader.get_positions()
            
            print(f'\n💰 账户资金:')
            print(f'   总资产: ¥{self.balance.get("total_assets", 0):,.2f}')
            print(f'   可用资金: ¥{self.balance.get("available", 0):,.2f}')
            print(f'   持仓数: {len(self.positions)}只')
            
            # 4. 执行选股
            print('\n4️⃣ 执行卡若五步选股法...')
            self.signals = await self.five_step_selection()
            
            if not self.signals:
                print('\n⚠️ 没有生成交易信号')
            else:
                # 5. 显示信号
                print(f'\n📋 交易信号 ({len(self.signals)}个):')
                print('='*60)
                
                for i, s in enumerate(self.signals, 1):
                    amount = self._calculate_amount(s['price'])
                    value = s['price'] * amount
                    print(f'{i}. {s["code"]} {s["name"]}')
                    print(f'   价格: ¥{s["price"]:.2f} × {amount}股 = ¥{value:,.2f}')
                    print(f'   板块: {s.get("sector", "-")} | 评分: {s.get("score", 0):.0f}')
                
                print('='*60)
                
                # 6. 确认交易
                print('\n⚠️ 即将执行真实交易！')
                confirm = input('确认执行？(yes/no): ').strip().lower()
                
                if confirm == 'yes':
                    print('\n5️⃣ 执行交易...')
                    for signal in self.signals:
                        await self.execute_buy(signal)
                        await asyncio.sleep(1)
                    
                    print('\n✅ 交易执行完成！')
                else:
                    print('\n❌ 已取消交易')
            
            # 截图
            await self.trader.screenshot('trade_result.png')
            
            # 保持浏览器
            print('\n按回车关闭浏览器...')
            input()
            
        finally:
            await self.trader.close()
    
    async def five_step_selection(self) -> List[Dict]:
        """卡若五步选股法"""
        signals = []
        
        try:
            import akshare as ak
            import pandas as pd
            
            print('\n📊 执行五步选股:')
            
            # 第一步：选择强势板块
            print('   第一步：选择强势板块...')
            df_sectors = ak.stock_board_industry_name_em()
            top_sectors = df_sectors.nlargest(self.params['top_sectors'], '涨跌幅')
            
            for _, s in top_sectors.iterrows():
                print(f'      ✓ {s["板块名称"]} (+{s["涨跌幅"]:.2f}%)')
            
            # 第二步：板块内选股
            print('   第二步：板块内选股...')
            candidates = []
            
            for _, sector in top_sectors.iterrows():
                sector_name = sector['板块名称']
                
                try:
                    df_stocks = ak.stock_board_industry_cons_em(symbol=sector_name)
                    if df_stocks is not None and len(df_stocks) > 0:
                        top_stocks = df_stocks.nlargest(self.params['stocks_per_sector'], '涨跌幅')
                        
                        for _, stock in top_stocks.iterrows():
                            code = stock['代码']
                            name = stock['名称']
                            price = float(stock.get('最新价', 0))
                            change = float(stock.get('涨跌幅', 0)) / 100
                            
                            candidates.append({
                                'code': code,
                                'name': name,
                                'price': price,
                                'change': change,
                                'sector': sector_name,
                            })
                            print(f'      ✓ {code} {name} ¥{price:.2f} ({change:+.2%})')
                except Exception as e:
                    print(f'      ⚠️ {sector_name} 获取失败: {e}')
            
            # 第三步：过滤涨跌停
            print('   第三步：过滤涨跌停...')
            filtered = []
            for c in candidates:
                if abs(c['change']) < 0.099:
                    filtered.append(c)
                else:
                    print(f'      ✗ {c["code"]} (涨跌停)')
            
            # 第四步：评分
            print('   第四步：卡若均线评分...')
            for c in filtered:
                try:
                    # 获取历史K线
                    df = ak.stock_zh_a_hist(
                        symbol=c['code'],
                        period='daily',
                        start_date=(date.today() - timedelta(days=120)).strftime('%Y%m%d'),
                        end_date=date.today().strftime('%Y%m%d'),
                        adjust='qfq'
                    )
                    
                    if df is not None and len(df) >= 60:
                        close = df['收盘']
                        
                        # 计算均线
                        ma5 = close.rolling(5).mean()
                        ma10 = close.rolling(10).mean()
                        ma20 = close.rolling(20).mean()
                        ma60 = close.rolling(60).mean()
                        
                        heaven = ((ma5 + ma10 + ma20) / 3).rolling(5).mean()
                        evil = ma60.rolling(5).mean()
                        
                        h = heaven.iloc[-1]
                        e = evil.iloc[-1]
                        p = c['price']
                        
                        # 评分
                        score = 0
                        if h > e:
                            score += 30
                        if p > h:
                            score += 20
                        
                        score += min(30, 10 * (1 + c['change'] * 10))
                        c['score'] = score
                        print(f'      ✓ {c["code"]}: {score:.0f}分')
                    else:
                        c['score'] = 0
                        
                except Exception as e:
                    c['score'] = 0
            
            # 第五步：选出前N名
            print('   第五步：选出前3名...')
            filtered.sort(key=lambda x: x.get('score', 0), reverse=True)
            signals = filtered[:self.params['buy_count']]
            
            for i, s in enumerate(signals, 1):
                print(f'      {i}. {s["code"]} {s["name"]} | 评分:{s.get("score", 0):.0f}')
            
        except Exception as e:
            print(f'   ⚠️ 选股失败: {e}')
            import traceback
            traceback.print_exc()
        
        return signals
    
    def _calculate_amount(self, price: float) -> int:
        """计算买入数量"""
        available = self.balance.get('available', 0)
        if available <= 0:
            available = 2570000  # 默认资金
        
        amount = available * self.params['single_position_ratio'] / price
        return int(amount / 100) * 100
    
    async def execute_buy(self, signal: Dict):
        """执行买入"""
        code = signal['code']
        price = signal['price']
        amount = self._calculate_amount(price)
        
        if amount < 100:
            print(f'   ⚠️ {code} 资金不足，跳过')
            return
        
        print(f'\n📈 买入: {code} {signal["name"]}')
        print(f'   价格: ¥{price:.2f}')
        print(f'   数量: {amount}股')
        print(f'   金额: ¥{price * amount:,.2f}')
        
        result = await self.trader.buy(code, price, amount)
        
        if result.get('success'):
            print(f'   ✅ 委托成功: {result.get("order_id")}')
        else:
            print(f'   ❌ 委托失败: {result.get("message")}')


async def main():
    """主入口"""
    trader = GodsEyeRealTrader()
    await trader.start()


if __name__ == '__main__':
    asyncio.run(main())
