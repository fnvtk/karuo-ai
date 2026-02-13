#!/usr/bin/env python3
"""
卡若AI 自动记忆管理系统

功能：
1. 自动读取记忆文档
2. 智能分类内容
3. 自动存储到对应位置

作者: 卡人（水）
日期: 2026-01-28
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path

# 记忆文档路径
MEMORY_ROOT = Path("/Users/karuo/Documents/个人")
MAIN_MEMORY_FILE = MEMORY_ROOT / "记忆.md"
MEMORY_DIR = MEMORY_ROOT / "记忆"

# 分类映射
CATEGORY_MAP = {
    "项目": "项目",
    "技术": "技术",
    "商业": "商业",
    "学习": "学习",
    "偏好": "偏好",
    "人脉": "人脉",
    "原则": "原则",
    "其他": "其他"
}

# 分类关键词
CATEGORY_KEYWORDS = {
    "项目": ["项目", "完成", "上线", "部署", "功能", "模块", "版本", "MVP", "SaaS"],
    "技术": ["技术", "代码", "架构", "API", "SDK", "集成", "优化", "修复", "bug", "性能"],
    "商业": ["商业", "ROI", "成本", "收入", "分润", "合作", "招商", "模式", "变现"],
    "学习": ["学习", "读书", "课程", "笔记", "总结", "经验", "教训"],
    "偏好": ["偏好", "习惯", "喜欢", "不喜欢", "风格", "方式"],
    "人脉": ["人脉", "认识", "合作", "关系", "朋友", "合伙人"],
    "原则": ["原则", "规则", "规范", "决策", "价值观"]
}


class MemoryManager:
    """记忆管理器"""
    
    def __init__(self):
        self.main_file = MAIN_MEMORY_FILE
        self.memory_dir = MEMORY_DIR
        self._ensure_dirs()
    
    def _ensure_dirs(self):
        """确保目录存在"""
        self.memory_dir.mkdir(parents=True, exist_ok=True)
    
    def read_all_memories(self) -> Dict[str, str]:
        """
        读取所有记忆文档
        
        Returns:
            {"main": str, "人脉": str, "原则": str, ...}
        """
        memories = {}
        
        # 读取主记忆文档
        if self.main_file.exists():
            memories["main"] = self.main_file.read_text(encoding="utf-8")
        else:
            memories["main"] = ""
        
        # 读取分类记忆文档
        for file_name in ["人脉.md", "原则.md", "方法论.md", "底层框架.md", "记忆.md"]:
            file_path = self.memory_dir / file_name
            if file_path.exists():
                key = file_name.replace(".md", "")
                memories[key] = file_path.read_text(encoding="utf-8")
            else:
                memories[key] = ""
        
        return memories
    
    def classify_content(self, content: str) -> str:
        """
        智能分类内容
        
        Args:
            content: 要分类的内容
        
        Returns:
            分类名称
        """
        content_lower = content.lower()
        
        # 统计关键词匹配数
        scores = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in content_lower)
            if score > 0:
                scores[category] = score
        
        # 返回得分最高的分类
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return "其他"
    
    def format_entry(self, content: str, category: str = None) -> str:
        """
        格式化记忆条目
        
        Args:
            content: 内容
            category: 分类（可选，会自动识别）
        
        Returns:
            格式化后的条目
        """
        if category is None:
            category = self.classify_content(content)
        
        now = datetime.now()
        time_str = now.strftime("%H:%M")
        date_str = now.strftime("%Y-%m-%d")
        
        return f"- [{time_str}] [{category}] {content}"
    
    def save_to_main_memory(self, content: str, category: str = None) -> bool:
        """
        保存到主记忆文档
        
        Args:
            content: 内容
            category: 分类
        
        Returns:
            是否成功
        """
        try:
            # 读取现有内容
            if self.main_file.exists():
                text = self.main_file.read_text(encoding="utf-8")
            else:
                text = "# 卡若 长期记忆\n\n> 自动记录长期偏好、规则、读书笔记\n\n---\n\n"
            
            # 格式化条目
            entry = self.format_entry(content, category)
            
            # 获取今天的日期
            today = datetime.now().strftime("%Y-%m-%d")
            
            # 检查是否已有今天的日期标题
            date_pattern = rf"### {today}"
            if re.search(date_pattern, text):
                # 在今天的日期下添加条目
                text = re.sub(
                    rf"({date_pattern}.*?\n)",
                    rf"\1{entry}\n",
                    text,
                    flags=re.DOTALL
                )
            else:
                # 添加今天的日期标题和条目
                if "## 日期记录" in text:
                    text = text.replace(
                        "## 日期记录",
                        f"## 日期记录\n\n### {today}\n\n{entry}\n"
                    )
                else:
                    text += f"\n## 日期记录\n\n### {today}\n\n{entry}\n"
            
            # 保存
            self.main_file.write_text(text, encoding="utf-8")
            return True
        
        except Exception as e:
            print(f"保存记忆失败: {e}")
            return False
    
    def save_to_category_memory(self, content: str, category: str, subcategory: str = None) -> bool:
        """
        保存到分类记忆文档
        
        Args:
            content: 内容
            category: 分类（人脉/原则/方法论等）
            subcategory: 子分类（可选）
        
        Returns:
            是否成功
        """
        try:
            file_path = self.memory_dir / f"{category}.md"
            
            # 读取现有内容
            if file_path.exists():
                text = file_path.read_text(encoding="utf-8")
            else:
                text = f"# {category}\n\n> 自动记录{category}相关信息\n\n---\n\n"
            
            # 格式化条目
            now = datetime.now()
            time_str = now.strftime("%H:%M")
            date_str = now.strftime("%Y-%m-%d")
            
            if subcategory:
                entry = f"- [{date_str} {time_str}] [{subcategory}] {content}\n"
            else:
                entry = f"- [{date_str} {time_str}] {content}\n"
            
            # 添加到文档末尾
            text += f"\n{entry}"
            
            # 保存
            file_path.write_text(text, encoding="utf-8")
            return True
        
        except Exception as e:
            print(f"保存分类记忆失败: {e}")
            return False
    
    def save_content(self, content: str, category: str = None, auto_classify: bool = True) -> bool:
        """
        保存内容（自动选择位置）
        
        Args:
            content: 内容
            category: 分类（可选）
            auto_classify: 是否自动分类
        
        Returns:
            是否成功
        """
        if auto_classify and category is None:
            category = self.classify_content(content)
        
        # 特殊分类保存到专门文件
        if category in ["人脉", "原则", "方法论", "底层框架"]:
            return self.save_to_category_memory(content, category)
        else:
            return self.save_to_main_memory(content, category)
    
    def check_duplicate(self, content: str, days: int = 7) -> bool:
        """
        检查是否重复（最近N天内）
        
        Args:
            content: 内容
            days: 检查天数
        
        Returns:
            是否重复
        """
        memories = self.read_all_memories()
        
        # 提取内容关键词
        content_keywords = set(re.findall(r'\w+', content.lower()))
        
        # 检查最近N天的记忆
        cutoff_date = datetime.now().timestamp() - days * 24 * 3600
        
        for mem_text in memories.values():
            # 简单匹配：检查是否有相似内容
            if len(content_keywords) > 0:
                matches = sum(1 for kw in content_keywords if kw in mem_text.lower())
                if matches >= len(content_keywords) * 0.5:  # 50%关键词匹配
                    return True
        
        return False


# ============== CLI入口 ==============

if __name__ == "__main__":
    import sys
    
    mm = MemoryManager()
    
    if len(sys.argv) < 2:
        print("卡若AI 记忆管理器")
        print("-" * 40)
        print("用法:")
        print("  python memory_manager.py save '内容' [分类]")
        print("  python memory_manager.py read")
        print("  python memory_manager.py classify '内容'")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "save" and len(sys.argv) > 2:
        content = sys.argv[2]
        category = sys.argv[3] if len(sys.argv) > 3 else None
        
        # 检查重复
        if mm.check_duplicate(content):
            print(f"⚠️ 检测到重复内容，跳过保存")
            sys.exit(0)
        
        success = mm.save_content(content, category)
        if success:
            print(f"✅ 已保存到记忆: {content[:50]}...")
        else:
            print(f"❌ 保存失败")
    
    elif cmd == "read":
        memories = mm.read_all_memories()
        print("📚 记忆内容:")
        for key, value in memories.items():
            if value:
                print(f"\n{key}:")
                print(value[:200] + "..." if len(value) > 200 else value)
    
    elif cmd == "classify" and len(sys.argv) > 2:
        content = sys.argv[2]
        category = mm.classify_content(content)
        print(f"分类: {category}")
    
    else:
        print(f"未知命令: {cmd}")
