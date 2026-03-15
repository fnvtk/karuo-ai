#!/usr/bin/env python3
"""
卡若AI Key 池管理器

核心能力：
1. 统一管理所有平台的 API Key（SQLite 存储）
2. 自动健康检查，标记失效 Key
3. 自动触发注册补充 Key（联动 Cerebras Provider）
4. 导出健康 Key 为网关 .env 格式
5. 提供 FastAPI 接口供网关动态获取 Key

用法：
  python key_pool_manager.py status              # 查看池状态
  python key_pool_manager.py check               # 健康检查所有 Key
  python key_pool_manager.py add <key>            # 手动添加 Cerebras Key
  python key_pool_manager.py export-env           # 导出为 .env 格式
  python key_pool_manager.py auto-fill            # 自动注册补充到最低水位
  python key_pool_manager.py daemon               # 守护模式：定期检查+自动补充
  python key_pool_manager.py serve                # 启动 API 服务
"""

import os
import sys
import json
import time
import sqlite3
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("key_pool")

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = SCRIPT_DIR / "key_pool.db"
GATEWAY_ENV = Path(__file__).resolve().parents[2] / "运营中枢/scripts/karuo_ai_gateway/.env.api_keys.local"

PLATFORM_CONFIG = {
    "cerebras": {
        "base_url": "https://api.cerebras.ai/v1",
        "models": ["qwen-3-235b-a22b-instruct-2507", "llama3.1-8b"],
        "default_model": "qwen-3-235b-a22b-instruct-2507",
        "min_pool_size": 3,
        "test_endpoint": "/chat/completions",
    },
    "cohere": {
        "base_url": "https://api.cohere.com/compatibility/v1",
        "models": ["command-a-03-2025"],
        "default_model": "command-a-03-2025",
        "min_pool_size": 1,
        "test_endpoint": "/chat/completions",
    },
}


class KeyPool:
    """Key 池管理"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(DB_PATH)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    platform TEXT NOT NULL,
                    api_key TEXT NOT NULL UNIQUE,
                    model TEXT DEFAULT '',
                    status TEXT DEFAULT 'active',
                    email TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    last_check TEXT DEFAULT '',
                    last_used TEXT DEFAULT '',
                    latency_ms REAL DEFAULT 0,
                    fail_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    extra TEXT DEFAULT '{}'
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_platform_status
                ON api_keys(platform, status)
            """)
            conn.commit()

    def add_key(self, platform: str, api_key: str, model: str = "",
                email: str = "", extra: dict = None) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR IGNORE INTO api_keys
                    (platform, api_key, model, email, created_at, extra)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (platform, api_key, model, email, now, json.dumps(extra or {})))
                conn.commit()
            return True
        except Exception as e:
            log.error(f"添加 Key 失败: {e}")
            return False

    def get_active_keys(self, platform: str = None) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if platform:
                rows = conn.execute(
                    "SELECT * FROM api_keys WHERE platform = ? AND status = 'active' ORDER BY latency_ms ASC",
                    (platform,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM api_keys WHERE status = 'active' ORDER BY platform, latency_ms ASC"
                ).fetchall()
            return [dict(r) for r in rows]

    def get_all_keys(self, platform: str = None) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if platform:
                rows = conn.execute(
                    "SELECT * FROM api_keys WHERE platform = ? ORDER BY id DESC",
                    (platform,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM api_keys ORDER BY id DESC"
                ).fetchall()
            return [dict(r) for r in rows]

    def update_status(self, api_key: str, status: str, latency_ms: float = 0):
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            if status == "active":
                conn.execute(
                    "UPDATE api_keys SET status=?, last_check=?, latency_ms=?, success_count=success_count+1, fail_count=0 WHERE api_key=?",
                    (status, now, latency_ms, api_key)
                )
            else:
                conn.execute(
                    "UPDATE api_keys SET status=?, last_check=?, fail_count=fail_count+1 WHERE api_key=?",
                    (status, now, api_key)
                )
            conn.commit()

    def mark_used(self, api_key: str):
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE api_keys SET last_used=?, success_count=success_count+1 WHERE api_key=?",
                (now, api_key)
            )
            conn.commit()

    def get_next_key(self, platform: str) -> Optional[str]:
        """Round-Robin 获取下一个可用 Key"""
        keys = self.get_active_keys(platform)
        if not keys:
            return None
        idx = int(time.time()) % len(keys)
        key = keys[idx]["api_key"]
        self.mark_used(key)
        return key

    def stats(self) -> Dict:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("""
                SELECT platform,
                       COUNT(*) as total,
                       SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
                       SUM(CASE WHEN status='dead' THEN 1 ELSE 0 END) as dead,
                       AVG(CASE WHEN status='active' THEN latency_ms ELSE NULL END) as avg_latency
                FROM api_keys GROUP BY platform
            """).fetchall()
            return {r["platform"]: dict(r) for r in rows}


def test_key(platform: str, api_key: str, model: str = None) -> Tuple[bool, str, float]:
    """测试单个 Key 的可用性"""
    import httpx

    cfg = PLATFORM_CONFIG.get(platform, {})
    base_url = cfg.get("base_url", "")
    test_model = model or cfg.get("default_model", "")

    if not base_url or not test_model:
        return False, "未知平台", 0

    t0 = time.time()
    try:
        r = httpx.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": test_model,
                "messages": [{"role": "user", "content": "reply ok"}],
                "max_tokens": 5,
                "temperature": 0,
            },
            timeout=20,
        )
        elapsed = (time.time() - t0) * 1000
        if r.status_code == 200:
            reply = r.json()["choices"][0]["message"]["content"].strip()[:30]
            return True, reply, elapsed
        return False, f"HTTP {r.status_code}: {r.text[:80]}", elapsed
    except Exception as e:
        return False, f"{type(e).__name__}: {str(e)[:60]}", (time.time() - t0) * 1000


def cmd_status(pool: KeyPool):
    stats = pool.stats()
    if not stats:
        print("Key 池为空。使用 'add <key>' 添加或 'auto-fill' 自动注册。")
        return

    print(f"\n{'='*70}")
    print(f"  卡若AI Key 池状态  |  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*70}")

    for platform, s in stats.items():
        cfg = PLATFORM_CONFIG.get(platform, {})
        min_pool = cfg.get("min_pool_size", 1)
        status_icon = "✅" if s["active"] >= min_pool else "⚠️"
        print(f"\n  {status_icon} {platform.upper()}")
        print(f"     总数: {s['total']}  |  活跃: {s['active']}  |  失效: {s['dead']}  |  最低水位: {min_pool}")
        if s["avg_latency"]:
            print(f"     平均延迟: {s['avg_latency']:.0f}ms")
        models = cfg.get("models", [])
        if models:
            print(f"     可用模型: {', '.join(models)}")

    print(f"\n{'='*70}\n")


def cmd_check(pool: KeyPool):
    keys = pool.get_all_keys()
    if not keys:
        print("Key 池为空")
        return

    print(f"\n健康检查 {len(keys)} 个 Key...\n")
    for k in keys:
        ok, msg, elapsed = test_key(k["platform"], k["api_key"], k.get("model"))
        status = "active" if ok else "dead"
        pool.update_status(k["api_key"], status, elapsed)
        icon = "✅" if ok else "❌"
        key_preview = k["api_key"][:16] + "..."
        print(f"  {icon} [{k['platform']}] {key_preview}  {elapsed:.0f}ms  {msg}")

    print()
    cmd_status(pool)


def cmd_add(pool: KeyPool, api_key: str, platform: str = "cerebras"):
    ok, msg, elapsed = test_key(platform, api_key)
    if ok:
        pool.add_key(platform, api_key, model=PLATFORM_CONFIG.get(platform, {}).get("default_model", ""))
        pool.update_status(api_key, "active", elapsed)
        print(f"✅ Key 已添加并验证通过: {api_key[:16]}...  ({elapsed:.0f}ms)")
    else:
        print(f"❌ Key 验证失败: {msg}")
        add_anyway = input("仍要添加? (y/N): ").strip().lower()
        if add_anyway == "y":
            pool.add_key(platform, api_key, model=PLATFORM_CONFIG.get(platform, {}).get("default_model", ""))
            print(f"已添加（未验证）: {api_key[:16]}...")


def cmd_export_env(pool: KeyPool):
    """导出健康 Key 为网关 .env 格式"""
    active = pool.get_active_keys()
    if not active:
        print("无活跃 Key")
        return

    bases, keys, models = [], [], []
    for k in active:
        cfg = PLATFORM_CONFIG.get(k["platform"], {})
        base_url = cfg.get("base_url", "")
        model = k.get("model") or cfg.get("default_model", "")
        if base_url and k["api_key"]:
            bases.append(base_url)
            keys.append(k["api_key"])
            models.append(model)

    print(f"# 卡若AI Key 池自动导出 ({datetime.now().strftime('%Y-%m-%d %H:%M')})")
    print(f"# 活跃 Key: {len(bases)} 个")
    print(f"OPENAI_API_BASES={','.join(bases)}")
    print(f"OPENAI_API_KEYS={','.join(keys)}")
    print(f"OPENAI_MODELS={','.join(models)}")


def cmd_auto_fill(pool: KeyPool, count: int = 0):
    """自动注册 Cerebras Key 补充到最低水位"""
    sys.path.insert(0, str(PROJECT_ROOT / "providers"))
    sys.path.insert(0, str(PROJECT_ROOT))

    for platform, cfg in PLATFORM_CONFIG.items():
        if platform != "cerebras":
            continue

        active = pool.get_active_keys(platform)
        min_pool = cfg.get("min_pool_size", 3)
        needed = max(count, min_pool - len(active))

        if needed <= 0:
            log.info(f"[{platform}] 活跃 Key {len(active)} 个，≥ 最低水位 {min_pool}，无需补充")
            continue

        log.info(f"[{platform}] 活跃 {len(active)} 个，需补充 {needed} 个")

        from providers.cerebras_provider import CerebrasProvider
        from providers.base_provider import EmailService, AccountStorage

        dummy_config = {"providers": {"cerebras": {}}, "email": {"type": "mailtm"}}
        email_svc = EmailService({"type": "mailtm"})
        storage = AccountStorage(db_path=str(SCRIPT_DIR / "accounts.db"), json_dir=str(SCRIPT_DIR / "tokens/"))
        provider = CerebrasProvider(dummy_config, email_svc, storage)

        success = 0
        for i in range(needed):
            log.info(f"[{platform}] 注册 {i+1}/{needed}...")
            result = provider.register()
            if result and result.api_key:
                ok, msg, elapsed = test_key(platform, result.api_key)
                if ok:
                    pool.add_key(platform, result.api_key,
                                 model=cfg["default_model"],
                                 email=result.email)
                    pool.update_status(result.api_key, "active", elapsed)
                    success += 1
                    log.info(f"  ✅ 注册成功: {result.api_key[:16]}... ({elapsed:.0f}ms)")
                else:
                    log.warning(f"  ⚠️ 注册成功但验证失败: {msg}")
            else:
                log.warning(f"  ❌ 注册失败")

            if i < needed - 1:
                wait = 5 + int(time.time()) % 10
                log.info(f"  等待 {wait} 秒...")
                time.sleep(wait)

        log.info(f"[{platform}] 补充完成: {success}/{needed} 成功")


def cmd_daemon(pool: KeyPool, interval: int = 600):
    """守护模式：定期健康检查 + 自动补充"""
    log.info(f"[daemon] 启动，检查间隔 {interval} 秒")
    while True:
        try:
            log.info("[daemon] 执行健康检查...")
            keys = pool.get_all_keys()
            for k in keys:
                ok, msg, elapsed = test_key(k["platform"], k["api_key"], k.get("model"))
                pool.update_status(k["api_key"], "active" if ok else "dead", elapsed)

            log.info("[daemon] 检查自动补充...")
            cmd_auto_fill(pool)

            stats = pool.stats()
            for p, s in stats.items():
                log.info(f"  [{p}] 活跃: {s['active']}/{s['total']}")

        except Exception as e:
            log.error(f"[daemon] 异常: {e}")

        log.info(f"[daemon] 下次检查: {interval} 秒后")
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description="卡若AI Key 池管理器")
    parser.add_argument("command", choices=["status", "check", "add", "export-env", "auto-fill", "daemon", "serve"],
                        help="操作命令")
    parser.add_argument("key", nargs="?", default="", help="API Key (add 命令用)")
    parser.add_argument("--platform", "-p", default="cerebras", help="平台名")
    parser.add_argument("--count", "-n", type=int, default=0, help="补充数量")
    parser.add_argument("--interval", type=int, default=600, help="守护模式检查间隔(秒)")
    parser.add_argument("--port", type=int, default=8898, help="API 服务端口")
    args = parser.parse_args()

    pool = KeyPool()

    if args.command == "status":
        cmd_status(pool)
    elif args.command == "check":
        cmd_check(pool)
    elif args.command == "add":
        if not args.key:
            print("用法: key_pool_manager.py add <api_key> [--platform cerebras]")
            return
        cmd_add(pool, args.key, args.platform)
    elif args.command == "export-env":
        cmd_export_env(pool)
    elif args.command == "auto-fill":
        cmd_auto_fill(pool, args.count)
    elif args.command == "daemon":
        cmd_daemon(pool, args.interval)
    elif args.command == "serve":
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        import uvicorn

        app = FastAPI(title="卡若AI Key Pool API")

        @app.get("/keys/{platform}")
        def get_keys(platform: str):
            keys = pool.get_active_keys(platform)
            return {"platform": platform, "count": len(keys),
                    "keys": [{"api_key": k["api_key"], "model": k["model"],
                              "latency_ms": k["latency_ms"]} for k in keys]}

        @app.get("/next/{platform}")
        def next_key(platform: str):
            key = pool.get_next_key(platform)
            if not key:
                return JSONResponse(status_code=404, content={"error": f"No key for {platform}"})
            cfg = PLATFORM_CONFIG.get(platform, {})
            return {"platform": platform, "api_key": key,
                    "base_url": cfg.get("base_url", ""),
                    "model": cfg.get("default_model", "")}

        @app.get("/export-env")
        def export_env():
            active = pool.get_active_keys()
            bases, keys, models = [], [], []
            for k in active:
                cfg = PLATFORM_CONFIG.get(k["platform"], {})
                bases.append(cfg.get("base_url", ""))
                keys.append(k["api_key"])
                models.append(k.get("model") or cfg.get("default_model", ""))
            return {"OPENAI_API_BASES": ",".join(bases),
                    "OPENAI_API_KEYS": ",".join(keys),
                    "OPENAI_MODELS": ",".join(models)}

        @app.get("/stats")
        def stats():
            return pool.stats()

        uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
