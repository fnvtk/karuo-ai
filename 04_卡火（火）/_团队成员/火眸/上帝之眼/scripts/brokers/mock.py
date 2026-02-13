"""
模拟券商插件

用于模拟交易测试
"""

from datetime import datetime


class MockBroker:
    """模拟券商"""
    
    def __init__(self, config: dict):
        self.config = config
        
        # 模拟账户
        self._balance = {
            '总资产': 100000,
            '可用资金': 100000,
            '股票市值': 0,
            '冻结资金': 0
        }
        
        # 模拟持仓
        self._position = []
        
        # 交易记录
        self._trades = []
    
    @property
    def balance(self):
        return self._balance
    
    @property
    def position(self):
        return self._position
    
    def buy(self, stock_code: str, price: float, amount: int):
        """买入"""
        if price <= 0:
            price = 100.0  # 模拟价格
        
        cost = price * amount
        
        if cost > self._balance['可用资金']:
            raise Exception('资金不足')
        
        # 更新资金
        self._balance['可用资金'] -= cost
        self._balance['股票市值'] += cost
        
        # 更新持仓
        existing = None
        for pos in self._position:
            if pos['证券代码'] == stock_code:
                existing = pos
                break
        
        if existing:
            # 加仓
            total_amount = existing['持仓数量'] + amount
            total_cost = existing['成本价'] * existing['持仓数量'] + cost
            existing['成本价'] = total_cost / total_amount
            existing['持仓数量'] = total_amount
            existing['可用余额'] = total_amount
        else:
            # 新建持仓
            self._position.append({
                '证券代码': stock_code,
                '证券名称': f'模拟_{stock_code}',
                '成本价': price,
                '当前价': price,
                '持仓数量': amount,
                '可用余额': amount,
                '盈亏比例': 0,
                '盈亏金额': 0
            })
        
        # 记录交易
        self._trades.append({
            'action': 'buy',
            'stock_code': stock_code,
            'price': price,
            'amount': amount,
            'timestamp': datetime.now().isoformat()
        })
        
        return {'order_id': f'mock_{datetime.now().timestamp()}', 'status': 'success'}
    
    def sell(self, stock_code: str, price: float, amount: int):
        """卖出"""
        if price <= 0:
            price = 100.0  # 模拟价格
        
        # 查找持仓
        position = None
        for pos in self._position:
            if pos['证券代码'] == stock_code:
                position = pos
                break
        
        if not position:
            raise Exception('无持仓')
        
        if position['可用余额'] < amount:
            raise Exception('持仓不足')
        
        # 计算收益
        revenue = price * amount
        cost = position['成本价'] * amount
        profit = revenue - cost
        
        # 更新资金
        self._balance['可用资金'] += revenue
        self._balance['股票市值'] -= cost
        
        # 更新持仓
        position['持仓数量'] -= amount
        position['可用余额'] -= amount
        
        if position['持仓数量'] == 0:
            self._position.remove(position)
        
        # 记录交易
        self._trades.append({
            'action': 'sell',
            'stock_code': stock_code,
            'price': price,
            'amount': amount,
            'profit': profit,
            'timestamp': datetime.now().isoformat()
        })
        
        return {'order_id': f'mock_{datetime.now().timestamp()}', 'status': 'success', 'profit': profit}
    
    def market_buy(self, stock_code: str, amount: int):
        """市价买入"""
        return self.buy(stock_code, 0, amount)
    
    def market_sell(self, stock_code: str, amount: int):
        """市价卖出"""
        return self.sell(stock_code, 0, amount)
    
    def cancel_entrust(self, entrust_no: str):
        """撤单"""
        return {'status': 'cancelled'}
    
    @property
    def today_trades(self):
        """今日成交"""
        today = datetime.now().date().isoformat()
        return [t for t in self._trades if t['timestamp'].startswith(today)]
    
    @property
    def today_entrusts(self):
        """今日委托"""
        return self.today_trades
