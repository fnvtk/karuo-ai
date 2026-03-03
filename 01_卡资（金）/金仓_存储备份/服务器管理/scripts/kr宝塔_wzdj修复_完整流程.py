#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wzdj.quwanzhi.com 修复完整流程：前置检查 → 宝塔 API → SSH → TAT，直至网站可访问。"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.parse
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

KR_PANEL = "https://43.139.27.93:9988"
KR_API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
KR_SSH = "root@43.139.27.93"
KR_SSH_PORT = "22022"
KR_SSH_PASS = "Zhiqun1984"
WZDJ_DOMAIN = "wzdj.quwanzhi.com"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FIX_SH = os.path.join(SCRIPT_DIR, "kr宝塔_仅修复wzdj_宝塔终端执行.sh")


def bt_sign():
    t = int(time.time())
    token = hashlib.md5((str(t) + hashlib.md5(KR_API_KEY.encode()).hexdigest()).encode()).hexdigest()
    return {"request_time": t, "request_token": token}


def bt_post(path, data=None):
    pl = bt_sign()
    if data:
        pl.update(data)
    req = urllib.request.Request(KR_PANEL + path, data=urllib.parse.urlencode(pl).encode(), method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def bt_stop_wzdj():
    """宝塔 API 停止 wzdj"""
    try:
        bt_post("/project/nodejs/stop_project", {"project_name": "wzdj"})
        print("  API 已停止 wzdj")
        return True
    except Exception as e:
        print("  API 停止 wzdj 失败:", e)
        return False


def pre_check():
    """前置检查：本项目及周边 Node 项目状态（优先宝塔 API）"""
    print("【前置检查】目标项目 wzdj 及周边 Node 项目状态")
    try:
        r = bt_post("/project/nodejs/get_project_list")
        items = r.get("data") or r.get("list") or []
        if not items:
            print("  API 返回无项目列表")
            return None
        for it in items:
            name = it.get("name") or it.get("project_name") or ""
            run = it.get("run", False)
            path = it.get("path") or it.get("project_path") or ""
            print("  -", name, "运行:" if run else "未运行", path[:50] if path else "")
        wzdj = next((x for x in items if (x.get("name") or x.get("project_name")) == "wzdj"), None)
        return {"ok": True, "wzdj": wzdj, "all": items}
    except Exception as e:
        print("  宝塔 API 不可用:", str(e)[:80])
        return None


def fix_via_ssh():
    """通过 SSH 在服务器上执行修复脚本"""
    if not os.path.isfile(FIX_SH):
        print("  修复脚本不存在:", FIX_SH)
        return False
    try:
        with open(FIX_SH, "r", encoding="utf-8") as f:
            script = f.read()
        cmd = [
            "sshpass", "-p", KR_SSH_PASS,
            "ssh", "-p", KR_SSH_PORT,
            "-o", "StrictHostKeyChecking=no", "-o", "PubkeyAuthentication=no",
            KR_SSH, "bash -s"
        ]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        out, _ = p.communicate(input=script, timeout=120)
        print(out[:2000] if out else "(无输出)")
        return p.returncode == 0
    except FileNotFoundError:
        print("  sshpass 未安装，跳过 SSH")
        return False
    except subprocess.TimeoutExpired:
        print("  SSH 执行超时")
        return False
    except Exception as e:
        print("  SSH 失败:", e)
        return False


def fix_via_tat():
    """通过 TAT 在服务器上执行修复"""
    tat_script = os.path.join(SCRIPT_DIR, "腾讯云_TAT_kr宝塔_修复wzdj启动.py")
    if not os.path.isfile(tat_script):
        print("  TAT 脚本不存在:", tat_script)
        return False
    try:
        venv_py = os.path.join(SCRIPT_DIR, ".venv_tx", "bin", "python")
        karuo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR))))
        py = venv_py if os.path.isfile(venv_py) else sys.executable
        p = subprocess.run([py, tat_script], capture_output=True, text=True, timeout=90, cwd=karuo_root)
        if p.stdout:
            print(p.stdout[:1500])
        if p.returncode != 0 and p.stderr:
            print("stderr:", p.stderr[:500])
        return p.returncode == 0
    except Exception as e:
        print("  TAT 失败:", e)
        return False


def start_wzdj_api():
    """宝塔 API 启动 wzdj"""
    try:
        r = bt_post("/project/nodejs/start_project", {"project_name": "wzdj"})
        ok = r.get("status") or ("成功" in str(r.get("msg", "")))
        print("  API 启动 wzdj:", "成功" if ok else r.get("msg", r))
        return ok
    except Exception as e:
        print("  API 启动失败:", e)
        return False


def verify_site():
    """验证站点可访问"""
    try:
        req = urllib.request.Request("https://" + WZDJ_DOMAIN, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            code = r.getcode()
            print("  %s HTTP %s" % (WZDJ_DOMAIN, code))
            return 200 <= code < 400
    except Exception as e:
        print("  访问 %s 失败: %s" % (WZDJ_DOMAIN, e))
        return False


def main():
    # 1) 前置检查
    pre_check()
    print()

    # 2) 先尝试 API 停止 wzdj（便于后续改配置）
    print("【停止 wzdj】优先宝塔 API")
    bt_stop_wzdj()
    print()

    # 3) 修复：优先 SSH，失败再用 TAT（改 site.db / wzdj.sh 只能机内执行）
    print("【修复】按顺序尝试：SSH → TAT")
    if fix_via_ssh():
        print("  已通过 SSH 完成修复")
    else:
        print("  改用 TAT 执行修复")
        fix_via_tat()
    print()

    time.sleep(3)

    # 4) 启动 wzdj：优先宝塔 API
    print("【启动 wzdj】优先宝塔 API")
    if not start_wzdj_api():
        print("  API 启动失败，修复脚本内已含启动步骤，请稍后查看面板")
    print()

    time.sleep(5)

    # 5) 再次检查项目与周边
    print("【修复后检查】目标及周边项目")
    pre_check()
    print()

    # 6) 验证站点
    print("【验证站点】")
    ok = verify_site()
    if ok:
        print("  结果: wzdj.quwanzhi.com 可正常访问")
    else:
        print("  若仍不可访问，请到宝塔面板查看 Node 项目 wzdj 状态与日志")
    # 写入工作台结果文件
    try:
        karuo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR)))))
        out_path = os.path.join(karuo, "运营中枢", "工作台", "wzdj_flow_result.txt")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("wzdj 修复流程 %s\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
            f.write("站点可访问: %s\n" % ok)
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
