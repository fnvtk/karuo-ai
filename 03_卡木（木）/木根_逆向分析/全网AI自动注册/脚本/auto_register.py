#!/usr/bin/env python3
"""
全网API自动注册 — 主程序入口
支持: OpenAI / Cursor / Gemini / Groq / DeepSeek / Mistral / Together / Cohere

用法:
  python auto_register.py --provider openai --count 5
  python auto_register.py --provider cursor --count 3
  python auto_register.py --list
  python auto_register.py --list --provider openai
  python auto_register.py --serve --port 8899
  python auto_register.py --add-key gemini YOUR_API_KEY
"""

import os
import sys
import argparse
import logging
import yaml
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from providers.base_provider import EmailService, AccountStorage
from providers.openai_provider import OpenAIProvider
from providers.cursor_provider import CursorProvider
from providers.gemini_provider import GeminiProvider
from providers.generic_browser_provider import GenericBrowserProvider
from providers.cerebras_provider import CerebrasProvider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("auto_register")

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR / "config.yaml"


def load_config(path: str = None) -> dict:
    config_path = Path(path) if path else DEFAULT_CONFIG
    if not config_path.exists():
        example = SCRIPT_DIR / "config.example.yaml"
        if example.exists():
            log.warning(f"未找到 config.yaml，使用 config.example.yaml")
            config_path = example
        else:
            log.error("未找到配置文件")
            sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_provider(name: str, config: dict, email_svc: EmailService, storage: AccountStorage):
    providers = {
        "openai": lambda: OpenAIProvider(config, email_svc, storage),
        "cursor": lambda: CursorProvider(config, email_svc, storage),
        "gemini": lambda: GeminiProvider(config, email_svc, storage),
        "cerebras": lambda: CerebrasProvider(config, email_svc, storage),
        "groq": lambda: GenericBrowserProvider("groq", config, email_svc, storage),
        "deepseek": lambda: GenericBrowserProvider("deepseek", config, email_svc, storage),
        "mistral": lambda: GenericBrowserProvider("mistral", config, email_svc, storage),
        "together": lambda: GenericBrowserProvider("together", config, email_svc, storage),
        "cohere": lambda: GenericBrowserProvider("cohere", config, email_svc, storage),
    }
    factory = providers.get(name)
    if not factory:
        log.error(f"不支持的平台: {name}。支持: {', '.join(providers.keys())}")
        sys.exit(1)
    return factory()


def cmd_register(args, config):
    storage_cfg = config.get("storage", {})
    storage = AccountStorage(
        db_path=storage_cfg.get("db_path", "accounts.db"),
        json_dir=storage_cfg.get("json_dir", "tokens/"),
    )
    email_svc = EmailService(config.get("email", {}))
    provider = get_provider(args.provider, config, email_svc, storage)

    reg_cfg = config.get("registration", {})
    max_workers = reg_cfg.get("max_workers", 5)

    log.info(f"开始批量注册: 平台={args.provider}, 数量={args.count}, 并发={max_workers}")
    results = provider.register_batch(args.count, max_workers=max_workers)

    print(f"\n{'='*60}")
    print(f"注册完成: {len(results)}/{args.count} 成功")
    for r in results:
        key_display = r.api_key[:20] if r.api_key else r.access_token[:20] if r.access_token else "N/A"
        print(f"  [{r.provider}] {r.email} → {key_display}...")
    print(f"{'='*60}")


def cmd_list(args, config):
    storage_cfg = config.get("storage", {})
    storage = AccountStorage(
        db_path=storage_cfg.get("db_path", "accounts.db"),
        json_dir=storage_cfg.get("json_dir", "tokens/"),
    )
    accounts = storage.list_accounts(args.provider if args.provider != "all" else None)
    if not accounts:
        print("暂无注册账号")
        return

    print(f"\n{'='*80}")
    print(f"{'平台':<12} {'邮箱':<30} {'Key/Token':<25} {'状态':<10} {'时间'}")
    print(f"{'-'*80}")
    for a in accounts:
        key = a.get("api_key") or a.get("access_token") or ""
        key_short = key[:20] + "..." if key else "N/A"
        print(f"{a['provider']:<12} {a['email']:<30} {key_short:<25} {a['status']:<10} {a['registered_at'][:16]}")
    print(f"{'='*80}")
    print(f"共 {len(accounts)} 个账号")


def cmd_add_key(args, config):
    storage_cfg = config.get("storage", {})
    storage = AccountStorage(
        db_path=storage_cfg.get("db_path", "accounts.db"),
        json_dir=storage_cfg.get("json_dir", "tokens/"),
    )
    email_svc = EmailService(config.get("email", {}))

    if args.provider == "gemini":
        p = GeminiProvider(config, email_svc, storage)
        p.add_existing_key(args.key, email=f"manual_{args.provider}")
    else:
        from providers.base_provider import AccountResult
        result = AccountResult(
            provider=args.provider,
            email=f"manual_{args.provider}",
            api_key=args.key,
            name="manual_add",
        )
        storage.save(result)
    print(f"已添加 {args.provider} Key: {args.key[:20]}...")


def cmd_serve(args, config):
    """启动 Key 管理 API 服务"""
    from key_manager_api import create_app
    import uvicorn
    api_cfg = config.get("api_server", {})
    host = api_cfg.get("host", "0.0.0.0")
    port = args.port or api_cfg.get("port", 8899)
    app = create_app(config)
    log.info(f"启动 Key 管理 API: http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)


def main():
    parser = argparse.ArgumentParser(description="全网API自动注册工具")
    parser.add_argument("--config", "-c", default=None, help="配置文件路径")

    sub = parser.add_subparsers(dest="command")

    reg_parser = sub.add_parser("register", aliases=["reg"], help="注册新账号")
    reg_parser.add_argument("--provider", "-p", required=True, help="平台名")
    reg_parser.add_argument("--count", "-n", type=int, default=1, help="注册数量")

    list_parser = sub.add_parser("list", aliases=["ls"], help="列出已注册账号")
    list_parser.add_argument("--provider", "-p", default="all", help="筛选平台")

    add_parser = sub.add_parser("add-key", help="手动添加已有 Key")
    add_parser.add_argument("--provider", "-p", required=True, help="平台名")
    add_parser.add_argument("--key", "-k", required=True, help="API Key")

    serve_parser = sub.add_parser("serve", help="启动 Key 管理 API 服务")
    serve_parser.add_argument("--port", type=int, default=None, help="端口号")

    # 兼容旧式参数
    parser.add_argument("--provider", "-p", default=None, help="平台名")
    parser.add_argument("--count", "-n", type=int, default=1, help="注册数量")
    parser.add_argument("--list", action="store_true", help="列出账号")
    parser.add_argument("--serve", action="store_true", help="启动 API 服务")
    parser.add_argument("--port", type=int, default=None, help="端口号")
    parser.add_argument("--add-key", nargs=2, metavar=("PROVIDER", "KEY"), help="手动添加 Key")

    args = parser.parse_args()
    config = load_config(args.config)

    if args.command in ("register", "reg"):
        cmd_register(args, config)
    elif args.command in ("list", "ls"):
        cmd_list(args, config)
    elif args.command == "add-key":
        cmd_add_key(args, config)
    elif args.command == "serve":
        cmd_serve(args, config)
    elif args.list:
        class FakeArgs:
            provider = args.provider or "all"
        cmd_list(FakeArgs(), config)
    elif args.serve:
        cmd_serve(args, config)
    elif args.add_key:
        class FakeArgs:
            provider = args.add_key[0]
            key = args.add_key[1]
        cmd_add_key(FakeArgs(), config)
    elif args.provider:
        class FakeArgs:
            provider = args.provider
            count = args.count
        cmd_register(FakeArgs(), config)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
