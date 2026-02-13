"""
强中强策略

从强势板块中选择强势个股
"""

from datetime import datetime, date
from typing import Dict, List


class StrongPickStrategy:
    """强中强策略"""
    
    name = "强中强策略"
    
    def __init__(self, config: dict):
        self.config = config
        self.hold_days = config.get('hold_days', 7)
        self.stop_loss = config.get('stop_loss', -0.05)
        self.holdings = {}  # 持仓记录
    
    async def generate_signals(self, market_data: dict = None) -> List[Dict]:
        """生成信号"""
        today = date.today()
        signals = []
        
        # 1. 检查持仓是否需要卖出（持有7天）
        for stock_code, holding in list(self.holdings.items()):
            hold_days = (today - holding['buy_date']).days
            
            if hold_days >= self.hold_days:
                signals.append({
                    'signal_id': f'strong_{datetime.now().timestamp()}',
                    'strategy': self.name,
                    'signal_type': 'sell',
                    'stock_code': stock_code,
                    'confidence': 1.0,
                    'reason': f'持有满{self.hold_days}天'
                })
                del self.holdings[stock_code]
        
        # 2. 选择强势股票买入
        strong_stocks = self._select_strong_stocks(market_data)
        
        for stock in strong_stocks[:5]:
            if stock['code'] not in self.holdings:
                signals.append({
                    'signal_id': f'strong_{datetime.now().timestamp()}',
                    'strategy': self.name,
                    'signal_type': 'buy',
                    'stock_code': stock['code'],
                    'stock_name': stock.get('name', ''),
                    'price': stock.get('price', 0),
                    'confidence': stock.get('score', 0.7),
                    'reason': f'强中强选股，评分{stock.get("score", 0.7):.2f}'
                })
                
                self.holdings[stock['code']] = {
                    'buy_date': today,
                    'buy_price': stock.get('price', 0)
                }
        
        return signals
    
    def _select_strong_stocks(self, market_data: dict = None) -> List[Dict]:
        """选择强势股票"""
        # 默认强势股票
        return [
            {'code': '600519', 'name': '贵州茅台', 'score': 0.9, 'price': 1800},
            {'code': '000858', 'name': '五粮液', 'score': 0.85, 'price': 160},
            {'code': '300750', 'name': '宁德时代', 'score': 0.82, 'price': 220},
        ]
