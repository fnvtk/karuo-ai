# 群晖 NAS 开辟 1TB 备份盘 · Mac 当硬盘用 + 时间机器

在群晖（家里 DiskStation）上开辟约 **1000GB** 空间，在 Mac 上挂载成**像真实硬盘一样**使用，并可用于**时间机器**备份。

---

## 一、NAS 端：开辟 1TB 空间（DSM 操作）

在浏览器打开 **http://192.168.110.29:5000** 登录 DSM，按顺序做：

### 1. 新建共享文件夹（若还没有专用备份盘）

1. **文件服务** → **共享文件夹** → **新增**
2. 名称：`MacBackup`（或 `备份盘`，英文更省事）
3. 位置：选 **volume1**
4. 容量：**不勾选「启用共享文件夹配额」** 即使用整个卷可用空间；若需限制为 1TB，勾选并设 **1024 GB**
5. 权限：给 **admin** 读写
6. 高级：**关闭回收站**（时间机器兼容更好）
7. 完成

若已有「共享」且空间够 1TB，可跳过新建，直接用该共享；下面以 **共享名 = MacBackup** 为例（你用「共享」则替换成 `共享`）。

### 2. 开启 Time Machine 支持（可选，用于时间机器）

1. **控制面板** → **文件服务** → **高级** 或 **Time Machine**
2. 勾选 **「启用 Time Machine 备份」**
3. 选择刚建的 **MacBackup**（或你用的共享名）
4. 保存

### 3. 确认 SMB 已启用

1. **控制面板** → **文件服务** → **SMB**
2. 勾选 **启用 SMB 服务**
3. 高级里建议：**最大 SMB 协议 = SMB3**，勾选 **SMB2 租约**、**持久句柄**
4. 保存

### 4. 外网访问（可选）：frpc 添加 SMB 端口

不在家时也要挂载，需在 NAS 上给 frpc 加 SMB 穿透：

- SSH 登录：`ssh admin@192.168.110.29`（需内网或已配好 SSH）
- 编辑：`/volume1/homes/admin/frpc/frpc.ini`，在末尾加：

```ini
# SMB（外网 4452 → NAS 445）
[home-nas-smb]
type = tcp
local_ip = 127.0.0.1
local_port = 445
remote_port = 4452
```

- 重启 frpc：`/volume1/homes/admin/frpc/start_frpc.sh`

---

## 二、Mac 端：挂载成像真实硬盘

### 方式 A：内网挂载（推荐，在家时）

1. Finder → **前往** → **连接服务器**（⌘K）
2. 输入（把 `MacBackup` 换成你的共享名）：
   - **`smb://192.168.110.29/MacBackup`**
3. 连接，输入 DSM 账号密码，勾选「在钥匙串中记住」
4. 挂载后会在 Finder 侧栏「位置」出现，**像本地硬盘一样**拖拽、拷贝、时间机器选它即可

### 方式 B：外网挂载（不在家时）

1. 确保 NAS 已按「一、4」添加 SMB 的 frpc
2. Finder → ⌘K，输入：
   - **`smb://opennas2.quwanzhi.com:4452/MacBackup`**
3. 连接并记住密码，同样当硬盘用

### 方式 C：脚本一键挂载（内网优先）

已为你准备好脚本，**内网自动用 192.168.110.29，外网用 opennas2:4452**：

```bash
/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/mount_diskstation_1tb.sh
```

- 挂载点：**~/DiskStation-1TB**
- 在 Finder 里把 **DiskStation-1TB** 拖到侧栏「位置」，就像本机硬盘一样常驻

---

## 三、用作时间机器备份盘

1. **系统设置** → **通用** → **时间机器**
2. 点 **「选择备份磁盘」** 或 **「+」**
3. 选择刚挂载的 **MacBackup** 或 **DiskStation-1TB**
4. 输入 DSM 账号密码（若提示）
5. 若提示「未识别备份磁盘」：先移除该目标，再重新添加一次同一共享即可

时间机器会像用外接硬盘一样使用这块约 1TB 空间。

---

## 四、开机自动挂载（像真实硬盘常驻）

让 Mac 每次开机自动挂载，无需每次手动 ⌘K：

### 方法 1：登录项 + 脚本（简单）

1. 打开 **系统设置** → **通用** → **登录项**
2. 点 **「+」**，选 **「其他」**
3. 找到并选中脚本：  
   `卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/mount_diskstation_1tb.sh`
4. 之后每次登录会自动执行脚本挂载（需家里网络或外网 frp 可用）

### 方法 2：LaunchAgent（后台静默）

脚本同目录下已有 **`com.karuo.mount_diskstation_1tb.plist`**。安装步骤：

```bash
# 复制到用户级 LaunchAgents
cp "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/com.karuo.mount_diskstation_1tb.plist" ~/Library/LaunchAgents/

# 加载，下次登录会自动挂载
launchctl load ~/Library/LaunchAgents/com.karuo.mount_diskstation_1tb.plist
```

卸载：`launchctl unload ~/Library/LaunchAgents/com.karuo.mount_diskstation_1tb.plist`

---

## 五、小结

| 步骤 | 位置 | 动作 |
|:-----|:-----|:-----|
| 1 | NAS DSM | 新建共享文件夹（如 MacBackup）约 1TB，关回收站，开 SMB |
| 2 | NAS DSM | 启用 Time Machine 并选中该共享 |
| 3 | NAS（可选） | frpc 添加 SMB 4452，外网可挂载 |
| 4 | Mac | ⌘K 连 `smb://192.168.110.29/MacBackup` 或运行挂载脚本 |
| 5 | Mac | 时间机器里选该卷；侧栏固定后当真实硬盘用 |
| 6 | Mac（可选） | 登录项加脚本，开机自动挂载 |

按上述做完后，你这台苹果电脑就可以把群晖上的约 1TB 当**一块真实硬盘**使用，并用于时间机器备份。
