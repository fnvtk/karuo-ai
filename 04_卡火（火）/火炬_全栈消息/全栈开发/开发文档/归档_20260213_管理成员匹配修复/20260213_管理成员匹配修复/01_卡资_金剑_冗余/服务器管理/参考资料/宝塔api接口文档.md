# 宝塔面板 API 接口文档

## 1. 鉴权机制

所有 API 请求均需包含鉴权参数，使用 POST 方式提交。

### 签名算法

```python
import time
import hashlib

def get_sign(api_key):
    now_time = int(time.time())
    # md5(timestamp + md5(api_key))
    sign_str = str(now_time) + hashlib.md5(api_key.encode('utf-8')).hexdigest()
    request_token = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
    return now_time, request_token
```

### 基础参数

每次 POST 请求必须包含：
- `request_time`: 当前时间戳 (10位)
- `request_token`: 计算生成的签名

---

## 2. 系统管理接口

### 获取系统基础统计
- **URL**: `/system?action=GetSystemTotal`
- **功能**: 获取 CPU、内存、系统版本等信息

### 获取磁盘信息
- **URL**: `/system?action=GetDiskInfo`
- **功能**: 获取各分区使用情况

### 获取网络状态
- **URL**: `/system?action=GetNetWork`
- **功能**: 获取实时网络流量

---

## 3. 网站管理接口

### 获取网站列表
- **URL**: `/data?action=getData&table=sites`
- **参数**:
  - `limit`: 每页条数 (默认15)
  - `p`: 页码 (默认1)
  - `search`: 搜索关键词 (可选)

### 添加静态/PHP网站
- **URL**: `/site?action=AddSite`
- **参数**:
  - `webname`: 域名 (json字符串)
  - `path`: 根目录路径
  - `version`: PHP版本 (`00`=纯静态, `74`=PHP 7.4)
  - `port`: 端口 (默认 `80`)

### 删除网站
- **URL**: `/site?action=DeleteSite`
- **参数**:
  - `id`: 网站ID
  - `webname`: 网站域名

---

## 4. 文件管理接口

### 读取文件内容
- **URL**: `/files?action=GetFileBody`
- **参数**: `path`: 文件绝对路径

### 保存文件内容
- **URL**: `/files?action=SaveFileBody`
- **参数**:
  - `path`: 文件绝对路径
  - `data`: 文件内容
  - `encoding`: 编码 (默认 `utf-8`)

### 创建目录
- **URL**: `/files?action=CreateDir`
- **参数**: `path`: 目录绝对路径

### 删除文件/目录
- **URL**: `/files?action=DeleteFile`
- **参数**: `path`: 绝对路径

---

## 5. Node.js 项目管理 (PM2)

> 注：部分接口可能随宝塔版本更新而变化

### 获取 Node 项目列表
- **URL**: `/project/nodejs/get_project_list`

### 添加 Node 项目
- **URL**: `/project/nodejs/add_project`
- **参数**:
  - `name`: 项目名称
  - `path`: 项目根目录
  - `run_cmd`: 启动命令
  - `port`: 项目端口

### 启动/停止/重启项目
- **URL**: `/project/nodejs/start_project` (或 `stop_project`, `restart_project`)
- **参数**: `project_name`: 项目名称

---

## 6. SSL证书管理

### 获取证书列表
- **URL**: `/ssl?action=GetCertList`

### 获取网站SSL配置
- **URL**: `/site?action=GetSSL`
- **参数**: `siteName`: 网站名称

---

## 7. 计划任务

### 获取计划任务列表
- **URL**: `/crontab?action=GetCrontab`

### 执行计划任务
- **URL**: `/crontab?action=StartTask`
- **参数**: `id`: 任务ID

---

## 8. 服务管理

### 重载/重启服务
- **URL**: `/system?action=ServiceAdmin`
- **参数**:
  - `name`: 服务名称 (nginx, mysql等)
  - `type`: 操作类型 (reload, restart, stop, start)
