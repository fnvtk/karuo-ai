#!/usr/bin/env python3
"""
Ollama本地模型快速调用工具

用法:
    python ollama_helper.py "你的问题"           # 使用默认模型快速问答
    python ollama_helper.py --model qwen2.5:1.5b "你的问题"  # 指定模型
    python ollama_helper.py --list               # 列出已安装模型
    python ollama_helper.py --embed "文本"       # 获取文本向量
    python ollama_helper.py --status             # 检查服务状态

作者: 卡火（火）
日期: 2026-01-28
"""

import requests
import sys
import json
import argparse

# Ollama服务配置
OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5:0.5b"
EMBED_MODEL = "nomic-embed-text"


def check_service():
    """检查Ollama服务是否运行"""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        return r.status_code == 200
    except:
        return False


def quick_ask(prompt, model=DEFAULT_MODEL, stream=False):
    """
    快速问答
    
    Args:
        prompt: 问题内容
        model: 使用的模型，默认qwen2.5:0.5b
        stream: 是否流式输出
    
    Returns:
        模型响应文本
    """
    if not check_service():
        return "错误: Ollama服务未运行，请先执行 'ollama serve'"
    
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": stream
            },
            timeout=120
        )
        
        if r.status_code != 200:
            return f"错误: HTTP {r.status_code}"
        
        return r.json().get("response", "无响应")
    
    except requests.exceptions.Timeout:
        return "错误: 请求超时"
    except Exception as e:
        return f"错误: {e}"


def chat(messages, model=DEFAULT_MODEL):
    """
    多轮对话
    
    Args:
        messages: 消息列表 [{"role": "user", "content": "..."}]
        model: 使用的模型
    
    Returns:
        模型响应
    """
    if not check_service():
        return "错误: Ollama服务未运行"
    
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False
            },
            timeout=120
        )
        
        return r.json().get("message", {}).get("content", "无响应")
    
    except Exception as e:
        return f"错误: {e}"


def get_embedding(text, model=EMBED_MODEL):
    """
    获取文本向量
    
    Args:
        text: 要向量化的文本
        model: 嵌入模型，默认nomic-embed-text
    
    Returns:
        向量列表 (768维)
    """
    if not check_service():
        return None
    
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={
                "model": model,
                "prompt": text
            },
            timeout=30
        )
        
        return r.json().get("embedding")
    
    except Exception as e:
        print(f"错误: {e}")
        return None


def list_models():
    """列出已安装的模型"""
    if not check_service():
        print("错误: Ollama服务未运行")
        return []
    
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags")
        models = r.json().get("models", [])
        
        print("已安装模型:")
        print("-" * 50)
        for m in models:
            name = m['name']
            size = m['details'].get('parameter_size', 'N/A')
            quant = m['details'].get('quantization_level', 'N/A')
            print(f"  {name:<25} {size:<10} {quant}")
        print("-" * 50)
        
        return models
    
    except Exception as e:
        print(f"错误: {e}")
        return []


def show_status():
    """显示服务状态"""
    print("Ollama服务状态检查")
    print("-" * 30)
    
    if check_service():
        print("✅ 服务运行中")
        print(f"📍 地址: {OLLAMA_URL}")
        
        # 获取模型数量
        try:
            r = requests.get(f"{OLLAMA_URL}/api/tags")
            models = r.json().get("models", [])
            print(f"📦 已安装模型: {len(models)}个")
            
            # 计算总大小
            total_size = sum(m.get('size', 0) for m in models)
            print(f"💾 总占用空间: {total_size / 1024 / 1024 / 1024:.2f}GB")
        except:
            pass
    else:
        print("❌ 服务未运行")
        print("💡 启动命令: ollama serve")


def main():
    parser = argparse.ArgumentParser(
        description="Ollama本地模型快速调用工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python ollama_helper.py "什么是Python装饰器？"
  python ollama_helper.py --model qwen2.5:1.5b "写一个快速排序"
  python ollama_helper.py --list
  python ollama_helper.py --embed "这是测试文本"
  python ollama_helper.py --status
        """
    )
    
    parser.add_argument("prompt", nargs="?", help="问题内容")
    parser.add_argument("--model", "-m", default=DEFAULT_MODEL, help=f"使用的模型 (默认: {DEFAULT_MODEL})")
    parser.add_argument("--list", "-l", action="store_true", help="列出已安装模型")
    parser.add_argument("--embed", "-e", type=str, help="获取文本向量")
    parser.add_argument("--status", "-s", action="store_true", help="检查服务状态")
    parser.add_argument("--json", "-j", action="store_true", help="以JSON格式输出")
    
    args = parser.parse_args()
    
    # 处理各种命令
    if args.status:
        show_status()
    elif args.list:
        list_models()
    elif args.embed:
        vector = get_embedding(args.embed)
        if vector:
            if args.json:
                print(json.dumps({"embedding": vector, "dimension": len(vector)}))
            else:
                print(f"向量维度: {len(vector)}")
                print(f"前5个值: {vector[:5]}")
        else:
            print("获取向量失败")
    elif args.prompt:
        result = quick_ask(args.prompt, model=args.model)
        if args.json:
            print(json.dumps({"response": result, "model": args.model}))
        else:
            print(result)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
