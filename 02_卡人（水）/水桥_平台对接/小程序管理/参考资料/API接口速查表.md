# 微信小程序管理API速查表

> 快速查找常用API接口

---

## 一、认证相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cgi-bin/component/api_component_token` | POST | 获取第三方平台token |
| `/cgi-bin/component/api_create_preauthcode` | POST | 获取预授权码 |
| `/cgi-bin/component/api_query_auth` | POST | 获取授权信息 |
| `/cgi-bin/component/api_authorizer_token` | POST | 刷新授权方token |

---

## 二、基础信息

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cgi-bin/account/getaccountbasicinfo` | POST | 获取基础信息 |
| `/wxa/setnickname` | POST | 设置名称 |
| `/cgi-bin/account/modifyheadimage` | POST | 修改头像 |
| `/cgi-bin/account/modifysignature` | POST | 修改简介 |

---

## 三、类目管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cgi-bin/wxopen/getallcategories` | GET | 获取可选类目 |
| `/cgi-bin/wxopen/getcategory` | GET | 获取已设置类目 |
| `/cgi-bin/wxopen/addcategory` | POST | 添加类目 |
| `/cgi-bin/wxopen/deletecategory` | POST | 删除类目 |
| `/cgi-bin/wxopen/modifycategory` | POST | 修改类目 |

---

## 四、域名配置

| 接口 | 方法 | 说明 |
|------|------|------|
| `/wxa/modify_domain` | POST | 设置服务器域名 |
| `/wxa/setwebviewdomain` | POST | 设置业务域名 |

**action参数**：
- `get` - 获取
- `set` - 覆盖设置
- `add` - 添加
- `delete` - 删除

---

## 五、隐私协议

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cgi-bin/component/getprivacysetting` | POST | 获取隐私设置 |
| `/cgi-bin/component/setprivacysetting` | POST | 设置隐私协议 |

**常用隐私字段**：
- `UserInfo` - 用户信息
- `Location` - 地理位置
- `PhoneNumber` - 手机号
- `Album` - 相册
- `Camera` - 相机
- `Record` - 麦克风
- `Clipboard` - 剪切板

---

## 六、代码管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/wxa/commit` | POST | 上传代码 |
| `/wxa/get_page` | GET | 获取页面列表 |
| `/wxa/get_qrcode` | GET | 获取体验版二维码 |

---

## 七、审核管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/wxa/submit_audit` | POST | 提交审核 |
| `/wxa/get_auditstatus` | POST | 查询审核状态 |
| `/wxa/get_latest_auditstatus` | GET | 查询最新审核状态 |
| `/wxa/undocodeaudit` | GET | 撤回审核（每天1次） |
| `/wxa/speedupaudit` | POST | 加急审核 |

**审核状态码**：
- `0` - 审核成功
- `1` - 审核被拒
- `2` - 审核中
- `3` - 已撤回
- `4` - 审核延后

---

## 八、发布管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/wxa/release` | POST | 发布上线 |
| `/wxa/revertcoderelease` | GET | 版本回退 |
| `/wxa/grayrelease` | POST | 分阶段发布 |
| `/wxa/getgrayreleaseplan` | GET | 查询灰度计划 |
| `/wxa/revertgrayrelease` | GET | 取消灰度 |

---

## 九、小程序码

| 接口 | 方法 | 说明 | 限制 |
|------|------|------|------|
| `/wxa/getwxacode` | POST | 获取小程序码 | 每个path最多10万个 |
| `/wxa/getwxacodeunlimit` | POST | 获取无限小程序码 | 无限制（推荐） |
| `/cgi-bin/wxaapp/createwxaqrcode` | POST | 获取小程序二维码 | 每个path最多10万个 |
| `/wxa/genwxashortlink` | POST | 生成短链接 | - |

---

## 十、数据分析

| 接口 | 方法 | 说明 |
|------|------|------|
| `/datacube/getweanalysisappiddailyvisittrend` | POST | 日访问趋势 |
| `/datacube/getweanalysisappidweeklyvisittrend` | POST | 周访问趋势 |
| `/datacube/getweanalysisappidmonthlyvisittrend` | POST | 月访问趋势 |
| `/datacube/getweanalysisappiduserportrait` | POST | 用户画像 |
| `/datacube/getweanalysisappidvisitpage` | POST | 访问页面 |

---

## 十一、API配额

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cgi-bin/openapi/quota/get` | POST | 查询接口配额 |
| `/cgi-bin/clear_quota` | POST | 重置调用次数（每月10次） |
| `/cgi-bin/openapi/rid/get` | POST | 查询rid信息 |

---

## 十二、快速注册

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cgi-bin/account/fastregister` | POST | 复用公众号资质注册 |
| `/cgi-bin/component/fastregisterminiprogram` | POST | 快速注册企业小程序 |

---

## 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 40001 | access_token无效 | 重新获取token |
| 42001 | access_token过期 | 刷新token |
| 45009 | 调用超过限制 | 明天再试或重置 |
| 61039 | 代码检测未完成 | 等待几秒后重试 |
| 85009 | 已有审核版本 | 先撤回再提交 |
| 85086 | 未绑定类目 | 先添加类目 |
| 87013 | 每天只能撤回1次 | 明天再试 |
| 89248 | 隐私协议不完整 | 补充隐私配置 |

---

## 官方文档链接

- [第三方平台开发指南](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/getting_started/how_to_read.html)
- [代码管理API](https://developers.weixin.qq.com/doc/oplatform/openApi/OpenApiDoc/miniprogram-management/code-management/commit.html)
- [隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)
