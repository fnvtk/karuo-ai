# 家里 NAS（DS213j）整体分析报表

> **生成时间**：2026-02  
> **数据来源**：端口扫描、现有文档、分布式算力管控 Skill、双 NAS 区分文档  
> **说明**：SSH/DSM API 当前未连接，部分为历史记录与文档汇总

---

## 一、设备概览

| 项目 | 值 |
|:-----|:---|
| **型号** | Synology DS213j (synology_armada370_213j) |
| **主机名** | DiskStation / DiskStation.local |
| **内网 IP** | 192.168.110.29 |
| **外网域名** | opennas2.quwanzhi.com（frpc 穿透） |
| **MAC 地址** | 00:11:32:30:4c:4f（Synology OUI） |
| **用途** | 家庭存储、Time Machine 备份、PCDN（网心云） |

---

## 二、硬件与系统

| 项目 | 规格 |
|:-----|:-----|
| **CPU** | Marvell Armada370（ARMv7） |
| **架构** | armv7l（32 位 ARM） |
| **内存** | 497MB |
| **内核** | Linux 3.2.40 |
| **文件系统** | ext4，RAID（md2） |
| **Docker** | ❌ 不支持（内核 3.x 无 cgroup） |

---

## 三、存储空间

| 指标 | 值 | 备注 |
|:-----|:---|:-----|
| **总容量** | 5.4TB | 双盘 RAID |
| **已用** | 约 3.4TB～4.6TB | 不同时间点记录 |
| **可用** | 约 885GB～2.0TB | 视时段与共享不同 |
| **Time Machine 共享** | 2.18TB 可用 | 系统设置中「共享」卷 |
| **空间占比** | 约 64%～84% | 建议保持 100GB+ 余量 |

---

## 四、网络与端口

### 4.1 当前开放端口（本次扫描）

| 端口 | 服务 | 状态 |
|:-----|:-----|:-----|
| 22 | SSH | 开放 |
| 80 | HTTP | 开放 |
| 139 | NetBIOS | 开放 |
| 443 | HTTPS | 开放 |
| 445 | SMB | 开放 |
| 5000 | DSM HTTP | 开放 |
| 5001 | DSM HTTPS | 开放 |

### 4.2 内网穿透（frpc → opennas2.quwanzhi.com）

| 服务 | 外网端口 | 外网访问 |
|:-----|:---------|:---------|
| SSH | 22202 | `ssh admin@opennas2.quwanzhi.com -p 22202` |
| DSM | 5002 / 80 | http://opennas2.quwanzhi.com:5002 或 :80 |
| SMB | 4452 | smb://opennas2.quwanzhi.com:4452/共享（需在 frpc 中配置） |
| FTP / rsync / MariaDB 等 | 见双 NAS 文档 | — |

---

## 五、已部署服务

| 服务 | 说明 | 状态 |
|:-----|:-----|:-----|
| **DSM** | 群晖管理界面 | ✅ 运行中 |
| **SMB/AFP** | 文件共享、Time Machine | ✅ 运行中 |
| **frpc** | 内网穿透（opennas2） | ✅ 配置在 crontab 检活 |
| **网心云 wxedge** | PCDN（chroot 部署） | ✅ 运行中，SN: CTWX09Y9Q2ILI4PV |

---

## 六、资源与负载（历史记录）

| 项目 | 状态 |
|:-----|:-----|
| **CPU 负载** | 曾出现 udevd 异常，已处理，当前约 1.6 |
| **内存** | 497MB 总量，约 67MB～170MB 可用（视 PCDN 运行情况） |
| **磁盘** | 已清理 core dump，空间从 100% 恢复到约 84% |

---

## 七、访问方式

| 场景 | 地址 |
|:-----|:-----|
| **内网 DSM** | http://192.168.110.29:5000 |
| **外网 DSM** | http://opennas2.quwanzhi.com:5002 |
| **Time Machine** | 共享 - DiskStation.local（或 smb://192.168.110.29/共享） |
| **外网 1TB 挂载** | smb://opennas2.quwanzhi.com:4452/共享（需先添加 frpc SMB） |

---

## 八、风险与建议

| 类型 | 说明 |
|:-----|:-----|
| **硬件老化** | DS213j 为较旧型号，ARM32 + 497MB，不适合再增重型服务 |
| **无 Docker** | 无法运行容器，扩展能力有限 |
| **外网 SSH 不稳定** | 外网 22202 有时不可达，与家庭网络、frpc 有关 |
| **空间** | 定期清理，保持 10% 以上可用空间 |
| **建议** | 维持当前用途（存储 + Time Machine + PCDN），避免新增高负载服务 |
