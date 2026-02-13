#!/usr/bin/env python3
"""
生成模型状态横幅，用于每次对话开始时显示
"""
import json
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

def get_model_status():
    """获取当前模型状态"""
    settings_path = Path.home() / "Library/Application Support/Cursor/User/settings.json"
    
    if not settings_path.exists():
        return "❌ 未找到Cursor配置"
    
    with open(settings_path, 'r', encoding='utf-8') as f:
        settings = json.load(f)
    
    # 获取当前模型
    ai_model = settings.get("cursor.aiModel", "未设置")
    
    # 检查v0 API状态
    api_status = check_v0_api()
    
    # 生成状态横幅
    banner = f"""
┌─────────────────────────────────────────────────────────┐
│  🤖 当前对话模型: {ai_model:<35} │
│  🎨 v0 API状态: {api_status:<37} │  
│  ⏰ 检查时间: {datetime.now().strftime('%H:%M:%S'):<39} │
└─────────────────────────────────────────────────────────┘
"""
    return banner.strip()

def check_v0_api():
    """快速检查v0 API状态"""
    try:
        req = urllib.request.Request(
            "https://api.v0.dev/v1/models",
            headers={
                "Authorization": "Bearer v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2",
                "Content-Type": "application/json"
            }
        )
        
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                model_count = len(data.get("data", []))
                return f"✅ 正常 ({model_count}个模型可用)"
            else:
                return f"⚠️ 异常 (状态码:{response.status})"
                
    except Exception as e:
        return "❌ 连接失败"

if __name__ == "__main__":
    print(get_model_status())