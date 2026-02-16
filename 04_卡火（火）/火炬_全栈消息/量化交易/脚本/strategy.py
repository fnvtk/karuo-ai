#!/usr/bin/env python3
"""
策略引擎

集成上帝之眼的核心策略:
1. 节假日策略 (HOLIDAY)
2. 7根K线策略 (7K_LINE)
3. 高手跟踪策略 (EXPERT)

作者: 卡若AI - 火炬
日期: 2026-01-29
"""

import asyncio
import aiohttp
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class StrategyEngine:
    """
    策略引擎
    
    整合多个策略，生成交易信号
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.strategies = []
        
        # 初始化启用的策略
        enabled = config.get('strategies', {}).get('enabled', [])
        
        if 'holiday' in enabled:
            self.strategies.append(HolidayStrategy(config))
        if '7k_line' in enabled:
            self.strategies.append(SevenKLineStrategy(config))
        if 'expert' in enabled:
            self.strategies.append(ExpertTrackingStrategy(config))
        
        logger.info(f'策略引擎初始化: {[s.name for s in self.strategies]}')
    
    async def generate_signals(self) -> List[Dict]:
        """
        生成交易信号
        
        遍历所有策略，汇总信号
        """
        all_signals = []
        
        for strategy in self.strategies:
            try:
                signals = await strategy.generate_signals()
                all_signals.extend(signals)
                logger.info(f'{strategy.name} 生成 {len(signals)} 个信号')
            except Exception as e:
                logger.error(f'{strategy.name} 执行出错: {e}')
        
        # 信号去重和冲突处理
        all_signals = self._deduplicate_signals(all_signals)
        
        return all_signals
    
    def _deduplicate_signals(self, signals: List[Dict]) -> List[Dict]:
        """
        信号去重
        
        同一股票的买卖信号冲突时，保留置信度高的
        """
        stock_signals = {}
        
        for signal in signals:
            stock_code = signal.get('stock_code', '')
            confidence = signal.get('confidence', 0)
            
            if stock_code not in stock_signals:
                stock_signals[stock_code] = signal
            elif confidence > stock_signals[stock_code].get('confidence', 0):
                stock_signals[stock_code] = signal
        
        return list(stock_signals.values())


class HolidayStrategy:
    """
    节假日策略
    
    核心逻辑:
    - 春节/五一/国庆前2天买入
    - 选择历年节假日涨幅前5的板块
    - 板块内选择连续多年上榜的个股
    - 节后第7天卖出
    - 止损-3%
    """
    
    name = "节假日策略"
    
    def __init__(self, config: Dict):
        self.config = config.get('strategies', {}).get('holiday', {})
        
        # 2026年节假日列表
        self.holidays = [
            {'name': '春节', 'date': date(2026, 2, 10), 'buy_date': date(2026, 2, 6)},
            {'name': '五一', 'date': date(2026, 5, 1), 'buy_date': date(2026, 4, 28)},
            {'name': '国庆', 'date': date(2026, 10, 1), 'buy_date': date(2026, 9, 28)},
        ]
        
        # 历史强势板块数据
        self.strong_sectors = {
            '春节': ['医药生物', '非银金融', '电子信息', '新能源', '消费电子'],
            '五一': ['旅游酒店', '餐饮', '消费电子', '医药生物', '交通运输'],
            '国庆': ['旅游酒店', '消费电子', '白酒', '新能源汽车', '医药生物'],
        }
        
        # 历史强势个股
        self.strong_stocks = {
            '春节': [
                {'code': '600519', 'name': '贵州茅台', 'sector': '白酒'},
                {'code': '000858', 'name': '五粮液', 'sector': '白酒'},
                {'code': '600036', 'name': '招商银行', 'sector': '非银金融'},
                {'code': '601318', 'name': '中国平安', 'sector': '非银金融'},
                {'code': '300750', 'name': '宁德时代', 'sector': '新能源'},
            ],
            '五一': [
                {'code': '600138', 'name': '中青旅', 'sector': '旅游酒店'},
                {'code': '000888', 'name': '峨眉山A', 'sector': '旅游酒店'},
                {'code': '600258', 'name': '首旅酒店', 'sector': '旅游酒店'},
                {'code': '002007', 'name': '华兰生物', 'sector': '医药生物'},
                {'code': '600887', 'name': '伊利股份', 'sector': '消费'},
            ],
            '国庆': [
                {'code': '600519', 'name': '贵州茅台', 'sector': '白酒'},
                {'code': '000858', 'name': '五粮液', 'sector': '白酒'},
                {'code': '600138', 'name': '中青旅', 'sector': '旅游酒店'},
                {'code': '002594', 'name': '比亚迪', 'sector': '新能源汽车'},
                {'code': '300750', 'name': '宁德时代', 'sector': '新能源'},
            ],
        }
    
    async def generate_signals(self) -> List[Dict]:
        """生成节假日策略信号"""
        today = date.today()
        signals = []
        
        # 检查是否接近节假日
        for holiday in self.holidays:
            buy_date = holiday.get('buy_date')
            
            # 买入日期前后1天都可以
            if abs((today - buy_date).days) <= 1:
                logger.info(f'📅 {holiday["name"]}买入窗口!')
                
                # 获取该节假日的强势股票
                stocks = self.strong_stocks.get(holiday['name'], [])
                
                for stock in stocks[:5]:  # 最多5只
                    signal = {
                        'signal_id': f'holiday_{datetime.now().timestamp()}',
                        'strategy': self.name,
                        'signal_type': 'buy',
                        'stock_code': stock['code'],
                        'stock_name': stock['name'],
                        'confidence': 0.8,
                        'reason': f'{holiday["name"]}节假日策略买入',
                        'created_at': datetime.utcnow()
                    }
                    signals.append(signal)
        
        return signals
    
    def get_next_holiday(self, today: date = None) -> Optional[Dict]:
        """获取下一个节假日"""
        if today is None:
            today = date.today()
        
        for holiday in self.holidays:
            if holiday['date'] > today:
                return holiday
        return None


class SevenKLineStrategy:
    """
    7根K线策略
    
    核心逻辑:
    - 每天从4000只股票选出最强5只
    - 买入后持有7个交易日
    - 第7天无条件卖出
    - 止损-5%
    """
    
    name = "7根K线策略"
    
    def __init__(self, config: Dict):
        self.config = config.get('strategies', {}).get('7k_line', {})
        
        # 持仓记录 {stock_code: {'buy_date': date, 'buy_price': float}}
        self.holdings = {}
    
    async def generate_signals(self) -> List[Dict]:
        """生成7根K线策略信号"""
        today = date.today()
        signals = []
        
        # 1. 检查持仓是否需要卖出（持有7天）
        for stock_code, holding in list(self.holdings.items()):
            hold_days = (today - holding['buy_date']).days
            
            if hold_days >= 7:
                signal = {
                    'signal_id': f'7k_{datetime.now().timestamp()}',
                    'strategy': self.name,
                    'signal_type': 'sell',
                    'stock_code': stock_code,
                    'confidence': 1.0,
                    'reason': '持有满7天，无条件卖出',
                    'created_at': datetime.utcnow()
                }
                signals.append(signal)
                del self.holdings[stock_code]
        
        # 2. 选择今日最强股票买入
        strong_stocks = await self._select_strong_stocks()
        
        for stock in strong_stocks[:5]:
            if stock['code'] not in self.holdings:
                signal = {
                    'signal_id': f'7k_{datetime.now().timestamp()}',
                    'strategy': self.name,
                    'signal_type': 'buy',
                    'stock_code': stock['code'],
                    'stock_name': stock['name'],
                    'confidence': stock.get('score', 0.7),
                    'reason': f'7根K线策略选股，评分{stock.get("score", 0.7):.2f}',
                    'created_at': datetime.utcnow()
                }
                signals.append(signal)
                
                # 记录持仓
                self.holdings[stock['code']] = {
                    'buy_date': today,
                    'buy_price': stock.get('price', 0)
                }
        
        return signals
    
    async def _select_strong_stocks(self) -> List[Dict]:
        """
        选择强势股票
        
        从上帝之眼API获取数据
        """
        godeye_api = self.config.get('data', {}).get('godeye_api', 'http://localhost:8000')
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{godeye_api}/api/v1/signals/strong') as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('stocks', [])
        except Exception as e:
            logger.warning(f'获取强势股票失败: {e}')
        
        # 返回模拟数据
        return [
            {'code': '600519', 'name': '贵州茅台', 'score': 0.9, 'price': 1800},
            {'code': '000858', 'name': '五粮液', 'score': 0.85, 'price': 160},
            {'code': '300750', 'name': '宁德时代', 'score': 0.82, 'price': 220},
        ]


class ExpertTrackingStrategy:
    """
    高手跟踪策略
    
    核心逻辑:
    - 跟踪雪球前10名高手
    - 实时监控高手发帖
    - 提取推荐股票
    - 生成跟单信号
    """
    
    name = "高手跟踪策略"
    
    def __init__(self, config: Dict):
        self.config = config.get('strategies', {}).get('expert', {})
        self.top_n = self.config.get('top_n', 10)
        self.min_score = self.config.get('min_score', 0.75)
    
    async def generate_signals(self) -> List[Dict]:
        """生成高手跟踪信号"""
        signals = []
        
        # 从上帝之眼API获取高手推荐
        godeye_api = self.config.get('data', {}).get('godeye_api', 'http://localhost:8000')
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{godeye_api}/api/v1/experts/signals') as response:
                    if response.status == 200:
                        data = await response.json()
                        expert_signals = data.get('signals', [])
                        
                        for sig in expert_signals:
                            if sig.get('expert_score', 0) >= self.min_score:
                                signal = {
                                    'signal_id': f'expert_{datetime.now().timestamp()}',
                                    'strategy': self.name,
                                    'signal_type': sig.get('signal_type', 'buy'),
                                    'stock_code': sig.get('stock_code'),
                                    'stock_name': sig.get('stock_name'),
                                    'confidence': sig.get('expert_score', 0.75),
                                    'reason': f'高手{sig.get("expert_name")}推荐',
                                    'created_at': datetime.utcnow()
                                }
                                signals.append(signal)
        except Exception as e:
            logger.warning(f'获取高手信号失败: {e}')
        
        return signals


async def test_strategies():
    """测试策略"""
    config = {
        'strategies': {
            'enabled': ['holiday', '7k_line', 'expert'],
            'holiday': {},
            '7k_line': {},
            'expert': {'top_n': 10, 'min_score': 0.75}
        },
        'data': {
            'godeye_api': 'http://localhost:8000'
        }
    }
    
    engine = StrategyEngine(config)
    signals = await engine.generate_signals()
    
    print(f'\n生成 {len(signals)} 个信号:')
    for sig in signals:
        print(f"  [{sig['strategy']}] {sig['signal_type'].upper()} "
              f"{sig.get('stock_code', '')} {sig.get('stock_name', '')} "
              f"(置信度: {sig['confidence']:.2f})")


if __name__ == '__main__':
    asyncio.run(test_strategies())
