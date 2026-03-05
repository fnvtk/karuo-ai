# 本地 Docker 使用 NAS 上的 macOS 虚拟机（不复制）

直接挂载 NAS 的 `smb://CKBNAS._smb._tcp.local/docker/macos-vm`，在本机 Docker 里跑 macos-vm，数据不拷贝。

## 方式一：一键挂载并启动（推荐）

```bash
# 与 NAS 同网（如家里/公司内网）
bash "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/local-macos-vm/run.sh"
```

- 若未挂载 SMB：会先挂载 `//CKBNAS._smb._tcp.local/docker` 到 `~/nas-mounts/ckbnas-docker`（提示密码时输入 NAS 账号密码）。
- 若已在 Finder 里连接了「docker」共享：会直接用 `/Volumes/docker/macos-vm`，不再重复挂载。

## 方式二：先手动挂载再启动

1. 在 Finder 中连接：`smb://CKBNAS._smb._tcp.local/docker`，或终端执行：
   ```bash
   open "smb://CKBNAS._smb._tcp.local/docker"
   ```
2. 进入本目录后启动：
   ```bash
   cd "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/local-macos-vm"
   export MACOS_VM_STORAGE="/Volumes/docker/macos-vm"
   docker compose up -d
   ```

## 访问

- **noVNC（浏览器）**：http://localhost:8007  
- **VNC 客户端**：`localhost:5901`

## 停止与卸载

```bash
cd "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/local-macos-vm"
docker compose down
# 若用脚本挂载到 ~/nas-mounts/ckbnas-docker，不用时可卸载：
# umount ~/nas-mounts/ckbnas-docker
```

## 说明

- 数据始终在 NAS 的 `smb://CKBNAS._smb._tcp.local/docker/macos-vm`，本机只挂载使用，不复制。
- 本机需与 NAS 同网（或 VPN/内网穿透），否则 SMB 无法访问。
- Mac 上 Docker 无 KVM，虚拟机可能比在 NAS 上跑稍慢，属正常。
- 若镜像提示 linux/amd64 与 arm64 不一致，在 Docker Desktop 可开启「Use Rosetta for x86/amd64」以提升兼容性。
