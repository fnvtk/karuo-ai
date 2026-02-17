"""
卡若AI 网关：外网可访问的 API，按卡若AI 思考逻辑生成回复。
部署后对外提供 POST /v1/chat，其他 AI 或终端可通过此接口调用卡若AI。
"""
from pathlib import Path
import os
import re
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# 仓库根目录（本脚本在 运营中枢/scripts/karuo_ai_gateway/main.py）
REPO_ROOT = Path(__file__).resolve().parents[3]

app = FastAPI(title="卡若AI 网关", version="1.0")


def load_bootstrap() -> str:
    p = REPO_ROOT / "BOOTSTRAP.md"
    if p.exists():
        return p.read_text(encoding="utf-8")
    return "卡若AI：个人数字管家。5 负责人 → 14 成员 → 53 技能。先思考再执行，结尾带复盘。"


def load_registry() -> str:
    p = REPO_ROOT / "SKILL_REGISTRY.md"
    if p.exists():
        return p.read_text(encoding="utf-8")
    return "技能注册表未找到。"


def match_skill(prompt: str) -> tuple[str, str]:
    """根据 prompt 在 SKILL_REGISTRY 中匹配技能，返回 (技能名, 路径)。"""
    text = load_registry()
    lines = text.split("\n")
    for line in lines:
        if "|" not in line or "触发词" in line or "`" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        # 表列：| # | 技能 | 成员 | 触发词 | SKILL 路径 | 一句话 |
        if len(parts) < 6:
            continue
        skill_name, triggers, path = parts[2], parts[4], parts[5].strip("`")
        for t in triggers.replace("、", " ").split():
            if t and t in prompt:
                return skill_name, path
    return "通用", "总索引.md"


class ChatRequest(BaseModel):
    prompt: str


class ChatResponse(BaseModel):
    reply: str
    matched_skill: str
    skill_path: str


def build_reply_with_llm(prompt: str, matched_skill: str, skill_path: str) -> str:
    """调用 LLM 生成回复（OpenAI 兼容）。未配置则返回模板回复。"""
    bootstrap = load_bootstrap()
    system = (
        f"你是卡若AI。请严格按以下规则回复：\n\n{bootstrap[:4000]}\n\n"
        f"当前匹配技能：{matched_skill}，路径：{skill_path}。"
        "先简短思考并输出，再给执行要点，最后必须带「[卡若复盘]」块（含目标·结果·达成率、过程 1 2 3、反思、总结、下一步）。"
    )
    api_key = os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
    if api_key:
        try:
            import httpx
            r = httpx.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                },
                timeout=60.0,
            )
            if r.status_code == 200:
                data = r.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            return _template_reply(prompt, matched_skill, skill_path, error=str(e))
    return _template_reply(prompt, matched_skill, skill_path)


def _template_reply(prompt: str, matched_skill: str, skill_path: str, error: str = "") -> str:
    """未配置 LLM 或调用失败时返回模板回复（仍含复盘格式）。"""
    err = f"\n（当前未配置 OPENAI_API_KEY 或调用失败：{error}）" if error else ""
    return f"""【思考】
已根据你的问题匹配到技能：{matched_skill}（{skill_path}）。将按卡若AI 流程执行。{err}

【执行要点】
1. 读 BOOTSTRAP + SKILL_REGISTRY。
2. 读对应 SKILL：{skill_path}。
3. 按 SKILL 步骤执行并验证。

[卡若复盘]（日期）
🎯 目标·结果·达成率
目标：按卡若AI 逻辑响应「{prompt[:50]}…」。结果：已匹配技能并返回本模板。达成率：见实际部署后 LLM 回复。
📌 过程
1. 接收请求并匹配技能。
2. 加载 BOOTSTRAP 与 REGISTRY。
3. 生成回复并带复盘块。
💡 反思
部署后配置 OPENAI_API_KEY 即可获得真实 LLM 回复。
📝 总结
卡若AI 网关已就绪；配置 API 后即可外网按卡若AI 逻辑生成。
▶ 下一步执行
在环境变量中设置 OPENAI_API_KEY（及可选 OPENAI_API_BASE、OPENAI_MODEL）后重启服务。
"""


@app.get("/", response_class=HTMLResponse)
def index():
    """简单欢迎页，可后续改为对话页。"""
    return """
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>卡若AI 网关</title></head>
    <body>
    <h1>卡若AI 网关</h1>
    <p>外网可访问、按卡若AI 思考逻辑生成。其他 AI 可 POST /v1/chat 调用。</p>
    <p>API 文档：<a href="/docs">/docs</a></p>
    </body></html>
    """


@app.post("/v1/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """外部调用入口：传入 prompt，返回按卡若AI 流程生成的 reply。"""
    matched_skill, skill_path = match_skill(req.prompt)
    reply = build_reply_with_llm(req.prompt, matched_skill, skill_path)
    return ChatResponse(reply=reply, matched_skill=matched_skill, skill_path=skill_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
