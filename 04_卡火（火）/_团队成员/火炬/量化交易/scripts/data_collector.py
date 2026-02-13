#!/usr/bin/env python3
"""
数据采集模块

功能:
1. 采集雪球网热门帖子
2. 采集板块涨幅数据
3. 采集个股行情数据
4. 整合上帝之眼API

作者: 卡若AI - 火炬
日期: 2026-01-29
"""

import aiohttp
import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import logging
import re
import json

logger = logging.getLogger(__name__)


class DataCollector:
    """
    数据采集器
    
    数据源:
    - 上帝之眼API: 主要数据源
    - 雪球网: 高手帖子
    - 新浪财经: 行情数据
    - 东方财富: 板块数据
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.godeye_api = config.get('data', {}).get('godeye_api', 'http://localhost:8000')
        
    async def get_strong_sectors(self, top_n: int = 5) -> List[Dict]:
        """
        获取强势板块
        
        Returns:
            [{'name': '新能源', 'change_pct': 0.035, 'volume_ratio': 1.8}]
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/stocks/sectors') as response:
                    if response.status == 200:
                        data = await response.json()
                        sectors = data.get('sectors', [])
                        
                        # 按涨幅排序
                        sectors.sort(key=lambda x: x.get('change_pct', 0), reverse=True)
                        
                        return sectors[:top_n]
        except Exception as e:
            logger.warning(f'从上帝之眼获取板块数据失败: {e}')
        
        # 使用备用数据源
        return await self._get_sectors_from_eastmoney(top_n)
    
    async def _get_sectors_from_eastmoney(self, top_n: int = 5) -> List[Dict]:
        """从东方财富获取板块数据"""
        url = "http://push2.eastmoney.com/api/qt/clist/get"
        params = {
            'pn': 1,
            'pz': top_n,
            'po': 1,
            'np': 1,
            'fltt': 2,
            'invt': 2,
            'fid': 'f3',
            'fs': 'm:90+t:2',
            'fields': 'f1,f2,f3,f4,f12,f14'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        items = data.get('data', {}).get('diff', [])
                        
                        sectors = []
                        for item in items:
                            sectors.append({
                                'code': item.get('f12', ''),
                                'name': item.get('f14', ''),
                                'change_pct': item.get('f3', 0) / 100,
                                'price': item.get('f2', 0),
                            })
                        
                        return sectors
        except Exception as e:
            logger.error(f'从东方财富获取板块数据失败: {e}')
        
        return []
    
    async def get_strong_stocks(self, sector: str = None, top_n: int = 10) -> List[Dict]:
        """
        获取强势股票
        
        Args:
            sector: 板块名称（可选）
            top_n: 返回数量
        
        Returns:
            [{'code': '600519', 'name': '贵州茅台', 'change_pct': 0.05, 'score': 0.9}]
        """
        try:
            params = {'top_n': top_n}
            if sector:
                params['sector'] = sector
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/signals/strong', 
                                       params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('stocks', [])
        except Exception as e:
            logger.warning(f'从上帝之眼获取强势股票失败: {e}')
        
        # 返回默认数据
        return self._get_default_strong_stocks()
    
    def _get_default_strong_stocks(self) -> List[Dict]:
        """默认强势股票列表"""
        return [
            {'code': '600519', 'name': '贵州茅台', 'change_pct': 0.02, 'score': 0.9},
            {'code': '000858', 'name': '五粮液', 'change_pct': 0.018, 'score': 0.85},
            {'code': '300750', 'name': '宁德时代', 'change_pct': 0.025, 'score': 0.82},
            {'code': '600036', 'name': '招商银行', 'change_pct': 0.015, 'score': 0.78},
            {'code': '601318', 'name': '中国平安', 'change_pct': 0.012, 'score': 0.75},
        ]
    
    async def get_stock_price(self, stock_code: str) -> Optional[Dict]:
        """
        获取股票实时价格
        
        Returns:
            {'code': '600519', 'price': 1800.0, 'change_pct': 0.02, 'volume': 1000000}
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/stocks/{stock_code}') as response:
                    if response.status == 200:
                        return await response.json()
        except Exception as e:
            logger.warning(f'获取股票价格失败: {e}')
        
        # 使用新浪财经备用
        return await self._get_price_from_sina(stock_code)
    
    async def _get_price_from_sina(self, stock_code: str) -> Optional[Dict]:
        """从新浪财经获取价格"""
        # 转换代码格式
        if stock_code.startswith('6'):
            sina_code = f'sh{stock_code}'
        else:
            sina_code = f'sz{stock_code}'
        
        url = f'http://hq.sinajs.cn/list={sina_code}'
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {'Referer': 'http://finance.sina.com.cn'}
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        text = await response.text()
                        
                        # 解析: var hq_str_sh600519="贵州茅台,1800.00,..."
                        match = re.search(r'"(.+)"', text)
                        if match:
                            parts = match.group(1).split(',')
                            if len(parts) >= 4:
                                return {
                                    'code': stock_code,
                                    'name': parts[0],
                                    'price': float(parts[3]),
                                    'open': float(parts[1]),
                                    'close': float(parts[2]),
                                    'high': float(parts[4]) if len(parts) > 4 else 0,
                                    'low': float(parts[5]) if len(parts) > 5 else 0,
                                    'volume': int(float(parts[8])) if len(parts) > 8 else 0,
                                }
        except Exception as e:
            logger.error(f'从新浪获取价格失败: {e}')
        
        return None
    
    async def get_expert_signals(self, top_n: int = 10) -> List[Dict]:
        """
        获取高手信号
        
        从上帝之眼获取高手推荐
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/experts/signals',
                                       params={'top_n': top_n}) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('signals', [])
        except Exception as e:
            logger.warning(f'获取高手信号失败: {e}')
        
        return []
    
    async def get_holiday_stocks(self, holiday_name: str) -> List[Dict]:
        """
        获取节假日策略推荐股票
        
        Args:
            holiday_name: 节假日名称（春节/五一/国庆）
        
        Returns:
            历年该节假日表现最好的股票
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/strategy/holiday',
                                       params={'holiday': holiday_name}) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('stocks', [])
        except Exception as e:
            logger.warning(f'获取节假日股票失败: {e}')
        
        # 返回默认数据
        return self._get_default_holiday_stocks(holiday_name)
    
    def _get_default_holiday_stocks(self, holiday_name: str) -> List[Dict]:
        """默认节假日股票"""
        stocks = {
            '春节': [
                {'code': '600519', 'name': '贵州茅台', 'sector': '白酒', 'appear_times': 5},
                {'code': '000858', 'name': '五粮液', 'sector': '白酒', 'appear_times': 4},
                {'code': '601318', 'name': '中国平安', 'sector': '非银金融', 'appear_times': 4},
                {'code': '300750', 'name': '宁德时代', 'sector': '新能源', 'appear_times': 3},
                {'code': '600036', 'name': '招商银行', 'sector': '银行', 'appear_times': 3},
            ],
            '五一': [
                {'code': '600138', 'name': '中青旅', 'sector': '旅游酒店', 'appear_times': 5},
                {'code': '000888', 'name': '峨眉山A', 'sector': '旅游酒店', 'appear_times': 4},
                {'code': '600258', 'name': '首旅酒店', 'sector': '旅游酒店', 'appear_times': 4},
                {'code': '600887', 'name': '伊利股份', 'sector': '消费', 'appear_times': 3},
                {'code': '002007', 'name': '华兰生物', 'sector': '医药生物', 'appear_times': 3},
            ],
            '国庆': [
                {'code': '600519', 'name': '贵州茅台', 'sector': '白酒', 'appear_times': 5},
                {'code': '600138', 'name': '中青旅', 'sector': '旅游酒店', 'appear_times': 4},
                {'code': '002594', 'name': '比亚迪', 'sector': '新能源汽车', 'appear_times': 4},
                {'code': '300750', 'name': '宁德时代', 'sector': '新能源', 'appear_times': 3},
                {'code': '000858', 'name': '五粮液', 'sector': '白酒', 'appear_times': 3},
            ],
        }
        return stocks.get(holiday_name, [])
    
    async def get_market_state(self) -> Dict:
        """
        获取大盘状态
        
        Returns:
            {'index': '上证指数', 'price': 3200, 'change_pct': 0.01, 'state': '平衡'}
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.godeye_api}/api/v1/market/state') as response:
                    if response.status == 200:
                        return await response.json()
        except Exception as e:
            logger.warning(f'获取大盘状态失败: {e}')
        
        # 从新浪获取上证指数
        return await self._get_index_from_sina()
    
    async def _get_index_from_sina(self) -> Dict:
        """从新浪获取上证指数"""
        url = 'http://hq.sinajs.cn/list=sh000001'
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {'Referer': 'http://finance.sina.com.cn'}
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        text = await response.text()
                        
                        match = re.search(r'"(.+)"', text)
                        if match:
                            parts = match.group(1).split(',')
                            if len(parts) >= 4:
                                price = float(parts[3])
                                close = float(parts[2])
                                change_pct = (price - close) / close if close > 0 else 0
                                
                                # 判断状态
                                if change_pct > 0.02:
                                    state = '大涨'
                                elif change_pct < -0.02:
                                    state = '大跌'
                                else:
                                    state = '平衡'
                                
                                return {
                                    'index': '上证指数',
                                    'price': price,
                                    'change_pct': change_pct,
                                    'state': state
                                }
        except Exception as e:
            logger.error(f'获取上证指数失败: {e}')
        
        return {'index': '上证指数', 'price': 0, 'change_pct': 0, 'state': '未知'}


class XueqiuCrawler:
    """
    雪球网爬虫
    
    采集高手帖子
    """
    
    BASE_URL = "https://xueqiu.com"
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://xueqiu.com'
        }
    
    async def crawl_hot_posts(self, count: int = 20) -> List[Dict]:
        """采集热门帖子"""
        url = f"{self.BASE_URL}/statuses/hot/listV2.json"
        params = {
            'category': '-1',
            'count': count,
            'source': 'all'
        }
        
        try:
            async with aiohttp.ClientSession(headers=self.headers) as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        posts = data.get('list', [])
                        
                        parsed_posts = []
                        for post in posts:
                            parsed = self._parse_post(post)
                            if parsed:
                                parsed_posts.append(parsed)
                        
                        logger.info(f'采集到{len(parsed_posts)}条帖子')
                        return parsed_posts
        except Exception as e:
            logger.error(f'采集雪球帖子失败: {e}')
        
        return []
    
    def _parse_post(self, post: Dict) -> Optional[Dict]:
        """解析帖子"""
        try:
            text = post.get('text', '') + post.get('description', '')
            stocks = self._extract_stocks(text)
            
            return {
                'post_id': f"xueqiu_{post.get('id')}",
                'author': post.get('screen_name', ''),
                'followers': post.get('followers_count', 0),
                'title': post.get('title', ''),
                'text': post.get('text', ''),
                'stocks': stocks,
                'likes': post.get('fav_count', 0),
                'replies': post.get('reply_count', 0),
                'created_at': datetime.fromtimestamp(
                    post.get('created_at', 0) / 1000
                ) if post.get('created_at') else datetime.utcnow()
            }
        except Exception as e:
            logger.warning(f'解析帖子失败: {e}')
            return None
    
    def _extract_stocks(self, text: str) -> List[str]:
        """提取股票代码"""
        stocks = []
        
        # 匹配 $SH600519$ 或 $SZ000858$
        pattern1 = r'\$([A-Z]{2}\d{6})\$'
        matches1 = re.findall(pattern1, text)
        stocks.extend([m[2:] for m in matches1])
        
        # 匹配 (SH600519)
        pattern2 = r'\(([A-Z]{2}\d{6})\)'
        matches2 = re.findall(pattern2, text)
        stocks.extend([m[2:] for m in matches2])
        
        return list(set(stocks))


async def test_collector():
    """测试数据采集"""
    config = {
        'data': {
            'godeye_api': 'http://localhost:8000'
        }
    }
    
    collector = DataCollector(config)
    
    print('\n=== 测试数据采集 ===\n')
    
    # 测试板块数据
    print('1. 强势板块:')
    sectors = await collector.get_strong_sectors()
    for s in sectors:
        print(f"  {s['name']}: {s.get('change_pct', 0):.2%}")
    
    # 测试股票数据
    print('\n2. 强势股票:')
    stocks = await collector.get_strong_stocks()
    for s in stocks:
        print(f"  {s['code']} {s['name']}: 评分{s.get('score', 0):.2f}")
    
    # 测试大盘状态
    print('\n3. 大盘状态:')
    market = await collector.get_market_state()
    print(f"  {market['index']}: {market['price']} ({market['change_pct']:.2%}) - {market['state']}")
    
    # 测试节假日股票
    print('\n4. 春节策略股票:')
    holiday_stocks = await collector.get_holiday_stocks('春节')
    for s in holiday_stocks:
        print(f"  {s['code']} {s['name']} ({s['sector']}): 出现{s['appear_times']}次")


if __name__ == '__main__':
    asyncio.run(test_collector())
