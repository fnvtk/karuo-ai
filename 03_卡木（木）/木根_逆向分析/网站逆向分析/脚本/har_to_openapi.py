#!/usr/bin/env python3
"""
HAR转OpenAPI工具
整合mitmproxy2swagger和har2openapi的最佳实践

功能：
1. 解析HAR文件，提取API端点
2. 智能路径参数化（/users/123 → /users/{id}）
3. 自动推断请求/响应Schema
4. 生成OpenAPI 3.0规范
5. 可选：直接调用openapi-python-client生成SDK

使用方法：
    python har_to_openapi.py --input api.har --base-url https://api.example.com --output api_spec.yaml
    python har_to_openapi.py --input api.har --base-url https://api.example.com --output api_spec.yaml --generate-sdk
"""

import json
import yaml
import re
import hashlib
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from collections import defaultdict


class HARToOpenAPI:
    """HAR转OpenAPI转换器"""
    
    def __init__(self, har_file: str, base_url: str, output_dir: str = "./output"):
        self.har_file = Path(har_file)
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(base_url)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 存储提取的端点
        self.endpoints: List[Dict] = []
        self.schemas: Dict[str, Any] = {}
        self.security_schemes: Dict[str, Any] = {}
        
        # 路径参数模式
        self.param_patterns = [
            (r'/(\d+)(?=/|$)', '/{id}', 'id', 'integer'),  # 数字ID
            (r'/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=/|$)', 
             '/{uuid}', 'uuid', 'string'),  # UUID
            (r'/([0-9a-f]{24})(?=/|$)', '/{objectId}', 'objectId', 'string'),  # MongoDB ObjectId
            (r'/(@[a-zA-Z0-9_]+)(?=/|$)', '/{username}', 'username', 'string'),  # @用户名
        ]
        
        # API请求特征
        self.api_patterns = [
            r'/api/',
            r'/v\d+/',
            r'/rest/',
            r'/graphql',
            r'\.json$',
            r'/ajax/',
            r'/rpc/',
        ]
        
        # 忽略的资源类型
        self.ignore_extensions = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', 
            '.woff', '.woff2', '.ttf', '.svg', '.map', '.webp'
        }
    
    def load_har(self) -> Dict[str, Any]:
        """加载HAR文件"""
        with open(self.har_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _is_api_request(self, url: str, response: Dict) -> bool:
        """判断是否为API请求"""
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # 检查是否为静态资源
        for ext in self.ignore_extensions:
            if path.endswith(ext):
                return False
        
        # 检查Content-Type
        content_type = ''
        for header in response.get('headers', []):
            if header['name'].lower() == 'content-type':
                content_type = header['value'].lower()
                break
        
        # JSON响应通常是API
        if 'application/json' in content_type or 'text/json' in content_type:
            return True
        
        # 检查URL模式
        for pattern in self.api_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True
        
        return False
    
    def _parameterize_path(self, path: str) -> Tuple[str, List[Dict]]:
        """
        路径参数化
        
        Returns:
            Tuple[str, List[Dict]]: (参数化后的路径, 路径参数列表)
        """
        params = []
        
        for pattern, replacement, param_name, param_type in self.param_patterns:
            matches = list(re.finditer(pattern, path, re.IGNORECASE))
            
            for i, match in enumerate(matches):
                # 如果有多个相同类型的参数，添加序号
                actual_name = f"{param_name}{i+1}" if len(matches) > 1 else param_name
                actual_replacement = replacement.replace(param_name, actual_name)
                
                path = path[:match.start()] + actual_replacement + path[match.end():]
                
                params.append({
                    'name': actual_name.strip('{}'),
                    'in': 'path',
                    'required': True,
                    'schema': {'type': param_type},
                    'example': match.group(1)
                })
        
        return path, params
    
    def _extract_query_params(self, url: str) -> List[Dict]:
        """提取查询参数"""
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        params = []
        for name, values in query_params.items():
            value = values[0] if values else ''
            
            # 推断类型
            param_type = 'string'
            if value.isdigit():
                param_type = 'integer'
            elif value.lower() in ('true', 'false'):
                param_type = 'boolean'
            elif re.match(r'^-?\d+\.\d+$', value):
                param_type = 'number'
            
            params.append({
                'name': name,
                'in': 'query',
                'required': False,
                'schema': {'type': param_type},
                'example': value
            })
        
        return params
    
    def _extract_headers(self, headers: List[Dict]) -> Tuple[List[Dict], Dict]:
        """
        提取请求头
        
        Returns:
            Tuple[List[Dict], Dict]: (头参数列表, 安全方案)
        """
        header_params = []
        security = {}
        
        # 需要记录的头
        important_headers = {
            'x-api-key', 'x-auth-token', 'x-request-id', 'x-correlation-id',
            'x-tenant-id', 'x-user-id', 'accept-language'
        }
        
        for header in headers:
            name = header['name'].lower()
            value = header['value']
            
            # 检测认证方式
            if name == 'authorization':
                if value.lower().startswith('bearer '):
                    security = {'bearerAuth': []}
                    self.security_schemes['bearerAuth'] = {
                        'type': 'http',
                        'scheme': 'bearer',
                        'bearerFormat': 'JWT'
                    }
                elif value.lower().startswith('basic '):
                    security = {'basicAuth': []}
                    self.security_schemes['basicAuth'] = {
                        'type': 'http',
                        'scheme': 'basic'
                    }
            
            # 检测API Key
            if name in ('x-api-key', 'api-key', 'apikey'):
                security = {'apiKeyAuth': []}
                self.security_schemes['apiKeyAuth'] = {
                    'type': 'apiKey',
                    'in': 'header',
                    'name': header['name']
                }
            
            # 记录重要的自定义头
            if name in important_headers:
                header_params.append({
                    'name': header['name'],
                    'in': 'header',
                    'required': False,
                    'schema': {'type': 'string'},
                    'example': value
                })
        
        return header_params, security
    
    def _infer_json_schema(self, data: Any, max_depth: int = 5) -> Dict:
        """
        从JSON数据推断Schema
        
        Args:
            data: JSON数据
            max_depth: 最大递归深度
        """
        if max_depth <= 0:
            return {'type': 'object'}
        
        if data is None:
            return {'type': 'null'}
        
        if isinstance(data, bool):
            return {'type': 'boolean'}
        
        if isinstance(data, int):
            return {'type': 'integer'}
        
        if isinstance(data, float):
            return {'type': 'number'}
        
        if isinstance(data, str):
            # 尝试识别格式
            if re.match(r'^\d{4}-\d{2}-\d{2}$', data):
                return {'type': 'string', 'format': 'date'}
            if re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', data):
                return {'type': 'string', 'format': 'date-time'}
            if re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', data):
                return {'type': 'string', 'format': 'email'}
            if re.match(r'^https?://', data):
                return {'type': 'string', 'format': 'uri'}
            if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', data, re.I):
                return {'type': 'string', 'format': 'uuid'}
            return {'type': 'string'}
        
        if isinstance(data, list):
            if not data:
                return {'type': 'array', 'items': {}}
            
            # 取第一个元素推断items类型
            items_schema = self._infer_json_schema(data[0], max_depth - 1)
            return {'type': 'array', 'items': items_schema}
        
        if isinstance(data, dict):
            properties = {}
            required = []
            
            for key, value in data.items():
                properties[key] = self._infer_json_schema(value, max_depth - 1)
                if value is not None:
                    required.append(key)
            
            schema = {'type': 'object', 'properties': properties}
            if required:
                schema['required'] = required
            
            return schema
        
        return {'type': 'string'}
    
    def _extract_request_body(self, request: Dict) -> Optional[Dict]:
        """提取请求体"""
        post_data = request.get('postData', {})
        
        if not post_data:
            return None
        
        mime_type = post_data.get('mimeType', '')
        text = post_data.get('text', '')
        
        if not text:
            return None
        
        content = {}
        
        if 'application/json' in mime_type:
            try:
                json_data = json.loads(text)
                schema = self._infer_json_schema(json_data)
                content['application/json'] = {
                    'schema': schema,
                    'example': json_data
                }
            except json.JSONDecodeError:
                content['application/json'] = {
                    'schema': {'type': 'object'}
                }
        
        elif 'application/x-www-form-urlencoded' in mime_type:
            params = post_data.get('params', [])
            properties = {}
            for param in params:
                properties[param['name']] = {'type': 'string'}
            
            content['application/x-www-form-urlencoded'] = {
                'schema': {
                    'type': 'object',
                    'properties': properties
                }
            }
        
        elif 'multipart/form-data' in mime_type:
            params = post_data.get('params', [])
            properties = {}
            for param in params:
                if param.get('fileName'):
                    properties[param['name']] = {
                        'type': 'string',
                        'format': 'binary'
                    }
                else:
                    properties[param['name']] = {'type': 'string'}
            
            content['multipart/form-data'] = {
                'schema': {
                    'type': 'object',
                    'properties': properties
                }
            }
        
        else:
            content['text/plain'] = {
                'schema': {'type': 'string'}
            }
        
        return {'content': content} if content else None
    
    def _extract_response(self, response: Dict) -> Tuple[int, Dict]:
        """提取响应"""
        status = response.get('status', 200)
        content = response.get('content', {})
        mime_type = content.get('mimeType', '')
        text = content.get('text', '')
        
        response_content = {}
        
        if text and 'application/json' in mime_type:
            try:
                json_data = json.loads(text)
                schema = self._infer_json_schema(json_data)
                
                # 限制example大小
                example = json_data
                if len(text) > 5000:
                    example = None
                
                response_content['application/json'] = {
                    'schema': schema
                }
                if example:
                    response_content['application/json']['example'] = example
                    
            except json.JSONDecodeError:
                response_content['application/json'] = {
                    'schema': {'type': 'object'}
                }
        
        return status, response_content
    
    def _generate_operation_id(self, method: str, path: str) -> str:
        """生成operationId"""
        # 移除路径参数的大括号
        clean_path = re.sub(r'\{[^}]+\}', '', path)
        
        # 转换为camelCase
        parts = [p for p in clean_path.split('/') if p]
        
        if not parts:
            parts = ['root']
        
        # 动词映射
        verb_map = {
            'get': 'get',
            'post': 'create',
            'put': 'update',
            'patch': 'patch',
            'delete': 'delete'
        }
        
        verb = verb_map.get(method.lower(), method.lower())
        
        # 如果路径本身包含动词，不添加前缀
        first_part = parts[0].lower()
        if first_part in verb_map.values() or first_part in ['list', 'search', 'query', 'login', 'logout']:
            return ''.join([first_part] + [p.capitalize() for p in parts[1:]])
        
        return verb + ''.join([p.capitalize() for p in parts])
    
    def extract_endpoints(self) -> List[Dict]:
        """提取所有API端点"""
        har = self.load_har()
        seen = set()
        
        for entry in har['log']['entries']:
            request = entry['request']
            response = entry['response']
            
            url = request['url']
            method = request['method'].upper()
            
            # 过滤非目标域名
            parsed = urlparse(url)
            if self.parsed_base.netloc and parsed.netloc != self.parsed_base.netloc:
                continue
            
            # 过滤非API请求
            if not self._is_api_request(url, response):
                continue
            
            # 路径参数化
            path = parsed.path
            path, path_params = self._parameterize_path(path)
            
            # 去重（同方法同路径）
            key = f"{method}:{path}"
            if key in seen:
                continue
            seen.add(key)
            
            # 提取查询参数
            query_params = self._extract_query_params(url)
            
            # 提取头参数和安全方案
            header_params, security = self._extract_headers(request.get('headers', []))
            
            # 提取请求体
            request_body = self._extract_request_body(request)
            
            # 提取响应
            status_code, response_content = self._extract_response(response)
            
            # 生成operationId
            operation_id = self._generate_operation_id(method, path)
            
            endpoint = {
                'path': path,
                'method': method.lower(),
                'operationId': operation_id,
                'summary': f'{method} {path}',
                'parameters': path_params + query_params + header_params,
                'requestBody': request_body,
                'responses': {
                    str(status_code): {
                        'description': 'Successful response' if status_code < 400 else 'Error response',
                        'content': response_content
                    }
                },
                'security': [security] if security else None
            }
            
            self.endpoints.append(endpoint)
            print(f"  [+] 发现接口: {method} {path}")
        
        return self.endpoints
    
    def generate_openapi(self) -> Dict:
        """生成OpenAPI规范"""
        if not self.endpoints:
            self.extract_endpoints()
        
        spec = {
            'openapi': '3.0.3',
            'info': {
                'title': f'{self.parsed_base.netloc} API',
                'version': '1.0.0',
                'description': f'自动生成自 {self.har_file.name}\n\n生成时间: {datetime.now().isoformat()}'
            },
            'servers': [
                {'url': self.base_url, 'description': '目标服务器'}
            ],
            'paths': {},
            'components': {
                'securitySchemes': self.security_schemes or {
                    'bearerAuth': {
                        'type': 'http',
                        'scheme': 'bearer'
                    }
                }
            }
        }
        
        # 组织paths
        for endpoint in self.endpoints:
            path = endpoint['path']
            method = endpoint['method']
            
            if path not in spec['paths']:
                spec['paths'][path] = {}
            
            operation = {
                'operationId': endpoint['operationId'],
                'summary': endpoint['summary'],
                'responses': endpoint['responses']
            }
            
            if endpoint['parameters']:
                operation['parameters'] = endpoint['parameters']
            
            if endpoint['requestBody']:
                operation['requestBody'] = endpoint['requestBody']
            
            if endpoint['security']:
                operation['security'] = endpoint['security']
            
            spec['paths'][path][method] = operation
        
        return spec
    
    def save(self, output_path: str = None) -> Path:
        """保存OpenAPI规范"""
        spec = self.generate_openapi()
        
        if output_path is None:
            site_name = self.parsed_base.netloc.replace('.', '_')
            output_path = self.output_dir / f"{site_name}_openapi.yaml"
        else:
            output_path = Path(output_path)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(spec, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        
        print(f"\n[√] OpenAPI规范已保存: {output_path}")
        return output_path
    
    def generate_sdk(self, spec_path: Path) -> bool:
        """
        使用openapi-python-client生成SDK
        
        需要先安装: pip install openapi-python-client
        """
        try:
            # 检查是否安装了openapi-python-client
            result = subprocess.run(
                ['openapi-python-client', '--version'],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print("[!] openapi-python-client未安装，请运行: pip install openapi-python-client")
                return False
            
            # 生成SDK
            sdk_output = self.output_dir / "sdk"
            
            result = subprocess.run(
                ['openapi-python-client', 'generate', '--path', str(spec_path), '--output-path', str(sdk_output)],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"[√] Python SDK已生成: {sdk_output}")
                return True
            else:
                print(f"[!] SDK生成失败: {result.stderr}")
                return False
                
        except FileNotFoundError:
            print("[!] openapi-python-client未安装，请运行: pip install openapi-python-client")
            return False


def main():
    parser = argparse.ArgumentParser(description='HAR转OpenAPI工具')
    parser.add_argument('--input', '-i', required=True, help='HAR文件路径')
    parser.add_argument('--base-url', '-b', required=True, help='API基础URL')
    parser.add_argument('--output', '-o', help='输出文件路径')
    parser.add_argument('--output-dir', '-d', default='./output', help='输出目录')
    parser.add_argument('--generate-sdk', '-s', action='store_true', help='同时生成Python SDK')
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"HAR转OpenAPI工具")
    print(f"{'='*60}")
    print(f"输入: {args.input}")
    print(f"基础URL: {args.base_url}")
    print(f"{'='*60}\n")
    
    converter = HARToOpenAPI(
        har_file=args.input,
        base_url=args.base_url,
        output_dir=args.output_dir
    )
    
    spec_path = converter.save(args.output)
    
    if args.generate_sdk:
        print("\n[*] 正在生成Python SDK...")
        converter.generate_sdk(spec_path)
    
    # 打印统计
    print(f"\n{'='*60}")
    print(f"完成！共发现 {len(converter.endpoints)} 个接口")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
