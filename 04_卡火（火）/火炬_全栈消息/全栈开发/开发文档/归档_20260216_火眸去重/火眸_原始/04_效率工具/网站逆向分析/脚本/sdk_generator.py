#!/usr/bin/env python3
"""
SDK代码生成器
根据分析结果自动生成Python/PHP SDK代码

功能：
1. 读取分析结果JSON文件
2. 根据模板生成SDK代码
3. 支持Python和PHP两种语言

使用方法：
    python sdk_generator.py --input ./output/example_analysis.json --template python
    python sdk_generator.py --input ./output/example_analysis.json --template php
"""

import json
import argparse
import re
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


class SDKGenerator:
    """SDK代码生成器"""
    
    def __init__(self, analysis_file: str, output_dir: str = "./output"):
        self.analysis_file = Path(analysis_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 加载分析结果
        with open(self.analysis_file, 'r', encoding='utf-8') as f:
            self.analysis = json.load(f)
        
        self.site_name = self.analysis['site_name']
        self.class_name = self._to_class_name(self.site_name)
    
    def _to_class_name(self, name: str) -> str:
        """转换为类名格式"""
        # example_com -> ExampleCom
        parts = name.replace('-', '_').split('_')
        return ''.join(part.capitalize() for part in parts)
    
    def _to_method_name(self, path: str, method: str) -> str:
        """从路径生成方法名"""
        # /api/users/list -> get_users_list (for GET)
        # /api/users -> create_user (for POST)
        
        # 移除前缀
        path = re.sub(r'^/(api|v\d+)/', '', path)
        
        # 移除ID参数
        path = re.sub(r'/\{[^}]+\}', '', path)
        path = re.sub(r'/\d+', '', path)
        
        # 转换为下划线格式
        parts = [p for p in path.split('/') if p]
        
        if not parts:
            parts = ['index']
        
        # 根据HTTP方法添加前缀
        prefix_map = {
            'GET': 'get',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'patch',
            'DELETE': 'delete'
        }
        prefix = prefix_map.get(method, method.lower())
        
        # 如果路径本身包含动词，不添加前缀
        verbs = ['get', 'list', 'query', 'search', 'create', 'add', 'update', 'edit', 'delete', 'remove', 'login', 'logout']
        if parts[0].lower() in verbs:
            return '_'.join(parts).lower()
        
        return f"{prefix}_{'_'.join(parts)}".lower()
    
    def _parse_params_from_body(self, body: str) -> Dict[str, str]:
        """从请求体解析参数"""
        params = {}
        if not body:
            return params
        
        try:
            data = json.loads(body)
            if isinstance(data, dict):
                for key, value in data.items():
                    # 推断类型
                    if isinstance(value, bool):
                        params[key] = 'bool'
                    elif isinstance(value, int):
                        params[key] = 'int'
                    elif isinstance(value, float):
                        params[key] = 'float'
                    elif isinstance(value, list):
                        params[key] = 'list'
                    elif isinstance(value, dict):
                        params[key] = 'dict'
                    else:
                        params[key] = 'str'
        except:
            pass
        
        return params
    
    def generate_python_sdk(self) -> str:
        """生成Python SDK"""
        
        # 按分类分组端点
        categories = {}
        for endpoint in self.analysis['endpoints']:
            cat = endpoint['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(endpoint)
        
        # 生成方法代码
        methods = []
        method_names = set()
        
        for category, endpoints in categories.items():
            methods.append(f"\n    # ===== {category} =====")
            
            for ep in endpoints:
                method_name = self._to_method_name(ep['path'], ep['method'])
                
                # 处理重名
                original_name = method_name
                counter = 1
                while method_name in method_names:
                    method_name = f"{original_name}_{counter}"
                    counter += 1
                method_names.add(method_name)
                
                # 解析参数
                params = self._parse_params_from_body(ep.get('request_body', ''))
                query_params = ep.get('params', {})
                
                # 构建参数列表
                param_list = []
                param_docs = []
                
                for key, ptype in params.items():
                    param_list.append(f"{key}: {ptype} = None")
                    param_docs.append(f"            {key}: {ptype} - 请求参数")
                
                for key in query_params.keys():
                    if key not in params:
                        param_list.append(f"{key}: str = None")
                        param_docs.append(f"            {key}: str - 查询参数")
                
                params_str = ", ".join(param_list)
                if params_str:
                    params_str = ", " + params_str
                
                # 构建方法
                method_code = f'''
    def {method_name}(self{params_str}) -> dict:
        """
        {ep['method']} {ep['path']}
        
        分类: {category}
        认证: {'需要' if ep['auth_required'] else '不需要'}
        
        Args:
{chr(10).join(param_docs) if param_docs else '            无'}
        
        Returns:
            dict: API响应
        """
        url = f"{{self.base_url}}{ep['path']}"
        
        # 构建请求参数
        data = {{}}
        params = {{}}'''
                
                # 添加参数处理
                for key in params.keys():
                    method_code += f'''
        if {key} is not None:
            data["{key}"] = {key}'''
                
                for key in query_params.keys():
                    if key not in params:
                        method_code += f'''
        if {key} is not None:
            params["{key}"] = {key}'''
                
                # 添加请求调用
                http_method = ep['method'].lower()
                if http_method == 'get':
                    method_code += '''
        
        return self._request("GET", url, params=params)'''
                elif http_method == 'delete':
                    method_code += '''
        
        return self._request("DELETE", url, params=params)'''
                else:
                    method_code += f'''
        
        return self._request("{ep['method']}", url, json=data, params=params)'''
                
                methods.append(method_code)
        
        # 完整的SDK代码
        sdk_code = f'''#!/usr/bin/env python3
"""
{self.class_name} SDK
自动生成时间: {datetime.now().isoformat()}
目标网站: {self.analysis['site_url']}

安装依赖:
    pip install requests aiohttp

使用示例:
    from {self.site_name}_sdk import {self.class_name}Client
    
    client = {self.class_name}Client()
    client.login("username", "password")
    result = client.get_users()
"""

import json
import time
import logging
from typing import Optional, Dict, Any, List
from urllib.parse import urljoin

import requests

logger = logging.getLogger(__name__)


class {self.class_name}Client:
    """
    {self.class_name} API 客户端
    
    认证类型: {self.analysis['auth_type']}
    登录接口: {self.analysis.get('login_endpoint', '未知')}
    """
    
    def __init__(
        self,
        base_url: str = "{self.analysis['site_url']}",
        timeout: int = 30,
        retry_count: int = 3
    ):
        """
        初始化客户端
        
        Args:
            base_url: API基础URL
            timeout: 请求超时时间（秒）
            retry_count: 失败重试次数
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retry_count = retry_count
        
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires: int = 0
        
        # 设置默认请求头
        self.session.headers.update({{
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }})
    
    def _request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> dict:
        """
        发送HTTP请求
        
        Args:
            method: HTTP方法
            url: 请求URL
            **kwargs: 其他请求参数
        
        Returns:
            dict: 响应数据
        """
        # 添加认证头
        if self.token:
            self.session.headers['Authorization'] = f'Bearer {{self.token}}'
        
        # 重试机制
        last_error = None
        for i in range(self.retry_count):
            try:
                response = self.session.request(
                    method,
                    url,
                    timeout=self.timeout,
                    **kwargs
                )
                
                # 检查响应
                if response.status_code == 401:
                    # Token过期，尝试刷新
                    if self.refresh_token:
                        self._refresh_token()
                        continue
                    raise AuthenticationError("认证失败，请重新登录")
                
                response.raise_for_status()
                
                # 解析响应
                try:
                    return response.json()
                except:
                    return {{"data": response.text, "status": response.status_code}}
                    
            except requests.exceptions.Timeout:
                last_error = TimeoutError(f"请求超时: {{url}}")
                logger.warning(f"请求超时，重试 {{i+1}}/{{self.retry_count}}")
                time.sleep(1)
            except requests.exceptions.RequestException as e:
                last_error = e
                logger.warning(f"请求失败: {{e}}，重试 {{i+1}}/{{self.retry_count}}")
                time.sleep(1)
        
        raise last_error or Exception("请求失败")
    
    def _refresh_token(self):
        """刷新Token"""
        # TODO: 根据实际接口实现
        pass
    
    def set_token(self, token: str, refresh_token: str = None):
        """
        设置认证Token
        
        Args:
            token: 访问令牌
            refresh_token: 刷新令牌
        """
        self.token = token
        self.refresh_token = refresh_token
    
    def set_cookies(self, cookies: dict):
        """
        设置Cookies
        
        Args:
            cookies: Cookie字典
        """
        self.session.cookies.update(cookies)
    
    def login(self, username: str, password: str) -> dict:
        """
        登录获取Token
        
        Args:
            username: 用户名
            password: 密码
        
        Returns:
            dict: 登录响应
        """
        login_endpoint = "{self.analysis.get('login_endpoint', '/api/auth/login')}"
        url = f"{{self.base_url}}{{login_endpoint}}"
        
        response = self._request("POST", url, json={{
            "username": username,
            "password": password
        }})
        
        # 提取Token
        token_field = "{self.analysis.get('token_field', 'token')}"
        if isinstance(response, dict):
            # 尝试从不同位置提取token
            token = (
                response.get(token_field) or
                response.get('data', {{}}).get(token_field) or
                response.get('access_token') or
                response.get('data', {{}}).get('access_token')
            )
            if token:
                self.token = token
                logger.info("登录成功")
        
        return response
    
    def logout(self):
        """登出"""
        self.token = None
        self.refresh_token = None
        self.session.cookies.clear()
    
    # ===== API方法 =====
    {''.join(methods)}


class AuthenticationError(Exception):
    """认证错误"""
    pass


class APIError(Exception):
    """API错误"""
    pass


# 异步版本
class Async{self.class_name}Client:
    """异步版本的客户端（需要 aiohttp）"""
    
    def __init__(self, base_url: str = "{self.analysis['site_url']}"):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self._session = None
    
    async def __aenter__(self):
        import aiohttp
        self._session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()
    
    async def _request(self, method: str, url: str, **kwargs) -> dict:
        """异步请求"""
        headers = kwargs.pop('headers', {{}})
        if self.token:
            headers['Authorization'] = f'Bearer {{self.token}}'
        
        async with self._session.request(method, url, headers=headers, **kwargs) as resp:
            return await resp.json()
    
    # 异步方法可以从同步版本复制，添加 async/await


if __name__ == "__main__":
    # 使用示例
    client = {self.class_name}Client()
    
    # 登录
    # result = client.login("username", "password")
    # print(result)
    
    # 调用其他接口
    # data = client.get_users()
    # print(data)
'''
        
        return sdk_code
    
    def generate_php_sdk(self) -> str:
        """生成PHP SDK"""
        
        # 按分类分组端点
        categories = {}
        for endpoint in self.analysis['endpoints']:
            cat = endpoint['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(endpoint)
        
        # 生成方法代码
        methods = []
        method_names = set()
        
        for category, endpoints in categories.items():
            methods.append(f"\n    // ===== {category} =====")
            
            for ep in endpoints:
                method_name = self._to_method_name(ep['path'], ep['method'])
                method_name = self._to_camel_case(method_name)
                
                # 处理重名
                original_name = method_name
                counter = 1
                while method_name in method_names:
                    method_name = f"{original_name}{counter}"
                    counter += 1
                method_names.add(method_name)
                
                # 解析参数
                params = self._parse_params_from_body(ep.get('request_body', ''))
                
                # 构建方法
                method_code = f'''
    /**
     * {ep['method']} {ep['path']}
     * 
     * 分类: {category}
     * 认证: {'需要' if ep['auth_required'] else '不需要'}
     *
     * @param array $params 请求参数
     * @return array API响应
     */
    public function {method_name}(array $params = []): array
    {{
        $url = "{ep['path']}";
        return $this->request("{ep['method']}", $url, $params);
    }}'''
                
                methods.append(method_code)
        
        # 完整的PHP SDK代码
        sdk_code = f'''<?php
/**
 * {self.class_name} SDK
 * 
 * 自动生成时间: {datetime.now().isoformat()}
 * 目标网站: {self.analysis['site_url']}
 * 
 * 使用示例:
 *   $client = new {self.class_name}Client();
 *   $client->login('username', 'password');
 *   $result = $client->getUsers();
 */

namespace {self.class_name};

class {self.class_name}Client
{{
    private string $baseUrl;
    private ?string $token = null;
    private int $timeout;
    private array $headers = [];
    
    /**
     * 构造函数
     *
     * @param string $baseUrl API基础URL
     * @param int $timeout 超时时间（秒）
     */
    public function __construct(
        string $baseUrl = "{self.analysis['site_url']}",
        int $timeout = 30
    ) {{
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
        $this->headers = [
            'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ];
    }}
    
    /**
     * 发送HTTP请求
     *
     * @param string $method HTTP方法
     * @param string $url 请求路径
     * @param array $params 请求参数
     * @return array 响应数据
     */
    private function request(string $method, string $url, array $params = []): array
    {{
        $fullUrl = $this->baseUrl . $url;
        
        $headers = $this->headers;
        if ($this->token) {{
            $headers['Authorization'] = 'Bearer ' . $this->token;
        }}
        
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $fullUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $this->formatHeaders($headers),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        
        switch (strtoupper($method)) {{
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
                break;
            case 'PUT':
            case 'PATCH':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
                break;
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
            case 'GET':
                if (!empty($params)) {{
                    $fullUrl .= '?' . http_build_query($params);
                    curl_setopt($ch, CURLOPT_URL, $fullUrl);
                }}
                break;
        }}
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {{
            throw new \\Exception("请求失败: " . $error);
        }}
        
        if ($httpCode === 401) {{
            throw new AuthenticationException("认证失败，请重新登录");
        }}
        
        $data = json_decode($response, true);
        return $data ?? ['raw' => $response];
    }}
    
    /**
     * 格式化请求头
     */
    private function formatHeaders(array $headers): array
    {{
        $formatted = [];
        foreach ($headers as $key => $value) {{
            $formatted[] = "$key: $value";
        }}
        return $formatted;
    }}
    
    /**
     * 设置Token
     *
     * @param string $token 访问令牌
     */
    public function setToken(string $token): void
    {{
        $this->token = $token;
    }}
    
    /**
     * 登录
     *
     * @param string $username 用户名
     * @param string $password 密码
     * @return array 登录响应
     */
    public function login(string $username, string $password): array
    {{
        $result = $this->request('POST', '{self.analysis.get('login_endpoint', '/api/auth/login')}', [
            'username' => $username,
            'password' => $password
        ]);
        
        // 提取Token
        $token = $result['{self.analysis.get('token_field', 'token')}'] 
            ?? $result['data']['{self.analysis.get('token_field', 'token')}'] 
            ?? $result['access_token']
            ?? $result['data']['access_token'] 
            ?? null;
        
        if ($token) {{
            $this->token = $token;
        }}
        
        return $result;
    }}
    
    /**
     * 登出
     */
    public function logout(): void
    {{
        $this->token = null;
    }}
    
    // ===== API方法 =====
    {''.join(methods)}
}}

class AuthenticationException extends \\Exception {{}}
class APIException extends \\Exception {{}}
'''
        
        return sdk_code
    
    def _to_camel_case(self, name: str) -> str:
        """转换为驼峰命名"""
        parts = name.split('_')
        return parts[0] + ''.join(p.capitalize() for p in parts[1:])
    
    def generate(self, template: str = "python") -> str:
        """
        生成SDK代码
        
        Args:
            template: 模板类型 (python/php)
        
        Returns:
            str: 生成的代码
        """
        if template == "python":
            code = self.generate_python_sdk()
            ext = "py"
        elif template == "php":
            code = self.generate_php_sdk()
            ext = "php"
        else:
            raise ValueError(f"不支持的模板类型: {template}")
        
        # 保存文件
        output_file = self.output_dir / f"{self.site_name}_sdk.{ext}"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"[√] SDK已生成: {output_file}")
        return code


def main():
    parser = argparse.ArgumentParser(description='SDK代码生成器')
    parser.add_argument('--input', '-i', required=True, help='分析结果JSON文件路径')
    parser.add_argument('--template', '-t', choices=['python', 'php'], default='python', help='SDK模板类型')
    parser.add_argument('--output', '-o', default='./output', help='输出目录')
    
    args = parser.parse_args()
    
    generator = SDKGenerator(args.input, args.output)
    generator.generate(args.template)


if __name__ == "__main__":
    main()
