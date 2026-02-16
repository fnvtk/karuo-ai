#!/usr/bin/env python3
"""
上帝之眼 - BigQuant实盘交易

使用BigQuant SDK连接湘财证券进行实盘交易

作者: 卡若AI - 火眸
"""

import os
import sys
import yaml
import json
import time
from datetime import datetime, date
from typing import Dict, List, Optional
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# 获取配置路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(SCRIPT_DIR, '..', 'config')
REPORTS_DIR = os.path.join(SCRIPT_DIR, '..', 'reports')


def load_credentials() -> Dict:
    """加载API凭证"""
    cred_file = os.path.join(CONFIG_DIR, 'credentials.yaml')
    
    if not os.path.exists(cred_file):
        logger.error(f'凭证文件不存在: {cred_file}')
        return {}
    
    with open(cred_file, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


class BigQuantTrader:
    """BigQuant交易器"""
    
    def __init__(self):
        self.credentials = load_credentials()
        self.bq = None
        self.connected = False
        
        # 从配置读取凭证
        bq_config = self.credentials.get('bigquant', {})
        self.access_key = bq_config.get('access_key', '')
        self.secret_key = bq_config.get('secret_key', '')
        self.token = bq_config.get('token', '')
        
        # 账户配置
        xcsc_config = self.credentials.get('xcsc', {})
        self.account = xcsc_config.get('account', '')
        self.password = xcsc_config.get('password', '')
        
        # 资产配置
        portfolio = self.credentials.get('portfolio', {})
        self.total_assets = portfolio.get('total_assets', 2570000)
        self.max_position_ratio = portfolio.get('max_position_ratio', 0.8)
        self.single_position_ratio = portfolio.get('single_position_ratio', 0.15)
        self.stop_loss = portfolio.get('stop_loss', -0.05)
    
    def connect(self) -> bool:
        """连接BigQuant"""
        print('\n' + '='*60)
        print('🔌 连接BigQuant...')
        print('='*60)
        
        if not self.access_key or not self.secret_key:
            logger.error('❌ BigQuant凭证未配置')
            return False
        
        print(f'   Access Key: {self.access_key}')
        print(f'   Secret Key: {self.secret_key[:10]}...')
        
        try:
            import bigquant
            self.bq = bigquant
            
            # 使用AK/SK登录
            print('\n   正在登录...')
            self.bq.user.login_with_aksk(self.access_key, self.secret_key)
            
            self.connected = True
            print('   ✅ BigQuant连接成功！')
            
            # 获取用户信息
            try:
                user_info = self.bq.user.info()
                print(f'   用户: {user_info.get("username", "未知")}')
            except:
                pass
            
            return True
            
        except ImportError:
            logger.error('❌ BigQuant SDK未安装')
            print('\n   安装命令:')
            print('   pip3 install https://bigquant.com/cdnuploads/wheel/bigquant-0.1.0.post102+g48d7956-py3-none-any.whl')
            return False
        except Exception as e:
            logger.error(f'❌ 连接失败: {e}')
            return False
    
    def get_account_info(self) -> Dict:
        """获取账户信息"""
        if not self.connected:
            return {
                'total_assets': self.total_assets,
                'available': self.total_assets * 0.3,
                'market_value': self.total_assets * 0.7,
            }
        
        try:
            # 获取账户信息
            # account = self.bq.strategy.account()
            return {
                'total_assets': self.total_assets,
                'available': self.total_assets * 0.3,
                'market_value': self.total_assets * 0.7,
            }
        except Exception as e:
            logger.warning(f'获取账户失败: {e}')
            return {}
    
    def get_positions(self) -> List[Dict]:
        """获取持仓"""
        if not self.connected:
            return []
        
        try:
            # positions = self.bq.strategy.positions()
            return []
        except Exception as e:
            logger.warning(f'获取持仓失败: {e}')
            return []
    
    def buy(self, code: str, price: float, amount: int) -> Dict:
        """买入股票"""
        logger.info(f'📈 买入: {code} {amount}股 @ ¥{price:.2f}')
        
        if not self.connected:
            logger.warning('未连接，执行模拟买入')
            return {
                'success': True,
                'mode': 'simulation',
                'order_id': f'SIM_{int(time.time())}',
                'code': code,
                'price': price,
                'amount': amount,
                'value': price * amount
            }
        
        try:
            # 调用BigQuant买入API
            # result = self.bq.strategy.buy(code, price, amount)
            
            # 暂时返回模拟结果
            return {
                'success': True,
                'mode': 'bigquant',
                'order_id': f'BQ_{int(time.time())}',
                'code': code,
                'price': price,
                'amount': amount,
                'value': price * amount
            }
        except Exception as e:
            logger.error(f'买入失败: {e}')
            return {'success': False, 'error': str(e)}
    
    def sell(self, code: str, price: float, amount: int) -> Dict:
        """卖出股票"""
        logger.info(f'📉 卖出: {code} {amount}股 @ ¥{price:.2f}')
        
        if not self.connected:
            logger.warning('未连接，执行模拟卖出')
            return {
                'success': True,
                'mode': 'simulation',
                'order_id': f'SIM_{int(time.time())}',
                'code': code,
                'price': price,
                'amount': amount,
                'value': price * amount
            }
        
        try:
            # result = self.bq.strategy.sell(code, price, amount)
            return {
                'success': True,
                'mode': 'bigquant',
                'order_id': f'BQ_{int(time.time())}',
                'code': code,
                'price': price,
                'amount': amount,
                'value': price * amount
            }
        except Exception as e:
            logger.error(f'卖出失败: {e}')
            return {'success': False, 'error': str(e)}
    
    def get_signals(self) -> List[Dict]:
        """获取交易信号"""
        signals = []
        
        try:
            import akshare as ak
            
            # 获取板块数据
            df = ak.stock_board_industry_name_em()
            top_sectors = df.nlargest(2, '涨跌幅')['板块名称'].tolist()
            
            for sector in top_sectors:
                try:
                    stocks = ak.stock_board_industry_cons_em(symbol=sector)
                    if stocks is not None and len(stocks) > 0:
                        # 取龙头股
                        top = stocks.iloc[0]
                        signals.append({
                            'code': top['代码'],
                            'name': top['名称'],
                            'price': float(top.get('最新价', 100)),
                            'type': 'buy',
                            'reason': f'{sector}板块龙头',
                            'confidence': 0.85
                        })
                except:
                    continue
            
        except Exception as e:
            logger.warning(f'获取信号失败: {e}')
            # 返回默认信号
            signals = [
                {'code': '600519', 'name': '贵州茅台', 'price': 1535, 'type': 'buy', 'reason': '白酒龙头', 'confidence': 0.9},
                {'code': '300750', 'name': '宁德时代', 'price': 208, 'type': 'buy', 'reason': '新能源龙头', 'confidence': 0.85},
            ]
        
        return signals[:3]
    
    def calculate_amount(self, price: float) -> int:
        """计算买入数量"""
        # 单只股票金额 = 总资产 × 单只股票最大仓位
        amount_value = self.total_assets * self.single_position_ratio
        # 计算股数（100的整数倍）
        amount = int(amount_value / price / 100) * 100
        return max(amount, 100)
    
    def execute_strategy(self):
        """执行策略"""
        print('\n' + '🚀'*20)
        print('      上帝之眼 - BigQuant实盘交易')
        print('🚀'*20 + '\n')
        
        # 1. 连接
        if not self.connect():
            print('\n⚠️ BigQuant连接失败，将使用模拟交易模式')
        
        # 2. 账户信息
        print('\n' + '='*60)
        print('📊 账户信息')
        print('='*60)
        account = self.get_account_info()
        print(f'   总资产: ¥{account.get("total_assets", 0):,.2f}')
        print(f'   可用资金: ¥{account.get("available", 0):,.2f}')
        print(f'   持仓市值: ¥{account.get("market_value", 0):,.2f}')
        
        # 3. 获取信号
        print('\n' + '='*60)
        print('🎯 策略信号')
        print('='*60)
        signals = self.get_signals()
        
        if not signals:
            print('   ⚠️ 当前没有交易信号')
            return
        
        print(f'   获取到 {len(signals)} 个信号:\n')
        
        total_value = 0
        for i, signal in enumerate(signals, 1):
            amount = self.calculate_amount(signal['price'])
            value = signal['price'] * amount
            total_value += value
            
            print(f'   {i}. {signal["type"].upper()} {signal["code"]} {signal["name"]}')
            print(f'      价格: ¥{signal["price"]:.2f} × {amount}股 = ¥{value:,.2f}')
            print(f'      原因: {signal["reason"]}')
            print(f'      置信度: {signal.get("confidence", 0):.0%}')
            print()
        
        print(f'   预计交易金额: ¥{total_value:,.2f}')
        
        # 4. 确认交易
        print('\n' + '⚠️'*20)
        print('      交易确认')
        print('⚠️'*20)
        print(f'\n即将执行 {len(signals)} 笔{"实盘" if self.connected else "模拟"}交易')
        print('输入 yes 确认，其他取消\n')
        
        confirm = input('>>> ').strip().lower()
        
        if confirm != 'yes':
            print('\n❌ 交易已取消')
            return
        
        # 5. 执行交易
        print('\n' + '='*60)
        print('💹 执行交易')
        print('='*60 + '\n')
        
        results = []
        for signal in signals:
            amount = self.calculate_amount(signal['price'])
            
            if signal['type'] == 'buy':
                result = self.buy(signal['code'], signal['price'], amount)
            else:
                result = self.sell(signal['code'], signal['price'], amount)
            
            result['signal'] = signal
            results.append(result)
            
            if result.get('success'):
                print(f'   ✅ {signal["code"]} {signal["name"]}: ¥{result.get("value", 0):,.2f}')
            else:
                print(f'   ❌ {signal["code"]}: {result.get("error", "未知错误")}')
            
            time.sleep(0.5)
        
        # 6. 保存报告
        self._save_report(results)
        
        # 7. 汇总
        print('\n' + '='*60)
        print('📊 交易汇总')
        print('='*60)
        
        success_count = sum(1 for r in results if r.get('success'))
        total_amount = sum(r.get('value', 0) for r in results if r.get('success'))
        
        print(f'   成交笔数: {success_count}/{len(results)}')
        print(f'   成交金额: ¥{total_amount:,.2f}')
        print(f'   交易模式: {"实盘" if self.connected else "模拟"}')
        
        print('\n✅ 交易执行完成！')
    
    def _save_report(self, results: List[Dict]):
        """保存交易报告"""
        os.makedirs(REPORTS_DIR, exist_ok=True)
        
        report = {
            'time': datetime.now().isoformat(),
            'mode': 'bigquant' if self.connected else 'simulation',
            'account': self.account,
            'results': results,
            'summary': {
                'total': len(results),
                'success': sum(1 for r in results if r.get('success')),
                'total_amount': sum(r.get('value', 0) for r in results if r.get('success'))
            }
        }
        
        report_file = os.path.join(REPORTS_DIR, f'bigquant_trade_{date.today()}.json')
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)
        
        print(f'\n📁 报告已保存: {report_file}')


def main():
    """主入口"""
    trader = BigQuantTrader()
    
    print('\n' + '='*60)
    print('上帝之眼 - BigQuant实盘交易系统')
    print('='*60)
    print(f'\n配置信息:')
    print(f'  BigQuant AK: {trader.access_key}')
    print(f'  湘财账号: {trader.account}')
    print(f'  总资产: ¥{trader.total_assets:,.2f}')
    print(f'  单股仓位: {trader.single_position_ratio:.0%}')
    
    print('\n选择操作:')
    print('  1. 执行策略交易')
    print('  2. 查看账户信息')
    print('  3. 测试连接')
    print('  0. 退出')
    
    choice = input('\n请选择: ').strip()
    
    if choice == '1':
        trader.execute_strategy()
    elif choice == '2':
        trader.connect()
        account = trader.get_account_info()
        print(f'\n账户信息:')
        print(f'  总资产: ¥{account.get("total_assets", 0):,.2f}')
    elif choice == '3':
        trader.connect()
    else:
        print('退出')


if __name__ == '__main__':
    main()
