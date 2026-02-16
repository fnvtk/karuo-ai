# noVNC + macOS 虚拟机流畅度优化指南

> 适用于：存客宝 NAS（8GB 内存）上的 dockurr/macos 虚拟机，通过 noVNC (open.quwanzhi.com:8007) 远程操作。

---

## 一、问题成因简析

| 环节 | 可能瓶颈 |
|------|----------|
| **NAS 硬件** | 8GB 内存，macOS VM 仅 3GB，QEMU 渲染+noVNC 编码占 CPU |
| **网络** | 外网 frpc 穿透增加延迟；VNC 全帧传输带宽高 |
| **VNC 协议** | 无硬件加速，高分辨率+高色彩深度导致数据量大 |
| **浏览器** | 多标签占用内存；WebSocket 解码消耗 CPU |

---

## 二、优化方案总览

### 优先级

1. **立即可做（无需重启 VM）**：noVNC URL 参数、浏览器优化、优先用内网
2. **需重启 VM**：修改 docker-compose、macOS 内系统设置
3. **一次性配置**：macOS 内运行 osx-optimizer 脚本

---

## 三、立即可做（0 成本）

### 1. 使用优化后的 noVNC 访问 URL

**原地址**：`http://open.quwanzhi.com:8007`  
**优化后**（降低画质换流畅）：

```
http://open.quwanzhi.com:8007/?qualityLevel=3&compressionLevel=6&resize=scale
```

| 参数 | 含义 | 推荐值 |
|------|------|--------|
| `qualityLevel` | JPEG 画质 0–9，越低越省带宽 | 3 或 4 |
| `compressionLevel` | 压缩强度 0–9，越高越省带宽、越耗 CPU | 5–6 |
| `resize` | 缩放模式 | `scale`（适应窗口） |

**更激进（最流畅优先）**：

```
http://open.quwanzhi.com:8007/?qualityLevel=2&compressionLevel=7&resize=scale
```

### 2. 优先用内网直连（跳过 frpc）

若 MacBook 与 NAS 在同一局域网（如 192.168.1.x）：

```
http://192.168.1.201:8007/?qualityLevel=3&compressionLevel=6&resize=scale
```

可减少外网穿透带来的延迟。

### 3. 浏览器优化

- **只开一个 noVNC 标签**，关闭其他大页签
- 使用 **Chrome**，并开启硬件加速：设置 → 系统 → 使用硬件加速
- 用**无痕/独立窗口**打开 noVNC，减少扩展和插件干扰

---

## 四、NAS / Docker 配置优化

### 1. 更新 macos-vm 的 docker-compose

编辑 `/volume1/docker/macos-vm/docker-compose.yml`：

```yaml
version: "3.8"
services:
  macos:
    image: dockurr/macos
    container_name: macos-vm
    environment:
      - VERSION=ventura
      - RAM_SIZE=4G              # 3G→4G（NAS 有余量时）
      - CPU_CORES=2              # 1核→2核
      - DISK_SIZE=64G
      # 以下为可选，部分 dockurr 版本支持
      - DISPLAY_WIDTH=1280       # 降低默认分辨率
      - DISPLAY_HEIGHT=720
    ports:
      - "8007:8006"
      - "5901:5900"
    volumes:
      - /volume1/vm/macos:/storage
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
    restart: "no"
    deploy:
      resources:
        limits:
          memory: 4500M
```

**注意**：`DISPLAY_WIDTH`/`DISPLAY_HEIGHT` 若镜像不支持可删除；优先保证 `CPU_CORES=2`、`RAM_SIZE=4G`。

### 2. 应用并重启 VM

#### 方式 A：在 NAS 上直接执行（外网时推荐）

1. SSH 登录 CKB NAS：
   - **内网**：`ssh fnvtk@192.168.1.201`（需加 `-o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc`）
   - **外网**：若有 frpc 暴露 SSH，或通过 Tailscale/QuickConnect VPN 后同上

2. 将脚本传到 NAS 或从 Gitea 克隆卡若AI 后，执行：
   ```bash
   cd /volume1/docker/macos-vm
   # 若脚本在 SynologyDrive/卡若AI 或 Gitea 克隆目录，先复制过来：
   # cp /path/to/optimize_macos_vm_on_nas.sh /volume1/docker/macos-vm/
   chmod +x optimize_macos_vm_on_nas.sh
   ./optimize_macos_vm_on_nas.sh
   ```

3. 或**一行命令**（直接粘贴到 NAS 终端）：
   ```bash
   cd /volume1/docker/macos-vm && cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d) 2>/dev/null; cat > docker-compose.yml << 'EOF'
   version: "3.8"
   services:
     macos:
       image: dockurr/macos
       container_name: macos-vm
       environment:
         - VERSION=ventura
         - RAM_SIZE=4G
         - CPU_CORES=2
         - DISK_SIZE=64G
       ports:
         - "8007:8006"
         - "5901:5900"
       volumes:
         - /volume1/vm/macos:/storage
       devices:
         - /dev/kvm
       cap_add:
         - NET_ADMIN
       restart: "no"
       deploy:
         resources:
           limits:
             memory: 4500M
   EOF
   echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose down 2>/dev/null; sleep 2; echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d && echo "✅ 完成"
   ```

#### 方式 B：从本机 SSH 到 NAS 执行（需与 NAS 同网或可 SSH 访问）

```bash
ssh nas "cd /volume1/docker/macos-vm && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose down"
ssh nas "cd /volume1/docker/macos-vm && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"
```

---

## 五、macOS 虚拟机内部优化

连接 noVNC 后，在 macOS 终端执行（需管理员密码）：

### 1. 关闭 Spotlight 索引（显著减轻 I/O）

```bash
sudo mdutil -i off -a
```

### 2. 减少动画与透明（减轻渲染压力）

```bash
defaults write com.apple.Accessibility ReduceMotionEnabled -int 1
defaults write com.apple.universalaccess reduceMotion -int 1
defaults write com.apple.universalaccess reduceTransparency -int 1
```

### 3. 降低显示器分辨率

系统设置 → 显示器 → 分辨率 → 选择 **1280×720** 或 **1366×768**。

### 4. 关闭不必要后台

- 系统设置 → 通用 → 登录项：移除不需要开机自启的应用
- 活动监视器中结束占用高的非必要进程

---

## 六、外网访问优化（frpc）

若必须用 `open.quwanzhi.com:8007`：

- 确认 frpc 服务端带宽与延迟正常
- 使用有线或 5GHz Wi‑Fi，避免弱信号
- 可考虑 Tailscale/ZeroTier 等组网，替代端口映射

---

## 七、预期效果

| 优化项 | 预期改善 |
|--------|----------|
| qualityLevel=3 + compressionLevel=6 | 延迟和卡顿明显下降 |
| 内网直连 | 延迟可再降 50–100ms |
| CPU 2核 + RAM 4G | 多任务、窗口切换更顺 |
| 关闭 Spotlight + 降分辨率 | 减少 I/O 和渲染负担 |

---

## 八、若仍卡顿

1. **确认 NAS 资源**：`ssh nas "free -h && uptime"`，查看内存和负载
2. **确认 VM 占用**：`ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker stats --no-stream"`
3. **尝试原生 VNC 客户端**（如 RealVNC、TigerVNC）连接 `vnc://IP:5901`，对比 noVNC 是否更卡
4. **升级 NAS 内存**：DS1825+ 支持扩展到 32GB，可显著改善

---

**更新**：2026-02-16 | 归属：金仓 · 群晖NAS管理
