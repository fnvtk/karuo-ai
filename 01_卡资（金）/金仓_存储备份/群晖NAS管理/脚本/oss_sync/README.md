# 阿里云 OSS → 公司 NAS 每日定时同步

## 概述

将阿里云 OSS Bucket `kr-cypd`（华北2/北京）的全部数据每日自动同步到公司 NAS（Synology DS1825+ / 192.168.1.201），并生成费用报告。

## 架构

```
┌──────────────────┐     ossutil sync      ┌───────────────────────────┐
│  阿里云 OSS      │ ──────────────────────▶ │  Synology DS1825+         │
│  kr-cypd (北京)  │     每天 03:00         │  /volume1/backup/         │
│                  │                        │  oss_kr-cypd/             │
└──────────────────┘                        └───────────────────────────┘
```

## NAS 目录结构

```
/volume1/backup/oss_kr-cypd/
├── data/                     ← OSS 文件同步到这里（按原始目录结构）
│   ├── test/
│   │   └── 2026-03/
│   ├── images/
│   └── ...
├── _snapshots/               ← 每日快照（硬链接，不额外占空间）
│   ├── 2026-03-15/
│   ├── 2026-03-16/
│   └── ...
├── _overwritten/             ← 被覆盖文件的备份
├── _logs/                    ← 同步日志 + 每日报告
│   ├── sync_2026-03-15.log
│   ├── report_2026-03-15.md
│   └── cron.log
└── _cost_reports/            ← OSS 月度费用报告
    └── cost_2026-03.json
```

## 凭证信息

| 项目 | 值 |
|:---|:---|
| AccessKeyId | `LTAI5t7ixwYZBqYc4bFpe5tc` |
| AccessKeySecret | `Bm1JAMT5U2oyaKLqhbtIPojNQWd5YA` |
| RAM 用户 | gameshop |
| OSS Endpoint | `oss-cn-beijing.aliyuncs.com` |
| Bucket | kr-cypd |

## 费用参考

| 月份 | OSS 费用 | 备注 |
|:---|:---|:---|
| 2026-02 | ¥10.32 | 已结算 |
| 2026-03（至15日） | ¥4.83 | 进行中 |

费用主要来自：存储费用 + 请求次数 + 外网流出流量。每日同步走内网不产生流量费（需 NAS 与 OSS 在同一地域，或走公网则产生流出费）。

## 一键部署

```bash
cd "01_卡资（金）/金仓_存储备份/群晖NAS管理/脚本/oss_sync"
bash deploy_to_nas.sh
```

该脚本会自动：
1. 在 NAS 上创建目录结构
2. 上传同步脚本
3. 安装 ossutil（如未安装）
4. 配置 crontab 定时任务（每天 03:00）

## 手动执行同步（测试）

SSH 登录 NAS 后：

```bash
bash /volume1/backup/oss_kr-cypd/oss_sync_to_nas.sh
```

## 同步策略

- **增量同步**：ossutil sync 只下载新增/修改的文件，不重复下载
- **每日快照**：用硬链接创建当日快照，不额外占磁盘空间
- **被覆盖备份**：远端文件更新时，旧版本自动备份到 `_overwritten/`
- **分类统计**：按 OSS 顶级目录分类统计文件数量和大小
- **费用监控**：每次同步后查询当月 OSS 费用并写入报告

## 备选方案：DSM 任务计划器

如果 NAS 不支持 crontab，可在 DSM 控制面板 → 任务计划 中手动添加：

1. 控制面板 → 任务计划 → 新增 → 计划的任务 → 用户定义的脚本
2. 常规：任务名称「OSS 每日同步」，用户「root」
3. 计划：每天 03:00
4. 任务设置 → 用户定义的脚本：

```bash
/bin/bash /volume1/backup/oss_kr-cypd/oss_sync_to_nas.sh
```

5. 勾选「将运行详情以电子邮件发送」（可选）
