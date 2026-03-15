#!/usr/bin/env python3
"""Google Device Flow 授权 + 创建 3 个 Gemini API Key"""

import httpx, time, json, sys, random, string, sqlite3
from pathlib import Path
from datetime import datetime, timezone

PROXY = "http://127.0.0.1:7897"
CLIENT_ID = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com"
CLIENT_SECRET = "d-FL95Q19q7MQmFpd7hHD0Ty"
SCOPES = "https://www.googleapis.com/auth/cloud-platform"
DB_PATH = Path(__file__).parent / "accounts.db"
JSON_DIR = Path(__file__).parent / "tokens"
COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3


def save_key(api_key, project_id, idx):
    JSON_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL,
            email TEXT NOT NULL, password TEXT DEFAULT '', api_key TEXT DEFAULT '',
            access_token TEXT DEFAULT '', refresh_token TEXT DEFAULT '',
            account_id TEXT DEFAULT '', name TEXT DEFAULT '', extra TEXT DEFAULT '{}',
            registered_at TEXT NOT NULL, status TEXT DEFAULT 'active',
            UNIQUE(provider, email))""")
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("INSERT OR REPLACE INTO accounts (provider,email,api_key,name,extra,registered_at,status) VALUES (?,?,?,?,?,?,'active')",
            ("gemini", f"gemini_{project_id}@gcp", api_key, project_id, json.dumps({"project": project_id}), now))
        conn.commit()
    (JSON_DIR / f"gemini_{project_id}.json").write_text(json.dumps({"provider":"gemini","project":project_id,"api_key":api_key}, indent=2))


def main():
    sep = "=" * 50
    print(sep)
    print("Gemini API Key Creator (Device Flow)")
    print(f"Target: {COUNT} keys | Proxy: {PROXY}")
    print(sep)

    # Step 1: Device Flow
    print("\n[Step 1] Google Device Flow...")
    with httpx.Client(proxy=PROXY, timeout=15) as c:
        r = c.post("https://oauth2.googleapis.com/device/code", data={"client_id": CLIENT_ID, "scope": SCOPES})
        print(f"Status: {r.status_code}")
        if r.status_code != 200:
            print(f"Failed: {r.text[:300]}")
            return

        d = r.json()
        user_code = d["user_code"]
        verify_url = d["verification_url"]
        device_code = d["device_code"]
        interval = d.get("interval", 5)

        print(f"\n{sep}")
        print(f"Open in ANY browser/phone: {verify_url}")
        print(f"Enter code: {user_code}")
        print(f"{sep}\n")
        print("Waiting for authorization...")

        import webbrowser
        webbrowser.open(verify_url)

        token = None
        for i in range(120):
            time.sleep(interval)
            tr = c.post("https://oauth2.googleapis.com/token", data={
                "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET,
                "device_code": device_code, "grant_type": "urn:ietf:params:oauth:grant-type:device_code"})
            td = tr.json()
            if "access_token" in td:
                token = td["access_token"]
                print(f"\nAuthorized! Token: {token[:25]}...")
                break
            err = td.get("error")
            if err == "authorization_pending":
                if i % 12 == 0 and i > 0:
                    print(f"  Still waiting... ({i*interval}s)")
            elif err == "slow_down":
                time.sleep(5)
            else:
                print(f"Error: {td}")
                return

        if not token:
            print("Timeout!")
            return

    # Step 2: Create projects and keys
    print(f"\n[Step 2] Creating {COUNT} Gemini API Keys...")
    keys = []
    with httpx.Client(proxy=PROXY, timeout=30) as c:
        headers = {"Authorization": f"Bearer {token}"}
        for i in range(1, COUNT + 1):
            sfx = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
            pid = f"gemini-auto-{sfx}"
            print(f"\n  Key {i}/{COUNT}: project={pid}")

            # Create project
            pr = c.post("https://cloudresourcemanager.googleapis.com/v1/projects",
                        headers=headers, json={"projectId": pid, "name": pid})
            print(f"    Create project: {pr.status_code}")
            if pr.status_code not in (200, 409):
                print(f"    Failed: {pr.text[:200]}")
                continue

            time.sleep(3)

            # Enable API
            er = c.post(f"https://serviceusage.googleapis.com/v1/projects/{pid}/services/generativelanguage.googleapis.com:enable",
                        headers=headers)
            print(f"    Enable API: {er.status_code}")
            time.sleep(5)

            # Create API key
            kr = c.post(f"https://apikeys.googleapis.com/v2/projects/{pid}/locations/global/keys",
                        headers=headers, json={"displayName": f"gemini-key-{i}",
                            "restrictions": {"apiTargets": [{"service": "generativelanguage.googleapis.com"}]}})
            print(f"    Create key: {kr.status_code}")

            if kr.status_code == 200:
                kd = kr.json()
                op_name = kd.get("name", "")
                if "operations/" in op_name:
                    for _ in range(10):
                        time.sleep(3)
                        or2 = c.get(f"https://apikeys.googleapis.com/v2/{op_name}", headers=headers)
                        if or2.status_code == 200:
                            od = or2.json()
                            if od.get("done"):
                                ks = od.get("response", {}).get("keyString", "")
                                if ks:
                                    print(f"    KEY: {ks}")
                                    keys.append({"key": ks, "project": pid})
                                    save_key(ks, pid, i)
                                break
                else:
                    ks = kd.get("keyString", "")
                    if ks:
                        print(f"    KEY: {ks}")
                        keys.append({"key": ks, "project": pid})
                        save_key(ks, pid, i)
            else:
                print(f"    Failed: {kr.text[:300]}")

    print(f"\n{sep}")
    print(f"Done! {len(keys)}/{COUNT} keys created")
    for idx, k in enumerate(keys, 1):
        print(f"  {idx}. {k['key']}  (project: {k['project']})")
    if keys:
        print(f"\nTest: curl -x {PROXY} 'https://generativelanguage.googleapis.com/v1beta/models?key={keys[0]['key']}'")
    print(sep)


if __name__ == "__main__":
    main()
