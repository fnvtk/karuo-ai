#!/usr/bin/env python3
"""
登录辅助工具
支持多种登录认证方式的自动化处理

功能：
1. Cookie/Session登录
2. JWT Token登录
3. OAuth 2.0登录
4. WebSocket登录（参考存客宝实现）

使用方法：
    python login_helper.py --type cookie --url https://example.com
    python login_helper.py --type jwt --url https://example.com --username user --password pass
    python login_helper.py --type websocket --url wss://example.com
"""

import asyncio
import json
import ssl
import time
import hashlib
import hmac
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlencode

try:
    import aiohttp
except ImportError:
    print("请安装 aiohttp: pip install aiohttp")
    aiohttp = None

try:
    import websockets
except ImportError:
    print("请安装 websockets: pip install websockets")
    websockets = None


@dataclass
class AuthResult:
    """认证结果"""
    success: bool
    auth_type: str
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    cookies: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None
    raw_response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BaseAuthenticator(ABC):
    """认证器基类"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        self.session = aiohttp.ClientSession(connector=connector)
        return self
    
    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def authenticate(self, **kwargs) -> AuthResult:
        """执行认证"""
        pass


class CookieAuthenticator(BaseAuthenticator):
    """Cookie/Session认证"""
    
    async def authenticate(
        self,
        login_url: str,
        username: str,
        password: str,
        username_field: str = "username",
        password_field: str = "password",
        extra_fields: Dict[str, str] = None
    ) -> AuthResult:
        """
        Cookie登录认证
        
        Args:
            login_url: 登录接口URL
            username: 用户名
            password: 密码
            username_field: 用户名字段名
            password_field: 密码字段名
            extra_fields: 额外字段
        
        Returns:
            AuthResult: 认证结果
        """
        try:
            url = urljoin(self.base_url, login_url)
            
            data = {
                username_field: username,
                password_field: password
            }
            if extra_fields:
                data.update(extra_fields)
            
            async with self.session.post(url, data=data) as resp:
                response_data = await resp.json()
                
                # 获取Cookies
                cookies = {}
                for cookie in self.session.cookie_jar:
                    cookies[cookie.key] = cookie.value
                
                if resp.status == 200 and cookies:
                    return AuthResult(
                        success=True,
                        auth_type="cookie",
                        cookies=cookies,
                        raw_response=response_data
                    )
                else:
                    return AuthResult(
                        success=False,
                        auth_type="cookie",
                        error=f"登录失败: {response_data}"
                    )
                    
        except Exception as e:
            return AuthResult(
                success=False,
                auth_type="cookie",
                error=str(e)
            )


class JWTAuthenticator(BaseAuthenticator):
    """JWT Token认证"""
    
    async def authenticate(
        self,
        login_url: str,
        username: str,
        password: str,
        token_field: str = "token",
        refresh_token_field: str = "refresh_token",
        expires_field: str = "expires_in"
    ) -> AuthResult:
        """
        JWT登录认证
        
        Args:
            login_url: 登录接口URL
            username: 用户名
            password: 密码
            token_field: Token字段名
            refresh_token_field: 刷新Token字段名
            expires_field: 过期时间字段名
        
        Returns:
            AuthResult: 认证结果
        """
        try:
            url = urljoin(self.base_url, login_url)
            
            data = {
                "username": username,
                "password": password
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            async with self.session.post(url, json=data, headers=headers) as resp:
                response_data = await resp.json()
                
                # 尝试从不同位置提取Token
                token = (
                    response_data.get(token_field) or
                    response_data.get("data", {}).get(token_field) or
                    response_data.get("access_token") or
                    response_data.get("data", {}).get("access_token")
                )
                
                refresh_token = (
                    response_data.get(refresh_token_field) or
                    response_data.get("data", {}).get(refresh_token_field)
                )
                
                expires_in = (
                    response_data.get(expires_field) or
                    response_data.get("data", {}).get(expires_field)
                )
                
                if token:
                    return AuthResult(
                        success=True,
                        auth_type="jwt",
                        token=token,
                        refresh_token=refresh_token,
                        expires_in=expires_in,
                        headers={"Authorization": f"Bearer {token}"},
                        raw_response=response_data
                    )
                else:
                    return AuthResult(
                        success=False,
                        auth_type="jwt",
                        error=f"无法获取Token: {response_data}"
                    )
                    
        except Exception as e:
            return AuthResult(
                success=False,
                auth_type="jwt",
                error=str(e)
            )


class OAuth2Authenticator(BaseAuthenticator):
    """OAuth 2.0认证"""
    
    async def authenticate(
        self,
        token_url: str,
        client_id: str,
        client_secret: str,
        grant_type: str = "password",
        username: str = None,
        password: str = None,
        scope: str = None,
        **extra_params
    ) -> AuthResult:
        """
        OAuth 2.0认证
        
        Args:
            token_url: Token接口URL
            client_id: 客户端ID
            client_secret: 客户端密钥
            grant_type: 授权类型
            username: 用户名（password模式）
            password: 密码（password模式）
            scope: 权限范围
            **extra_params: 额外参数
        
        Returns:
            AuthResult: 认证结果
        """
        try:
            url = urljoin(self.base_url, token_url)
            
            data = {
                "grant_type": grant_type,
                "client_id": client_id,
                "client_secret": client_secret
            }
            
            if grant_type == "password":
                data["username"] = username
                data["password"] = password
            
            if scope:
                data["scope"] = scope
            
            data.update(extra_params)
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            async with self.session.post(url, data=data, headers=headers) as resp:
                response_data = await resp.json()
                
                access_token = response_data.get("access_token")
                refresh_token = response_data.get("refresh_token")
                expires_in = response_data.get("expires_in")
                
                if access_token:
                    return AuthResult(
                        success=True,
                        auth_type="oauth2",
                        token=access_token,
                        refresh_token=refresh_token,
                        expires_in=expires_in,
                        headers={"Authorization": f"Bearer {access_token}"},
                        raw_response=response_data
                    )
                else:
                    return AuthResult(
                        success=False,
                        auth_type="oauth2",
                        error=f"OAuth认证失败: {response_data}"
                    )
                    
        except Exception as e:
            return AuthResult(
                success=False,
                auth_type="oauth2",
                error=str(e)
            )


class WebSocketAuthenticator:
    """
    WebSocket认证
    参考存客宝的实现方式
    """
    
    def __init__(self, ws_url: str, token_url: str = None):
        self.ws_url = ws_url
        self.token_url = token_url
        self.token: Optional[str] = None
        self.websocket = None
    
    async def get_token(
        self,
        username: str,
        password: str,
        extra_headers: Dict[str, str] = None
    ) -> Optional[str]:
        """
        获取WebSocket连接所需的Token
        参考存客宝的实现
        """
        if not self.token_url:
            return None
        
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            params = {
                'grant_type': 'password',
                'username': username,
                'password': password
            }
            
            headers = extra_headers or {}
            
            async with session.post(self.token_url, data=params, headers=headers) as resp:
                result = await resp.json()
                self.token = result.get('access_token')
                return self.token
    
    async def connect(
        self,
        account_id: str,
        client_name: str = "api-client"
    ) -> AuthResult:
        """
        建立WebSocket连接
        
        参考存客宝的连接方式：
        - 连接URL: wss://s2.siyuguanli.com:9993
        - 协议: soap
        - 认证消息: CmdSignIn
        """
        try:
            if not self.token:
                return AuthResult(
                    success=False,
                    auth_type="websocket",
                    error="Token未获取，请先调用get_token"
                )
            
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            self.websocket = await websockets.connect(
                self.ws_url,
                ssl=ssl_context,
                extra_headers={
                    'Sec-WebSocket-Protocol': 'soap',
                    'origin': 'localhost'
                }
            )
            
            # 发送认证消息（参考存客宝格式）
            auth_message = {
                "accessToken": self.token,
                "accountId": account_id,
                "client": client_name,
                "cmdType": "CmdSignIn",
                "seq": 1
            }
            
            await self.websocket.send(json.dumps(auth_message))
            
            # 接收认证响应
            response = await asyncio.wait_for(self.websocket.recv(), timeout=10)
            response_data = json.loads(response)
            
            # 检查认证结果
            if response_data.get('code') == 200 or response_data.get('cmdType') == 'CmdSignInResp':
                return AuthResult(
                    success=True,
                    auth_type="websocket",
                    token=self.token,
                    raw_response=response_data
                )
            else:
                return AuthResult(
                    success=False,
                    auth_type="websocket",
                    error=f"WebSocket认证失败: {response_data}"
                )
                
        except asyncio.TimeoutError:
            return AuthResult(
                success=False,
                auth_type="websocket",
                error="WebSocket认证超时"
            )
        except Exception as e:
            return AuthResult(
                success=False,
                auth_type="websocket",
                error=str(e)
            )
    
    async def send_command(self, cmd_type: str, **params) -> Dict[str, Any]:
        """
        发送WebSocket命令
        
        支持的命令类型（参考存客宝）：
        - CmdHeartbeat: 心跳
        - CmdFetchMoment: 获取朋友圈
        - CmdSendMsg: 发送消息
        - CmdCreateChatroom: 创建群聊
        - CmdAddFriend: 添加好友
        """
        if not self.websocket:
            raise Exception("WebSocket未连接")
        
        message = {
            "cmdType": cmd_type,
            "seq": int(time.time()),
            **params
        }
        
        await self.websocket.send(json.dumps(message))
        response = await asyncio.wait_for(self.websocket.recv(), timeout=30)
        return json.loads(response)
    
    async def close(self):
        """关闭WebSocket连接"""
        if self.websocket:
            await self.websocket.close()


class SiyuguanliAuthenticator(WebSocketAuthenticator):
    """
    私域管理平台认证器
    完全参考存客宝的实现
    """
    
    def __init__(self):
        super().__init__(
            ws_url="wss://s2.siyuguanli.com:9993",
            token_url="https://s2.siyuguanli.com:9991/token"
        )
    
    async def authenticate(
        self,
        username: str,
        password: str,
        account_id: str
    ) -> AuthResult:
        """
        完整的私域管理平台认证流程
        
        Args:
            username: 账号用户名
            password: 账号密码
            account_id: 微信账号ID
        
        Returns:
            AuthResult: 认证结果
        """
        # 1. 获取Token（参考存客宝的请求头）
        extra_headers = {
            'client': 'kefu-client',
            'verifysessionid': '2fbc51c9-db70-4e84-9568-21ef3667e1be',
            'verifycode': '5bcd'
        }
        
        token = await self.get_token(username, password, extra_headers)
        
        if not token:
            return AuthResult(
                success=False,
                auth_type="siyuguanli",
                error="获取Token失败"
            )
        
        # 2. 建立WebSocket连接
        result = await self.connect(account_id, "kefu-client")
        result.auth_type = "siyuguanli"
        
        return result


# ===== 工厂函数 =====

def get_authenticator(auth_type: str, base_url: str) -> BaseAuthenticator:
    """
    获取认证器实例
    
    Args:
        auth_type: 认证类型 (cookie/jwt/oauth2)
        base_url: 基础URL
    
    Returns:
        BaseAuthenticator: 认证器实例
    """
    authenticators = {
        'cookie': CookieAuthenticator,
        'jwt': JWTAuthenticator,
        'oauth2': OAuth2Authenticator,
    }
    
    if auth_type not in authenticators:
        raise ValueError(f"不支持的认证类型: {auth_type}")
    
    return authenticators[auth_type](base_url)


# ===== 命令行入口 =====

async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='登录辅助工具')
    parser.add_argument('--type', '-t', required=True, 
                       choices=['cookie', 'jwt', 'oauth2', 'websocket', 'siyuguanli'],
                       help='认证类型')
    parser.add_argument('--url', '-u', required=True, help='目标URL')
    parser.add_argument('--username', help='用户名')
    parser.add_argument('--password', help='密码')
    parser.add_argument('--login-url', default='/api/auth/login', help='登录接口路径')
    parser.add_argument('--account-id', help='账号ID（WebSocket模式）')
    
    args = parser.parse_args()
    
    if args.type == 'siyuguanli':
        # 私域管理平台认证
        auth = SiyuguanliAuthenticator()
        result = await auth.authenticate(
            username=args.username,
            password=args.password,
            account_id=args.account_id
        )
        
        if result.success:
            print("认证成功！")
            print(f"Token: {result.token}")
            
            # 测试发送心跳
            heartbeat = await auth.send_command("CmdHeartbeat")
            print(f"心跳响应: {heartbeat}")
            
            await auth.close()
        else:
            print(f"认证失败: {result.error}")
    
    elif args.type == 'websocket':
        # 通用WebSocket认证
        auth = WebSocketAuthenticator(args.url)
        result = await auth.connect(args.account_id)
        print(f"认证结果: {result}")
        await auth.close()
    
    else:
        # HTTP认证
        async with get_authenticator(args.type, args.url) as auth:
            result = await auth.authenticate(
                login_url=args.login_url,
                username=args.username,
                password=args.password
            )
            
            print(f"\n{'='*50}")
            print(f"认证类型: {result.auth_type}")
            print(f"认证结果: {'成功' if result.success else '失败'}")
            
            if result.success:
                if result.token:
                    print(f"Token: {result.token[:50]}...")
                if result.cookies:
                    print(f"Cookies: {list(result.cookies.keys())}")
                if result.expires_in:
                    print(f"过期时间: {result.expires_in}秒")
            else:
                print(f"错误: {result.error}")
            
            print(f"{'='*50}\n")


if __name__ == "__main__":
    asyncio.run(main())
