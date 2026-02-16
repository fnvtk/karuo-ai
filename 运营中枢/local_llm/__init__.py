"""
卡若AI 本地模型共享模块（兼容层）

合并自 _共享模块，实际实现位于 04_卡火（火）/火种_知识模型/本地模型/脚本/
"""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SCRIPT_DIR = _REPO_ROOT / "04_卡火（火）" / "火种_知识模型" / "本地模型" / "脚本"
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from local_llm_sdk import (
    LocalLLM,
    get_llm,
    summarize,
    extract_info,
    classify,
    generate_questions,
    analyze_task,
    write_draft,
    semantic_search,
    check_service,
    get_usage_notice_text,
    format_response_with_notice,
    SHOW_USAGE_NOTICE,
    CPU_TARGET,
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
