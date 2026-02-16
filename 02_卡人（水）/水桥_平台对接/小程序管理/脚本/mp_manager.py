#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信小程序管理命令行工具

使用方法:
    python mp_manager.py status     # 查看小程序状态
    python mp_manager.py audit      # 查看审核状态
    python mp_manager.py release    # 发布上线
    python mp_manager.py qrcode     # 生成小程序码
    python mp_manager.py domain     # 查看/配置域名
    python mp_manager.py privacy    # 配置隐私协议
    python mp_manager.py data       # 查看数据分析
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# 添加当前目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from mp_api import MiniProgramAPI, APIError, create_api_from_env


def print_header(title: str):
    """打印标题"""
    print("\n" + "=" * 50)
    print(f"  {title}")
    print("=" * 50)


def print_success(message: str):
    """打印成功信息"""
    print(f"✅ {message}")


def print_error(message: str):
    """打印错误信息"""
    print(f"❌ {message}")


def print_info(message: str):
    """打印信息"""
    print(f"ℹ️  {message}")


def cmd_status(api: MiniProgramAPI, args):
    """查看小程序状态"""
    print_header("小程序基础信息")
    
    try:
        info = api.get_basic_info()
        print(f"\n📱 AppID: {info.appid}")
        print(f"📝 名称: {info.nickname}")
        print(f"📄 简介: {info.signature}")
        print(f"🏢 主体: {info.principal_name}")
        print(f"✓ 认证状态: {'已认证' if info.realname_status == 1 else '未认证'}")
        
        if info.head_image_url:
            print(f"🖼️  头像: {info.head_image_url}")
        
        # 获取类目
        print("\n📂 已设置类目:")
        categories = api.get_category()
        if categories:
            for cat in categories:
                print(f"   - {cat.get('first_class', '')} > {cat.get('second_class', '')}")
        else:
            print("   (未设置类目)")
        
    except APIError as e:
        print_error(f"获取信息失败: {e}")


def cmd_audit(api: MiniProgramAPI, args):
    """查看审核状态"""
    print_header("审核状态")
    
    try:
        status = api.get_latest_audit_status()
        print(f"\n🔢 审核单ID: {status.auditid}")
        print(f"📊 状态: {status.status_text}")
        
        if status.reason:
            print(f"\n❗ 拒绝原因:")
            print(f"   {status.reason}")
        
        if status.screenshot:
            print(f"\n📸 问题截图: {status.screenshot}")
        
        if status.status == 0:
            print("\n👉 下一步: 运行 'python mp_manager.py release' 发布上线")
        elif status.status == 1:
            print("\n👉 请根据拒绝原因修改后重新提交审核")
        elif status.status == 2:
            print("\n👉 审核中，请耐心等待（通常1-3个工作日）")
            print("   可运行 'python mp_manager.py audit' 再次查询")
        
    except APIError as e:
        print_error(f"获取审核状态失败: {e}")


def cmd_submit(api: MiniProgramAPI, args):
    """提交审核"""
    print_header("提交审核")
    
    version_desc = args.desc or input("请输入版本说明: ").strip()
    if not version_desc:
        print_error("版本说明不能为空")
        return
    
    try:
        # 获取页面列表
        pages = api.get_page()
        if not pages:
            print_error("未找到页面，请先上传代码")
            return
        
        print(f"\n📄 检测到 {len(pages)} 个页面:")
        for p in pages[:5]:
            print(f"   - {p}")
        if len(pages) > 5:
            print(f"   ... 还有 {len(pages) - 5} 个")
        
        # 确认提交
        confirm = input("\n确认提交审核? (y/n): ").strip().lower()
        if confirm != 'y':
            print_info("已取消")
            return
        
        auditid = api.submit_audit(version_desc=version_desc)
        print_success(f"审核已提交，审核单ID: {auditid}")
        print("\n👉 运行 'python mp_manager.py audit' 查询审核状态")
        
    except APIError as e:
        print_error(f"提交审核失败: {e}")


def cmd_release(api: MiniProgramAPI, args):
    """发布上线"""
    print_header("发布上线")
    
    try:
        # 先检查审核状态
        status = api.get_latest_audit_status()
        if status.status != 0:
            print_error(f"当前审核状态: {status.status_text}")
            print_info("只有审核通过的版本才能发布")
            return
        
        print(f"📊 审核状态: {status.status_text}")
        
        # 确认发布
        confirm = input("\n确认发布上线? (y/n): ").strip().lower()
        if confirm != 'y':
            print_info("已取消")
            return
        
        api.release()
        print_success("🎉 发布成功！小程序已上线")
        
    except APIError as e:
        print_error(f"发布失败: {e}")


def cmd_revert(api: MiniProgramAPI, args):
    """版本回退"""
    print_header("版本回退")
    
    try:
        # 获取可回退版本
        history = api.get_revert_history()
        if not history:
            print_info("没有可回退的版本")
            return
        
        print("\n📜 可回退版本:")
        for v in history:
            print(f"   - {v.get('user_version', '?')}: {v.get('user_desc', '')}")
        
        # 确认回退
        confirm = input("\n确认回退到上一版本? (y/n): ").strip().lower()
        if confirm != 'y':
            print_info("已取消")
            return
        
        api.revert_code_release()
        print_success("版本回退成功")
        
    except APIError as e:
        print_error(f"版本回退失败: {e}")


def cmd_qrcode(api: MiniProgramAPI, args):
    """生成小程序码"""
    print_header("生成小程序码")
    
    # 场景选择
    print("\n选择类型:")
    print("  1. 体验版二维码")
    print("  2. 小程序码（有限制，每个path最多10万个）")
    print("  3. 无限小程序码（推荐）")
    
    choice = args.type or input("\n请选择 (1/2/3): ").strip()
    
    output_file = args.output or f"qrcode_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    
    try:
        if choice == "1":
            # 体验版二维码
            path = args.path or input("页面路径 (默认首页): ").strip() or None
            data = api.get_qrcode(path)
            
        elif choice == "2":
            # 小程序码
            path = args.path or input("页面路径: ").strip()
            if not path:
                print_error("页面路径不能为空")
                return
            data = api.get_wxacode(path)
            
        elif choice == "3":
            # 无限小程序码
            scene = args.scene or input("场景值 (最长32字符): ").strip()
            if not scene:
                print_error("场景值不能为空")
                return
            page = args.path or input("页面路径 (需已发布): ").strip() or None
            data = api.get_wxacode_unlimit(scene, page)
            
        else:
            print_error("无效选择")
            return
        
        # 保存文件
        with open(output_file, "wb") as f:
            f.write(data)
        
        print_success(f"小程序码已保存: {output_file}")
        
        # 尝试打开
        if sys.platform == "darwin":
            os.system(f'open "{output_file}"')
        
    except APIError as e:
        print_error(f"生成小程序码失败: {e}")


def cmd_domain(api: MiniProgramAPI, args):
    """查看/配置域名"""
    print_header("域名配置")
    
    try:
        # 获取当前配置
        domains = api.get_domain()
        webview_domains = api.get_webview_domain()
        
        print("\n🌐 服务器域名:")
        print(f"   request: {', '.join(domains.get('requestdomain', [])) or '(无)'}")
        print(f"   wsrequest: {', '.join(domains.get('wsrequestdomain', [])) or '(无)'}")
        print(f"   upload: {', '.join(domains.get('uploaddomain', [])) or '(无)'}")
        print(f"   download: {', '.join(domains.get('downloaddomain', [])) or '(无)'}")
        
        print(f"\n🔗 业务域名:")
        print(f"   webview: {', '.join(webview_domains) or '(无)'}")
        
        # 是否要配置
        if args.set_request:
            print(f"\n配置 request 域名: {args.set_request}")
            api.set_domain(requestdomain=[args.set_request])
            print_success("域名配置成功")
        
    except APIError as e:
        print_error(f"域名配置失败: {e}")


def cmd_privacy(api: MiniProgramAPI, args):
    """配置隐私协议"""
    print_header("隐私协议配置")
    
    try:
        # 获取当前配置
        settings = api.get_privacy_setting()
        
        print("\n📋 当前隐私设置:")
        setting_list = settings.get("setting_list", [])
        if setting_list:
            for s in setting_list:
                print(f"   - {s.get('privacy_key', '?')}: {s.get('privacy_text', '')}")
        else:
            print("   (未配置)")
        
        owner = settings.get("owner_setting", {})
        if owner:
            print(f"\n📧 联系方式:")
            if owner.get("contact_email"):
                print(f"   邮箱: {owner['contact_email']}")
            if owner.get("contact_phone"):
                print(f"   电话: {owner['contact_phone']}")
        
        # 快速配置
        if args.quick:
            print("\n⚡ 快速配置常用隐私项...")
            
            default_settings = [
                {"privacy_key": "UserInfo", "privacy_text": "用于展示您的头像和昵称"},
                {"privacy_key": "Location", "privacy_text": "用于获取您的位置信息以推荐附近服务"},
                {"privacy_key": "PhoneNumber", "privacy_text": "用于登录验证和订单通知"},
            ]
            
            api.set_privacy_setting(
                setting_list=default_settings,
                contact_email=args.email or "contact@example.com",
                contact_phone=args.phone or "15880802661"
            )
            print_success("隐私协议配置成功")
        
    except APIError as e:
        print_error(f"隐私协议配置失败: {e}")


def cmd_data(api: MiniProgramAPI, args):
    """查看数据分析"""
    print_header("数据分析")
    
    # 默认查询最近7天
    end_date = datetime.now().strftime("%Y%m%d")
    begin_date = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")
    
    if args.begin:
        begin_date = args.begin
    if args.end:
        end_date = args.end
    
    try:
        print(f"\n📊 访问趋势 ({begin_date} ~ {end_date}):")
        
        data = api.get_daily_visit_trend(begin_date, end_date)
        if not data:
            print("   (暂无数据)")
            return
        
        # 统计汇总
        total_pv = sum(d.get("visit_pv", 0) for d in data)
        total_uv = sum(d.get("visit_uv", 0) for d in data)
        total_new = sum(d.get("visit_uv_new", 0) for d in data)
        
        print(f"\n📈 汇总数据:")
        print(f"   总访问次数: {total_pv:,}")
        print(f"   总访问人数: {total_uv:,}")
        print(f"   新用户数: {total_new:,}")
        
        print(f"\n📅 每日明细:")
        for d in data[-7:]:  # 只显示最近7天
            date = d.get("ref_date", "?")
            pv = d.get("visit_pv", 0)
            uv = d.get("visit_uv", 0)
            stay = d.get("stay_time_uv", 0)
            print(f"   {date}: PV={pv}, UV={uv}, 人均停留={stay:.1f}秒")
        
    except APIError as e:
        print_error(f"获取数据失败: {e}")


def cmd_quota(api: MiniProgramAPI, args):
    """查看API配额"""
    print_header("API配额")
    
    common_apis = [
        "/wxa/getwxacode",
        "/wxa/getwxacodeunlimit",
        "/wxa/genwxashortlink",
        "/wxa/submit_audit",
        "/cgi-bin/message/subscribe/send"
    ]
    
    try:
        for cgi_path in common_apis:
            try:
                quota = api.get_api_quota(cgi_path)
                daily_limit = quota.get("daily_limit", 0)
                used = quota.get("used", 0)
                remain = quota.get("remain", 0)
                
                print(f"\n📌 {cgi_path}")
                print(f"   每日限额: {daily_limit:,}")
                print(f"   已使用: {used:,}")
                print(f"   剩余: {remain:,}")
            except APIError:
                pass
        
    except APIError as e:
        print_error(f"获取配额失败: {e}")


def cmd_cli(api: MiniProgramAPI, args):
    """使用微信开发者工具CLI"""
    print_header("微信开发者工具CLI")
    
    cli_path = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
    project_path = args.project or os.getenv("MINIPROGRAM_PATH", "")
    
    if not project_path:
        project_path = input("请输入小程序项目路径: ").strip()
    
    if not os.path.exists(project_path):
        print_error(f"项目路径不存在: {project_path}")
        return
    
    if not os.path.exists(cli_path):
        print_error("未找到微信开发者工具，请先安装")
        return
    
    print(f"\n📂 项目路径: {project_path}")
    print("\n选择操作:")
    print("  1. 打开项目")
    print("  2. 预览（生成二维码）")
    print("  3. 上传代码")
    print("  4. 编译")
    
    choice = input("\n请选择: ").strip()
    
    if choice == "1":
        os.system(f'"{cli_path}" -o "{project_path}"')
        print_success("项目已打开")
    
    elif choice == "2":
        output = f"{project_path}/preview.png"
        os.system(f'"{cli_path}" preview --project "{project_path}" --qr-format image --qr-output "{output}"')
        if os.path.exists(output):
            print_success(f"预览二维码已生成: {output}")
            os.system(f'open "{output}"')
        else:
            print_error("生成失败，请检查开发者工具是否已登录")
    
    elif choice == "3":
        version = input("版本号 (如 1.0.0): ").strip()
        desc = input("版本说明: ").strip()
        os.system(f'"{cli_path}" upload --project "{project_path}" --version "{version}" --desc "{desc}"')
        print_success("代码上传完成")
    
    elif choice == "4":
        os.system(f'"{cli_path}" build-npm --project "{project_path}"')
        print_success("编译完成")
    
    else:
        print_error("无效选择")


def main():
    parser = argparse.ArgumentParser(
        description="微信小程序管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python mp_manager.py status           查看小程序状态
  python mp_manager.py audit            查看审核状态
  python mp_manager.py submit -d "修复xxx问题"  提交审核
  python mp_manager.py release          发布上线
  python mp_manager.py qrcode -t 3 -s "id=123"  生成无限小程序码
  python mp_manager.py domain           查看域名配置
  python mp_manager.py privacy --quick  快速配置隐私协议
  python mp_manager.py data             查看数据分析
  python mp_manager.py cli              使用开发者工具CLI
"""
    )
    
    subparsers = parser.add_subparsers(dest="command", help="子命令")
    
    # status
    subparsers.add_parser("status", help="查看小程序状态")
    
    # audit
    subparsers.add_parser("audit", help="查看审核状态")
    
    # submit
    submit_parser = subparsers.add_parser("submit", help="提交审核")
    submit_parser.add_argument("-d", "--desc", help="版本说明")
    
    # release
    subparsers.add_parser("release", help="发布上线")
    
    # revert
    subparsers.add_parser("revert", help="版本回退")
    
    # qrcode
    qr_parser = subparsers.add_parser("qrcode", help="生成小程序码")
    qr_parser.add_argument("-t", "--type", choices=["1", "2", "3"], help="类型：1=体验版，2=小程序码，3=无限小程序码")
    qr_parser.add_argument("-p", "--path", help="页面路径")
    qr_parser.add_argument("-s", "--scene", help="场景值（类型3时使用）")
    qr_parser.add_argument("-o", "--output", help="输出文件名")
    
    # domain
    domain_parser = subparsers.add_parser("domain", help="查看/配置域名")
    domain_parser.add_argument("--set-request", help="设置request域名")
    
    # privacy
    privacy_parser = subparsers.add_parser("privacy", help="配置隐私协议")
    privacy_parser.add_argument("--quick", action="store_true", help="快速配置常用隐私项")
    privacy_parser.add_argument("--email", help="联系邮箱")
    privacy_parser.add_argument("--phone", help="联系电话")
    
    # data
    data_parser = subparsers.add_parser("data", help="查看数据分析")
    data_parser.add_argument("--begin", help="开始日期 YYYYMMDD")
    data_parser.add_argument("--end", help="结束日期 YYYYMMDD")
    
    # quota
    subparsers.add_parser("quota", help="查看API配额")
    
    # cli
    cli_parser = subparsers.add_parser("cli", help="使用微信开发者工具CLI")
    cli_parser.add_argument("-p", "--project", help="小程序项目路径")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 创建API实例
    try:
        api = create_api_from_env()
    except Exception as e:
        print_error(f"初始化API失败: {e}")
        print_info("请检查 .env 文件中的配置")
        return
    
    # 执行命令
    commands = {
        "status": cmd_status,
        "audit": cmd_audit,
        "submit": cmd_submit,
        "release": cmd_release,
        "revert": cmd_revert,
        "qrcode": cmd_qrcode,
        "domain": cmd_domain,
        "privacy": cmd_privacy,
        "data": cmd_data,
        "quota": cmd_quota,
        "cli": cmd_cli,
    }
    
    cmd_func = commands.get(args.command)
    if cmd_func:
        try:
            cmd_func(api, args)
        finally:
            api.close()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
