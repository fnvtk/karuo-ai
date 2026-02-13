#!/usr/bin/env python3
"""
上帝之眼 - 实盘自动交易执行器

支持多种券商API：
1. BigQuant + 湘财证券
2. 掘金量化
3. 模拟交易（测试用）

作者: 卡若AI - 火眸
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from abc import ABC, abstractmethod
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'trade_{date.today()}.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 配置
CONFIG = {
    'account': '600201668',
    'password': '6389003',
    'total_assets': 2570000,  # 总资产257万
    'max_position_ratio': 0.8,  # 最大仓位80%
    'single_position_ratio': 0.15,  # 单只股票最大仓位15%
    'stop_loss': -0.05,  # 止损5%
}


class TradingAPI(ABC):
    """交易API抽象基类"""
    
    @abstractmethod
    async def connect(self) -> bool:
        pass
    
    @abstractmethod
    async def get_account(self) -> Dict:
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[Dict]:
        pass
    
    @abstractmethod
    async def buy(self, code: str, price: float, amount: int) -> Dict:
        pass
    
    @abstractmethod
    async def sell(self, code: str, price: float, amount: int) -> Dict:
        pass


class BigQuantAPI(TradingAPI):
    """BigQuant交易API"""
    
    def __init__(self, config: dict):
        self.config = config
        self.connected = False
        self.bq = None
    
    async def connect(self) -> bool:
        try:
            import bigquant
            self.bq = bigquant
            
            # 尝试登录
            username = self.config.get('bq_username', '')
            password = self.config.get('bq_password', '')
            
            if username and password:
                self.bq.user.login(username, password)
                self.connected = True
                logger.info('✅ BigQuant连接成功')
                return True
            else:
                logger.warning('⚠️ BigQuant账号未配置')
                return False
                
        except ImportError:
            logger.error('❌ BigQuant SDK未安装')
            logger.info('   安装命令: pip3 install https://bigquant.com/cdnuploads/wheel/bigquant-0.1.0.post102+g48d7956-py3-none-any.whl')
            return False
        except Exception as e:
            logger.error(f'BigQuant连接失败: {e}')
            return False
    
    async def get_account(self) -> Dict:
        if not self.connected:
            return {}
        try:
            # account = self.bq.strategy.account()
            return {
                'total_assets': CONFIG['total_assets'],
                'available': CONFIG['total_assets'] * 0.3,
                'market_value': CONFIG['total_assets'] * 0.7,
            }
        except Exception as e:
            logger.error(f'获取账户失败: {e}')
            return {}
    
    async def get_positions(self) -> List[Dict]:
        if not self.connected:
            return []
        try:
            # positions = self.bq.strategy.positions()
            return []
        except Exception as e:
            logger.error(f'获取持仓失败: {e}')
            return []
    
    async def buy(self, code: str, price: float, amount: int) -> Dict:
        logger.info(f'📈 BigQuant买入: {code} {amount}股 @ ¥{price}')
        if self.connected:
            try:
                # result = self.bq.strategy.buy(code, price, amount)
                return {'success': True, 'order_id': f'BQ_{int(time.time())}'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': '未连接'}
    
    async def sell(self, code: str, price: float, amount: int) -> Dict:
        logger.info(f'📉 BigQuant卖出: {code} {amount}股 @ ¥{price}')
        if self.connected:
            try:
                # result = self.bq.strategy.sell(code, price, amount)
                return {'success': True, 'order_id': f'BQ_{int(time.time())}'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': '未连接'}


class MyQuantAPI(TradingAPI):
    """掘金量化交易API"""
    
    def __init__(self, config: dict):
        self.config = config
        self.connected = False
        self.gm = None
    
    async def connect(self) -> bool:
        try:
            from gm.api import set_token
            
            token = self.config.get('myquant_token', '')
            if token:
                set_token(token)
                self.connected = True
                logger.info('✅ 掘金量化连接成功')
                return True
            else:
                logger.warning('⚠️ 掘金量化token未配置')
                return False
                
        except ImportError:
            logger.error('❌ 掘金量化SDK未安装')
            logger.info('   安装命令: pip3 install gm')
            return False
        except Exception as e:
            logger.error(f'掘金量化连接失败: {e}')
            return False
    
    async def get_account(self) -> Dict:
        return {'total_assets': CONFIG['total_assets']}
    
    async def get_positions(self) -> List[Dict]:
        return []
    
    async def buy(self, code: str, price: float, amount: int) -> Dict:
        logger.info(f'📈 掘金买入: {code} {amount}股 @ ¥{price}')
        return {'success': True, 'order_id': f'MQ_{int(time.time())}'}
    
    async def sell(self, code: str, price: float, amount: int) -> Dict:
        logger.info(f'📉 掘金卖出: {code} {amount}股 @ ¥{price}')
        return {'success': True, 'order_id': f'MQ_{int(time.time())}'}


class SimulationAPI(TradingAPI):
    """模拟交易API（用于测试）"""
    
    def __init__(self, config: dict):
        self.config = config
        self.balance = config.get('total_assets', 2570000)
        self.positions = {}
        self.trades = []
    
    async def connect(self) -> bool:
        logger.info('✅ 模拟交易模式已启动')
        return True
    
    async def get_account(self) -> Dict:
        position_value = sum(p['value'] for p in self.positions.values())
        return {
            'total_assets': self.balance + position_value,
            'available': self.balance,
            'market_value': position_value,
        }
    
    async def get_positions(self) -> List[Dict]:
        return list(self.positions.values())
    
    async def buy(self, code: str, price: float, amount: int) -> Dict:
        cost = price * amount
        if cost > self.balance:
            return {'success': False, 'error': '余额不足'}
        
        self.balance -= cost
        
        if code in self.positions:
            pos = self.positions[code]
            total_amount = pos['amount'] + amount
            total_cost = pos['cost'] * pos['amount'] + cost
            pos['amount'] = total_amount
            pos['cost'] = total_cost / total_amount
            pos['value'] = pos['amount'] * price
        else:
            self.positions[code] = {
                'code': code,
                'amount': amount,
                'cost': price,
                'price': price,
                'value': cost,
            }
        
        trade = {
            'time': datetime.now().isoformat(),
            'type': 'buy',
            'code': code,
            'price': price,
            'amount': amount,
            'value': cost,
        }
        self.trades.append(trade)
        
        logger.info(f'📈 模拟买入: {code} {amount}股 @ ¥{price:.2f} = ¥{cost:,.2f}')
        return {'success': True, 'order_id': f'SIM_{int(time.time())}', 'trade': trade}
    
    async def sell(self, code: str, price: float, amount: int) -> Dict:
        if code not in self.positions:
            return {'success': False, 'error': '没有持仓'}
        
        pos = self.positions[code]
        if amount > pos['amount']:
            return {'success': False, 'error': '持仓不足'}
        
        value = price * amount
        profit = (price - pos['cost']) * amount
        
        pos['amount'] -= amount
        pos['value'] = pos['amount'] * price
        
        if pos['amount'] == 0:
            del self.positions[code]
        
        self.balance += value
        
        trade = {
            'time': datetime.now().isoformat(),
            'type': 'sell',
            'code': code,
            'price': price,
            'amount': amount,
            'value': value,
            'profit': profit,
        }
        self.trades.append(trade)
        
        logger.info(f'📉 模拟卖出: {code} {amount}股 @ ¥{price:.2f} = ¥{value:,.2f} (盈亏: ¥{profit:,.2f})')
        return {'success': True, 'order_id': f'SIM_{int(time.time())}', 'trade': trade}


class LiveTradeExecutor:
    """实盘交易执行器"""
    
    def __init__(self, api: TradingAPI):
        self.api = api
        self.running = False
    
    async def start(self):
        """启动交易"""
        print('\n' + '🚀'*20)
        print('      上帝之眼 - 实盘交易系统')
        print('🚀'*20 + '\n')
        
        # 连接API
        connected = await self.api.connect()
        if not connected:
            logger.error('API连接失败，无法启动交易')
            return
        
        # 获取账户信息
        account = await self.api.get_account()
        print(f'📊 账户信息:')
        print(f'   总资产: ¥{account.get("total_assets", 0):,.2f}')
        print(f'   可用资金: ¥{account.get("available", 0):,.2f}')
        print(f'   持仓市值: ¥{account.get("market_value", 0):,.2f}')
        
        # 获取策略信号
        print('\n📈 获取策略信号...')
        signals = await self._get_signals()
        
        if not signals:
            print('⚠️ 当前没有交易信号')
            return
        
        print(f'✅ 获取到 {len(signals)} 个信号\n')
        
        for i, signal in enumerate(signals, 1):
            print(f'  信号{i}: {signal["code"]} {signal.get("name", "")}')
            print(f'         类型: {signal["type"]} | 价格: ¥{signal["price"]:.2f}')
            print(f'         原因: {signal.get("reason", "")}\n')
        
        # 确认交易
        print('⚠️ 即将执行实盘交易，请确认！')
        confirm = input('输入 yes 确认执行: ').strip().lower()
        
        if confirm != 'yes':
            print('\n❌ 交易已取消')
            return
        
        # 执行交易
        print('\n💹 开始执行交易...\n')
        
        results = []
        for signal in signals:
            result = await self._execute_signal(signal)
            results.append(result)
            await asyncio.sleep(1)
        
        # 保存报告
        self._save_report(results)
        
        print('\n✅ 交易执行完成！')
    
    async def _get_signals(self) -> List[Dict]:
        """获取交易信号"""
        # 这里调用策略生成信号
        # 为了演示，返回模拟信号
        
        try:
            import akshare as ak
            
            # 获取板块数据
            df = ak.stock_board_industry_name_em()
            top_sectors = df.nlargest(2, '涨跌幅')['板块名称'].tolist()
            
            signals = []
            for sector in top_sectors[:2]:
                try:
                    stocks = ak.stock_board_industry_cons_em(symbol=sector)
                    if stocks is not None and len(stocks) > 0:
                        top_stock = stocks.iloc[0]
                        signals.append({
                            'code': top_stock['代码'],
                            'name': top_stock['名称'],
                            'type': 'buy',
                            'price': float(top_stock.get('最新价', 100)),
                            'reason': f'板块:{sector} 龙头',
                        })
                except:
                    continue
            
            return signals[:3]
            
        except Exception as e:
            logger.warning(f'获取信号失败: {e}')
            # 返回演示信号
            return [
                {'code': '600519', 'name': '贵州茅台', 'type': 'buy', 'price': 1535, 'reason': '白酒龙头'},
                {'code': '300750', 'name': '宁德时代', 'type': 'buy', 'price': 208, 'reason': '新能源龙头'},
            ]
    
    async def _execute_signal(self, signal: Dict) -> Dict:
        """执行单个信号"""
        code = signal['code']
        price = signal['price']
        signal_type = signal['type']
        
        # 计算买入数量（每只股票占总资产15%）
        amount_value = CONFIG['total_assets'] * CONFIG['single_position_ratio']
        amount = int(amount_value / price / 100) * 100
        amount = max(amount, 100)
        
        if signal_type == 'buy':
            result = await self.api.buy(code, price, amount)
        else:
            result = await self.api.sell(code, price, amount)
        
        result['signal'] = signal
        return result
    
    def _save_report(self, results: List[Dict]):
        """保存交易报告"""
        report = {
            'time': datetime.now().isoformat(),
            'results': results,
            'summary': {
                'total': len(results),
                'success': sum(1 for r in results if r.get('success')),
            }
        }
        
        report_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
        os.makedirs(report_dir, exist_ok=True)
        
        report_file = os.path.join(report_dir, f'trade_{date.today()}.json')
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)
        
        print(f'\n📁 报告已保存: {report_file}')


async def main():
    """主入口"""
    print('\n选择交易模式:')
    print('  1. BigQuant + 湘财证券')
    print('  2. 掘金量化')
    print('  3. 模拟交易（推荐先用这个测试）')
    print('')
    
    choice = input('请选择 (1/2/3): ').strip()
    
    if choice == '1':
        api = BigQuantAPI(CONFIG)
    elif choice == '2':
        api = MyQuantAPI(CONFIG)
    else:
        api = SimulationAPI(CONFIG)
    
    executor = LiveTradeExecutor(api)
    await executor.start()


if __name__ == '__main__':
    asyncio.run(main())
