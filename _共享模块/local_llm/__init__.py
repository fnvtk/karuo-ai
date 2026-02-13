"""
卡若AI 本地模型共享模块

所有助手都可以通过此模块调用本地Ollama模型

使用方法：
    # 方式1：直接导入
    from _共享模块.local_llm import summarize, classify, generate_questions
    
    # 方式2：添加路径后导入
    import sys
    sys.path.append("/Users/karuo/Documents/个人/卡若AI")
    from _共享模块.local_llm import *

快速检查：
    from _共享模块.local_llm import check_service
    print(check_service())

作者: 卡火（火）
"""

import sys
import os

# 添加SDK路径
SDK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "04_卡火（火）/本地模型/scripts"
)
if SDK_PATH not in sys.path:
    sys.path.insert(0, SDK_PATH)

# 从SDK导入所有功能
from local_llm_sdk import (
    # 核心类
    LocalLLM,
    get_llm,
    
    # 便捷函数
    summarize,           # 文本摘要
    extract_info,        # 信息提取
    classify,            # 文本分类
    generate_questions,  # 生成问题
    analyze_task,        # 任务分析
    write_draft,         # 写作草稿
    semantic_search,     # 语义搜索
    check_service,       # 检查服务
    
    # 使用提醒相关
    get_usage_notice_text,     # 获取提醒文本
    format_response_with_notice,  # 格式化带提醒的响应
    SHOW_USAGE_NOTICE,         # 是否显示提醒（可修改）
    CPU_TARGET,                # CPU目标使用率
    
    # 配置
    MODELS,
    TASK_MODEL_MAP,
    OLLAMA_URL,
)

__all__ = [
    "LocalLLM",
    "get_llm",
    "summarize",
    "extract_info",
    "classify",
    "generate_questions",
    "analyze_task",
    "write_draft",
    "semantic_search",
    "check_service",
    "get_usage_notice_text",
    "format_response_with_notice",
    "SHOW_USAGE_NOTICE",
    "CPU_TARGET",
    "MODELS",
    "TASK_MODEL_MAP",
    "OLLAMA_URL",
]

__version__ = "1.0.0"
__author__ = "卡火（火）"
