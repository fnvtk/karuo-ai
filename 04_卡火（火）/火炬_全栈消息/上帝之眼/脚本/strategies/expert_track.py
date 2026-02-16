"""
模拟股策略（高手跟踪）

跟踪各平台高手买卖点
"""

from datetime import datetime
from typing import Dict, List


class ExpertTrackStrategy:
    """高手跟踪策略"""
    
    name = "模拟股策略"
    
    def __init__(self, config: dict):
        self.config = config
        self.platforms = config.get('platforms', ['xueqiu', 'ths'])
        self.top_n = config.get('top_n', 10)
        self.min_score = config.get('min_score', 0.75)
    
    async def generate_signals(self, market_data: dict = None) -> List[Dict]:
        """生成信号"""
        signals = []
        
        experts = market_data.get('experts', []) if market_data else []
        
        for expert in experts[:self.top_n]:
            score = expert.get('score', 0)
            
            if score < self.min_score:
                continue
            
            # 检查高手最新操作
            for action in expert.get('recent_actions', []):
                signals.append({
                    'signal_id': f'expert_{datetime.now().timestamp()}',
                    'strategy': self.name,
                    'signal_type': action.get('type', 'buy'),
                    'stock_code': action.get('stock_code'),
                    'stock_name': action.get('stock_name'),
                    'price': action.get('price', 0),
                    'confidence': score,
                    'reason': f'高手{expert.get("name")}推荐',
                    'expert': expert.get('name')
                })
        
        return signals
