#!/usr/bin/env python3
"""
Docker部署脚本
将生成的SDK部署为API代理服务

功能：
1. 生成FastAPI服务代码
2. 生成Dockerfile
3. 生成docker-compose.yml
4. 一键启动服务

使用方法：
    python docker_deploy.py --input ./output/example_analysis.json --port 8080
"""

import json
import argparse
import shutil
from pathlib import Path
from datetime import datetime


class DockerDeployer:
    """Docker部署器"""
    
    def __init__(self, analysis_file: str, output_dir: str = "./deploy", port: int = 8080):
        self.analysis_file = Path(analysis_file)
        self.output_dir = Path(output_dir)
        self.port = port
        
        # 加载分析结果
        with open(self.analysis_file, 'r', encoding='utf-8') as f:
            self.analysis = json.load(f)
        
        self.site_name = self.analysis['site_name']
        self.class_name = self._to_class_name(self.site_name)
        
        # 创建输出目录
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _to_class_name(self, name: str) -> str:
        """转换为类名格式"""
        parts = name.replace('-', '_').split('_')
        return ''.join(part.capitalize() for part in parts)
    
    def generate_fastapi_server(self) -> str:
        """生成FastAPI服务代码"""
        
        # 构建路由
        routes = []
        for endpoint in self.analysis['endpoints']:
            method = endpoint['method'].lower()
            path = endpoint['path']
            
            # 转换路径参数
            path = path.replace('{', '{path_')
            
            # 生成方法名
            method_name = path.replace('/', '_').strip('_').replace('{', '').replace('}', '')
            if not method_name:
                method_name = "index"
            method_name = f"{method}_{method_name}"
            
            route = f'''
@app.{method}("{path}")
async def {method_name}(request: Request):
    """
    代理 {endpoint['method']} {endpoint['path']}
    分类: {endpoint['category']}
    """
    # 转发请求到目标服务
    return await proxy_request(request, "{endpoint['method']}", "{endpoint['path']}")
'''
            routes.append(route)
        
        server_code = f'''#!/usr/bin/env python3
"""
{self.class_name} API 代理服务
自动生成时间: {datetime.now().isoformat()}
目标网站: {self.analysis['site_url']}
"""

import json
import logging
import time
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import redis.asyncio as redis

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ===== 配置 =====

class Config:
    TARGET_URL = "{self.analysis['site_url']}"
    REDIS_URL = "redis://localhost:6379"
    TOKEN_EXPIRE = 3600 * 24  # Token缓存时间（秒）
    REQUEST_TIMEOUT = 30


# ===== Redis连接 =====

redis_client: Optional[redis.Redis] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True)
    logger.info("Redis连接成功")
    yield
    await redis_client.close()


# ===== FastAPI应用 =====

app = FastAPI(
    title="{self.class_name} API 代理",
    description="自动生成的API代理服务",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== 数据模型 =====

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    expires_in: int

class APIResponse(BaseModel):
    code: int
    data: Any
    message: str


# ===== 辅助函数 =====

async def get_cached_token(user_id: str) -> Optional[str]:
    """获取缓存的Token"""
    if redis_client:
        return await redis_client.get(f"token:{{user_id}}")
    return None

async def set_cached_token(user_id: str, token: str):
    """缓存Token"""
    if redis_client:
        await redis_client.setex(f"token:{{user_id}}", Config.TOKEN_EXPIRE, token)

async def proxy_request(
    request: Request,
    method: str,
    path: str,
    token: str = None
) -> Dict[str, Any]:
    """
    代理请求到目标服务
    """
    url = f"{{Config.TARGET_URL}}{{path}}"
    
    # 构建请求头
    headers = dict(request.headers)
    headers.pop('host', None)
    headers.pop('content-length', None)
    
    if token:
        headers['Authorization'] = f'Bearer {{token}}'
    
    # 获取请求体
    body = None
    if method in ['POST', 'PUT', 'PATCH']:
        body = await request.body()
    
    # 发送请求
    async with httpx.AsyncClient(timeout=Config.REQUEST_TIMEOUT, verify=False) as client:
        try:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                content=body,
                params=dict(request.query_params)
            )
            
            # 解析响应
            try:
                data = response.json()
            except:
                data = {{"raw": response.text}}
            
            return {{
                "code": response.status_code,
                "data": data,
                "message": "success" if response.status_code < 400 else "error"
            }}
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="请求超时")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"请求失败: {{str(e)}}")


# ===== 认证端点 =====

@app.post("/api/proxy/login", response_model=LoginResponse, tags=["认证"])
async def login(request: LoginRequest):
    """
    登录获取Token
    
    会将用户的登录凭证代理到目标网站，并缓存返回的Token
    """
    async with httpx.AsyncClient(timeout=Config.REQUEST_TIMEOUT, verify=False) as client:
        try:
            response = await client.post(
                f"{{Config.TARGET_URL}}{self.analysis.get('login_endpoint', '/api/auth/login')}",
                json={{
                    "username": request.username,
                    "password": request.password
                }}
            )
            
            data = response.json()
            
            # 提取Token
            token = (
                data.get("{self.analysis.get('token_field', 'token')}") or
                data.get("data", {{}}).get("{self.analysis.get('token_field', 'token')}") or
                data.get("access_token") or
                data.get("data", {{}}).get("access_token")
            )
            
            if not token:
                raise HTTPException(status_code=401, detail="登录失败，无法获取Token")
            
            # 缓存Token
            await set_cached_token(request.username, token)
            
            return LoginResponse(token=token, expires_in=Config.TOKEN_EXPIRE)
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"登录请求失败: {{str(e)}}")


@app.get("/api/proxy/status", tags=["系统"])
async def status():
    """服务状态检查"""
    return {{
        "status": "running",
        "target": Config.TARGET_URL,
        "timestamp": time.time()
    }}


# ===== 自动生成的代理路由 =====

{''.join(routes)}


# ===== 通用代理端点 =====

@app.api_route("/proxy/{{path:path}}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], tags=["通用代理"])
async def generic_proxy(
    path: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    通用代理端点
    
    可以代理任意路径的请求到目标服务
    """
    method = request.method
    token = None
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    
    return await proxy_request(request, method, f"/{{path}}", token)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port={self.port})
'''
        
        return server_code
    
    def generate_dockerfile(self) -> str:
        """生成Dockerfile"""
        
        dockerfile = f'''# {self.class_name} API 代理服务
# 自动生成时间: {datetime.now().isoformat()}

FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 暴露端口
EXPOSE {self.port}

# 启动服务
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "{self.port}"]
'''
        
        return dockerfile
    
    def generate_docker_compose(self) -> str:
        """生成docker-compose.yml"""
        
        compose = f'''# {self.class_name} API 代理服务
# 自动生成时间: {datetime.now().isoformat()}

version: '3.8'

services:
  api-proxy:
    build: .
    container_name: {self.site_name}_proxy
    ports:
      - "{self.port}:{self.port}"
    environment:
      - TARGET_URL={self.analysis['site_url']}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: always
    networks:
      - proxy-network

  redis:
    image: redis:7-alpine
    container_name: {self.site_name}_redis
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - proxy-network

networks:
  proxy-network:
    driver: bridge

volumes:
  redis-data:
'''
        
        return compose
    
    def generate_requirements(self) -> str:
        """生成requirements.txt"""
        
        requirements = '''# API代理服务依赖
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
httpx>=0.25.0
redis>=5.0.0
pydantic>=2.5.0
python-multipart>=0.0.6
'''
        
        return requirements
    
    def generate_readme(self) -> str:
        """生成README.md"""
        
        readme = f'''# {self.class_name} API 代理服务

> 自动生成时间: {datetime.now().isoformat()}
> 目标网站: {self.analysis['site_url']}

## 快速开始

### 方式1: Docker Compose (推荐)

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式2: 直接运行

```bash
# 安装依赖
pip install -r requirements.txt

# 启动Redis (如果没有)
docker run -d -p 6379:6379 redis:7-alpine

# 启动服务
python main.py
```

## API文档

服务启动后访问: http://localhost:{self.port}/docs

## 使用示例

### 登录获取Token

```bash
curl -X POST "http://localhost:{self.port}/api/proxy/login" \\
  -H "Content-Type: application/json" \\
  -d '{{"username": "your_username", "password": "your_password"}}'
```

### 调用代理接口

```bash
curl -X GET "http://localhost:{self.port}/proxy/api/users" \\
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 配置说明

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| TARGET_URL | 目标网站URL | {self.analysis['site_url']} |
| REDIS_URL | Redis连接URL | redis://localhost:6379 |

## 目录结构

```
{self.site_name}_deploy/
├── main.py              # FastAPI服务主程序
├── Dockerfile           # Docker构建文件
├── docker-compose.yml   # Docker Compose配置
├── requirements.txt     # Python依赖
└── README.md            # 说明文档
```
'''
        
        return readme
    
    def deploy(self):
        """
        执行部署
        
        生成所有必要的文件
        """
        print(f"\n{'='*60}")
        print(f"开始生成部署文件: {self.site_name}")
        print(f"{'='*60}\n")
        
        # 创建部署目录
        deploy_dir = self.output_dir / f"{self.site_name}_deploy"
        deploy_dir.mkdir(parents=True, exist_ok=True)
        
        # 生成文件
        files = {
            'main.py': self.generate_fastapi_server(),
            'Dockerfile': self.generate_dockerfile(),
            'docker-compose.yml': self.generate_docker_compose(),
            'requirements.txt': self.generate_requirements(),
            'README.md': self.generate_readme(),
        }
        
        for filename, content in files.items():
            filepath = deploy_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[√] 已生成: {filepath}")
        
        # 复制SDK文件（如果存在）
        sdk_file = self.output_dir.parent / f"{self.site_name}_sdk.py"
        if sdk_file.exists():
            shutil.copy(sdk_file, deploy_dir / f"{self.site_name}_sdk.py")
            print(f"[√] 已复制SDK: {self.site_name}_sdk.py")
        
        print(f"\n{'='*60}")
        print(f"部署文件已生成完成！")
        print(f"{'='*60}")
        print(f"\n目录: {deploy_dir}")
        print(f"\n启动命令:")
        print(f"  cd {deploy_dir}")
        print(f"  docker-compose up -d")
        print(f"\nAPI文档: http://localhost:{self.port}/docs")
        print(f"{'='*60}\n")
        
        return deploy_dir


def main():
    parser = argparse.ArgumentParser(description='Docker部署脚本')
    parser.add_argument('--input', '-i', required=True, help='分析结果JSON文件路径')
    parser.add_argument('--output', '-o', default='./deploy', help='输出目录')
    parser.add_argument('--port', '-p', type=int, default=8080, help='服务端口')
    
    args = parser.parse_args()
    
    deployer = DockerDeployer(args.input, args.output, args.port)
    deployer.deploy()


if __name__ == "__main__":
    main()
