#!/usr/bin/env python3
"""
通过 DSM Web API 查询并尝试启用 Time Machine（NetBackup）
在可访问 192.168.1.201 的本机运行：python3 ckbnas_timemachine_via_api.py
"""
import requests
import json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE = "http://192.168.1.201:5000/webapi"
USER = "fnvtk"
PASS = "zhiqun1984"

def login():
    r = requests.get(f"{BASE}/auth.cgi", params={
        "api": "SYNO.API.Auth", "version": "3", "method": "login",
        "account": USER, "passwd": PASS, "session": "FileStation", "format": "sid"
    }, verify=False, timeout=10)
    d = r.json()
    if not d.get("success"):
        print("登录失败:", d.get("error", {}).get("code"), d)
        return None
    return d["data"]["sid"]

def query_api(sid):
    """查询所有 API 列表，找与 FileService / SMB / TimeMachine 相关的"""
    r = requests.get(f"{BASE}/query.cgi", params={
        "api": "SYNO.API.Info", "version": "1", "method": "query", "query": "all", "_sid": sid
    }, verify=False, timeout=10)
    d = r.json()
    if not d.get("success"):
        print("查询 API 失败:", d)
        return {}
    apis = d.get("data", {})
    # 筛选可能和文件服务/Time Machine 相关的
    for name, info in apis.items():
        if "file" in name.lower() or "smb" in name.lower() or "share" in name.lower() or "time" in name.lower():
            print(name, "->", info.get("path"), "maxVersion:", info.get("maxVersion"))
    return apis

def main():
    print("1. 登录 DSM...")
    sid = login()
    if not sid:
        return
    print("2. 查询 API 列表（含 file/smb/share/time 的项）...")
    query_api(sid)
    print("\n若上面有 SYNO.Core.* 或 SYNO.FileService 等，可据此继续调用。")
    print("当前 DSM 未公开「仅启用某共享 Time Machine」的单一 API，通常需在 DSM 控制面板手动开启。")

if __name__ == "__main__":
    main()
