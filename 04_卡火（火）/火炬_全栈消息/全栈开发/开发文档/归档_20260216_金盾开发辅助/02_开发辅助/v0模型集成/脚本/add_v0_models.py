#!/usr/bin/env python3
"""
添加v0模型到Cursor配置
"""
import json
import os
from pathlib import Path

def add_v0_models():
    # Cursor设置文件路径
    settings_path = Path.home() / "Library/Application Support/Cursor/User/settings.json"
    
    # 读取现有设置
    if settings_path.exists():
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
    else:
        settings = {}
    
    # v0模型配置
    v0_models = {
        "v0-1.5-md": {
            "name": "v0 1.5 MD",
            "provider": "openai-compatible",
            "model": "v0-1.5-md",
            "enabled": True,
            "apiUrl": "https://api.v0.dev/v1",
            "apiKey": "v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2"
        },
        "v0-1.5-lg": {
            "name": "v0 1.5 LG",
            "provider": "openai-compatible", 
            "model": "v0-1.5-lg",
            "enabled": True,
            "apiUrl": "https://api.v0.dev/v1",
            "apiKey": "v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2"
        },
        "v0-1.0-md": {
            "name": "v0 1.0 MD",
            "provider": "openai-compatible",
            "model": "v0-1.0-md", 
            "enabled": True,
            "apiUrl": "https://api.v0.dev/v1",
            "apiKey": "v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2"
        }
    }
    
    # 添加到设置中
    if "cursor.models" not in settings:
        settings["cursor.models"] = {}
    
    settings["cursor.models"].update(v0_models)
    
    # 备份原文件
    if settings_path.exists():
        backup_path = settings_path.with_suffix('.json.backup')
        settings_path.rename(backup_path)
        print(f"✅ 已备份原配置到: {backup_path}")
    
    # 写入新配置
    with open(settings_path, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
    
    print("✅ v0模型已添加到Cursor配置:")
    for model_id, config in v0_models.items():
        print(f"   - {config['name']} ({model_id})")
    
    print("\n🔄 请重启Cursor使配置生效")
    print("💡 重启后在Models页面应该能看到v0模型")

if __name__ == "__main__":
    add_v0_models()