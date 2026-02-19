#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 CVM 镜像与云硬盘快照 → 备份到 CKB NAS

- 拉取账号下全部自定义镜像、快照的元数据并写入 NAS
- 可选：从 COS 同步已导出的镜像文件到 NAS（需先在控制台将镜像导出到 COS）
- 备份目录容量上限（默认 1000GB），超过则发邮件告警且不再拉取新文件

凭证：环境变量 或 00_账号与API索引.md § 腾讯云
配置：同目录 config.env（参考 config.example.env）
依赖：tencentcloud-sdk-python-common, tencentcloud-sdk-python-cvm, tencentcloud-sdk-python-cbs
"""
from __future__ import annotations

import json
import os
import re
import smtplib
import sys
from datetime import datetime
from email.mime.text import MIMEText
from pathlib import Path

# 多地域
CVM_REGIONS = [
    "ap-guangzhou", "ap-shanghai", "ap-beijing", "ap-chengdu",
    "ap-nanjing", "ap-shenzhen-fsi", "ap-hongkong",
]
CBS_REGIONS = CVM_REGIONS  # 云硬盘与 CVM 地域一致

def _find_karuo_ai_root():
    d = Path(__file__).resolve().parent
    for _ in range(6):
        if d.name == "卡若AI" or (
            (d / "运营中枢").is_dir() and (d / "01_卡资（金）").is_dir()
        ):
            return d
        d = d.parent
    return None

def _read_tencent_creds():
    sid = os.environ.get("TENCENTCLOUD_SECRET_ID")
    skey = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if sid and skey:
        return sid, skey
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    idx = root / "运营中枢" / "工作台" / "00_账号与API索引.md"
    if not idx.is_file():
        return None, None
    text = idx.read_text(encoding="utf-8")
    in_tencent = False
    sid = skey = None
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tencent = True
            continue
        if in_tencent and line.strip().startswith("###"):
            break
        if not in_tencent:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m and m.group(1).strip().startswith("AKID"):
            sid = m.group(1).strip()
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            skey = m.group(1).strip()
    return sid, skey

def _load_config():
    script_dir = Path(__file__).resolve().parent
    env_file = script_dir / "config.env"
    if not env_file.is_file():
        env_file = script_dir / "config.example.env"
    config = {
        "NAS_BACKUP_ROOT": os.environ.get("NAS_BACKUP_ROOT", ""),
        "SIZE_LIMIT_GB": int(os.environ.get("SIZE_LIMIT_GB", "1000")),
        "ALERT_EMAIL_TO": os.environ.get("ALERT_EMAIL_TO", ""),
        "SMTP_HOST": os.environ.get("SMTP_HOST", "smtp.qq.com"),
        "SMTP_PORT": int(os.environ.get("SMTP_PORT", "465")),
        "SMTP_USER": os.environ.get("SMTP_USER", ""),
        "SMTP_PASSWORD": os.environ.get("SMTP_PASSWORD", ""),
    }
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k in config:
                if k == "SIZE_LIMIT_GB":
                    try:
                        config[k] = int(v)
                    except ValueError:
                        pass
                elif k == "SMTP_PORT":
                    try:
                        config[k] = int(v)
                    except ValueError:
                        pass
                else:
                    config[k] = v
    for k, v in os.environ.items():
        if k in config and v:
            if k == "SIZE_LIMIT_GB":
                try:
                    config[k] = int(v)
                except ValueError:
                    pass
            elif k == "SMTP_PORT":
                try:
                    config[k] = int(v)
                except ValueError:
                    pass
            else:
                config[k] = v
    return config

def _dir_size_gb(path: Path) -> float:
    """目录占用大小（GB）"""
    if not path.exists() or not path.is_dir():
        return 0.0
    total = 0
    try:
        for entry in path.rglob("*"):
            if entry.is_file():
                try:
                    total += entry.stat().st_size
                except OSError:
                    pass
    except OSError:
        pass
    return total / (1024 ** 3)

def _send_alert_email(config: dict, used_gb: float, limit_gb: int):
    to_addr = config.get("ALERT_EMAIL_TO") or ""
    if not to_addr:
        print("[告警] 未配置 ALERT_EMAIL_TO，跳过发邮件。")
        return
    user = config.get("SMTP_USER") or ""
    password = config.get("SMTP_PASSWORD") or ""
    if not user or not password:
        print("[告警] 未配置 SMTP_USER/SMTP_PASSWORD，跳过发邮件。")
        return
    subject = "[腾讯云备份] CKB NAS 备份目录已超过 %d GB 限制" % limit_gb
    body = (
        "腾讯云镜像/快照备份目录容量超限告警\n\n"
        "备份根目录：%s\n"
        "当前占用：%.2f GB\n"
        "设定上限：%d GB\n\n"
        "请清理旧备份或扩大限额，否则将不再拉取新镜像/快照文件。\n"
        "时间：%s\n"
    ) % (
        config.get("NAS_BACKUP_ROOT", ""),
        used_gb,
        limit_gb,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to_addr
    try:
        with smtplib.SMTP_SSL(config.get("SMTP_HOST", "smtp.qq.com"), config.get("SMTP_PORT", 465)) as s:
            s.login(user, password)
            s.sendmail(user, [to_addr], msg.as_string())
        print("[告警] 已发送邮件至 %s" % to_addr)
    except Exception as e:
        print("[告警] 发邮件失败: %s" % e)

def main():
    config = _load_config()
    nas_root = config.get("NAS_BACKUP_ROOT") or ""
    if not nas_root:
        print("请配置 NAS_BACKUP_ROOT（CKB NAS 挂载后的备份根目录）")
        print("参考 config.example.env，复制为 config.env 并填写。")
        return 1
    nas_root = Path(nas_root)
    limit_gb = config.get("SIZE_LIMIT_GB", 1000)

    # 检查当前占用
    used_gb = _dir_size_gb(nas_root)
    if used_gb >= limit_gb:
        print("备份目录已超过 %d GB（当前 %.2f GB），发送告警邮件并跳过拉取新文件。" % (limit_gb, used_gb))
        _send_alert_email(config, used_gb, limit_gb)
        # 仍可更新元数据（不占大空间）
    else:
        print("备份目录当前 %.2f GB / %d GB" % (used_gb, limit_gb))

    sid, skey = _read_tencent_creds()
    if not sid or not skey:
        print("未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md）")
        return 1

    try:
        from tencentcloud.common import credential
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
        from tencentcloud.cbs.v20170312 import cbs_client, models as cbs_models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-cbs")
        return 1

    cred = credential.Credential(sid, skey)
    meta_dir = nas_root / "meta"
    meta_dir.mkdir(parents=True, exist_ok=True)

    # 1) 拉取自定义镜像（多地域）
    all_images = []
    for region in CVM_REGIONS:
        try:
            client = cvm_client.CvmClient(cred, region)
            req = cvm_models.DescribeImagesRequest()
            req.Limit = 100
            req.Offset = 0
            # 只拉自定义镜像
            while True:
                resp = client.DescribeImages(req)
                items = getattr(resp, "ImageSet", None) or []
                for img in items:
                    if getattr(img, "ImageType", "") == "PRIVATE_IMAGE":
                        all_images.append({
                            "Region": region,
                            "ImageId": getattr(img, "ImageId", ""),
                            "ImageName": getattr(img, "ImageName", ""),
                            "ImageSize": getattr(img, "ImageSize", 0),
                            "CreatedTime": getattr(img, "CreatedTime", ""),
                            "ImageState": getattr(img, "ImageState", ""),
                        })
                if len(items) < req.Limit:
                    break
                req.Offset += req.Limit
        except Exception as e:
            print("[%s] 镜像列表: %s" % (region, e))

    images_file = meta_dir / ("images_%s.json" % datetime.now().strftime("%Y%m%d_%H%M%S"))
    images_file.write_text(json.dumps(all_images, ensure_ascii=False, indent=2), encoding="utf-8")
    # 保留最新一份为 images_latest.json
    (meta_dir / "images_latest.json").write_text(
        json.dumps(all_images, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("镜像元数据已写入 %s（共 %d 个自定义镜像）" % (images_file, len(all_images)))

    # 2) 拉取快照（多地域）
    all_snapshots = []
    for region in CBS_REGIONS:
        try:
            client = cbs_client.CbsClient(cred, region)
            req = cbs_models.DescribeSnapshotsRequest()
            req.Limit = 100
            req.Offset = 0
            while True:
                resp = client.DescribeSnapshots(req)
                items = getattr(resp, "SnapshotSet", None) or []
                for sn in items:
                    all_snapshots.append({
                        "Region": region,
                        "SnapshotId": getattr(sn, "SnapshotId", ""),
                        "SnapshotName": getattr(sn, "SnapshotName", ""),
                        "DiskSize": getattr(sn, "DiskSize", 0),
                        "CreatedTime": getattr(sn, "CreatedTime", ""),
                        "SnapshotState": getattr(sn, "SnapshotState", ""),
                    })
                if len(items) < req.Limit:
                    break
                req.Offset += req.Limit
        except Exception as e:
            print("[%s] 快照列表: %s" % (region, e))

    snapshots_file = meta_dir / ("snapshots_%s.json" % datetime.now().strftime("%Y%m%d_%H%M%S"))
    snapshots_file.write_text(json.dumps(all_snapshots, ensure_ascii=False, indent=2), encoding="utf-8")
    (meta_dir / "snapshots_latest.json").write_text(
        json.dumps(all_snapshots, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("快照元数据已写入 %s（共 %d 个快照）" % (snapshots_file, len(all_snapshots)))

    # 3) 若配置了 COS，可从 COS 同步镜像文件到 NAS（需 tencentcloud-sdk-python-cos）
    cos_bucket = os.environ.get("COS_BUCKET") or ""
    if not cos_bucket and os.path.isfile(Path(__file__).parent / "config.env"):
        for line in (Path(__file__).parent / "config.env").read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("COS_BUCKET=") and "=" in line:
                cos_bucket = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if cos_bucket and used_gb < limit_gb:
        try:
            from tencentcloud.cos.cos_client import CosS3Client
            from tencentcloud.cos.cos_config import CosConfig
            region = os.environ.get("COS_REGION", "ap-guangzhou")
            cos_prefix = os.environ.get("COS_PREFIX", "export_images")
            config_cos = CosConfig(Region=region, SecretId=sid, SecretKey=skey)
            client_cos = CosS3Client(config_cos)
            # 列举并下载（示例：只列举，实际下载需根据 COS 返回的 Key 逐条 download）
            # 此处简化：仅提示用户可在此扩展 COS 下载逻辑
            print("[COS] 已配置 COS_BUCKET，如需自动从 COS 拉取镜像文件，请在脚本中扩展 COS 下载逻辑。")
        except ImportError:
            print("[COS] 未安装 cos-python-sdk-v5，跳过从 COS 同步。")
    else:
        print("镜像文件需在腾讯云控制台「导出镜像」到 COS 后，再通过 COS 同步或 coscmd 下载到 NAS。")

    # 若开始时未超限但结束时超限（例如本轮有下载），再发一次告警
    used_gb_after = _dir_size_gb(nas_root)
    if used_gb_after >= limit_gb and used_gb < limit_gb:
        _send_alert_email(config, used_gb_after, limit_gb)

    return 0

if __name__ == "__main__":
    sys.exit(main())
