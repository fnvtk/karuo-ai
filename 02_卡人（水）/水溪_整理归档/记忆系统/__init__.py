"""
卡若AI 自动记忆管理共享模块

所有助手都可以通过此模块调用记忆管理功能

使用方法：
    from _共享模块.memory import MemoryManager
    
    mm = MemoryManager()
    mm.save_content("完成了本地模型集成", category="项目")

作者: 卡人（水）
"""

import sys
import os
from pathlib import Path

# 添加记忆管理脚本路径
MEMORY_SCRIPT_PATH = Path(__file__).parent.parent.parent / "02_卡人（水）/自动记忆管理/scripts"
if str(MEMORY_SCRIPT_PATH) not in sys.path:
    sys.path.insert(0, str(MEMORY_SCRIPT_PATH))

from memory_manager import MemoryManager

__all__ = ["MemoryManager"]

__version__ = "1.0.0"
__author__ = "卡人（水）"
