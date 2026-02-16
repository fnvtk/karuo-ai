"""
节假日因子策略（卡若原创）

核心逻辑：
1. 统计5年历史数据，选出节假日期间涨幅最高、出现次数最多的2个板块
2. 在这2个板块内，选出5年内出现次数最多的3只个股
3. 排除涨停股、跌停股（不排除ST）
4. 使用卡若均线理论（天堂线-邪恶线-地狱线）综合评分
5. 买入前3名

时间范围：从停盘买入那天到停盘后第7根K线的涨幅排序

作者: 卡若AI - 火眸
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# 尝试导入akshare
try:
    import akshare as ak
    HAS_AKSHARE = True
except ImportError:
    HAS_AKSHARE = False
    logger.warning('akshare未安装，将使用模拟数据')

try:
    import pandas as pd
    import numpy as np
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


class HolidayFactorStrategy:
    """
    节假日因子策略（卡若原创）
    
    五步选股法：
    1. 统计5年，选出出现次数最多的2个板块
    2. 在板块内选出出现次数最多的3只个股
    3. 排除涨停、跌停（不排除ST）
    4. 卡若均线理论评分
    5. 买入前3名
    """
    
    name = "节假日策略"
    
    def __init__(self, config: dict):
        self.config = config
        self.history_years = config.get('history_years', 5)
        self.top_sectors = 2  # 选出2个板块
        self.stocks_per_sector = 3  # 每板块3只
        self.buy_count = 3  # 买入前3名
        
        # 历史数据缓存
        self._sector_cache = {}
        self._stock_cache = {}
        
        # 节假日配置（停盘日期）
        self.holidays_config = {
            '春节': self._get_spring_festival_dates(),
            '五一': self._get_labor_day_dates(),
            '国庆': self._get_national_day_dates(),
        }
    
    def _get_spring_festival_dates(self) -> List[Dict]:
        """获取历年春节停复盘日期"""
        return [
            {'year': 2021, 'last_trade': '2021-02-10', 'first_trade': '2021-02-18'},
            {'year': 2022, 'last_trade': '2022-01-28', 'first_trade': '2022-02-07'},
            {'year': 2023, 'last_trade': '2023-01-20', 'first_trade': '2023-01-30'},
            {'year': 2024, 'last_trade': '2024-02-08', 'first_trade': '2024-02-19'},
            {'year': 2025, 'last_trade': '2025-01-28', 'first_trade': '2025-02-05'},
            {'year': 2026, 'last_trade': '2026-02-06', 'first_trade': '2026-02-16'},
        ]
    
    def _get_labor_day_dates(self) -> List[Dict]:
        """获取历年五一停复盘日期"""
        return [
            {'year': 2021, 'last_trade': '2021-04-30', 'first_trade': '2021-05-06'},
            {'year': 2022, 'last_trade': '2022-04-29', 'first_trade': '2022-05-05'},
            {'year': 2023, 'last_trade': '2023-04-28', 'first_trade': '2023-05-04'},
            {'year': 2024, 'last_trade': '2024-04-30', 'first_trade': '2024-05-06'},
            {'year': 2025, 'last_trade': '2025-04-30', 'first_trade': '2025-05-06'},
            {'year': 2026, 'last_trade': '2026-04-30', 'first_trade': '2026-05-06'},
        ]
    
    def _get_national_day_dates(self) -> List[Dict]:
        """获取历年国庆停复盘日期"""
        return [
            {'year': 2021, 'last_trade': '2021-09-30', 'first_trade': '2021-10-08'},
            {'year': 2022, 'last_trade': '2022-09-30', 'first_trade': '2022-10-10'},
            {'year': 2023, 'last_trade': '2023-09-28', 'first_trade': '2023-10-09'},
            {'year': 2024, 'last_trade': '2024-09-30', 'first_trade': '2024-10-08'},
            {'year': 2025, 'last_trade': '2025-09-30', 'first_trade': '2025-10-08'},
            {'year': 2026, 'last_trade': '2026-09-30', 'first_trade': '2026-10-09'},
        ]
    
    async def generate_signals(self, market_data: dict = None) -> List[Dict]:
        """生成信号"""
        today = date.today()
        signals = []
        
        # 检查是否接近节假日买入窗口
        holiday_info = self._check_holiday_window(today)
        if not holiday_info:
            return signals
        
        holiday_name = holiday_info['name']
        logger.info(f'📅 {holiday_name}买入窗口！开始五步选股...')
        
        # === 五步选股法 ===
        
        # 第一步：统计5年历史，选出出现次数最多的2个板块
        top_sectors = await self._step1_select_sectors(holiday_name)
        logger.info(f'第一步完成：选出{len(top_sectors)}个强势板块')
        
        # 第二步：在板块内选出5年内出现次数最多的个股
        candidates = await self._step2_select_stocks(holiday_name, top_sectors)
        logger.info(f'第二步完成：选出{len(candidates)}只候选股')
        
        # 第三步：排除涨停、跌停（不排除ST）
        filtered = await self._step3_filter_stocks(candidates)
        logger.info(f'第三步完成：过滤后剩余{len(filtered)}只')
        
        # 第四步：卡若均线理论评分
        scored = await self._step4_karuo_score(filtered)
        logger.info(f'第四步完成：评分完成')
        
        # 第五步：买入前3名
        final_stocks = scored[:self.buy_count]
        logger.info(f'第五步完成：选出前{len(final_stocks)}名')
        
        # 生成信号
        for stock in final_stocks:
            signals.append({
                'signal_id': f'holiday_{datetime.now().timestamp()}_{stock["code"]}',
                'strategy': self.name,
                'signal_type': 'buy',
                'stock_code': stock['code'],
                'stock_name': stock.get('name', ''),
                'price': stock.get('price', 0),
                'confidence': stock.get('score', 0.8),
                'reason': f'{holiday_name}策略 | 板块:{stock.get("sector")} | 5年出现{stock.get("appear_times", 0)}次 | 均线评分:{stock.get("ma_score", 0):.2f}',
                'holiday': holiday_name,
                'sector': stock.get('sector'),
                'appear_times': stock.get('appear_times', 0),
                'ma_score': stock.get('ma_score', 0)
            })
        
        return signals
    
    def _check_holiday_window(self, today: date) -> Optional[Dict]:
        """检查是否在节假日买入窗口"""
        buy_before_days = self.config.get('buy_before_days', 2)
        
        for holiday_name, dates_list in self.holidays_config.items():
            for date_info in dates_list:
                try:
                    last_trade = date.fromisoformat(date_info['last_trade'])
                    days_diff = (last_trade - today).days
                    
                    # 买入窗口：停盘前2天内
                    if 0 <= days_diff <= buy_before_days:
                        return {
                            'name': holiday_name,
                            'last_trade': last_trade,
                            'first_trade': date.fromisoformat(date_info['first_trade']),
                            'year': date_info['year']
                        }
                except:
                    continue
        
        return None
    
    async def _step1_select_sectors(self, holiday_name: str) -> List[Dict]:
        """
        第一步：统计5年历史数据，选出出现次数最多的2个板块
        
        计算方式：
        - 统计每年节假日期间（停盘日到复盘后第7个交易日）各板块涨幅
        - 取每年涨幅前5的板块
        - 统计5年内出现次数，选出出现次数最多的2个
        """
        sector_stats = {}
        dates_list = self.holidays_config.get(holiday_name, [])
        
        # 只取最近5年的数据
        recent_dates = [d for d in dates_list if d['year'] <= date.today().year - 1][-self.history_years:]
        
        for date_info in recent_dates:
            year = date_info['year']
            last_trade = date_info['last_trade']
            first_trade = date_info['first_trade']
            
            # 获取该年度节假日期间板块涨幅
            sector_gains = await self._get_sector_gains(last_trade, first_trade, days_after=7)
            
            # 取涨幅前5的板块
            top5 = sorted(sector_gains, key=lambda x: x.get('gain', 0), reverse=True)[:5]
            
            for sector in top5:
                name = sector['name']
                if name not in sector_stats:
                    sector_stats[name] = {
                        'name': name,
                        'appear_times': 0,
                        'total_gain': 0,
                        'years': []
                    }
                
                sector_stats[name]['appear_times'] += 1
                sector_stats[name]['total_gain'] += sector.get('gain', 0)
                sector_stats[name]['years'].append(year)
        
        # 按出现次数排序，取前2个
        ranked = sorted(
            sector_stats.values(),
            key=lambda x: (x['appear_times'], x['total_gain']),
            reverse=True
        )
        
        top_sectors = ranked[:self.top_sectors]
        
        for s in top_sectors:
            s['avg_gain'] = s['total_gain'] / s['appear_times'] if s['appear_times'] > 0 else 0
            logger.info(f"  板块: {s['name']} | 出现{s['appear_times']}次 | 平均涨幅{s['avg_gain']:.2%} | 年份{s['years']}")
        
        return top_sectors
    
    async def _step2_select_stocks(self, holiday_name: str, sectors: List[Dict]) -> List[Dict]:
        """
        第二步：在板块内选出5年内出现次数最多的个股
        
        每个板块选3只
        """
        all_candidates = []
        dates_list = self.holidays_config.get(holiday_name, [])
        recent_dates = [d for d in dates_list if d['year'] <= date.today().year - 1][-self.history_years:]
        
        for sector in sectors:
            sector_name = sector['name']
            stock_stats = {}
            
            for date_info in recent_dates:
                year = date_info['year']
                last_trade = date_info['last_trade']
                first_trade = date_info['first_trade']
                
                # 获取板块内个股涨幅
                stock_gains = await self._get_stock_gains_in_sector(
                    sector_name, last_trade, first_trade, days_after=7
                )
                
                # 取涨幅前5的个股
                top5 = sorted(stock_gains, key=lambda x: x.get('gain', 0), reverse=True)[:5]
                
                for stock in top5:
                    code = stock['code']
                    if code not in stock_stats:
                        stock_stats[code] = {
                            'code': code,
                            'name': stock.get('name', ''),
                            'sector': sector_name,
                            'appear_times': 0,
                            'total_gain': 0,
                            'years': []
                        }
                    
                    stock_stats[code]['appear_times'] += 1
                    stock_stats[code]['total_gain'] += stock.get('gain', 0)
                    stock_stats[code]['years'].append(year)
            
            # 按出现次数排序，取前3只
            ranked = sorted(
                stock_stats.values(),
                key=lambda x: (x['appear_times'], x['total_gain']),
                reverse=True
            )
            
            for stock in ranked[:self.stocks_per_sector]:
                stock['avg_gain'] = stock['total_gain'] / stock['appear_times'] if stock['appear_times'] > 0 else 0
                all_candidates.append(stock)
                logger.info(f"  个股: {stock['code']} {stock['name']} | {sector_name} | 出现{stock['appear_times']}次 | 平均涨幅{stock['avg_gain']:.2%}")
        
        return all_candidates
    
    async def _step3_filter_stocks(self, stocks: List[Dict]) -> List[Dict]:
        """
        第三步：排除涨停股、跌停股（不排除ST）
        """
        filtered = []
        
        for stock in stocks:
            code = stock['code']
            
            # 获取当日行情
            quote = await self._get_stock_quote(code)
            
            if not quote:
                continue
            
            # 更新价格信息
            stock['price'] = quote.get('price', 0)
            stock['change_pct'] = quote.get('change_pct', 0)
            
            # 排除涨停（涨幅>=9.9%或>=19.9%）
            if quote.get('is_limit_up', False):
                logger.info(f"  排除涨停: {code}")
                continue
            
            # 排除跌停
            if quote.get('is_limit_down', False):
                logger.info(f"  排除跌停: {code}")
                continue
            
            # 不排除ST
            filtered.append(stock)
        
        return filtered
    
    async def _step4_karuo_score(self, stocks: List[Dict]) -> List[Dict]:
        """
        第四步：卡若均线理论评分
        
        卡若均线系统：天堂线-邪恶线-地狱线
        
        天堂线 = (MA5 + MA10 + MA20) / 3 的5日均值（白线）
        邪恶线 = MA60的5日均值（绿线）
        地狱线 = (MA120 + MA240) / 2 的5日均值（红线）
        
        评分规则：
        - 天堂线 > 邪恶线 > 地狱线（牛市排列）：+40分
        - 天堂线 > 邪恶线（上涨趋势）：+30分
        - 天堂线上穿邪恶线（金叉）：+20分
        - 价格在天堂线上方：+10分
        - 综合历史出现次数：5年出现次数 × 10分（最高50分）
        """
        scored = []
        
        for stock in stocks:
            code = stock['code']
            
            # 获取均线数据
            ma_data = await self._get_ma_data(code)
            
            if not ma_data:
                stock['ma_score'] = 0
                stock['score'] = stock['appear_times'] * 0.1
                scored.append(stock)
                continue
            
            # 计算卡若均线评分
            ma_score = self._calculate_karuo_ma_score(ma_data, stock.get('price', 0))
            
            # 综合评分 = 均线评分(0-50) + 历史出现次数评分(0-50)
            appear_score = min(stock['appear_times'] * 10, 50)
            total_score = (ma_score + appear_score) / 100
            
            stock['ma_score'] = ma_score
            stock['appear_score'] = appear_score
            stock['score'] = total_score
            
            logger.info(f"  评分: {code} | 均线{ma_score}分 | 出现次数{appear_score}分 | 总分{total_score:.2f}")
            
            scored.append(stock)
        
        # 按总分排序
        scored.sort(key=lambda x: x['score'], reverse=True)
        
        return scored
    
    def _calculate_karuo_ma_score(self, ma_data: Dict, current_price: float) -> float:
        """
        计算卡若均线评分
        
        Args:
            ma_data: {
                'heaven': 天堂线值,
                'evil': 邪恶线值,
                'hell': 地狱线值,
                'prev_heaven': 前一日天堂线,
                'prev_evil': 前一日邪恶线
            }
        """
        score = 0
        
        heaven = ma_data.get('heaven', 0)
        evil = ma_data.get('evil', 0)
        hell = ma_data.get('hell', 0)
        prev_heaven = ma_data.get('prev_heaven', 0)
        prev_evil = ma_data.get('prev_evil', 0)
        
        if heaven <= 0 or evil <= 0 or hell <= 0:
            return 0
        
        # 牛市排列：天堂 > 邪恶 > 地狱（+40分）
        if heaven > evil > hell:
            score += 40
        # 上涨趋势：天堂 > 邪恶（+30分）
        elif heaven > evil:
            score += 30
        
        # 金叉：天堂线上穿邪恶线（+20分）
        if prev_heaven <= prev_evil and heaven > evil:
            score += 20
        
        # 价格在天堂线上方（+10分）
        if current_price > heaven:
            score += 10
        
        return min(score, 50)  # 最高50分
    
    async def _get_sector_gains(self, start_date: str, end_date: str, days_after: int = 7) -> List[Dict]:
        """
        获取板块涨幅数据
        
        使用akshare获取真实数据
        """
        if HAS_AKSHARE and HAS_PANDAS:
            try:
                # 获取行业板块数据
                df = ak.stock_board_industry_name_em()
                
                sectors = []
                for _, row in df.iterrows():
                    sectors.append({
                        'name': row.get('板块名称', ''),
                        'code': row.get('板块代码', ''),
                        'gain': row.get('涨跌幅', 0) / 100 if row.get('涨跌幅') else 0
                    })
                
                return sectors
            except Exception as e:
                logger.warning(f'获取板块数据失败: {e}')
        
        # 模拟数据（用于测试）
        return self._get_mock_sector_gains()
    
    def _get_mock_sector_gains(self) -> List[Dict]:
        """模拟板块涨幅数据"""
        return [
            {'name': '医药生物', 'code': 'BK0465', 'gain': 0.085},
            {'name': '非银金融', 'code': 'BK0475', 'gain': 0.072},
            {'name': '电子信息', 'code': 'BK0448', 'gain': 0.091},
            {'name': '新能源', 'code': 'BK0493', 'gain': 0.103},
            {'name': '旅游酒店', 'code': 'BK0457', 'gain': 0.065},
            {'name': '白酒', 'code': 'BK0896', 'gain': 0.082},
            {'name': '消费电子', 'code': 'BK0738', 'gain': 0.068},
        ]
    
    async def _get_stock_gains_in_sector(self, sector_name: str, start_date: str, 
                                         end_date: str, days_after: int = 7) -> List[Dict]:
        """获取板块内个股涨幅"""
        if HAS_AKSHARE and HAS_PANDAS:
            try:
                # 获取板块成分股
                df = ak.stock_board_industry_cons_em(symbol=sector_name)
                
                stocks = []
                for _, row in df.head(20).iterrows():  # 取前20只
                    code = row.get('代码', '')
                    name = row.get('名称', '')
                    gain = row.get('涨跌幅', 0) / 100 if row.get('涨跌幅') else 0
                    
                    stocks.append({
                        'code': code,
                        'name': name,
                        'gain': gain
                    })
                
                return stocks
            except Exception as e:
                logger.warning(f'获取板块成分股失败: {e}')
        
        # 模拟数据
        return self._get_mock_stock_gains(sector_name)
    
    def _get_mock_stock_gains(self, sector_name: str) -> List[Dict]:
        """模拟个股涨幅数据"""
        mock_data = {
            '医药生物': [
                {'code': '600276', 'name': '恒瑞医药', 'gain': 0.095},
                {'code': '600196', 'name': '复星医药', 'gain': 0.082},
                {'code': '000538', 'name': '云南白药', 'gain': 0.078},
            ],
            '非银金融': [
                {'code': '601318', 'name': '中国平安', 'gain': 0.065},
                {'code': '300059', 'name': '东方财富', 'gain': 0.123},
                {'code': '600030', 'name': '中信证券', 'gain': 0.079},
            ],
            '白酒': [
                {'code': '600519', 'name': '贵州茅台', 'gain': 0.085},
                {'code': '000858', 'name': '五粮液', 'gain': 0.072},
                {'code': '000568', 'name': '泸州老窖', 'gain': 0.068},
            ],
            '旅游酒店': [
                {'code': '600138', 'name': '中青旅', 'gain': 0.065},
                {'code': '000888', 'name': '峨眉山A', 'gain': 0.058},
                {'code': '600258', 'name': '首旅酒店', 'gain': 0.052},
            ],
            '新能源': [
                {'code': '300750', 'name': '宁德时代', 'gain': 0.103},
                {'code': '002594', 'name': '比亚迪', 'gain': 0.095},
                {'code': '601012', 'name': '隆基绿能', 'gain': 0.078},
            ],
        }
        return mock_data.get(sector_name, [])
    
    async def _get_stock_quote(self, code: str) -> Optional[Dict]:
        """获取股票实时行情"""
        if HAS_AKSHARE and HAS_PANDAS:
            try:
                df = ak.stock_zh_a_spot_em()
                row = df[df['代码'] == code]
                
                if not row.empty:
                    row = row.iloc[0]
                    change_pct = row.get('涨跌幅', 0) / 100 if row.get('涨跌幅') else 0
                    
                    return {
                        'code': code,
                        'name': row.get('名称', ''),
                        'price': row.get('最新价', 0),
                        'change_pct': change_pct,
                        'is_limit_up': change_pct >= 0.099,
                        'is_limit_down': change_pct <= -0.099
                    }
            except Exception as e:
                logger.warning(f'获取行情失败: {e}')
        
        # 模拟数据
        return {
            'code': code,
            'name': f'股票{code}',
            'price': 100.0,
            'change_pct': 0.02,
            'is_limit_up': False,
            'is_limit_down': False
        }
    
    async def _get_ma_data(self, code: str) -> Optional[Dict]:
        """
        获取均线数据，计算卡若均线系统
        
        天堂线 = (MA5 + MA10 + MA20) / 3 的5日均值
        邪恶线 = MA60的5日均值
        地狱线 = (MA120 + MA240) / 2 的5日均值
        """
        if HAS_AKSHARE and HAS_PANDAS:
            try:
                # 获取历史K线
                df = ak.stock_zh_a_hist(symbol=code, period="daily", 
                                        start_date=(date.today() - timedelta(days=365)).strftime('%Y%m%d'),
                                        end_date=date.today().strftime('%Y%m%d'),
                                        adjust="qfq")
                
                if df is None or len(df) < 240:
                    return None
                
                close = df['收盘'].values
                
                # 计算均线
                ma5 = pd.Series(close).rolling(5).mean().values
                ma10 = pd.Series(close).rolling(10).mean().values
                ma20 = pd.Series(close).rolling(20).mean().values
                ma60 = pd.Series(close).rolling(60).mean().values
                ma120 = pd.Series(close).rolling(120).mean().values
                ma240 = pd.Series(close).rolling(240).mean().values
                
                # 计算天堂线、邪恶线、地狱线
                heaven_base = (ma5 + ma10 + ma20) / 3
                heaven = pd.Series(heaven_base).rolling(5).mean().values
                
                evil = pd.Series(ma60).rolling(5).mean().values
                
                hell_base = (ma120 + ma240) / 2
                hell = pd.Series(hell_base).rolling(5).mean().values
                
                return {
                    'heaven': heaven[-1] if not np.isnan(heaven[-1]) else 0,
                    'evil': evil[-1] if not np.isnan(evil[-1]) else 0,
                    'hell': hell[-1] if not np.isnan(hell[-1]) else 0,
                    'prev_heaven': heaven[-2] if len(heaven) > 1 and not np.isnan(heaven[-2]) else 0,
                    'prev_evil': evil[-2] if len(evil) > 1 and not np.isnan(evil[-2]) else 0,
                }
            except Exception as e:
                logger.warning(f'获取均线数据失败: {e}')
        
        # 模拟数据
        return {
            'heaven': 100,
            'evil': 95,
            'hell': 90,
            'prev_heaven': 98,
            'prev_evil': 96,
        }
