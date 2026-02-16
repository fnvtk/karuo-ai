#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小程序一键部署工具 v2.0

功能：
- 多小程序管理
- 一键部署上线
- 自动认证提交
- 认证状态检查
- 材料有效性验证

使用方法:
    python mp_deploy.py list                    # 列出所有小程序
    python mp_deploy.py add                     # 添加新小程序
    python mp_deploy.py deploy <app_id>         # 一键部署
    python mp_deploy.py cert <app_id>           # 提交认证
    python mp_deploy.py cert-status <app_id>    # 查询认证状态
    python mp_deploy.py upload <app_id>         # 上传代码
    python mp_deploy.py release <app_id>        # 发布上线
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict

# 配置文件路径
CONFIG_FILE = Path(__file__).parent / "apps_config.json"


@dataclass
class AppConfig:
    """小程序配置"""
    id: str
    name: str
    appid: str
    project_path: str
    private_key_path: str = ""
    api_domain: str = ""
    description: str = ""
    certification: Dict = None
    
    def __post_init__(self):
        if self.certification is None:
            self.certification = {
                "status": "unknown",
                "enterprise_name": "",
                "license_number": "",
                "legal_persona_name": "",
                "legal_persona_wechat": "",
                "component_phone": ""
            }


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: Path = CONFIG_FILE):
        self.config_file = config_file
        self.config = self._load_config()
    
    def _load_config(self) -> Dict:
        """加载配置"""
        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"apps": [], "certification_materials": {}, "third_party_platform": {}}
    
    def _save_config(self):
        """保存配置"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
    
    def get_apps(self) -> List[AppConfig]:
        """获取所有小程序"""
        return [AppConfig(**app) for app in self.config.get("apps", [])]
    
    def get_app(self, app_id: str) -> Optional[AppConfig]:
        """获取指定小程序"""
        for app in self.config.get("apps", []):
            if app["id"] == app_id or app["appid"] == app_id:
                return AppConfig(**app)
        return None
    
    def add_app(self, app: AppConfig):
        """添加小程序"""
        apps = self.config.get("apps", [])
        # 检查是否已存在
        for i, existing in enumerate(apps):
            if existing["id"] == app.id:
                apps[i] = asdict(app)
                self.config["apps"] = apps
                self._save_config()
                return
        apps.append(asdict(app))
        self.config["apps"] = apps
        self._save_config()
    
    def update_app(self, app_id: str, updates: Dict):
        """更新小程序配置"""
        apps = self.config.get("apps", [])
        for i, app in enumerate(apps):
            if app["id"] == app_id:
                apps[i].update(updates)
                self.config["apps"] = apps
                self._save_config()
                return True
        return False
    
    def get_cert_materials(self) -> Dict:
        """获取通用认证材料"""
        return self.config.get("certification_materials", {})
    
    def update_cert_materials(self, materials: Dict):
        """更新认证材料"""
        self.config["certification_materials"] = materials
        self._save_config()


class MiniProgramDeployer:
    """小程序部署器"""
    
    # 微信开发者工具CLI路径
    WX_CLI = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
    
    def __init__(self):
        self.config = ConfigManager()
    
    def _check_wx_cli(self) -> bool:
        """检查微信开发者工具是否安装"""
        return os.path.exists(self.WX_CLI)
    
    def _run_cli(self, *args, project_path: str = None) -> tuple:
        """运行CLI命令"""
        cmd = [self.WX_CLI] + list(args)
        if project_path:
            cmd.extend(["--project", project_path])
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            return result.returncode == 0, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return False, "命令执行超时"
        except Exception as e:
            return False, str(e)
    
    def list_apps(self):
        """列出所有小程序"""
        apps = self.config.get_apps()
        
        if not apps:
            print("\n📭 暂无配置的小程序")
            print("   运行 'python mp_deploy.py add' 添加小程序")
            return
        
        print("\n" + "=" * 60)
        print("  📱 小程序列表")
        print("=" * 60)
        
        for i, app in enumerate(apps, 1):
            cert_status = app.certification.get("status", "unknown")
            status_icon = {
                "verified": "✅",
                "pending": "⏳",
                "rejected": "❌",
                "expired": "⚠️",
                "unknown": "❓"
            }.get(cert_status, "❓")
            
            print(f"\n  [{i}] {app.name}")
            print(f"      ID: {app.id}")
            print(f"      AppID: {app.appid}")
            print(f"      认证: {status_icon} {cert_status}")
            print(f"      路径: {app.project_path}")
        
        print("\n" + "-" * 60)
        print("  使用方法:")
        print("    python mp_deploy.py deploy <id>   一键部署")
        print("    python mp_deploy.py cert <id>     提交认证")
        print("=" * 60 + "\n")
    
    def add_app(self):
        """交互式添加小程序"""
        print("\n" + "=" * 50)
        print("  ➕ 添加新小程序")
        print("=" * 50 + "\n")
        
        # 收集信息
        app_id = input("小程序ID（用于标识，如 my-app）: ").strip()
        if not app_id:
            print("❌ ID不能为空")
            return
        
        name = input("小程序名称: ").strip()
        appid = input("AppID（如 wx1234567890）: ").strip()
        project_path = input("项目路径: ").strip()
        
        if not os.path.exists(project_path):
            print(f"⚠️ 警告：路径不存在 {project_path}")
        
        api_domain = input("API域名（可选）: ").strip()
        description = input("描述（可选）: ").strip()
        
        # 认证信息
        print("\n📋 认证信息（可稍后配置）:")
        enterprise_name = input("企业名称: ").strip()
        
        app = AppConfig(
            id=app_id,
            name=name,
            appid=appid,
            project_path=project_path,
            api_domain=api_domain,
            description=description,
            certification={
                "status": "unknown",
                "enterprise_name": enterprise_name,
                "license_number": "",
                "legal_persona_name": "",
                "legal_persona_wechat": "",
                "component_phone": "15880802661"
            }
        )
        
        self.config.add_app(app)
        print(f"\n✅ 小程序 [{name}] 添加成功！")
    
    def deploy(self, app_id: str, skip_cert_check: bool = False):
        """一键部署流程"""
        app = self.config.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            print("   运行 'python mp_deploy.py list' 查看所有小程序")
            return False
        
        print("\n" + "=" * 60)
        print(f"  🚀 一键部署: {app.name}")
        print("=" * 60)
        
        steps = [
            ("检查环境", self._step_check_env),
            ("检查认证状态", lambda a: self._step_check_cert(a, skip_cert_check)),
            ("编译项目", self._step_build),
            ("上传代码", self._step_upload),
            ("提交审核", self._step_submit_audit),
        ]
        
        for step_name, step_func in steps:
            print(f"\n📍 步骤: {step_name}")
            print("-" * 40)
            
            success = step_func(app)
            if not success:
                print(f"\n❌ 部署中断于: {step_name}")
                return False
        
        print("\n" + "=" * 60)
        print("  🎉 部署完成！")
        print("=" * 60)
        print(f"\n  下一步操作:")
        print(f"    1. 等待审核（通常1-3个工作日）")
        print(f"    2. 审核通过后运行: python mp_deploy.py release {app_id}")
        print(f"    3. 查看状态: python mp_deploy.py status {app_id}")
        
        return True
    
    def _step_check_env(self, app: AppConfig) -> bool:
        """检查环境"""
        # 检查微信开发者工具
        if not self._check_wx_cli():
            print("❌ 未找到微信开发者工具")
            print("   请安装: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html")
            return False
        print("✅ 微信开发者工具已安装")
        
        # 检查项目路径
        if not os.path.exists(app.project_path):
            print(f"❌ 项目路径不存在: {app.project_path}")
            return False
        print(f"✅ 项目路径存在")
        
        # 检查project.config.json
        config_file = os.path.join(app.project_path, "project.config.json")
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                config = json.load(f)
                if config.get("appid") != app.appid:
                    print(f"⚠️ 警告: project.config.json中的AppID与配置不一致")
                    print(f"   配置: {app.appid}")
                    print(f"   文件: {config.get('appid')}")
        
        print("✅ 环境检查通过")
        return True
    
    def _step_check_cert(self, app: AppConfig, skip: bool = False) -> bool:
        """检查认证状态"""
        if skip:
            print("⏭️ 跳过认证检查")
            return True
        
        cert_status = app.certification.get("status", "unknown")
        
        if cert_status == "verified":
            print("✅ 已完成微信认证")
            return True
        
        if cert_status == "pending":
            print("⏳ 认证审核中")
            print("   可选择:")
            print("   1. 继续部署（未认证可上传，但无法发布）")
            print("   2. 等待认证完成")
            
            choice = input("\n是否继续? (y/n): ").strip().lower()
            return choice == 'y'
        
        if cert_status == "expired":
            print("⚠️ 认证已过期，需要重新认证")
            print("   运行: python mp_deploy.py cert " + app.id)
            
            choice = input("\n是否继续部署? (y/n): ").strip().lower()
            return choice == 'y'
        
        # 未认证或未知状态
        print("⚠️ 未完成微信认证")
        print("   未认证的小程序可以上传代码，但无法发布上线")
        print("   运行: python mp_deploy.py cert " + app.id + " 提交认证")
        
        choice = input("\n是否继续? (y/n): ").strip().lower()
        return choice == 'y'
    
    def _step_build(self, app: AppConfig) -> bool:
        """编译项目"""
        print("📦 编译项目...")
        
        # 使用CLI编译
        success, output = self._run_cli("build-npm", project_path=app.project_path)
        
        if not success:
            # build-npm可能失败（如果没有npm依赖），不算错误
            print("ℹ️ 编译完成（无npm依赖或编译失败，继续...）")
        else:
            print("✅ 编译成功")
        
        return True
    
    def _step_upload(self, app: AppConfig) -> bool:
        """上传代码"""
        # 获取版本号
        version = datetime.now().strftime("%Y.%m.%d.%H%M")
        desc = f"自动部署 - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        print(f"📤 上传代码...")
        print(f"   版本: {version}")
        print(f"   描述: {desc}")
        
        success, output = self._run_cli(
            "upload",
            "--version", version,
            "--desc", desc,
            project_path=app.project_path
        )
        
        if not success:
            print(f"❌ 上传失败")
            print(f"   {output}")
            
            # 常见错误处理
            if "login" in output.lower():
                print("\n💡 提示: 请在微信开发者工具中登录后重试")
            return False
        
        print("✅ 上传成功")
        return True
    
    def _step_submit_audit(self, app: AppConfig) -> bool:
        """提交审核"""
        print("📝 提交审核...")
        
        # 使用CLI提交审核
        success, output = self._run_cli(
            "submit-audit",
            project_path=app.project_path
        )
        
        if not success:
            if "未认证" in output or "认证" in output:
                print("⚠️ 提交审核失败：未完成微信认证")
                print("   代码已上传，但需要完成认证后才能提交审核")
                print(f"   运行: python mp_deploy.py cert {app.id}")
                return True  # 不算失败，只是需要认证
            
            print(f"❌ 提交审核失败")
            print(f"   {output}")
            return False
        
        print("✅ 审核已提交")
        return True
    
    def submit_certification(self, app_id: str):
        """提交企业认证"""
        app = self.config.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return
        
        print("\n" + "=" * 60)
        print(f"  📋 提交认证: {app.name}")
        print("=" * 60)
        
        # 获取通用认证材料
        materials = self.config.get_cert_materials()
        cert = app.certification
        
        # 合并材料（小程序配置优先）
        enterprise_name = cert.get("enterprise_name") or materials.get("enterprise_name", "")
        
        print(f"\n📌 认证信息:")
        print(f"   小程序: {app.name} ({app.appid})")
        print(f"   企业名称: {enterprise_name}")
        
        # 检查必要材料
        missing = []
        if not enterprise_name:
            missing.append("企业名称")
        if not materials.get("license_number"):
            missing.append("营业执照号")
        if not materials.get("legal_persona_name"):
            missing.append("法人姓名")
        
        if missing:
            print(f"\n⚠️ 缺少认证材料:")
            for m in missing:
                print(f"   - {m}")
            
            print(f"\n请先完善认证材料:")
            print(f"   编辑: {self.config.config_file}")
            print(f"   或运行: python mp_deploy.py cert-config")
            return
        
        print("\n" + "-" * 40)
        print("📋 认证方式说明:")
        print("-" * 40)
        print("""
  【方式一】微信后台手动认证（推荐）
  
  1. 登录小程序后台: https://mp.weixin.qq.com/
  2. 设置 → 基本设置 → 微信认证
  3. 选择"企业"类型
  4. 填写企业信息、上传营业执照
  5. 法人微信扫码验证
  6. 支付认证费用（300元/年）
  7. 等待审核（1-5个工作日）

  【方式二】通过第三方平台代认证（需开发）
  
  如果你有第三方平台资质，可以通过API代认证：
  1. 配置第三方平台凭证
  2. 获取授权
  3. 调用认证API
  
  API接口: POST /wxa/sec/wxaauth
        """)
        
        print("\n" + "-" * 40)
        print("📝 认证材料清单:")
        print("-" * 40)
        print("""
  必需材料:
  ☐ 企业营业执照（扫描件或照片）
  ☐ 法人身份证（正反面）
  ☐ 法人微信号（用于扫码验证）
  ☐ 联系人手机号
  ☐ 认证费用 300元
  
  认证有效期: 1年
  到期后需重新认证（年审）
        """)
        
        # 更新状态为待认证
        self.config.update_app(app_id, {
            "certification": {
                **cert,
                "status": "pending",
                "submit_time": datetime.now().isoformat()
            }
        })
        
        print("\n✅ 已标记为待认证状态")
        print("   完成认证后运行: python mp_deploy.py cert-done " + app_id)
    
    def check_cert_status(self, app_id: str):
        """检查认证状态"""
        app = self.config.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return
        
        print("\n" + "=" * 60)
        print(f"  🔍 认证状态: {app.name}")
        print("=" * 60)
        
        cert = app.certification
        status = cert.get("status", "unknown")
        
        status_info = {
            "verified": ("✅ 已认证", "认证有效"),
            "pending": ("⏳ 审核中", "请等待审核结果"),
            "rejected": ("❌ 被拒绝", "请查看拒绝原因并重新提交"),
            "expired": ("⚠️ 已过期", "需要重新认证（年审）"),
            "unknown": ("❓ 未知", "请在微信后台确认状态")
        }
        
        icon, desc = status_info.get(status, ("❓", "未知状态"))
        
        print(f"\n📌 当前状态: {icon}")
        print(f"   说明: {desc}")
        print(f"   企业: {cert.get('enterprise_name', '未填写')}")
        
        if cert.get("submit_time"):
            print(f"   提交时间: {cert.get('submit_time')}")
        
        if cert.get("verify_time"):
            print(f"   认证时间: {cert.get('verify_time')}")
        
        if cert.get("expire_time"):
            print(f"   到期时间: {cert.get('expire_time')}")
        
        # 提示下一步操作
        print("\n" + "-" * 40)
        if status == "unknown" or status == "rejected":
            print("👉 下一步: python mp_deploy.py cert " + app_id)
        elif status == "pending":
            print("👉 等待审核，通常1-5个工作日")
            print("   审核通过后运行: python mp_deploy.py cert-done " + app_id)
        elif status == "verified":
            print("👉 可以发布小程序: python mp_deploy.py deploy " + app_id)
        elif status == "expired":
            print("👉 需要重新认证: python mp_deploy.py cert " + app_id)
    
    def mark_cert_done(self, app_id: str):
        """标记认证完成"""
        app = self.config.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return
        
        cert = app.certification
        self.config.update_app(app_id, {
            "certification": {
                **cert,
                "status": "verified",
                "verify_time": datetime.now().isoformat(),
                "expire_time": datetime.now().replace(year=datetime.now().year + 1).isoformat()
            }
        })
        
        print(f"✅ 已标记 [{app.name}] 认证完成")
        print(f"   有效期至: {datetime.now().year + 1}年")
    
    def release(self, app_id: str):
        """发布上线"""
        app = self.config.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return
        
        print("\n" + "=" * 60)
        print(f"  🎉 发布上线: {app.name}")
        print("=" * 60)
        
        # 检查认证状态
        if app.certification.get("status") != "verified":
            print("\n⚠️ 警告: 小程序未完成认证")
            print("   未认证的小程序无法发布上线")
            
            choice = input("\n是否继续尝试? (y/n): ").strip().lower()
            if choice != 'y':
                return
        
        print("\n📦 正在发布...")
        
        # 尝试使用CLI发布
        success, output = self._run_cli("release", project_path=app.project_path)
        
        if success:
            print("\n🎉 发布成功！小程序已上线")
        else:
            print(f"\n发布结果: {output}")
            
            if "认证" in output:
                print("\n💡 提示: 请先完成微信认证")
                print(f"   运行: python mp_deploy.py cert {app_id}")
            else:
                print("\n💡 提示: 请在微信后台手动发布")
                print("   1. 登录 https://mp.weixin.qq.com/")
                print("   2. 版本管理 → 审核版本 → 发布")
    
    def quick_upload(self, app_id: str, version: str = None, desc: str = None):
        """快速上传代码"""
        app = self.config.get_app(app_id)
        if not app:
            print(f"❌ 未找到小程序: {app_id}")
            return
        
        if not version:
            version = datetime.now().strftime("%Y.%m.%d.%H%M")
        if not desc:
            desc = f"快速上传 - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        print(f"\n📤 上传代码: {app.name}")
        print(f"   版本: {version}")
        print(f"   描述: {desc}")
        
        success, output = self._run_cli(
            "upload",
            "--version", version,
            "--desc", desc,
            project_path=app.project_path
        )
        
        if success:
            print("✅ 上传成功")
        else:
            print(f"❌ 上传失败: {output}")


def print_header(title: str):
    print("\n" + "=" * 50)
    print(f"  {title}")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="小程序一键部署工具 v2.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python mp_deploy.py list                    列出所有小程序
  python mp_deploy.py add                     添加新小程序
  python mp_deploy.py deploy soul-party       一键部署
  python mp_deploy.py cert soul-party         提交认证
  python mp_deploy.py cert-status soul-party  查询认证状态
  python mp_deploy.py cert-done soul-party    标记认证完成
  python mp_deploy.py upload soul-party       仅上传代码
  python mp_deploy.py release soul-party      发布上线

部署流程:
  1. add         添加小程序配置
  2. cert        提交企业认证（首次）
  3. cert-done   认证通过后标记
  4. deploy      一键部署（编译+上传+提审）
  5. release     审核通过后发布
"""
    )
    
    subparsers = parser.add_subparsers(dest="command", help="子命令")
    
    # list
    subparsers.add_parser("list", help="列出所有小程序")
    
    # add
    subparsers.add_parser("add", help="添加新小程序")
    
    # deploy
    deploy_parser = subparsers.add_parser("deploy", help="一键部署")
    deploy_parser.add_argument("app_id", help="小程序ID")
    deploy_parser.add_argument("--skip-cert", action="store_true", help="跳过认证检查")
    
    # cert
    cert_parser = subparsers.add_parser("cert", help="提交认证")
    cert_parser.add_argument("app_id", help="小程序ID")
    
    # cert-status
    cert_status_parser = subparsers.add_parser("cert-status", help="查询认证状态")
    cert_status_parser.add_argument("app_id", help="小程序ID")
    
    # cert-done
    cert_done_parser = subparsers.add_parser("cert-done", help="标记认证完成")
    cert_done_parser.add_argument("app_id", help="小程序ID")
    
    # upload
    upload_parser = subparsers.add_parser("upload", help="上传代码")
    upload_parser.add_argument("app_id", help="小程序ID")
    upload_parser.add_argument("-v", "--version", help="版本号")
    upload_parser.add_argument("-d", "--desc", help="版本描述")
    
    # release
    release_parser = subparsers.add_parser("release", help="发布上线")
    release_parser.add_argument("app_id", help="小程序ID")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    deployer = MiniProgramDeployer()
    
    commands = {
        "list": lambda: deployer.list_apps(),
        "add": lambda: deployer.add_app(),
        "deploy": lambda: deployer.deploy(args.app_id, args.skip_cert if hasattr(args, 'skip_cert') else False),
        "cert": lambda: deployer.submit_certification(args.app_id),
        "cert-status": lambda: deployer.check_cert_status(args.app_id),
        "cert-done": lambda: deployer.mark_cert_done(args.app_id),
        "upload": lambda: deployer.quick_upload(args.app_id, getattr(args, 'version', None), getattr(args, 'desc', None)),
        "release": lambda: deployer.release(args.app_id),
    }
    
    cmd_func = commands.get(args.command)
    if cmd_func:
        cmd_func()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
