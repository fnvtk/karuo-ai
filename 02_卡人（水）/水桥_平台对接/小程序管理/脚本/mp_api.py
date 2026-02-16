#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信小程序管理API封装
支持：注册、配置、代码管理、审核、发布、数据分析
"""

import os
import json
import time
import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from pathlib import Path

# 尝试加载dotenv（可选依赖）
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv不是必需的


@dataclass
class MiniProgramInfo:
    """小程序基础信息"""
    appid: str
    nickname: str
    head_image_url: str
    signature: str
    principal_name: str
    realname_status: int  # 1=已认证


@dataclass
class AuditStatus:
    """审核状态"""
    auditid: int
    status: int  # 0=成功，1=被拒，2=审核中，3=已撤回，4=延后
    reason: Optional[str] = None
    screenshot: Optional[str] = None

    @property
    def status_text(self) -> str:
        status_map = {
            0: "✅ 审核成功",
            1: "❌ 审核被拒",
            2: "⏳ 审核中",
            3: "↩️ 已撤回",
            4: "⏸️ 审核延后"
        }
        return status_map.get(self.status, "未知状态")


class MiniProgramAPI:
    """微信小程序管理API"""
    
    BASE_URL = "https://api.weixin.qq.com"
    
    def __init__(
        self,
        component_appid: Optional[str] = None,
        component_appsecret: Optional[str] = None,
        authorizer_appid: Optional[str] = None,
        access_token: Optional[str] = None
    ):
        """
        初始化API
        
        Args:
            component_appid: 第三方平台AppID
            component_appsecret: 第三方平台密钥
            authorizer_appid: 授权小程序AppID
            access_token: 直接使用的access_token（如已获取）
        """
        self.component_appid = component_appid or os.getenv("COMPONENT_APPID")
        self.component_appsecret = component_appsecret or os.getenv("COMPONENT_APPSECRET")
        self.authorizer_appid = authorizer_appid or os.getenv("AUTHORIZER_APPID")
        self._access_token = access_token or os.getenv("ACCESS_TOKEN")
        self._token_expires_at = 0
        
        self.client = httpx.Client(timeout=30.0)
    
    @property
    def access_token(self) -> str:
        """获取access_token，如果过期则刷新"""
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token
        
        # 如果没有配置刷新token的信息，直接返回现有token
        if not self.component_appid:
            return self._access_token or ""
        
        # TODO: 实现token刷新逻辑
        return self._access_token or ""
    
    def set_access_token(self, token: str, expires_in: int = 7200):
        """手动设置access_token"""
        self._access_token = token
        self._token_expires_at = time.time() + expires_in - 300  # 提前5分钟过期
    
    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """发起API请求"""
        url = f"{self.BASE_URL}{path}"
        
        # 添加access_token
        if params is None:
            params = {}
        if "access_token" not in params:
            params["access_token"] = self.access_token
        
        if method.upper() == "GET":
            resp = self.client.get(url, params=params, **kwargs)
        else:
            resp = self.client.post(url, params=params, json=json_data, **kwargs)
        
        # 解析响应
        try:
            result = resp.json()
        except json.JSONDecodeError:
            # 可能是二进制数据（如图片）
            return {"_binary": resp.content}
        
        # 检查错误
        if result.get("errcode", 0) != 0:
            raise APIError(result.get("errcode"), result.get("errmsg", "Unknown error"))
        
        return result
    
    # ==================== 基础信息 ====================
    
    def get_basic_info(self) -> MiniProgramInfo:
        """获取小程序基础信息"""
        result = self._request("POST", "/cgi-bin/account/getaccountbasicinfo")
        return MiniProgramInfo(
            appid=result.get("appid", ""),
            nickname=result.get("nickname", ""),
            head_image_url=result.get("head_image_url", ""),
            signature=result.get("signature", ""),
            principal_name=result.get("principal_name", ""),
            realname_status=result.get("realname_status", 0)
        )
    
    def modify_signature(self, signature: str) -> bool:
        """修改简介（4-120字）"""
        self._request("POST", "/cgi-bin/account/modifysignature", json_data={
            "signature": signature
        })
        return True
    
    # ==================== 域名配置 ====================
    
    def get_domain(self) -> Dict[str, List[str]]:
        """获取服务器域名配置"""
        result = self._request("POST", "/wxa/modify_domain", json_data={
            "action": "get"
        })
        return {
            "requestdomain": result.get("requestdomain", []),
            "wsrequestdomain": result.get("wsrequestdomain", []),
            "uploaddomain": result.get("uploaddomain", []),
            "downloaddomain": result.get("downloaddomain", [])
        }
    
    def set_domain(
        self,
        requestdomain: Optional[List[str]] = None,
        wsrequestdomain: Optional[List[str]] = None,
        uploaddomain: Optional[List[str]] = None,
        downloaddomain: Optional[List[str]] = None
    ) -> bool:
        """设置服务器域名"""
        data = {"action": "set"}
        if requestdomain:
            data["requestdomain"] = requestdomain
        if wsrequestdomain:
            data["wsrequestdomain"] = wsrequestdomain
        if uploaddomain:
            data["uploaddomain"] = uploaddomain
        if downloaddomain:
            data["downloaddomain"] = downloaddomain
        
        self._request("POST", "/wxa/modify_domain", json_data=data)
        return True
    
    def get_webview_domain(self) -> List[str]:
        """获取业务域名"""
        result = self._request("POST", "/wxa/setwebviewdomain", json_data={
            "action": "get"
        })
        return result.get("webviewdomain", [])
    
    def set_webview_domain(self, webviewdomain: List[str]) -> bool:
        """设置业务域名"""
        self._request("POST", "/wxa/setwebviewdomain", json_data={
            "action": "set",
            "webviewdomain": webviewdomain
        })
        return True
    
    # ==================== 隐私协议 ====================
    
    def get_privacy_setting(self, privacy_ver: int = 2) -> Dict[str, Any]:
        """获取隐私协议设置"""
        result = self._request("POST", "/cgi-bin/component/getprivacysetting", json_data={
            "privacy_ver": privacy_ver
        })
        return result
    
    def set_privacy_setting(
        self,
        setting_list: List[Dict[str, str]],
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
        notice_method: str = "弹窗提示"
    ) -> bool:
        """
        设置隐私协议
        
        Args:
            setting_list: 隐私配置列表，如 [{"privacy_key": "UserInfo", "privacy_text": "用于展示头像"}]
            contact_email: 联系邮箱
            contact_phone: 联系电话
            notice_method: 告知方式
        """
        data = {
            "privacy_ver": 2,
            "setting_list": setting_list
        }
        
        owner_setting = {"notice_method": notice_method}
        if contact_email:
            owner_setting["contact_email"] = contact_email
        if contact_phone:
            owner_setting["contact_phone"] = contact_phone
        data["owner_setting"] = owner_setting
        
        self._request("POST", "/cgi-bin/component/setprivacysetting", json_data=data)
        return True
    
    # ==================== 类目管理 ====================
    
    def get_all_categories(self) -> List[Dict]:
        """获取可选类目列表"""
        result = self._request("GET", "/cgi-bin/wxopen/getallcategories")
        return result.get("categories_list", {}).get("categories", [])
    
    def get_category(self) -> List[Dict]:
        """获取已设置的类目"""
        result = self._request("GET", "/cgi-bin/wxopen/getcategory")
        return result.get("categories", [])
    
    def add_category(self, categories: List[Dict]) -> bool:
        """
        添加类目
        
        Args:
            categories: 类目列表，如 [{"first": 1, "second": 2}]
        """
        self._request("POST", "/cgi-bin/wxopen/addcategory", json_data={
            "categories": categories
        })
        return True
    
    def delete_category(self, first: int, second: int) -> bool:
        """删除类目"""
        self._request("POST", "/cgi-bin/wxopen/deletecategory", json_data={
            "first": first,
            "second": second
        })
        return True
    
    # ==================== 代码管理 ====================
    
    def commit_code(
        self,
        template_id: int,
        user_version: str,
        user_desc: str,
        ext_json: Optional[str] = None
    ) -> bool:
        """
        上传代码
        
        Args:
            template_id: 代码模板ID
            user_version: 版本号
            user_desc: 版本描述
            ext_json: 扩展配置JSON字符串
        """
        data = {
            "template_id": template_id,
            "user_version": user_version,
            "user_desc": user_desc
        }
        if ext_json:
            data["ext_json"] = ext_json
        
        self._request("POST", "/wxa/commit", json_data=data)
        return True
    
    def get_page(self) -> List[str]:
        """获取已上传代码的页面列表"""
        result = self._request("GET", "/wxa/get_page")
        return result.get("page_list", [])
    
    def get_qrcode(self, path: Optional[str] = None) -> bytes:
        """
        获取体验版二维码
        
        Args:
            path: 页面路径，如 "pages/index/index"
        
        Returns:
            二维码图片二进制数据
        """
        params = {"access_token": self.access_token}
        if path:
            params["path"] = path
        
        resp = self.client.get(f"{self.BASE_URL}/wxa/get_qrcode", params=params)
        return resp.content
    
    # ==================== 审核管理 ====================
    
    def submit_audit(
        self,
        item_list: Optional[List[Dict]] = None,
        version_desc: Optional[str] = None,
        feedback_info: Optional[str] = None
    ) -> int:
        """
        提交审核
        
        Args:
            item_list: 页面审核信息列表
            version_desc: 版本说明
            feedback_info: 反馈内容
        
        Returns:
            审核单ID
        """
        data = {}
        if item_list:
            data["item_list"] = item_list
        if version_desc:
            data["version_desc"] = version_desc
        if feedback_info:
            data["feedback_info"] = feedback_info
        
        result = self._request("POST", "/wxa/submit_audit", json_data=data)
        return result.get("auditid", 0)
    
    def get_audit_status(self, auditid: int) -> AuditStatus:
        """查询审核状态"""
        result = self._request("POST", "/wxa/get_auditstatus", json_data={
            "auditid": auditid
        })
        return AuditStatus(
            auditid=auditid,
            status=result.get("status", -1),
            reason=result.get("reason"),
            screenshot=result.get("screenshot")
        )
    
    def get_latest_audit_status(self) -> AuditStatus:
        """查询最新审核状态"""
        result = self._request("GET", "/wxa/get_latest_auditstatus")
        return AuditStatus(
            auditid=result.get("auditid", 0),
            status=result.get("status", -1),
            reason=result.get("reason"),
            screenshot=result.get("screenshot")
        )
    
    def undo_code_audit(self) -> bool:
        """撤回审核（每天限1次）"""
        self._request("GET", "/wxa/undocodeaudit")
        return True
    
    # ==================== 发布管理 ====================
    
    def release(self) -> bool:
        """发布已审核通过的版本"""
        self._request("POST", "/wxa/release", json_data={})
        return True
    
    def revert_code_release(self) -> bool:
        """版本回退（只能回退到上一版本）"""
        self._request("GET", "/wxa/revertcoderelease")
        return True
    
    def get_revert_history(self) -> List[Dict]:
        """获取可回退版本历史"""
        result = self._request("GET", "/wxa/revertcoderelease", params={
            "action": "get_history_version"
        })
        return result.get("version_list", [])
    
    def gray_release(self, gray_percentage: int) -> bool:
        """
        分阶段发布
        
        Args:
            gray_percentage: 灰度比例 1-100
        """
        self._request("POST", "/wxa/grayrelease", json_data={
            "gray_percentage": gray_percentage
        })
        return True
    
    # ==================== 小程序码 ====================
    
    def get_wxacode(
        self,
        path: str,
        width: int = 430,
        auto_color: bool = False,
        line_color: Optional[Dict[str, int]] = None,
        is_hyaline: bool = False
    ) -> bytes:
        """
        获取小程序码（有限制，每个path最多10万个）
        
        Args:
            path: 页面路径，如 "pages/index/index?id=123"
            width: 宽度 280-1280
            auto_color: 自动配置线条颜色
            line_color: 线条颜色 {"r": 0, "g": 0, "b": 0}
            is_hyaline: 是否透明背景
        
        Returns:
            二维码图片二进制数据
        """
        data = {
            "path": path,
            "width": width,
            "auto_color": auto_color,
            "is_hyaline": is_hyaline
        }
        if line_color:
            data["line_color"] = line_color
        
        resp = self.client.post(
            f"{self.BASE_URL}/wxa/getwxacode",
            params={"access_token": self.access_token},
            json=data
        )
        return resp.content
    
    def get_wxacode_unlimit(
        self,
        scene: str,
        page: Optional[str] = None,
        width: int = 430,
        auto_color: bool = False,
        line_color: Optional[Dict[str, int]] = None,
        is_hyaline: bool = False
    ) -> bytes:
        """
        获取无限小程序码（推荐）
        
        Args:
            scene: 场景值，最长32字符，如 "user_id=123&from=share"
            page: 页面路径，必须是已发布的页面
            width: 宽度 280-1280
            auto_color: 自动配置线条颜色
            line_color: 线条颜色 {"r": 0, "g": 0, "b": 0}
            is_hyaline: 是否透明背景
        
        Returns:
            二维码图片二进制数据
        """
        data = {
            "scene": scene,
            "width": width,
            "auto_color": auto_color,
            "is_hyaline": is_hyaline
        }
        if page:
            data["page"] = page
        if line_color:
            data["line_color"] = line_color
        
        resp = self.client.post(
            f"{self.BASE_URL}/wxa/getwxacodeunlimit",
            params={"access_token": self.access_token},
            json=data
        )
        return resp.content
    
    def gen_short_link(
        self,
        page_url: str,
        page_title: str,
        is_permanent: bool = False
    ) -> str:
        """
        生成小程序短链接
        
        Args:
            page_url: 页面路径，如 "pages/index/index?id=123"
            page_title: 页面标题
            is_permanent: 是否永久有效
        
        Returns:
            短链接
        """
        result = self._request("POST", "/wxa/genwxashortlink", json_data={
            "page_url": page_url,
            "page_title": page_title,
            "is_permanent": is_permanent
        })
        return result.get("link", "")
    
    # ==================== 数据分析 ====================
    
    def get_daily_visit_trend(self, begin_date: str, end_date: str) -> List[Dict]:
        """
        获取每日访问趋势
        
        Args:
            begin_date: 开始日期 YYYYMMDD
            end_date: 结束日期 YYYYMMDD
        """
        result = self._request(
            "POST",
            "/datacube/getweanalysisappiddailyvisittrend",
            json_data={"begin_date": begin_date, "end_date": end_date}
        )
        return result.get("list", [])
    
    def get_user_portrait(self, begin_date: str, end_date: str) -> Dict:
        """
        获取用户画像
        
        Args:
            begin_date: 开始日期 YYYYMMDD
            end_date: 结束日期 YYYYMMDD
        """
        result = self._request(
            "POST",
            "/datacube/getweanalysisappiduserportrait",
            json_data={"begin_date": begin_date, "end_date": end_date}
        )
        return result
    
    # ==================== API配额 ====================
    
    def get_api_quota(self, cgi_path: str) -> Dict:
        """
        查询接口调用额度
        
        Args:
            cgi_path: 接口路径，如 "/wxa/getwxacode"
        """
        result = self._request("POST", "/cgi-bin/openapi/quota/get", json_data={
            "cgi_path": cgi_path
        })
        return result.get("quota", {})
    
    def clear_quota(self, appid: Optional[str] = None) -> bool:
        """重置接口调用次数（每月限10次）"""
        self._request("POST", "/cgi-bin/clear_quota", json_data={
            "appid": appid or self.authorizer_appid
        })
        return True
    
    def close(self):
        """关闭连接"""
        self.client.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class APIError(Exception):
    """API错误"""
    
    ERROR_CODES = {
        -1: "系统繁忙",
        40001: "access_token无效",
        40002: "grant_type不正确",
        40013: "appid不正确",
        40029: "code无效",
        40125: "appsecret不正确",
        41002: "缺少appid参数",
        41004: "缺少appsecret参数",
        42001: "access_token过期",
        42007: "refresh_token过期",
        45009: "调用超过限制",
        61039: "代码检测任务未完成，请稍后再试",
        85006: "标签格式错误",
        85007: "页面路径错误",
        85009: "已有审核版本，请先撤回",
        85010: "版本输入错误",
        85011: "当前版本不能回退",
        85012: "无效的版本",
        85015: "该账号已有发布中的版本",
        85019: "没有审核版本",
        85020: "审核状态异常",
        85064: "找不到模板",
        85085: "该小程序不能被操作",
        85086: "小程序没有绑定任何类目",
        87013: "每天只能撤回1次审核",
        89020: "该小程序尚未认证",
        89248: "隐私协议内容不完整",
    }
    
    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {self.ERROR_CODES.get(code, message)}")


# 便捷函数
def create_api_from_env() -> MiniProgramAPI:
    """从环境变量创建API实例"""
    return MiniProgramAPI()


if __name__ == "__main__":
    # 测试
    api = create_api_from_env()
    print("API初始化成功")
