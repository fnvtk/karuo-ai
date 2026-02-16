#!/usr/bin/env python3
"""
上帝之眼 - AI量化交易系统

主程序入口

使用方法:
    python main.py start                # 启动系统
    python main.py start --mode=paper   # 模拟交易
    python main.py start --mode=live    # 实盘交易
    python main.py stop                 # 停止系统
    python main.py status               # 查看状态
    python main.py position             # 查看持仓
    python main.py signals              # 查看信号
    python main.py experts              # 查看高手
    python main.py sectors              # 查看板块
    python main.py buy <code> <amount>  # 买入
    python main.py sell <code> <amount> # 卖出

作者: 卡若AI - 火眸
日期: 2026-01-29
"""

import os
import sys
import yaml
import argparse
import asyncio
from datetime import datetime
import logging

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/godeye.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 配置路径
CONFIG_DIR = os.path.join(os.path.dirname(__file__), '..', 'config')


class GodsEye:
    """
    上帝之眼 - 量化交易系统
    
    核心功能:
    - 多策略管理
    - 多数据源采集
    - 多券商交易
    - 风险控制
    """
    
    def __init__(self):
        self.account_config = self._load_config('account.yaml')
        self.strategy_config = self._load_config('strategy.yaml')
        self.risk_config = self._load_config('risk.yaml')
        
        self.broker = None
        self.running = False
        
        logger.info('👁️ 上帝之眼系统初始化完成')
    
    def _load_config(self, filename: str) -> dict:
        """加载配置文件"""
        filepath = os.path.join(CONFIG_DIR, filename)
        
        if not os.path.exists(filepath):
            logger.warning(f'配置文件不存在: {filepath}')
            return {}
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def connect_broker(self):
        """连接券商"""
        broker_config = self.account_config.get('broker', {})
        broker_type = broker_config.get('type', 'xcsc')
        mode = self.account_config.get('trading', {}).get('mode', 'paper')
        
        if mode == 'paper':
            logger.info('🧪 模拟交易模式')
            from brokers.mock import MockBroker
            self.broker = MockBroker(broker_config)
            return True
        
        try:
            if broker_type in ['xcsc', 'ths', 'yinhe', 'huatai']:
                import easytrader
                self.broker = easytrader.use('universal_client')
                client_path = broker_config.get('client_path')
                if client_path:
                    self.broker.connect(client_path)
            
            elif broker_type == 'qmt':
                from brokers.qmt import QMTBroker
                self.broker = QMTBroker(broker_config)
            
            logger.info(f'✅ 已连接券商: {broker_type}')
            return True
            
        except Exception as e:
            logger.error(f'❌ 连接券商失败: {e}')
            return False
    
    async def run(self):
        """运行交易系统"""
        from engine import StrategyEngine
        from collector import DataCollector
        from risk.monitor import RiskMonitor
        
        # 初始化组件
        engine = StrategyEngine(self.strategy_config)
        collector = DataCollector(self.account_config)
        risk_monitor = RiskMonitor(self.risk_config, self.broker)
        
        logger.info('🚀 上帝之眼启动运行...')
        
        while self.running:
            try:
                now = datetime.now()
                
                # 检查交易时间
                if not self._is_trading_time(now):
                    await asyncio.sleep(60)
                    continue
                
                # 风控检查
                if not await risk_monitor.check():
                    logger.warning('⚠️ 风控检查未通过')
                    await asyncio.sleep(60)
                    continue
                
                # 采集数据
                market_data = await collector.collect()
                
                # 生成信号
                signals = await engine.generate_signals(market_data)
                
                # 执行交易
                for signal in signals:
                    await self._execute_signal(signal)
                
                # 检查止损
                await risk_monitor.check_stop_loss()
                
                # 等待下一轮
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f'运行出错: {e}')
                await asyncio.sleep(60)
    
    def _is_trading_time(self, now: datetime) -> bool:
        """检查交易时间"""
        if now.weekday() >= 5:
            return False
        
        hour, minute = now.hour, now.minute
        
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
    
    async def _execute_signal(self, signal: dict):
        """执行交易信号"""
        action = signal.get('signal_type', '').lower()
        stock_code = signal.get('stock_code', '')
        
        if not action or not stock_code:
            return
        
        # 计算交易数量
        trading_config = self.account_config.get('trading', {})
        daily_amount = trading_config.get('daily_amount', 50000)
        max_positions = trading_config.get('max_positions', 5)
        amount_per_stock = daily_amount / max_positions
        
        price = signal.get('price', 0)
        if price > 0:
            shares = int(amount_per_stock / price / 100) * 100
        else:
            shares = 100
        
        if shares <= 0:
            return
        
        try:
            if action == 'buy':
                result = self.broker.buy(stock_code, price=price, amount=shares)
                logger.info(f'✅ 买入 {stock_code} {shares}股 @ ¥{price}')
            elif action == 'sell':
                result = self.broker.sell(stock_code, price=price, amount=shares)
                logger.info(f'✅ 卖出 {stock_code} {shares}股 @ ¥{price}')
        except Exception as e:
            logger.error(f'❌ 交易失败: {e}')
    
    def start(self, mode: str = None):
        """启动系统"""
        if mode:
            self.account_config['trading']['mode'] = mode
        
        logger.info('=' * 60)
        logger.info('👁️ 上帝之眼 - AI量化交易系统')
        logger.info(f'   模式: {self.account_config["trading"]["mode"]}')
        logger.info(f'   策略: {self.strategy_config.get("enabled", [])}')
        logger.info('=' * 60)
        
        if not self.connect_broker():
            return
        
        self.running = True
        asyncio.run(self.run())
    
    def stop(self):
        """停止系统"""
        self.running = False
        logger.info('⏹️ 上帝之眼已停止')
    
    def get_position(self):
        """获取持仓"""
        if not self.broker:
            self.connect_broker()
        
        try:
            return self.broker.position
        except Exception as e:
            logger.error(f'获取持仓失败: {e}')
            return []
    
    def get_balance(self):
        """获取资金"""
        if not self.broker:
            self.connect_broker()
        
        try:
            return self.broker.balance
        except Exception as e:
            logger.error(f'获取资金失败: {e}')
            return {}


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='上帝之眼 - AI量化交易系统')
    parser.add_argument('command', 
                        choices=['start', 'stop', 'status', 'position', 'signals', 
                                'experts', 'sectors', 'buy', 'sell'],
                        help='命令')
    parser.add_argument('--mode', choices=['paper', 'live'], default='paper',
                        help='交易模式')
    parser.add_argument('stock_code', nargs='?', help='股票代码')
    parser.add_argument('amount', nargs='?', type=int, help='交易数量')
    
    args = parser.parse_args()
    
    # 确保日志目录存在
    os.makedirs('logs', exist_ok=True)
    
    godeye = GodsEye()
    
    if args.command == 'start':
        godeye.start(mode=args.mode)
    
    elif args.command == 'stop':
        godeye.stop()
    
    elif args.command == 'status':
        print('\n👁️ 上帝之眼状态')
        print(f'   运行中: {godeye.running}')
        balance = godeye.get_balance()
        print(f'   总资产: ¥{balance.get("总资产", 0):,.2f}')
    
    elif args.command == 'position':
        print('\n📊 当前持仓:')
        positions = godeye.get_position()
        if not positions:
            print('   暂无持仓')
        else:
            for pos in positions:
                print(f"   {pos.get('证券代码')} {pos.get('证券名称')}: "
                      f"{pos.get('持仓数量')}股 @ ¥{pos.get('成本价')}")
    
    elif args.command == 'signals':
        print('\n📡 今日信号:')
        print('   (启动系统后查看)')
    
    elif args.command == 'experts':
        print('\n🏆 高手排行:')
        print('   (启动系统后查看)')
    
    elif args.command == 'sectors':
        print('\n📈 板块分析:')
        print('   (启动系统后查看)')
    
    elif args.command == 'buy':
        if not args.stock_code or not args.amount:
            print('用法: python main.py buy <股票代码> <数量>')
            return
        godeye.connect_broker()
        try:
            result = godeye.broker.buy(args.stock_code, price=0, amount=args.amount)
            print(f'✅ 买入成功: {result}')
        except Exception as e:
            print(f'❌ 买入失败: {e}')
    
    elif args.command == 'sell':
        if not args.stock_code or not args.amount:
            print('用法: python main.py sell <股票代码> <数量>')
            return
        godeye.connect_broker()
        try:
            result = godeye.broker.sell(args.stock_code, price=0, amount=args.amount)
            print(f'✅ 卖出成功: {result}')
        except Exception as e:
            print(f'❌ 卖出失败: {e}')


if __name__ == '__main__':
    main()
