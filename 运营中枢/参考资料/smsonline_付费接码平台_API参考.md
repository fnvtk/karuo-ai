# SMSOnline 付费接码平台 · API 参考文档

> 平台：premium.smsonline.cloud / smsonline.io  
> API Key：`2w9hva2mzvbubw5sj3vqwkuv9ib43ku29okhwyragkx4o2kgzw7eb9oy8pjh4gc3`  
> 更新：2026-03-13  
> 来源：[smsonline.io/api-docs](https://smsonline.io/api-docs) + [premium.smsonline.cloud](https://premium.smsonline.cloud)

---

## 一、Base URL

```
https://smsonline.io/api/v1
```

> 若 premium 域名可访问，则用 `https://premium.smsonline.cloud/api/v1`（接口一致）。  
> 当前 premium 域名在本机 SSL 不通，备选用 smsonline.io。

---

## 二、鉴权

所有请求带 `apiKey` 参数（GET query string）：

```
?apiKey=你的KEY
```

---

## 三、完整接口列表

### 1. 获取支持的国家

```
GET /virtual-number/get-countries?apiKey=KEY
```

返回：国家列表（含 countryId、国家名）。

### 2. 获取支持的服务（App/网站）

```
GET /virtual-number/get-services?apiKey=KEY
```

返回：服务列表（含 serviceId、服务名，如 Soul、bilibili、WhatsApp 等）。

### 3. 获取产品（某国家+某服务的可用号码/价格）

```
GET /virtual-number/get-products?apiKey=KEY&countryId=ID&serviceId=ID
```

参数：
- `countryId`：国家 ID（从接口 1 获取）
- `serviceId`：服务 ID（从接口 2 获取）

返回：可用运营商列表、价格、库存。

### 4. 购买号码（获取一个临时号码）

```
GET /virtual-number/buy-service?apiKey=KEY&countryId=ID&serviceId=ID&operatorId=ID
```

参数：
- `countryId`：国家 ID
- `serviceId`：服务 ID
- `operatorId`：运营商 ID（从接口 3 获取）

返回：分配的号码、订单 ID（后续取短信/退号用）。

**测试模式**：在 URL 末尾加 `&test=1`，不扣费、不分配真实号。

### 5. 获取短信验证码

```
GET /virtual-number/get-sms?apiKey=KEY&id=订单ID
```

参数：
- `id`：买号时返回的订单 ID

返回：
- 若已收到短信 → 返回验证码内容
- 若未收到 → 返回等待状态（需轮询）

**轮询策略**：每 5 秒请求一次，最多轮询 2 分钟（24 次）。

### 6. 修改订单状态（取消/完成/退号）

```
GET /virtual-number/change-status?apiKey=KEY&id=订单ID&status=STATUS
```

参数：
- `id`：订单 ID
- `status`：目标状态码
  - `3` = 已完成（确认使用，不退费）
  - `4` = 取消（未收到短信，退费）
  - `5` = 退款（出错退费）

**关键**：超过 2 分钟未收到验证码 → 调 `change-status` 传 `status=4` 取消退费。

---

## 四、完整使用流程（从取号到收码到退号）

```
① get-countries → 拿 countryId（如中国=?）
② get-services  → 拿 serviceId（如 Soul=?）
③ get-products  → 拿 operatorId + 价格
④ buy-service   → 拿到号码 + 订单 id
⑤ 用该号码在目标网站发送验证码
⑥ 轮询 get-sms（每 5 秒一次，最多 2 分钟）
   ├── 收到验证码 → 使用 → change-status(id, status=3) 确认完成
   └── 超时未收到 → change-status(id, status=4) 取消退费
```

---

## 五、防扣费规则（强制）

1. **2 分钟超时自动退号**：轮询 get-sms 最多 120 秒（24 次 × 5 秒间隔），超时未收到验证码 → 立即调 `change-status(status=4)` 取消。
2. **收到验证码后确认**：验证码用完后调 `change-status(status=3)` 标记完成。
3. **不重复获取同一个号**：每次 buy-service 只分配新号；若之前取过的号还在等待中，不要再 buy 新的（先取消旧的再取新号）。
4. **测试先用 test 模式**：首次调试在 URL 加 `&test=1`，确认流程正确后再去掉。

---

## 六、充值方式

1. 登录 [premium.smsonline.cloud](https://premium.smsonline.cloud)（需翻墙/代理）。
2. 进入账户页 → 充值/Top Up。
3. 支持：加密货币（USDT/BTC 等）、信用卡、支付宝（视站点当前支持）。
4. 充值后余额即时到账，通过 API 购买号码时自动扣除。

---

## 七、当前网络问题

- `premium.smsonline.cloud` 在本机（macOS + Clash TUN）SSL 握手失败，无法直连。
- `smsonline.io` 主站 API 可访问，但你的 API Key 是 premium 站注册的，在主站不通用（提示 invalid key）。
- **解决方案**：
  - 在浏览器里（已走 Clash 规则组）登录 premium 站确认 API Key 是否正确、是否已充值。
  - 或在 premium 站的「API」页面查看是否有另一个 Base URL。
  - 若 premium 站持续不通，可考虑联系客服确认 API 端点，或改用 smsonline.io 主站重新注册获取该站的 key。

---

## 八、脚本位置

- 自动化脚本：`运营中枢/scripts/smsonline_receive_sms.py`（待 API 连通后写入）
- 接收短信 Skill：`02_卡人（水）/水桥_平台对接/接收短信/SKILL.md`（待更新）

---

*归位：运营中枢/参考资料 · 卡若AI*
