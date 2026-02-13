#!/usr/bin/env python3
"""
网站逆向分析器
基于存客宝技术架构，自动分析目标网站的登录流程和API接口

功能：
1. 模拟浏览器访问目标网站
2. 捕获所有网络请求
3. 分析API接口结构
4. 生成接口文档

使用方法：
    python site_analyzer.py --url https://example.com --login
    python site_analyzer.py --url https://example.com --analyze-only
"""

import asyncio
import json
import re
import argparse
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from urllib.parse import urlparse, parse_qs

try:
    from playwright.async_api import async_playwright, Page, BrowserContext
except ImportError:
    print("请安装 playwright: pip install playwright && playwright install")
    exit(1)

try:
    import aiofiles
except ImportError:
    print("请安装 aiofiles: pip install aiofiles")
    exit(1)


@dataclass
class APIEndpoint:
    """API端点数据结构"""
    url: str
    method: str
    path: str
    params: Dict[str, Any] = field(default_factory=dict)
    headers: Dict[str, str] = field(default_factory=dict)
    request_body: Optional[str] = None
    response_body: Optional[str] = None
    response_status: int = 0
    content_type: str = ""
    auth_required: bool = False
    description: str = ""
    category: str = "未分类"
    timestamp: str = ""
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SiteAnalysis:
    """网站分析结果"""
    site_url: str
    site_name: str
    auth_type: str  # cookie, jwt, oauth, basic, api_key
    login_endpoint: Optional[str] = None
    token_field: Optional[str] = None
    endpoints: List[APIEndpoint] = field(default_factory=list)
    cookies: List[Dict[str, Any]] = field(default_factory=list)
    local_storage: Dict[str, str] = field(default_factory=dict)
    session_storage: Dict[str, str] = field(default_factory=dict)
    analysis_time: str = ""
    
    def to_dict(self) -> dict:
        result = asdict(self)
        result['endpoints'] = [e.to_dict() if isinstance(e, APIEndpoint) else e for e in self.endpoints]
        return result


class SiteAnalyzer:
    """网站逆向分析器"""
    
    def __init__(self, url: str, output_dir: str = "./output"):
        self.url = url
        self.parsed_url = urlparse(url)
        self.site_name = self.parsed_url.netloc.replace(".", "_")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.endpoints: List[APIEndpoint] = []
        self.cookies: List[Dict[str, Any]] = []
        self.local_storage: Dict[str, str] = {}
        self.session_storage: Dict[str, str] = {}
        
        # 用于去重
        self.seen_requests: set = set()
        
        # API模式识别
        self.api_patterns = [
            r'/api/',
            r'/v\d+/',
            r'/rest/',
            r'/graphql',
            r'\.json$',
            r'/ajax/',
            r'/rpc/',
        ]
        
        # 认证相关模式
        self.auth_patterns = {
            'jwt': [r'bearer\s+[\w-]+\.[\w-]+\.[\w-]+', r'authorization:\s*bearer'],
            'cookie': [r'set-cookie:', r'session', r'sid='],
            'api_key': [r'x-api-key', r'apikey', r'api_key'],
            'basic': [r'authorization:\s*basic'],
            'oauth': [r'oauth', r'access_token', r'refresh_token'],
        }
    
    def _is_api_request(self, url: str, content_type: str) -> bool:
        """判断是否为API请求"""
        # 检查URL模式
        for pattern in self.api_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True
        
        # 检查Content-Type
        api_content_types = ['application/json', 'application/xml', 'text/json']
        for ct in api_content_types:
            if ct in content_type.lower():
                return True
        
        return False
    
    def _get_request_hash(self, method: str, url: str) -> str:
        """生成请求的唯一标识"""
        # 移除动态参数
        parsed = urlparse(url)
        path = parsed.path
        return hashlib.md5(f"{method}:{path}".encode()).hexdigest()
    
    def _detect_auth_type(self, headers: Dict[str, str]) -> str:
        """检测认证类型"""
        headers_str = str(headers).lower()
        
        for auth_type, patterns in self.auth_patterns.items():
            for pattern in patterns:
                if re.search(pattern, headers_str, re.IGNORECASE):
                    return auth_type
        
        return "unknown"
    
    def _categorize_endpoint(self, path: str, method: str) -> str:
        """根据路径和方法分类端点"""
        path_lower = path.lower()
        
        # 认证相关
        if any(kw in path_lower for kw in ['login', 'auth', 'token', 'signin', 'logout', 'register']):
            return "认证授权"
        
        # 用户相关
        if any(kw in path_lower for kw in ['user', 'profile', 'account', 'member']):
            return "用户管理"
        
        # 数据相关
        if any(kw in path_lower for kw in ['list', 'query', 'search', 'get']):
            return "数据查询"
        
        # 操作相关
        if method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            if any(kw in path_lower for kw in ['create', 'add', 'new']):
                return "数据创建"
            if any(kw in path_lower for kw in ['update', 'edit', 'modify']):
                return "数据更新"
            if any(kw in path_lower for kw in ['delete', 'remove']):
                return "数据删除"
        
        # 文件相关
        if any(kw in path_lower for kw in ['upload', 'download', 'file', 'image', 'media']):
            return "文件操作"
        
        # 消息相关
        if any(kw in path_lower for kw in ['message', 'notification', 'chat', 'push']):
            return "消息通知"
        
        return "其他接口"
    
    async def _handle_request(self, request):
        """处理捕获的请求"""
        try:
            url = request.url
            method = request.method
            
            # 过滤静态资源
            if any(url.endswith(ext) for ext in ['.css', '.js', '.png', '.jpg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.svg']):
                return
            
            # 去重
            request_hash = self._get_request_hash(method, url)
            if request_hash in self.seen_requests:
                return
            self.seen_requests.add(request_hash)
            
            # 获取请求头
            headers = request.headers
            
            # 检查是否为API请求
            content_type = headers.get('content-type', '')
            if not self._is_api_request(url, content_type):
                return
            
            # 获取请求体
            request_body = None
            try:
                request_body = request.post_data
            except:
                pass
            
            # 解析URL
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            
            # 创建端点记录
            endpoint = APIEndpoint(
                url=url,
                method=method,
                path=parsed.path,
                params=params,
                headers=dict(headers),
                request_body=request_body,
                content_type=content_type,
                auth_required='authorization' in str(headers).lower(),
                category=self._categorize_endpoint(parsed.path, method),
                timestamp=datetime.now().isoformat()
            )
            
            self.endpoints.append(endpoint)
            print(f"  [+] 捕获API: {method} {parsed.path}")
            
        except Exception as e:
            print(f"  [!] 处理请求出错: {e}")
    
    async def _handle_response(self, response):
        """处理响应"""
        try:
            url = response.url
            method = response.request.method
            
            # 查找对应的端点
            request_hash = self._get_request_hash(method, url)
            for endpoint in self.endpoints:
                if self._get_request_hash(endpoint.method, endpoint.url) == request_hash:
                    endpoint.response_status = response.status
                    
                    # 尝试获取响应体
                    try:
                        content_type = response.headers.get('content-type', '')
                        if 'json' in content_type:
                            body = await response.text()
                            # 限制长度
                            if len(body) > 10000:
                                body = body[:10000] + "...(truncated)"
                            endpoint.response_body = body
                    except:
                        pass
                    break
                    
        except Exception as e:
            pass
    
    async def analyze(self, login: bool = False, username: str = None, password: str = None) -> SiteAnalysis:
        """
        分析目标网站
        
        Args:
            login: 是否执行登录流程
            username: 登录用户名
            password: 登录密码
        
        Returns:
            SiteAnalysis: 分析结果
        """
        print(f"\n{'='*60}")
        print(f"开始分析网站: {self.url}")
        print(f"{'='*60}\n")
        
        async with async_playwright() as p:
            # 启动浏览器
            browser = await p.chromium.launch(
                headless=not login,  # 登录时显示浏览器
                args=['--disable-blink-features=AutomationControlled']
            )
            
            # 创建上下文
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            # 创建页面
            page = await context.new_page()
            
            # 监听网络请求
            page.on("request", lambda r: asyncio.create_task(self._handle_request(r)))
            page.on("response", lambda r: asyncio.create_task(self._handle_response(r)))
            
            print(f"[1] 访问目标网站...")
            await page.goto(self.url, wait_until='networkidle')
            await asyncio.sleep(2)
            
            if login:
                print(f"\n[2] 请在浏览器中手动登录...")
                print(f"    登录完成后按 Enter 继续...")
                
                # 等待用户登录
                await asyncio.get_event_loop().run_in_executor(None, input)
                
                print(f"\n[3] 捕获登录后的状态...")
                await asyncio.sleep(2)
            
            # 获取Cookies
            self.cookies = await context.cookies()
            print(f"\n[4] 捕获到 {len(self.cookies)} 个Cookies")
            
            # 获取LocalStorage和SessionStorage
            try:
                self.local_storage = await page.evaluate("() => Object.fromEntries(Object.entries(localStorage))")
                self.session_storage = await page.evaluate("() => Object.fromEntries(Object.entries(sessionStorage))")
                print(f"[5] 捕获到 LocalStorage: {len(self.local_storage)} 项, SessionStorage: {len(self.session_storage)} 项")
            except:
                pass
            
            # 遍历页面发现更多接口
            print(f"\n[6] 探索页面发现更多接口...")
            await self._explore_page(page)
            
            await browser.close()
        
        # 检测认证类型
        auth_type = self._detect_auth_from_data()
        
        # 查找登录端点
        login_endpoint = None
        token_field = None
        for endpoint in self.endpoints:
            if endpoint.category == "认证授权" and endpoint.method == "POST":
                login_endpoint = endpoint.path
                # 尝试从响应中找token字段
                if endpoint.response_body:
                    try:
                        resp_data = json.loads(endpoint.response_body)
                        for key in ['token', 'access_token', 'accessToken', 'jwt', 'session']:
                            if key in str(resp_data).lower():
                                token_field = key
                                break
                    except:
                        pass
                break
        
        # 构建分析结果
        analysis = SiteAnalysis(
            site_url=self.url,
            site_name=self.site_name,
            auth_type=auth_type,
            login_endpoint=login_endpoint,
            token_field=token_field,
            endpoints=self.endpoints,
            cookies=self.cookies,
            local_storage=self.local_storage,
            session_storage=self.session_storage,
            analysis_time=datetime.now().isoformat()
        )
        
        # 保存结果
        await self._save_analysis(analysis)
        
        # 打印统计
        self._print_summary(analysis)
        
        return analysis
    
    async def _explore_page(self, page: Page):
        """探索页面，触发更多接口"""
        # 获取所有链接
        links = await page.evaluate("""
            () => Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href.startsWith(window.location.origin))
        """)
        
        # 只访问前10个链接
        for link in links[:10]:
            try:
                print(f"  → 访问: {link}")
                await page.goto(link, wait_until='networkidle', timeout=10000)
                await asyncio.sleep(1)
            except:
                pass
    
    def _detect_auth_from_data(self) -> str:
        """从收集的数据中检测认证类型"""
        # 检查LocalStorage中是否有token
        for key, value in self.local_storage.items():
            if any(kw in key.lower() for kw in ['token', 'jwt', 'auth']):
                if '.' in value and len(value.split('.')) == 3:
                    return "jwt"
                return "token"
        
        # 检查Cookie中是否有session
        for cookie in self.cookies:
            name = cookie.get('name', '').lower()
            if any(kw in name for kw in ['session', 'sid', 'auth']):
                return "cookie"
        
        # 检查请求头
        for endpoint in self.endpoints:
            if 'authorization' in str(endpoint.headers).lower():
                auth_header = endpoint.headers.get('authorization', endpoint.headers.get('Authorization', ''))
                if 'bearer' in auth_header.lower():
                    return "jwt"
                if 'basic' in auth_header.lower():
                    return "basic"
        
        return "unknown"
    
    async def _save_analysis(self, analysis: SiteAnalysis):
        """保存分析结果"""
        # 保存JSON
        json_path = self.output_dir / f"{self.site_name}_analysis.json"
        async with aiofiles.open(json_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(analysis.to_dict(), ensure_ascii=False, indent=2))
        print(f"\n[√] 分析结果已保存: {json_path}")
        
        # 生成Markdown文档
        md_path = self.output_dir / f"{self.site_name}_api.md"
        md_content = self._generate_markdown(analysis)
        async with aiofiles.open(md_path, 'w', encoding='utf-8') as f:
            await f.write(md_content)
        print(f"[√] API文档已生成: {md_path}")
    
    def _generate_markdown(self, analysis: SiteAnalysis) -> str:
        """生成Markdown格式的API文档"""
        lines = [
            f"# {analysis.site_name} API 文档",
            "",
            f"> 自动生成时间: {analysis.analysis_time}",
            f"> 分析目标: {analysis.site_url}",
            "",
            "---",
            "",
            "## 认证信息",
            "",
            f"- **认证类型**: {analysis.auth_type}",
            f"- **登录接口**: {analysis.login_endpoint or '未检测到'}",
            f"- **Token字段**: {analysis.token_field or '未检测到'}",
            "",
            "---",
            "",
            "## API接口列表",
            "",
        ]
        
        # 按分类分组
        categories = {}
        for endpoint in analysis.endpoints:
            cat = endpoint.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(endpoint)
        
        for category, endpoints in categories.items():
            lines.append(f"### {category}")
            lines.append("")
            
            for i, ep in enumerate(endpoints, 1):
                lines.append(f"#### {i}. {ep.method} {ep.path}")
                lines.append("")
                lines.append(f"- **完整URL**: `{ep.url}`")
                lines.append(f"- **认证**: {'需要' if ep.auth_required else '不需要'}")
                lines.append(f"- **Content-Type**: `{ep.content_type}`")
                
                if ep.params:
                    lines.append("- **Query参数**:")
                    for key, values in ep.params.items():
                        lines.append(f"  - `{key}`: {values}")
                
                if ep.request_body:
                    lines.append("- **请求体**:")
                    lines.append("```json")
                    try:
                        body = json.loads(ep.request_body)
                        lines.append(json.dumps(body, ensure_ascii=False, indent=2))
                    except:
                        lines.append(ep.request_body[:500])
                    lines.append("```")
                
                if ep.response_body:
                    lines.append(f"- **响应状态**: {ep.response_status}")
                    lines.append("- **响应示例**:")
                    lines.append("```json")
                    try:
                        body = json.loads(ep.response_body)
                        lines.append(json.dumps(body, ensure_ascii=False, indent=2)[:2000])
                    except:
                        lines.append(ep.response_body[:500])
                    lines.append("```")
                
                lines.append("")
        
        # Cookies
        if analysis.cookies:
            lines.extend([
                "---",
                "",
                "## Cookies",
                "",
                "| 名称 | 域名 | 路径 | 过期时间 |",
                "|------|------|------|----------|",
            ])
            for cookie in analysis.cookies:
                lines.append(f"| {cookie.get('name', '')} | {cookie.get('domain', '')} | {cookie.get('path', '')} | {cookie.get('expires', '')} |")
            lines.append("")
        
        # LocalStorage
        if analysis.local_storage:
            lines.extend([
                "---",
                "",
                "## LocalStorage",
                "",
            ])
            for key, value in analysis.local_storage.items():
                lines.append(f"- **{key}**: `{value[:100]}{'...' if len(value) > 100 else ''}`")
            lines.append("")
        
        return "\n".join(lines)
    
    def _print_summary(self, analysis: SiteAnalysis):
        """打印分析摘要"""
        print(f"\n{'='*60}")
        print(f"分析完成！摘要信息：")
        print(f"{'='*60}")
        print(f"  网站: {analysis.site_url}")
        print(f"  认证类型: {analysis.auth_type}")
        print(f"  登录接口: {analysis.login_endpoint or '未检测到'}")
        print(f"  发现接口: {len(analysis.endpoints)} 个")
        
        # 按分类统计
        categories = {}
        for ep in analysis.endpoints:
            cat = ep.category
            categories[cat] = categories.get(cat, 0) + 1
        
        print(f"\n  接口分类统计:")
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            print(f"    - {cat}: {count} 个")
        
        print(f"\n  Cookies: {len(analysis.cookies)} 个")
        print(f"  LocalStorage: {len(analysis.local_storage)} 项")
        print(f"{'='*60}\n")


async def main():
    parser = argparse.ArgumentParser(description='网站逆向分析器')
    parser.add_argument('--url', '-u', required=True, help='目标网站URL')
    parser.add_argument('--login', '-l', action='store_true', help='执行登录流程（显示浏览器）')
    parser.add_argument('--output', '-o', default='./output', help='输出目录')
    
    args = parser.parse_args()
    
    analyzer = SiteAnalyzer(args.url, args.output)
    await analyzer.analyze(login=args.login)


if __name__ == "__main__":
    asyncio.run(main())
