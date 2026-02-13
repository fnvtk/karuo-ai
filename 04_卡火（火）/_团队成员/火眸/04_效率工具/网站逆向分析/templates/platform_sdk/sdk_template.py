#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第三方平台SDK模板
基于实战经验总结的最佳实践

使用方法：
1. 复制本文件，重命名为 xxx_sdk.py
2. 修改 BASE_URL 和 API 端点
3. 根据实际API调整参数和返回值

依赖：
- httpx (异步HTTP客户端)
- loguru (日志)
"""

import os
import json
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import asyncio

try:
    import httpx
    from loguru import logger
except ImportError:
    print("请安装依赖: pip install httpx loguru")
    exit(1)


# ============== 数据模型 ==============

@dataclass
class PlatformUser:
    """平台用户/账号"""
    id: int
    nickname: str
    avatar: str = ""
    unique_id: str = ""          # 平台唯一标识（如抖音号）
    follower_count: int = 0
    following_count: int = 0
    status: int = 1              # 1=正常
    user_type: str = ""          # 账号类型（如 douyin/kuaishou）
    raw_data: Dict = field(default_factory=dict)  # 原始数据


@dataclass
class PlatformTask:
    """发布任务"""
    id: int
    name: str
    status: str                  # pending/processing/completed/failed
    video_url: str = ""
    user_ids: List[int] = field(default_factory=list)
    created_at: str = ""
    completed_at: str = ""
    error_message: str = ""
    raw_data: Dict = field(default_factory=dict)


@dataclass
class UploadResult:
    """上传结果"""
    success: bool
    url: str = ""                # 上传后的公网URL
    file_id: str = ""
    error: str = ""


@dataclass
class TaskResult:
    """任务创建结果"""
    success: bool
    task_id: int = 0
    message: str = ""
    error: str = ""


# ============== SDK实现 ==============

class PlatformSDK:
    """
    第三方平台SDK模板
    
    使用示例：
        sdk = PlatformSDK()
        await sdk.login("username", "password")
        
        # 获取账号列表
        users = await sdk.get_users()
        
        # 上传视频
        result = await sdk.upload_video("/path/to/video.mp4")
        
        # 创建发布任务
        task = await sdk.create_task(
            task_name="测试任务",
            video_url=result.url,
            user_ids=[users[0].id]
        )
        
        await sdk.close()
    """
    
    # 配置（根据实际平台修改）
    BASE_URL = "https://api.example.com"
    
    def __init__(self, timeout: float = 30.0):
        """
        初始化SDK
        
        Args:
            timeout: 请求超时时间（秒）
        """
        self.client = httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True
        )
        self.token: Optional[str] = None
        self.user_info: Optional[Dict] = None
    
    # ---------- 认证相关 ----------
    
    async def login(self, username: str, password: str) -> bool:
        """
        登录获取Token
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            是否登录成功
        """
        try:
            # 密码加密（根据平台要求修改）
            # 有些平台用MD5，有些用SHA256，有些用明文
            password_hash = hashlib.md5(password.encode()).hexdigest()
            
            resp = await self.client.post(
                f"{self.BASE_URL}/api/login",
                json={
                    "username": username,
                    "password": password_hash
                }
            )
            
            data = resp.json()
            
            # 检查返回格式（根据实际API调整）
            if data.get("code") == 0 or data.get("success"):
                self.token = data.get("data", {}).get("token")
                self.user_info = data.get("data", {}).get("user")
                
                # 设置Authorization头
                self.client.headers["Authorization"] = f"Bearer {self.token}"
                
                logger.info(f"登录成功: {username}")
                return True
            else:
                logger.error(f"登录失败: {data.get('msg', '未知错误')}")
                return False
                
        except Exception as e:
            logger.exception(f"登录异常: {e}")
            return False
    
    async def logout(self):
        """登出"""
        try:
            await self.client.post(f"{self.BASE_URL}/api/logout")
        except:
            pass
        finally:
            self.token = None
            self.user_info = None
            self.client.headers.pop("Authorization", None)
    
    # ---------- 用户/账号相关 ----------
    
    async def get_users(
        self, 
        page: int = 1, 
        page_size: int = 100,
        platform_type: str = ""
    ) -> List[PlatformUser]:
        """
        获取授权账号列表
        
        Args:
            page: 页码
            page_size: 每页数量
            platform_type: 平台类型筛选（如 douyin/kuaishou）
            
        Returns:
            账号列表
        """
        try:
            params = {
                "page": page,
                "pageSize": page_size,  # 注意：有些API用pageSize，有些用page_size
            }
            if platform_type:
                params["platformType"] = platform_type
            
            resp = await self.client.get(
                f"{self.BASE_URL}/api/users",
                params=params
            )
            
            data = resp.json()
            
            if data.get("code") != 0:
                logger.error(f"获取账号失败: {data.get('msg')}")
                return []
            
            # 解析账号列表（根据实际返回格式调整）
            user_list = data.get("data", {}).get("list", [])
            
            users = []
            for u in user_list:
                users.append(PlatformUser(
                    id=u.get("id"),
                    nickname=u.get("nickname", u.get("name", "")),
                    avatar=u.get("avatar", ""),
                    unique_id=u.get("unique_id", u.get("uniqueId", "")),
                    follower_count=u.get("follower_count", u.get("followerCount", 0)),
                    following_count=u.get("following_count", u.get("followingCount", 0)),
                    status=u.get("status", 1),
                    user_type=u.get("user_type", u.get("userType", u.get("platform_type", ""))),
                    raw_data=u
                ))
            
            logger.info(f"获取到 {len(users)} 个账号")
            return users
            
        except Exception as e:
            logger.exception(f"获取账号异常: {e}")
            return []
    
    # ---------- 视频上传相关 ----------
    
    async def upload_video(self, file_path: str) -> UploadResult:
        """
        上传视频到平台OSS
        
        重要：本地视频必须先上传到平台OSS，获取公网URL后才能创建发布任务！
        
        Args:
            file_path: 本地视频文件路径
            
        Returns:
            上传结果，包含公网URL
        """
        if not os.path.exists(file_path):
            return UploadResult(
                success=False,
                error=f"文件不存在: {file_path}"
            )
        
        try:
            # Step 1: 获取上传凭证
            logger.info("获取上传凭证...")
            resp = await self.client.post(
                f"{self.BASE_URL}/api/upload/token",
                json={
                    "filename": os.path.basename(file_path),
                    "filesize": os.path.getsize(file_path)
                }
            )
            
            token_data = resp.json()
            if token_data.get("code") != 0:
                return UploadResult(
                    success=False,
                    error=f"获取上传凭证失败: {token_data.get('msg')}"
                )
            
            upload_info = token_data.get("data", {})
            upload_url = upload_info.get("upload_url")
            
            # Step 2: 上传文件到OSS
            logger.info(f"上传视频: {file_path}")
            with open(file_path, "rb") as f:
                # 根据平台要求构造请求（有些用multipart，有些用binary）
                files = {"file": (os.path.basename(file_path), f, "video/mp4")}
                
                # 如果有额外的上传参数（如签名），需要带上
                form_data = upload_info.get("form_data", {})
                
                resp = await self.client.post(
                    upload_url,
                    files=files,
                    data=form_data,
                    timeout=300.0  # 上传超时设长一点
                )
            
            upload_result = resp.json()
            
            # Step 3: 获取公网URL
            # 有些平台直接返回URL，有些需要拼接
            video_url = upload_result.get("url") or upload_result.get("data", {}).get("url")
            
            if not video_url:
                # 尝试从上传凭证拼接URL
                bucket_url = upload_info.get("bucket_url", "")
                file_key = upload_info.get("key", "")
                video_url = f"{bucket_url}/{file_key}" if bucket_url and file_key else ""
            
            if video_url:
                logger.success(f"上传成功: {video_url}")
                return UploadResult(
                    success=True,
                    url=video_url,
                    file_id=upload_result.get("file_id", "")
                )
            else:
                return UploadResult(
                    success=False,
                    error="上传成功但未获取到URL"
                )
            
        except Exception as e:
            logger.exception(f"上传视频异常: {e}")
            return UploadResult(
                success=False,
                error=str(e)
            )
    
    # ---------- 任务相关 ----------
    
    async def create_task(
        self,
        task_name: str,          # 注意：不是title！
        video_url: str,           # 必须是公网URL
        user_ids: List[int],      # 要发布的账号ID列表
        title_id: int = 0,        # 标题模板ID（如果平台支持）
        keyword_id: int = 0,      # 关键词模板ID
        desc_id: int = 0,         # 描述模板ID
        is_dedup: bool = True,    # 是否去重
        schedule_time: datetime = None,  # 定时发布
        **kwargs                  # 其他平台特定参数
    ) -> TaskResult:
        """
        创建发布任务
        
        重要：
        1. video_url 必须是公网可访问的URL，不能是localhost
        2. user_ids 必须是平台上已授权的账号ID
        
        Args:
            task_name: 任务名称（不是视频标题！）
            video_url: 视频公网URL
            user_ids: 账号ID列表
            其他参数根据平台需求
            
        Returns:
            任务创建结果
        """
        if not video_url.startswith("http"):
            return TaskResult(
                success=False,
                error="video_url必须是公网URL，请先调用upload_video上传视频"
            )
        
        try:
            payload = {
                "task_name": task_name,     # 有些平台用taskName
                "video_url": video_url,     # 有些平台用videoUrl
                "user_ids": user_ids,       # 有些平台用userIds
                "is_dedup": is_dedup,
            }
            
            # 可选参数
            if title_id:
                payload["title_id"] = title_id
            if keyword_id:
                payload["keyword_id"] = keyword_id
            if desc_id:
                payload["desc_id"] = desc_id
            if schedule_time:
                payload["schedule_time"] = schedule_time.isoformat()
            
            # 合并额外参数
            payload.update(kwargs)
            
            logger.info(f"创建任务: {task_name}, 账号数: {len(user_ids)}")
            
            resp = await self.client.post(
                f"{self.BASE_URL}/api/task/create",
                json=payload
            )
            
            data = resp.json()
            
            if data.get("code") == 0 or data.get("success"):
                task_id = data.get("data", {}).get("task_id", 0)
                logger.success(f"任务创建成功: ID={task_id}")
                return TaskResult(
                    success=True,
                    task_id=task_id,
                    message="任务创建成功"
                )
            else:
                error_msg = data.get("msg", data.get("message", "未知错误"))
                logger.error(f"任务创建失败: {error_msg}")
                return TaskResult(
                    success=False,
                    error=error_msg
                )
                
        except Exception as e:
            logger.exception(f"创建任务异常: {e}")
            return TaskResult(
                success=False,
                error=str(e)
            )
    
    async def get_task_status(self, task_id: int) -> Optional[PlatformTask]:
        """
        查询任务状态
        
        Args:
            task_id: 任务ID
            
        Returns:
            任务详情
        """
        try:
            resp = await self.client.get(
                f"{self.BASE_URL}/api/task/{task_id}"
            )
            
            data = resp.json()
            
            if data.get("code") != 0:
                logger.error(f"查询任务失败: {data.get('msg')}")
                return None
            
            task_data = data.get("data", {})
            
            return PlatformTask(
                id=task_data.get("id"),
                name=task_data.get("name", task_data.get("task_name", "")),
                status=task_data.get("status", ""),
                video_url=task_data.get("video_url", ""),
                user_ids=task_data.get("user_ids", []),
                created_at=task_data.get("created_at", ""),
                completed_at=task_data.get("completed_at", ""),
                error_message=task_data.get("error_message", ""),
                raw_data=task_data
            )
            
        except Exception as e:
            logger.exception(f"查询任务异常: {e}")
            return None
    
    # ---------- 工具方法 ----------
    
    async def close(self):
        """关闭连接"""
        await self.client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# ============== 使用示例 ==============

async def main():
    """使用示例"""
    
    # 从环境变量读取凭证
    username = os.environ.get("PLATFORM_USERNAME", "test")
    password = os.environ.get("PLATFORM_PASSWORD", "test")
    
    async with PlatformSDK() as sdk:
        # 1. 登录
        if not await sdk.login(username, password):
            print("登录失败")
            return
        
        # 2. 获取账号列表
        users = await sdk.get_users()
        print(f"账号数: {len(users)}")
        for u in users[:3]:  # 打印前3个
            print(f"  - {u.nickname} ({u.user_type})")
        
        if not users:
            print("没有可用账号")
            return
        
        # 3. 上传视频（如果有本地文件）
        video_path = os.environ.get("VIDEO_PATH", "")
        if video_path and os.path.exists(video_path):
            upload_result = await sdk.upload_video(video_path)
            if not upload_result.success:
                print(f"上传失败: {upload_result.error}")
                return
            video_url = upload_result.url
        else:
            # 使用测试URL
            video_url = "https://example.com/test.mp4"
        
        # 4. 创建发布任务
        result = await sdk.create_task(
            task_name=f"测试任务-{datetime.now().strftime('%H%M')}",
            video_url=video_url,
            user_ids=[users[0].id],
            is_dedup=True
        )
        
        if result.success:
            print(f"任务创建成功: ID={result.task_id}")
            
            # 5. 查询任务状态
            await asyncio.sleep(3)
            task = await sdk.get_task_status(result.task_id)
            if task:
                print(f"任务状态: {task.status}")
        else:
            print(f"任务创建失败: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())
