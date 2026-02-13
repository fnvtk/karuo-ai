# 群晖NAS API文档汇总

## 官方API资源

### 核心文档链接

| 文档 | 链接 | 说明 |
|------|------|------|
| 开发者门户 | https://www.synology.com/en-us/support/developer | 官方开发者资源入口 |
| DSM登录API | https://kb.synology.com/DG/DSM_Login_Web_API_Guide/2 | 认证流程详解 |
| FileStation API | [PDF](https://global.download.synology.com/download/Document/Software/DeveloperGuide/Package/FileStation/All/enu/Synology_File_Station_API_Guide.pdf) | 文件管理接口 |
| DownloadStation API | [PDF](https://global.download.synology.com/download/Document/Software/DeveloperGuide/Package/DownloadStation/All/enu/Synology_Download_Station_Web_API.pdf) | 下载任务接口 |
| DSM开发者指南 | [PDF](https://global.download.synology.com/download/Document/Software/DeveloperGuide/Os/DSM/All/enu/DSM_Developer_Guide_7_enu.pdf) | 套件开发完整指南 |
| Package开发指南 | https://help.synology.com/developer-guide/ | GitBook在线版 |

### 2025年新增API

Synology于2025年2月发布Office Suite API，需要DSM 7.2.2 nano3+：

- **Synology Drive API**: 文件管理和上传
- **Synology Spreadsheet API**: 数据自动采集
- **Synology MailPlus API**: 邮件工作流
- **Synology Calendar API**: 日程同步

---

## 常用API接口

### 1. 认证API (SYNO.API.Auth)

```http
GET /webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account={user}&passwd={pass}&session=FileStation&format=sid
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sid": "xxxxxxxxxxxxxxxxxx"
  }
}
```

### 2. 系统信息 (SYNO.DSM.Info)

```http
GET /webapi/entry.cgi?api=SYNO.DSM.Info&version=2&method=getinfo&_sid={sid}
```

**响应字段**:
- `model`: 型号
- `serial`: 序列号
- `temperature`: 温度
- `version_string`: DSM版本

### 3. 文件列表 (SYNO.FileStation.List)

```http
GET /webapi/entry.cgi?api=SYNO.FileStation.List&version=2&method=list_share&_sid={sid}
```

### 4. 上传文件 (SYNO.FileStation.Upload)

```http
POST /webapi/entry.cgi?api=SYNO.FileStation.Upload&version=2&method=upload&_sid={sid}
Content-Type: multipart/form-data

path=/volume1/homes/user/
file=@localfile.txt
```

### 5. 下载文件 (SYNO.FileStation.Download)

```http
GET /webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path={file_path}&mode=download&_sid={sid}
```

---

## 错误码对照

| 错误码 | 含义 |
|--------|------|
| 100 | 未知错误 |
| 101 | 无效参数 |
| 102 | API不存在 |
| 103 | 方法不存在 |
| 104 | 版本不支持 |
| 105 | 权限不足 |
| 106 | 会话超时 |
| 107 | 重复登录 |
| 400 | 无此文件或目录 |
| 401 | 无权限 |
| 402 | 系统繁忙 |

---

## GitHub开源库

### 1. synology-api (推荐)

**安装**: `pip install synology-api`

**GitHub**: https://github.com/N4S4/synology-api

**支持功能**:
- FileStation (文件管理)
- DownloadStation (下载任务)
- AudioStation (音乐)
- VideoStation (视频)
- Photos (照片)
- SurveillanceStation (监控)
- Core System (系统管理)
- 支持OTP两步验证
- 支持DSM 7.x

**示例**:
```python
from synology_api import filestation

fs = filestation.FileStation(
    ip_address='192.168.110.101',
    port='5000',
    username='fnvtk',
    password='Zhiqun1984',
    secure=False
)

# 列出文件
files = fs.get_file_list('/volume1/homes')
```

### 2. py-synologydsm-api (异步)

**安装**: `pip install py-synologydsm-api`

**GitHub**: https://github.com/mib1185/py-synologydsm-api

**特点**:
- 基于asyncio的异步API
- Home Assistant官方使用
- 支持系统信息、存储、网络监控

**示例**:
```python
import asyncio
from synology_dsm import SynologyDSM

async def main():
    api = SynologyDSM(None, '192.168.110.101', 5000, 'fnvtk', 'Zhiqun1984', False)
    await api.login()
    print(f"温度: {api.information.temperature}°C")
    await api.logout()

asyncio.run(main())
```

### 3. synology-drive-api

**安装**: `pip install synology-drive-api`

**GitHub**: https://github.com/zbjdonald/synology-drive-api

**专注**: Synology Drive文件同步和Office文档

---

## 本地配置速查

```python
# NAS-2 主节点配置
NAS_CONFIG = {
    "ip": "192.168.1.201",
    "port": 5000,
    "username": "fnvtk", 
    "password": "Zhiqun1984",
    "use_https": False
}

# 外网QuickConnect
QUICKCONNECT_URL = "https://udbfnvtk.quickconnect.cn"

# MongoDB连接
MONGO_URI = "mongodb://admin:admin123@192.168.1.201:27017/"

# SSH连接
SSH_CMD = """ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 \
    -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc \
    fnvtk@192.168.1.201"""
```
