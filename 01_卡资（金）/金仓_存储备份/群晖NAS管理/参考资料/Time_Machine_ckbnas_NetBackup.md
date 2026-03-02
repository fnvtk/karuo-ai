# 时间机器 → ckbnas NetBackup

**目标**：Mac 时间机器备份到 **ckbnas**（192.168.1.201）的 **NetBackup** 共享目录。

若出现「所选网络备份磁盘不支持所需功能」，说明 **NAS 端尚未为该共享启用 Time Machine**，按下列步骤操作。

---

## 一、ckbnas 启用 Time Machine（二选一）

### 方式 A：全自动脚本（已部署到 NAS，需执行一次 sudo）

脚本已放在 ckbnas 上：`/volume1/NetBackup/scripts/enable_tm.sh`。**只需在 NAS 上以 root 执行一次**：

```bash
ssh fnvtk@192.168.1.201
sudo bash /volume1/NetBackup/scripts/enable_tm.sh
```

按提示输入 fnvtk 的 sudo 密码（与 DSM 登录密码一致；若未配置 sudo 则需用 admin 登录 DSM 在「控制面板 → 用户 → fnvtk → 编辑」中勾选「允许使用 sudo」）。执行成功后即可在 Mac 上选择 NetBackup 作为时间机器目标。

**从本机一键配置**（若 fnvtk 已配置 sudo 且已知密码）：在本机执行 `export CKB_NAS_SUDO_PASS='你的DSM密码'` 后运行 `bash 01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/ckbnas_enable_timemachine_netbackup.sh`，即可远程为 NetBackup 启用 Time Machine 并重启 SMB。

### 方式 B：DSM 图形界面

在浏览器打开 **http://192.168.1.201:5000** 登录 DSM（用户 fnvtk 或 admin），依次完成：

1. **控制面板** → **文件服务** → **高级**（或 **Time Machine**）
   - 勾选 **「启用 Time Machine 备份」**
   - 将 **NetBackup** 选为 Time Machine 使用的共享文件夹
   - 保存

2. **控制面板** → **文件服务** → **SMB** → **高级**
   - 最大 SMB 协议：**SMB3**
   - 勾选：**启用 SMB2 租约**、**启用 SMB durable handle**（持久句柄）
   - 保存，必要时重启 SMB 服务

3. 确认 **NetBackup** 共享对用户 **fnvtk** 有读写权限；建议关闭该共享的**回收站**，避免与稀疏包冲突。

---

## 二、Mac 命令行操作

### 1. 挂载 NetBackup（若未挂载）

```bash
open "smb://fnvtk@192.168.1.201/NetBackup"
```

按提示输入 fnvtk 密码，连接成功后会在 `/Volumes/NetBackup` 看到该卷。

### 2. 赋予「完全磁盘访问」权限（仅首次）

- **系统设置** → **隐私与安全性** → **完全磁盘访问**
- 添加 **终端**（或 **Cursor**，若在 Cursor 终端里执行）

### 3. 设置时间机器目标并验证

在终端执行：

```bash
sudo tmutil setdestination /Volumes/NetBackup
tmutil destinationinfo
tmutil startbackup --block
```

- `setdestination`：将备份目标设为已挂载的 NetBackup。
- `destinationinfo`：确认当前备份目标。
- `startbackup --block`：立即开始一次备份（阻塞直到结束，可选）。

---

## 三、一键脚本

可运行本目录同级脚本（会做网络检测、挂载提示并输出上述命令）：

```bash
bash "01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/time_machine_ckbnas_netbackup.sh"
```

---

## 四、快速检查清单

| 项 | 说明 |
|----|------|
| DSM 启用 Time Machine | 文件服务 → 高级，并选择 NetBackup |
| SMB 高级 | SMB3、SMB2 租约、持久句柄已开 |
| 共享权限 | fnvtk 对 NetBackup 可读写 |
| Mac 完全磁盘访问 | 终端已加入完全磁盘访问列表 |
| 挂载 | `/Volumes/NetBackup` 存在后再执行 tmutil |

完成「一」后，再在 Mac 执行「二」即可正常备份。

---

## 五、卡若AI 已完成的自动化

- 已通过浏览器登录 ckbnas DSM（http://192.168.1.201:5000），进入 **控制面板 → 文件服务 → 高级设置**。
- **启用通过 SMB 进行 Bonjour Time Machine 播送** 已勾选。
- 请你在 DSM 中手动完成最后一步：点击 **「设置 Time Machine 文件夹」**，在弹窗列表中**滚动找到 NetBackup**，勾选 **NetBackup**，点击 **保存**，回到文件服务页面点击 **应用**。完成后在 Mac 上重新选择备份磁盘为 NetBackup 即可。
