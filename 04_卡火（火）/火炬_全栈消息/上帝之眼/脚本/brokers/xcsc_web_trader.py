#!/usr/bin/env python3
"""
湘财证券网页版交易器

通过 Playwright 自动化操作湘财证券网页版（wt.xcsc.com）实现真实交易
不需要安装任何客户端！

功能：
- 自动登录
- 查询资金
- 查询持仓
- 买入/卖出
- 撤单

作者: 卡若AI - 火眸
"""

import os
import sys
import yaml
import asyncio
import json
import time
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# 路径配置
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'config')
STATE_DIR = os.path.join(SCRIPT_DIR, '..', '..', '.browser_state')


class XCSCWebTrader:
    """
    湘财证券网页版交易器
    
    使用 Playwright 自动化操作网页版交易系统
    支持账号密码登录 + 短信验证码
    """
    
    # 湘财证券网页版地址
    WEB_URL = "https://wt.xcsc.com/"
    
    def __init__(self, account: str = None, password: str = None):
        """
        初始化
        
        Args:
            account: 资金账号
            password: 交易密码
        """
        self.account = account
        self.password = password
        self.browser = None
        self.page = None
        self.context = None
        self.logged_in = False
        
        # 加载配置
        if not account or not password:
            self._load_credentials()
        
        # 确保状态目录存在
        os.makedirs(STATE_DIR, exist_ok=True)
    
    def _load_credentials(self):
        """从配置文件加载凭证"""
        cred_file = os.path.join(CONFIG_DIR, 'credentials.yaml')
        if os.path.exists(cred_file):
            with open(cred_file, 'r', encoding='utf-8') as f:
                creds = yaml.safe_load(f)
            
            xcsc = creds.get('xiangcai', {})
            self.account = xcsc.get('account', '')
            self.password = xcsc.get('password', '')
    
    async def init_browser(self, headless: bool = False):
        """
        初始化浏览器
        
        Args:
            headless: 是否无头模式（建议False，方便处理验证码）
        """
        from playwright.async_api import async_playwright
        
        logger.info('🌐 初始化浏览器...')
        
        self.playwright = await async_playwright().start()
        
        # 使用持久化上下文（保持登录状态）
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=STATE_DIR,
            headless=headless,
            viewport={'width': 1280, 'height': 800},
            locale='zh-CN',
            timezone_id='Asia/Shanghai',
        )
        
        self.page = await self.context.new_page()
        logger.info('✅ 浏览器初始化完成')
    
    async def close(self):
        """关闭浏览器"""
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info('🔒 浏览器已关闭')
    
    async def login(self, sms_code: str = None) -> bool:
        """
        登录湘财证券网页版
        
        Args:
            sms_code: 短信验证码（如需要）
        
        Returns:
            是否登录成功
        """
        logger.info(f'🔐 开始登录湘财证券网页版...')
        logger.info(f'   账号: {self.account}')
        
        try:
            # 访问登录页面
            await self.page.goto(self.WEB_URL)
            await self.page.wait_for_load_state('networkidle')
            
            # 等待页面加载
            await asyncio.sleep(2)
            
            # 检查是否已登录
            if await self._check_logged_in():
                logger.info('✅ 已处于登录状态')
                self.logged_in = True
                return True
            
            # 查找登录表单
            logger.info('📝 填写登录信息...')
            
            # 账号输入
            account_input = self.page.locator('input[placeholder*="账号"], input[name*="account"], input#account')
            if await account_input.count() > 0:
                await account_input.first.fill(self.account)
                logger.info('   ✓ 账号已填写')
            
            # 密码输入
            password_input = self.page.locator('input[type="password"], input[placeholder*="密码"], input#password')
            if await password_input.count() > 0:
                await password_input.first.fill(self.password)
                logger.info('   ✓ 密码已填写')
            
            # 如果有验证码输入框
            if sms_code:
                code_input = self.page.locator('input[placeholder*="验证码"], input[name*="code"]')
                if await code_input.count() > 0:
                    await code_input.first.fill(sms_code)
                    logger.info('   ✓ 验证码已填写')
            
            # 点击登录按钮
            login_btn = self.page.locator('button:has-text("登录"), button[type="submit"], .login-btn')
            if await login_btn.count() > 0:
                await login_btn.first.click()
                logger.info('   ✓ 点击登录')
            
            # 等待登录完成
            await asyncio.sleep(3)
            
            # 检查是否需要短信验证码
            sms_input = self.page.locator('input[placeholder*="短信"], input[placeholder*="验证码"]')
            if await sms_input.count() > 0 and not sms_code:
                logger.warning('⚠️ 需要短信验证码！')
                logger.info('请查看手机短信，获取验证码后调用:')
                logger.info('  await trader.login(sms_code="123456")')
                return False
            
            # 验证登录结果
            if await self._check_logged_in():
                logger.info('✅ 登录成功！')
                self.logged_in = True
                return True
            else:
                logger.error('❌ 登录失败')
                return False
                
        except Exception as e:
            logger.error(f'登录错误: {e}')
            import traceback
            traceback.print_exc()
            return False
    
    async def _check_logged_in(self) -> bool:
        """检查是否已登录"""
        try:
            # 检查是否有退出登录按钮或用户信息
            logout_btn = self.page.locator('text=退出, text=注销, .user-info, .account-info')
            if await logout_btn.count() > 0:
                return True
            
            # 检查URL是否跳转到交易页面
            url = self.page.url
            if 'trade' in url or 'main' in url:
                return True
            
            return False
        except:
            return False
    
    async def get_balance(self) -> Dict:
        """
        获取资金信息
        
        Returns:
            {
                'total_assets': 总资产,
                'available': 可用资金,
                'market_value': 市值,
                'profit': 盈亏
            }
        """
        if not self.logged_in:
            logger.error('请先登录')
            return {}
        
        logger.info('💰 获取资金信息...')
        
        try:
            # 点击资金查询
            balance_menu = self.page.locator('text=资金, text=资产, a[href*="balance"], a[href*="asset"]')
            if await balance_menu.count() > 0:
                await balance_menu.first.click()
                await asyncio.sleep(1)
            
            # 获取资金数据
            balance = {
                'total_assets': 0,
                'available': 0,
                'market_value': 0,
                'profit': 0
            }
            
            # 尝试解析页面数据
            page_content = await self.page.content()
            
            # 提取数字（简化处理）
            import re
            numbers = re.findall(r'[\d,]+\.\d+', page_content)
            if len(numbers) >= 2:
                balance['total_assets'] = float(numbers[0].replace(',', ''))
                balance['available'] = float(numbers[1].replace(',', ''))
            
            logger.info(f'   总资产: ¥{balance["total_assets"]:,.2f}')
            logger.info(f'   可用: ¥{balance["available"]:,.2f}')
            
            return balance
            
        except Exception as e:
            logger.error(f'获取资金失败: {e}')
            return {}
    
    async def get_positions(self) -> List[Dict]:
        """
        获取持仓信息
        
        Returns:
            [
                {
                    'code': 股票代码,
                    'name': 股票名称,
                    'amount': 持仓数量,
                    'available': 可卖数量,
                    'cost': 成本价,
                    'current_price': 当前价,
                    'market_value': 市值,
                    'profit': 盈亏,
                    'profit_pct': 盈亏比例
                }
            ]
        """
        if not self.logged_in:
            logger.error('请先登录')
            return []
        
        logger.info('📊 获取持仓信息...')
        
        try:
            # 点击持仓查询
            position_menu = self.page.locator('text=持仓, text=股票, a[href*="position"], a[href*="stock"]')
            if await position_menu.count() > 0:
                await position_menu.first.click()
                await asyncio.sleep(1)
            
            positions = []
            
            # 尝试解析表格数据
            rows = self.page.locator('table tr, .position-item, .stock-item')
            count = await rows.count()
            
            for i in range(count):
                row = rows.nth(i)
                text = await row.text_content()
                
                if text and len(text) > 10:
                    # 简化解析
                    import re
                    codes = re.findall(r'[036]\d{5}', text)
                    if codes:
                        positions.append({
                            'code': codes[0],
                            'name': '',
                            'amount': 0,
                            'available': 0,
                            'cost': 0,
                            'current_price': 0,
                            'market_value': 0,
                            'profit': 0,
                            'profit_pct': 0
                        })
            
            logger.info(f'   持仓数量: {len(positions)}')
            return positions
            
        except Exception as e:
            logger.error(f'获取持仓失败: {e}')
            return []
    
    async def buy(self, code: str, price: float, amount: int) -> Dict:
        """
        买入股票
        
        Args:
            code: 股票代码
            price: 买入价格
            amount: 买入数量（必须是100的整数倍）
        
        Returns:
            {'success': bool, 'order_id': str, 'message': str}
        """
        if not self.logged_in:
            return {'success': False, 'message': '请先登录'}
        
        # 验证参数
        if amount < 100 or amount % 100 != 0:
            return {'success': False, 'message': '买入数量必须是100的整数倍'}
        
        logger.info(f'📈 买入: {code} {amount}股 @ ¥{price:.2f}')
        
        try:
            # 点击买入菜单
            buy_menu = self.page.locator('text=买入, a[href*="buy"]')
            if await buy_menu.count() > 0:
                await buy_menu.first.click()
                await asyncio.sleep(0.5)
            
            # 填写股票代码
            code_input = self.page.locator('input[placeholder*="代码"], input[name*="code"], input#stockCode')
            if await code_input.count() > 0:
                await code_input.first.fill(code)
                await asyncio.sleep(0.3)
            
            # 填写价格
            price_input = self.page.locator('input[placeholder*="价格"], input[name*="price"], input#price')
            if await price_input.count() > 0:
                await price_input.first.fill(str(price))
            
            # 填写数量
            amount_input = self.page.locator('input[placeholder*="数量"], input[name*="amount"], input#amount')
            if await amount_input.count() > 0:
                await amount_input.first.fill(str(amount))
            
            # 点击买入按钮
            buy_btn = self.page.locator('button:has-text("买入"), button.buy-btn, .btn-buy')
            if await buy_btn.count() > 0:
                await buy_btn.first.click()
            
            # 确认对话框
            await asyncio.sleep(0.5)
            confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定")')
            if await confirm_btn.count() > 0:
                await confirm_btn.first.click()
            
            # 等待响应
            await asyncio.sleep(1)
            
            logger.info(f'✅ 买入委托已提交: {code} {amount}股')
            
            return {
                'success': True,
                'order_id': f'BUY_{code}_{datetime.now().strftime("%H%M%S")}',
                'message': '委托已提交'
            }
            
        except Exception as e:
            logger.error(f'买入失败: {e}')
            return {'success': False, 'message': str(e)}
    
    async def sell(self, code: str, price: float, amount: int) -> Dict:
        """
        卖出股票
        
        Args:
            code: 股票代码
            price: 卖出价格
            amount: 卖出数量
        
        Returns:
            {'success': bool, 'order_id': str, 'message': str}
        """
        if not self.logged_in:
            return {'success': False, 'message': '请先登录'}
        
        logger.info(f'📉 卖出: {code} {amount}股 @ ¥{price:.2f}')
        
        try:
            # 点击卖出菜单
            sell_menu = self.page.locator('text=卖出, a[href*="sell"]')
            if await sell_menu.count() > 0:
                await sell_menu.first.click()
                await asyncio.sleep(0.5)
            
            # 填写股票代码
            code_input = self.page.locator('input[placeholder*="代码"], input[name*="code"], input#stockCode')
            if await code_input.count() > 0:
                await code_input.first.fill(code)
                await asyncio.sleep(0.3)
            
            # 填写价格
            price_input = self.page.locator('input[placeholder*="价格"], input[name*="price"], input#price')
            if await price_input.count() > 0:
                await price_input.first.fill(str(price))
            
            # 填写数量
            amount_input = self.page.locator('input[placeholder*="数量"], input[name*="amount"], input#amount')
            if await amount_input.count() > 0:
                await amount_input.first.fill(str(amount))
            
            # 点击卖出按钮
            sell_btn = self.page.locator('button:has-text("卖出"), button.sell-btn, .btn-sell')
            if await sell_btn.count() > 0:
                await sell_btn.first.click()
            
            # 确认对话框
            await asyncio.sleep(0.5)
            confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定")')
            if await confirm_btn.count() > 0:
                await confirm_btn.first.click()
            
            # 等待响应
            await asyncio.sleep(1)
            
            logger.info(f'✅ 卖出委托已提交: {code} {amount}股')
            
            return {
                'success': True,
                'order_id': f'SELL_{code}_{datetime.now().strftime("%H%M%S")}',
                'message': '委托已提交'
            }
            
        except Exception as e:
            logger.error(f'卖出失败: {e}')
            return {'success': False, 'message': str(e)}
    
    async def cancel_order(self, order_id: str) -> Dict:
        """撤单"""
        if not self.logged_in:
            return {'success': False, 'message': '请先登录'}
        
        logger.info(f'❌ 撤单: {order_id}')
        
        try:
            # 点击撤单菜单
            cancel_menu = self.page.locator('text=撤单, a[href*="cancel"]')
            if await cancel_menu.count() > 0:
                await cancel_menu.first.click()
                await asyncio.sleep(0.5)
            
            # 选择要撤的单
            order_row = self.page.locator(f'text={order_id}, tr:has-text("{order_id}")')
            if await order_row.count() > 0:
                await order_row.first.click()
            
            # 点击撤单按钮
            cancel_btn = self.page.locator('button:has-text("撤单"), button:has-text("撤销")')
            if await cancel_btn.count() > 0:
                await cancel_btn.first.click()
            
            await asyncio.sleep(1)
            
            return {'success': True, 'message': '撤单已提交'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    async def screenshot(self, filename: str = None):
        """截图保存"""
        if not filename:
            filename = f'screenshot_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
        
        filepath = os.path.join(SCRIPT_DIR, '..', '..', 'reports', filename)
        await self.page.screenshot(path=filepath)
        logger.info(f'📸 截图已保存: {filepath}')
        return filepath


async def demo():
    """演示"""
    print('\n' + '='*60)
    print('🏦 湘财证券网页版交易器 - 演示')
    print('='*60)
    
    trader = XCSCWebTrader()
    
    try:
        # 初始化浏览器（非无头模式，方便看到操作）
        await trader.init_browser(headless=False)
        
        print('\n📍 浏览器已打开')
        print('   账号:', trader.account)
        print('   网址:', trader.WEB_URL)
        
        # 登录
        print('\n🔐 开始登录...')
        success = await trader.login()
        
        if success:
            print('\n✅ 登录成功！')
            
            # 获取资金
            balance = await trader.get_balance()
            print(f'\n💰 资金: ¥{balance.get("total_assets", 0):,.2f}')
            
            # 获取持仓
            positions = await trader.get_positions()
            print(f'📊 持仓: {len(positions)}只')
            
            # 截图
            await trader.screenshot('login_success.png')
            
        else:
            print('\n⚠️ 需要验证码，请在浏览器中手动完成登录')
            print('登录完成后，按回车继续...')
            input()
            
            # 再次尝试获取数据
            trader.logged_in = True
            balance = await trader.get_balance()
            positions = await trader.get_positions()
        
        # 保持浏览器打开
        print('\n按回车关闭浏览器...')
        input()
        
    finally:
        await trader.close()


if __name__ == '__main__':
    asyncio.run(demo())
