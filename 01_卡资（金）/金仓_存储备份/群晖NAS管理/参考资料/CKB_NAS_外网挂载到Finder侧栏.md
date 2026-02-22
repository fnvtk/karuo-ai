# 存客宝 CKB NAS 外网挂载到 Finder 侧栏「位置」

把 NAS 的 1TB 共享盘映射到 Finder 侧栏，外网可用，拷贝时显示速率。

---

## 一、已完成的配置

- **SMB 外网穿透**：frp 已开放端口 **4450** → NAS 445
- **共享文件夹**：`homes`（对应 /volume1/homes/fnvtk，可用空间 21TB）

---

## 二、挂载方式（任选其一）

### 方式 A：Finder 连接服务器（推荐，可保存密码）

1. Finder → **前往** → **连接服务器**（⌘K）
2. 输入：`smb://open.quwanzhi.com:4450/homes`
3. 点**连接**，输入 DSM 用户名和密码，勾选「在钥匙串中记住此密码」
4. 连接成功后，该共享会出现在 Finder 侧栏「位置」下
5. 右键该共享 → **制作替身** 或 拖到侧栏，可固定显示

### 方式 B：脚本挂载

```bash
/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/mount_ckb_nas_1tb.sh
```

- 若提示 **Authentication error**：编辑脚本，把 `NAS_PASS` 改为你的 DSM 登录密码
- 挂载后位置：`~/CKB-NAS-1TB`，在 Finder 中把它拖到侧栏「位置」即可固定

---

## 三、添加「位置」到侧栏

挂载成功后，在 Finder 左侧「位置」区域：

- 将 `CKB-NAS-1TB` 或 `homes` 拖到侧栏，即可像 Synology Drive 一样固定显示

---

## 四、传输速率

在 Finder 中往该共享拷贝文件时，会显示进度和传输速率（与本地磁盘相同）。
