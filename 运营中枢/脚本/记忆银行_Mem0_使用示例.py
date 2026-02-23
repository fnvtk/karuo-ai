#!/usr/bin/env python3
"""
Mem0 记忆银行 · 免费使用示例
路径：卡若AI/.venv_mem0
用法：.venv_mem0/bin/python3 本脚本
"""
import os
from pathlib import Path

# 使用卡若AI 目录下的 venv
venv_python = Path(__file__).resolve().parent.parent.parent / ".venv_mem0" / "bin" / "python3"
if not venv_python.exists():
    venv_python = "python3"

def main():
    print("=== Mem0 记忆银行 使用示例 ===\n")
    
    # 方式1：使用 OpenAI API（需设置 OPENAI_API_KEY 环境变量）
    if os.environ.get("OPENAI_API_KEY"):
        from mem0 import Memory
        m = Memory()
        m.add("我喜欢早上喝咖啡散步", user_id="karuo")
        results = m.search("我应该喝咖啡还是茶？", user_id="karuo")
        print("✅ 记忆已添加并检索成功")
        if results:
            print("检索结果:", results[0])
    else:
        print("⚠ 使用 Mem0 需配置以下之一：")
        print("  1. 设置 OPENAI_API_KEY（OpenAI/兼容API）")
        print("  2. 或使用 Ollama 本地模型（完全免费）")
        print("\n示例：export OPENAI_API_KEY=sk-xxx")
        print("然后运行：.venv_mem0/bin/python3 本脚本")

if __name__ == "__main__":
    main()
