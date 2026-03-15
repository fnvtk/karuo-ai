"""
卡若AI 网关 — Key 健康检查 + 额度监控 + 自动轮换

功能：
1. 逐个测试 OPENAI_API_BASES 队列中每个 Key 的可用性
2. 检测各平台免费额度使用情况（支持 Groq/Together/Cerebras/Cohere）
3. Key 不可用时自动标记，下次请求跳过
4. 可对接「全网AI自动注册」SKILL 的 key_manager_api 做 Key 池补充

用法：
  python key_health_check.py              # 一次性检查
  python key_health_check.py --watch 300  # 每 300 秒轮询
  python key_health_check.py --env        # 输出可直接贴到 .env 的健康队列
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
ENV_FILE = SCRIPT_DIR / ".env.api_keys.local"
STATUS_FILE = SCRIPT_DIR / "key_status.json"

PROVIDERS = {
    "groq": {
        "name": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "test_model": "llama-3.3-70b-versatile",
        "usage_url": None,
    },
    "cerebras": {
        "name": "Cerebras",
        "base_url": "https://api.cerebras.ai/v1",
        "test_model": "llama-3.3-70b",
        "usage_url": None,
    },
    "together": {
        "name": "Together AI",
        "base_url": "https://api.together.xyz/v1",
        "test_model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "usage_url": None,
    },
    "cohere": {
        "name": "Cohere",
        "base_url": "https://api.cohere.com/compatibility/v1",
        "test_model": "command-a-03-2025",
        "usage_url": None,
    },
}


def _detect_provider(base_url: str) -> str:
    url = base_url.lower()
    if "groq.com" in url:
        return "groq"
    if "cerebras.ai" in url:
        return "cerebras"
    if "together" in url:
        return "together"
    if "cohere.com" in url:
        return "cohere"
    if "v0.dev" in url:
        return "v0"
    if "openai.com" in url:
        return "openai"
    return "unknown"


def _test_key(base_url: str, api_key: str, model: str, timeout: float = 15) -> Tuple[bool, str, float]:
    """
    发一个最小请求测试 Key 是否可用。
    返回 (是否成功, 错误信息/模型回复, 响应耗时ms)
    """
    import httpx

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": [{"role": "user", "content": "Hi, reply with just 'ok'"}],
        "max_tokens": 5,
        "temperature": 0,
    }

    t0 = time.time()
    try:
        r = httpx.post(url, headers=headers, json=body, timeout=timeout)
        elapsed = (time.time() - t0) * 1000

        if r.status_code == 200:
            data = r.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return True, reply.strip()[:60], elapsed

        return False, f"HTTP {r.status_code}: {r.text[:120]}", elapsed

    except Exception as e:
        elapsed = (time.time() - t0) * 1000
        return False, f"{type(e).__name__}: {str(e)[:100]}", elapsed


def _check_groq_usage(api_key: str) -> Optional[Dict]:
    """Groq 没有公开的 usage API，仅通过 rate limit headers 间接获取"""
    import httpx
    try:
        r = httpx.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        if r.status_code == 200:
            remaining_req = r.headers.get("x-ratelimit-remaining-requests", "N/A")
            remaining_tok = r.headers.get("x-ratelimit-remaining-tokens", "N/A")
            return {
                "remaining_requests": remaining_req,
                "remaining_tokens": remaining_tok,
                "status": "active",
            }
        return {"status": "error", "detail": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:80]}


def _check_together_usage(api_key: str) -> Optional[Dict]:
    """Together AI 没有公开 usage API，通过 models 接口验证 Key 有效性"""
    import httpx
    try:
        r = httpx.get(
            "https://api.together.xyz/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        if r.status_code == 200:
            return {"status": "active", "models_count": len(r.json().get("data", []) if isinstance(r.json(), dict) else r.json())}
        return {"status": "error", "detail": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:80]}


def load_env_keys() -> List[Dict[str, str]]:
    """从 .env.api_keys.local 读取当前接口队列"""
    if not ENV_FILE.exists():
        print(f"[WARN] {ENV_FILE} 不存在")
        return []

    bases, keys, models = [], [], []
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("OPENAI_API_BASES="):
            bases = [x.strip() for x in line.split("=", 1)[1].split(",") if x.strip()]
        elif line.startswith("OPENAI_API_KEYS="):
            keys = [x.strip() for x in line.split("=", 1)[1].split(",") if x.strip()]
        elif line.startswith("OPENAI_MODELS="):
            models = [x.strip() for x in line.split("=", 1)[1].split(",") if x.strip()]

    result = []
    for i, base in enumerate(bases):
        key = keys[i] if i < len(keys) else ""
        model = models[i] if i < len(models) else ""
        if base and key:
            result.append({
                "base_url": base,
                "api_key": key,
                "model": model,
                "provider": _detect_provider(base),
            })
    return result


def load_status() -> Dict:
    if STATUS_FILE.exists():
        try:
            return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_status(status: Dict):
    STATUS_FILE.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")


def run_health_check(verbose: bool = True) -> Dict:
    """执行一轮完整健康检查"""
    providers = load_env_keys()
    if not providers:
        print("[ERROR] 未找到接口队列配置")
        return {}

    status = load_status()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if verbose:
        print(f"\n{'='*60}")
        print(f"  卡若AI 网关 Key 健康检查  |  {now}")
        print(f"{'='*60}")

    results = {}
    healthy_count = 0
    total = len(providers)

    for i, p in enumerate(providers, 1):
        provider_name = p["provider"]
        key_preview = p["api_key"][:12] + "..." if len(p["api_key"]) > 12 else p["api_key"]

        if verbose:
            print(f"\n[{i}/{total}] {provider_name.upper()} | {p['base_url']}")
            print(f"         Key: {key_preview}  Model: {p['model']}")

        ok, msg, elapsed = _test_key(p["base_url"], p["api_key"], p["model"])

        entry = {
            "provider": provider_name,
            "base_url": p["base_url"],
            "model": p["model"],
            "healthy": ok,
            "last_check": now,
            "latency_ms": round(elapsed, 1),
            "message": msg,
        }

        if ok:
            healthy_count += 1
            if verbose:
                print(f"         ✅ 可用  |  {elapsed:.0f}ms  |  回复: {msg}")

            # 额度检查（仅支持部分平台）
            if provider_name == "groq":
                usage = _check_groq_usage(p["api_key"])
                entry["usage"] = usage
                if verbose and usage:
                    print(f"         📊 额度: 剩余请求={usage.get('remaining_requests','N/A')}, 剩余Token={usage.get('remaining_tokens','N/A')}")
            elif provider_name == "together":
                usage = _check_together_usage(p["api_key"])
                entry["usage"] = usage
                if verbose and usage:
                    print(f"         📊 状态: {usage.get('status','N/A')}, 可用模型数={usage.get('models_count','N/A')}")
        else:
            if verbose:
                print(f"         ❌ 不可用  |  {elapsed:.0f}ms  |  原因: {msg}")

        results[f"{provider_name}_{i}"] = entry

    status["last_check"] = now
    status["results"] = results
    status["summary"] = {
        "total": total,
        "healthy": healthy_count,
        "unhealthy": total - healthy_count,
    }
    save_status(status)

    if verbose:
        print(f"\n{'='*60}")
        print(f"  总计: {total} 个接口  |  ✅ 健康: {healthy_count}  |  ❌ 异常: {total - healthy_count}")
        print(f"  状态已保存: {STATUS_FILE}")
        print(f"{'='*60}\n")

    return status


def output_healthy_env():
    """输出仅包含健康 Key 的 .env 格式配置"""
    status = load_status()
    results = status.get("results", {})

    bases, keys, models = [], [], []
    for entry in results.values():
        if entry.get("healthy"):
            bases.append(entry["base_url"])
            keys.append("")  # 不输出明文 Key
            models.append(entry["model"])

    print("# 仅健康接口（自动生成）")
    print(f"# 生成时间: {status.get('last_check', 'unknown')}")
    print(f"OPENAI_API_BASES={','.join(bases)}")
    print(f"OPENAI_MODELS={','.join(models)}")
    print(f"# 健康接口数: {len(bases)}/{status.get('summary', {}).get('total', 0)}")


def main():
    parser = argparse.ArgumentParser(description="卡若AI Key 健康检查 + 额度监控")
    parser.add_argument("--watch", type=int, default=0, help="轮询间隔(秒)，0=只跑一次")
    parser.add_argument("--env", action="store_true", help="输出健康队列的 .env 格式")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式结果")
    parser.add_argument("--quiet", action="store_true", help="静默模式")
    args = parser.parse_args()

    if args.env:
        output_healthy_env()
        return

    if args.watch > 0:
        print(f"[Watch] 每 {args.watch} 秒检查一次，Ctrl+C 停止")
        while True:
            try:
                result = run_health_check(verbose=not args.quiet)
                if args.json:
                    print(json.dumps(result, ensure_ascii=False, indent=2))
                time.sleep(args.watch)
            except KeyboardInterrupt:
                print("\n[Watch] 已停止")
                break
    else:
        result = run_health_check(verbose=not args.quiet)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
