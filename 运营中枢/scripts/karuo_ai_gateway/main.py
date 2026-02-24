"""
卡若AI 网关：外网可访问的 API，按卡若AI 思考逻辑生成回复。
部署后对外提供 POST /v1/chat，其他 AI 或终端可通过此接口调用卡若AI。
"""
from pathlib import Path
import os
import re
import time
import json
import hashlib
import hmac
from typing import Any, Dict, List, Optional, Tuple

import yaml
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# 仓库根目录（本脚本在 运营中枢/scripts/karuo_ai_gateway/main.py）
REPO_ROOT = Path(__file__).resolve().parents[3]

app = FastAPI(title="卡若AI 网关", version="1.0")

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "gateway.yaml"


def _is_abs_path(p: str) -> bool:
    try:
        return Path(p).is_absolute()
    except Exception:
        return False


def _resolve_path(p: str) -> Path:
    if _is_abs_path(p):
        return Path(p)
    return REPO_ROOT / p


def _read_yaml(path: Path) -> Dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_config() -> Dict[str, Any]:
    """
    读取网关配置（多租户/鉴权/白名单等）。
    - 默认路径：config/gateway.yaml（不入库；你可以从 gateway.example.yaml 复制一份）
    - 也支持通过环境变量 KARUO_GATEWAY_CONFIG 指定绝对/相对路径
    """
    p = os.environ.get("KARUO_GATEWAY_CONFIG", "").strip()
    cfg_path = _resolve_path(p) if p else DEFAULT_CONFIG_PATH
    if not cfg_path.exists():
        return {}
    try:
        return _read_yaml(cfg_path)
    except Exception:
        # 配置读失败时不要“悄悄放行”，避免外网误用
        raise


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _get_salt(cfg: Dict[str, Any]) -> str:
    auth = (cfg or {}).get("auth") or {}
    salt_env = auth.get("salt_env", "KARUO_GATEWAY_SALT")
    return os.environ.get(salt_env, "")


def _auth_header_name(cfg: Dict[str, Any]) -> str:
    auth = (cfg or {}).get("auth") or {}
    return auth.get("header_name", "X-Karuo-Api-Key")


def _tenant_by_key(cfg: Dict[str, Any], api_key_plain: str) -> Optional[Dict[str, Any]]:
    tenants = (cfg or {}).get("tenants") or []
    if not api_key_plain:
        return None
    salt = _get_salt(cfg)
    if not salt:
        return None
    key_hash = _sha256_hex(api_key_plain + salt)
    for t in tenants:
        if not isinstance(t, dict):
            continue
        stored = str(t.get("api_key_sha256", "")).strip()
        if stored and hmac.compare_digest(stored, key_hash):
            return t
    return None


def _get_api_key_from_request(request: Request, cfg: Dict[str, Any]) -> str:
    """
    兼容两种鉴权头：
    - X-Karuo-Api-Key: <key>（原生网关方式）
    - Authorization: Bearer <key>（OpenAI 兼容客户端常用）
    """
    header_name = _auth_header_name(cfg)
    api_key = request.headers.get(header_name, "").strip()
    if api_key:
        return api_key
    auth = request.headers.get("authorization", "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


def _rpm_allow(tenant_id: str, rpm: int) -> bool:
    """
    极简内存限流（单进程）；够用就行。
    - 生产建议用 Nginx/网关层限流
    """
    if rpm <= 0:
        return True
    now = time.time()
    window = int(now // 60)
    key = f"{tenant_id}:{window}"
    bucket = app.state.__dict__.setdefault("_rpm_bucket", {})
    cnt = bucket.get(key, 0) + 1
    bucket[key] = cnt
    return cnt <= rpm


def _log_access(cfg: Dict[str, Any], record: Dict[str, Any]) -> None:
    logging_cfg = (cfg or {}).get("logging") or {}
    if not logging_cfg.get("enabled", False):
        return
    path_raw = str(logging_cfg.get("path", "")).strip()
    if not path_raw:
        return
    p = _resolve_path(path_raw)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def load_bootstrap() -> str:
    p = REPO_ROOT / "BOOTSTRAP.md"
    if p.exists():
        return p.read_text(encoding="utf-8")
    return "卡若AI：个人数字管家。5 负责人 → 14 成员 → 53 技能。先思考再执行，结尾带复盘。"


def load_registry() -> str:
    cfg = load_config()
    skills_cfg = (cfg or {}).get("skills") or {}
    reg_path = skills_cfg.get("registry_path", "SKILL_REGISTRY.md")
    p = _resolve_path(reg_path)
    if p.exists():
        return p.read_text(encoding="utf-8")
    return "技能注册表未找到。"


def _normalize_trigger_token(t: str) -> str:
    t = t.strip()
    t = t.replace("**", "").replace("*", "")
    t = t.replace("`", "")
    return t.strip()


def _split_triggers(triggers: str) -> List[str]:
    s = triggers or ""
    for ch in ["、", "，", ",", "；", ";", "|", "/"]:
        s = s.replace(ch, " ")
    return [tok for tok in (_normalize_trigger_token(x) for x in s.split()) if tok]


def match_skill(prompt: str, cfg: Optional[Dict[str, Any]] = None) -> Tuple[str, str, str]:
    """根据 prompt 在 SKILL_REGISTRY 中匹配技能，返回 (技能ID, 技能名, 路径)。"""
    text = load_registry()
    lines = text.split("\n")
    for line in lines:
        if "|" not in line or "触发词" in line or "`" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        # 表列：| # | 技能 | 成员 | 触发词 | SKILL 路径 | 一句话 |
        if len(parts) < 7:
            continue
        skill_id = parts[1]
        skill_name = parts[2]
        triggers = parts[4]
        path = parts[5].strip("`")
        for t in _split_triggers(triggers):
            if t and t in prompt:
                return skill_id, skill_name, path

    skills_cfg = (cfg or load_config() or {}).get("skills") or {}
    on_no_match = skills_cfg.get("on_no_match", "allow_general")
    if on_no_match == "deny":
        return "", "", ""
    return "GENERAL", "通用", "总索引.md"


class ChatRequest(BaseModel):
    prompt: str


class ChatResponse(BaseModel):
    reply: str
    tenant_id: str = ""
    tenant_name: str = ""
    skill_id: str = ""
    matched_skill: str
    skill_path: str


def _llm_settings(cfg: Dict[str, Any]) -> Dict[str, Any]:
    return (cfg or {}).get("llm") or {}


def build_reply_with_llm(prompt: str, cfg: Dict[str, Any], matched_skill: str, skill_path: str) -> str:
    """调用 LLM 生成回复（OpenAI 兼容）。未配置则返回模板回复。"""
    bootstrap = load_bootstrap()
    system = (
        f"你是卡若AI。请严格按以下规则回复：\n\n{bootstrap[:4000]}\n\n"
        f"当前匹配技能：{matched_skill}，路径：{skill_path}。"
        "先简短思考并输出，再给执行要点，最后必须带「[卡若复盘]」块（含目标·结果·达成率、过程 1 2 3、反思、总结、下一步）。"
    )
    llm_cfg = _llm_settings(cfg)
    api_key = os.environ.get(llm_cfg.get("api_key_env", "OPENAI_API_KEY"))
    base_url = os.environ.get(llm_cfg.get("api_base_env", "OPENAI_API_BASE"), "https://api.openai.com/v1")
    if api_key:
        try:
            import httpx
            r = httpx.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": os.environ.get(llm_cfg.get("model_env", "OPENAI_MODEL"), "gpt-4o-mini"),
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                    "max_tokens": int(llm_cfg.get("max_tokens", 2000)),
                },
                timeout=float(llm_cfg.get("timeout_seconds", 60)),
            )
            if r.status_code == 200:
                data = r.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            return _template_reply(prompt, matched_skill, skill_path, error=str(e))
    return _template_reply(prompt, matched_skill, skill_path)


class OpenAIChatCompletionsRequest(BaseModel):
    """
    OpenAI 兼容：只实现 Cursor 常用字段。
    """

    model: str = "karuo-ai"
    messages: List[Dict[str, Any]]
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    stream: Optional[bool] = None


def _messages_to_prompt(messages: List[Dict[str, Any]]) -> str:
    """
    优先取最后一条 user 消息；否则拼接全部文本。
    """
    last_user = ""
    chunks: List[str] = []
    for m in messages or []:
        role = str(m.get("role", "")).strip()
        content = m.get("content", "")
        if isinstance(content, list):
            content = "\n".join(
                str(x.get("text", "")) for x in content if isinstance(x, dict) and x.get("type") == "text"
            )
        content = str(content)
        if role and content:
            chunks.append(f"{role}: {content}")
        if role == "user" and content:
            last_user = content
    return (last_user or ("\n".join(chunks))).strip()


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
async def chat(req: ChatRequest, request: Request):
    """外部调用入口：传入 prompt，返回按卡若AI 流程生成的 reply。"""
    cfg = load_config()

    # 1) 鉴权（如果有配置文件就强制开启）
    tenant: Optional[Dict[str, Any]] = None
    if cfg:
        api_key = _get_api_key_from_request(request, cfg)
        tenant = _tenant_by_key(cfg, api_key)
        if not tenant:
            raise HTTPException(status_code=401, detail="invalid api key")

    tenant_id = str((tenant or {}).get("id", "")).strip()
    tenant_name = str((tenant or {}).get("name", "")).strip()

    # 2) 限流/输入限制（可选）
    limits = (tenant or {}).get("limits") or {}
    max_prompt_chars = int(limits.get("max_prompt_chars", 0) or 0)
    if max_prompt_chars and len(req.prompt) > max_prompt_chars:
        raise HTTPException(status_code=413, detail="prompt too large")

    rpm = int(limits.get("rpm", 0) or 0)
    if tenant_id and rpm and not _rpm_allow(tenant_id, rpm):
        raise HTTPException(status_code=429, detail="rate limit exceeded")

    # 3) 技能匹配 + 白名单校验
    skill_id, matched_skill, skill_path = match_skill(req.prompt, cfg=cfg)
    if cfg and not (skill_id and matched_skill and skill_path):
        raise HTTPException(status_code=404, detail="no skill matched")

    if tenant:
        allowed = (tenant.get("allowed_skills") or []) if isinstance(tenant, dict) else []
        allowed = [str(x).strip() for x in allowed if str(x).strip()]
        if allowed:
            # 同时支持“技能ID白名单”和“SKILL路径白名单”
            if (skill_id not in allowed) and (skill_path not in allowed):
                raise HTTPException(status_code=403, detail="skill not allowed for tenant")

    reply = build_reply_with_llm(req.prompt, cfg, matched_skill, skill_path)

    # 4) 访问日志（默认不落 prompt 内容）
    logging_cfg = (cfg or {}).get("logging") or {}
    record: Dict[str, Any] = {
        "ts": int(time.time()),
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "skill_id": skill_id,
        "matched_skill": matched_skill,
        "skill_path": skill_path,
        "client": request.client.host if request.client else "",
        "ua": request.headers.get("user-agent", ""),
    }
    if bool(logging_cfg.get("log_request_body", False)):
        record["prompt"] = req.prompt
    _log_access(cfg, record)

    return ChatResponse(
        reply=reply,
        tenant_id=tenant_id,
        tenant_name=tenant_name,
        skill_id=skill_id,
        matched_skill=matched_skill,
        skill_path=skill_path,
    )


@app.get("/v1/models")
def openai_models():
    """
    OpenAI 兼容：给 Cursor/其他客户端一个可选模型列表。
    """
    now = int(time.time())
    return {
        "object": "list",
        "data": [
            {"id": "karuo-ai", "object": "model", "created": now, "owned_by": "karuo-ai-gateway"},
        ],
    }


@app.post("/v1/chat/completions")
async def openai_chat_completions(req: OpenAIChatCompletionsRequest, request: Request):
    """
    OpenAI 兼容入口：Cursor 的 “Override OpenAI Base URL” 会请求这个接口。
    鉴权：Authorization: Bearer <dept_key>（或 X-Karuo-Api-Key）
    """
    cfg = load_config()

    tenant: Optional[Dict[str, Any]] = None
    if cfg:
        api_key = _get_api_key_from_request(request, cfg)
        tenant = _tenant_by_key(cfg, api_key)
        if not tenant:
            raise HTTPException(status_code=401, detail="invalid api key")

    tenant_id = str((tenant or {}).get("id", "")).strip()
    tenant_name = str((tenant or {}).get("name", "")).strip()

    prompt = _messages_to_prompt(req.messages)
    if not prompt:
        raise HTTPException(status_code=400, detail="empty messages")

    limits = (tenant or {}).get("limits") or {}
    max_prompt_chars = int(limits.get("max_prompt_chars", 0) or 0)
    if max_prompt_chars and len(prompt) > max_prompt_chars:
        raise HTTPException(status_code=413, detail="prompt too large")

    rpm = int(limits.get("rpm", 0) or 0)
    if tenant_id and rpm and not _rpm_allow(tenant_id, rpm):
        raise HTTPException(status_code=429, detail="rate limit exceeded")

    skill_id, matched_skill, skill_path = match_skill(prompt, cfg=cfg)
    if cfg and not (skill_id and matched_skill and skill_path):
        raise HTTPException(status_code=404, detail="no skill matched")

    if tenant:
        allowed = (tenant.get("allowed_skills") or []) if isinstance(tenant, dict) else []
        allowed = [str(x).strip() for x in allowed if str(x).strip()]
        if allowed:
            if (skill_id not in allowed) and (skill_path not in allowed):
                raise HTTPException(status_code=403, detail="skill not allowed for tenant")

    # OpenAI 客户端的 max_tokens：临时覆盖配置
    if req.max_tokens is not None:
        llm_cfg = dict(_llm_settings(cfg))
        llm_cfg["max_tokens"] = int(req.max_tokens)
        cfg = dict(cfg or {})
        cfg["llm"] = llm_cfg

    reply = build_reply_with_llm(prompt, cfg, matched_skill, skill_path)

    logging_cfg = (cfg or {}).get("logging") or {}
    record: Dict[str, Any] = {
        "ts": int(time.time()),
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "skill_id": skill_id,
        "matched_skill": matched_skill,
        "skill_path": skill_path,
        "client": request.client.host if request.client else "",
        "ua": request.headers.get("user-agent", ""),
        "openai_compatible": True,
        "requested_model": req.model,
    }
    if bool(logging_cfg.get("log_request_body", False)):
        record["prompt"] = prompt
    _log_access(cfg, record)

    now = int(time.time())
    return {
        "id": f"chatcmpl-{now}",
        "object": "chat.completion",
        "created": now,
        "model": req.model or "karuo-ai",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": reply},
                "finish_reason": "stop",
            }
        ],
    }


@app.get("/v1/health")
def health():
    return {"ok": True}


@app.get("/v1/skills")
def allowed_skills(request: Request):
    """
    返回该 tenant 允许的技能清单（需要 key）。
    用途：部门侧自查权限/联调。
    """
    cfg = load_config()
    if not cfg:
        return {"tenants_enabled": False, "allowed_skills": []}
    header_name = _auth_header_name(cfg)
    api_key = _get_api_key_from_request(request, cfg)
    tenant = _tenant_by_key(cfg, api_key)
    if not tenant:
        raise HTTPException(status_code=401, detail="invalid api key")
    allowed = tenant.get("allowed_skills") or []
    allowed = [str(x).strip() for x in allowed if str(x).strip()]
    return {
        "tenants_enabled": True,
        "tenant_id": str(tenant.get("id", "")).strip(),
        "tenant_name": str(tenant.get("name", "")).strip(),
        "allowed_skills": allowed,
        "header_name": header_name,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
