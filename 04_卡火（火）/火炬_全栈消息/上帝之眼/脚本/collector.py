"""
数据采集模块

统一接口采集多平台数据
"""

import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class DataCollector:
    """数据采集器"""
    
    def __init__(self, config: dict):
        self.config = config
        self.godeye_api = 'http://localhost:8000'
    
    async def collect(self) -> Dict:
        """采集市场数据"""
        data = {
            'market_state': await self.get_market_state(),
            'sectors': await self.get_sectors(),
            'experts': await self.get_experts(),
            'timestamp': datetime.now().isoformat()
        }
        return data
    
    async def get_market_state(self) -> Dict:
        """获取大盘状态"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/market/state') as response:
                    if response.status == 200:
                        return await response.json()
        except Exception as e:
            logger.warning(f'获取大盘状态失败: {e}')
        
        return {'state': 'unknown', 'change_pct': 0}
    
    async def get_sectors(self, top_n: int = 10) -> List[Dict]:
        """获取板块数据"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/stocks/sectors',
                                       params={'top_n': top_n}) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('sectors', [])
        except Exception as e:
            logger.warning(f'获取板块数据失败: {e}')
        
        return []
    
    async def get_experts(self, platform: str = 'all') -> List[Dict]:
        """获取高手数据"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/experts',
                                       params={'platform': platform}) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('experts', [])
        except Exception as e:
            logger.warning(f'获取高手数据失败: {e}')
        
        return []
    
    async def get_stock_quote(self, stock_code: str) -> Dict:
        """获取股票行情"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/stocks/{stock_code}') as response:
                    if response.status == 200:
                        return await response.json()
        except Exception as e:
            logger.warning(f'获取股票行情失败: {e}')
        
        return {}
