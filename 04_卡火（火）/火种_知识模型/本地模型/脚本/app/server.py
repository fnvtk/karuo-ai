#!/usr/bin/env python3
"""
🔥 卡若AI 本地助手 - 后端服务
支持语音、记忆、Siri快捷指令

启动方式：python server.py
访问地址：http://localhost:5888
"""

import os
import sys
import json
import subprocess
import datetime
import re
import glob
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import threading

# 配置
PORT = 5888
OLLAMA_URL = "http://localhost:11434"
KARUO_AI_PATH = "/Users/karuo/Documents/个人/卡若AI"
MEMORY_FILE = "/Users/karuo/Documents/个人/记忆.md"

# 模型配置
MODELS = {
    "large": "qwen2.5:1.5b",
    "small": "qwen2.5:0.5b",
}
current_model = MODELS["large"]

# 对话历史（用于上下文）
conversation_history = []
MAX_HISTORY = 10

# ========== 记忆功能 ==========

def read_memory():
    """读取记忆文档"""
    try:
        with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return ""

def write_memory(content, category="记录"):
    """写入记忆"""
    try:
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M")
        
        # 读取现有内容
        existing = read_memory()
        
        # 查找或创建日期段落
        date_header = f"### {date_str}"
        entry = f"- [{time_str}] [{category}] {content}"
        
        if date_header in existing:
            # 在日期段落后追加
            lines = existing.split('\n')
            new_lines = []
            inserted = False
            for i, line in enumerate(lines):
                new_lines.append(line)
                if line.strip() == date_header and not inserted:
                    new_lines.append(entry)
                    inserted = True
            existing = '\n'.join(new_lines)
        else:
            # 创建新日期段落
            existing += f"\n\n{date_header}\n{entry}"
        
        with open(MEMORY_FILE, 'w', encoding='utf-8') as f:
            f.write(existing)
        
        return True
    except Exception as e:
        print(f"写入记忆失败: {e}")
        return False

def get_recent_memories(days=7):
    """获取最近几天的记忆"""
    content = read_memory()
    if not content:
        return "暂无记忆"
    
    # 提取最近的内容
    lines = content.split('\n')
    recent = []
    current_date = None
    
    for line in lines[-100:]:  # 只看最后100行
        if line.startswith('### '):
            current_date = line
        elif line.strip().startswith('- ['):
            recent.append(f"{current_date}\n{line}" if current_date else line)
    
    return '\n'.join(recent[-20:]) if recent else "暂无最近记忆"

# ========== Ollama调用 ==========

def call_ollama(prompt, stream=False):
    """调用Ollama模型"""
    global conversation_history
    
    # 构建带记忆和上下文的提示词
    memory_context = get_recent_memories(3)
    
    system_prompt = f"""你是卡若AI本地助手，可以帮助卡若处理各种任务。

【最近记忆】
{memory_context}

【对话历史】
{format_history()}

请用简洁的中文回答。如果用户让你记住什么，回复确认并我会帮你存储。"""
    
    full_prompt = f"{system_prompt}\n\n用户：{prompt}\n\n助手："
    
    payload = {
        "model": current_model,
        "prompt": full_prompt,
        "stream": stream,
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            if stream:
                return resp  # 返回流
            else:
                result = ""
                for line in resp:
                    chunk = json.loads(line.decode())
                    result += chunk.get("response", "")
                    if chunk.get("done"):
                        break
                
                # 更新对话历史
                conversation_history.append({"role": "user", "content": prompt})
                conversation_history.append({"role": "assistant", "content": result})
                if len(conversation_history) > MAX_HISTORY * 2:
                    conversation_history = conversation_history[-MAX_HISTORY * 2:]
                
                # 检查是否需要记忆
                if any(kw in prompt for kw in ["记住", "记下", "存入记忆", "别忘了"]):
                    write_memory(prompt.replace("记住", "").replace("记下", "").strip(), "用户记录")
                
                return result
    except Exception as e:
        return f"错误：{str(e)}"

def format_history():
    """格式化对话历史"""
    if not conversation_history:
        return "无"
    return "\n".join([
        f"{'用户' if h['role']=='user' else '助手'}：{h['content'][:100]}"
        for h in conversation_history[-6:]
    ])

# ========== Skills功能 ==========

def get_skills():
    """获取所有技能"""
    skills = []
    skill_pattern = os.path.join(KARUO_AI_PATH, "**/SKILL.md")
    for skill_file in glob.glob(skill_pattern, recursive=True):
        skill_dir = os.path.dirname(skill_file)
        skill_name = os.path.basename(skill_dir)
        rel_path = os.path.relpath(skill_file, KARUO_AI_PATH)
        
        # 确定所属助手
        assistant = "通用"
        if "金" in rel_path: assistant = "卡资"
        elif "水" in rel_path: assistant = "卡人"
        elif "木" in rel_path: assistant = "卡木"
        elif "火" in rel_path: assistant = "卡火"
        elif "土" in rel_path: assistant = "卡土"
        
        skills.append({"name": skill_name, "assistant": assistant, "path": skill_dir})
    return skills

# ========== 语音功能 ==========

def speak(text):
    """macOS语音合成"""
    # 清理文本
    text = re.sub(r'[*#`\[\]]', '', text)
    text = text[:500]  # 限制长度
    subprocess.Popen(['say', '-v', 'Tingting', text])

# ========== HTTP服务 ==========

class KaruoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.path.dirname(__file__), 'static'), **kwargs)
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            with open(os.path.join(os.path.dirname(__file__), 'static', 'index.html'), 'rb') as f:
                self.wfile.write(f.read())
        
        elif parsed.path == '/api/skills':
            skills = get_skills()
            self.send_json(skills)
        
        elif parsed.path == '/api/memory':
            memories = get_recent_memories(7)
            self.send_json({"memories": memories})
        
        elif parsed.path == '/api/status':
            # 检查Ollama状态
            try:
                req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
                with urllib.request.urlopen(req, timeout=2) as resp:
                    status = "online"
            except:
                status = "offline"
            self.send_json({"status": status, "model": current_model})
        
        elif parsed.path.startswith('/api/siri'):
            # Siri快捷指令接口
            params = parse_qs(parsed.query)
            query = params.get('q', [''])[0]
            if query:
                response = call_ollama(query)
                speak(response)  # 语音播报
                self.send_json({"response": response})
            else:
                self.send_json({"error": "缺少参数q"})
        
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}
        
        if parsed.path == '/api/chat':
            message = data.get('message', '')
            voice = data.get('voice', False)
            
            if message:
                response = call_ollama(message)
                if voice:
                    speak(response)
                self.send_json({"response": response})
            else:
                self.send_json({"error": "缺少消息内容"})
        
        elif parsed.path == '/api/memory':
            content = data.get('content', '')
            category = data.get('category', '用户记录')
            if content:
                success = write_memory(content, category)
                self.send_json({"success": success})
            else:
                self.send_json({"error": "缺少内容"})
        
        elif parsed.path == '/api/clear':
            global conversation_history
            conversation_history = []
            self.send_json({"success": True})
        
        elif parsed.path == '/api/model':
            global current_model
            model = data.get('model', 'large')
            current_model = MODELS.get(model, MODELS['large'])
            self.send_json({"model": current_model})
        
        else:
            self.send_json({"error": "未知接口"})
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        pass  # 静默日志

def run_server():
    """启动服务器"""
    server = HTTPServer(('0.0.0.0', PORT), KaruoHandler)
    print(f"🔥 卡若AI本地助手已启动")
    print(f"   访问地址: http://localhost:{PORT}")
    print(f"   Siri接口: http://localhost:{PORT}/api/siri?q=你的问题")
    print(f"   按 Ctrl+C 停止服务")
    server.serve_forever()

if __name__ == "__main__":
    # 确保Ollama运行
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        urllib.request.urlopen(req, timeout=2)
    except:
        print("正在启动Ollama...")
        subprocess.Popen(['ollama', 'serve'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import time
        time.sleep(3)
    
    run_server()
