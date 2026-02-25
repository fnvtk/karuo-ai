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
import smtplib
from email.message import EmailMessage
from typing import Any, Dict, List, Optional, Tuple

import yaml
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
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
    auth = request.headers.get("authorization", "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    header_name = _auth_header_name(cfg)
    api_key = request.headers.get(header_name, "").strip()
    if api_key:
        return api_key
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


def _split_csv_env(value: str) -> List[str]:
    if not value:
        return []
    s = value.replace("\n", ",").replace(";", ",")
    return [x.strip() for x in s.split(",") if x.strip()]


def _build_provider_queue(llm_cfg: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    构建 LLM 接口队列：
    1) 优先读取 OPENAI_API_BASES / OPENAI_API_KEYS / OPENAI_MODELS（逗号分隔）
    2) 若未配置队列，则回退到单接口 OPENAI_API_BASE / OPENAI_API_KEY / OPENAI_MODEL
    """
    base_env = llm_cfg.get("api_base_env", "OPENAI_API_BASE")
    key_env = llm_cfg.get("api_key_env", "OPENAI_API_KEY")
    model_env = llm_cfg.get("model_env", "OPENAI_MODEL")
    bases_env = llm_cfg.get("api_bases_env", "OPENAI_API_BASES")
    keys_env = llm_cfg.get("api_keys_env", "OPENAI_API_KEYS")
    models_env = llm_cfg.get("models_env", "OPENAI_MODELS")

    single_base = os.environ.get(base_env, "https://api.openai.com/v1").strip()
    single_key = os.environ.get(key_env, "").strip()
    single_model = os.environ.get(model_env, "gpt-4o-mini").strip() or "gpt-4o-mini"

    bases = _split_csv_env(os.environ.get(bases_env, ""))
    keys = _split_csv_env(os.environ.get(keys_env, ""))
    models = _split_csv_env(os.environ.get(models_env, ""))

    providers: List[Dict[str, str]] = []
    if bases:
        for i, b in enumerate(bases):
            key = keys[i] if i < len(keys) and keys[i] else single_key
            model = models[i] if i < len(models) and models[i] else single_model
            if not b or not key:
                continue
            providers.append({"base_url": b.rstrip("/"), "api_key": key, "model": model})
    elif single_key:
        providers.append({"base_url": single_base.rstrip("/"), "api_key": single_key, "model": single_model})
    return providers


def _is_unusable_llm_reply(text: str) -> bool:
    s = (text or "").strip().lower()
    if not s:
        return True
    refusal_signals = [
        "i'm sorry",
        "i am sorry",
        "not able to assist",
        "can't assist",
        "cannot assist",
        "无法协助",
        "不能协助",
    ]
    if any(sig in s for sig in refusal_signals) and len(s) <= 160:
        return True
    return False


def _send_provider_alert(cfg: Dict[str, Any], errors: List[str], prompt: str, matched_skill: str, skill_path: str) -> None:
    """
    当所有 LLM 接口都失败时，发邮件告警（支持 QQ SMTP）。
    环境变量：
    - ALERT_EMAIL_TO（默认 zhiqun@qq.com）
    - SMTP_HOST（默认 smtp.qq.com）
    - SMTP_PORT（默认 465）
    - SMTP_USER / SMTP_PASS
    """
    llm_cfg = _llm_settings(cfg)
    to_env = llm_cfg.get("alert_email_to_env", "ALERT_EMAIL_TO")
    smtp_host_env = llm_cfg.get("smtp_host_env", "SMTP_HOST")
    smtp_port_env = llm_cfg.get("smtp_port_env", "SMTP_PORT")
    smtp_user_env = llm_cfg.get("smtp_user_env", "SMTP_USER")
    smtp_pass_env = llm_cfg.get("smtp_pass_env", "SMTP_PASS")

    to_addr = os.environ.get(to_env, "zhiqun@qq.com").strip()
    smtp_host = os.environ.get(smtp_host_env, "smtp.qq.com").strip() or "smtp.qq.com"
    smtp_port = int(str(os.environ.get(smtp_port_env, "465") or "465").strip())
    smtp_user = os.environ.get(smtp_user_env, "").strip()
    smtp_pass = os.environ.get(smtp_pass_env, "").strip()

    # 避免因邮件配置不完整影响主流程
    if not (to_addr and smtp_user and smtp_pass):
        return

    cooldown = int(llm_cfg.get("alert_cooldown_seconds", 300) or 300)
    now = int(time.time())
    last_ts = int(getattr(app.state, "_last_provider_alert_ts", 0) or 0)
    if last_ts and now - last_ts < cooldown:
        return

    app.state._last_provider_alert_ts = now

    msg = EmailMessage()
    msg["Subject"] = "【卡若AI网关告警】全部LLM接口不可用"
    msg["From"] = smtp_user
    msg["To"] = to_addr
    safe_prompt = (prompt or "").strip()
    if len(safe_prompt) > 200:
        safe_prompt = safe_prompt[:200] + "..."
    body = (
        "卡若AI 网关检测到：本次请求所有上游接口都失败。\n\n"
        f"时间戳: {now}\n"
        f"匹配技能: {matched_skill} ({skill_path})\n"
        f"用户问题片段: {safe_prompt}\n\n"
        "错误列表:\n- " + "\n- ".join(errors[:10])
    )
    msg.set_content(body)

    # 先走 SSL（465），失败再尝试 STARTTLS（587）
    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as s:
            s.login(smtp_user, smtp_pass)
            s.send_message(msg)
            return
    except Exception:
        pass

    with smtplib.SMTP(smtp_host, 587, timeout=15) as s:
        s.ehlo()
        s.starttls()
        s.ehlo()
        s.login(smtp_user, smtp_pass)
        s.send_message(msg)


def build_reply_with_llm(prompt: str, cfg: Dict[str, Any], matched_skill: str, skill_path: str) -> str:
    """调用 LLM 生成回复（OpenAI 兼容）。未配置则返回模板回复。"""
    bootstrap = load_bootstrap()
    system = (
        f"你是卡若AI。请严格按以下规则回复：\n\n{bootstrap[:4000]}\n\n"
        f"当前匹配技能：{matched_skill}，路径：{skill_path}。"
        "先简短思考并输出，再给执行要点，最后必须带「[卡若复盘]」块（含目标·结果·达成率、过程 1 2 3、反思、总结、下一步）。"
    )
    llm_cfg = _llm_settings(cfg)
    providers = _build_provider_queue(llm_cfg)
    if providers:
        errors: List[str] = []
        for idx, p in enumerate(providers, start=1):
            try:
                import httpx

                r = httpx.post(
                    f"{p['base_url']}/chat/completions",
                    headers={"Authorization": f"Bearer {p['api_key']}", "Content-Type": "application/json"},
                    json={
                        "model": p["model"],
                        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                        "max_tokens": int(llm_cfg.get("max_tokens", 2000)),
                    },
                    timeout=float(llm_cfg.get("timeout_seconds", 60)),
                )
                if r.status_code == 200:
                    data = r.json()
                    reply = data["choices"][0]["message"]["content"]
                    if _is_unusable_llm_reply(reply):
                        errors.append(f"provider#{idx} unusable_reply={reply[:120]}")
                        continue
                    return reply
                errors.append(f"provider#{idx} status={r.status_code} body={r.text[:120]}")
            except Exception as e:
                errors.append(f"provider#{idx} exception={type(e).__name__}: {str(e)[:160]}")

        # 所有接口失败：邮件告警 + 降级回复
        try:
            _send_provider_alert(cfg, errors, prompt, matched_skill, skill_path)
        except Exception:
            # 告警失败不影响主流程，继续降级
            pass
        return _template_reply(prompt, matched_skill, skill_path, error=" | ".join(errors[:3]))
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


class OpenAIResponsesRequest(BaseModel):
    """
    OpenAI Responses API 兼容（简化版）：
    - input: 字符串 / 数组
    - model: 可选
    - stream: 可选
    """

    model: Optional[str] = "karuo-ai"
    input: Any
    stream: Optional[bool] = None


_CONTEXT_TAG_NOISE = (
    "<open_and_recently_viewed_files>",
    "</open_and_recently_viewed_files>",
    "<user_info>",
    "</user_info>",
    "<git_status>",
    "</git_status>",
    "<agent_transcripts>",
    "</agent_transcripts>",
    "<system_reminder>",
    "</system_reminder>",
)

_CONTEXT_TEXT_NOISE = (
    "user currently doesn't have any open files in their ide",
    "note: these files may or may not be relevant",
    "workspace paths:",
    "is directory a git repo:",
)


def _looks_like_context_noise(text: str) -> bool:
    s = (text or "").strip()
    if not s:
        return True
    low = s.lower()
    if any(tag in s for tag in _CONTEXT_TAG_NOISE):
        return True
    if any(tok in low for tok in _CONTEXT_TEXT_NOISE):
        return True
    return False


def _content_to_text(content: Any) -> str:
    """
    从 OpenAI 兼容 content 中提取“可对话文本”。
    仅接受 text/input_text/output_text，忽略 image/file/tool 等部分。
    """
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, dict):
        # 兼容 {"type":"input_text","text":"..."} / {"text":"..."}
        t = str(content.get("type", "")).strip().lower()
        txt = str(content.get("text", "")).strip()
        if txt and (not t or t in {"text", "input_text", "output_text"}):
            return txt
        nested = content.get("content")
        if nested is not None:
            return _content_to_text(nested)
        return ""

    if isinstance(content, list):
        chunks: List[str] = []
        for part in content:
            if isinstance(part, str):
                s = part.strip()
                if s:
                    chunks.append(s)
                continue
            if not isinstance(part, dict):
                continue
            part_type = str(part.get("type", "")).strip().lower()
            part_text = str(part.get("text", "")).strip()
            if part_text and (not part_type or part_type in {"text", "input_text", "output_text"}):
                chunks.append(part_text)
        return "\n".join(chunks).strip()

    return ""


def _messages_to_prompt(messages: List[Dict[str, Any]]) -> str:
    """
    优先取最后一条 user 消息；否则拼接全部文本。
    """
    last_user = ""
    chunks: List[str] = []
    for m in messages or []:
        role = str(m.get("role", "")).strip()
        content = _content_to_text(m.get("content", ""))
        if role and content and not _looks_like_context_noise(content):
            chunks.append(f"{role}: {content}")
        if role == "user" and content and not _looks_like_context_noise(content):
            last_user = content
    return (last_user or ("\n".join(chunks))).strip()


def _has_attachment_payload(node: Any) -> bool:
    if isinstance(node, dict):
        keys = {str(k).lower() for k in node.keys()}
        if keys.intersection({"image_url", "input_image", "image", "file", "input_file"}):
            return True
        t = str(node.get("type", "")).lower()
        if t in {"image_url", "input_image", "image", "file", "input_file"}:
            return True
        return any(_has_attachment_payload(v) for v in node.values())
    if isinstance(node, list):
        return any(_has_attachment_payload(x) for x in node)
    return False


async def _fallback_prompt_from_request_body(request: Request) -> str:
    """
    当标准 messages 解析失败时，从原始 body 尽力恢复用户文本。
    """
    try:
        raw = await request.body()
        if not raw:
            return ""
        data = json.loads(raw.decode("utf-8", errors="replace"))
    except Exception:
        return ""

    # 优先 messages（只取 user）
    user_texts: List[str] = []
    msgs = data.get("messages")
    if isinstance(msgs, list):
        for m in msgs:
            if not isinstance(m, dict):
                continue
            if str(m.get("role", "")).strip().lower() != "user":
                continue
            txt = _content_to_text(m.get("content", ""))
            if txt and not _looks_like_context_noise(txt):
                user_texts.append(txt)
    if user_texts:
        return user_texts[-1]

    # 兼容 responses API：input
    input_prompt = _responses_input_to_prompt(data.get("input"))
    if input_prompt and not _looks_like_context_noise(input_prompt):
        return input_prompt

    # 只有附件时兜底，避免 empty messages
    if _has_attachment_payload(data):
        return "[用户发送了附件，请结合上下文处理]"
    return ""


def _template_reply(prompt: str, matched_skill: str, skill_path: str, error: str = "") -> str:
    """未配置 LLM 或调用失败时返回卡若风格降级回复。"""
    note = ""
    if error:
        note = "（模型服务暂时不可用，已切到降级模式）"

    user_text = (prompt or "").strip()
    if len(user_text) > 120:
        user_text = user_text[:120] + "..."

    return (
        f"结论：我已收到你的真实问题，并进入处理。{note}\n"
        f"当前匹配技能：{matched_skill}（{skill_path}）\n"
        f"你的问题：{user_text}\n"
        "执行步骤：\n"
        "1) 先确认目标和约束。\n"
        "2) 给可直接执行的方案。\n"
        "3) 再补风险和下一步。\n\n"
        "[卡若复盘]\n"
        "目标&结果：恢复可用对话链路（达成率90%）\n"
        "过程：完成请求识别、技能匹配、降级回复。\n"
        "下一步：你发具体任务，我直接给执行结果。"
    )


def _as_openai_stream(reply: str, model: str, created: int):
    """
    OpenAI Chat Completions 流式（SSE）最小兼容实现。
    """
    chunk0 = {
        "id": f"chatcmpl-{created}",
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}],
    }
    chunk1 = {
        "id": f"chatcmpl-{created}",
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{"index": 0, "delta": {"content": reply}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(chunk0, ensure_ascii=False)}\n\n"
    yield f"data: {json.dumps(chunk1, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


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
        prompt = await _fallback_prompt_from_request_body(request)
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
    payload = {
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
    if bool(req.stream):
        model_name = str(req.model or "karuo-ai")
        return StreamingResponse(
            _as_openai_stream(reply=reply, model=model_name, created=now),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
    return payload


def _responses_input_to_prompt(input_value: Any) -> str:
    """
    将 Responses API 的 input 转成 prompt。
    """
    if isinstance(input_value, str):
        return input_value.strip()
    if isinstance(input_value, list):
        chunks: List[str] = []
        for item in input_value:
            if isinstance(item, str):
                chunks.append(item)
                continue
            if isinstance(item, dict):
                # 兼容 {"type":"input_text","text":"..."} / {"text":"..."}
                txt = str(item.get("text", "")).strip()
                if txt:
                    chunks.append(txt)
                    continue
                # 兼容 {"content":[...]} 形式
                c = item.get("content")
                if isinstance(c, list):
                    for part in c:
                        if isinstance(part, dict):
                            t = str(part.get("text", "")).strip()
                            if t:
                                chunks.append(t)
        if chunks:
            return "\n".join(chunks).strip()
    return ""


@app.post("/v1/responses")
async def openai_responses(req: OpenAIResponsesRequest, request: Request):
    """
    OpenAI Responses API 简化兼容：
    - 复用 chat/completions 逻辑
    """
    prompt = _responses_input_to_prompt(req.input)
    if not prompt:
        raise HTTPException(status_code=400, detail="empty input")

    chat_req = OpenAIChatCompletionsRequest(
        model=req.model or "karuo-ai",
        messages=[{"role": "user", "content": prompt}],
        stream=req.stream,
    )
    return await openai_chat_completions(chat_req, request)


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
