#!/usr/bin/env python3
"""
🔥 卡若AI 本地模型交互窗口
直接与本地Ollama模型对话，可调用卡若AI执行任务

使用方法：
    python chat.py          # 默认使用 qwen2.5:1.5b
    python chat.py --small  # 使用更快的 qwen2.5:0.5b

快捷命令：
    /model [名称]  - 切换模型
    /clear        - 清空对话
    /skills       - 查看可用技能
    /run [技能]   - 执行技能
    /help         - 显示帮助
    /exit         - 退出

作者: 卡若AI
"""

import sys
import os
import argparse
import subprocess
import json
import glob

# 卡若AI工作台路径
KARUO_AI_PATH = "/Users/karuo/Documents/个人/卡若AI"

# Ollama配置
OLLAMA_URL = "http://localhost:11434"
MODELS = {
    "large": "qwen2.5:1.5b",
    "small": "qwen2.5:0.5b",
}

# 颜色配置
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

# 五行助手配置
ASSISTANTS = {
    "金": {"name": "卡资", "emoji": "🛠️", "focus": "服务器、设备、数据库、NAS"},
    "水": {"name": "卡人", "emoji": "📁", "focus": "任务规划、文件整理、归档"},
    "木": {"name": "卡木", "emoji": "🎨", "focus": "前端、项目、视频"},
    "火": {"name": "卡火", "emoji": "🔥", "focus": "代码、调试、学习"},
    "土": {"name": "卡土", "emoji": "💰", "focus": "商业、招商、技能"},
}

def print_header():
    """打印欢迎信息"""
    print(f"""
{Colors.CYAN}╔══════════════════════════════════════════════════════════╗
║  {Colors.BOLD}🔥 卡若AI 本地助手{Colors.END}{Colors.CYAN}                                    ║
║  离线可用 | 可调用Skills | 五行助手协作                   ║
╚══════════════════════════════════════════════════════════╝{Colors.END}
""")

def print_help():
    """打印帮助信息"""
    print(f"""
{Colors.YELLOW}💬 对话命令：{Colors.END}
  /model [名称]   切换模型 (large/small)
  /clear         清空对话历史
  /models        显示可用模型

{Colors.YELLOW}🛠️ 卡若AI命令：{Colors.END}
  /skills        查看所有可用技能
  /run [技能名]   执行指定技能的脚本
  /team          查看五行助手团队
  @卡资/卡人/...  指定助手回答

{Colors.YELLOW}📂 快捷操作：{Colors.END}
  /open [路径]   用Finder打开目录
  /code [路径]   用Cursor打开项目

{Colors.YELLOW}其他：{Colors.END}
  /help          显示此帮助
  /exit          退出程序
  Ctrl+C        中断当前生成
""")

def check_ollama():
    """检查Ollama服务是否运行"""
    try:
        import urllib.request
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except:
        return False

def get_available_models():
    """获取可用模型列表"""
    try:
        import urllib.request
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            return [m["name"] for m in data.get("models", [])]
    except:
        return []

def get_skills():
    """获取所有可用技能"""
    skills = []
    skill_pattern = os.path.join(KARUO_AI_PATH, "**/SKILL.md")
    for skill_file in glob.glob(skill_pattern, recursive=True):
        # 解析技能信息
        rel_path = os.path.relpath(skill_file, KARUO_AI_PATH)
        parts = rel_path.split(os.sep)
        
        # 获取技能名称（从目录名）
        skill_dir = os.path.dirname(skill_file)
        skill_name = os.path.basename(skill_dir)
        
        # 确定所属助手
        assistant = "通用"
        if "卡资" in rel_path or "金" in rel_path:
            assistant = "卡资(金)"
        elif "卡人" in rel_path or "水" in rel_path:
            assistant = "卡人(水)"
        elif "卡木" in rel_path or "木" in rel_path:
            assistant = "卡木(木)"
        elif "卡火" in rel_path or "火" in rel_path:
            assistant = "卡火(火)"
        elif "卡土" in rel_path or "土" in rel_path:
            assistant = "卡土(土)"
        
        skills.append({
            "name": skill_name,
            "assistant": assistant,
            "path": skill_dir,
            "skill_file": skill_file
        })
    
    return skills

def print_skills():
    """打印技能列表"""
    skills = get_skills()
    if not skills:
        print(f"{Colors.YELLOW}暂无可用技能{Colors.END}\n")
        return
    
    print(f"\n{Colors.YELLOW}📚 卡若AI 技能库 ({len(skills)}个){Colors.END}\n")
    
    # 按助手分组
    by_assistant = {}
    for s in skills:
        a = s["assistant"]
        if a not in by_assistant:
            by_assistant[a] = []
        by_assistant[a].append(s)
    
    for assistant, skill_list in sorted(by_assistant.items()):
        print(f"{Colors.CYAN}{assistant}：{Colors.END}")
        for s in skill_list:
            print(f"  • {s['name']}")
        print()

def run_skill(skill_name):
    """执行技能"""
    skills = get_skills()
    matched = [s for s in skills if skill_name.lower() in s["name"].lower()]
    
    if not matched:
        print(f"{Colors.RED}❌ 未找到技能: {skill_name}{Colors.END}")
        print(f"输入 /skills 查看可用技能\n")
        return
    
    if len(matched) > 1:
        print(f"{Colors.YELLOW}找到多个匹配：{Colors.END}")
        for i, s in enumerate(matched):
            print(f"  {i+1}. {s['name']} ({s['assistant']})")
        print()
        return
    
    skill = matched[0]
    skill_dir = skill["path"]
    scripts_dir = os.path.join(skill_dir, "scripts")
    
    print(f"{Colors.GREEN}▶ 执行技能: {skill['name']}{Colors.END}")
    print(f"{Colors.DIM}路径: {skill_dir}{Colors.END}\n")
    
    # 查找可执行脚本
    if os.path.isdir(scripts_dir):
        scripts = []
        for ext in ["*.py", "*.sh"]:
            scripts.extend(glob.glob(os.path.join(scripts_dir, ext)))
        
        if scripts:
            print(f"{Colors.YELLOW}可用脚本：{Colors.END}")
            for i, script in enumerate(scripts):
                print(f"  {i+1}. {os.path.basename(script)}")
            print(f"\n{Colors.DIM}使用方法: python {scripts[0]}{Colors.END}\n")
        else:
            print(f"{Colors.DIM}无可执行脚本，请查看SKILL.md了解使用方法{Colors.END}\n")
    else:
        print(f"{Colors.DIM}无scripts目录，请查看SKILL.md了解使用方法{Colors.END}\n")

def print_team():
    """打印五行助手团队"""
    print(f"\n{Colors.YELLOW}🌟 卡若AI 五行助手团队{Colors.END}\n")
    for element, info in ASSISTANTS.items():
        print(f"  {info['emoji']} {Colors.BOLD}{info['name']}({element}){Colors.END}")
        print(f"     {Colors.DIM}{info['focus']}{Colors.END}")
    print()

def chat_with_ollama(prompt, model, context=None, system_prompt=None):
    """调用Ollama生成回复（流式输出）"""
    import urllib.request
    
    # 构建完整提示词
    full_prompt = prompt
    if system_prompt:
        full_prompt = f"[系统设定] {system_prompt}\n\n[用户] {prompt}"
    
    payload = {
        "model": model,
        "prompt": full_prompt,
        "stream": True,
    }
    if context:
        payload["context"] = context
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    
    full_response = ""
    new_context = None
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                if line:
                    chunk = json.loads(line.decode())
                    text = chunk.get("response", "")
                    full_response += text
                    print(text, end="", flush=True)
                    
                    if chunk.get("done"):
                        new_context = chunk.get("context")
                        break
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}[已中断]{Colors.END}")
    
    print()  # 换行
    return full_response, new_context

def get_assistant_prompt(name):
    """获取助手专属系统提示词"""
    prompts = {
        "卡资": "你是卡资(金)，负责基础设施：服务器、设备、存储、数据库。说话风格稳重谨慎，口头禅是'稳了'。",
        "卡人": "你是卡人(水)，负责信息流程：任务规划、文件整理、归档。说话风格灵活有序，口头禅是'搞定了，清清爽爽'。",
        "卡木": "你是卡木(木)，负责产品内容：前端、项目、视频。说话风格务实高效，口头禅是'搞起！'。",
        "卡火": "你是卡火(火)，负责技术研发：代码调试、追问、学习。说话风格深度思考，口头禅是'让我想想...'。",
        "卡土": "你是卡土(土)，负责商业复制：技能工厂、商业模式、招商。说话风格商业敏锐，口头禅是'先算账'。",
    }
    return prompts.get(name, None)

def main():
    parser = argparse.ArgumentParser(description="卡若AI 本地模型交互窗口")
    parser.add_argument("--small", action="store_true", help="使用更快的小模型 (qwen2.5:0.5b)")
    parser.add_argument("--model", type=str, help="指定模型名称")
    args = parser.parse_args()
    
    # 检查Ollama服务
    if not check_ollama():
        print(f"{Colors.RED}❌ Ollama服务未运行！{Colors.END}")
        print(f"请先启动Ollama: {Colors.CYAN}ollama serve{Colors.END}")
        print("或等待自动启动...")
        # 尝试启动Ollama
        try:
            subprocess.Popen(["ollama", "serve"], 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
            import time
            time.sleep(3)
            if not check_ollama():
                sys.exit(1)
            print(f"{Colors.GREEN}✓ Ollama已启动{Colors.END}\n")
        except:
            sys.exit(1)
    
    # 选择模型
    if args.model:
        current_model = args.model
    elif args.small:
        current_model = MODELS["small"]
    else:
        current_model = MODELS["large"]
    
    # 验证模型是否可用
    available = get_available_models()
    if current_model not in available:
        print(f"{Colors.YELLOW}⚠️  模型 {current_model} 未安装{Colors.END}")
        if available:
            current_model = available[0]
            print(f"使用: {current_model}")
        else:
            print(f"{Colors.RED}没有可用模型！请先安装: ollama pull qwen2.5:1.5b{Colors.END}")
            sys.exit(1)
    
    # 打印欢迎信息
    print_header()
    print(f"{Colors.GREEN}✓ 当前模型: {current_model}{Colors.END}")
    print(f"{Colors.CYAN}输入 /help 查看帮助，/skills 查看技能{Colors.END}\n")
    
    context = None  # 对话上下文
    current_assistant = None  # 当前指定的助手
    
    while True:
        try:
            # 获取用户输入
            prompt_prefix = f"{Colors.BOLD}你：{Colors.END}"
            if current_assistant:
                prompt_prefix = f"{Colors.BOLD}你 → {current_assistant}：{Colors.END}"
            
            user_input = input(prompt_prefix).strip()
            
            if not user_input:
                continue
            
            # 检查是否指定助手 (@卡资 @卡人 等)
            if user_input.startswith("@"):
                parts = user_input.split(maxsplit=1)
                assistant_name = parts[0][1:]  # 去掉@
                
                # 匹配助手
                matched_assistant = None
                for element, info in ASSISTANTS.items():
                    if assistant_name in [info["name"], element]:
                        matched_assistant = info["name"]
                        break
                
                if matched_assistant:
                    current_assistant = matched_assistant
                    if len(parts) > 1:
                        user_input = parts[1]
                    else:
                        print(f"{Colors.GREEN}✓ 已切换到 {matched_assistant}，请输入问题{Colors.END}\n")
                        continue
                else:
                    print(f"{Colors.YELLOW}未知助手: {assistant_name}，输入 /team 查看团队{Colors.END}\n")
                    continue
            
            # 处理快捷命令
            if user_input.startswith("/"):
                cmd_parts = user_input[1:].split(maxsplit=1)
                cmd = cmd_parts[0].lower()
                cmd_arg = cmd_parts[1] if len(cmd_parts) > 1 else ""
                
                if cmd in ["exit", "quit", "q"]:
                    print(f"{Colors.CYAN}再见！{Colors.END}")
                    break
                    
                elif cmd == "help":
                    print_help()
                    
                elif cmd == "clear":
                    context = None
                    current_assistant = None
                    print(f"{Colors.GREEN}✓ 对话历史已清空{Colors.END}\n")
                    
                elif cmd == "models":
                    models = get_available_models()
                    print(f"{Colors.YELLOW}可用模型：{Colors.END}")
                    for m in models:
                        marker = "→" if m == current_model else " "
                        print(f"  {marker} {m}")
                    print()
                    
                elif cmd == "model":
                    if cmd_arg:
                        new_model = MODELS.get(cmd_arg, cmd_arg)
                        if new_model in get_available_models():
                            current_model = new_model
                            context = None
                            print(f"{Colors.GREEN}✓ 已切换到: {current_model}{Colors.END}\n")
                        else:
                            print(f"{Colors.RED}❌ 模型不可用: {new_model}{Colors.END}\n")
                    else:
                        print(f"当前模型: {current_model}\n")
                        
                elif cmd == "skills":
                    print_skills()
                    
                elif cmd == "run":
                    if cmd_arg:
                        run_skill(cmd_arg)
                    else:
                        print(f"用法: /run <技能名>\n")
                        
                elif cmd == "team":
                    print_team()
                    
                elif cmd == "open":
                    path = cmd_arg or KARUO_AI_PATH
                    if not os.path.isabs(path):
                        path = os.path.join(KARUO_AI_PATH, path)
                    subprocess.run(["open", path])
                    print(f"{Colors.GREEN}✓ 已打开: {path}{Colors.END}\n")
                    
                elif cmd == "code":
                    path = cmd_arg or KARUO_AI_PATH
                    if not os.path.isabs(path):
                        path = os.path.join(KARUO_AI_PATH, path)
                    subprocess.run(["cursor", path])
                    print(f"{Colors.GREEN}✓ 已在Cursor中打开: {path}{Colors.END}\n")
                    
                else:
                    print(f"{Colors.YELLOW}未知命令: /{cmd}，输入 /help 查看帮助{Colors.END}\n")
                    
                continue
            
            # 获取系统提示词
            system_prompt = None
            if current_assistant:
                system_prompt = get_assistant_prompt(current_assistant)
            
            # 调用模型生成回复
            response_prefix = f"{Colors.CYAN}AI：{Colors.END}"
            if current_assistant:
                response_prefix = f"{Colors.CYAN}{current_assistant}：{Colors.END}"
            
            print(response_prefix, end="")
            response, context = chat_with_ollama(user_input, current_model, context, system_prompt)
            print()  # 空行分隔
            
        except KeyboardInterrupt:
            print(f"\n{Colors.CYAN}再见！{Colors.END}")
            break
        except EOFError:
            print(f"\n{Colors.CYAN}再见！{Colors.END}")
            break

if __name__ == "__main__":
    main()
