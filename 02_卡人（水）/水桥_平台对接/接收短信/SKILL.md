---
name: 接收短信
description: 统一管理「接收短信 + 注册验证码」，通过免费/付费接码平台获取临时号码抓取最新短信，可与邮箱验证码等方式组合，用于账号注册与登录验证。触发词：接收短信、收短信、验证码、注册辅助、receivesms、接码、临时号码、获取短信、拿短信。
owner: 水桥
group: 水
version: "1.1"
updated: "2026-03-01 晚"
---

# 接收短信 Skill

> 从接码网站取号、拿最新短信，命令行完成，不打开网页。 —— 水桥

---

## 一、负责与入口（统一当成「注册助手」用）

- **负责人**：水桥（平台对接）
- **触发词**：接收短信、收短信、验证码、注册短信、注册辅助、receivesms、接码、临时号码、获取短信、拿短信、等刷新拿短信
- **核心用途**：**所有需要手机验证码的注册/登录/改密操作，统一走本 Skill 的流程。**
- **数据源网站**：
  - 免费：**receivesms.co**（英国/美国等临时号码列表与收件页，公开、免注册，适合测试/低风险场景）
  - 付费（推荐）：**SMS-Activation.net**（中文界面、支付宝充值、标准 API、支持微信+中国号，¥8-19/次）
  - 付费：**GrizzlySMS**（grizzlysms.com，P2P 模式，微信支持，$1 起充）
  - 付费（旧）：**premium.smsonline.cloud**（需 Firebase Token，流程复杂）
  - 详细排行与账号：`接收短信/接码平台账号与排行.md`

---

## 二、要获取的「网站短信」类型说明

本技能最终输出两类信息，请按需使用：

| 输出项 | 含义 | 示例 |
|:---|:---|:---|
| **号码** | 当前使用的临时号码（来自 receivesms.co 英国号列表） | +447424907088 |
| **短信内容** | 该号码收件页上**最新一条**短信的正文 | `[PUBG] code: 697881. Valid for 3 minutes.` |
| **发件人名字（网站/服务名）** | 页面上显示的发送方标识，即「来自哪个网站/服务的短信」 | TRIBBU、bilibili、AIRBNB、hcloud、WhatsApp 等 |

**当前脚本行为**：只输出**号码 + 最新一条短信正文**；发件人名字在网页上对应 `class="from-link"`，若你需要「只要某类网站/服务发来的短信」（如只要 bilibili、只要验证码类），可在本 Skill 下扩展脚本按发件人或关键词过滤。

**可获取的短信类型（按来源名）**：凡在 receivesms.co 该号码收件页上出现的都会被抓到「最新一条」—— 包括但不限于：验证码类（各 App/网站 OTP）、营销类、通知类；发件人显示为服务名/短号（如 TRIBBU、hcloud、+***5113）。若你要的是「自己刚发过去的那条」，请用 `--wait` 模式（见下）。

---

## 三、整体流程（从取号到拿到短信）

```
① 请求 receivesms.co 英国号码列表页
       ↓
② 随机选取一个临时号码（+44 开头）
       ↓
③ [可选] --wait：先输出号码，等待 30～60 秒（你向该号发短信），再请求该号收件页
   或无 --wait：直接请求该号收件页
       ↓
④ 解析收件页 HTML，取「最新一条」短信正文（<div class="sms">）
       ↓
⑤ 输出：NUMBER、SMS（及 号码 | 短信 一行）
```

---

## 四、执行方式（命令行，不打开网页）

**脚本路径**（工作台内）：

```
运营中枢/scripts/receivesms_get_sms.py
```

**用法**：

| 模式 | 命令 | 说明 |
|:---|:---|:---|
| 立即取最新一条 | `python3 receivesms_get_sms.py` | 可能拿到历史/限流旧短信 |
| 等刷新后取最新 | `python3 receivesms_get_sms.py --wait` | 先出号，等 45 秒后再抓，适合「你发短信后」拿刚收到的那条 |

**执行目录**：

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts
python3 receivesms_get_sms.py
# 或
python3 receivesms_get_sms.py --wait
```

---

## 五、输出格式

脚本标准输出示例：

```
NUMBER: +447476933927
SMS: [PUBG] code: 697881. Valid for 3 minutes.
---
+447476933927 | [PUBG] code: 697881. Valid for 3 minutes.
```

- **NUMBER**：当前使用的临时号码（receivesms.co 英国号）。
- **SMS**：该号码在 receivesms.co 收件页上的**最新一条短信正文**；无短信时为 `(无)`。
- 最后一行：`号码 | 短信`，便于复制或管道处理。

---

## 六、付费接码平台（SMSOnline · 推荐作为「注册主通道」）

### 6.1 平台信息（只记思路，不记密钥）

- **网站**：
  - Web：`premium.smsonline.cloud`
  - 后端 API：`https://api-x.smsonline.cloud/v3/`
- **API 参考**：`运营中枢/参考资料/smsonline_付费接码平台_API参考.md`
- **认证方式**：前端用 **Firebase ID Token（Bearer Token）** 鉴权，需通过浏览器登录后由脚本自动截获；不再在文档中写死任何密钥。

### 6.2 脚本角色分工

脚本都在：`运营中枢/scripts/`

- `smsonline_get_token.py`：打开浏览器（Playwright），登陆 `premium.smsonline.cloud` 后**自动截获最新 Bearer Token**，并用这个 Token 帮你完成「下单 + 等验证码 + 超时退费」的整套流程。
- `smsonline_receive_sms.py`：封装底层 API（列国家/列服务/买号/查短信/退号），主要给调试与扩展用。

### 6.3 一键「注册用短信」推荐流程

> 场景：以后你说「帮我用短信注册 X 平台」，默认按下面流程走。

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts

# 第一步：人工首次在弹出的浏览器里登陆 Google / 平台账号
python3 smsonline_get_token.py --init-login

# 之后每次只需要：
python3 smsonline_get_token.py --service soul --country cn
# 或
python3 smsonline_get_token.py --service bilibili --country cn
```

- `--init-login`：第一次跑时，脚本会打开浏览器，你手动完成 Google 登录一次，之后 Cookie 会保存在本地 Profile 里，下次就不用再管。
- `--service`：目标网站/应用（例如 `soul`、`bilibili` 等，对应 premium 站里的服务编码，具体见 API 文档）。
- `--country`：国家/地区（`cn`、`us`、`gb` …）。

脚本内部会自动完成：

1. 用持久化浏览器 Profile 访问 premium 站，截获最新 Firebase ID Token。
2. 调 `api-x.smsonline.cloud/v3/` 下单对应「国家 + 服务」的临时号码。
3. 每 5 秒轮询一次短信收件，最多 120 秒。
4. 成功：输出**号码 + 验证码短信内容**，并把订单标记为完成。
5. 超时：自动调用退款接口，**强制退号防扣费**。

### 6.4 防扣费规则（强制）

1. 轮询 get-sms 最多 **120 秒**，超时 → 自动调 `change-status(status=4)` 取消退费。
2. 收到验证码并使用后 → 调 `change-status(status=3)` 确认完成。
3. 不重复获取同一号：先取消旧订单再取新号。
4. 调试或不确定服务 ID 时，优先使用 **测试模式/最低价产品**，避免大额损失。

---

## 七、注册场景：短信 + 邮箱联动（建议用法）

很多网站会同时要求 **手机验证码 + 邮箱验证码**，本 Skill 在「手机验证码」侧统一用上面的免费/付费接码流程，邮箱侧按以下原则：

- **邮箱侧建议**：
  - 重要账号（Google、Apple、主邮箱）：使用你自己的长期邮箱，不走公共邮箱网站。
  - 临时测试类注册，可配合一次性邮箱服务，但**不在本 Skill 里写死任何账号或密码**，避免泄露。
  - 邮箱验证码的具体接收流程，统一写在对应「邮箱/帐号管理」相关 Skill 中，这里只规定：**凡涉及手机验证码的注册，一律先调本 Skill 选号、收短信。**

- **组合使用建议**：
  1. 你说清楚目标：「我要注册 X（国家/平台名），需要手机验证码 + 邮箱验证码」。
  2. 本 Skill 先判定：用免费 receivesms 还是付费 SMSOnline。
  3. 完成短信接码后，把**号码 + 短信内容**返回给你，供填写注册页面。
  4. 邮箱验证码由对应邮箱 Skill 或你手工处理，两侧一起完成注册。

---

## 八、参考资料与扩展

- **giffgaff 流程史记**：`运营中枢/参考资料/giffgaff发短信收短信_流程史记.md`
- **receivesms 免费接码**：`运营中枢/参考资料/receivesms收短信_操作.md`
- **SMSOnline 付费接码 API**：`运营中枢/参考资料/smsonline_付费接码平台_API参考.md`
- **扩展方向**：
  - 以后可增加「按发件人名字或关键词过滤短信」（比如只要 Soul / bilibili 验证码）。
  - 也可以增加「根据服务名自动选择免费/付费平台」的路由策略，把「接码 + 注册辅助」做成更完整的一键流程。
