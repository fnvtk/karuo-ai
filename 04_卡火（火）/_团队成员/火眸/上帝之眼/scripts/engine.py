"""
策略引擎

集成多种策略，生成交易信号
"""

import asyncio
from datetime import datetime, date
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class StrategyEngine:
    """策略引擎"""
    
    def __init__(self, config: dict):
        self.config = config
        self.strategies = []
        
        # 加载启用的策略
        enabled = config.get('enabled', [])
        
        if 'strong_pick' in enabled:
            from strategies.strong_pick import StrongPickStrategy
            self.strategies.append(StrongPickStrategy(config.get('strong_pick', {})))
        
        if 'expert_track' in enabled:
            from strategies.expert_track import ExpertTrackStrategy
            self.strategies.append(ExpertTrackStrategy(config.get('expert_track', {})))
        
        if 'sector_rotate' in enabled:
            from strategies.sector_rotate import SectorRotateStrategy
            self.strategies.append(SectorRotateStrategy(config.get('sector_rotate', {})))
        
        if 'holiday_factor' in enabled:
            from strategies.holiday_factor import HolidayFactorStrategy
            self.strategies.append(HolidayFactorStrategy(config.get('holiday_factor', {})))
        
        logger.info(f'策略引擎加载: {[s.name for s in self.strategies]}')
    
    async def generate_signals(self, market_data: dict = None) -> List[Dict]:
        """生成交易信号"""
        all_signals = []
        
        for strategy in self.strategies:
            try:
                signals = await strategy.generate_signals(market_data)
                all_signals.extend(signals)
                
                if signals:
                    logger.info(f'{strategy.name} 生成 {len(signals)} 个信号')
                    
            except Exception as e:
                logger.error(f'{strategy.name} 执行出错: {e}')
        
        # 信号去重
        all_signals = self._deduplicate(all_signals)
        
        return all_signals
    
    def _deduplicate(self, signals: List[Dict]) -> List[Dict]:
        """信号去重"""
        stock_signals = {}
        
        for signal in signals:
            stock_code = signal.get('stock_code', '')
            confidence = signal.get('confidence', 0)
            
            if stock_code not in stock_signals:
                stock_signals[stock_code] = signal
            elif confidence > stock_signals[stock_code].get('confidence', 0):
                stock_signals[stock_code] = signal
        
        return list(stock_signals.values())
