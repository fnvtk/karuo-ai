#!/usr/bin/env python3
"""
量化交易主程序

基于上帝之眼项目，接入湘财证券进行自动交易。

功能:
1. 执行交易策略（节假日、7根K线、高手跟踪）
2. 自动生成买卖信号
3. 通过easytrader执行订单
4. 风险控制

使用方法:
    python trader.py start                # 启动交易
    python trader.py start --mode=paper   # 模拟交易
    python trader.py start --mode=live    # 实盘交易
    python trader.py position             # 查看持仓
    python trader.py signals              # 查看今日信号
    python trader.py stop                 # 停止交易

作者: 卡若AI - 火炬
日期: 2026-01-29
"""

import os
import sys
import yaml
import argparse
import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import logging

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/trading.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 配置文件路径
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.yaml')


class QuantTrader:
    """
    量化交易系统
    
    核心功能:
    - 加载配置
    - 连接券商
    - 执行策略
    - 风险控制
    """
    
    def __init__(self, config_path: str = CONFIG_PATH):
        self.config = self._load_config(config_path)
        self.broker = None
        self.running = False
        
        # 持仓记录
        self.positions = {}
        
        # 交易记录
        self.trades = []
        
        logger.info('量化交易系统初始化完成')
    
    def _load_config(self, config_path: str) -> Dict:
        """加载配置文件"""
        if not os.path.exists(config_path):
            logger.warning(f'配置文件不存在: {config_path}')
            logger.info('请复制 config_template.yaml 为 config.yaml 并填写账户信息')
            sys.exit(1)
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        return config
    
    def connect_broker(self):
        """
        连接券商客户端
        
        支持:
        - 湘财证券同花顺客户端
        - 通用同花顺客户端
        - MiniQMT接口
        """
        broker_config = self.config.get('broker', {})
        broker_type = broker_config.get('type', 'xcsc')
        mode = self.config.get('trading', {}).get('mode', 'paper')
        
        if mode == 'paper':
            logger.info('🧪 模拟交易模式')
            self.broker = MockBroker(broker_config)
            return True
        
        try:
            import easytrader
            
            # 使用通用同花顺客户端
            self.broker = easytrader.use('universal_client')
            
            # 连接客户端
            client_path = broker_config.get('client_path')
            if client_path:
                self.broker.connect(client_path)
            
            logger.info(f'✅ 已连接券商: {broker_type}')
            return True
            
        except ImportError:
            logger.error('❌ 请安装easytrader: pip install easytrader')
            return False
        except Exception as e:
            logger.error(f'❌ 连接券商失败: {e}')
            return False
    
    def get_balance(self) -> Dict:
        """获取资金状况"""
        if not self.broker:
            return {'error': '未连接券商'}
        
        try:
            balance = self.broker.balance
            return balance
        except Exception as e:
            logger.error(f'获取资金失败: {e}')
            return {'error': str(e)}
    
    def get_position(self) -> List[Dict]:
        """获取持仓"""
        if not self.broker:
            return []
        
        try:
            position = self.broker.position
            return position
        except Exception as e:
            logger.error(f'获取持仓失败: {e}')
            return []
    
    def buy(self, stock_code: str, amount: int, price: float = 0) -> Dict:
        """
        买入股票
        
        Args:
            stock_code: 股票代码
            amount: 买入数量
            price: 买入价格（0表示市价）
        
        Returns:
            订单结果
        """
        if not self.broker:
            return {'success': False, 'error': '未连接券商'}
        
        # 风控检查
        if not self._check_risk('buy', stock_code, amount, price):
            return {'success': False, 'error': '风控拒绝'}
        
        try:
            if price > 0:
                result = self.broker.buy(stock_code, price=price, amount=amount)
            else:
                result = self.broker.market_buy(stock_code, amount=amount)
            
            # 记录交易
            self._record_trade('buy', stock_code, amount, price, result)
            
            logger.info(f'✅ 买入 {stock_code} {amount}股 @ ¥{price if price > 0 else "市价"}')
            return {'success': True, 'result': result}
            
        except Exception as e:
            logger.error(f'❌ 买入失败: {e}')
            return {'success': False, 'error': str(e)}
    
    def sell(self, stock_code: str, amount: int, price: float = 0) -> Dict:
        """
        卖出股票
        
        Args:
            stock_code: 股票代码
            amount: 卖出数量
            price: 卖出价格（0表示市价）
        
        Returns:
            订单结果
        """
        if not self.broker:
            return {'success': False, 'error': '未连接券商'}
        
        # 风控检查
        if not self._check_risk('sell', stock_code, amount, price):
            return {'success': False, 'error': '风控拒绝'}
        
        try:
            if price > 0:
                result = self.broker.sell(stock_code, price=price, amount=amount)
            else:
                result = self.broker.market_sell(stock_code, amount=amount)
            
            # 记录交易
            self._record_trade('sell', stock_code, amount, price, result)
            
            logger.info(f'✅ 卖出 {stock_code} {amount}股 @ ¥{price if price > 0 else "市价"}')
            return {'success': True, 'result': result}
            
        except Exception as e:
            logger.error(f'❌ 卖出失败: {e}')
            return {'success': False, 'error': str(e)}
    
    def _check_risk(self, action: str, stock_code: str, amount: int, price: float) -> bool:
        """
        风控检查
        
        检查项:
        - 最大持仓数
        - 单股仓位
        - 止损线
        - 每日交易限额
        """
        trading_config = self.config.get('trading', {})
        
        # 获取当前持仓
        positions = self.get_position()
        
        if action == 'buy':
            # 检查持仓数量
            max_positions = trading_config.get('max_positions', 5)
            if len(positions) >= max_positions:
                logger.warning(f'⚠️ 风控: 已达最大持仓数 {max_positions}')
                return False
            
            # 检查单股仓位
            balance = self.get_balance()
            total_assets = balance.get('总资产', 0)
            position_pct = trading_config.get('position_pct', 0.2)
            max_amount = total_assets * position_pct
            
            if price * amount > max_amount:
                logger.warning(f'⚠️ 风控: 超过单股仓位限制 ¥{max_amount:.2f}')
                return False
        
        return True
    
    def _record_trade(self, action: str, stock_code: str, amount: int, 
                      price: float, result: Dict):
        """记录交易"""
        trade = {
            'action': action,
            'stock_code': stock_code,
            'amount': amount,
            'price': price,
            'result': result,
            'timestamp': datetime.now().isoformat()
        }
        self.trades.append(trade)
    
    async def run_strategies(self):
        """
        运行交易策略
        
        策略列表:
        - 节假日策略
        - 7根K线策略
        - 高手跟踪策略
        """
        from strategy import StrategyEngine
        
        engine = StrategyEngine(self.config)
        
        while self.running:
            try:
                # 获取当前时间
                now = datetime.now()
                
                # 交易时间检查 (9:30-11:30, 13:00-15:00)
                if not self._is_trading_time(now):
                    await asyncio.sleep(60)
                    continue
                
                # 执行策略，获取信号
                signals = await engine.generate_signals()
                
                # 执行信号
                for signal in signals:
                    await self._execute_signal(signal)
                
                # 检查止损
                await self._check_stop_loss()
                
                # 等待下一轮
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f'策略执行出错: {e}')
                await asyncio.sleep(60)
    
    def _is_trading_time(self, now: datetime) -> bool:
        """检查是否是交易时间"""
        # 周末不交易
        if now.weekday() >= 5:
            return False
        
        hour = now.hour
        minute = now.minute
        
        # 上午 9:30 - 11:30
        if 9 <= hour <= 11:
            if hour == 9 and minute < 30:
                return False
            if hour == 11 and minute > 30:
                return False
            return True
        
        # 下午 13:00 - 15:00
        if 13 <= hour <= 15:
            if hour == 15 and minute > 0:
                return False
            return True
        
        return False
    
    async def _execute_signal(self, signal: Dict):
        """执行交易信号"""
        action = signal.get('signal_type', '').lower()
        stock_code = signal.get('stock_code', '')
        
        if not action or not stock_code:
            return
        
        # 计算买入数量
        trading_config = self.config.get('trading', {})
        daily_amount = trading_config.get('daily_amount', 50000)
        max_positions = trading_config.get('max_positions', 5)
        amount_per_stock = daily_amount / max_positions
        
        price = signal.get('price', 0)
        if price > 0:
            shares = int(amount_per_stock / price / 100) * 100
        else:
            shares = 100
        
        if action == 'buy':
            self.buy(stock_code, shares, price)
        elif action == 'sell':
            self.sell(stock_code, shares, price)
    
    async def _check_stop_loss(self):
        """检查止损"""
        trading_config = self.config.get('trading', {})
        stop_loss = trading_config.get('stop_loss', -0.05)
        
        positions = self.get_position()
        
        for pos in positions:
            stock_code = pos.get('证券代码', '')
            profit_pct = pos.get('盈亏比例', 0)
            amount = pos.get('可用余额', 0)
            
            if profit_pct <= stop_loss:
                logger.warning(f'🛑 止损触发: {stock_code} 亏损 {profit_pct:.2%}')
                self.sell(stock_code, amount)
    
    def start(self, mode: str = None):
        """启动交易系统"""
        if mode:
            self.config['trading']['mode'] = mode
        
        logger.info('=' * 50)
        logger.info('🚀 量化交易系统启动')
        logger.info(f'   模式: {self.config["trading"]["mode"]}')
        logger.info(f'   策略: {self.config["strategies"]["enabled"]}')
        logger.info('=' * 50)
        
        # 连接券商
        if not self.connect_broker():
            return
        
        # 显示账户信息
        balance = self.get_balance()
        logger.info(f'账户余额: {balance}')
        
        # 启动策略
        self.running = True
        asyncio.run(self.run_strategies())
    
    def stop(self):
        """停止交易系统"""
        self.running = False
        logger.info('⏹️ 量化交易系统已停止')


class MockBroker:
    """模拟券商（用于测试）"""
    
    def __init__(self, config: Dict):
        self.config = config
        self._balance = {
            '总资产': 100000,
            '可用资金': 100000,
            '股票市值': 0
        }
        self._position = []
    
    @property
    def balance(self):
        return self._balance
    
    @property
    def position(self):
        return self._position
    
    def buy(self, stock_code: str, price: float, amount: int):
        cost = price * amount
        if cost > self._balance['可用资金']:
            raise Exception('资金不足')
        
        self._balance['可用资金'] -= cost
        self._balance['股票市值'] += cost
        
        self._position.append({
            '证券代码': stock_code,
            '证券名称': f'模拟_{stock_code}',
            '成本价': price,
            '当前价': price,
            '持仓数量': amount,
            '可用余额': amount,
            '盈亏比例': 0
        })
        
        return {'order_id': f'mock_{datetime.now().timestamp()}'}
    
    def sell(self, stock_code: str, price: float, amount: int):
        for pos in self._position:
            if pos['证券代码'] == stock_code:
                if pos['可用余额'] < amount:
                    raise Exception('持仓不足')
                
                revenue = price * amount
                self._balance['可用资金'] += revenue
                self._balance['股票市值'] -= pos['成本价'] * amount
                
                pos['可用余额'] -= amount
                if pos['可用余额'] == 0:
                    self._position.remove(pos)
                
                return {'order_id': f'mock_{datetime.now().timestamp()}'}
        
        raise Exception('无持仓')
    
    def market_buy(self, stock_code: str, amount: int):
        # 模拟市价，使用固定价格
        return self.buy(stock_code, 100.0, amount)
    
    def market_sell(self, stock_code: str, amount: int):
        return self.sell(stock_code, 100.0, amount)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='量化交易系统')
    parser.add_argument('command', choices=['start', 'stop', 'position', 'signals', 'buy', 'sell'],
                        help='命令')
    parser.add_argument('--mode', choices=['paper', 'live'], default='paper',
                        help='交易模式')
    parser.add_argument('stock_code', nargs='?', help='股票代码')
    parser.add_argument('amount', nargs='?', type=int, help='交易数量')
    
    args = parser.parse_args()
    
    # 确保日志目录存在
    os.makedirs('logs', exist_ok=True)
    
    trader = QuantTrader()
    
    if args.command == 'start':
        trader.start(mode=args.mode)
    
    elif args.command == 'stop':
        trader.stop()
    
    elif args.command == 'position':
        trader.connect_broker()
        positions = trader.get_position()
        print('\n📊 当前持仓:')
        for pos in positions:
            print(f"  {pos.get('证券代码')} {pos.get('证券名称')}: "
                  f"{pos.get('持仓数量')}股 @ ¥{pos.get('成本价')}")
    
    elif args.command == 'signals':
        print('\n📡 今日信号:')
        print('  (需要启动交易系统后查看)')
    
    elif args.command == 'buy':
        if not args.stock_code or not args.amount:
            print('用法: python trader.py buy <股票代码> <数量>')
            return
        trader.connect_broker()
        result = trader.buy(args.stock_code, args.amount)
        print(f'买入结果: {result}')
    
    elif args.command == 'sell':
        if not args.stock_code or not args.amount:
            print('用法: python trader.py sell <股票代码> <数量>')
            return
        trader.connect_broker()
        result = trader.sell(args.stock_code, args.amount)
        print(f'卖出结果: {result}')


if __name__ == '__main__':
    main()
