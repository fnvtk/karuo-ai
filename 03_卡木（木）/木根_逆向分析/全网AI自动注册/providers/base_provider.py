"""
全网API自动注册 — Provider 基类
所有平台的注册逻辑都继承此基类，实现统一的注册接口。
"""

import os
import re
import json
import time
import random
import string
import hashlib
import secrets
import sqlite3
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from faker import Faker

log = logging.getLogger("auto_register")
fake = Faker(["en_US", "zh_CN", "ja_JP"])


@dataclass
class AccountResult:
    """注册结果统一数据结构"""
    provider: str
    email: str
    password: str = ""
    api_key: str = ""
    access_token: str = ""
    refresh_token: str = ""
    account_id: str = ""
    name: str = ""
    extra: dict = field(default_factory=dict)
    registered_at: str = ""
    status: str = "active"

    def __post_init__(self):
        if not self.registered_at:
            self.registered_at = datetime.now(timezone.utc).isoformat()


class AccountStorage:
    """SQLite + JSON 双存储"""

    def __init__(self, db_path: str = "accounts.db", json_dir: str = "tokens/"):
        self.db_path = db_path
        self.json_dir = Path(json_dir)
        self.json_dir.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    email TEXT NOT NULL,
                    password TEXT DEFAULT '',
                    api_key TEXT DEFAULT '',
                    access_token TEXT DEFAULT '',
                    refresh_token TEXT DEFAULT '',
                    account_id TEXT DEFAULT '',
                    name TEXT DEFAULT '',
                    extra TEXT DEFAULT '{}',
                    registered_at TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    UNIQUE(provider, email)
                )
            """)
            conn.commit()

    def save(self, result: AccountResult):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO accounts
                (provider, email, password, api_key, access_token, refresh_token,
                 account_id, name, extra, registered_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.provider, result.email, result.password,
                result.api_key, result.access_token, result.refresh_token,
                result.account_id, result.name, json.dumps(result.extra),
                result.registered_at, result.status,
            ))
            conn.commit()

        json_file = self.json_dir / f"{result.provider}_{result.email.replace('@', '_at_')}.json"
        json_file.write_text(json.dumps(asdict(result), indent=2, ensure_ascii=False))
        log.info(f"[存储] {result.provider} / {result.email} → DB + {json_file.name}")

    def list_accounts(self, provider: str = None) -> list[dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if provider:
                rows = conn.execute(
                    "SELECT * FROM accounts WHERE provider = ? ORDER BY id DESC", (provider,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM accounts ORDER BY id DESC").fetchall()
            return [dict(r) for r in rows]

    def get_random_key(self, provider: str) -> Optional[str]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT api_key FROM accounts WHERE provider = ? AND status = 'active' AND api_key != '' ORDER BY RANDOM() LIMIT 1",
                (provider,)
            ).fetchone()
            return row[0] if row else None

    def count(self, provider: str = None) -> int:
        with sqlite3.connect(self.db_path) as conn:
            if provider:
                return conn.execute(
                    "SELECT COUNT(*) FROM accounts WHERE provider = ?", (provider,)
                ).fetchone()[0]
            return conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]


class EmailService:
    """临时邮箱服务（支持 tempmail.plus / Cloudflare Worker / 域名 IMAP）"""

    RE_OTP = re.compile(r"(?<!\d)(\d{6})(?!\d)")
    RE_CODE_PRECISE = re.compile(r"(?:code\s+is|verification code|验证码)[:\s]*(\d{6})", re.IGNORECASE)

    def __init__(self, config: dict):
        self.config = config
        self.email_type = config.get("type", "tempmail")

    def generate_email(self) -> tuple[str, dict]:
        """生成临时邮箱，返回 (email_address, context_for_receiving)"""
        if self.email_type == "tempmail":
            return self._gen_tempmail()
        elif self.email_type == "mailtm":
            fixed = self._mailtm_fixed_credentials()
            if fixed:
                addr, pwd = fixed
                log.info("[邮箱] 使用固定 mail.tm（MAILTM_ADDRESS 或 config.mailtm.fixed_*）")
                return self._mailtm_login(addr, pwd)
            return self._gen_mailtm()
        elif self.email_type == "cloudflare_worker":
            return self._gen_cf_worker()
        elif self.email_type == "domain_imap":
            return self._gen_domain_imap()
        raise ValueError(f"不支持的邮箱类型: {self.email_type}")

    def _gen_tempmail(self) -> tuple[str, dict]:
        cfg = self.config.get("tempmail", {})
        prefix = cfg.get("username", "test")
        random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"{prefix}{random_suffix}@tempmail.plus"
        return email, {"type": "tempmail", "pin": cfg.get("pin", "")}

    def _mailtm_fixed_credentials(self) -> Optional[tuple[str, str]]:
        """环境变量或 config.mailtm 固定账号，供 Cursor 等复用已创建的 mail.tm。"""
        cfg = self.config.get("mailtm") or {}
        addr = (os.environ.get("MAILTM_ADDRESS") or cfg.get("fixed_address") or "").strip()
        pwd = (os.environ.get("MAILTM_PASSWORD") or cfg.get("fixed_password") or "").strip()
        if addr and pwd:
            return addr, pwd
        return None

    def _mailtm_login(self, address: str, password: str) -> tuple[str, dict]:
        import httpx
        api = "https://api.mail.tm"
        t = 25
        r = httpx.post(
            f"{api}/token",
            json={"address": address, "password": password},
            timeout=t,
        )
        if r.status_code != 200:
            raise RuntimeError(f"mail.tm 登录/token 失败: {r.status_code} {r.text[:120]}")
        token = r.json().get("token", "")
        if not token:
            raise RuntimeError("mail.tm 返回空 token")
        return address, {"type": "mailtm", "token": token}

    def _gen_mailtm(self) -> tuple[str, dict]:
        """mail.tm API 新建临时邮箱（Cursor / Cerebras 等同源）"""
        import httpx
        api = "https://api.mail.tm"
        t = 25
        r = httpx.get(f"{api}/domains", timeout=t)
        domains = r.json().get("hydra:member", [])
        if not domains:
            raise RuntimeError("mail.tm 无可用域名")
        domain = domains[0]["domain"]
        prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
        email = f"{prefix}@{domain}"
        password = "".join(random.choices(string.ascii_letters + string.digits, k=16))
        r = httpx.post(f"{api}/accounts", json={"address": email, "password": password}, timeout=t)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"mail.tm 创建失败: {r.status_code} {r.text[:80]}")
        return self._mailtm_login(email, password)

    def _gen_cf_worker(self) -> tuple[str, dict]:
        import httpx
        cfg = self.config.get("cloudflare_worker", {})
        prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
        domain = cfg["domain"]
        url = cfg["url"]
        resp = httpx.post(f"{url}/api/new_address", json={"name": prefix}, timeout=15)
        data = resp.json()
        return data.get("address", f"{prefix}@{domain}"), {
            "type": "cf_worker", "jwt": data.get("jwt", ""), "url": url
        }

    def _gen_domain_imap(self) -> tuple[str, dict]:
        cfg = self.config.get("domain_imap", {})
        domains = cfg.get("domains", ["example.com"])
        domain = random.choice(domains)
        prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
        email = f"{prefix}@{domain}"
        return email, {"type": "domain_imap", "email": email}

    def wait_for_code(self, email: str, context: dict, timeout: int = 120) -> Optional[str]:
        """等待并提取 6 位 OTP 验证码"""
        email_type = context.get("type", "tempmail")
        if email_type == "tempmail":
            return self._poll_tempmail(email, context, timeout)
        elif email_type == "mailtm":
            return self._poll_mailtm(context, timeout)
        elif email_type == "cf_worker":
            return self._poll_cf_worker(email, context, timeout)
        elif email_type == "domain_imap":
            return self._poll_imap(email, context, timeout)
        return None

    def _poll_tempmail(self, email: str, context: dict, timeout: int) -> Optional[str]:
        import httpx
        addr = email.split("@")[0]
        pin = context.get("pin", "")
        start = time.time()
        while time.time() - start < timeout:
            try:
                url = f"https://tempmail.plus/api/mails?email={addr}&limit=20&epin={pin}"
                resp = httpx.get(url, timeout=10)
                mails = resp.json().get("mail_list", [])
                for mail in mails:
                    code = self._extract_code(mail.get("subject", ""), mail.get("text", ""))
                    if code:
                        return code
            except Exception as e:
                log.warning(f"[邮箱] tempmail 轮询异常: {e}")
            time.sleep(3)
        return None

    def _poll_mailtm(self, context: dict, timeout: int) -> Optional[str]:
        """轮询 mail.tm 收件箱，提取 6 位验证码"""
        import httpx
        token = context.get("token", "")
        if not token:
            return None
        headers = {"Authorization": f"Bearer {token}"}
        start = time.time()
        while time.time() - start < timeout:
            try:
                r = httpx.get("https://api.mail.tm/messages", headers=headers, timeout=10)
                messages = r.json().get("hydra:member", [])
                for msg in messages:
                    mid = msg.get("id", "")
                    if not mid:
                        continue
                    dr = httpx.get(f"https://api.mail.tm/messages/{mid}", headers=headers, timeout=10)
                    data = dr.json()
                    subject = data.get("subject", "")
                    text = data.get("text", "")
                    html = data.get("html")
                    if isinstance(html, list) and html:
                        text = text or str(html[0])
                    elif isinstance(html, str):
                        text = text or html
                    code = self._extract_code(subject, text)
                    if code:
                        return code
            except Exception as e:
                log.warning(f"[邮箱] mail.tm 轮询异常: {e}")
            time.sleep(3)
        return None

    def _poll_cf_worker(self, email: str, context: dict, timeout: int) -> Optional[str]:
        import httpx
        jwt = context.get("jwt", "")
        url = context.get("url", "")
        start = time.time()
        while time.time() - start < timeout:
            try:
                resp = httpx.get(
                    f"{url}/api/mails?limit=20&offset=0",
                    headers={"Authorization": f"Bearer {jwt}"},
                    timeout=10,
                )
                mails = resp.json().get("results", [])
                for mail in mails:
                    raw = mail.get("raw", mail.get("text", ""))
                    code = self._extract_code(mail.get("subject", ""), raw)
                    if code:
                        return code
            except Exception as e:
                log.warning(f"[邮箱] CF Worker 轮询异常: {e}")
            time.sleep(3)
        return None

    def _poll_imap(self, email: str, context: dict, timeout: int) -> Optional[str]:
        import imaplib
        import email as email_lib
        cfg = self.config.get("domain_imap", {})
        start = time.time()
        while time.time() - start < timeout:
            try:
                imap = imaplib.IMAP4_SSL(cfg["imap_host"], cfg.get("imap_port", 993))
                imap.login(cfg["imap_user"], cfg["imap_pass"])
                imap.select("INBOX")
                _, msg_nums = imap.search(None, f'(TO "{email}" UNSEEN)')
                for num in msg_nums[0].split():
                    _, msg_data = imap.fetch(num, "(RFC822)")
                    msg = email_lib.message_from_bytes(msg_data[0][1])
                    subject = str(msg.get("Subject", ""))
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain":
                                body = part.get_payload(decode=True).decode(errors="ignore")
                                break
                    else:
                        body = msg.get_payload(decode=True).decode(errors="ignore")
                    code = self._extract_code(subject, body)
                    if code:
                        imap.logout()
                        return code
                imap.logout()
            except Exception as e:
                log.warning(f"[邮箱] IMAP 轮询异常: {e}")
            time.sleep(3)
        return None

    def _extract_code(self, subject: str, body: str) -> Optional[str]:
        """从邮件主题和正文中提取 6 位 OTP（正文可为 HTML）"""
        import re as _re

        def _strip_html(s: str) -> str:
            return _re.sub(r"<[^>]+>", " ", s or "")

        plain = (body or "") + "\n" + _strip_html(body or "")
        precise = self.RE_CODE_PRECISE.search(subject)
        if precise:
            return precise.group(1)
        precise = self.RE_CODE_PRECISE.search(plain)
        if precise:
            return precise.group(1)
        match = self.RE_OTP.search(subject)
        if match:
            return match.group(1)
        match = self.RE_OTP.search(plain)
        if match:
            return match.group(1)
        return None


def random_name() -> tuple[str, str]:
    first = fake.first_name()
    last = fake.last_name()
    return first, last


def random_password(length: int = 16) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    pwd = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$%"),
    ]
    pwd += random.choices(chars, k=length - 4)
    random.shuffle(pwd)
    return "".join(pwd)


def random_birthday(min_age: int = 20, max_age: int = 40) -> str:
    year = datetime.now().year - random.randint(min_age, max_age)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year}-{month:02d}-{day:02d}"


def create_pkce_pair() -> tuple[str, str]:
    """PKCE code_verifier + code_challenge (S256)"""
    import base64
    verifier = secrets.token_urlsafe(48)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


class BaseProvider(ABC):
    """所有平台 Provider 的抽象基类"""

    PROVIDER_NAME: str = "base"

    def __init__(self, config: dict, email_service: EmailService, storage: AccountStorage):
        self.config = config
        self.email_service = email_service
        self.storage = storage

    @abstractmethod
    def register(self) -> Optional[AccountResult]:
        """执行一次注册，返回 AccountResult 或 None"""
        ...

    def register_batch(self, count: int, max_workers: int = 5) -> list[AccountResult]:
        """批量注册"""
        from concurrent.futures import ThreadPoolExecutor, as_completed
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [pool.submit(self._safe_register) for _ in range(count)]
            for f in as_completed(futures):
                r = f.result()
                if r:
                    results.append(r)
        log.info(f"[{self.PROVIDER_NAME}] 批量注册完成: {len(results)}/{count} 成功")
        return results

    def _safe_register(self) -> Optional[AccountResult]:
        try:
            result = self.register()
            if result:
                self.storage.save(result)
            return result
        except Exception as e:
            log.error(f"[{self.PROVIDER_NAME}] 注册异常: {e}")
            return None
