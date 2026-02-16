---
name: 网站逆向分析
description: 网站API逆向分析与SDK自动生成
triggers: 逆向分析、模拟登录、API抓取、SDK生成
owner: 木根
group: 木
version: "3.0"
updated: "2026-02-16"
---

# 网站逆向分析技能 v3.0

> 📅 创建日期：2026-01-21
> 📅 更新日期：2026-01-21（v3.0 深度优化，整合实战经验）
> 📋 基于存客宝核心技术 + GitHub开源生态 + 万推实战经验，快速分析并封装任意需授权网站的API服务层

---

## 🎯 技能概述

本技能用于对需要登录授权的第三方网站进行系统性逆向分析，自动化提取API接口，并封装成可复用的服务层。

### 核心能力

1. **模拟登录**：支持Cookie、Session、OAuth2.0、JWT、WebSocket等多种认证方式
2. **接口发现**：自动捕获网站所有API请求，生成OpenAPI规范文档
3. **SDK生成**：基于OpenAPI自动生成类型安全的Python SDK
4. **Docker部署**：一键部署为API代理服务，支持会话管理和缓存
5. **反检测**：集成Playwright Stealth，绕过常见反爬虫检测
6. **矩阵发布**：集成social-auto-upload，支持多平台视频批量发布

### v3.0 核心升级（基于万推实战经验）

| 能力 | 工具/方案 | 说明 |
|------|-----------|------|
| **多平台视频发布** | social-auto-upload | 抖音/快手/B站/小红书/视频号 Cookie直发 |
| **OAuth授权绕过** | Cookie替代方案 | 无需扫码授权，Cookie直接使用 |
| **第三方平台集成** | SDK封装模式 | 登录→获取账号→上传→创建任务 |
| **本地视频上传** | OSS中转方案 | 本地文件先传OSS，再用公网URL发布 |
| **实时状态反馈** | 分步错误码 | login_failed/upload_failed/task_failed |

---

## 🚀 触发词

- 逆向分析网站
- 分析网站接口
- 模拟登录网站
- 封装网站API
- 网站接口提取
- HAR转SDK
- 多平台发布
- Cookie发布

---

## 🏗️ 技术架构 v3.0

### 整体架构（含矩阵发布层）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           网站逆向分析引擎 v3.0                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          第一层：流量捕获层                               │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│   │  │ Playwright    │ ←→ │   mitmproxy   │ ←→ │  HAR导出      │           │   │
│   │  │ + Stealth     │    │   代理拦截    │    │  (浏览器)     │           │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          第二层：规范生成层                               │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│   │  │ mitmproxy2    │ →  │   OpenAPI     │ →  │   AI增强      │           │   │
│   │  │ swagger       │    │   3.0/3.1     │    │ (参数推断)    │           │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          第三层：SDK生成层                                │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│   │  │ openapi-      │    │   web2sdk     │    │  自定义SDK    │           │   │
│   │  │ python-client │    │ (HAR直接SDK)  │    │  (httpx)      │           │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                      第四层：矩阵发布层 (v3.0新增)                        │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│   │  │ social-auto-  │    │  第三方矩阵   │    │   混合模式    │           │   │
│   │  │ upload        │    │  平台SDK      │    │  (优先级)     │           │   │
│   │  │ (Cookie直发)  │    │  (呆头鹅等)   │    │               │           │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          第五层：服务部署层                               │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│   │  │   FastAPI     │ ←→ │  SQLite/Redis │ ←→ │   Docker      │           │   │
│   │  │   代理服务    │    │  状态/缓存    │    │   容器化      │           │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔥 实战经验总结（万推项目踩坑记录）

### 问题1：OAuth授权无法自动化

**场景**：想要自动将万推账号同步到呆头鹅平台

**问题**：
- 抖音/快手等平台的OAuth授权需要用户手机扫码确认
- 无法通过API自动完成授权，必须人工操作
- 第三方矩阵平台（如呆头鹅）的账号是通过OAuth授权获取的

**解决方案**：
```
方案A：使用Cookie替代OAuth
- 用户手动登录平台后获取Cookie
- 用Cookie直接模拟登录状态发布视频
- 推荐工具：social-auto-upload（GitHub开源）

方案B：引导用户到授权页
- 提供一键跳转到第三方平台授权页
- 用户完成授权后，系统自动同步账号信息
- 适用于必须使用第三方平台的场景
```

**代码示例**：
```python
# 双通道发布策略
async def publish_video(account, video, title):
    # 优先级1：有第三方平台ID，走第三方通道
    if account.third_party_user_id:
        return await publish_via_third_party(
            video_path=video.file_path,
            user_ids=[account.third_party_user_id],
            title=title
        )
    
    # 优先级2：有Cookie，走Cookie直发
    elif account.cookies:
        return await publish_with_cookie(
            platform=account.platform,
            video_path=video.file_path,
            cookies=account.cookies,
            title=title
        )
    
    # 无法发布
    else:
        return {"success": False, "error": "no_auth: 账号未授权，请获取Cookie或完成平台授权"}
```

### 问题2：本地视频无法被第三方平台访问

**场景**：本地上传的视频路径为 `http://localhost:8000/uploads/xxx.mp4`

**问题**：
- 第三方矩阵平台（如呆头鹅）的API需要公网可访问的视频URL
- localhost地址只能本机访问，第三方服务器无法下载

**解决方案**：
```
方案A：先上传到第三方平台的OSS
- 调用第三方平台的视频上传接口
- 获取公网URL后再创建发布任务

方案B：使用自己的OSS服务
- 上传到阿里云/腾讯云OSS
- 生成公网访问链接

方案C：使用内网穿透
- ngrok/frp等工具暴露本地服务
- 临时方案，不推荐生产环境
```

**代码示例**：
```python
async def publish_via_third_party(video_path: str, user_ids: list, title: str):
    sdk = ThirdPartySDK()
    await sdk.login(username, password)
    
    # 关键：检查视频来源
    video_url = video_path
    if not video_path.startswith("http"):
        # 本地文件，先上传到第三方OSS
        logger.info(f"上传本地视频: {video_path}")
        uploaded_url = await sdk.upload_video(video_path)
        if not uploaded_url:
            return {"success": False, "error": "video_upload_failed: 视频上传失败"}
        video_url = uploaded_url
        logger.info(f"视频上传成功: {video_url}")
    
    # 使用公网URL创建任务
    result = await sdk.create_task(
        video_url=video_url,
        user_ids=user_ids,
        task_name=f"任务-{title[:15]}"
    )
    return result
```

### 问题3：Cookie格式转换

**场景**：不同来源的Cookie格式不同，需要统一处理

**问题**：
- 浏览器导出的Cookie可能是JSON数组或key=value字符串
- Playwright需要特定的storage_state格式
- 不同平台的Cookie域名不同

**解决方案**：
```python
def prepare_cookie_file(cookies: str, platform: str, output_file: str) -> bool:
    """将Cookie转换为Playwright storage_state格式"""
    
    # 平台域名映射
    platform_domains = {
        "douyin": [".douyin.com", "creator.douyin.com"],
        "kuaishou": [".kuaishou.com", "cp.kuaishou.com"],
        "bilibili": [".bilibili.com", "member.bilibili.com"],
        "xiaohongshu": [".xiaohongshu.com", "creator.xiaohongshu.com"],
        "shipinhao": [".qq.com", "channels.weixin.qq.com"],
    }
    
    domains = platform_domains.get(platform, [f".{platform}.com"])
    
    # 解析Cookie
    if cookies.strip().startswith('['):
        # JSON数组格式
        cookie_list = json.loads(cookies)
    elif cookies.strip().startswith('{'):
        # 单个JSON对象
        cookie_list = [json.loads(cookies)]
    else:
        # key=value; 格式
        cookie_list = []
        for item in cookies.split(';'):
            if '=' in item:
                key, value = item.strip().split('=', 1)
                cookie_list.append({
                    "name": key.strip(),
                    "value": value.strip(),
                    "domain": domains[0],
                    "path": "/"
                })
    
    # 转换为Playwright格式
    playwright_cookies = []
    for cookie in cookie_list:
        playwright_cookies.append({
            "name": cookie.get("name", ""),
            "value": cookie.get("value", ""),
            "domain": cookie.get("domain", domains[0]),
            "path": cookie.get("path", "/"),
            "secure": cookie.get("secure", True),
            "httpOnly": cookie.get("httpOnly", False),
            "sameSite": cookie.get("sameSite", "Lax"),
            "expires": cookie.get("expires", time.time() + 365*24*3600)
        })
    
    # 保存为storage_state格式
    storage_state = {
        "cookies": playwright_cookies,
        "origins": []
    }
    
    with open(output_file, 'w') as f:
        json.dump(storage_state, f)
    
    return True
```

### 问题4：数据库Schema迁移

**场景**：需要给现有表添加新字段（如daitou_user_id）

**问题**：
- SQLAlchemy的ORM模型更新后，数据库表不会自动更新
- 直接ALTER TABLE可能导致数据丢失
- 需要检查字段是否已存在

**解决方案**：
```python
def migrate_database():
    """安全的数据库迁移"""
    import sqlite3
    
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    # 检查字段是否存在
    cursor.execute('PRAGMA table_info(platform_accounts)')
    columns = [col[1] for col in cursor.fetchall()]
    
    # 安全添加新字段
    if 'daitou_user_id' not in columns:
        cursor.execute('ALTER TABLE platform_accounts ADD COLUMN daitou_user_id VARCHAR(50)')
        conn.commit()
        print("已添加 daitou_user_id 字段")
    
    conn.close()
```

### 问题5：异步任务中的数据库Session

**场景**：FastAPI后台任务中访问数据库

**问题**：
- 主请求的数据库Session在后台任务执行前可能已关闭
- 使用已关闭的Session会导致"Session is closed"错误

**解决方案**：
```python
from contextlib import contextmanager

@contextmanager
def get_background_db():
    """为后台任务创建独立的数据库Session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def background_task(item_id: int):
    """后台任务必须创建自己的Session"""
    with get_background_db() as db:
        item = db.query(Item).filter(Item.id == item_id).first()
        # 处理业务逻辑
        item.status = "completed"
        db.commit()
```

### 问题6：第三方SDK的API参数

**场景**：调用第三方SDK时参数名称不匹配

**问题**：
- 逆向分析得到的接口文档可能不完整
- 参数名称可能与预期不同（如`title` vs `task_name`）
- 部分参数是必填但文档未说明

**解决方案**：
```python
# 1. 编写小测试脚本验证SDK
async def test_sdk():
    sdk = ThirdPartySDK()
    await sdk.login(username, password)
    
    # 获取用户列表，检查返回字段
    users = await sdk.get_users()
    print("用户字段:", users[0].__dict__.keys() if users else "无用户")
    
    # 测试创建任务，逐个尝试参数
    try:
        result = await sdk.create_task(
            task_name="测试任务",  # 注意：不是title
            video_url="https://xxx.mp4",
            user_ids=[123],
            # 其他必填参数...
        )
        print("创建成功:", result)
    except TypeError as e:
        print("参数错误:", e)  # 会提示缺少或多余的参数

# 2. 使用dataclass定义SDK返回结构
@dataclass
class SDKUser:
    id: int
    nickname: str
    avatar: str
    unique_id: str
    status: int
    user_type: str  # 注意：不是platform_type
    # ... 根据实际返回添加
```

### 问题7：Playwright的Headless模式

**场景**：服务器环境下运行Playwright

**问题**：
- 服务器无图形界面，必须用headless模式
- 某些网站检测headless浏览器并拒绝访问
- 调试时需要看到浏览器界面

**解决方案**：
```python
# conf.py
import os

# 根据环境自动切换
IS_SERVER = os.environ.get("IS_SERVER", "false").lower() == "true"
LOCAL_CHROME_HEADLESS = IS_SERVER  # 服务器True，本地False

# 使用本地Chrome而非Chromium（更不容易被检测）
LOCAL_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  # macOS
# LOCAL_CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe"  # Windows
```

---

## 📦 推荐工具链（2025-2026最佳实践）

### 1. 多平台视频发布工具（v3.0重点）

| 工具 | 方式 | 支持平台 | 安装 |
|------|------|----------|------|
| **social-auto-upload** | Cookie+Playwright | 抖音/快手/B站/小红书/视频号/TikTok | `git clone github.com/dreammis/social-auto-upload` |
| **matrix** | Cookie+Playwright | 抖音/快手/视频号/小红书 | `git clone github.com/kebenxiaoming/matrix` |

### 2. 流量捕获工具

| 工具 | 用途 | 安装 |
|------|------|------|
| **mitmproxy** | 命令行代理，捕获HTTPS流量 | `pip install mitmproxy` |
| **浏览器HAR导出** | DevTools直接导出 | 内置 |

### 3. OpenAPI/SDK生成工具

| 工具 | 输入 | 输出 | 特点 |
|------|------|------|------|
| **mitmproxy2swagger** | mitmproxy流量/HAR | OpenAPI 3.0 | 成熟稳定 |
| **openapi-python-client** | OpenAPI | Python SDK | 现代Python，Pydantic |
| **手写SDK** | 逆向分析 | Python SDK | 最灵活，适合复杂场景 |

### 4. 反检测工具

| 工具 | 方案 | 适用场景 |
|------|------|----------|
| **playwright-stealth** | 基础反检测 | 普通网站 |
| **Botright** | 高级反检测+验证码 | DataDome/Cloudflare |

---

## 📖 完整工作流程

### 方式一：Cookie直发模式（推荐，无需授权）

适用于：想要直接发布视频到抖音/快手等平台，不想依赖第三方矩阵服务

```bash
# 1. 安装social-auto-upload
git clone https://github.com/dreammis/social-auto-upload.git
cd social-auto-upload
pip install -r requirements.txt
playwright install chromium

# 2. 获取Cookie（首次需要扫码登录）
python examples/get_douyin_cookie.py
# 扫码登录后，Cookie自动保存到 cookies/douyin_uploader/account.json

# 3. 发布视频
python examples/upload_video_to_douyin.py

# 4. 集成到自己的系统
# 参考 social_publisher.py 的实现
```

**集成示例**：
```python
from social_publisher import publish_video_with_cookie

result = await publish_video_with_cookie(
    platform="douyin",
    video_path="/path/to/video.mp4",
    title="我的视频标题",
    cookies="从浏览器获取的Cookie字符串",
    tags=["标签1", "标签2"],
    description="视频描述"
)

if result["success"]:
    print("发布成功！")
else:
    print(f"发布失败: {result['error']}")
```

### 方式二：第三方矩阵平台SDK封装

适用于：需要使用呆头鹅等第三方矩阵平台的功能

```bash
# 1. 分析目标平台（以呆头鹅为例）
# 打开浏览器DevTools，登录平台，记录所有API请求

# 2. 手写SDK（推荐，更可控）
# 参考 daitou_sdk.py 的实现
```

**SDK封装模板**：
```python
import httpx
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class PlatformUser:
    """平台用户数据结构"""
    id: int
    nickname: str
    avatar: str
    unique_id: str
    status: int
    user_type: str

class PlatformSDK:
    """第三方平台SDK"""
    
    BASE_URL = "https://api.platform.com"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.token: Optional[str] = None
    
    async def login(self, username: str, password: str) -> bool:
        """登录获取Token"""
        resp = await self.client.post(
            f"{self.BASE_URL}/api/login",
            json={"username": username, "password": password}
        )
        data = resp.json()
        if data.get("code") == 0:
            self.token = data["data"]["token"]
            self.client.headers["Authorization"] = f"Bearer {self.token}"
            return True
        return False
    
    async def get_users(self) -> List[PlatformUser]:
        """获取授权账号列表"""
        resp = await self.client.get(f"{self.BASE_URL}/api/users")
        data = resp.json()
        return [PlatformUser(**u) for u in data.get("data", {}).get("list", [])]
    
    async def upload_video(self, file_path: str) -> Optional[str]:
        """上传视频到平台OSS，返回公网URL"""
        # 1. 获取上传凭证
        resp = await self.client.post(f"{self.BASE_URL}/api/upload/token")
        upload_info = resp.json()["data"]
        
        # 2. 上传到OSS
        with open(file_path, "rb") as f:
            files = {"file": f}
            resp = await self.client.post(upload_info["upload_url"], files=files)
        
        # 3. 返回公网URL
        return resp.json().get("data", {}).get("url")
    
    async def create_task(
        self,
        task_name: str,  # 注意参数名
        video_url: str,
        user_ids: List[int],
        **kwargs
    ) -> Dict[str, Any]:
        """创建发布任务"""
        resp = await self.client.post(
            f"{self.BASE_URL}/api/task/create",
            json={
                "task_name": task_name,
                "video_url": video_url,
                "user_ids": user_ids,
                **kwargs
            }
        )
        return resp.json()
    
    async def close(self):
        """关闭连接"""
        await self.client.aclose()
```

### 方式三：HAR转OpenAPI标准流程

适用于：需要生成完整API文档的场景

```bash
# 1. 捕获流量
mitmproxy -w traffic.flow

# 2. 浏览器设置代理(localhost:8080)，完成所有操作

# 3. 生成OpenAPI
mitmproxy2swagger -i traffic.flow -o api_spec.yaml -p https://api.example.com --examples

# 4. 生成Python SDK
openapi-python-client generate --path api_spec.yaml --output-path ./sdk
```

---

## 🔐 认证方式处理

### 认证方式优先级（实战总结）

```
1. Cookie直发（最简单，无需授权）
   ↓ Cookie失效时
2. 第三方平台API（需要用户授权）
   ↓ 无第三方平台时
3. 官方API（需要开发者资质）
```

### 各平台认证方式

| 平台 | Cookie直发 | 第三方矩阵 | 官方API |
|------|------------|------------|---------|
| 抖音 | ✅ social-auto-upload | ✅ 呆头鹅等 | ❌ 需资质 |
| 快手 | ✅ social-auto-upload | ✅ 呆头鹅等 | ✅ 开放API |
| B站 | ✅ social-auto-upload | ❌ | ❌ 需资质 |
| 小红书 | ✅ social-auto-upload | ✅ 部分支持 | ❌ 不开放 |
| 视频号 | ✅ social-auto-upload | ✅ 呆头鹅等 | ❌ 需资质 |

### Cookie有效期管理

```python
# 发布后自动保存更新的Cookie
async def publish_with_auto_cookie_update(account, video, title):
    cookie_file = get_cookie_file(account)
    
    # 发布视频
    result = await do_publish(cookie_file, video, title)
    
    # 发布成功后，Cookie可能已更新，保存回数据库
    if result["success"]:
        with open(cookie_file, 'r') as f:
            updated_cookies = f.read()
        
        # 更新数据库中的Cookie
        account.cookies = updated_cookies
        account.cookie_updated_at = datetime.now()
        db.commit()
    
    return result
```

---

## 🛡️ 反检测最佳实践

### Playwright Stealth配置（实战优化版）

```python
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

async def create_stealth_browser(headless: bool = True):
    p = await async_playwright().start()
    
    # 使用本地Chrome（更不容易被检测）
    browser = await p.chromium.launch(
        headless=headless,
        executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-size=1920,1080',
        ]
    )
    
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale='zh-CN',
        timezone_id='Asia/Shanghai',
    )
    
    page = await context.new_page()
    await stealth_async(page)
    
    return browser, context, page
```

### 反检测检查清单

- [x] 使用本地Chrome而非Chromium
- [x] 禁用AutomationControlled特征
- [x] 设置真实的User-Agent
- [x] 设置正确的时区和语言（Asia/Shanghai, zh-CN）
- [x] 使用1920x1080分辨率
- [x] 应用playwright-stealth补丁
- [ ] 添加随机延迟（3-8秒）
- [ ] 使用高质量代理（住宅IP）
- [ ] 处理验证码（集成打码服务）

---

## 📁 完整文件结构

```
网站逆向分析/
├── SKILL.md                        # 技能说明文档（本文件）
├── requirements.txt                # Python依赖
├── scripts/
│   ├── site_analyzer.py            # 网站分析主程序
│   ├── sdk_generator.py            # SDK代码生成器
│   ├── docker_deploy.py            # Docker部署脚本
│   ├── login_helper.py             # 登录辅助工具
│   ├── quick_start.sh              # 快速启动脚本
│   ├── har_to_openapi.py           # HAR转OpenAPI
│   ├── stealth_browser.py          # 反检测浏览器
│   └── social_publisher.py         # [v3.0] 多平台发布器
├── references/
│   ├── 存客宝技术架构.md            # 参考：存客宝实现
│   ├── 常见网站登录方式.md          # 参考：各种认证方式
│   ├── GitHub开源工具对比.md        # 工具选型参考
│   ├── 反检测最佳实践.md            # 反爬虫对策
│   └── 实战踩坑记录.md              # [v3.0] 万推项目经验
├── templates/
│   ├── python_sdk/                 # Python SDK模板
│   ├── php_sdk/                    # PHP SDK模板
│   ├── fastapi_server/             # FastAPI服务模板
│   └── platform_sdk/               # [v3.0] 第三方平台SDK模板
└── output/                         # 生成的输出文件
```

---

## ⚠️ 常见错误及解决方案

### 错误码参考

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| `cookie_invalid` | Cookie已失效 | 重新获取Cookie（扫码登录） |
| `cookie_parse_failed` | Cookie格式错误 | 检查Cookie格式，确保是有效的JSON或key=value格式 |
| `login_failed` | 第三方平台登录失败 | 检查账号密码是否正确 |
| `video_upload_failed` | 视频上传失败 | 检查视频文件是否存在、格式是否支持 |
| `task_create_failed` | 创建任务失败 | 检查参数是否正确、账号是否有发布权限 |
| `not_supported` | 平台不支持 | 该平台暂未接入，需要开发 |
| `no_auth` | 无授权信息 | 需要获取Cookie或完成平台授权 |

### 常见问题FAQ

**Q: Cookie多久失效？**
A: 不同平台不同，一般7-30天。建议每次发布后保存更新的Cookie。

**Q: 能否完全自动化，不需要扫码？**
A: 首次必须扫码获取Cookie。之后可以用Cookie自动发布，直到Cookie失效。

**Q: 第三方矩阵平台和Cookie直发哪个好？**
A: 
- Cookie直发：简单、免费、但Cookie会失效
- 第三方平台：稳定、功能多、但需付费且受限于平台规则

**Q: 服务器上怎么获取Cookie？**
A: 
1. 本地获取Cookie后上传到服务器
2. 使用VNC/远程桌面在服务器上扫码
3. 使用无头浏览器+扫码截图+手机扫

**Q: 视频发布失败但没有错误信息？**
A: 检查以下几点：
1. 服务器日志中的详细错误
2. 视频文件是否存在且可读
3. 网络是否正常（能否访问目标平台）
4. 账号是否有发布权限

---

## 📊 设计决策说明

### 为什么v3.0新增矩阵发布层？

| 需求 | 之前的方案 | v3.0方案 |
|------|------------|----------|
| 发布视频到抖音 | 依赖第三方平台 | Cookie直发，无需第三方 |
| 多平台同时发布 | 逐个平台手动 | 统一接口，一键分发 |
| 账号管理 | 散落各处 | 集中管理，状态可见 |

### 为什么推荐Cookie直发而非官方API？

| 对比项 | 官方API | Cookie直发 |
|--------|---------|------------|
| 申请门槛 | 需要企业资质 | 无门槛 |
| 功能限制 | 受API限制 | 功能完整 |
| 稳定性 | 稳定 | 网站改版可能失效 |
| 适用场景 | 大规模商业化 | 个人/小团队 |

### 为什么要手写SDK而非自动生成？

- **自动生成**：适合API文档完整的场景，快速出原型
- **手写SDK**：适合需要精细控制的场景，如：
  - 接口文档不完整
  - 需要处理特殊逻辑（上传视频、分步任务）
  - 需要优化性能（连接池、重试策略）

---

## 🔗 相关资源

- [social-auto-upload](https://github.com/dreammis/social-auto-upload) - 多平台视频自动上传
- [matrix](https://github.com/kebenxiaoming/matrix) - 矩阵发布系统
- [mitmproxy2swagger](https://github.com/alufers/mitmproxy2swagger) - HAR转OpenAPI
- [openapi-python-client](https://github.com/openapi-generators/openapi-python-client) - SDK生成器
- [playwright-stealth](https://github.com/AtuboDad/playwright_stealth) - 反检测插件
- [Playwright官方文档](https://playwright.dev/python/)
- [FastAPI官方文档](https://fastapi.tiangolo.com/)
