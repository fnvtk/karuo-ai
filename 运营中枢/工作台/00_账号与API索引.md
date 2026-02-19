# 卡若 账号与 API 索引（明文存储）

> 本机及项目内、**本机服务器、网站**的账号、密码、API、Secret **明文集中存放**，方便日后调取。  
> 最后更新：2026-01-29

---

## ⚠️ 安全须知

- **勿提交 Git**：本文件已加入 `.gitignore`，切勿提交到仓库。
- **勿上传网盘/公开**：不要上传到公开或不可信网盘。
- **仅本机保管**：建议仅在本机与可信备份中保存。

---

## 目录

| 章节 | 内容 |
|------|------|
| 一 | 云服务与 API |
| 二 | 数据库 |
| 三 | 支付（微信/支付宝） |
| 四 | 邮箱 |
| 五 | **本机服务器（宝塔/SSH）** |
| 六 | 飞书 Token |
| 七 | 小程序 |
| 八 | **本机与网站账号密码**（浏览器/钥匙串 + 填写表） |
| 八b | **网络设备**（路由器/AP/交换机） |
| 九 | 本机其他凭证文件位置 |
| 十 | 联系方式 |

---

## 一、云服务与 API（明文）

### GitHub
| 项 | 值 |
|----|-----|
| Token | `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` |

### 腾讯云
| 项 | 值 |
|----|-----|
| APPID | `1251077262` |
| SecretId（密钥） | `AKIDjc6yO3nPeOuK2OKsJPBBVbTiiz0aPNHl` |
| SecretKey | （请到 控制台 → 访问管理 → API密钥 获取并填写，用于账单等 API） |

### 阿里云
| 项 | 值 |
|----|-----|
| AccessKey ID | `LTAI5t9zkiWmFtHG8qmtdysW` |
| Secret | `xxjXnZGLNvA2zDkj0aEBSQm3XZAaro` |

### v0.dev
| 项 | 值 |
|----|-----|
| URL | `https://api.v0.dev/v1` |
| Secret | `v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2` |
| 模型 | `claude-opus` |

### Gemini（卡若AI 工作台）
| 项 | 值 |
|----|-----|
| API Key | `AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8` |

### Gitea（CKB NAS 自建 Git）
| 项 | 值 |
|----|-----|
| 地址 | http://open.quwanzhi.com:3000 |
| 账号 | `fnvtk` |
| 密码 | `Zhiqun1984` |
| **HTTPS 推送** | `http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/{repo}.git` |
| HTTPS 访问 | http://open.quwanzhi.com:3000/fnvtk/{repo} |
| 新建仓库 API | `curl -u fnvtk:Zhiqun1984 -X POST http://open.quwanzhi.com:3000/api/v1/user/repos -H "Content-Type: application/json" -d '{"name":"xxx","description":"","private":false}'` |
| 说明 | 必须用 API 或 Web 创建仓库才能显示在界面；禁止 SSH mkdir+init；推送统一用 HTTPS |

---

## 二、数据库（明文）

### 卡若私域数据库
| 项 | 值 |
|----|-----|
| 主机 | `10.88.182.62:3306` |
| 账号 | `root` |
| 密码 | `Vtka(agu)-1` |

### 腾讯云数据库
| 项 | 值 |
|----|-----|
| 地址 | `56b4c23f6853c.gz.cdb.myqcloud.com:14413` |
| 账号 | `cdb_outerroot` |
| 密码 | `Zhiqun1984` |

---

## 三、支付（明文）

### 微信支付
| 项 | 值 |
|----|-----|
| 网站 AppID | `wx432c93e275548671` |
| 网站 AppSecret | `25b7e7fdb7998e5107e242ebb6ddabd0` |
| 服务号 AppID | `wx7c0dbf34ddba300d` |
| 服务号 AppSecret | `f865ef18c43dfea6cbe3b1f1aebdb82e` |
| MP 文件验证码 | `SP8AfZJyAvprRORT` |
| 商户号 | `1318592501` |
| 微信商户平台 API 密钥 | `wx3e31b068be59ddc131b068be59ddc2` |

### 支付宝
| 项 | 值 |
|----|-----|
| Pid | `2088511801157159` |
| MD5 密钥 | `lz6ey1h3kl9zqkgtjz3avb5gk37wzbrp` |
| 账户 | `zhengzhiqun@vip.qq.com` |

---

## 四、邮箱（明文）

| 项 | 值 |
|----|-----|
| 账号 | `zhiqun` |
| 密码 | `#vtk();1984` |
| 邮箱地址 | `zhiqun@qq.com` / `zhengzhiqun@vip.qq.com` / `15880802661@qq.com` |

---

## 五、本机服务器（宝塔 / SSH）（明文）

> 来源：卡若AI 金剑「服务器管理」SKILL。

### 服务器资产

| 名称 | IP | 配置 | 用途 | 宝塔面板地址 |
|------|-----|------|------|--------------|
| 小型宝塔 | 42.194.232.22 | 2核4G 5M | 主力部署（Node 项目） | https://42.194.232.22:9988/ckbpanel |
| 存客宝 | 42.194.245.239 | 2核16G 50M | 私域银行业务 | https://42.194.245.239:9988 |
| kr宝塔 | 43.139.27.93 | 2核4G 5M | 辅助服务器 | https://43.139.27.93:9988 |

### SSH 登录（root）

| 项 | 值 |
|----|-----|
| 密码（通用） | `Zhiqun1984` |
| 示例 | `ssh root@42.194.232.22` |

### 宝塔面板登录（小型宝塔为例）

| 项 | 值 |
|----|-----|
| 地址 | https://42.194.232.22:9988/ckbpanel |
| 账号 | `ckb` |
| 密码 | `zhiqun1984` |

### 宝塔 API 密钥

| 服务器 | API 密钥 |
|--------|----------|
| 小型宝塔 | `hsAWqFSi0GOCrunhmYdkxy92tBXfqYjd` |
| 存客宝 | `TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi` |
| kr宝塔 | `qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT` |

---

## 六、飞书 Token（明文）

| 项 | 值 |
|----|-----|
| access_token | `u-78RTHgrWN9np1RgBG_cWgo5lh9bk5kUjh20amN6001TM` |
| refresh_token | `ur-6Wu3DdR8h4TGJErCFjTarE5lhbzk5kirpO0aiN6000SA` |
| 说明 | 飞书用户，授权时间 2026-01-29；过期后需重新授权或刷新 |

**飞书任务优先命令行+API+TOKEN**：妙记/会议等流程与一键命令见 `运营中枢/参考资料/飞书任务_命令行与API优先_经验总结.md`。应用凭证（APP_ID/APP_SECRET）在智能纪要脚本内置或环境变量。

### 飞书项目（玩值电竞 · 账号金融 · 存客宝）

> 用于玩值电竞任务同步到飞书项目需求管理。任务安排见：`玩值电竞/水：流程规划/玩值电竞_双月任务安排（飞书项目版）.md`

| 项 | 值 |
|----|-----|
| Plugin ID | `MII_698EA68807C08CB2` |
| Plugin Secret | `63D218CF0E3B0CBC456B09FF4F7F2ED3` |
| FEISHU_PROJECT_KEY | `玩值电竞` |
| FEISHU_PROJECT_USER_KEY | `756877947514450739` |
| API 基址 | `https://project.feishu.cn` |
| Token 交换 | `POST /open_api/authen/plugin_token`（需 plugin_id + plugin_secret） |
| 创建工作项 | `POST /open_api/{project_key}/work_item/create`（需 X-PLUGIN-TOKEN + X-USER-KEY） |

---

## 七、小程序（明文）

### Soul 派对
| 项 | 值 |
|----|-----|
| AppID | `wxb8bbb2b10dec74aa` |
| 项目路径 | `/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/miniprogram` |
| API 域名 | `https://soul.quwanzhi.com` |
| 企业名称 | 泉州市卡若网络技术有限公司 |
| 组件联系电话 | `15880802661` |
| 联系邮箱 | `zhiqun@qq.com` |

---

## 八、本机与网站账号密码

> **说明**：苹果电脑本机登录密码（Mac 用户密码）与 Apple ID 密码由系统管理，无法自动读取，也**不建议**写入本文档；网站与浏览器里保存的账号已通过本机命令获取并整理如下，密码因加密需你在本机查看后填入。

### 8.0 本机已获取的网站/账号（来自 Chrome 与钥匙串）

> 已用本机命令从 **Chrome 登录数据** 和 **钥匙串** 中读取到以下「网址 + 账号」。**密码**因系统加密无法自动读取，请在本机打开 **Chrome → 设置 → 密码** 或 **钥匙串访问** 查看后填入下方 8.2 表。

#### Chrome 已保存的登录（网址 + 账号，密码需本机查看后填入 8.2）

| 网址 | 账号/手机/邮箱 |
|------|----------------|
| https://github.com/ | zhiqun@qq.com |
| https://xui.ptlogin2.qq.com/（QQ 登录） | 28533368 |
| https://auth.alipay.com/ | zhengzhiqun@vip.qq.com |
| https://authet2.alipay.com/ | 28533368@qq.com |
| https://wise.com/login | zhiqun@qq.com |
| https://kr-op.quwanzhi.com/ | 15880802661、18888888882 |
| https://kr-phone.quwanzhi.com/ | 18888888888 |
| https://mckb.quwanzhi.com/ | 13800138000 |
| http://kr-op.quwanzhi.com/login | 13779954946 |
| http://192.168.110.1/（路由器等） | 82243164@xmcm |

#### 本机钥匙串中涉及的应用/网站（密码需钥匙串访问中查看）

| 类型 | 名称 |
|------|------|
| 浏览器/应用加密钥 | Chromium Safe Storage、Chrome Safe Storage、Safari（WebCrypto）、Trae CN、剪映（JianyingPro） |
| 网站/服务 | gh:github.com（GitHub） |
| 应用 | 飞书（Suite App）、Doubao、WPS Office、Cursor、StorageExplorer、BDdr_Trae 等 |

*在「钥匙串访问」中搜索上述名称可找到对应条目，双击可查看/复制密码（需输入本机登录密码）。*

---

### 8.1 如何从本机查看并导出密码

| 来源 | 操作步骤 |
|------|----------|
| **macOS 钥匙串** | 打开「钥匙串访问」→ 左侧选「登录」→ 右侧选「密码」→ 搜索网站名或关键词 → 双击条目可查看/复制密码（需输入本机登录密码） |
| **Safari** | Safari → 设置 → 密码 → 输入本机密码或 Touch ID → 可查看、复制、导出（可导出为 CSV 后把密码抄到下表） |
| **Chrome** | Chrome → 设置 → 密码与自动填充 → 密码（或地址栏输入 `chrome://settings/passwords`）→ 点击「眼睛」图标可查看、复制密码 |
| **Edge** | 设置 → 密码 → 查看已保存的密码 |

把从上述途径查到的**密码**填到下面 8.2 表对应行即可。

### 8.2 网站账号密码表（账号已部分填入，密码请本机查看后填写）

| 序号 | 网站名称 | 网址 | 账号/手机/邮箱 | 密码 | 备注 |
|------|----------|------|----------------|------|------|
| 1 | GitHub | https://github.com | zhiqun@qq.com | （Chrome/钥匙串查看） | |
| 2 | QQ 登录 | https://xui.ptlogin2.qq.com | 28533368 | （Chrome 查看） | |
| 3 | 支付宝 | https://auth.alipay.com | zhengzhiqun@vip.qq.com | （Chrome 查看） | |
| 4 | 支付宝（备） | https://authet2.alipay.com | 28533368@qq.com | （Chrome 查看） | |
| 5 | Wise | https://wise.com/login | zhiqun@qq.com | （Chrome 查看） | |
| 6 | 卡若运营台 kr-op | https://kr-op.quwanzhi.com | 15880802661 / 18888888882 | （Chrome 查看） | |
| 7 | 卡若手机端 kr-phone | https://kr-phone.quwanzhi.com | 18888888888 | （Chrome 查看） | |
| 8 | 存客宝 mckb | https://mckb.quwanzhi.com | 13800138000 | （Chrome 查看） | |
| 9 | kr-op 登录页 | http://kr-op.quwanzhi.com/login | 13779954946 | （Chrome 查看） | |
| 10 | 锐捷路由器（管理后台） | http://192.168.110.1 | admin | `Vtk()-1` | 锐捷Reyee EG105GW-E，管理后台用户名固定为 admin |
| 10a | 锐捷路由器（WiFi） | — | SSID: 卡若-4点起床的男人-2 | `Vtk()-1` | 5GHz WiFi，当前无加密 ⚠️ 需开启 WPA3 |
| 10b | 锐捷诺客云端运维 | https://cloud.ruijie.com.cn | 82243164@xmcm | （Chrome 查看） | Ruijie Cloud 远程管理 |
| 11 | 腾讯云 | https://console.cloud.tencent.com | | | |
| 12 | 阿里云 | https://ram.console.aliyun.com | | | |
| 13 | 微信公众平台 | https://mp.weixin.qq.com | | | |
| 14 | 微信支付商户 | https://pay.weixin.qq.com | | | |
| 15 | 飞书 | https://www.feishu.cn | | | |
| 16 | v0.dev | https://v0.dev | | | |
| 17 | Cursor | https://cursor.com | | | |
| 18 | （其他） | | | | |

*密码列请在本机按 8.1 打开 Chrome 或钥匙串查看后填入；填完后本文件即成为「本机 + 网站」账号密码的集中调取文档。*

---

## 八b、网络设备（路由器/AP/交换机）

> 本机局域网核心设备的 IP、登录方式、配置参数。  
> 最后更新：2026-02-15

### 锐捷 Reyee EG105GW-E（主路由器）

| 项 | 值 |
|----|-----|
| 型号 | Ruijie Reyee EG105GW-E（企业级无线网关） |
| 管理地址 | `http://192.168.110.1` |
| 管理用户名 | `admin` |
| 管理密码 | `Vtk()-1` |
| LAN IP / 子网 | 192.168.110.1 / 255.255.255.0 |
| WiFi SSID (5GHz) | 卡若-4点起床的男人-2 |
| WiFi 密码 | `Vtk()-1` |
| WiFi 安全模式 | 当前无加密 ⚠️（建议改为 WPA3） |
| WiFi 信道 | 64（5GHz DFS） |
| WiFi 频宽 | 80MHz |
| 路由器 MAC | 54:16:51:e0:ba:c8 |
| 外网 IP | 119.233.229.4 |
| DNS | 223.5.5.5（阿里 DNS） |
| 诺客云端运维 | https://cloud.ruijie.com.cn（账号 82243164@xmcm） |
| 连接方式 | 浏览器访问 `http://192.168.110.1` → 输入密码 `Vtk()-1` → 进入管理后台 |

#### 当前在线设备（2026-02-15 快照）

| 设备 | IP | MAC | 频段 | 信号 | 协商速率 |
|------|-----|-----|------|------|----------|
| MacBook Pro（卡若） | 192.168.110.14 | 62:82:b4:c5:51:43 | 5GHz | -66 dBm | 144 Mbps |
| 未知设备 | 192.168.110.81 | 86:1e:6f:ac:a1:70 | 5GHz | -71 dBm | 216 Mbps |

---

## 九、本机其他凭证文件位置

> 以下文件在本机存在，其中可能含账号/密码/API；需在本机打开对应路径查看，必要时可把常用项抄到上文对应章节。

| 说明 | 路径或位置 |
|------|-------------|
| 微信管理配置 | `~/.config/wechat_manager/config.yaml`（含 db_key、ai.api_key 等） |
| 存客宝备份 .env | `卡若AI/01_卡资（金）/_团队成员/金盾/存客宝备份/cunkebao_v3/Cunkebao/` 下 `.env.development`、`.env.local`、`.env.production` |
| 开发目录 .env（示例） | `开发/2、私域银行/工作手机/sdk/.env`、`开发/2、私域银行/cunkebao_v3/` 下各项目 `.env.*`、`开发/3、自营项目/上帝之眼/backend/.env` 等；具体以本机 `开发` 目录下 `.env`、`.env.local`、`.env.production` 为准 |

---

## 十、联系方式（备忘）

| 项 | 值 |
|----|-----|
| 电话 | 15880802661 |
| 微信 | 28533368 |
