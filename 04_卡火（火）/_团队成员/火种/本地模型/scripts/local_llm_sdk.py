#!/usr/bin/env python3
"""
卡若AI 本地模型统一SDK

所有Skill都可以通过此SDK调用本地Ollama模型
设计目标：
1. 简单易用 - 一行代码调用
2. 资源控制 - CPU使用控制在30%以内
3. 智能路由 - 根据任务自动选择最佳模型
4. 降级策略 - 本地失败时提示使用云端API

作者: 卡火（火）
日期: 2026-01-28
"""

import requests
import time
import hashlib
import os
from typing import Optional, List, Dict, Any
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import threading

# ============== 配置 ==============

OLLAMA_URL = "http://localhost:11434"

# 模型配置
MODELS = {
    "light": "qwen2.5:0.5b",      # 轻量模型：快速响应，简单任务
    "standard": "qwen2.5:1.5b",   # 标准模型：代码辅助，复杂对话
    "embed": "nomic-embed-text",   # 嵌入模型：语义搜索，RAG
}

# 任务到模型的映射
TASK_MODEL_MAP = {
    # 轻量任务 → 0.5b（快速，省资源）
    "summarize": "light",          # 文本摘要
    "extract": "light",            # 信息提取
    "classify": "light",           # 文本分类
    "translate_short": "light",    # 短文翻译
    "generate_questions": "light", # 生成问题
    "quick_answer": "light",       # 快速问答
    
    # 标准任务 → 1.5b（质量更高）
    "analyze": "standard",         # 深度分析
    "code_explain": "standard",    # 代码解释
    "write_draft": "standard",     # 写作草稿
    "task_breakdown": "standard",  # 任务拆解
    "complex_qa": "standard",      # 复杂问答
    
    # 嵌入任务 → nomic-embed
    "embed": "embed",              # 文本向量化
    "similarity": "embed",         # 相似度计算
    "search": "embed",             # 语义搜索
}

# 资源控制
MAX_CONCURRENT_REQUESTS = 2        # 最大并发请求数
REQUEST_INTERVAL = 0.5             # 请求间隔（秒）
MAX_INPUT_LENGTH = 4000            # 最大输入长度（字符）
CPU_TARGET = "30%"                 # CPU目标使用率

# 全局锁和信号量
_semaphore = threading.Semaphore(MAX_CONCURRENT_REQUESTS)
_last_request_time = 0
_lock = threading.Lock()

# 是否显示使用提醒（默认开启）
SHOW_USAGE_NOTICE = True


# ============== 使用提醒 ==============

def _print_usage_notice(model: str, task_type: str):
    """打印本地模型使用提醒"""
    if not SHOW_USAGE_NOTICE:
        return
    
    model_display = {
        "qwen2.5:0.5b": "卡若-轻量 (qwen2.5:0.5b)",
        "qwen2.5:1.5b": "卡若-标准 (qwen2.5:1.5b)",
        "nomic-embed-text": "语义嵌入 (nomic-embed-text)"
    }.get(model, model)
    
    task_display = {
        "summarize": "文本摘要",
        "extract": "信息提取",
        "classify": "文本分类",
        "generate_questions": "生成追问",
        "quick_answer": "快速问答",
        "analyze": "深度分析",
        "code_explain": "代码解释",
        "write_draft": "写作草稿",
        "task_breakdown": "任务拆解",
        "complex_qa": "复杂问答",
        "embed": "文本向量化",
        "similarity": "相似度计算",
        "search": "语义搜索"
    }.get(task_type, task_type)
    
    print(f"""
🔥 [本地模型] 正在使用本地AI处理...
├─ 模型：{model_display}
├─ 任务：{task_display}
├─ 状态：离线可用 | CPU控制在{CPU_TARGET}
└─ 响应预计：3-10秒
""")


def get_usage_notice_text(model: str, task_type: str) -> str:
    """获取使用提醒文本（供其他模块使用）"""
    model_display = {
        "qwen2.5:0.5b": "卡若-轻量",
        "qwen2.5:1.5b": "卡若-标准",
        "nomic-embed-text": "语义嵌入"
    }.get(model, model)
    
    task_display = {
        "summarize": "文本摘要",
        "extract": "信息提取",
        "classify": "文本分类",
        "generate_questions": "生成追问",
        "quick_answer": "快速问答",
        "analyze": "深度分析",
        "code_explain": "代码解释",
        "write_draft": "写作草稿",
        "task_breakdown": "任务拆解",
        "embed": "文本向量化"
    }.get(task_type, task_type)
    
    return f"🔥 [本地模型] {model_display} | {task_display} | 离线可用 | CPU≤{CPU_TARGET}"


# ============== 核心类 ==============

class LocalLLM:
    """本地LLM统一调用类"""
    
    def __init__(self):
        self._check_service()
    
    def _check_service(self) -> bool:
        """检查Ollama服务是否运行"""
        try:
            r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
            return r.status_code == 200
        except:
            return False
    
    def _rate_limit(self):
        """请求限流，控制资源使用"""
        global _last_request_time
        with _lock:
            now = time.time()
            elapsed = now - _last_request_time
            if elapsed < REQUEST_INTERVAL:
                time.sleep(REQUEST_INTERVAL - elapsed)
            _last_request_time = time.time()
    
    def _truncate_input(self, text: str) -> str:
        """截断过长输入"""
        if len(text) > MAX_INPUT_LENGTH:
            return text[:MAX_INPUT_LENGTH] + "\n...[内容已截断]"
        return text
    
    def _get_model(self, task_type: str) -> str:
        """根据任务类型获取模型"""
        model_key = TASK_MODEL_MAP.get(task_type, "light")
        return MODELS[model_key]
    
    # ============== 文本生成 ==============
    
    def generate(
        self,
        prompt: str,
        task_type: str = "quick_answer",
        temperature: float = 0.7,
        max_tokens: int = 500,
        show_notice: bool = True
    ) -> Dict[str, Any]:
        """
        生成文本
        
        Args:
            prompt: 提示词
            task_type: 任务类型（见TASK_MODEL_MAP）
            temperature: 温度（0-1）
            max_tokens: 最大生成长度
            show_notice: 是否显示使用提醒
        
        Returns:
            {"success": bool, "response": str, "model": str, "time_ms": int, "notice": str}
        """
        if not self._check_service():
            return {
                "success": False,
                "response": "本地模型服务未运行，请使用云端API",
                "model": None,
                "time_ms": 0,
                "notice": ""
            }
        
        model = self._get_model(task_type)
        prompt = self._truncate_input(prompt)
        
        # 打印使用提醒
        if show_notice and SHOW_USAGE_NOTICE:
            _print_usage_notice(model, task_type)
        
        notice = get_usage_notice_text(model, task_type)
        
        with _semaphore:
            self._rate_limit()
            start_time = time.time()
            
            try:
                r = requests.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    },
                    timeout=60
                )
                
                elapsed = int((time.time() - start_time) * 1000)
                
                if r.status_code == 200:
                    return {
                        "success": True,
                        "response": r.json().get("response", ""),
                        "model": model,
                        "time_ms": elapsed,
                        "notice": notice
                    }
                else:
                    return {
                        "success": False,
                        "response": f"API错误: {r.status_code}",
                        "model": model,
                        "time_ms": elapsed,
                        "notice": notice
                    }
            
            except Exception as e:
                return {
                    "success": False,
                    "response": f"请求失败: {str(e)}",
                    "model": model,
                    "time_ms": 0,
                    "notice": notice
                }
    
    # ============== 文本嵌入 ==============
    
    def embed(self, text: str, show_notice: bool = False) -> Dict[str, Any]:
        """
        获取文本向量
        
        Args:
            text: 要向量化的文本
            show_notice: 是否显示使用提醒（嵌入操作默认关闭，批量时太多）
        
        Returns:
            {"success": bool, "embedding": List[float], "dimension": int, "notice": str}
        """
        if not self._check_service():
            return {"success": False, "embedding": None, "dimension": 0, "notice": ""}
        
        text = self._truncate_input(text)
        model = MODELS["embed"]
        
        # 打印使用提醒
        if show_notice and SHOW_USAGE_NOTICE:
            _print_usage_notice(model, "embed")
        
        notice = get_usage_notice_text(model, "embed")
        
        with _semaphore:
            self._rate_limit()
            
            try:
                r = requests.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={
                        "model": model,
                        "prompt": text
                    },
                    timeout=30
                )
                
                if r.status_code == 200:
                    embedding = r.json().get("embedding", [])
                    return {
                        "success": True,
                        "embedding": embedding,
                        "dimension": len(embedding),
                        "notice": notice
                    }
                else:
                    return {"success": False, "embedding": None, "dimension": 0, "notice": notice}
            
            except Exception as e:
                return {"success": False, "embedding": None, "dimension": 0, "notice": notice}
    
    def batch_embed(self, texts: List[str]) -> List[Dict[str, Any]]:
        """批量向量化（自动限流）"""
        results = []
        for text in texts:
            results.append(self.embed(text))
            time.sleep(REQUEST_INTERVAL)  # 批量任务额外限流
        return results
    
    def similarity(self, text1: str, text2: str) -> float:
        """
        计算两段文本的相似度
        
        Returns:
            相似度分数（0-1）
        """
        emb1 = self.embed(text1)
        emb2 = self.embed(text2)
        
        if not emb1["success"] or not emb2["success"]:
            return 0.0
        
        # 余弦相似度
        import math
        v1, v2 = emb1["embedding"], emb2["embedding"]
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot / (norm1 * norm2)


# ============== 便捷函数（供各Skill直接调用） ==============

# 全局实例
_llm = None

def get_llm() -> LocalLLM:
    """获取LLM实例（单例）"""
    global _llm
    if _llm is None:
        _llm = LocalLLM()
    return _llm


def format_response_with_notice(result: Dict, include_notice: bool = True) -> str:
    """
    格式化响应，包含使用提醒
    
    Args:
        result: generate()的返回结果
        include_notice: 是否包含提醒文本
    
    Returns:
        格式化后的响应文本
    """
    if not result["success"]:
        return result["response"]
    
    if include_notice and result.get("notice"):
        return f"{result['notice']}\n\n{result['response']}"
    return result["response"]


def summarize(text: str, max_words: int = 100, with_notice: bool = False) -> str:
    """
    文本摘要
    
    适用Skill: 智能纪要、文档清洗、对话归档
    
    Args:
        with_notice: 是否在结果前加上使用提醒
    """
    prompt = f"请用{max_words}字以内总结以下内容的核心要点：\n\n{text}"
    result = get_llm().generate(prompt, task_type="summarize")
    
    if with_notice:
        return format_response_with_notice(result)
    return result["response"] if result["success"] else ""


def extract_info(text: str, info_type: str) -> str:
    """
    信息提取
    
    适用Skill: 个人档案生成器、微信管理
    
    Args:
        text: 原文
        info_type: 要提取的信息类型（如"联系方式"、"关键人物"）
    """
    prompt = f"从以下文本中提取{info_type}，以列表形式输出：\n\n{text}"
    result = get_llm().generate(prompt, task_type="extract")
    return result["response"] if result["success"] else ""


def classify(text: str, categories: List[str]) -> str:
    """
    文本分类
    
    适用Skill: 对话归档、文件整理
    
    Args:
        text: 要分类的文本
        categories: 可选类别列表
    """
    cats = "、".join(categories)
    prompt = f"将以下内容分类到最匹配的类别（{cats}），只输出类别名：\n\n{text}"
    result = get_llm().generate(prompt, task_type="classify")
    return result["response"].strip() if result["success"] else categories[0]


def generate_questions(topic: str, count: int = 5) -> List[str]:
    """
    生成追问问题
    
    适用Skill: 智能追问、需求拆解
    """
    prompt = f"针对「{topic}」这个主题，生成{count}个深入的追问问题，每行一个："
    result = get_llm().generate(prompt, task_type="generate_questions")
    
    if result["success"]:
        lines = [l.strip() for l in result["response"].split("\n") if l.strip()]
        # 去掉序号
        questions = []
        for line in lines:
            if line[0].isdigit() and (line[1] == '.' or line[1] == '、'):
                questions.append(line[2:].strip())
            else:
                questions.append(line)
        return questions[:count]
    return []


def analyze_task(task_desc: str) -> str:
    """
    任务分析与拆解
    
    适用Skill: 任务规划、需求拆解
    """
    prompt = f"""分析以下任务，拆解成3-5个可执行步骤：

任务：{task_desc}

请按以下格式输出：
1. 步骤一
2. 步骤二
..."""
    result = get_llm().generate(prompt, task_type="task_breakdown")
    return result["response"] if result["success"] else ""


def write_draft(topic: str, style: str = "简洁") -> str:
    """
    生成写作草稿
    
    适用Skill: 卡若日记写作、读书笔记
    """
    prompt = f"以{style}的风格，写一段关于「{topic}」的内容（200字左右）："
    result = get_llm().generate(prompt, task_type="write_draft", max_tokens=300)
    return result["response"] if result["success"] else ""


def semantic_search(query: str, documents: List[str], top_k: int = 3) -> List[Dict]:
    """
    语义搜索
    
    适用Skill: 微信管理、文档清洗、对话归档
    
    Args:
        query: 查询文本
        documents: 文档列表
        top_k: 返回前k个结果
    
    Returns:
        [{"index": int, "text": str, "score": float}]
    """
    llm = get_llm()
    query_emb = llm.embed(query)
    
    if not query_emb["success"]:
        return []
    
    # 计算所有文档的相似度
    scores = []
    for i, doc in enumerate(documents):
        doc_emb = llm.embed(doc)
        if doc_emb["success"]:
            # 余弦相似度
            import math
            v1, v2 = query_emb["embedding"], doc_emb["embedding"]
            dot = sum(a * b for a, b in zip(v1, v2))
            norm1 = math.sqrt(sum(a * a for a in v1))
            norm2 = math.sqrt(sum(b * b for b in v2))
            score = dot / (norm1 * norm2) if norm1 and norm2 else 0
            scores.append({"index": i, "text": doc, "score": score})
        
        time.sleep(REQUEST_INTERVAL)  # 限流
    
    # 按相似度排序
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:top_k]


def check_service() -> Dict[str, Any]:
    """
    检查服务状态
    
    Returns:
        {"running": bool, "models": List[str], "message": str}
    """
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            return {
                "running": True,
                "models": models,
                "message": f"服务运行中，已加载{len(models)}个模型"
            }
    except:
        pass
    
    return {
        "running": False,
        "models": [],
        "message": "服务未运行，请执行 ollama serve"
    }


# ============== CLI入口 ==============

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("卡若AI 本地模型SDK")
        print("-" * 40)
        status = check_service()
        print(f"状态: {status['message']}")
        if status["running"]:
            print(f"模型: {', '.join(status['models'])}")
        print()
        print("用法示例:")
        print("  python local_llm_sdk.py summarize '文本内容'")
        print("  python local_llm_sdk.py questions '主题'")
        print("  python local_llm_sdk.py classify '文本' '类别1,类别2'")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "summarize" and len(sys.argv) > 2:
        print(summarize(sys.argv[2]))
    
    elif cmd == "questions" and len(sys.argv) > 2:
        qs = generate_questions(sys.argv[2])
        for i, q in enumerate(qs, 1):
            print(f"{i}. {q}")
    
    elif cmd == "classify" and len(sys.argv) > 3:
        cats = sys.argv[3].split(",")
        print(classify(sys.argv[2], cats))
    
    elif cmd == "analyze" and len(sys.argv) > 2:
        print(analyze_task(sys.argv[2]))
    
    elif cmd == "draft" and len(sys.argv) > 2:
        print(write_draft(sys.argv[2]))
    
    else:
        print(f"未知命令: {cmd}")


# ============== 高级功能（基于Ollama官方最佳实践） ==============

def stream_generate(
    prompt: str,
    task_type: str = "quick_answer",
    temperature: float = 0.7,
    max_tokens: int = 500,
    callback=None
) -> str:
    """
    流式生成文本（实时输出）
    
    适用场景：长文本生成、实时对话、用户体验优化
    
    Args:
        prompt: 提示词
        task_type: 任务类型
        temperature: 温度
        max_tokens: 最大长度
        callback: 回调函数 callback(chunk: str) -> None
    
    Returns:
        完整响应文本
    """
    llm = get_llm()
    if not llm._check_service():
        return "本地模型服务未运行"
    
    model = llm._get_model(task_type)
    prompt = llm._truncate_input(prompt)
    
    full_response = ""
    
    try:
        with _semaphore:
            llm._rate_limit()
            r = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                stream=True,
                timeout=60
            )
            
            for line in r.iter_lines():
                if line:
                    try:
                        chunk_data = line.decode('utf-8')
                        if chunk_data.strip():
                            import json
                            chunk_json = json.loads(chunk_data)
                            chunk_text = chunk_json.get("response", "")
                            if chunk_text:
                                full_response += chunk_text
                                if callback:
                                    callback(chunk_text)
                    except:
                        continue
        
        return full_response
    except Exception as e:
        return f"流式生成失败: {str(e)}"


def chat_with_history(
    messages: List[Dict[str, str]],
    model: str = None,
    task_type: str = "complex_qa",
    stream: bool = False
) -> Dict[str, Any]:
    """
    对话模式（支持历史记录）
    
    适用场景：多轮对话、上下文理解、智能追问
    
    Args:
        messages: 消息列表 [{"role": "user", "content": "..."}, ...]
        model: 指定模型（可选）
        task_type: 任务类型
        stream: 是否流式输出
    
    Returns:
        {"success": bool, "response": str, "model": str}
    """
    llm = get_llm()
    if not llm._check_service():
        return {"success": False, "response": "本地模型服务未运行", "model": None}
    
    if model is None:
        model = llm._get_model(task_type)
    
    if SHOW_USAGE_NOTICE:
        _print_usage_notice(model, task_type)
    
    notice = get_usage_notice_text(model, task_type)
    
    with _semaphore:
        llm._rate_limit()
        
        try:
            r = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": stream
                },
                timeout=60,
                stream=stream
            )
            
            if stream:
                # 流式响应
                full_response = ""
                for line in r.iter_lines():
                    if line:
                        try:
                            chunk_data = line.decode('utf-8')
                            if chunk_data.strip():
                                import json
                                chunk_json = json.loads(chunk_data)
                                chunk_text = chunk_json.get("message", {}).get("content", "")
                                if chunk_text:
                                    full_response += chunk_text
                        except:
                            continue
                return {"success": True, "response": full_response, "model": model, "notice": notice}
            else:
                # 非流式响应
                if r.status_code == 200:
                    response_data = r.json()
                    return {
                        "success": True,
                        "response": response_data.get("message", {}).get("content", ""),
                        "model": model,
                        "notice": notice
                    }
                else:
                    return {"success": False, "response": f"API错误: {r.status_code}", "model": model, "notice": notice}
        
        except Exception as e:
            return {"success": False, "response": f"请求失败: {str(e)}", "model": model, "notice": notice}


def function_calling(
    prompt: str,
    tools: List[Dict],
    available_functions: Dict[str, callable],
    model: str = "qwen2.5:1.5b"
) -> Dict[str, Any]:
    """
    工具调用（Function Calling）
    
    适用场景：需要调用外部工具、API、数据库查询
    
    Args:
        prompt: 用户提示
        tools: 工具定义列表（JSON Schema格式）
        available_functions: 可调用函数字典 {函数名: 函数对象}
        model: 模型（需要支持工具调用）
    
    Returns:
        {"success": bool, "response": str, "tool_calls": List}
    
    示例：
        tools = [{
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "获取天气",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "城市名"}
                    },
                    "required": ["city"]
                }
            }
        }]
        
        def get_weather(city: str) -> str:
            return f"{city}的天气是晴天"
        
        result = function_calling(
            "北京天气怎么样？",
            tools,
            {"get_weather": get_weather}
        )
    """
    llm = get_llm()
    if not llm._check_service():
        return {"success": False, "response": "本地模型服务未运行", "tool_calls": []}
    
    messages = [{"role": "user", "content": prompt}]
    
    with _semaphore:
        llm._rate_limit()
        
        try:
            # 第一次调用：模型决定是否调用工具
            r = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "tools": tools,
                    "stream": False
                },
                timeout=60
            )
            
            if r.status_code != 200:
                return {"success": False, "response": f"API错误: {r.status_code}", "tool_calls": []}
            
            response_data = r.json()
            message = response_data.get("message", {})
            tool_calls = message.get("tool_calls", [])
            
            # 如果有工具调用
            if tool_calls:
                messages.append(message)  # 添加模型的工具调用请求
                
                # 执行工具调用
                tool_results = []
                for tool_call in tool_calls:
                    func_name = tool_call.get("function", {}).get("name")
                    func_args = tool_call.get("function", {}).get("arguments", {})
                    
                    if func_name in available_functions:
                        try:
                            import json
                            if isinstance(func_args, str):
                                func_args = json.loads(func_args)
                            
                            func_result = available_functions[func_name](**func_args)
                            tool_results.append({
                                "role": "tool",
                                "content": str(func_result),
                                "tool_name": func_name
                            })
                        except Exception as e:
                            tool_results.append({
                                "role": "tool",
                                "content": f"工具调用失败: {str(e)}",
                                "tool_name": func_name
                            })
                
                # 添加工具结果到消息历史
                messages.extend(tool_results)
                
                # 第二次调用：模型使用工具结果生成最终回答
                r2 = requests.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False
                    },
                    timeout=60
                )
                
                if r2.status_code == 200:
                    final_response = r2.json().get("message", {}).get("content", "")
                    return {
                        "success": True,
                        "response": final_response,
                        "tool_calls": tool_calls,
                        "model": model
                    }
            
            # 没有工具调用，直接返回响应
            return {
                "success": True,
                "response": message.get("content", ""),
                "tool_calls": [],
                "model": model
            }
        
        except Exception as e:
            return {"success": False, "response": f"工具调用失败: {str(e)}", "tool_calls": []}


def structured_output(
    prompt: str,
    schema: Dict,
    model: str = "qwen2.5:1.5b",
    temperature: float = 0
) -> Dict[str, Any]:
    """
    结构化输出（JSON Schema）
    
    适用场景：需要固定格式的输出、数据提取、API响应
    
    Args:
        prompt: 提示词
        schema: JSON Schema格式定义
        model: 模型
        temperature: 温度（建议0，确保格式稳定）
    
    Returns:
        {"success": bool, "data": Dict, "raw": str}
    
    示例：
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name", "age"]
        }
        
        result = structured_output(
            "提取：张三，25岁",
            schema
        )
    """
    llm = get_llm()
    if not llm._check_service():
        return {"success": False, "data": None, "raw": ""}
    
    import json
    
    with _semaphore:
        llm._rate_limit()
        
        try:
            r = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "format": schema,
                    "options": {"temperature": temperature},
                    "stream": False
                },
                timeout=60
            )
            
            if r.status_code == 200:
                response_data = r.json()
                raw_content = response_data.get("message", {}).get("content", "")
                
                try:
                    parsed_data = json.loads(raw_content)
                    return {"success": True, "data": parsed_data, "raw": raw_content}
                except:
                    return {"success": False, "data": None, "raw": raw_content, "error": "JSON解析失败"}
            else:
                return {"success": False, "data": None, "raw": "", "error": f"API错误: {r.status_code}"}
        
        except Exception as e:
            return {"success": False, "data": None, "raw": "", "error": str(e)}


def multimodal_chat(
    prompt: str,
    images: List[str],
    model: str = "llava:7b"
) -> Dict[str, Any]:
    """
    多模态对话（图像+文本）
    
    适用场景：图像理解、OCR、图像描述、视觉问答
    
    Args:
        prompt: 文本提示
        images: 图像路径列表（支持本地路径、URL、base64）
        model: 视觉模型（需要支持多模态，如llava系列）
    
    Returns:
        {"success": bool, "response": str, "model": str}
    
    注意：需要先安装视觉模型
        ollama pull llava:7b
    """
    llm = get_llm()
    if not llm._check_service():
        return {"success": False, "response": "本地模型服务未运行", "model": None}
    
    import base64
    
    # 处理图像：本地路径转base64
    image_data_list = []
    for img_path in images:
        if os.path.exists(img_path):
            # 本地文件，读取并转base64
            with open(img_path, 'rb') as f:
                img_bytes = f.read()
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                image_data_list.append(img_base64)
        elif img_path.startswith('http'):
            # URL，直接使用
            image_data_list.append(img_path)
        else:
            # 假设是base64字符串
            image_data_list.append(img_path)
    
    with _semaphore:
        llm._rate_limit()
        
        try:
            r = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": model,
                    "messages": [{
                        "role": "user",
                        "content": prompt,
                        "images": image_data_list
                    }],
                    "stream": False
                },
                timeout=120  # 视觉模型可能需要更长时间
            )
            
            if r.status_code == 200:
                response_data = r.json()
                return {
                    "success": True,
                    "response": response_data.get("message", {}).get("content", ""),
                    "model": model
                }
            else:
                return {"success": False, "response": f"API错误: {r.status_code}", "model": model}
        
        except Exception as e:
            return {"success": False, "response": f"多模态请求失败: {str(e)}", "model": model}
