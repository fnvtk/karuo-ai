"""
卡若AI 网关：外网可访问的 API，按卡若AI 思考逻辑生成回复。
部署后对外提供 POST /v1/chat，其他 AI 或终端可通过此接口调用卡若AI。
"""
from pathlib import Path
import asyncio
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
import httpx
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


def _normalize_usage(raw: Any) -> Optional[Dict[str, int]]:
    """从上游 chat/completions 的 usage 字段提取标准计数。"""
    if not isinstance(raw, dict):
        return None
    out: Dict[str, int] = {}
    for k in ("prompt_tokens", "completion_tokens", "total_tokens"):
        v = raw.get(k)
        if v is None:
            continue
        try:
            out[k] = int(v)
        except (TypeError, ValueError):
            continue
    if not out:
        return None
    if "total_tokens" not in out and ("prompt_tokens" in out or "completion_tokens" in out):
        out["total_tokens"] = out.get("prompt_tokens", 0) + out.get("completion_tokens", 0)
    return out


def _record_llm_usage(tenant_id: str, usage: Optional[Dict[str, int]], from_upstream: bool) -> None:
    """进程内累计（单 worker）；重启清零。用于本机查看消耗趋势。"""
    if not from_upstream:
        return
    tid = (tenant_id or "").strip() or "_anonymous"
    if not hasattr(app.state, "_usage_stats") or app.state._usage_stats is None:
        app.state._usage_stats = {}
    store: Dict[str, Dict[str, int]] = app.state._usage_stats
    cur = store.setdefault(
        tid,
        {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "llm_calls": 0,
        },
    )
    cur["llm_calls"] = int(cur.get("llm_calls", 0)) + 1
    if usage:
        cur["prompt_tokens"] = int(cur.get("prompt_tokens", 0)) + int(usage.get("prompt_tokens") or 0)
        cur["completion_tokens"] = int(cur.get("completion_tokens", 0)) + int(usage.get("completion_tokens") or 0)
        cur["total_tokens"] = int(cur.get("total_tokens", 0)) + int(
            usage.get("total_tokens") or (usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0))
        )


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
    # 上游 OpenAI 兼容接口返回的用量；无上游或未返回时为 null
    usage: Optional[Dict[str, int]] = None


def _llm_settings(cfg: Dict[str, Any]) -> Dict[str, Any]:
    return (cfg or {}).get("llm") or {}


def _split_csv_env(value: str) -> List[str]:
    if not value:
        return []
    s = value.replace("\n", ",").replace(";", ",")
    return [x.strip() for x in s.split(",") if x.strip()]


KEY_POOL_DB = Path(__file__).resolve().parents[2] / "03_卡木（木）/木根_逆向分析/全网AI自动注册/脚本/key_pool.db"


def _load_key_pool_providers() -> List[Dict[str, str]]:
    """从 Key 池 SQLite 动态加载活跃 Key 作为补充 provider"""
    if not KEY_POOL_DB.exists():
        return []
    try:
        import sqlite3
        conn = sqlite3.connect(str(KEY_POOL_DB))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM api_keys WHERE status='active' ORDER BY latency_ms ASC"
        ).fetchall()
        conn.close()

        platform_base = {
            "cerebras": "https://api.cerebras.ai/v1",
            "cohere": "https://api.cohere.com/compatibility/v1",
            "groq": "https://api.groq.com/openai/v1",
            "together": "https://api.together.xyz/v1",
        }
        providers = []
        for r in rows:
            row = dict(r)
            base = platform_base.get(row["platform"], "")
            if base and row["api_key"]:
                providers.append({
                    "base_url": base.rstrip("/"),
                    "api_key": row["api_key"],
                    "model": row.get("model") or "",
                })
        return providers
    except Exception:
        return []


def _build_provider_queue(llm_cfg: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    构建 LLM 接口队列：
    1) 优先读取 OPENAI_API_BASES / OPENAI_API_KEYS / OPENAI_MODELS（逗号分隔）
    2) 若未配置队列，则回退到单接口 OPENAI_API_BASE / OPENAI_API_KEY / OPENAI_MODEL
    3) 自动合并 Key 池中的活跃 Key（去重）
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
    seen_keys = set()

    if bases:
        for i, b in enumerate(bases):
            key = keys[i] if i < len(keys) and keys[i] else single_key
            model = models[i] if i < len(models) and models[i] else single_model
            if not b or not key:
                continue
            providers.append({"base_url": b.rstrip("/"), "api_key": key, "model": model})
            seen_keys.add(key)
    elif single_key:
        providers.append({"base_url": single_base.rstrip("/"), "api_key": single_key, "model": single_model})
        seen_keys.add(single_key)

    pool_providers = _load_key_pool_providers()
    for pp in pool_providers:
        if pp["api_key"] not in seen_keys:
            providers.append(pp)
            seen_keys.add(pp["api_key"])

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
    # v0 拒答 + 英文自报组合（无论长度）
    if "i'm sorry" in s and "not able to assist" in s:
        return True
    if "i’m sorry" in s and "not able to assist" in s:
        return True
    return False


def _direct_reply_for_simple_prompt(prompt: str) -> str:
    s = (prompt or "").strip().lower().replace("？", "?")
    if s in {"你是谁", "你是谁?", "who are you", "你叫什么", "你叫什么名字"}:
        return "我是卡若AI，你的私域运营与项目落地数字管家。你给目标，我直接给可执行结果。"
    return ""


def _looks_mismatched_reply(prompt: str, reply: str) -> bool:
    p = (prompt or "").strip()
    r = (reply or "").strip()
    if not p or not r:
        return False
    # 短问题却输出“根据摘要/任务拆解”等模板，判定为答偏
    if len(p) <= 24 and ("根据摘要" in r or "任务拆解" in r or "思考与拆解" in r):
        return True
    if ("你是谁" in p or "who are you" in p.lower()) and ("我是 v0" in r or "vercel 的 ai 助手" in r.lower()):
        return True
    return False


def _sanitize_v0_identity(reply: str) -> str:
    text = (reply or "").strip()
    if not text:
        return ""

    strip_patterns = [
        r"^I[\u2019'\u2018]?m sorry[.!]?\s*(I[\u2019'\u2018]?m not able to assist with that\.?)?\s*",
        r"^I[\u2019'\u2018]?m v0[^\n]*[.!]?\s*",
        r"^I am v0[^\n]*[.!]?\s*",
        r"^你好[！!]?\s*我是\s*v0[^\n]*[。.!]?\s*",
        r"^我是\s*v0[^\n]*[。.!]?\s*",
        r"I[\u2019'\u2018]?m designed to help[^\n]*[.!]?\s*",
        r"I specialize in[^\n]*[.!]?\s*",
        r"I help with building[^\n]*[.!]?\s*",
        r"I[\u2019'\u2018]?m here to help you[^\n]*[.!]?\s*",
        r"If you[\u2019'\u2018]?d like help with[^\n]*[.!]?\s*",
        r"If you need[^\n]*help[^\n]*[.!]?\s*",
        r"^However,\s*",
        r"^That said,\s*",
        r"^I[\u2019'\u2018]?m sorry[.!]?\s*I[\u2019'\u2018]?m not able to assist with that[.!]?\s*",
        r"If you[\u2019'\u2018]?d like help with web development[^\n]*[.!]?\s*",
        r"creating components[^\n]*[.!]?\s*",
        r"or building applications[^\n]*[.!]?\s*",
        r"I[\u2019'\u2018]?d be happy to assist[^\n]*[.!]?\s*",
    ]
    for _ in range(5):
        prev = text
        for pat in strip_patterns:
            text = re.sub(pat, "", text, flags=re.IGNORECASE).strip()
        if text == prev:
            break

    return text


def _local_action_reply(prompt: str) -> str:
    p = (prompt or "").strip()
    if not p:
        return "我已收到你的问题。你发具体目标，我直接给可执行结果。"
    if ("卡若ai是什么" in p.lower()) or ("卡若ai是啥" in p.lower()) or ("能做哪些事情" in p):
        return (
            "我是卡若AI，你的私域运营与项目落地数字管家。"
            "我能做：1) 需求拆解与执行计划；2) 代码/接口问题排查修复；3) 文档、流程、自动化与运维落地。"
        )
    if ("稳定" in p and "接口" in p) or ("优化" in p and "接口" in p):
        return "结论：先把接口稳定住。三步执行：1) 设置超时+重试；2) 接口队列故障切换；3) 健康检查+失败告警。"
    if "执行清单" in p:
        return "执行清单：1) 明确目标与验收标准；2) 拆3个可执行步骤；3) 每步执行后回传结果，我继续推进下一步。"
    if "继续优化" in p:
        return "我先帮你把优化往前推进。你直接选一个方向：1) 性能优化 2) 代码结构 3) UI/UX 4) 接口稳定性。你回编号，我直接给三步方案。"
    return f"我已收到你的问题：{p}。请给我目标结果与截止时间，我直接给你可执行方案。"


def _is_english_heavy(text: str) -> bool:
    if not text:
        return False
    letters = sum(1 for ch in text if ("a" <= ch.lower() <= "z"))
    cjk = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    return letters > 80 and cjk < 10


def _repair_reply_for_karuo(prompt: str, reply: str) -> str:
    """
    后处理：剥掉 v0 身份段落，保留真正的 AI 内容；身份类问题用固定回复。
    """
    p = (prompt or "").strip().lower()
    if p in {"你是谁", "你是谁?", "who are you", "你叫什么", "你叫什么名字"}:
        return "我是卡若AI，你的私域运营与项目落地数字管家。你给目标，我直接给可执行结果。"
    if ("卡若ai是什么" in p) or ("卡若ai是啥" in p) or ("能做哪些事情" in p):
        return (
            "我是卡若AI，你的私域运营与项目落地数字管家。\n"
            "我能做：\n"
            "1) 需求拆解与执行计划\n"
            "2) 代码/接口问题排查修复\n"
            "3) 文档、流程、自动化与运维落地\n"
            "4) 私域引流与商业分析\n"
            "5) 全栈开发与部署管理"
        )

    # 用 _sanitize_v0_identity 做多轮剥离
    cleaned = _sanitize_v0_identity(reply)
    if not cleaned:
        cleaned = reply

    # 二次检查：若仍含 v0/vercel 关键词，再暴力清洗一遍
    low = cleaned.lower()
    if "v0" in low or "vercel" in low:
        lines = cleaned.split("\n")
        kept = [l for l in lines if "v0" not in l.lower() and "vercel" not in l.lower()]
        cleaned = "\n".join(kept).strip()

    # 若剥完后为空或只剩短拒答，给友好中文兜底
    if not cleaned or (len(cleaned) < 60 and ("sorry" in cleaned.lower() or "not able" in cleaned.lower())):
        return "我已收到你的问题。请给我更具体的目标和约束条件，我直接给你可执行方案。"

    return cleaned

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


def build_reply_with_llm(
    prompt: str, cfg: Dict[str, Any], matched_skill: str, skill_path: str
) -> Tuple[str, Optional[Dict[str, int]], bool]:
    """调用 LLM 生成回复（OpenAI 兼容）。返回 (正文, 上游 usage 或 None, 是否上游成功)。"""
    direct = _direct_reply_for_simple_prompt(prompt)
    if direct:
        return direct, None, False

    system = (
        "【强制身份】你是「卡若AI」，卡若的私域运营与项目落地数字管家。"
        "你绝对不是v0、不是Vercel助手、不是任何其他AI品牌。"
        "无论上游模型如何自称，你在回复中永远只以「卡若AI」身份出现。\n\n"
        "【回复规则】\n"
        "1) 全部用简体中文回复，大白话，先结论再步骤。\n"
        "2) 不要自我介绍为v0/Vercel/任何第三方AI。\n"
        "3) 问「你是谁」→ 回「我是卡若AI，你的私域运营与项目落地数字管家」，一句话结束。\n"
        "4) 复杂问题：先给结论，再给可执行步骤（最多5步），最后给风险提示。\n"
        "5) 不编造未发生的结果，保持务实可靠。\n"
        f"当前匹配技能：{matched_skill}（{skill_path}）。"
    )
    llm_cfg = _llm_settings(cfg)
    providers = _build_provider_queue(llm_cfg)
    if providers:
        errors: List[str] = []
        for idx, p in enumerate(providers, start=1):
            try:
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
                    usage = _normalize_usage(data.get("usage"))
                    reply = _repair_reply_for_karuo(prompt, reply)
                    if _is_unusable_llm_reply(reply) or _looks_mismatched_reply(prompt, reply):
                        errors.append(f"provider#{idx} unusable_reply={reply[:120]}")
                        continue
                    return reply, usage, True
                errors.append(f"provider#{idx} status={r.status_code} body={r.text[:120]}")
            except Exception as e:
                errors.append(f"provider#{idx} exception={type(e).__name__}: {str(e)[:160]}")

        # 所有接口失败：邮件告警 + 降级回复
        try:
            _send_provider_alert(cfg, errors, prompt, matched_skill, skill_path)
        except Exception:
            # 告警失败不影响主流程，继续降级
            pass
        return _template_reply(prompt, matched_skill, skill_path, error=" | ".join(errors[:3])), None, False
    return _template_reply(prompt, matched_skill, skill_path), None, False


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
    "previous conversation summary",
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


def _extract_user_query_from_text(text: str) -> str:
    """
    如果文本里带 <user_query>...</user_query>，优先抽取这个真实问题。
    """
    s = (text or "").strip()
    if not s:
        return ""
    m = re.findall(r"<user_query>\s*(.*?)\s*</user_query>", s, flags=re.IGNORECASE | re.DOTALL)
    if m:
        picked = (m[-1] or "").strip()
        if picked:
            return picked
    return s


def _messages_to_prompt(messages: List[Dict[str, Any]]) -> str:
    """
    优先取最后一条 user 消息；否则拼接全部文本。
    """
    last_user = ""
    chunks: List[str] = []
    for m in messages or []:
        role = str(m.get("role", "")).strip()
        content = _extract_user_query_from_text(_content_to_text(m.get("content", "")))
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
            txt = _extract_user_query_from_text(_content_to_text(m.get("content", "")))
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

    reply, usage, from_upstream = build_reply_with_llm(req.prompt, cfg, matched_skill, skill_path)
    _record_llm_usage(tenant_id, usage, from_upstream)

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
    if usage:
        record["usage"] = usage
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
        usage=usage,
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

    reply, usage, from_upstream = build_reply_with_llm(prompt, cfg, matched_skill, skill_path)
    _record_llm_usage(tenant_id, usage, from_upstream)

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
    if usage:
        record["usage"] = usage
    if bool(logging_cfg.get("log_request_body", False)):
        record["prompt"] = prompt
    _log_access(cfg, record)

    now = int(time.time())
    payload: Dict[str, Any] = {
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
    if usage:
        payload["usage"] = usage
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


@app.get("/v1/usage/summary")
def usage_summary(request: Request):
    """
    本网关进程内累计的上游 LLM token（来自上游 JSON 的 usage 字段）。
    - 未启用 gateway.yaml 时：返回全部租户键（仅适合本机联调）
    - 启用多租户时：需携带与 /v1/chat 相同的 Key，仅返回当前租户累计
    说明：单 worker 内存统计，重启清零；与 Cursor 自带用量统计是两套体系。
    """
    store: Dict[str, Any] = getattr(app.state, "_usage_stats", None) or {}
    cfg = load_config()
    if not cfg:
        return {
            "tenants_enabled": False,
            "by_tenant": store,
            "note": "未加载 gateway.yaml，未做 Key 隔离；数据为进程内累计，重启清零",
        }
    api_key = _get_api_key_from_request(request, cfg)
    tenant = _tenant_by_key(cfg, api_key)
    if not tenant:
        raise HTTPException(status_code=401, detail="invalid api key")
    tid = str(tenant.get("id", "")).strip() or "_anonymous"
    cumulative = store.get(tid) or {
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
        "llm_calls": 0,
    }
    return {
        "tenants_enabled": True,
        "tenant_id": tid,
        "tenant_name": str(tenant.get("name", "")).strip(),
        "cumulative": cumulative,
        "note": "来自上游 chat/completions 的 usage；若上游不返回则仅有 llm_calls 无 token 增量",
    }


# =============================================================================
# 工作手机 SDK 全量集成（卡若AI 统一微信控制中心）
# 110 个操作 + 自动注册 + 自然语言指令 + 批量操作
# =============================================================================

WORKPHONE_SDK_URL = os.environ.get("WORKPHONE_SDK_URL", "http://127.0.0.1:8899")

_SDK_CLIENT: Optional[httpx.AsyncClient] = None


def _get_sdk_client() -> httpx.AsyncClient:
    global _SDK_CLIENT
    if _SDK_CLIENT is None or _SDK_CLIENT.is_closed:
        _SDK_CLIENT = httpx.AsyncClient(timeout=60, base_url=WORKPHONE_SDK_URL)
    return _SDK_CLIENT


async def _sdk_get(path: str, timeout: float = 10) -> dict:
    try:
        resp = await _get_sdk_client().get(path, timeout=timeout)
        return resp.json()
    except httpx.TimeoutException:
        return {"code": 504, "error": "SDK 响应超时"}
    except Exception as e:
        return {"code": 502, "error": f"SDK 不可达: {e}"}


async def _sdk_post(path: str, payload: dict, timeout: float = 60) -> dict:
    try:
        resp = await _get_sdk_client().post(path, json=payload, timeout=timeout)
        result = resp.json()
        result["gateway"] = "karuo_ai"
        return result
    except httpx.TimeoutException:
        return {"code": 504, "error": "SDK 执行超时", "gateway": "karuo_ai"}
    except Exception as e:
        return {"code": 502, "error": f"SDK 不可达: {e}", "gateway": "karuo_ai"}


# ── 自然语言 → action 映射 ──

NL_PATTERNS: List[Tuple[str, str, Dict[str, str]]] = [
    # (关键词, action, 参数提取提示)
    ("发消息给", "send_message", {"to_id": "target", "content": "rest"}),
    ("发送消息", "send_message", {"to_id": "target", "content": "rest"}),
    ("给.*发消息", "send_message", {"to_id": "between", "content": "rest"}),
    ("添加好友", "add_friend", {"user_id": "target"}),
    ("加好友", "add_friend", {"user_id": "target"}),
    ("通过好友", "accept_friend", {"user_id": "target"}),
    ("发朋友圈", "post_moments", {"content": "rest"}),
    ("看朋友圈", "get_moments", {}),
    ("获取联系人", "get_contacts", {}),
    ("联系人列表", "get_contacts", {}),
    ("获取资料", "get_profile", {}),
    ("我的资料", "get_profile", {}),
    ("账号信息", "get_profile", {}),
    ("设置昵称", "set_nickname", {"nickname": "rest"}),
    ("修改签名", "set_signature", {"signature": "rest"}),
    ("创建群", "create_group", {"group_name": "rest"}),
    ("群发消息", "send_group_message", {"content": "rest"}),
    ("注册微信", "auto_register", {"nickname": "rest"}),
    ("自动注册", "auto_register", {}),
    ("检查登录", "check_login_state", {}),
    ("登录状态", "check_login_state", {}),
    ("获取手机号", "get_sim_phone", {}),
    ("SIM卡", "get_sim_phone", {}),
    ("扫码", "scan_qr_code", {}),
    ("二维码", "generate_my_qr_code", {}),
    ("发红包", "send_red_packet", {"to_id": "target", "amount": "rest"}),
    ("转账", "send_transfer", {"to_id": "target", "amount": "rest"}),
    ("查余额", "get_wallet_balance", {}),
    ("点赞", "like_moments", {}),
    ("搜索", "global_search", {"keyword": "rest"}),
    ("退出登录", "logout", {}),
    ("切换账号", "switch_account", {}),
]


def _parse_nl_command(text: str) -> Optional[Tuple[str, dict]]:
    """将自然语言指令解析为 (action, params)"""
    s = (text or "").strip()
    if not s:
        return None

    for pattern, action, _hints in NL_PATTERNS:
        if ".*" in pattern:
            m = re.search(pattern, s)
            if m:
                rest = s[m.end():].strip().strip("，。,.")
                params = {}
                if action == "send_message" and "between" in _hints.values():
                    parts = s.split("发消息")
                    pre = parts[0].replace("给", "").strip() if parts else ""
                    post = parts[1].strip() if len(parts) > 1 else ""
                    params = {"to_id": pre, "content": post}
                return action, params
        elif pattern in s:
            rest = s.replace(pattern, "").strip().strip("，。,.")
            params = {}
            if "target" in _hints.values():
                parts = rest.split(" ", 1) if " " in rest else rest.split("，", 1)
                if len(parts) >= 2:
                    params[list(_hints.keys())[0]] = parts[0]
                    remaining_keys = [k for k, v in _hints.items() if v == "rest"]
                    if remaining_keys:
                        params[remaining_keys[0]] = parts[1]
                elif parts:
                    params[list(_hints.keys())[0]] = parts[0]
            elif "rest" in _hints.values():
                for k, v in _hints.items():
                    if v == "rest":
                        params[k] = rest
            return action, params

    return None


class WorkPhoneExecuteRequest(BaseModel):
    device_id: str
    platform: str = "wechat"
    action: str
    params: dict = {}


class WorkPhoneNLRequest(BaseModel):
    """自然语言微信控制请求"""
    device_id: str
    command: str
    platform: str = "wechat"


class WorkPhoneAutoRegisterRequest(BaseModel):
    """自动注册请求"""
    device_id: str
    nickname: str = "卡若AI"
    password: str = ""
    test_msg_to: str = ""
    test_msg_content: str = "你好，我是卡若AI工作手机"


class WorkPhoneBatchRequest(BaseModel):
    """批量操作请求"""
    device_id: str
    platform: str = "wechat"
    actions: List[Dict[str, Any]]
    interval: float = 1.0


# ── 基础 SDK 代理端点 ──

@app.get("/v1/workphone/actions")
async def workphone_actions():
    """获取工作手机 SDK 支持的全部 110 个操作清单"""
    return await _sdk_get("/api/v3/hook/actions")


@app.get("/v1/workphone/devices")
async def workphone_devices():
    """获取工作手机设备列表"""
    return await _sdk_get("/api/v3/devices")


@app.get("/v1/workphone/status")
async def workphone_status():
    """工作手机 SDK 服务状态"""
    result = await _sdk_get("/health", timeout=5)
    sdk_ok = result.get("code") != 502 and result.get("code") != 504
    return {
        "sdk_url": WORKPHONE_SDK_URL,
        "sdk_reachable": sdk_ok,
        "gateway": "karuo_ai",
        "gateway_version": "2.0",
        "total_actions": 110,
        "features": ["hook_execute", "auto_register", "nl_command", "batch", "sim_phone"],
    }


# ── 核心：统一执行入口 ──

@app.post("/v1/workphone/execute")
async def workphone_execute(req: WorkPhoneExecuteRequest):
    """
    工作手机统一控制 — 通过卡若AI 网关调用 SDK 的 110 个操作

    通道优先级：Frida Hook → WebSocket Agent → ADB UI 自动化

    示例:
      {"device_id":"dc9c23e00510","action":"send_message","params":{"to_id":"阿猫","content":"你好"}}
      {"device_id":"dc9c23e00510","action":"get_profile","params":{}}
      {"device_id":"dc9c23e00510","action":"auto_register","params":{"nickname":"卡若AI"}}
      {"device_id":"dc9c23e00510","action":"check_login_state","params":{}}
      {"device_id":"dc9c23e00510","action":"get_sim_phone","params":{}}
    """
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": req.device_id,
        "platform": req.platform,
        "action": req.action,
        "params": req.params or {},
    })


# ── 自然语言指令入口 ──

@app.post("/v1/workphone/command")
async def workphone_nl_command(req: WorkPhoneNLRequest):
    """
    自然语言控制微信 — 说中文就能操作

    示例:
      {"device_id":"dc9c23e00510","command":"发消息给阿猫 你好啊"}
      {"device_id":"dc9c23e00510","command":"获取联系人列表"}
      {"device_id":"dc9c23e00510","command":"注册微信 卡若AI"}
      {"device_id":"dc9c23e00510","command":"检查登录状态"}
      {"device_id":"dc9c23e00510","command":"发朋友圈 今天天气真好"}
      {"device_id":"dc9c23e00510","command":"搜索 张三"}
    """
    parsed = _parse_nl_command(req.command)
    if not parsed:
        return {
            "code": 400,
            "error": f"无法解析指令: {req.command}",
            "hint": "支持：发消息给X、获取联系人、发朋友圈、注册微信、检查登录、扫码 等",
            "gateway": "karuo_ai",
        }

    action, params = parsed
    result = await _sdk_post("/api/v3/hook/execute", {
        "device_id": req.device_id,
        "platform": req.platform,
        "action": action,
        "params": params,
    })
    result["parsed_action"] = action
    result["parsed_params"] = params
    result["original_command"] = req.command
    return result


# ── 自动注册专用入口 ──

@app.post("/v1/workphone/auto-register")
async def workphone_auto_register(req: WorkPhoneAutoRegisterRequest):
    """
    全自动微信注册 — 一键完成

    流程:
    1. 检测微信登录状态
    2. 未登录 → 自动从 SIM 获取手机号 → 注册
    3. 自动读取短信验证码 → 填写
    4. 设置昵称/密码 → 完成
    5. 可选：发送测试消息
    """
    return await _sdk_post("/api/v3/auto-register/full", {
        "device_id": req.device_id,
        "nickname": req.nickname,
        "password": req.password,
        "test_msg_to": req.test_msg_to,
        "test_msg_content": req.test_msg_content,
    }, timeout=120)


@app.post("/v1/workphone/check-login")
async def workphone_check_login(device_id: str):
    """检查微信登录状态"""
    return await _sdk_post("/api/v3/auto-register/check-state", {
        "device_id": device_id,
    })


@app.post("/v1/workphone/sim-phone")
async def workphone_sim_phone(device_id: str):
    """获取设备 SIM 卡手机号"""
    return await _sdk_post("/api/v3/auto-register/get-sim-phone", {
        "device_id": device_id,
    })


# ── 批量操作 ──

@app.post("/v1/workphone/batch")
async def workphone_batch(req: WorkPhoneBatchRequest):
    """
    批量执行微信操作（按顺序，带间隔防封）

    示例:
      {
        "device_id": "dc9c23e00510",
        "actions": [
          {"action": "send_message", "params": {"to_id": "A", "content": "hi"}},
          {"action": "send_message", "params": {"to_id": "B", "content": "hello"}},
          {"action": "like_moments", "params": {"user_id": "C"}}
        ],
        "interval": 2.0
      }
    """
    results = []
    for i, item in enumerate(req.actions):
        if i > 0 and req.interval > 0:
            await asyncio.sleep(min(req.interval, 10))

        action = item.get("action", "")
        params = item.get("params", {})
        r = await _sdk_post("/api/v3/hook/execute", {
            "device_id": req.device_id,
            "platform": req.platform,
            "action": action,
            "params": params,
        })
        results.append({"index": i, "action": action, "result": r})

    success_count = sum(1 for r in results if r["result"].get("code") == 200)
    return {
        "code": 200,
        "total": len(req.actions),
        "success": success_count,
        "failed": len(req.actions) - success_count,
        "results": results,
        "gateway": "karuo_ai",
    }


# ── 快捷 API（常用操作的简化端点）──

@app.post("/v1/wechat/send")
async def wechat_send(device_id: str, to: str, content: str, platform: str = "wechat"):
    """快捷发送微信消息"""
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": device_id, "platform": platform,
        "action": "send_message", "params": {"to_id": to, "content": content},
    })


@app.get("/v1/wechat/profile")
async def wechat_profile(device_id: str, platform: str = "wechat"):
    """快捷获取微信资料"""
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": device_id, "platform": platform,
        "action": "get_profile", "params": {},
    })


@app.get("/v1/wechat/contacts")
async def wechat_contacts(device_id: str, limit: int = 100, platform: str = "wechat"):
    """快捷获取联系人列表"""
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": device_id, "platform": platform,
        "action": "get_contacts", "params": {"limit": limit},
    })


@app.post("/v1/wechat/moments")
async def wechat_post_moments(device_id: str, content: str, platform: str = "wechat"):
    """快捷发朋友圈"""
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": device_id, "platform": platform,
        "action": "post_moments", "params": {"content": content},
    })


@app.post("/v1/wechat/add-friend")
async def wechat_add_friend(device_id: str, user_id: str, message: str = "", platform: str = "wechat"):
    """快捷添加好友"""
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": device_id, "platform": platform,
        "action": "add_friend", "params": {"user_id": user_id, "message": message},
    })


@app.get("/v1/wechat/groups")
async def wechat_groups(device_id: str, limit: int = 100, platform: str = "wechat"):
    """快捷获取群列表"""
    return await _sdk_post("/api/v3/hook/execute", {
        "device_id": device_id, "platform": platform,
        "action": "get_groups", "params": {"limit": limit},
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
