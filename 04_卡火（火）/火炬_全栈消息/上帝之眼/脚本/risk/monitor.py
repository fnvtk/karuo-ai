"""
风险监控模块

止损、仓位控制、异常监控
"""

from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RiskMonitor:
    """风险监控器"""
    
    def __init__(self, config: dict, broker):
        self.config = config
        self.broker = broker
        
        # 止损参数
        self.stop_loss_config = config.get('stop_loss', {})
        self.single_stock_stop = self.stop_loss_config.get('single_stock', -0.05)
        self.daily_stop = self.stop_loss_config.get('daily_loss', -0.05)
        self.max_drawdown = self.stop_loss_config.get('max_drawdown', -0.15)
        
        # 仓位参数
        self.position_config = config.get('position', {})
        self.max_positions = self.position_config.get('max_positions', 5)
        
        # 状态记录
        self.initial_value = None
        self.daily_start_value = None
        self.paused = False
    
    async def check(self) -> bool:
        """风控检查"""
        if self.paused:
            logger.warning('⚠️ 交易已暂停')
            return False
        
        # 初始化基准值
        if not self.broker:
            return True
        
        try:
            balance = self.broker.balance
            current_value = balance.get('总资产', 0)
            
            if self.initial_value is None:
                self.initial_value = current_value
            
            if self.daily_start_value is None:
                self.daily_start_value = current_value
            
            # 检查最大回撤
            drawdown = (current_value - self.initial_value) / self.initial_value
            if drawdown <= self.max_drawdown:
                logger.error(f'🛑 触发最大回撤止损: {drawdown:.2%}')
                self.paused = True
                return False
            
            # 检查单日止损
            daily_loss = (current_value - self.daily_start_value) / self.daily_start_value
            if daily_loss <= self.daily_stop:
                logger.error(f'🛑 触发单日止损: {daily_loss:.2%}')
                self.paused = True
                return False
            
            return True
            
        except Exception as e:
            logger.error(f'风控检查出错: {e}')
            return True
    
    async def check_stop_loss(self):
        """检查持仓止损"""
        if not self.broker:
            return
        
        try:
            positions = self.broker.position
            
            for pos in positions:
                stock_code = pos.get('证券代码', '')
                cost_price = pos.get('成本价', 0)
                current_price = pos.get('当前价', 0)
                amount = pos.get('可用余额', 0)
                
                if cost_price <= 0:
                    continue
                
                pnl_pct = (current_price - cost_price) / cost_price
                
                if pnl_pct <= self.single_stock_stop:
                    logger.warning(f'🛑 {stock_code} 触发止损: {pnl_pct:.2%}')
                    
                    try:
                        self.broker.sell(stock_code, price=0, amount=amount)
                        logger.info(f'✅ 已止损卖出 {stock_code}')
                    except Exception as e:
                        logger.error(f'❌ 止损卖出失败: {e}')
                        
        except Exception as e:
            logger.error(f'检查止损出错: {e}')
    
    def reset_daily(self):
        """重置每日基准"""
        if self.broker:
            balance = self.broker.balance
            self.daily_start_value = balance.get('总资产', 0)
        
        self.paused = False
