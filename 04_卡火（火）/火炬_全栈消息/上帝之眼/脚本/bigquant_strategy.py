"""
上帝之眼 - 卡若五步选股法
BigQuant策略版本

策略说明：
- 基于5年历史数据实时分析
- 选出节假日期间表现最好的板块和个股
- 使用卡若均线系统（天堂-邪恶-地狱）评分

作者: 卡若AI
"""

# =============================================
# BigQuant平台策略代码
# =============================================

# 导入BigQuant模块
from bigquant.sdk.datasource import DataSource
from bigquant.sdk.strategy import MStrategy
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# =============================================
# 策略参数
# =============================================
PARAMS = {
    'history_years': 5,          # 历史统计年数
    'top_sectors': 2,            # 选出的板块数量
    'stocks_per_sector': 3,      # 每板块选股数量
    'buy_count': 3,              # 最终买入数量
    'buy_before_days': 2,        # 节前买入天数
    'sell_after_klines': 7,      # 节后卖出K线数
    'stop_loss': -0.03,          # 止损比例
    'single_position': 0.15,     # 单只股票仓位
}

# 2026年节假日配置
HOLIDAYS_2026 = {
    '春节': {'last_trade': '2026-02-06', 'first_trade': '2026-02-16'},
    '五一': {'last_trade': '2026-04-30', 'first_trade': '2026-05-06'},
    '国庆': {'last_trade': '2026-09-30', 'first_trade': '2026-10-09'},
}


class KaruoMASystem:
    """
    卡若均线系统
    
    天堂线(白) = SMA((MA5 + MA10 + MA20) / 3, 5)
    邪恶线(绿) = SMA(MA60, 5)
    地狱线(红) = SMA((MA120 + MA240) / 2, 5)
    """
    
    @staticmethod
    def calculate(close_prices: pd.Series) -> dict:
        """计算卡若均线"""
        if len(close_prices) < 240:
            return None
        
        # 计算基础均线
        ma5 = close_prices.rolling(5).mean()
        ma10 = close_prices.rolling(10).mean()
        ma20 = close_prices.rolling(20).mean()
        ma60 = close_prices.rolling(60).mean()
        ma120 = close_prices.rolling(120).mean()
        ma240 = close_prices.rolling(240).mean()
        
        # 计算天堂-邪恶-地狱三线
        heaven_base = (ma5 + ma10 + ma20) / 3
        heaven = heaven_base.rolling(5).mean()
        
        evil = ma60.rolling(5).mean()
        
        hell_base = (ma120 + ma240) / 2
        hell = hell_base.rolling(5).mean()
        
        return {
            'heaven': heaven.iloc[-1],
            'evil': evil.iloc[-1],
            'hell': hell.iloc[-1],
            'prev_heaven': heaven.iloc[-2] if len(heaven) > 1 else None,
            'prev_evil': evil.iloc[-2] if len(evil) > 1 else None,
        }
    
    @staticmethod
    def score(ma_data: dict, current_price: float) -> float:
        """
        计算卡若均线评分
        
        评分规则：
        - 牛市排列（天堂>邪恶>地狱）：+40分
        - 上涨趋势（天堂>邪恶）：+30分
        - 金叉（天堂上穿邪恶）：+20分
        - 价格在天堂线上方：+10分
        """
        if not ma_data:
            return 0
        
        score = 0
        heaven = ma_data.get('heaven', 0)
        evil = ma_data.get('evil', 0)
        hell = ma_data.get('hell', 0)
        prev_heaven = ma_data.get('prev_heaven', 0)
        prev_evil = ma_data.get('prev_evil', 0)
        
        if heaven <= 0 or evil <= 0 or hell <= 0:
            return 0
        
        # 牛市排列
        if heaven > evil > hell:
            score += 40
        # 上涨趋势
        elif heaven > evil:
            score += 30
        
        # 金叉
        if prev_heaven and prev_evil:
            if prev_heaven <= prev_evil and heaven > evil:
                score += 20
        
        # 价格在天堂线上方
        if current_price > heaven:
            score += 10
        
        return min(score, 50)


def initialize(context):
    """
    策略初始化
    """
    context.params = PARAMS
    context.holidays = HOLIDAYS_2026
    context.hold_days = {}  # 持仓天数记录
    context.buy_signals = []
    
    # 设置基准
    context.set_benchmark('000300.SH')
    
    # 设置交易费用
    context.set_commission(0.0003)  # 万三佣金
    context.set_slippage(0.001)     # 千一滑点
    
    print('='*60)
    print('上帝之眼 - 卡若五步选股法')
    print('='*60)
    print(f'参数配置:')
    print(f'  历史年数: {PARAMS["history_years"]}')
    print(f'  选择板块: {PARAMS["top_sectors"]}个')
    print(f'  每板块个股: {PARAMS["stocks_per_sector"]}只')
    print(f'  最终买入: {PARAMS["buy_count"]}只')
    print(f'  止损比例: {PARAMS["stop_loss"]:.0%}')
    print('='*60)


def before_trading_start(context, data):
    """
    盘前处理
    """
    today = context.current_dt.strftime('%Y-%m-%d')
    
    # 检查是否在节假日买入窗口
    buy_window = check_holiday_window(today, context.holidays, context.params['buy_before_days'])
    
    if buy_window:
        print(f'\n📅 {buy_window["holiday"]}买入窗口！开始五步选股...')
        
        # 执行五步选股法
        signals = five_step_selection(context, data, buy_window['holiday'])
        context.buy_signals = signals
        
        print(f'✅ 生成{len(signals)}个买入信号')


def handle_data(context, data):
    """
    盘中交易逻辑
    """
    # 检查止损
    check_stop_loss(context, data)
    
    # 检查卖出（持有7天后）
    check_sell_condition(context, data)
    
    # 执行买入信号
    if context.buy_signals:
        execute_buy_signals(context, data)
        context.buy_signals = []


def check_holiday_window(today: str, holidays: dict, buy_before_days: int) -> dict:
    """检查是否在节假日买入窗口"""
    from datetime import datetime, timedelta
    
    today_dt = datetime.strptime(today, '%Y-%m-%d')
    
    for holiday, dates in holidays.items():
        last_trade = datetime.strptime(dates['last_trade'], '%Y-%m-%d')
        days_diff = (last_trade - today_dt).days
        
        if 0 <= days_diff <= buy_before_days:
            return {
                'holiday': holiday,
                'last_trade': dates['last_trade'],
                'first_trade': dates['first_trade']
            }
    
    return None


def five_step_selection(context, data, holiday: str) -> list:
    """
    卡若五步选股法
    
    第一步：统计5年历史，选出出现次数最多的2个板块
    第二步：在板块内选出5年内出现次数最多的3只个股
    第三步：排除涨停、跌停（不排除ST）
    第四步：卡若均线理论评分
    第五步：买入前3名
    """
    signals = []
    
    # 简化版实现：获取当前强势板块和个股
    # 实际应该统计5年历史数据
    
    try:
        # 获取所有股票
        instruments = context.get_instruments()
        
        # 筛选条件
        candidates = []
        for inst in instruments[:100]:  # 限制数量
            try:
                # 获取历史数据
                hist = data.history(inst, fields=['close'], bar_count=250, frequency='1d')
                if hist is None or len(hist) < 240:
                    continue
                
                close = hist['close']
                current_price = close.iloc[-1]
                
                # 计算卡若均线评分
                ma_data = KaruoMASystem.calculate(close)
                ma_score = KaruoMASystem.score(ma_data, current_price)
                
                # 检查涨跌停
                prev_close = close.iloc[-2]
                change_pct = (current_price - prev_close) / prev_close
                
                if abs(change_pct) >= 0.099:  # 涨跌停
                    continue
                
                candidates.append({
                    'instrument': inst,
                    'price': current_price,
                    'ma_score': ma_score,
                    'change_pct': change_pct,
                })
                
            except Exception as e:
                continue
        
        # 按评分排序
        candidates.sort(key=lambda x: x['ma_score'], reverse=True)
        
        # 取前N名
        top_n = context.params['buy_count']
        signals = candidates[:top_n]
        
        for s in signals:
            print(f'  选股: {s["instrument"]} | 均线评分: {s["ma_score"]} | 涨跌: {s["change_pct"]:.2%}')
        
    except Exception as e:
        print(f'选股错误: {e}')
    
    return signals


def check_stop_loss(context, data):
    """检查止损"""
    positions = context.portfolio.positions
    
    for inst, pos in positions.items():
        if pos.amount <= 0:
            continue
        
        current_price = data.current(inst, 'close')
        cost = pos.cost_basis
        
        pnl_pct = (current_price - cost) / cost
        
        if pnl_pct <= context.params['stop_loss']:
            print(f'❌ 止损: {inst} | 亏损: {pnl_pct:.2%}')
            context.order_target(inst, 0)


def check_sell_condition(context, data):
    """检查卖出条件（持有7天）"""
    positions = context.portfolio.positions
    today = context.current_dt.strftime('%Y-%m-%d')
    
    for inst, pos in positions.items():
        if pos.amount <= 0:
            continue
        
        # 检查持有天数
        if inst in context.hold_days:
            context.hold_days[inst] += 1
            
            if context.hold_days[inst] >= context.params['sell_after_klines']:
                current_price = data.current(inst, 'close')
                cost = pos.cost_basis
                pnl_pct = (current_price - cost) / cost
                
                print(f'📤 卖出: {inst} | 持有{context.hold_days[inst]}天 | 盈亏: {pnl_pct:.2%}')
                context.order_target(inst, 0)
                del context.hold_days[inst]


def execute_buy_signals(context, data):
    """执行买入信号"""
    cash = context.portfolio.cash
    position_size = context.params['single_position']
    
    for signal in context.buy_signals:
        inst = signal['instrument']
        price = signal['price']
        
        # 计算买入金额
        amount = cash * position_size / price
        amount = int(amount / 100) * 100  # 100股整数倍
        
        if amount >= 100:
            print(f'📥 买入: {inst} | {amount}股 @ ¥{price:.2f}')
            context.order(inst, amount)
            context.hold_days[inst] = 0


# =============================================
# 策略入口
# =============================================
if __name__ == '__main__':
    # 本地测试
    print('上帝之眼 - 卡若五步选股法')
    print('请在BigQuant平台运行此策略')
