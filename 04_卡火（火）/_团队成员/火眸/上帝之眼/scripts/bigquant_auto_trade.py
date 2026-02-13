#!/usr/bin/env python3
"""
上帝之眼 - BigQuant自动化交易脚本

功能：
1. 获取模拟交易信号
2. 推送到BigTrader终端
3. 本地执行策略

使用方式：
python bigquant_auto_trade.py

参考文档：
- BigTrader API: https://bigquant.com/wiki/doc/sRPJjoVBCo
"""

import os
import sys
import yaml
import json
import hmac
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import requests

# ============ 配置 ============
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'credentials.yaml')

# BigQuant API配置
BIGQUANT_API = 'https://bigquant.com/api/v1'

# 2026年节假日选股配置
HOLIDAY_STOCKS = {
    '春节': {
        'buy_date': '2026-02-04',
        'sell_date': '2026-02-25',
        'stocks': [
            {'code': '600519', 'name': '贵州茅台', 'weight': 0.33, 'score': 90},
            {'code': '000858', 'name': '五粮液', 'weight': 0.33, 'score': 90},
            {'code': '300760', 'name': '迈瑞医疗', 'weight': 0.34, 'score': 90},
        ]
    },
    '五一': {
        'buy_date': '2026-04-28',
        'sell_date': '2026-05-14',
        'stocks': [
            {'code': '600887', 'name': '伊利股份', 'weight': 0.33, 'score': 80},
            {'code': '600138', 'name': '中青旅', 'weight': 0.33, 'score': 75},
            {'code': '000651', 'name': '格力电器', 'weight': 0.34, 'score': 70},
        ]
    },
    '国庆': {
        'buy_date': '2026-09-28',
        'sell_date': '2026-10-19',
        'stocks': [
            {'code': '300750', 'name': '宁德时代', 'weight': 0.33, 'score': 88},
            {'code': '600893', 'name': '航发动力', 'weight': 0.33, 'score': 83},
            {'code': '002594', 'name': '比亚迪', 'weight': 0.34, 'score': 82},
        ]
    },
}


class BigQuantTrader:
    """BigQuant交易接口"""
    
    def __init__(self, config_path: str = CONFIG_PATH):
        self.config = self._load_config(config_path)
        self.ak = self.config.get('bigquant', {}).get('ak', '')
        self.sk = self.config.get('bigquant', {}).get('sk', '')
        self.notebook_id = self.config.get('bigquant', {}).get('notebook_id', '')
        self.capital = self.config.get('portfolio', {}).get('holiday_capital', 1155000)
    
    def _load_config(self, path: str) -> dict:
        """加载配置"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f'加载配置失败: {e}')
            return {}
    
    def _sign(self, params: dict) -> str:
        """生成签名"""
        sorted_params = '&'.join([f'{k}={v}' for k, v in sorted(params.items())])
        signature = hmac.new(
            self.sk.encode('utf-8'),
            sorted_params.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def get_signals(self) -> List[Dict]:
        """
        获取模拟交易信号
        
        参考: https://bigquant.com/codesharev3/6868efbe-9721-4aa6-abe4-558b5c9ffd0e
        """
        try:
            url = f'{BIGQUANT_API}/paper_trading/{self.notebook_id}/signals'
            
            params = {
                'ak': self.ak,
                'timestamp': int(time.time()),
            }
            params['sign'] = self._sign(params)
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('signals', [])
            else:
                print(f'获取信号失败: {response.status_code}')
                return []
                
        except Exception as e:
            print(f'获取信号异常: {e}')
            return []
    
    def get_positions(self) -> List[Dict]:
        """获取持仓"""
        try:
            url = f'{BIGQUANT_API}/paper_trading/{self.notebook_id}/positions'
            
            params = {
                'ak': self.ak,
                'timestamp': int(time.time()),
            }
            params['sign'] = self._sign(params)
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('positions', [])
            else:
                print(f'获取持仓失败: {response.status_code}')
                return []
                
        except Exception as e:
            print(f'获取持仓异常: {e}')
            return []


class HolidayStrategy:
    """节假日策略执行器"""
    
    def __init__(self, capital: float = 1155000):
        self.capital = capital
        self.today = datetime.now().strftime('%Y-%m-%d')
    
    def get_current_holiday(self) -> Optional[Dict]:
        """获取当前应执行的节假日"""
        for name, config in HOLIDAY_STOCKS.items():
            buy_date = config['buy_date']
            sell_date = config['sell_date']
            
            if buy_date <= self.today <= sell_date:
                return {'name': name, **config}
        
        return None
    
    def generate_signals(self) -> List[Dict]:
        """生成交易信号"""
        holiday = self.get_current_holiday()
        
        if not holiday:
            print(f'[{self.today}] 不在节假日交易期间')
            return []
        
        signals = []
        name = holiday['name']
        buy_date = holiday['buy_date']
        sell_date = holiday['sell_date']
        stocks = holiday['stocks']
        
        # 买入信号
        if self.today == buy_date:
            print(f'\n[{self.today}] {name}买入日')
            print('='*50)
            
            for stock in stocks:
                amount = self.capital * stock['weight'] * 0.95
                # 假设价格（实际应从行情获取）
                price = self._get_estimated_price(stock['code'])
                shares = int(amount / price / 100) * 100
                
                signals.append({
                    'action': 'buy',
                    'code': stock['code'],
                    'name': stock['name'],
                    'shares': shares,
                    'price': price,
                    'amount': shares * price,
                    'score': stock['score'],
                    'reason': f'{name}节假日策略买入',
                })
                
                print(f'  买入 {stock["code"]} {stock["name"]}')
                print(f'    数量: {shares}股')
                print(f'    价格: ¥{price:.2f}')
                print(f'    金额: ¥{shares * price:,.0f}')
                print(f'    评分: {stock["score"]}分')
        
        # 卖出信号
        elif self.today == sell_date:
            print(f'\n[{self.today}] {name}卖出日')
            print('='*50)
            
            for stock in stocks:
                signals.append({
                    'action': 'sell',
                    'code': stock['code'],
                    'name': stock['name'],
                    'shares': 'all',
                    'reason': f'{name}节假日策略卖出',
                })
                
                print(f'  卖出 {stock["code"]} {stock["name"]}')
        
        return signals
    
    def _get_estimated_price(self, code: str) -> float:
        """获取估算价格（实际应从行情获取）"""
        prices = {
            '600519': 1750.0,
            '000858': 145.0,
            '300760': 280.0,
            '600887': 28.0,
            '600138': 12.5,
            '000651': 38.0,
            '300750': 195.0,
            '600893': 45.0,
            '002594': 265.0,
        }
        return prices.get(code, 50.0)


def check_market_status() -> str:
    """
    检查大盘状态
    返回: 'high_high', 'low_high', 'high_low', 'low_low', 'flat', 'unknown'
    """
    try:
        import akshare as ak
        
        # 获取上证指数
        df = ak.stock_zh_index_spot()
        row = df[df['代码'] == 'sh000001']
        
        if not row.empty:
            current = float(row['最新价'].values[0])
            open_price = float(row['今开'].values[0])
            pre_close = float(row['昨收'].values[0])
            
            open_pct = (open_price - pre_close) / pre_close
            day_pct = (current - open_price) / open_price
            
            if open_pct > 0.005:
                return 'high_high' if day_pct > 0 else 'high_low'
            elif open_pct < -0.005:
                return 'low_high' if day_pct > 0 else 'low_low'
            else:
                return 'flat'
        
        return 'unknown'
        
    except Exception as e:
        print(f'获取大盘状态失败: {e}')
        return 'unknown'


def should_buy_now() -> bool:
    """判断当前是否适合买入"""
    status = check_market_status()
    
    status_map = {
        'high_high': ('✅ 高开高走', True, '09:35-10:00 立即买入'),
        'low_high': ('✅ 低开高走', True, '10:00-10:30 确认后买入'),
        'flat': ('⚠️ 平开震荡', True, '14:00-14:30 观望'),
        'high_low': ('❌ 高开低走', False, '不建议买入'),
        'low_low': ('❌ 低开低走', False, '禁止买入'),
        'unknown': ('❓ 未知', True, '谨慎操作'),
    }
    
    desc, should_buy, timing = status_map.get(status, ('未知', True, ''))
    
    print(f'\n大盘状态: {desc}')
    print(f'建议操作: {timing}')
    
    return should_buy


def main():
    """主函数"""
    print('='*60)
    print('👁️ 上帝之眼 - BigQuant自动化交易')
    print('='*60)
    print(f'执行时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    
    # 检查大盘状态
    print('\n📊 检查大盘状态...')
    can_buy = should_buy_now()
    
    # 生成交易信号
    print('\n📋 生成交易信号...')
    strategy = HolidayStrategy()
    signals = strategy.generate_signals()
    
    if not signals:
        print('今日无交易信号')
        return
    
    # 显示信号汇总
    print('\n📊 信号汇总:')
    print('-'*50)
    
    total_amount = 0
    for s in signals:
        if s['action'] == 'buy':
            total_amount += s['amount']
            print(f"  {s['action'].upper()} {s['code']} {s['name']}: {s['shares']}股 @ ¥{s['price']:.2f} = ¥{s['amount']:,.0f}")
        else:
            print(f"  {s['action'].upper()} {s['code']} {s['name']}: 全部卖出")
    
    if total_amount > 0:
        print(f'\n  总投资: ¥{total_amount:,.0f}')
    
    # 大盘判断
    if not can_buy and any(s['action'] == 'buy' for s in signals):
        print('\n⚠️ 大盘状态不佳，建议观望')
        print('是否仍要执行买入？(y/n)')
        
        try:
            confirm = input().strip().lower()
            if confirm != 'y':
                print('已取消')
                return
        except EOFError:
            print('非交互模式，跳过确认')
    
    # 保存信号
    output_path = os.path.join(os.path.dirname(__file__), '..', 'reports', 'today_signals.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': datetime.now().strftime('%Y-%m-%d'),
            'signals': signals,
            'market_status': check_market_status(),
        }, f, ensure_ascii=False, indent=2)
    
    print(f'\n✅ 信号已保存到: {output_path}')
    print('\n下一步:')
    print('1. 打开BigTrader终端')
    print('2. 登录湘财证券账户')
    print('3. 刷新交易计划')
    print('4. 确认并执行交易')
    
    print('\n' + '='*60)
    print('✅ 执行完成')
    print('='*60)


if __name__ == '__main__':
    main()
