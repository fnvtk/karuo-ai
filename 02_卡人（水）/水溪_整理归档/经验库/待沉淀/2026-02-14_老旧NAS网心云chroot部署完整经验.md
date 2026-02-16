# 老旧NAS（无Docker/无cgroup）网心云chroot完整部署经验

> **日期**：2026-02-14
> **设备**：Synology DS213j (armv7l, 内核3.2.40, 497MB RAM)
> **分类**：运维经验 / PCDN部署
> **难度**：高（涉及chroot、文件系统挂载、二进制兼容性、containerd、cgroup绕过）
> **价值**：适用于所有不支持Docker的ARM32老设备
> **最终状态**：3个任务稳定运行（CB*.0 + CG*.0 + CG*.1），guluplugin收益已注册

---

## 零、最简部署链路（结论先行）

> **完整踩坑过程见后续章节。本节是最终方案的最短路径。**

### 0.1 所需组件（全部已验证，打包后直接用）

| 组件 | 大小 | 来源 | 作用 |
|:---|:---|:---|:---|
| wxedge_fs.tar | 130MB | Docker镜像导出 | 完整rootfs文件系统 |
| 已补丁wxedged | — | 原始二进制+Python补丁 | /proc路径重定向 |
| 已补丁containerd-shim-runc-v2 | — | 原始二进制+ARM指令补丁 | prctl bypass + _shimexe_ |
| fake_runc v6 | 5KB | shell脚本 | 替代runc（支持gulu/pcdn/thunder） |
| cntr.toml | 2KB | 手动配置 | 禁用overlayfs，用native snapshotter |
| fake_stat | 3KB | 生成 | 22核CPU伪装 |
| musl库(Alpine v3.12) | 1MB | Alpine包 | guluplugin的C++运行库 |
| chroot_start.sh | 5KB | 本文档 | 主启动脚本（含所有修复） |

### 0.2 部署步骤（3步，10分钟）

```bash
# 1. 上传（2分钟）
sshpass -p 'zhiqun1984' scp -O -c aes256-cbc wxedge_bundle.tar admin@NAS_IP:/volume1/wxedge/

# 2. 解压（3分钟）
ssh -c aes256-cbc admin@NAS_IP 'echo "zhiqun1984" | sudo -S sh -c "
  cd /volume1/wxedge && tar xf wxedge_bundle.tar
  tar xf wxedge_fs.tar -C rootfs
"'

# 3. 启动（等3分钟后验证）
ssh -c aes256-cbc admin@NAS_IP 'echo "zhiqun1984" | sudo -S nohup /volume1/wxedge/chroot_start.sh &'
curl -s http://NAS_IP:18888/docker/dashboard  # 有run_tasks即成功
```

### 0.3 核心技术决策（为什么这样做）

| 决策 | 原因 | 备选方案及其失败原因 |
|:---|:---|:---|
| chroot而非Docker | 内核3.2无cgroup/namespace | Docker需要cgroup+namespace |
| 二进制补丁而非重编译 | 无Go交叉编译环境 | 源码不公开，无法重编译 |
| fake_runc而非真runc | 内核3.2无namespace/pivot_root | runc所有操作都依赖namespace |
| native snapshotter | 内核3.2无overlayfs | 唯一兼容的snapshotter |
| Alpine v3.12 musl库 | musl 1.1.x无time64符号 | 3.14+的musl 1.2+有time64不兼容 |
| 不挂sysfs | sysfs会遮盖手动创建的cgroup目录 | 挂sysfs后cgroup panic |

---

## 一、问题背景

DS213j 是2013年的群晖NAS，特殊限制：
- **内核3.2.40**：无cgroup支持、无overlayfs
- **无Docker套件**：群晖不为此型号提供Container Manager
- **armv7l架构**：32位ARM，Marvell Armada-370处理器
- **497MB内存**：系统自身占用后剩余约300MB
- **老旧SSH**：只支持 `aes256-cbc` 等旧cipher

**目标**：在此设备上运行网心云(wxedge)赚取PCDN收益。

---

## 二、尝试路径与失败记录

### 2.1 直接运行wxedged二进制（失败）

**思路**：wxedged是Go静态编译的ARM32 ELF，理论上可直接运行

**结果**：程序能启动、HTTP 18888端口能监听、WebUI能访问，**但**：
- 页面显示"初始化失败 - 请挂载storage路径"
- 根因1：storage需要是**挂载点**而非普通目录（wxedge内部检测）
- 根因2：**依赖containerd**（container-service/task-service需要`/tmp/cntr.sock`）
- 根因3：containerd加载超时后，wxedge日志输出`load fail services`后**退出**

### 2.2 用bind mount解决storage（部分成功）

```bash
sudo mount --bind /volume1/wxedge/storage /storage
```
- storage-service 加载成功了
- 但 container-service 仍然失败（无containerd）
- wxedge最终仍退出

### 2.3 上传containerd到NAS直接运行（失败）

**发现**：Docker镜像中的containerd是**动态链接**的
```
$ /volume1/wxedge/bin/containerd
sh: /volume1/wxedge/bin/containerd: No such file or directory
```
文件存在但报"No such file or directory" → 缺少动态链接器(`ld-linux.so`)

**官方静态版**：containerd官方只提供arm64静态版，**没有arm32/v7静态版**

### 2.4 Python假socket模拟containerd（失败）

用Python创建UNIX socket监听`/tmp/cntr.sock`：
- wxedge连上了socket，但gRPC协议握手失败
- wxedge仍然退出

### 2.5 chroot整个Docker镜像rootfs（成功！）

**最终方案**：把Docker镜像的完整文件系统解压到NAS上，用`chroot`进入后运行containerd+wxedge

---

## 三、最终成功方案：chroot部署

### 3.1 前置准备（在Mac/PC上）

```bash
# 拉取ARM32版本的Docker镜像
docker pull --platform linux/arm/v7 onething1/wxedge:latest

# 创建临时容器并导出文件系统
docker create --platform linux/arm/v7 --name wxedge_tmp onething1/wxedge:latest
docker export wxedge_tmp -o wxedge_fs.tar
docker rm wxedge_tmp
# wxedge_fs.tar 约130MB
```

### 3.2 上传到NAS

```bash
# 老群晖SSH兼容性：必须用 -c aes256-cbc 和 -O（旧SCP协议）
sshpass -p 'zhiqun1984' scp -O -c aes256-cbc wxedge_fs.tar admin@192.168.110.29:/volume1/wxedge/
```

### 3.3 在NAS上解压rootfs

```bash
sudo mkdir -p /volume1/wxedge/rootfs /volume1/wxedge/storage /volume1/wxedge/logs
sudo tar xf /volume1/wxedge/wxedge_fs.tar -C /volume1/wxedge/rootfs
```

### 3.4 创建chroot启动脚本

**关键要点**（每一点都是踩坑后的经验）：

```bash
#!/bin/sh
ROOTFS=/volume1/wxedge/rootfs
STORAGE=/volume1/wxedge/storage

mkdir -p $STORAGE $ROOTFS/storage $ROOTFS/tmp $ROOTFS/run $ROOTFS/proc $ROOTFS/dev

# 挂载必要文件系统
mount -t proc proc $ROOTFS/proc          # wxedge读取/proc信息
mount --bind /dev $ROOTFS/dev            # 需要设备文件
mount --bind $STORAGE $ROOTFS/storage    # 持久化存储
mount -t tmpfs tmpfs $ROOTFS/tmp         # 临时文件
mount -t tmpfs tmpfs $ROOTFS/run         # containerd的运行时文件

# ⚠️ 关键：创建假的cgroup目录
# 不能挂sysfs！sysfs会遮盖手动创建的cgroup目录
# 只需在/sys/fs/cgroup挂一个tmpfs，让statfs()调用不报错
mkdir -p $ROOTFS/sys/fs/cgroup
mount -t tmpfs fakecgroup $ROOTFS/sys/fs/cgroup
mkdir -p $ROOTFS/sys/fs/cgroup/{memory,cpu,cpuset,devices,blkio,pids,systemd}

# DNS配置
cp /etc/resolv.conf $ROOTFS/etc/resolv.conf

# 进入chroot运行
chroot $ROOTFS /bin/sh -c '
cd /xyapp/miner.plugin-wxedge.ipk
rm -rf /run/containerd
./bin/containerd -c ./cfg/cntr.toml &
sleep 3
GODEBUG=x509ignoreCN=0 ./bin/wxedged -c ./cfg/wxedge.yaml &
wait'
```

### 3.5 配置自启动

```bash
# 群晖标准自启动路径
sudo cp wxedge.sh /usr/local/etc/rc.d/wxedge.sh
sudo chmod 755 /usr/local/etc/rc.d/wxedge.sh
```

自启动脚本内容：检测wxedged进程，不存在则调用chroot_start.sh

### 3.6 wxedge.yaml配置

```yaml
dispatch_address: "ctwx"
storage_path: "/storage"        # chroot内部路径，对应bind mount
log_config:
  location: "/tmp/wxedge.log"   # chroot内部路径
  back_up_num: 3
  max_size_bytes: 3145728
miner_config:
  minion_interval: 120
  blacklist: ["CTJB", "TSWX"]  # 屏蔽部分任务
```

---

## 四、核心踩坑总结

### 4.1 SSH/SCP兼容性
| 问题 | 解决 |
|:---|:---|
| `no matching cipher found` | `ssh -c aes256-cbc` |
| `scp: remote mkdir: No such file or directory` | `scp -O`（旧SCP协议） |
| Permission denied | 密码是 `zhiqun1984`（小写z） |
| 远程mkdir权限不足 | `echo 'password' \| sudo -S mkdir -p` |

### 4.2 cgroup问题（最关键的坑）
| 现象 | 原因 | 解决 |
|:---|:---|:---|
| `panic cannot statfs cgroup root` | 内核3.2无cgroup，`/sys/fs/cgroup`不存在 | 在chroot内挂tmpfs到该路径 |
| 挂了tmpfs但chroot内仍然找不到 | chroot脚本中挂了sysfs把cgroup目录遮盖了 | **不挂sysfs**，只挂cgroup的tmpfs |
| `Failed to parse cgroup information` | wxedged读/proc/self/cgroup失败 | 二进制补丁重定向到/tmp/fake_cgroups_ |
| `invalid mountinfo format` | wxedged读/proc/self/mountinfo格式错 | 二进制补丁重定向到/tmp/_fake_mountinfo |
| `not found mount point:cgroup` | 无真实cgroup功能 | 可忽略，只影响IPT限制不影响收益 |
| `setNetCls error! net_cls path not exist` | 缺per-container net_cls目录 | mkdir /sys/fs/cgroup/net_cls/wxedge/<task_id>/ |

### 4.3 containerd问题
| 现象 | 原因 | 解决 |
|:---|:---|:---|
| `No such file or directory`（但文件存在） | 动态链接，缺ld-linux.so | 使用chroot，rootfs内有完整库 |
| 官方无arm32静态版 | 只提供arm64 | chroot方案绕过 |
| containerd启动后wxedge连不上 | socket还没创建 | chroot脚本中sleep 5等待 |
| `overlayfs NOT supported` | 内核3.2无overlay | cntr.toml禁用overlayfs，用native snapshotter |
| `parent snapshot does not exist` | snapshotter切换后旧数据 | 清除/var/lib/containerd/*重建 |
| `strconv.Atoi: parsing "PID\n"` | fake_runc用echo写PID带换行 | 改用`printf "%s" $PID` |

### 4.4 containerd-shim 问题（二进制补丁）
| 现象 | 原因 | 解决 |
|:---|:---|:---|
| `invalid argument: exit status 1` | prctl(PR_SET_CHILD_SUBREAPER)在3.2内核不支持 | 补丁shim二进制NOP掉prctl调用 |
| `exec "runc" not found` | runc不在PATH中 | 创建/usr/bin/runc软链接→fake_runc.sh |
| shim读/proc/self/exe失败 | chroot内路径不对 | 补丁shim→读/tmp/_shimexe_（软链接） |
| `readlink /tmp/_shimexe_: no such file or directory` | containerd启动shim时需要_shimexe_但chroot内不存在 | **每次启动前**创建符号链接：`ln -sf /xyapp/.../containerd-shim-runc-v2 /tmp/_shimexe_` |

### 4.4.1 _shimexe_ 关键修复（必须！）

**这是最关键的修复之一**。清理数据重启后，所有容器都报 `readlink /tmp/_shimexe_: no such file or directory`。

**根因**：containerd启动shim时，shim进程通过 `/tmp/_shimexe_` 找到自身二进制。tmpfs清空后该链接消失。

**解决方案**（必须写入 chroot_start.sh）：
```bash
# 在 containerd 启动之前执行
chroot /volume1/wxedge/rootfs ln -sf /xyapp/miner.plugin-wxedge.ipk/bin/containerd-shim-runc-v2 /tmp/_shimexe_
```

### 4.4.2 musl C++ 库缓存（guluplugin 必须！）

**问题**：guluplugin 使用 musl libc 链接，需要 musl-compatible 的 `libstdc++.so.6` 和 `libgcc_s.so.1`，但容器镜像中不包含。

**解决方案**：
1. 从 **Alpine Linux v3.12**（musl 1.1.24）下载兼容库
2. 缓存到 `/tmp/musl_libs/` 目录
3. fake_runc.sh 自动将缓存库复制到新创建的 Gulu 快照中

```bash
# 缓存库（写入 chroot_start.sh）
mkdir -p /volume1/wxedge/rootfs/tmp/musl_libs/
cp /volume1/wxedge/libstdc++_musl312.so.6 /volume1/wxedge/rootfs/tmp/musl_libs/libstdc++.so.6
cp /volume1/wxedge/libgcc_s_musl312.so.1 /volume1/wxedge/rootfs/tmp/musl_libs/libgcc_s.so.1

# 预安装到所有 gulu 快照
for d in $(ls $SNAP_BASE); do
  if [ -f "$SNAP_BASE/$d/usr/local/galaxy/guluplugin/bin/guluplugin" ]; then
    cp /tmp/musl_libs/libstdc++.so.6 "$SNAP_BASE/$d/usr/local/galaxy/guluplugin/bin/"
    cp /tmp/musl_libs/libgcc_s.so.1 "$SNAP_BASE/$d/usr/local/galaxy/guluplugin/bin/"
    ln -sf /usr/local/galaxy/guluplugin/bin/libc.so "$SNAP_BASE/$d/lib/ld-musl-armhf.so.1"
  fi
done
```

**Alpine 版本选择**：
- ❌ Alpine 3.19（musl 1.2+，含 time64 符号，不兼容）
- ❌ Alpine 3.14（musl 1.2.2，time64 符号不兼容）
- ✅ **Alpine 3.12**（musl 1.1.24，无 time64，完美兼容）

**下载命令**：
```bash
wget https://dl-cdn.alpinelinux.org/alpine/v3.12/main/armv7/libstdc++-10.3.1_git20210424-r2.apk
wget https://dl-cdn.alpinelinux.org/alpine/v3.12/main/armv7/libgcc-10.3.1_git20210424-r2.apk
# 解压 .apk (tar.gz) 获取 usr/lib/ 下的 .so 文件
```

### 4.5 storage问题
| 现象 | 原因 | 解决 |
|:---|:---|:---|
| "请挂载storage路径" | storage目录不是挂载点 | bind mount |
| permission denied on .onething_data | admin用户权限不足 | 以root运行wxedge |
| `not tardir,len 0` | storage目录为空 | 让wxedge自动初始化 |
| `storage not mounted` | fmounts文件缺/storage挂载 | 更新fmounts和_fake_mountinfo |

### 4.6 硬件伪装问题
| 现象 | 原因 | 解决 |
|:---|:---|:---|
| Dashboard显示CPU/内存/磁盘全0 | fake文件未正确配置或被tmpfs清空 | 在mount -t tmpfs后重写fake文件 |
| 任务 mem:-9999, cpu_usage:-9999 | 内核3.2无法读真实cgroup | 正常现象，不影响收益 |
| `diskType: get rotational` | /sys/block不可读 | 创建/sys/block/md2/queue/rotational=0 |
| wxedge不识别磁盘 | 缺/dev/sda设备节点 | mknod /dev/sda b 8 0 等 |

---

## 五、验证检查清单

部署完成后，按以下顺序验证：

- [ ] `ps aux | grep wxedge` → containerd + wxedged 两个进程都在
- [ ] `netstat -tlnp | grep 18888` → 端口监听中
- [ ] `curl http://IP:18888/docker/data` → 返回JSON含SN和acode
- [ ] `curl http://IP:18888/docker/dashboard` → 返回资源信息和运行任务
- [ ] wxedge.log中出现 `"Handshake Success"` → 已连接云端
- [ ] wxedge.log中出现 `"container run precheck success"` → 开始接收任务
- [ ] `fake_runc.log` 中出现 `STARTED gulu PID=` → guluplugin容器已启动
- [ ] `ps aux | grep guluplugin` → guluplugin进程运行中
- [ ] guluplugin日志中出现 `Tracker S2T Heartbeat` → CDN节点已注册到Tracker
- [ ] `/usr/local/etc/rc.d/wxedge.sh status` → 自启动脚本正常

### 5.1 Dashboard API 端点

```bash
# 面板数据（最重要）
curl http://IP:18888/docker/dashboard
# → run_tasks[].state_code == 0 表示正常运行
# → resource 显示CPU/内存/磁盘

# 设备信息
curl http://IP:18888/docker/data
# → device.sn, device.acode, net.ip

# 添加任务
curl -X POST http://IP:18888/docker/add_task -H "Content-Type: application/json" -d '{"id":"TASK_ID"}'

# 确认启动
curl -X POST http://IP:18888/docker/confirm_start
```

### 5.2 关于收益时间

- **速度显示0是正常的**：新节点刚注册，CDN网络需要24-48小时验证节点稳定性
- **收益产生**：通常在节点连续运行2-3天后开始产生
- **guluplugin心跳**：如果日志中能看到 `Tracker S2T Heartbeat`，说明节点已被CDN网络识别

---

## 六、已激活配置备份

所有已激活文件已备份到：
```
configs/ds213j_已激活/
├── cfg/              # wxedge.yaml + cntr.toml
├── storage/          # wxnode（节点身份）+ .onething_data（激活数据）
├── scripts/          # chroot_start.sh + rc.d_wxedge.sh
└── README.md         # 说明和复用方法
```

**关键文件**：
- `storage/wxnode` — 节点身份密钥（加密），唯一标识设备
- `storage/.onething_data/` — 激活状态数据

**恢复时**：将storage整体复制回去，设备身份自动恢复，**无需重新绑定**

---

## 七、设备运行数据（最终状态 2026-02-14）

| 项目 | 值 |
|:---|:---|
| SN | CTWX09Y9Q2ILI4PV |
| 激活码 | CTWXErqmwU3DEPVLzAbvRNV5 |
| IP | 192.168.110.29 |
| 外网管理 | http://42.194.245.239:18882（frpc隧道，仅管理页面） |
| 磁盘 | 720GB已用 / 2031GB总量 |
| 稳定运行任务 | CB*.0 + CG*.0 + CG*.1（3个，state_code=0） |
| 不兼容任务 | CX*(DCDN Illegal Instruction), CYK(netns), Z(AMD64 only) |
| 伪装硬件 | 22核CPU / SSD / 2033GB磁盘 / 512GB RAM |
| guluplugin | ✅ 正常运行，Tracker心跳30s/次，已有P2P数据传输 |
| CDN Tracker | 103.45.73.108:8409 |
| Mona Server | 146.196.69.8:1942 / 122.189.221.157:6938 |
| XYP端口 | 41540 / 53377（本地网络直连） |
| NAT类型 | 4（对称NAT） |
| 实际内存占用 | containerd 19MB + wxedged 30MB + 4×shim 22MB + guluplugin 9MB ≈ 80MB |
| 实际可用内存 | 497MB总量，~170MB available |
| Snapshot数 | 46个（native snapshotter） |
| 资源控制 | nice=10 + CPU守护（>70%暂停guluplugin） |
| PCDN流量 | 走本地网络（不走frpc/存客宝） |

### 核心技术栈
| 技术 | 说明 |
|:---|:---|
| chroot | 轻量级容器，替代Docker |
| 二进制补丁 | sed替换wxedged和shim中的/proc路径和syscall |
| fake_runc v6 | shell脚本模拟OCI runtime（支持gulu+pcdn+thunder三种容器） |
| native snapshotter | 替代overlayfs，文件拷贝方式解压镜像层 |
| 硬件伪装 | fake /proc/cpuinfo, /proc/meminfo, /proc/stat, cgroup文件 |
| frpc | NAT穿透（仅管理页面18888，**PCDN流量走本地**） |
| musl C++库缓存 | Alpine v3.12的libstdc++/libgcc_s，给guluplugin用 |
| fake_netns | tmpfs覆盖/proc/PID/task/TID/ns/创建假net文件 |
| CPU守护 | 负载>70%自动SIGSTOP/SIGCONT控制 |

### 不能运行的任务及原因（硬件限制，无需修复）
| 任务 | 二进制 | 失败原因 | 处理方式 |
|:---|:---|:---|:---|
| CB*(PCDN) | PCDNClient | Illegal instruction（需NEON指令集） | fake_runc自动keepalive |
| CX*(DCDN) | dcdn_client_docker | Illegal instruction | 快照中替换为keepalive包装器 |
| CYK | pcdn_xunlei_arm32 | 需netns，内核3.2不支持 | fake_netns部分缓解 |
| Z(Centaurs) | centaurs | 要求AMD64(x86_64)架构 | CDN服务器自动停止 |

---

## 八、资源控制（CPU/带宽 70% 限制）

**目的**：防止 NAS CPU 超载导致管理功能卡顿。

### 8.1 CPU 控制
```bash
# 降低 wxedge 进程优先级
renice 10 $(pgrep -f "wxedged|containerd|guluplugin")

# CPU 守护脚本（/volume1/wxedge/cpu_guard.sh）
# 负载>70%时暂停 guluplugin 15秒，每30秒检查
```

### 8.2 带宽控制
- 内核3.2 不支持 tc/HTB，无法用流量控制命令
- 替代：路由器端 QoS 限速给 NAS IP
- CPU 守护间接控制带宽（暂停进程=停止传输）

### 8.3 PCDN 流量路由（重要！）
```
✅ PCDN 数据 → 本地网络（192.168.110.1 网关）→ 运营商出口
✅ frpc 仅转发 18888（管理页面）和 22（SSH）
❌ 禁止 frpc 转发 XYP/Gulu 端口（会占用存客宝/宝塔带宽）
```

---

## 九、适用范围

本方案适用于所有满足以下条件的设备：
1. **ARM32(armv7l)或ARM64架构** Linux系统
2. **无Docker**（内核太老、无cgroup、资源不足等）
3. **有root权限**（sudo或直接root）
4. **能chroot**（基本所有Linux都支持）
5. **有足够存储**（rootfs解压约300MB + 数据存储建议≥10GB）
6. **有网络**（需连接网心云服务器）

**同类设备参考**：
- 群晖DS213j, DS213, DS213+（Armada-370）
- 群晖DS112, DS112+, DS113（老ARM系列）
- 树莓派 2/3（armv7l，若Docker不好用时）
- 任何 Linux 3.x + ARM32 的嵌入式设备
