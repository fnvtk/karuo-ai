# 腾讯云镜像/快照备份到 CKB NAS

将腾讯云 CVM 自定义镜像、云硬盘快照的元数据与（可选）镜像文件备份到 **CKB NAS**（192.168.1.201），并限制备份目录总容量为 **1000GB**，超过时发邮件告警。

## 功能

- **镜像**：拉取账号下全部地域的**自定义镜像**列表，写入 NAS 的 `meta/images_*.json`、`meta/images_latest.json`
- **快照**：拉取全部地域的**云硬盘快照**列表，写入 NAS 的 `meta/snapshots_*.json`、`meta/snapshots_latest.json`
- **容量限制**：备份根目录总大小超过 **1000GB**（可配置）时：
  - 发送告警邮件到配置的邮箱
  - 不再拉取新的镜像文件（仅更新元数据）
- **镜像文件落盘**：腾讯云不提供镜像/快照“直接下载”。需在控制台将**自定义镜像导出到 COS**，再通过 COS 工具（如 coscmd）或本脚本扩展逻辑，从 COS 下载到 NAS。

## 前置条件

1. **CKB NAS 已挂载到本机**  
   - CKB NAS 内网 IP：`192.168.1.201`（见群晖 NAS 管理 SKILL）  
   - 在 Mac：访达 → 前往 → 连接服务器 → `smb://192.168.1.201/共享名`，挂载后得到如 `/Volumes/ckb_backup`  
   - 本脚本使用的目录为挂载点下的子目录，如 `/Volumes/ckb_backup/tencent_cloud_backup`

2. **腾讯云凭证**  
   - 环境变量 `TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`，或  
   - 在 `运营中枢/工作台/00_账号与API索引.md` 的「腾讯云」段落填写 SecretId/SecretKey

3. **告警邮件（可选）**  
   - 使用 QQ 邮箱时需在 QQ 邮箱 → 设置 → 账户 → 开启 SMTP 并生成**授权码**，在 `config.env` 中填 `SMTP_PASSWORD=授权码`

## 配置

1. 复制配置示例并编辑：
   ```bash
   cd "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云镜像快照备份到CKB_NAS"
   cp config.example.env config.env
   ```
2. 编辑 `config.env`：
   - **NAS_BACKUP_ROOT**：NAS 上备份根目录（必须已挂载），如 `/Volumes/ckb_backup/tencent_cloud_backup`
   - **SIZE_LIMIT_GB**：容量上限（GB），默认 `1000`
   - **ALERT_EMAIL_TO**：超限告警收件人
   - **SMTP_*****：发信用（QQ 邮箱用授权码）

## 运行

```bash
# 建议使用项目根下已有 venv（含 tencentcloud-sdk）
cd /Users/karuo/Documents/个人/卡若AI
. .venv_tencent/bin/activate   # 或 服务器管理/scripts 下的 venv
pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-cbs

python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云镜像快照备份到CKB_NAS/tencent_image_snapshot_backup_to_nas.py"
```

## 定时拉取（有新镜像/快照即同步元数据）

- 建议用 cron 或 launchd 定期执行（如每天 2:00），这样**新产生的镜像/快照**会在下次执行时被拉取并写入 NAS 的 `meta/`。
- 示例 crontab（每天 2:00）：
  ```bash
  0 2 * * * /Users/karuo/Documents/个人/卡若AI/.venv_tencent/bin/python3 /Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云镜像快照备份到CKB_NAS/tencent_image_snapshot_backup_to_nas.py >> /tmp/tencent_backup_nas.log 2>&1
  ```
- 若备份目录超过 1000GB，脚本会发邮件提醒，且不会从 COS 拉取新镜像文件（仅更新元数据）。

## 镜像文件如何落到 NAS（需先导出到 COS）

1. 腾讯云控制台 → 云服务器 → 镜像 → 自定义镜像 → 选择镜像 → **导出镜像** → 选择同地域 COS 桶与前缀。
2. 导出完成后，在 COS 桶中会得到镜像文件（如 `.qcow2` / `.vhd`）。
3. 将 COS 中的文件下载到 NAS：
   - 方式 A：安装 [coscmd](https://cloud.tencent.com/document/product/436/10976)，配置后执行 `coscmd download -r bucket://prefix /path/on/nas`
   - 方式 B：在本脚本中扩展「从 COS 列举并下载」逻辑（需配置 `COS_BUCKET`、`COS_REGION`、`COS_PREFIX`）。

## 快照说明

- 腾讯云**云硬盘快照**不提供“下载到本地”的接口，仅支持云内恢复、从快照创建云盘/镜像。
- 本脚本将快照**元数据**（ID、名称、大小、创建时间等）同步到 NAS，便于审计与清单管理。
- 若需将某快照“备份成文件”，需：用该快照创建自定义镜像 → 再按上文将镜像导出到 COS → 从 COS 下载到 NAS。

## 文件结构（NAS 备份根目录下）

```
tencent_cloud_backup/
├── meta/
│   ├── images_20260219_020000.json
│   ├── images_latest.json
│   ├── snapshots_20260219_020000.json
│   └── snapshots_latest.json
└── （可选）images/     # 若从 COS 下载镜像文件，可放于此
```

## 相关

- 服务器管理 SKILL：`01_卡资（金）/金仓_存储备份/服务器管理/SKILL.md`
- 群晖/CKB NAS：`01_卡资（金）/金仓_存储备份/群晖NAS管理/SKILL.md`
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
