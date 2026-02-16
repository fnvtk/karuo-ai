#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小程序全能管理工具 v3.0

整合能力：
- 微信开发者工具CLI
- miniprogram-ci (npm官方工具)
- 微信开放平台API
- 多小程序管理
- 自动化部署+提审
- 汇总报告生成

使用方法:
    python mp_full.py report              # 生成汇总报告
    python mp_full.py check <app_id>      # 检查项目问题
    python mp_full.py auto <app_id>       # 全自动部署（上传+提审）
    python mp_full.py batch-report        # 批量生成所有小程序报告
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict, field

# 配置文件路径
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "apps_config.json"
REPORT_DIR = SCRIPT_DIR / "reports"


@dataclass
class CheckResult:
    """检查结果"""
    name: str
    status: str  # ok, warning, error
    message: str
    fix_hint: str = ""


@dataclass
class AppReport:
    """小程序报告"""
    app_id: str
    app_name: str
    appid: str
    check_time: str
    checks: List[CheckResult] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)
    
    @property
    def has_errors(self) -> bool:
        return any(c.status == "error" for c in self.checks)
    
    @property
    def has_warnings(self) -> bool:
        return any(c.status == "warning" for c in self.checks)


class MiniProgramManager:
    """小程序全能管理器"""
    
    # 工具路径
    WX_CLI = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
    
    def __init__(self):
        self.config = self._load_config()
        REPORT_DIR.mkdir(exist_ok=True)
    
    def _load_config(self) -> Dict:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"apps": []}
    
    def _save_config(self):
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
    
    def get_app(self, app_id: str) -> Optional[Dict]:
        for app in self.config.get("apps", []):
            if app["id"] == app_id or app["appid"] == app_id:
                return app
        return None
    
    def _run_cmd(self, cmd: List[str], timeout: int = 120) -> tuple:
        """运行命令"""
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            return result.returncode == 0, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return False, "命令执行超时"
        except Exception as e:
            return False, str(e)
    
    def _check_tool(self, tool: str) -> bool:
        """检查工具是否可用"""
        success, _ = self._run_cmd(["which", tool], timeout=5)
        return success
    
    # ==================== 检查功能 ====================
    
    def check_project(self, app_id: str) -> AppReport:
        """检查项目问题"""
        app = self.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return None
        
        report = AppReport(
            app_id=app["id"],
            app_name=app["name"],
            appid=app["appid"],
            check_time=datetime.now().isoformat()
        )
        
        project_path = app["project_path"]
        
        # 1. 检查项目路径
        if os.path.exists(project_path):
            report.checks.append(CheckResult("项目路径", "ok", f"路径存在: {project_path}"))
        else:
            report.checks.append(CheckResult("项目路径", "error", f"路径不存在: {project_path}", "请检查项目路径配置"))
            return report  # 路径不存在，无法继续检查
        
        # 2. 检查project.config.json
        config_file = os.path.join(project_path, "project.config.json")
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            if config.get("appid") == app["appid"]:
                report.checks.append(CheckResult("AppID配置", "ok", f"AppID正确: {app['appid']}"))
            else:
                report.checks.append(CheckResult("AppID配置", "error", 
                    f"AppID不匹配: 配置={app['appid']}, 文件={config.get('appid')}",
                    "请修改project.config.json中的appid"))
        else:
            report.checks.append(CheckResult("项目配置", "error", "project.config.json不存在", "请确认这是有效的小程序项目"))
        
        # 3. 检查app.js
        app_js = os.path.join(project_path, "app.js")
        if os.path.exists(app_js):
            with open(app_js, 'r') as f:
                content = f.read()
            
            # 检查API域名
            if "baseUrl" in content or "apiBase" in content:
                if "https://" in content:
                    report.checks.append(CheckResult("API域名", "ok", "已配置HTTPS域名"))
                elif "http://localhost" in content:
                    report.checks.append(CheckResult("API域名", "warning", "使用本地开发地址", "发布前请更换为HTTPS域名"))
                else:
                    report.checks.append(CheckResult("API域名", "warning", "未检测到HTTPS域名"))
            
            report.checks.append(CheckResult("入口文件", "ok", "app.js存在"))
        else:
            report.checks.append(CheckResult("入口文件", "error", "app.js不存在"))
        
        # 4. 检查app.json
        app_json = os.path.join(project_path, "app.json")
        if os.path.exists(app_json):
            with open(app_json, 'r') as f:
                app_config = json.load(f)
            
            pages = app_config.get("pages", [])
            if pages:
                report.checks.append(CheckResult("页面配置", "ok", f"共{len(pages)}个页面"))
            else:
                report.checks.append(CheckResult("页面配置", "error", "没有配置页面"))
            
            # 检查隐私配置
            if app_config.get("__usePrivacyCheck__"):
                report.checks.append(CheckResult("隐私配置", "ok", "已启用隐私检查"))
            else:
                report.checks.append(CheckResult("隐私配置", "warning", "未启用隐私检查", "建议添加 __usePrivacyCheck__: true"))
        else:
            report.checks.append(CheckResult("应用配置", "error", "app.json不存在"))
        
        # 5. 检查认证状态
        cert_status = app.get("certification", {}).get("status", "unknown")
        if cert_status == "verified":
            report.checks.append(CheckResult("企业认证", "ok", "已完成认证"))
        elif cert_status == "pending":
            report.checks.append(CheckResult("企业认证", "warning", "认证审核中", "等待审核结果"))
        elif cert_status == "expired":
            report.checks.append(CheckResult("企业认证", "error", "认证已过期", "请尽快完成年审"))
        else:
            report.checks.append(CheckResult("企业认证", "warning", "未认证", "无法发布上线，请先完成认证"))
        
        # 6. 检查开发工具
        if os.path.exists(self.WX_CLI):
            report.checks.append(CheckResult("开发者工具", "ok", "微信开发者工具已安装"))
        else:
            report.checks.append(CheckResult("开发者工具", "error", "微信开发者工具未安装"))
        
        # 7. 检查miniprogram-ci
        if self._check_tool("miniprogram-ci"):
            report.checks.append(CheckResult("miniprogram-ci", "ok", "npm工具已安装"))
        else:
            report.checks.append(CheckResult("miniprogram-ci", "warning", "miniprogram-ci未安装", "运行: npm install -g miniprogram-ci"))
        
        # 8. 检查私钥
        if app.get("private_key_path") and os.path.exists(app["private_key_path"]):
            report.checks.append(CheckResult("上传密钥", "ok", "私钥文件存在"))
        else:
            report.checks.append(CheckResult("上传密钥", "warning", "未配置私钥", "在小程序后台下载代码上传密钥"))
        
        # 生成汇总
        ok_count = sum(1 for c in report.checks if c.status == "ok")
        warn_count = sum(1 for c in report.checks if c.status == "warning")
        error_count = sum(1 for c in report.checks if c.status == "error")
        
        report.summary = {
            "total": len(report.checks),
            "ok": ok_count,
            "warning": warn_count,
            "error": error_count,
            "can_deploy": error_count == 0,
            "can_release": cert_status == "verified" and error_count == 0
        }
        
        return report
    
    def print_report(self, report: AppReport):
        """打印报告"""
        print("\n" + "=" * 70)
        print(f"  📊 项目检查报告: {report.app_name}")
        print("=" * 70)
        print(f"  AppID: {report.appid}")
        print(f"  检查时间: {report.check_time}")
        print("-" * 70)
        
        status_icons = {"ok": "✅", "warning": "⚠️", "error": "❌"}
        
        for check in report.checks:
            icon = status_icons.get(check.status, "❓")
            print(f"  {icon} {check.name}: {check.message}")
            if check.fix_hint:
                print(f"      💡 {check.fix_hint}")
        
        print("-" * 70)
        s = report.summary
        print(f"  📈 汇总: 通过 {s['ok']} / 警告 {s['warning']} / 错误 {s['error']}")
        
        if s['can_release']:
            print("  🎉 状态: 可以发布上线")
        elif s['can_deploy']:
            print("  📦 状态: 可以上传代码，但无法发布（需完成认证）")
        else:
            print("  🚫 状态: 存在错误，请先修复")
        
        print("=" * 70 + "\n")
    
    def save_report(self, report: AppReport):
        """保存报告到文件"""
        filename = f"report_{report.app_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = REPORT_DIR / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(asdict(report), f, ensure_ascii=False, indent=2)
        
        return filepath
    
    # ==================== 自动化部署 ====================
    
    def auto_deploy(self, app_id: str, version: str = None, desc: str = None, submit_audit: bool = True) -> bool:
        """全自动部署：编译 → 上传 → 提审"""
        app = self.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return False
        
        print("\n" + "=" * 70)
        print(f"  🚀 全自动部署: {app['name']}")
        print("=" * 70)
        
        # 1. 先检查项目
        print("\n📋 步骤1: 检查项目...")
        report = self.check_project(app_id)
        if report.has_errors:
            print("❌ 项目存在错误，无法部署")
            self.print_report(report)
            return False
        print("✅ 项目检查通过")
        
        # 2. 准备版本信息
        if not version:
            version = datetime.now().strftime("%Y.%m.%d.%H%M")
        if not desc:
            desc = f"自动部署 - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        print(f"\n📦 步骤2: 上传代码...")
        print(f"   版本: {version}")
        print(f"   描述: {desc}")
        
        # 3. 上传代码
        success = self._upload_code(app, version, desc)
        if not success:
            print("❌ 代码上传失败")
            return False
        print("✅ 代码上传成功")
        
        # 4. 提交审核
        if submit_audit:
            print(f"\n📝 步骤3: 提交审核...")
            cert_status = app.get("certification", {}).get("status", "unknown")
            
            if cert_status != "verified":
                print(f"⚠️ 认证状态: {cert_status}")
                print("   未认证的小程序无法提交审核")
                print("   代码已上传到开发版，请在微信后台手动提交")
                print("\n" + "-" * 40)
                print("👉 下一步操作:")
                print("   1. 完成企业认证")
                print("   2. 在微信后台提交审核")
                print("   3. 审核通过后发布上线")
            else:
                # 尝试通过API提交审核
                audit_success = self._submit_audit_via_api(app)
                if audit_success:
                    print("✅ 审核已提交")
                else:
                    print("⚠️ 自动提审失败，请在微信后台手动提交")
                    print("   登录: https://mp.weixin.qq.com/")
                    print("   版本管理 → 开发版本 → 提交审核")
        
        # 5. 生成报告
        print(f"\n📊 步骤4: 生成报告...")
        report_file = self.save_report(report)
        print(f"✅ 报告已保存: {report_file}")
        
        print("\n" + "=" * 70)
        print("  🎉 部署完成！")
        print("=" * 70)
        
        return True
    
    def _upload_code(self, app: Dict, version: str, desc: str) -> bool:
        """上传代码（优先使用CLI）"""
        project_path = app["project_path"]
        
        # 方法1：使用微信开发者工具CLI
        if os.path.exists(self.WX_CLI):
            cmd = [
                self.WX_CLI, "upload",
                "--project", project_path,
                "--version", version,
                "--desc", desc
            ]
            success, output = self._run_cmd(cmd, timeout=120)
            if success:
                return True
            print(f"   CLI上传失败: {output[:200]}")
        
        # 方法2：使用miniprogram-ci
        if self._check_tool("miniprogram-ci") and app.get("private_key_path"):
            cmd = [
                "miniprogram-ci", "upload",
                "--pp", project_path,
                "--pkp", app["private_key_path"],
                "--appid", app["appid"],
                "--uv", version,
                "-r", "1",
                "--desc", desc
            ]
            success, output = self._run_cmd(cmd, timeout=120)
            if success:
                return True
            print(f"   miniprogram-ci上传失败: {output[:200]}")
        
        return False
    
    def _submit_audit_via_api(self, app: Dict) -> bool:
        """通过API提交审核（需要access_token）"""
        # 这里需要access_token才能调用API
        # 目前返回False，提示用户手动提交
        return False
    
    # ==================== 汇总报告 ====================
    
    def generate_summary_report(self):
        """生成所有小程序的汇总报告"""
        apps = self.config.get("apps", [])
        
        if not apps:
            print("📭 暂无配置的小程序")
            return
        
        print("\n" + "=" * 80)
        print("  📊 小程序管理汇总报告")
        print(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        all_reports = []
        
        for app in apps:
            report = self.check_project(app["id"])
            if report:
                all_reports.append(report)
        
        # 打印汇总表格
        print("\n┌" + "─" * 78 + "┐")
        print(f"│ {'小程序名称':<20} │ {'AppID':<25} │ {'状态':<10} │ {'可发布':<8} │")
        print("├" + "─" * 78 + "┤")
        
        for report in all_reports:
            status = "✅ 正常" if not report.has_errors else "❌ 错误"
            can_release = "✅" if report.summary.get("can_release") else "❌"
            print(f"│ {report.app_name:<20} │ {report.appid:<25} │ {status:<10} │ {can_release:<8} │")
        
        print("└" + "─" * 78 + "┘")
        
        # 统计
        total = len(all_reports)
        ok_count = sum(1 for r in all_reports if not r.has_errors and not r.has_warnings)
        warn_count = sum(1 for r in all_reports if r.has_warnings and not r.has_errors)
        error_count = sum(1 for r in all_reports if r.has_errors)
        can_release = sum(1 for r in all_reports if r.summary.get("can_release"))
        
        print(f"\n📈 统计:")
        print(f"   总计: {total} 个小程序")
        print(f"   正常: {ok_count} | 警告: {warn_count} | 错误: {error_count}")
        print(f"   可发布: {can_release} 个")
        
        # 问题清单
        issues = []
        for report in all_reports:
            for check in report.checks:
                if check.status == "error":
                    issues.append((report.app_name, check.name, check.message, check.fix_hint))
        
        if issues:
            print(f"\n⚠️ 问题清单 ({len(issues)} 个):")
            print("-" * 60)
            for app_name, check_name, message, hint in issues:
                print(f"  [{app_name}] {check_name}: {message}")
                if hint:
                    print(f"      💡 {hint}")
        else:
            print(f"\n✅ 所有小程序状态正常")
        
        # 待办事项
        print(f"\n📋 待办事项:")
        for report in all_reports:
            cert_status = "unknown"
            for check in report.checks:
                if check.name == "企业认证":
                    if "审核中" in check.message:
                        cert_status = "pending"
                    elif "已完成" in check.message:
                        cert_status = "verified"
                    elif "未认证" in check.message:
                        cert_status = "unknown"
                    break
            
            if cert_status == "pending":
                print(f"   ⏳ {report.app_name}: 等待认证审核结果")
            elif cert_status == "unknown":
                print(f"   📝 {report.app_name}: 需要完成企业认证")
        
        print("\n" + "=" * 80)
        
        # 保存汇总报告
        summary_file = REPORT_DIR / f"summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        summary_data = {
            "generated_at": datetime.now().isoformat(),
            "total_apps": total,
            "summary": {
                "ok": ok_count,
                "warning": warn_count,
                "error": error_count,
                "can_release": can_release
            },
            "apps": [asdict(r) for r in all_reports]
        }
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary_data, f, ensure_ascii=False, indent=2)
        
        print(f"📁 报告已保存: {summary_file}\n")


def main():
    parser = argparse.ArgumentParser(
        description="小程序全能管理工具 v3.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python mp_full.py report                生成汇总报告
  python mp_full.py check soul-party      检查项目问题
  python mp_full.py auto soul-party       全自动部署（上传+提审）
  python mp_full.py auto soul-party -v 1.0.13 -d "修复问题"

流程说明:
  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │  检查   │ → │  编译   │ → │  上传   │ → │  提审   │ → │  发布   │
  │ check   │    │  build  │    │ upload  │    │  audit  │    │ release │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘

工具整合:
  • 微信开发者工具CLI - 本地编译上传
  • miniprogram-ci    - npm官方CI工具
  • 开放平台API       - 审核/发布/认证
"""
    )
    
    subparsers = parser.add_subparsers(dest="command", help="子命令")
    
    # report
    subparsers.add_parser("report", help="生成汇总报告")
    
    # check
    check_parser = subparsers.add_parser("check", help="检查项目问题")
    check_parser.add_argument("app_id", help="小程序ID")
    
    # auto
    auto_parser = subparsers.add_parser("auto", help="全自动部署")
    auto_parser.add_argument("app_id", help="小程序ID")
    auto_parser.add_argument("-v", "--version", help="版本号")
    auto_parser.add_argument("-d", "--desc", help="版本描述")
    auto_parser.add_argument("--no-audit", action="store_true", help="不提交审核")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = MiniProgramManager()
    
    if args.command == "report":
        manager.generate_summary_report()
    
    elif args.command == "check":
        report = manager.check_project(args.app_id)
        if report:
            manager.print_report(report)
            manager.save_report(report)
    
    elif args.command == "auto":
        manager.auto_deploy(
            args.app_id,
            version=args.version,
            desc=args.desc,
            submit_audit=not args.no_audit
        )


if __name__ == "__main__":
    main()
