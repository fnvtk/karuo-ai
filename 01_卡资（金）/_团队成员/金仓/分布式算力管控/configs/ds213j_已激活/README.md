# DS213j 网心云已激活配置包

> **提取日期**：2026-02-14 01:24
> **设备**：Synology DS213j（armv7l, Marvell Armada-370）
> **内核**：Linux 3.2.40
> **wxedge版本**：v2.4.3
> **设备SN**：CTWX09Y9Q2ILI4PV
> **激活码**：CTWXErqmwU3DEPVLzAbvRNV5
> **账号**：15880802661

## 文件说明

### 配置文件（cfg/）
| 文件 | 作用 |
|:---|:---|
| `wxedge.yaml` | wxedge主配置（dispatch地址、storage路径、日志、miner参数） |
| `cntr.toml` | containerd配置（socket路径、runtime参数） |

### 激活数据（storage/）
| 文件 | 作用 | 重要性 |
|:---|:---|:---|
| `wxnode` | **节点身份密钥**（加密），唯一标识设备 | 极高 |
| `.onething_data/.nst` | 节点状态（加密） | 高 |
| `.onething_data/.taskinfo` | 当前任务信息（加密） | 中 |
| `.onething_data/.info.Storage` | 存储映射（JSON），记录task分配 | 中 |
| `.onething_data/base_info/*/xyclound_baseinfo` | 云端连接参数（ISP、磁盘类型等） | 中 |

### 启动脚本（scripts/）
| 文件 | 作用 |
|:---|:---|
| `chroot_start.sh` | chroot启动脚本（mount+containerd+wxedge） |
| `rc.d_wxedge.sh` | 群晖自启动脚本（放到`/usr/local/etc/rc.d/`） |

## 复用方法

### 方法A：同设备恢复（推荐）
如果DS213j需要重装/恢复，直接用这个配置包：
1. 上传rootfs到NAS `/volume1/wxedge/rootfs/`（用之前的`wxedge_fs.tar`）
2. 将本包的`storage/`整体复制到NAS `/volume1/wxedge/storage/`
3. 将本包的`cfg/`覆盖到rootfs的 `xyapp/miner.plugin-wxedge.ipk/cfg/`
4. 运行`chroot_start.sh`即可，设备身份自动恢复，**无需重新绑定**

### 方法B：新设备部署
新设备需要新身份，不能直接复制wxnode：
1. 用同样的rootfs + chroot方案部署
2. 不复制`storage/wxnode`和`.onething_data`（让wxedge自动生成新身份）
3. 首次启动后需要手机App绑定新设备

### 方法C：Docker部署（新设备有Docker时）
```bash
docker run -d --name wxedge --restart=always --net=host --privileged \
    -v /path/to/storage:/storage \
    onething1/wxedge:latest
```

## 当前运行任务
| 任务 | ID | 磁盘限制 | 状态 |
|:---|:---|:---|:---|
| CG*.0 | 9725958ddce917081e4b26e15e86238c_0 | 10GB | 运行中 |
| CZ.0 | d3d4be7af781df626fc7f4da646d8ee2_0 | 50GB | 运行中 |

## 硬件规格
| 项目 | 值 |
|:---|:---|
| 型号 | Synology DS213j |
| CPU | Marvell PJ4Bv7 (Armada-370), 1197 BogoMIPS |
| 架构 | armv7l (32位ARM) |
| 内存 | 497MB（可用约300MB） |
| 存储 | 5.4TB总量, 2.0TB可用 (64%) |
| 文件系统 | ext4 |
| 网络 | 千兆以太网 (eth0) |
| MAC | 00:11:32:30:4c:4f |
| IP | 192.168.110.29/24 |
| 内核 | Linux 3.2.40 |
| 特殊 | 无Docker、无cgroup支持 |
