# 平台账号申诉 / 解封（Soul · 抖音 · 小红书）水桥

> **统一触发词**：Soul 解封、Soul 申诉、抖音解封、抖音申诉、小红书解封、小红书申诉、账号封禁、账号限制、视频违规、人工复核、换绑手机、feedback@douyin、soul@soulapp、service@xiaohongshu  
> **归属**：卡若AI · 水组 · 水桥_平台对接（面向各 App **官方公示渠道**，非各项目后端代码）

---

## 〇、总则（必读）

1. **不存在「一定解封」**的话术、邮箱或付费捷径；结果由平台审核决定。  
2. **各平台首选 App 内**：安全中心 / 帮助与客服 / 申诉工单，邮件多为**补充**。  
3. **SMTP**：本机 QQ 邮箱授权码，读 `运营中枢/scripts/karuo_ai_gateway/.env`（`SMTP_USER` / `SMTP_PASS`）。勿把授权码写入对话或提交 Git。  
4. **脚本路径**（均相对卡若AI仓库根）：  
   - Soul：`运营中枢/scripts/send_soul_appeal_mail.py`  
   - 抖音：`运营中枢/scripts/send_douyin_appeal_mail.py`  
   - 小红书：`运营中枢/scripts/send_xiaohongshu_appeal_mail.py`  
5. **职能/商务邮箱**：与账号处罚不对口时**不抄送**（避免无效与反感）；下表已标注。

---

## 一、Soul

| 渠道 | 内容 |
|:---|:---|
| 邮件 | `soul@soulapp.cn`（主）；用户曾要求时脚本会一并抄送 `hr@` / `ad@` / `commercial-b@` / `pc@`（官网「联系我们」公示） |
| 电话 | `400-9030057` 客户服务；`400-9030142` 为不良信息举报专线 |
| 官网 | <https://www.soulapp.cn/contact> |

**发信**（11 位手机号为绑定号，两版话术）：  
`python3 运营中枢/scripts/send_soul_appeal_mail.py 15210897710`  
`python3 运营中枢/scripts/send_soul_appeal_mail.py 13779954946`

---

## 二、抖音

| 渠道 | 内容 |
|:---|:---|
| 邮件（协议公示） | **`feedback@douyin.com`** ——《「抖音」用户服务协议》1.5 条 |
| App | 反馈与帮助、抖音安全中心、违规详情与申诉入口 |
| 说明 | `qinquan@bytedance.com` 等为**侵权举报指引**中的权利人投诉通道，**不作为**本人账号社区处罚申诉的主收件人 |

**发信**：`python3 运营中枢/scripts/send_douyin_appeal_mail.py Lkdie001`（抖音号可换）

---

## 三、小红书

**官网「关于我们 / 合作邮箱」公示**（<https://www.xiaohongshu.com/contact>，以页面更新为准）：

| 邮箱 | 用途（公示语义） | 与账号申诉相关性 |
|:---|:---|:---|
| **service@xiaohongshu.com** | 客服反馈 | **高，主投** |
| **community@xiaohongshu.com** | 社区反馈 | **高，与社区处罚相关** |
| **app_feedback@xiaohongshu.com** | 产品反馈 | 中，账号/登录/功能异常可抄送 |
| **shuduizhang@xiaohongshu.com** | 薯队长 | 中，社区侧形象入口 |
| **ceo@xiaohongshu.com** | 重大疑难与建议（页面要求写清身份、联系方式、描述） | **低频次**，多次无果再斟酌，勿滥用 |
| copyright@ / 各 bd_* / career@ / media@ 等 | 侵权、商务、招聘、媒体 | **不用于**普通账号解封群发 |

网传客服电话 **400-680-9966** 等，**以 App 内及官网最新公示为准**。

**发信**（绑定手机，大白话+正式混合）：  
`python3 运营中枢/scripts/send_xiaohongshu_appeal_mail.py 15880802661`

脚本默认收件人：`service@` + `community@` + `app_feedback@` + `shuduizhang@`（提高触达社区与客服链路的概率，**非**官方承诺解封）。

---

## 四、申诉写法共性

- 写清账号标识（Soul 手机、抖音号、小红书绑定手机等）。  
- 说明处罚现象与**是否看不清具体规则/条目**。  
- 态度配合、愿整改；少辱骂、少重复刷屏。  
- 身份证等敏感材料按**平台或回信要求**再提供。

---

## 五、维护

- Soul：<https://www.soulapp.cn/contact>  
- 抖音协议：<https://www.douyin.com/agreements/?id=6773906068725565448>  
- 小红书联系页：<https://www.xiaohongshu.com/contact>  

子目录 `Soul账号申诉解封/`、`Douyin账号申诉解封/` 内 SKILL 已改为**跳转本文件**，避免重复维护。
