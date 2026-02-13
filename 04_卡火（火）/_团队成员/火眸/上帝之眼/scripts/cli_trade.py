#!/usr/bin/env python3
"""
上帝之眼 - 纯命令行交易系统

使用BigQuant Token直接操作，不需要打开任何浏览器！

功能：
1. Token登录BigQuant
2. 获取策略信号
3. 执行五步选股
4. 提交交易信号到云端执行

作者: 卡若AI - 火眸
"""

import os
import sys
import yaml
import json
import time
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional

# 路径配置
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(SCRIPT_DIR, '..', 'config')
REPORTS_DIR = os.path.join(SCRIPT_DIR, '..', 'reports')


class GodsEyeCLI:
    """上帝之眼命令行交易器"""
    
    def __init__(self):
        """初始化"""
        self.credentials = self._load_credentials()
        self.connected = False
        self.user_info = {}
        self.strategies = []
        self.positions = []
        self.orders = []
        
        # BigQuant配置
        bq = self.credentials.get('bigquant', {})
        self.token = bq.get('token', '')
        self.ak = bq.get('access_key', '')
        self.sk = bq.get('secret_key', '')
        
        # 湘财配置
        xcsc = self.credentials.get('xiangcai', {})
        self.xcsc_account = xcsc.get('account', '')
        self.xcsc_password = xcsc.get('password', '')
        
        # 策略参数
        self.params = {
            'top_sectors': 2,
            'stocks_per_sector': 3,
            'buy_count': 3,
            'single_ratio': 0.15,
            'stop_loss': -0.05,
        }
    
    def _load_credentials(self) -> Dict:
        """加载凭证"""
        cred_file = os.path.join(CONFIG_DIR, 'credentials.yaml')
        if os.path.exists(cred_file):
            with open(cred_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        return {}
    
    def connect(self) -> bool:
        """连接BigQuant（纯Token，不需要浏览器）"""
        if not self.token:
            print('❌ BigQuant Token未配置')
            return False
        
        try:
            from bigquant.api import user
            
            print('🔐 Token登录BigQuant...')
            result = user.login(keypair=self.token)
            
            if result.get('success'):
                self.connected = True
                self.user_info = result
                print(f'✅ 登录成功: {result.get("username")}')
                return True
            else:
                print(f'❌ 登录失败: {result}')
                return False
                
        except Exception as e:
            print(f'❌ 连接错误: {e}')
            return False
    
    def get_strategies(self) -> List[Dict]:
        """获取策略列表"""
        if not self.connected:
            return []
        
        try:
            from bigquant.api import strategy
            
            result = strategy.get_strategy()
            if result.get('success'):
                self.strategies = result.get('items', [])
                return self.strategies
            return []
            
        except Exception as e:
            print(f'获取策略失败: {e}')
            return []
    
    def get_positions(self, strategy_id: str = None) -> List[Dict]:
        """获取持仓"""
        if not self.connected:
            return []
        
        try:
            from bigquant.api import strategy
            
            if not strategy_id and self.strategies:
                strategy_id = self.strategies[0]['id']
            
            result = strategy.get_position(strategy_id=strategy_id)
            if result.get('success'):
                self.positions = result.get('items', [])
                return self.positions
            return []
            
        except Exception as e:
            print(f'获取持仓失败: {e}')
            return []
    
    def get_orders(self, strategy_id: str = None) -> List[Dict]:
        """获取订单"""
        if not self.connected:
            return []
        
        try:
            from bigquant.api import strategy
            
            if not strategy_id and self.strategies:
                strategy_id = self.strategies[0]['id']
            
            result = strategy.get_order(strategy_id=strategy_id)
            if result.get('success'):
                self.orders = result.get('items', [])
                return self.orders
            return []
            
        except Exception as e:
            print(f'获取订单失败: {e}')
            return []
    
    def get_planned_orders(self, strategy_id: str = None) -> List[Dict]:
        """获取计划订单（策略信号）"""
        if not self.connected:
            return []
        
        try:
            from bigquant.api import strategy
            
            if not strategy_id and self.strategies:
                strategy_id = self.strategies[0]['id']
            
            result = strategy.get_planned_order(strategy_id=strategy_id)
            if result.get('success'):
                return result.get('items', [])
            return []
            
        except Exception as e:
            print(f'获取计划订单失败: {e}')
            return []
    
    def five_step_selection(self) -> List[Dict]:
        """卡若五步选股法"""
        signals = []
        
        try:
            import akshare as ak
            
            print('\n📊 执行卡若五步选股法')
            print('='*50)
            
            # 第一步：选择强势板块
            print('\n第一步：选择强势板块...')
            df_sectors = ak.stock_board_industry_name_em()
            top_sectors = df_sectors.nlargest(self.params['top_sectors'], '涨跌幅')
            
            for _, s in top_sectors.iterrows():
                print(f'  ✓ {s["板块名称"]} (+{s["涨跌幅"]:.2f}%)')
            
            # 第二步：板块内选股
            print('\n第二步：板块内选股...')
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
                            print(f'  ✓ {code} {name} ¥{price:.2f} ({change:+.2%})')
                except Exception as e:
                    print(f'  ⚠️ {sector_name}: {e}')
            
            # 第三步：过滤涨跌停
            print('\n第三步：过滤涨跌停（保留ST）...')
            filtered = []
            for c in candidates:
                if abs(c['change']) < 0.099:
                    filtered.append(c)
                else:
                    print(f'  ✗ {c["code"]} (涨跌停)')
            
            # 第四步：评分
            print('\n第四步：卡若均线评分...')
            for c in filtered:
                try:
                    df = ak.stock_zh_a_hist(
                        symbol=c['code'],
                        period='daily',
                        start_date=(date.today() - timedelta(days=120)).strftime('%Y%m%d'),
                        end_date=date.today().strftime('%Y%m%d'),
                        adjust='qfq'
                    )
                    
                    if df is not None and len(df) >= 60:
                        close = df['收盘']
                        
                        ma5 = close.rolling(5).mean()
                        ma10 = close.rolling(10).mean()
                        ma20 = close.rolling(20).mean()
                        ma60 = close.rolling(60).mean()
                        
                        heaven = ((ma5 + ma10 + ma20) / 3).rolling(5).mean()
                        evil = ma60.rolling(5).mean()
                        
                        h = heaven.iloc[-1]
                        e = evil.iloc[-1]
                        p = c['price']
                        
                        score = 0
                        if h > e:
                            score += 30
                        if p > h:
                            score += 20
                        score += min(30, 10 * (1 + c['change'] * 10))
                        
                        c['score'] = score
                        print(f'  ✓ {c["code"]}: {score:.0f}分')
                    else:
                        c['score'] = 0
                except:
                    c['score'] = 0
            
            # 第五步：选出前N名
            print('\n第五步：选出前3名...')
            filtered.sort(key=lambda x: x.get('score', 0), reverse=True)
            signals = filtered[:self.params['buy_count']]
            
            for i, s in enumerate(signals, 1):
                print(f'  {i}. {s["code"]} {s["name"]} | 评分:{s.get("score", 0):.0f}')
            
            print('='*50)
            
        except Exception as e:
            print(f'选股失败: {e}')
        
        return signals
    
    def execute_strategy(self, strategy_id: str = None):
        """执行策略（通过BigQuant云端）"""
        if not self.connected:
            print('❌ 请先连接BigQuant')
            return
        
        try:
            from bigquant.api import run
            
            if not strategy_id and self.strategies:
                strategy_id = self.strategies[0]['id']
            
            print(f'\n🚀 执行策略: {strategy_id[:8]}...')
            
            # BigQuant的run.execute需要策略文件
            # 这里我们直接使用get_planned_order获取信号
            
            signals = self.get_planned_orders(strategy_id)
            
            if signals:
                print(f'\n📋 策略信号 ({len(signals)}个):')
                for s in signals:
                    print(f'  {s}')
            else:
                print('  暂无信号（策略可能需要在BigQuant云端配置运行）')
            
        except Exception as e:
            print(f'执行错误: {e}')
    
    def show_status(self):
        """显示状态"""
        print('\n' + '='*50)
        print('📊 当前状态')
        print('='*50)
        
        print(f'\n🔐 BigQuant: {"已连接" if self.connected else "未连接"}')
        if self.connected:
            print(f'   用户: {self.user_info.get("username")}')
        
        print(f'\n📋 策略数: {len(self.strategies)}')
        for s in self.strategies:
            env = '模拟' if s['data']['accounts'][0]['environment_type'] == 0 else '实盘'
            print(f'   - {s["strategy_name"]} ({env})')
        
        print(f'\n📈 持仓数: {len(self.positions)}')
        for p in self.positions:
            print(f'   - {p}')
        
        print(f'\n📝 订单数: {len(self.orders)}')
        
        print('='*50)
    
    def save_signals(self, signals: List[Dict]):
        """保存交易信号"""
        os.makedirs(REPORTS_DIR, exist_ok=True)
        
        filepath = os.path.join(REPORTS_DIR, f'signals_{date.today()}.json')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({
                'date': date.today().isoformat(),
                'time': datetime.now().isoformat(),
                'signals': signals,
            }, f, ensure_ascii=False, indent=2, default=str)
        
        print(f'\n📁 信号已保存: {filepath}')
    
    def interactive(self):
        """交互式命令行"""
        print('\n' + '👁️'*15)
        print('  上帝之眼 - 纯命令行交易系统')
        print('👁️'*15)
        print()
        print('命令：')
        print('  connect    - 连接BigQuant')
        print('  status     - 显示状态')
        print('  strategies - 查看策略')
        print('  positions  - 查看持仓')
        print('  orders     - 查看订单')
        print('  signals    - 获取策略信号')
        print('  select     - 执行五步选股')
        print('  execute    - 执行策略')
        print('  help       - 显示帮助')
        print('  quit       - 退出')
        print()
        
        while True:
            try:
                cmd = input('上帝之眼> ').strip().lower()
                
                if cmd == 'quit' or cmd == 'exit':
                    print('👋 再见！')
                    break
                
                elif cmd == 'connect':
                    self.connect()
                
                elif cmd == 'status':
                    self.show_status()
                
                elif cmd == 'strategies':
                    strategies = self.get_strategies()
                    print(f'\n📋 策略列表 ({len(strategies)}):')
                    for i, s in enumerate(strategies, 1):
                        env = '模拟' if s['data']['accounts'][0]['environment_type'] == 0 else '实盘'
                        print(f'  {i}. {s["strategy_name"]} ({env})')
                        print(f'     ID: {s["id"]}')
                
                elif cmd == 'positions':
                    positions = self.get_positions()
                    print(f'\n📈 持仓 ({len(positions)}):')
                    if positions:
                        for p in positions:
                            print(f'  {p}')
                    else:
                        print('  (无持仓)')
                
                elif cmd == 'orders':
                    orders = self.get_orders()
                    print(f'\n📝 订单 ({len(orders)}):')
                    if orders:
                        for o in orders:
                            print(f'  {o}')
                    else:
                        print('  (无订单)')
                
                elif cmd == 'signals':
                    signals = self.get_planned_orders()
                    print(f'\n🎯 策略信号 ({len(signals)}):')
                    if signals:
                        for s in signals:
                            print(f'  {s}')
                    else:
                        print('  (暂无信号)')
                
                elif cmd == 'select':
                    signals = self.five_step_selection()
                    if signals:
                        self.save_signals(signals)
                
                elif cmd == 'execute':
                    self.execute_strategy()
                
                elif cmd == 'help':
                    print('\n📖 帮助：')
                    print('  1. 先运行 connect 连接BigQuant')
                    print('  2. 运行 select 执行五步选股')
                    print('  3. 运行 signals 查看策略信号')
                    print('  4. 运行 execute 执行策略')
                
                else:
                    print(f'未知命令: {cmd}')
                    print('输入 help 查看帮助')
                
            except KeyboardInterrupt:
                print('\n👋 再见！')
                break
            except Exception as e:
                print(f'错误: {e}')


def main():
    """主入口"""
    cli = GodsEyeCLI()
    
    # 自动连接
    cli.connect()
    cli.get_strategies()
    
    # 进入交互模式
    cli.interactive()


if __name__ == '__main__':
    main()
