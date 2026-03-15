"""
Key 管理 API 服务
提供 RESTful 接口管理已注册的 API Key 池，支持轮换获取 Key。
"""

import sys
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from providers.base_provider import AccountStorage, AccountResult


class AddKeyRequest(BaseModel):
    provider: str
    email: str = ""
    api_key: str = ""
    access_token: str = ""
    password: str = ""


def create_app(config: dict) -> FastAPI:
    storage_cfg = config.get("storage", {})
    storage = AccountStorage(
        db_path=storage_cfg.get("db_path", "accounts.db"),
        json_dir=storage_cfg.get("json_dir", "tokens/"),
    )

    app = FastAPI(title="全网API Key管理", version="1.0")

    @app.get("/health")
    def health():
        return {"status": "ok", "time": datetime.now().isoformat()}

    @app.get("/stats")
    def stats():
        """各平台账号统计"""
        all_accounts = storage.list_accounts()
        by_provider = {}
        for a in all_accounts:
            p = a["provider"]
            if p not in by_provider:
                by_provider[p] = {"total": 0, "active": 0, "with_key": 0}
            by_provider[p]["total"] += 1
            if a["status"] == "active":
                by_provider[p]["active"] += 1
            if a.get("api_key"):
                by_provider[p]["with_key"] += 1
        return {"total": len(all_accounts), "by_provider": by_provider}

    @app.get("/accounts")
    def list_accounts(provider: str = Query(None)):
        """列出账号（可按平台筛选）"""
        accounts = storage.list_accounts(provider)
        for a in accounts:
            if a.get("api_key"):
                a["api_key_preview"] = a["api_key"][:16] + "..."
            if a.get("access_token"):
                a["access_token_preview"] = a["access_token"][:16] + "..."
        return {"count": len(accounts), "accounts": accounts}

    @app.get("/key/random")
    def random_key(provider: str = Query(...)):
        """随机获取一个可用的 API Key（用于轮换池）"""
        key = storage.get_random_key(provider)
        if not key:
            raise HTTPException(status_code=404, detail=f"No active key for {provider}")
        return {"provider": provider, "api_key": key}

    @app.get("/key/next")
    def next_key(provider: str = Query(...)):
        """轮换获取下一个 Key（Round-Robin）"""
        accounts = storage.list_accounts(provider)
        active = [a for a in accounts if a["status"] == "active" and a.get("api_key")]
        if not active:
            raise HTTPException(status_code=404, detail=f"No active key for {provider}")
        import time
        idx = int(time.time()) % len(active)
        return {"provider": provider, "api_key": active[idx]["api_key"], "email": active[idx]["email"]}

    @app.post("/key/add")
    def add_key(req: AddKeyRequest):
        """手动添加 Key"""
        result = AccountResult(
            provider=req.provider,
            email=req.email or f"manual_{req.provider}",
            api_key=req.api_key,
            access_token=req.access_token,
            password=req.password,
        )
        storage.save(result)
        return {"status": "ok", "message": f"Added key for {req.provider}"}

    @app.get("/openai-compatible/v1/models")
    def openai_models():
        """OpenAI 兼容接口 — 模型列表"""
        return {
            "object": "list",
            "data": [
                {"id": "gpt-4", "object": "model"},
                {"id": "gpt-4o", "object": "model"},
                {"id": "gpt-3.5-turbo", "object": "model"},
                {"id": "gemini-pro", "object": "model"},
                {"id": "llama-3.1-70b", "object": "model"},
            ]
        }

    return app
