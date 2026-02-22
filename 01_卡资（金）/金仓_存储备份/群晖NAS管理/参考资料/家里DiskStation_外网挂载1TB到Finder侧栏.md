# 家里 DiskStation 1TB 共享 · 外网挂载到 Finder 侧栏「位置」

外网像本地硬盘一样访问 DiskStation 的 1TB 共享，出现在 Finder 侧栏，拷贝时显示速率。

---

## 一、前置：添加 SMB 外网穿透（仅需一次）

家里 NAS 的 frpc 默认**未**开放 SMB。需在 DSM 或 SSH 添加：

### 方法 A：SSH 添加（在家时）

```bash
# 连接家里 NAS
ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes256-cbc \
  admin@192.168.110.29

# 在 frpc.ini 末尾追加（共享名若为「共享」用 %E5%85%B1%E4%BA%AB，通常直接用共享的英文名）
echo '
# SMB 文件共享（外网端口 4452 → NAS 445）
[home-nas-smb]
type = tcp
local_ip = 127.0.0.1
local_port = 445
remote_port = 4452
' >> /volume1/homes/admin/frpc/frpc.ini

# 重启 frpc
/volume1/homes/admin/frpc/start_frpc.sh
```

### 方法 B：直接编辑 frpc.ini

1. DSM → **文件服务** 或 **控制面板**，找到 frpc 相关说明
2. 或 SSH 登录后：`vi /volume1/homes/admin/frpc/frpc.ini`
3. 在 `[common]` 之后、其它 `[xxx]` 块后追加：

```ini
# SMB 文件共享（外网 4452 → NAS 445）
[home-nas-smb]
type = tcp
local_ip = 127.0.0.1
local_port = 445
remote_port = 4452
```

4. 保存后执行：`/volume1/homes/admin/frpc/start_frpc.sh`

> **端口说明**：4452 与 CKB 的 4450 区分，避免冲突。若 frps 上 4452 被占，可改为 4453 等。

---

## 二、挂载到 Finder 侧栏

### 方式 A：Finder 连接（推荐）

1. Finder → **前往** → **连接服务器**（⌘K）
2. 输入：`smb://opennas2.quwanzhi.com:4452/共享`
   - 共享名若不是「共享」，改为 DSM 里实际名称（如 `homes`、`TimeMachine`）
3. 连接，输入 DSM 账号密码，勾选「在钥匙串中记住」
4. 挂载后拖到 Finder 侧栏「位置」即可固定

### 方式 B：脚本挂载

```bash
/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/mount_diskstation_1tb.sh
```

挂载点：`~/DiskStation-1TB`，在 Finder 中拖到侧栏「位置」固定。

---

## 三、传输速率

Finder 往该共享拷贝文件时，会显示进度和速率（与本地磁盘一致）。

---

## 四、开机自动挂载（可选）

将脚本加入 **系统设置 → 通用 → 登录项**，或使用 LaunchAgent 在登录时执行挂载脚本。
