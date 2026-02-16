#!/usr/bin/env python3
"""
检查当前模型和API余额
"""
import json
import urllib.request
import urllib.error
from pathlib import Path

def check_current_model():
    """检查当前使用的模型"""
    settings_path = Path.home() / "Library/Application Support/Cursor/User/settings.json"
    
    if not settings_path.exists():
        return "未找到Cursor配置文件"
    
    with open(settings_path, 'r', encoding='utf-8') as f:
        settings = json.load(f)
    
    # 获取当前AI模型设置
    ai_model = settings.get("cursor.aiModel", "未设置")
    chat_model = settings.get("cursor.chatModel", "未设置") 
    v0_model = settings.get("v0.model", "未设置")
    
    return {
        "ai_model": ai_model,
        "chat_model": chat_model, 
        "v0_model": v0_model
    }

def check_v0_balance():
    """检查v0 API余额"""
    api_key = "v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2"
    
    try:
        # 创建请求
        req = urllib.request.Request(
            "https://api.v0.dev/v1/models",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
        
        # 发送请求
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                models = data.get("data", [])
                return {
                    "status": "API正常", 
                    "models_count": len(models),
                    "available_models": [m.get("id", "unknown") for m in models]
                }
            else:
                return {"error": f"API请求失败: {response.status}"}
                
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP错误: {e.code} - {e.reason}"}
    except urllib.error.URLError as e:
        return {"error": f"网络错误: {str(e)}"}
    except Exception as e:
        return {"error": f"未知错误: {str(e)}"}

def main():
    print("🤖 当前模型状态检查")
    print("=" * 50)
    
    # 检查当前模型
    models = check_current_model()
    if isinstance(models, dict):
        print(f"📱 Cursor AI模型: {models['ai_model']}")
        print(f"💬 Cursor 聊天模型: {models['chat_model']}")
        print(f"🎨 v0模型: {models['v0_model']}")
    else:
        print(f"❌ {models}")
    
    print("\n" + "=" * 50)
    
    # 检查v0 API状态
    print("🔍 检查v0 API状态...")
    balance_info = check_v0_balance()
    
    if "error" in balance_info:
        print(f"❌ {balance_info['error']}")
    elif "status" in balance_info:
        print(f"✅ {balance_info['status']}")
        if "models_count" in balance_info:
            print(f"📊 可用模型数量: {balance_info['models_count']}")
    else:
        print("✅ API余额信息:")
        for key, value in balance_info.items():
            print(f"   {key}: {value}")

if __name__ == "__main__":
    main()