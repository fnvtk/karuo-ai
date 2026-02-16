# 小程序管理技能 v3.0

> 📅 创建日期：2026-01-25
> 📅 更新日期：2026-01-25（v3.0 全能版）
> 📋 通过微信开放平台API完整管理小程序的全生命周期：申请、认证、开发、审核、发布、运营
> 🚀 支持多小程序管理、一键部署、自动认证检查、汇总报告

---

## 🎯 能力全景图

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        小程序管理技能 v3.0 能力全景图                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                        🔧 工具整合层                                  │    ║
║   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │    ║
║   │  │ 微信开发者  │  │ miniprogram │  │ 开放平台    │  │ GitHub    │  │    ║
║   │  │ 工具 CLI    │  │ -ci (npm)   │  │ API         │  │ Actions   │  │    ║
║   │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                        📦 核心功能层                                  │    ║
║   │                                                                       │    ║
║   │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐          │    ║
║   │   │ 多小程序 │    │ 项目    │    │ 一键    │    │ 汇总    │          │    ║
║   │   │ 管理    │    │ 检查    │    │ 部署    │    │ 报告    │          │    ║
║   │   └─────────┘    └─────────┘    └─────────┘    └─────────┘          │    ║
║   │                                                                       │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                        🚀 部署流程                                    │    ║
║   │                                                                       │    ║
║   │    ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐  │    ║
║   │    │ 检查 │ → │ 编译 │ → │ 上传 │ → │ 提审 │ → │ 审核 │ → │ 发布 │  │    ║
║   │    │check │   │build │   │upload│   │audit │   │wait  │   │release│  │    ║
║   │    └──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘  │    ║
║   │       │          │          │          │          │          │       │    ║
║   │       ▼          ▼          ▼          ▼          ▼          ▼       │    ║
║   │    自动化      自动化     自动化     自动化     等待      手动/自动  │    ║
║   │                                                1-7天               │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📊 命令速查表

| 命令 | 说明 | 示例 |
|------|------|------|
| `mp_full.py report` | 生成所有小程序汇总报告 | `python3 mp_full.py report` |
| `mp_full.py check` | 检查项目问题 | `python3 mp_full.py check soul-party` |
| `mp_full.py auto` | 全自动部署（上传+提审） | `python3 mp_full.py auto soul-party` |
| `mp_deploy.py list` | 列出所有小程序 | `python3 mp_deploy.py list` |
| `mp_deploy.py add` | 添加新小程序 | `python3 mp_deploy.py add` |
| `mp_deploy.py cert-status` | 查询认证状态 | `python3 mp_deploy.py cert-status soul-party` |
| `mp_deploy.py cert-done` | 标记认证完成 | `python3 mp_deploy.py cert-done soul-party` |
| `mp_deploy.py release` | 发布上线 | `python3 mp_deploy.py release soul-party` |

---

## 🎯 技能概述

本技能用于通过API实现微信小程序的完整管理，包括：

### 核心能力

| 阶段 | 能力 | 说明 |
|------|------|------|
| **申请** | 快速注册小程序 | 复用公众号主体资质，无需300元认证费 |
| **认证** | 企业认证管理 | 自动检查认证状态、提醒过期、材料管理 |
| **配置** | 基础信息设置 | 名称、头像、介绍、类目管理 |
| **开发** | 代码管理 | 上传代码、生成体验版 |
| **审核** | 提审发布 | 提交审核、查询状态、撤回、发布 |
| **运营** | 接口管理 | 域名配置、隐私协议、接口权限 |
| **推广** | 小程序码 | 生成无限量小程序码 |
| **数据** | 数据分析 | 访问数据、用户画像 |

### v2.0 新增能力

| 能力 | 命令 | 说明 |
|------|------|------|
| **多小程序管理** | `mp_deploy.py list` | 统一管理多个小程序 |
| **一键部署** | `mp_deploy.py deploy <id>` | 编译→上传→提审一步完成 |
| **认证管理** | `mp_deploy.py cert <id>` | 认证状态检查、材料管理 |
| **快速上传** | `mp_deploy.py upload <id>` | 快速上传代码到开发版 |

### 开源工具集成

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| **miniprogram-ci** | 微信官方CI工具 | `npm install miniprogram-ci -g` |
| **微信开发者工具CLI** | 本地编译上传 | 安装开发者工具自带 |
| **multi-mini-ci** | 多平台小程序上传 | GitHub开源 |

---

## 🚀 触发词

- 管理小程序
- 小程序申请
- 小程序审核
- 小程序发布
- 上传小程序代码
- 配置小程序域名
- 生成小程序码
- 查看小程序状态

---

## 🏗️ 技术架构

### 管理方式对比

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **微信后台手动操作** | 无需开发 | 效率低，无法批量 | 单个小程序 |
| **微信开发者工具CLI** | 简单易用 | 功能有限 | 开发测试 |
| **开放平台API（本方案）** | 功能完整、可自动化 | 需要开发 | 批量管理、自动化 |

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          小程序管理引擎 v1.0                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          第一层：认证层                               │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │   │
│   │  │ 第三方平台    │    │  component_   │    │ authorizer_   │       │   │
│   │  │ 认证信息      │ →  │  access_token │ →  │ access_token  │       │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          第二层：管理API层                            │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│   │  │ 注册    │ │ 配置    │ │ 代码    │ │ 审核    │ │ 运营    │       │   │
│   │  │ 管理    │ │ 管理    │ │ 管理    │ │ 管理    │ │ 管理    │       │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          第三层：本地CLI层                            │   │
│   │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │   │
│   │  │ mp_manager.py │    │  微信开发者    │    │  自动化脚本   │       │   │
│   │  │ Python CLI    │    │  工具 CLI     │    │  Shell       │       │   │
│   │  └───────────────┘    └───────────────┘    └───────────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 前置条件

### 1. 微信开放平台账号

- 注册地址：https://open.weixin.qq.com/
- 完成开发者资质认证（需企业资质）

### 2. 创建第三方平台

登录开放平台后台 → 管理中心 → 第三方平台 → 创建

**必填信息**：
- 平台名称
- 服务类型（选择"平台型"可管理多个小程序）
- 授权发起页域名
- 消息与事件接收URL

### 3. 获取关键凭证

| 凭证 | 说明 | 获取方式 |
|------|------|----------|
| `component_appid` | 第三方平台AppID | 开放平台后台 |
| `component_appsecret` | 第三方平台密钥 | 开放平台后台 |
| `component_verify_ticket` | 验证票据 | 微信每10分钟推送 |
| `component_access_token` | 平台调用凭证 | API获取，2小时有效 |
| `authorizer_access_token` | 授权方调用凭证 | API获取，2小时有效 |

---

## 🔑 认证流程

### 获取 component_access_token

```python
# POST https://api.weixin.qq.com/cgi-bin/component/api_component_token
{
    "component_appid": "你的第三方平台AppID",
    "component_appsecret": "你的第三方平台密钥",
    "component_verify_ticket": "微信推送的验证票据"
}

# 返回
{
    "component_access_token": "xxxx",
    "expires_in": 7200
}
```

### 获取预授权码

```python
# POST https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode
{
    "component_appid": "你的第三方平台AppID"
}

# 返回
{
    "pre_auth_code": "xxxx",
    "expires_in": 600
}
```

### 引导用户授权

```
https://mp.weixin.qq.com/cgi-bin/componentloginpage?
component_appid=第三方平台AppID&
pre_auth_code=预授权码&
redirect_uri=授权回调地址&
auth_type=1  # 1=仅小程序，2=仅公众号，3=两者都可
```

### 获取 authorizer_access_token

```python
# POST https://api.weixin.qq.com/cgi-bin/component/api_query_auth
{
    "component_appid": "第三方平台AppID",
    "authorization_code": "授权回调返回的code"
}

# 返回
{
    "authorization_info": {
        "authorizer_appid": "授权方AppID",
        "authorizer_access_token": "授权方调用凭证",
        "expires_in": 7200,
        "authorizer_refresh_token": "刷新令牌"
    }
}
```

---

## 📱 核心API接口

### 一、小程序注册

#### 1.1 复用公众号资质快速注册

**前提**：已有认证的公众号

```python
# POST https://api.weixin.qq.com/cgi-bin/account/fastregister?access_token=ACCESS_TOKEN
{
    "ticket": "公众号扫码授权的ticket"
}

# 返回
{
    "errcode": 0,
    "errmsg": "ok",
    "appid": "新注册的小程序AppID",
    "authorization_code": "授权码"
}
```

**优势**：
- 无需重新提交主体材料
- 无需对公打款
- 无需支付300元认证费

**限制**：
- 非个体户：每月可注册5个
- 个体户：每月可注册1个

#### 1.2 快速注册企业小程序

**前提**：有企业营业执照

```python
# POST https://api.weixin.qq.com/cgi-bin/component/fastregisterminiprogram
{
    "name": "小程序名称",
    "code": "统一社会信用代码",
    "code_type": 1,  # 1=营业执照
    "legal_persona_wechat": "法人微信号",
    "legal_persona_name": "法人姓名",
    "component_phone": "联系电话"
}
```

---

### 二、基础信息配置

#### 2.1 获取基础信息

```python
# POST https://api.weixin.qq.com/cgi-bin/account/getaccountbasicinfo
# 无请求参数

# 返回
{
    "appid": "小程序AppID",
    "account_type": 2,  # 2=小程序
    "principal_type": 1,  # 1=企业
    "principal_name": "主体名称",
    "realname_status": 1,  # 1=已认证
    "nickname": "小程序名称",
    "head_image_url": "头像URL",
    "signature": "简介"
}
```

#### 2.2 修改名称

```python
# POST https://api.weixin.qq.com/wxa/setnickname?access_token=ACCESS_TOKEN
{
    "nick_name": "新名称",
    "id_card": "管理员身份证号",
    "license": "营业执照media_id",  # 需要先上传
    "naming_other_stuff_1": "其他证明material_id"  # 可选
}
```

#### 2.3 修改头像

```python
# POST https://api.weixin.qq.com/cgi-bin/account/modifyheadimage?access_token=ACCESS_TOKEN
{
    "head_img_media_id": "头像图片media_id",  # 需要先上传
    "x1": 0, "y1": 0, "x2": 1, "y2": 1  # 裁剪区域
}
```

#### 2.4 修改简介

```python
# POST https://api.weixin.qq.com/cgi-bin/account/modifysignature?access_token=ACCESS_TOKEN
{
    "signature": "新的简介内容"  # 4-120字
}
```

---

### 三、类目管理

#### 3.1 获取可选类目

```python
# GET https://api.weixin.qq.com/cgi-bin/wxopen/getallcategories?access_token=ACCESS_TOKEN
```

#### 3.2 获取已设置类目

```python
# GET https://api.weixin.qq.com/cgi-bin/wxopen/getcategory?access_token=ACCESS_TOKEN
```

#### 3.3 添加类目

```python
# POST https://api.weixin.qq.com/cgi-bin/wxopen/addcategory?access_token=ACCESS_TOKEN
{
    "categories": [
        {
            "first": 1,     # 一级类目ID
            "second": 2,    # 二级类目ID
            "certicates": [ # 资质证明
                {"key": "资质名称", "value": "media_id"}
            ]
        }
    ]
}
```

#### 3.4 删除类目

```python
# POST https://api.weixin.qq.com/cgi-bin/wxopen/deletecategory?access_token=ACCESS_TOKEN
{
    "first": 1,
    "second": 2
}
```

---

### 四、域名配置

#### 4.1 设置服务器域名

```python
# POST https://api.weixin.qq.com/wxa/modify_domain?access_token=ACCESS_TOKEN
{
    "action": "set",  # add/delete/set/get
    "requestdomain": ["https://api.example.com"],
    "wsrequestdomain": ["wss://ws.example.com"],
    "uploaddomain": ["https://upload.example.com"],
    "downloaddomain": ["https://download.example.com"],
    "udpdomain": ["udp://udp.example.com"],
    "tcpdomain": ["tcp://tcp.example.com"]
}
```

#### 4.2 设置业务域名

```python
# POST https://api.weixin.qq.com/wxa/setwebviewdomain?access_token=ACCESS_TOKEN
{
    "action": "set",  # add/delete/set/get
    "webviewdomain": ["https://web.example.com"]
}
```

---

### 五、隐私协议配置

#### 5.1 获取隐私协议设置

```python
# POST https://api.weixin.qq.com/cgi-bin/component/getprivacysetting?access_token=ACCESS_TOKEN
{
    "privacy_ver": 2  # 1=当前版本，2=开发版本
}
```

#### 5.2 设置隐私协议

```python
# POST https://api.weixin.qq.com/cgi-bin/component/setprivacysetting?access_token=ACCESS_TOKEN
{
    "privacy_ver": 2,
    "setting_list": [
        {
            "privacy_key": "UserInfo",
            "privacy_text": "用于展示用户头像和昵称"
        },
        {
            "privacy_key": "Location",
            "privacy_text": "用于获取您的位置信息以推荐附近服务"
        },
        {
            "privacy_key": "PhoneNumber",
            "privacy_text": "用于登录验证和订单通知"
        }
    ],
    "owner_setting": {
        "contact_email": "contact@example.com",
        "contact_phone": "15880802661",
        "notice_method": "弹窗提示"
    }
}
```

**常用隐私字段**：

| privacy_key | 说明 |
|-------------|------|
| `UserInfo` | 用户信息（头像、昵称） |
| `Location` | 地理位置 |
| `PhoneNumber` | 手机号 |
| `Album` | 相册 |
| `Camera` | 相机 |
| `Record` | 麦克风 |
| `Clipboard` | 剪切板 |
| `MessageFile` | 微信消息中的文件 |
| `ChooseAddress` | 收货地址 |
| `BluetoothInfo` | 蓝牙 |

---

### 六、代码管理

#### 6.1 上传代码

```python
# POST https://api.weixin.qq.com/wxa/commit?access_token=ACCESS_TOKEN
{
    "template_id": 1,  # 代码模板ID
    "ext_json": "{\"extAppid\":\"授权方AppID\",\"ext\":{}}",
    "user_version": "1.0.0",
    "user_desc": "版本描述"
}
```

**注意**：需要先在第三方平台创建代码模板

#### 6.2 获取体验版二维码

```python
# GET https://api.weixin.qq.com/wxa/get_qrcode?access_token=ACCESS_TOKEN&path=pages/index/index
# 返回二维码图片
```

#### 6.3 获取已上传的代码页面列表

```python
# GET https://api.weixin.qq.com/wxa/get_page?access_token=ACCESS_TOKEN

# 返回
{
    "errcode": 0,
    "page_list": ["pages/index/index", "pages/my/my"]
}
```

---

### 七、审核管理

#### 7.1 提交审核

```python
# POST https://api.weixin.qq.com/wxa/submit_audit?access_token=ACCESS_TOKEN
{
    "item_list": [
        {
            "address": "pages/index/index",
            "tag": "电子书 阅读 创业",
            "first_class": "教育",
            "second_class": "在线教育",
            "first_id": 1,
            "second_id": 2,
            "title": "首页"
        }
    ],
    "preview_info": {
        "video_id_list": [],
        "pic_id_list": []
    },
    "version_desc": "版本说明",
    "feedback_info": "反馈内容",
    "feedback_stuff": "media_id"  # 反馈附件
}
```

#### 7.2 查询审核状态

```python
# POST https://api.weixin.qq.com/wxa/get_auditstatus?access_token=ACCESS_TOKEN
{
    "auditid": 1234567890
}

# 返回
{
    "errcode": 0,
    "status": 0,  # 0=审核成功，1=审核被拒，2=审核中，3=已撤回，4=审核延后
    "reason": "拒绝原因",  # status=1时返回
    "screenshot": "截图"
}
```

#### 7.3 查询最新审核状态

```python
# GET https://api.weixin.qq.com/wxa/get_latest_auditstatus?access_token=ACCESS_TOKEN
```

#### 7.4 撤回审核

```python
# GET https://api.weixin.qq.com/wxa/undocodeaudit?access_token=ACCESS_TOKEN
```

**限制**：单个小程序每天只能撤回1次

---

### 八、发布管理

#### 8.1 发布已审核通过的版本

```python
# POST https://api.weixin.qq.com/wxa/release?access_token=ACCESS_TOKEN
{}  # 无请求参数

# 返回
{
    "errcode": 0,
    "errmsg": "ok"
}
```

#### 8.2 版本回退

```python
# GET https://api.weixin.qq.com/wxa/revertcoderelease?access_token=ACCESS_TOKEN
```

**限制**：只能回退到上一个版本，且只能回退一次

#### 8.3 获取可回退版本历史

```python
# GET https://api.weixin.qq.com/wxa/revertcoderelease?access_token=ACCESS_TOKEN&action=get_history_version
```

#### 8.4 分阶段发布

```python
# POST https://api.weixin.qq.com/wxa/grayrelease?access_token=ACCESS_TOKEN
{
    "gray_percentage": 10  # 灰度比例 1-100
}
```

---

### 九、小程序码生成

#### 9.1 获取小程序码（有限制）

```python
# POST https://api.weixin.qq.com/wxa/getwxacode?access_token=ACCESS_TOKEN
{
    "path": "pages/index/index?scene=123",
    "width": 430,
    "auto_color": false,
    "line_color": {"r": 0, "g": 0, "b": 0},
    "is_hyaline": false  # 是否透明背景
}
# 返回图片二进制
```

**限制**：每个path只能生成10万个

#### 9.2 获取无限小程序码（推荐）

```python
# POST https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=ACCESS_TOKEN
{
    "scene": "user_id=123&from=share",  # 最长32字符
    "page": "pages/index/index",  # 必须是已发布的页面
    "width": 430,
    "auto_color": false,
    "line_color": {"r": 0, "g": 0, "b": 0},
    "is_hyaline": false
}
# 返回图片二进制
```

**注意**：scene参数需要在小程序中用`onLoad(options)`解析

#### 9.3 生成小程序短链接

```python
# POST https://api.weixin.qq.com/wxa/genwxashortlink?access_token=ACCESS_TOKEN
{
    "page_url": "pages/index/index?id=123",
    "page_title": "页面标题",
    "is_permanent": false  # 是否永久有效
}

# 返回
{
    "errcode": 0,
    "link": "https://wxaurl.cn/xxxx"
}
```

---

### 十、接口权限管理

#### 10.1 查询接口调用额度

```python
# POST https://api.weixin.qq.com/cgi-bin/openapi/quota/get?access_token=ACCESS_TOKEN
{
    "cgi_path": "/wxa/getwxacode"
}

# 返回
{
    "quota": {
        "daily_limit": 100000,
        "used": 500,
        "remain": 99500
    }
}
```

#### 10.2 重置接口调用次数

```python
# POST https://api.weixin.qq.com/cgi-bin/clear_quota?access_token=ACCESS_TOKEN
{
    "appid": "小程序AppID"
}
```

**限制**：每月只能重置10次

---

### 十一、数据分析

#### 11.1 获取访问趋势

```python
# POST https://api.weixin.qq.com/datacube/getweanalysisappiddailyvisittrend?access_token=ACCESS_TOKEN
{
    "begin_date": "20260101",
    "end_date": "20260125"
}

# 返回
{
    "list": [
        {
            "ref_date": "20260125",
            "session_cnt": 1000,      # 打开次数
            "visit_pv": 5000,         # 访问次数
            "visit_uv": 800,          # 访问人数
            "visit_uv_new": 100,      # 新用户数
            "stay_time_uv": 120.5,    # 人均停留时长（秒）
            "stay_time_session": 60.2 # 次均停留时长（秒）
        }
    ]
}
```

#### 11.2 获取用户画像

```python
# POST https://api.weixin.qq.com/datacube/getweanalysisappiduserportrait?access_token=ACCESS_TOKEN
{
    "begin_date": "20260101",
    "end_date": "20260125"
}
```

---

## 🛠️ 快速使用

### 方式一：使用Python管理脚本（推荐）

```bash
# 进入脚本目录
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/小程序管理/scripts

# 安装依赖
pip install httpx python-dotenv

# 配置凭证
cp .env.example .env
# 编辑 .env 填入你的凭证

# 使用命令行工具
python mp_manager.py status    # 查看小程序状态
python mp_manager.py audit     # 查看审核状态
python mp_manager.py release   # 发布上线
python mp_manager.py qrcode    # 生成小程序码
```

### 方式二：使用微信开发者工具CLI

```bash
# CLI路径
CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"

# 打开项目
$CLI -o "/path/to/miniprogram"

# 编译
$CLI build-npm --project "/path/to/miniprogram"

# 预览（生成二维码）
$CLI preview --project "/path/to/miniprogram" --qr-format image --qr-output preview.png

# 上传代码
$CLI upload --project "/path/to/miniprogram" --version "1.0.0" --desc "版本说明"

# 提交审核
$CLI submit-audit --project "/path/to/miniprogram"
```

### 方式三：直接调用API

```python
import httpx

# 配置
ACCESS_TOKEN = "你的access_token"
BASE_URL = "https://api.weixin.qq.com"

async def check_audit_status(auditid: int):
    """查询审核状态"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/wxa/get_auditstatus?access_token={ACCESS_TOKEN}",
            json={"auditid": auditid}
        )
        return resp.json()

# 使用
result = await check_audit_status(1234567890)
print(result)
```

---

## 📁 文件结构

```
小程序管理/
├── SKILL.md                        # 技能说明文档（本文件）
├── scripts/
│   ├── mp_manager.py               # 小程序管理CLI工具
│   ├── mp_api.py                   # API封装类
│   ├── requirements.txt            # Python依赖
│   └── .env.example                # 环境变量模板
└── references/
    ├── API接口速查表.md             # 常用API速查
    ├── 隐私协议填写指南.md           # 隐私协议配置指南
    └── 审核规范.md                  # 审核常见问题
```

---

## ⚠️ 常见问题

### Q1: 如何获取 component_verify_ticket？

微信会每10分钟向你配置的"消息与事件接收URL"推送。你需要部署一个服务来接收并存储它。

```python
# 接收推送示例
@app.post("/callback")
async def receive_ticket(request: Request):
    xml_data = await request.body()
    # 解密并解析XML
    # 提取 ComponentVerifyTicket
    # 存储到Redis或数据库
    return "success"
```

### Q2: 审核被拒常见原因？

| 原因 | 解决方案 |
|------|----------|
| 类目不符 | 确保小程序功能与所选类目一致 |
| 隐私协议缺失 | 配置完整的隐私保护指引 |
| 诱导分享 | 移除"分享到群获取xx"等诱导文案 |
| 虚拟支付 | iOS不能使用虚拟支付，需走IAP |
| 内容违规 | 检查文案、图片是否合规 |
| 功能不完整 | 确保所有页面功能正常 |

### Q3: 审核需要多长时间？

- 首次提审：1-7个工作日
- 非首次：1-3个工作日
- 加急审核：付费服务，24小时内

### Q4: 如何提高审核通过率？

1. **提交完整测试账号**：如需登录才能体验功能
2. **录制操作视频**：复杂功能建议附上操作视频
3. **详细的版本描述**：说明本次更新内容
4. **完善隐私协议**：所有收集数据的接口都要说明用途

### Q5: 代码模板是什么？

第三方平台需要先将小程序代码上传到"草稿箱"，再添加到"代码模板库"。之后可以用这个模板批量部署到多个小程序。

流程：开发完成 → 上传到草稿箱 → 添加到模板库 → 使用模板部署

---

## 🔗 官方文档

- [微信开放平台文档](https://developers.weixin.qq.com/doc/oplatform/)
- [第三方平台开发指南](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/getting_started/how_to_read.html)
- [小程序管理接口](https://developers.weixin.qq.com/doc/oplatform/openApi/OpenApiDoc/)
- [代码管理接口](https://developers.weixin.qq.com/doc/oplatform/openApi/OpenApiDoc/miniprogram-management/code-management/commit.html)
- [隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)

---

## 📊 当前项目配置

### Soul派对小程序

| 项目 | 配置值 |
|------|--------|
| **AppID** | `wxb8bbb2b10dec74aa` |
| **项目路径** | `/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/miniprogram` |
| **API域名** | `https://soul.quwanzhi.com` |
| **当前版本** | `1.0.13` |
| **认证状态** | ⏳ 审核中（等待1-5工作日） |
| **检查结果** | ✅ 8项通过 / ⚠️ 2项警告 / ❌ 0项错误 |
| **可上传** | ✅ 是 |
| **可发布** | ❌ 需等待认证通过 |

### 快速命令

```bash
# 打开项目
/Applications/wechatwebdevtools.app/Contents/MacOS/cli -o "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/miniprogram"

# 预览
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/miniprogram" --qr-format image --qr-output preview.png

# 上传
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload --project "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/miniprogram" --version "1.0.0" --desc "版本说明"
```

---

## 🚀 全自动部署流程（v3.0）

### 完整生命周期流程图

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        小程序完整生命周期管理                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   阶段一：准备阶段                                                             ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                                                                       │    ║
║   │    ┌──────────┐      ┌──────────┐      ┌──────────┐                  │    ║
║   │    │ 注册小程序│  →   │ 企业认证  │  →   │ 配置项目  │                  │    ║
║   │    │ (微信后台)│      │ (300元/年)│      │ (添加到管理)│                 │    ║
║   │    └──────────┘      └──────────┘      └──────────┘                  │    ║
║   │         │                  │                  │                       │    ║
║   │         │                  │                  ▼                       │    ║
║   │         │                  │         mp_deploy.py add                │    ║
║   │         │                  ▼                                          │    ║
║   │         │         等待审核 1-5 天                                      │    ║
║   │         │         mp_deploy.py cert-done                             │    ║
║   │                                                                       │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║   阶段二：开发阶段                                                             ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                                                                       │    ║
║   │    ┌──────────┐      ┌──────────┐      ┌──────────┐                  │    ║
║   │    │ 编写代码  │  →   │ 本地测试  │  →   │ 项目检查  │                  │    ║
║   │    │ (开发者)  │      │ (模拟器)  │      │ mp_full   │                  │    ║
║   │    └──────────┘      └──────────┘      └──────────┘                  │    ║
║   │                                               │                       │    ║
║   │                                               ▼                       │    ║
║   │                                    mp_full.py check <id>             │    ║
║   │                                    检查: 配置/域名/隐私/认证          │    ║
║   │                                                                       │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║   阶段三：部署阶段（全自动）                                                    ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                                                                       │    ║
║   │         mp_full.py auto <id> -v "1.0.0" -d "版本描述"                │    ║
║   │                              │                                        │    ║
║   │                              ▼                                        │    ║
║   │    ┌──────────┐      ┌──────────┐      ┌──────────┐                  │    ║
║   │    │ ① 检查   │  →   │ ② 上传   │  →   │ ③ 提审   │                  │    ║
║   │    │ 项目问题  │      │ 代码到微信│      │ 提交审核  │                  │    ║
║   │    └──────────┘      └──────────┘      └──────────┘                  │    ║
║   │         │                  │                  │                       │    ║
║   │         ▼                  ▼                  ▼                       │    ║
║   │    自动检测           使用CLI/npm         已认证→API提审             │    ║
║   │    配置/认证/域名      优先级选择          未认证→手动提审            │    ║
║   │                                                                       │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║   阶段四：发布阶段                                                             ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                                                                       │    ║
║   │    ┌──────────┐      ┌──────────┐      ┌──────────┐                  │    ║
║   │    │ 等待审核  │  →   │ 审核通过  │  →   │ 发布上线  │                  │    ║
║   │    │ 1-7工作日 │      │ 通知     │      │ release  │                  │    ║
║   │    └──────────┘      └──────────┘      └──────────┘                  │    ║
║   │                                               │                       │    ║
║   │                                               ▼                       │    ║
║   │                                    mp_deploy.py release <id>         │    ║
║   │                                    或 微信后台点击发布                │    ║
║   │                                                                       │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║   阶段五：运营阶段                                                             ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │                                                                       │    ║
║   │    ┌──────────┐      ┌──────────┐      ┌──────────┐                  │    ║
║   │    │ 数据分析  │      │ 汇总报告  │      │ 版本迭代  │                  │    ║
║   │    │ mp_manager│      │ mp_full   │      │ 循环部署  │                  │    ║
║   │    └──────────┘      └──────────┘      └──────────┘                  │    ║
║   │         │                  │                  │                       │    ║
║   │         ▼                  ▼                  ▼                       │    ║
║   │    data命令          report命令         返回部署阶段                 │    ║
║   │                                                                       │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 工具整合架构图

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           小程序管理工具整合架构                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         用户命令层                                    │  │
│   │   mp_full.py report  │  mp_full.py check  │  mp_full.py auto        │  │
│   │   mp_deploy.py list  │  mp_deploy.py cert │  mp_manager.py status   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         Python 管理层                                 │  │
│   │   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │  │
│   │   │ mp_full.py    │   │ mp_deploy.py  │   │ mp_api.py     │         │  │
│   │   │ 全能管理器    │   │ 部署工具      │   │ API封装       │         │  │
│   │   │ • 检查        │   │ • 多小程序    │   │ • 认证        │         │  │
│   │   │ • 报告        │   │ • 认证管理    │   │ • 审核        │         │  │
│   │   │ • 自动部署    │   │ • 发布        │   │ • 发布        │         │  │
│   │   └───────────────┘   └───────────────┘   └───────────────┘         │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         外部工具层                                    │  │
│   │   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │  │
│   │   │ 微信开发者    │   │ miniprogram   │   │ 微信开放平台  │         │  │
│   │   │ 工具 CLI      │   │ -ci (npm)     │   │ API           │         │  │
│   │   │               │   │               │   │               │         │  │
│   │   │ • 打开项目    │   │ • 上传代码    │   │ • 提交审核    │         │  │
│   │   │ • 预览        │   │ • 预览        │   │ • 发布        │         │  │
│   │   │ • 上传        │   │ • 构建npm     │   │ • 认证管理    │         │  │
│   │   │ • 编译        │   │ • sourceMap   │   │ • 数据分析    │         │  │
│   │   └───────────────┘   └───────────────┘   └───────────────┘         │  │
│   │          │                    │                    │                 │  │
│   │          ▼                    ▼                    ▼                 │  │
│   │    优先级: 1            优先级: 2            优先级: 3               │  │
│   │    (无需密钥)           (需要密钥)           (需要token)             │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 快速开始

```bash
# 进入脚本目录
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/小程序管理/scripts

# 1. 查看已配置的小程序
python3 mp_deploy.py list

# 2. 添加新小程序（交互式）
python3 mp_deploy.py add

# 3. 检查认证状态
python3 mp_deploy.py cert-status soul-party

# 4. 一键部署
python3 mp_deploy.py deploy soul-party

# 5. 审核通过后发布
python3 mp_deploy.py release soul-party
```

### 命令速查

| 命令 | 说明 | 示例 |
|------|------|------|
| `list` | 列出所有小程序 | `python3 mp_deploy.py list` |
| `add` | 添加新小程序 | `python3 mp_deploy.py add` |
| `deploy` | 一键部署 | `python3 mp_deploy.py deploy soul-party` |
| `upload` | 仅上传代码 | `python3 mp_deploy.py upload soul-party` |
| `cert` | 提交认证 | `python3 mp_deploy.py cert soul-party` |
| `cert-status` | 查询认证状态 | `python3 mp_deploy.py cert-status soul-party` |
| `cert-done` | 标记认证完成 | `python3 mp_deploy.py cert-done soul-party` |
| `release` | 发布上线 | `python3 mp_deploy.py release soul-party` |

---

## 📋 企业认证详解

### 认证流程图

```
┌──────────────────────────────────────────────────────────────┐
│                      企业认证流程                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│   │ 准备    │ →   │ 提交    │ →   │ 审核    │               │
│   │ 材料    │     │ 认证    │     │ 等待    │               │
│   └─────────┘     └─────────┘     └─────────┘               │
│        │               │               │                     │
│        ↓               ↓               ↓                     │
│   ┌─────────────────────────────────────────┐               │
│   │ • 营业执照       • 微信后台上传    • 1-5工作日  │               │
│   │ • 法人身份证     • 法人扫码验证    • 审核结果   │               │
│   │ • 法人微信号     • 支付300元       • 通知       │               │
│   └─────────────────────────────────────────┘               │
│                                                               │
│   ⚠️ 认证有效期：1年，到期需年审                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 认证材料清单

| 材料 | 必需 | 说明 |
|------|------|------|
| 企业营业执照 | ✅ | 扫描件或照片，信息清晰 |
| 法人身份证 | ✅ | 正反面照片 |
| 法人微信号 | ✅ | 需绑定银行卡，用于扫码验证 |
| 联系人手机号 | ✅ | 接收审核通知 |
| 认证费用 | ✅ | 300元/年 |
| 其他资质 | 可选 | 特殊行业需要（如医疗、金融） |

### 认证状态说明

| 状态 | 说明 | 下一步操作 |
|------|------|------------|
| `unknown` | 未知/未检查 | 运行 `cert-status` 检查 |
| `pending` | 审核中 | 等待1-5个工作日 |
| `verified` | 已认证 | 可以正常发布 |
| `rejected` | 被拒绝 | 查看原因，修改后重新提交 |
| `expired` | 已过期 | 需要重新认证（年审） |

### 认证API（第三方平台）

如果你有第三方平台资质，可以通过API代商家提交认证：

```python
# POST https://api.weixin.qq.com/wxa/sec/wxaauth?access_token=ACCESS_TOKEN
{
    "auth_type": 1,  # 1=企业
    "auth_data": {
        "name": "企业名称",
        "code": "统一社会信用代码",
        "legal_persona_wechat": "法人微信号",
        "legal_persona_name": "法人姓名",
        "legal_persona_idcard": "法人身份证号",
        "component_phone": "联系电话"
    }
}
```

---

## 🔧 GitHub开源工具推荐

### 1. miniprogram-ci（官方）

微信官方提供的CI工具，支持Node.js环境使用。

**安装**：
```bash
npm install miniprogram-ci -g
```

**使用**：
```javascript
const ci = require('miniprogram-ci');

const project = new ci.Project({
  appid: 'wxb8bbb2b10dec74aa',
  type: 'miniProgram',
  projectPath: '/path/to/miniprogram',
  privateKeyPath: '/path/to/private.key',
  ignores: ['node_modules/**/*']
});

// 上传
await ci.upload({
  project,
  version: '1.0.0',
  desc: '版本描述',
  setting: {
    es6: true,
    minify: true
  }
});
```

**获取私钥**：
1. 登录小程序后台
2. 开发管理 → 开发设置
3. 小程序代码上传密钥 → 下载

### 2. multi-mini-ci

多平台小程序自动化上传工具。

**GitHub**: https://github.com/Ethan-zjc/multi-mini-ci

**支持平台**：
- 微信小程序
- 支付宝小程序
- 百度小程序
- 字节跳动小程序

### 3. GitHub Actions集成

在项目中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy MiniProgram

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Upload to WeChat
        env:
          PRIVATE_KEY: ${{ secrets.MINIPROGRAM_PRIVATE_KEY }}
        run: |
          echo "$PRIVATE_KEY" > private.key
          npx miniprogram-ci upload \
            --pp ./dist \
            --pkp ./private.key \
            --appid wxb8bbb2b10dec74aa \
            --uv "1.0.${{ github.run_number }}" \
            -r 1 \
            --desc "CI auto deploy"
```

---

## 📁 完整文件结构（v3.0）

```
小程序管理/
├── SKILL.md                        # 技能说明文档（本文件）
├── scripts/
│   ├── mp_full.py                  # 全能管理工具（推荐）⭐
│   ├── mp_deploy.py                # 部署工具（多小程序管理）
│   ├── mp_manager.py               # API管理工具（基础版）
│   ├── mp_api.py                   # API封装类（Python SDK）
│   ├── apps_config.json            # 多小程序配置文件
│   ├── requirements.txt            # Python依赖
│   ├── env_template.txt            # 环境变量模板
│   └── reports/                    # 检查报告存放目录
│       ├── summary_*.json          # 汇总报告
│       └── report_*.json           # 项目报告
└── references/
    ├── API接口速查表.md             # 常用API速查
    ├── 企业认证完整指南.md           # 认证操作指南
    ├── 隐私协议填写指南.md           # 隐私协议配置指南
    └── 审核规范.md                  # 审核常见问题
```

### 脚本功能对比

| 脚本 | 功能 | 推荐场景 |
|------|------|----------|
| **mp_full.py** | 全能：检查+报告+自动部署 | 日常管理（推荐） |
| **mp_deploy.py** | 多小程序管理+认证 | 多项目管理 |
| **mp_manager.py** | API调用工具 | 高级操作 |
| **mp_api.py** | Python SDK | 二次开发 |

---

## 📊 多小程序配置

配置文件位于 `scripts/apps_config.json`：

```json
{
  "apps": [
    {
      "id": "soul-party",
      "name": "Soul派对",
      "appid": "wxb8bbb2b10dec74aa",
      "project_path": "/path/to/miniprogram",
      "certification": {
        "status": "verified",
        "enterprise_name": "厦门智群网络科技有限公司"
      }
    },
    {
      "id": "another-app",
      "name": "另一个小程序",
      "appid": "wx1234567890",
      "project_path": "/path/to/another",
      "certification": {
        "status": "pending"
      }
    }
  ],
  "certification_materials": {
    "enterprise_name": "厦门智群网络科技有限公司",
    "license_number": "统一社会信用代码",
    "legal_persona_name": "法人姓名",
    "component_phone": "15880802661"
  }
}
```

---

## ⚡ 常见场景速查

### 场景1：发布时提示"未完成微信认证"

```bash
# 1. 检查认证状态
python3 mp_deploy.py cert-status soul-party

# 2. 如果未认证，查看认证指引
python3 mp_deploy.py cert soul-party

# 3. 在微信后台完成认证后，标记完成
python3 mp_deploy.py cert-done soul-party

# 4. 重新部署
python3 mp_deploy.py deploy soul-party
```

### 场景2：新建小程序并快速上线

```bash
# 1. 添加小程序配置
python3 mp_deploy.py add

# 2. 提交认证
python3 mp_deploy.py cert my-new-app

# 3. 在微信后台完成认证（1-5天）

# 4. 认证通过后标记
python3 mp_deploy.py cert-done my-new-app

# 5. 一键部署
python3 mp_deploy.py deploy my-new-app

# 6. 审核通过后发布
python3 mp_deploy.py release my-new-app
```

### 场景3：仅更新代码（不提审）

```bash
# 快速上传到开发版
python3 mp_deploy.py upload soul-party -v "1.0.5" -d "修复xxx问题"
```

### 场景4：批量管理多个小程序

```bash
# 查看所有小程序
python3 mp_deploy.py list

# 检查所有认证状态
for app in soul-party another-app third-app; do
  echo "=== $app ==="
  python3 mp_deploy.py cert-status $app
done
```

---

## 🔗 相关资源

### 官方文档
- [微信开放平台](https://developers.weixin.qq.com/doc/oplatform/)
- [小程序CI工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)
- [第三方平台代认证](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/product/weapp_wxverify.html)

### 开源项目
- [miniprogram-ci](https://www.npmjs.com/package/miniprogram-ci) - 官方CI工具
- [multi-mini-ci](https://github.com/Ethan-zjc/multi-mini-ci) - 多平台上传
- [uz-miniprogram-ci](https://github.com/uzhan/uz-miniprogram-ci) - 一键上传发布

### 相关文章
- [GitHub Actions集成小程序CI](https://idayer.com/use-github-actions-and-mp-ci-for-wechat-miniprogram-ci/)

---

## 🔥 实战经验库（持续更新）

> 基于 Soul创业派对 项目开发过程中的真实问题和解决方案

### 一、数据库与后端问题

#### 1.1 后台初始化失败：Unknown column 'password' in 'field list'

**问题现象**：后台用户管理显示"初始化失败"

**根本原因**：数据库表结构缺少字段

**解决方案**：创建数据库初始化API自动修复

```typescript
// app/api/db/init/route.ts
// 自动检查并添加缺失字段
const columnsToAdd = [
  { name: 'password', type: 'VARCHAR(100)' },
  { name: 'session_key', type: 'VARCHAR(100)' },
  { name: 'referred_by', type: 'VARCHAR(50)' },
  { name: 'is_admin', type: 'BOOLEAN DEFAULT FALSE' },
]

for (const col of columnsToAdd) {
  // 检查列是否存在，不存在则添加
  await query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`)
}
```

**访问修复**：`curl https://your-domain.com/api/db/init`

---

#### 1.2 Column 'open_id' cannot be null

**问题现象**：后台添加用户失败

**根本原因**：数据库 `open_id` 字段设置为 NOT NULL，但后台添加用户时没有openId

**解决方案**：
```sql
ALTER TABLE users MODIFY COLUMN open_id VARCHAR(100) NULL
```

**最佳实践**：openId允许为NULL，因为：
- 后台手动添加的用户没有openId
- 微信登录用户有openId
- 两种用户需要共存

---

#### 1.3 AppID配置不一致

**问题现象**：微信登录返回错误，或获取openId失败

**根本原因**：项目中多个文件使用了不同的AppID

**检查清单**：

| 文件 | 配置项 | 正确值 |
|:---|:---|:---|
| `miniprogram/project.config.json` | appid | wxb8bbb2b10dec74aa |
| `app/api/miniprogram/login/route.ts` | MINIPROGRAM_CONFIG.appId | wxb8bbb2b10dec74aa |
| `app/api/wechat/login/route.ts` | APPID | wxb8bbb2b10dec74aa |
| `app/api/withdraw/route.ts` | WECHAT_PAY_CONFIG.appId | wxb8bbb2b10dec74aa |

**搜索命令**：
```bash
# 查找所有AppID配置
rg "wx[a-f0-9]{16}" --type ts --type json
```

---

#### 1.4 用户ID设计最佳实践

**推荐方案**：使用 `openId` 作为用户主键

```typescript
// 微信登录创建用户
const userId = openId  // 直接使用openId作为用户ID
await query(`
  INSERT INTO users (id, open_id, ...) VALUES (?, ?, ...)
`, [userId, openId, ...])
```

**优势**：
- 与微信官方标识一致
- 便于追踪和管理
- 后台显示更直观

**兼容方案**：后台添加的用户使用 `user_` 前缀

---

### 二、前端与UI问题

#### 2.1 Next.js Hydration错误

**问题现象**：页面显示"哎呀，出错了"，控制台报 hydration 错误

**根本原因**：服务端和客户端渲染结果不一致（如使用localStorage、zustand持久化）

**解决方案**：添加mounted状态检查

```tsx
export default function AdminLayout({ children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 等待客户端mount后再渲染
  if (!mounted) {
    return <div>加载中...</div>
  }

  return <div>{children}</div>
}
```

---

#### 2.2 数据类型不匹配：toFixed() 报错

**问题现象**：显示金额时报错 `toFixed is not a function`

**根本原因**：数据库返回的 `DECIMAL` 字段是字符串类型

**解决方案**：
```tsx
// ❌ 错误
<div>{user.earnings.toFixed(2)}</div>

// ✅ 正确
<div>{parseFloat(String(user.earnings || 0)).toFixed(2)}</div>
```

**通用处理函数**：
```typescript
const formatMoney = (value: any) => {
  return parseFloat(String(value || 0)).toFixed(2)
}
```

---

### 三、小程序开发问题

#### 3.1 搜索功能：章节ID格式不一致

**问题现象**：搜索结果跳转到阅读页404

**根本原因**：
- `book-chapters.json` 使用 `chapter-2`, `chapter-3` 格式
- 阅读页使用 `1.1`, `1.2` 格式

**解决方案**：从标题提取章节号

```typescript
// 从标题提取章节号（如 "1.1 荷包：..." → "1.1"）
const sectionIdMatch = chapter.title?.match(/^(\d+\.\d+)\s/)
const sectionId = sectionIdMatch ? sectionIdMatch[1] : chapter.id
```

---

#### 3.2 搜索功能：敏感信息过滤

**需求**：搜索结果不能显示用户手机号、微信号等

**实现**：
```typescript
const cleanContent = content
  .replace(/1[3-9]\d{9}/g, '***')           // 手机号
  .replace(/微信[：:]\s*\S+/g, '微信：***')   // 微信号
  .replace(/QQ[：:]\s*\d+/g, 'QQ：***')      // QQ号
  .replace(/邮箱[：:]\s*\S+@\S+/g, '邮箱：***') // 邮箱
```

---

#### 3.3 上下章导航：付费内容也需要显示

**需求**：即使用户没有购买，也要显示上一篇/下一篇导航

**实现**：将导航组件移到付费墙之外

```html
<!-- 付费墙 -->
<view class="paywall">
  <!-- 解锁按钮 -->
</view>

<!-- 章节导航 - 始终显示 -->
<view class="chapter-nav">
  <view class="nav-btn nav-prev" bindtap="goToPrev">上一篇</view>
  <view class="nav-btn nav-next" bindtap="goToNext">下一篇</view>
</view>
```

---

#### 3.4 分销绑定：推广码捕获

**需求**：用户通过分享链接进入时，自动绑定推广者

**实现流程**：

```javascript
// app.js - onLaunch/onShow
onLaunch(options) {
  if (options.query && options.query.ref) {
    wx.setStorageSync('referral_code', options.query.ref)
    this.bindReferral(options.query.ref)
  }
}

// 小程序码scene参数解析
const scene = decodeURIComponent(options.scene)
const params = new URLSearchParams(scene)
const ref = params.get('ref')
```

**后端绑定**：
```sql
UPDATE users SET referred_by = ? WHERE id = ? AND referred_by IS NULL
```

---

### 四、后台管理优化

#### 4.1 菜单精简原则

**优化前（9项）**：
- 数据概览、网站配置、内容管理、用户管理、匹配配置、分销管理、支付配置、分账提现、二维码、系统设置

**优化后（6项）**：
- 数据概览、内容管理、用户管理、分账管理、支付设置、系统设置

**精简原则**：
1. 合并相似功能（分销管理 + 分账提现 → 分账管理）
2. 移除低频功能（二维码、匹配配置 → 可在系统设置中配置）
3. 核心功能优先

---

#### 4.2 用户绑定关系展示

**需求**：查看用户的推广下线详情

**实现API**：
```typescript
// GET /api/db/users/referrals?userId=xxx
const referrals = await query(`
  SELECT * FROM users WHERE referred_by = ?
  ORDER BY created_at DESC
`, [referralCode])
```

**展示信息**：
- 绑定总数、已付费人数、免费用户
- 累计收益、待提现金额
- 每个绑定用户的状态（VIP/已付费/未付费）

---

### 五、分销与提现

#### 5.1 自动分账规则

| 配置项 | 值 | 说明 |
|:---|:---|:---|
| 分销比例 | 90% | 推广者获得订单金额的90% |
| 结算方式 | 自动 | 用户付款后立即计入推广者账户 |
| 提现方式 | 微信零钱 | 企业付款到零钱 |
| 提现门槛 | 1元 | 累计收益≥1元可提现 |

#### 5.2 提现流程

```
用户申请提现
    ↓
扣除账户余额，增加待提现金额
    ↓
管理员后台审核
    ↓
批准 → 调用微信企业付款API → 到账
拒绝 → 返还用户余额
```

---

### 六、开发规范

#### 6.1 配置统一管理

```typescript
// lib/config.ts
export const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APPID || 'wxb8bbb2b10dec74aa',
  appSecret: process.env.WECHAT_APPSECRET || '...',
  mchId: '1318592501',
  apiKey: '...'
}
```

**所有API文件统一引用此配置，避免硬编码**

#### 6.2 数据库字段命名

| 前端字段 | 数据库字段 | 说明 |
|:---|:---|:---|
| openId | open_id | 微信openId |
| hasFullBook | has_full_book | 是否购买全书 |
| referralCode | referral_code | 推广码 |
| pendingEarnings | pending_earnings | 待提现收益 |

**规则**：数据库使用snake_case，前端使用camelCase

#### 6.3 错误处理模板

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // 业务逻辑
    return NextResponse.json({ success: true, data: ... })
  } catch (error) {
    console.error('[API名称] 错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '用户友好的错误信息'
    }, { status: 500 })
  }
}
```

---

## 📌 问题排查清单

### 小程序无法登录

- [ ] 检查AppID是否正确（project.config.json vs 后端）
- [ ] 检查AppSecret是否正确
- [ ] 检查API域名是否已配置
- [ ] 检查后端服务是否正常运行
- [ ] 查看后端日志 `[MiniLogin]`

### 后台显示异常

- [ ] 运行 `/api/db/init` 初始化数据库
- [ ] 检查数据库连接是否正常
- [ ] 清除浏览器缓存（Cmd+Shift+R）
- [ ] 查看浏览器控制台错误

### 搜索功能无结果

- [ ] 检查 `public/book-chapters.json` 是否存在
- [ ] 检查章节文件路径是否正确（filePath字段）
- [ ] 检查关键词编码（中文需URL编码）

### 提现失败

- [ ] 检查用户余额是否充足
- [ ] 检查用户是否有openId
- [ ] 检查微信商户API证书配置
- [ ] 查看后端日志 `[Withdraw]`

---

**创建时间**：2026-01-25
**更新时间**：2026-01-25
**版本**：v3.1（新增实战经验库）
**维护者**：卡若
