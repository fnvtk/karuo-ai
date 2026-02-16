# 对外获客线索上报接口文档（V1）

## 一、接口概述

- **接口名称**：对外获客线索上报接口  
- **接口用途**：供第三方系统向【存客宝】上报客户线索（手机号 / 微信号等），用于后续的跟进、标签管理和画像分析。  
- **接口协议**：HTTP  
- **请求方式**：`POST`  
- **请求地址**： `https://ckbapi.quwanzhi.com/v1/api/scenarios`  

> 具体 URL 以实际环境配置为准。

- **数据格式**：
  - 推荐：`application/json`
  - 兼容：`application/x-www-form-urlencoded`
- **字符编码**：`UTF-8`

---

## 二、鉴权与签名

### 2.1 必填鉴权字段

| 字段名      | 类型   | 必填 | 说明                                  |
|-------------|--------|------|---------------------------------------|
| `apiKey`    | string | 是   | 分配给第三方的接口密钥（每个任务唯一）|
| `sign`      | string | 是   | 签名值                                |
| `timestamp` | int    | 是   | 秒级时间戳（与服务器时间差不超过 5 分钟） |

### 2.2 时间戳校验

服务器会校验 `timestamp` 是否在当前时间前后 **5 分钟** 内：

- 通过条件：`|server_time - timestamp| <= 300`
- 超出范围则返回：`请求已过期`

### 2.3 签名生成规则

接口采用自定义签名机制。**签名字段为 `sign`，生成步骤如下：**

假设本次请求的所有参数为 `params`，其中包括业务参数 + `apiKey` + `timestamp` + `sign` + 可能存在的 `portrait` 对象。

#### 第一步：移除特定字段

从 `params` 中移除以下字段：

- `sign` —— 自身不参与签名  
- `apiKey` —— 不参与参数拼接，仅在最后一步参与二次 MD5  
- `portrait` —— 整个画像对象不参与签名（即使内部还有子字段）

> 说明：`portrait` 通常是一个 JSON 对象，字段较多，为避免签名实现复杂且双方难以对齐，统一不参与签名。

#### 第二步：移除空值字段

从剩余参数中，移除值为：

- `null`
- 空字符串 `''`

的字段，这些字段不参与签名。

#### 第三步：按参数名升序排序

对剩余参数按**参数名（键名）升序排序**，排序规则为标准的 ASCII 升序：

```text
例如： name, phone, source, timestamp
```

#### 第四步：拼接参数值

将排序后的参数 **只取“值”**，按顺序直接拼接为一个字符串，中间不加任何分隔符：

- 示例：  
  排序后参数为：

  ```text
  name      = 张三
  phone     = 13800000000
  source    = 微信广告
  timestamp = 1710000000
  ```

  则拼接：

  ```text
  stringToSign = "张三13800000000微信广告1710000000"
  ```

#### 第五步：第一次 MD5

对上一步拼接得到的字符串做一次 MD5：

\[
\text{firstMd5} = \text{MD5}(\text{stringToSign})
\]

#### 第六步：拼接 apiKey 再次 MD5

将第一步的结果与 `apiKey` 直接拼接，再做一次 MD5，得到最终签名值：

\[
\text{sign} = \text{MD5}(\text{firstMd5} + \text{apiKey})
\]

#### 第七步：放入请求

将第六步得到的 `sign` 填入请求参数中的 `sign` 字段即可。

> 建议：  
> - 使用小写 MD5 字符串（双方约定统一即可）。  
> - 请确保参与签名的参数与最终请求发送的参数一致（包括是否传空值）。

### 2.4 签名示例（PHP 伪代码）

```php
$params = [
    'apiKey'    => 'YOUR_API_KEY',
    'timestamp' => '1710000000',
    'phone'     => '13800000000',
    'name'      => '张三',
    'source'    => '微信广告',
    'remark'    => '通过H5落地页留资',
    // 'portrait' => [...], // 如有画像，这里会存在，但不参与签名
    // 'sign'   => '待生成',
];

// 1. 去掉 sign、apiKey、portrait
unset($params['sign'], $params['apiKey'], $params['portrait']);

// 2. 去掉空值
$params = array_filter($params, function($value) {
    return !is_null($value) && $value !== '';
});

// 3. 按键名升序排序
ksort($params);

// 4. 拼接参数值
$stringToSign = implode('', array_values($params));

// 5. 第一次 MD5
$firstMd5 = md5($stringToSign);

// 6. 第二次 MD5（拼接 apiKey）
$apiKey = 'YOUR_API_KEY';
$sign   = md5($firstMd5 . $apiKey);

// 将 $sign 作为字段发送
$params['sign'] = $sign;
```

---

## 三、请求参数说明

### 3.1 主标识字段（至少传一个）

| 字段名    | 类型   | 必填 | 说明                                      |
|-----------|--------|------|-------------------------------------------|
| `wechatId`| string | 否   | 微信号，存在时优先作为主标识              |
| `phone`   | string | 否   | 手机号，当 `wechatId` 为空时用作主标识    |

### 3.2 基础信息字段

| 字段名     | 类型   | 必填 | 说明                      |
|------------|--------|------|-------------------------|
| `name`     | string | 否   | 客户姓名                    |
| `source`   | string | 否   | 线索来源描述，如“百度推广”、“抖音直播间”  |
| `remark`   | string | 否   | 备注信息                    |
| `tags`     | string | 否   | 逗号分隔的“微信标签”，如：`"高意向,电商,女装"` |
| `siteTags` | string | 否   | 逗号分隔的“站内标签”，用于站内进一步细分   |


### 3.3 用户画像字段 `portrait`（可选）

`portrait` 为一个对象（JSON），用于记录用户的行为画像数据。

#### 3.3.1 基本示例

```json
"portrait": {
  "type": 1,
  "source": 1,
  "sourceData": {
    "age": 28,
    "gender": "female",
    "city": "上海",
    "productId": "P12345",
    "pageUrl": "https://example.com/product/123"
  },
  "remark": "画像-基础属性",
  "uniqueId": "user_13800000000_20250301_001"
}
```

#### 3.3.2 字段详细说明

| 字段名                | 类型   | 必填 | 说明                                   |
|-----------------------|--------|------|----------------------------------------|
| `portrait.type`       | int    | 否   | 画像类型，枚举值：<br>0-浏览<br>1-点击<br>2-下单/购买<br>3-注册<br>4-互动<br>默认值：0 |
| `portrait.source`     | int    | 否   | 画像来源，枚举值：<br>0-本站<br>1-老油条<br>2-老坑爹<br>默认值：0 |
| `portrait.sourceData` | object | 否   | 画像明细数据（键值对，会存储为 JSON 格式）<br>可包含任意业务相关的键值对，如：年龄、性别、城市、商品ID、页面URL等 |
| `portrait.remark`     | string | 否   | 画像备注信息，最大长度100字符 |
| `portrait.uniqueId`   | string | 否   | 画像去重用唯一 ID<br>用于防止重复记录，相同 `uniqueId` 的画像数据在半小时内会被合并统计（count字段累加）<br>建议格式：`{来源标识}_{用户标识}_{时间戳}_{序号}` |

#### 3.3.3 画像类型（type）说明

| 值 | 类型 | 说明 | 适用场景 |
|---|------|------|---------|
| 0 | 浏览 | 用户浏览了页面或内容 | 页面访问、商品浏览、文章阅读等 |
| 1 | 点击 | 用户点击了某个元素 | 按钮点击、链接点击、广告点击等 |
| 2 | 下单/购买 | 用户完成了购买行为 | 订单提交、支付完成等 |
| 3 | 注册 | 用户完成了注册 | 账号注册、会员注册等 |
| 4 | 互动 | 用户进行了互动行为 | 点赞、评论、分享、咨询等 |

#### 3.3.4 画像来源（source）说明

| 值 | 来源 | 说明 |
|---|------|------|
| 0 | 本站 | 来自本站的数据 |
| 1 | 老油条 | 来自"老油条"系统的数据 |
| 2 | 老坑爹 | 来自"老坑爹"系统的数据 |

#### 3.3.5 sourceData 数据格式说明

`sourceData` 是一个 JSON 对象，可以包含任意业务相关的键值对。常见字段示例：

```json
{
  "age": 28,
  "gender": "female",
  "city": "上海",
  "province": "上海市",
  "productId": "P12345",
  "productName": "商品名称",
  "category": "女装",
  "price": 299.00,
  "pageUrl": "https://example.com/product/123",
  "referrer": "https://www.baidu.com",
  "device": "mobile",
  "browser": "WeChat"
}
```

> **注意**：
> - `sourceData` 中的数据类型可以是字符串、数字、布尔值等
> - 嵌套对象会被序列化为 JSON 字符串存储
> - 建议根据实际业务需求定义字段结构

#### 3.3.6 uniqueId 去重机制说明

- **作用**：防止重复记录相同的画像数据
- **规则**：相同 `uniqueId` 的画像数据在 **半小时内** 会被合并统计，`count` 字段会自动累加
- **建议格式**：`{来源标识}_{用户标识}_{时间戳}_{序号}`
  - 示例：`site_13800000000_1710000000_001`
  - 示例：`wechat_wxid_abc123_1710000000_001`
- **注意事项**：
  - 如果不传 `uniqueId`，系统会为每条画像数据创建新记录
  - 如果需要在半小时内多次统计同一行为，应使用相同的 `uniqueId`
  - 如果需要在半小时后重新统计，应使用不同的 `uniqueId`（建议修改时间戳部分）

> **重要提示**：`portrait` **整体不参与签名计算**，但会参与业务处理。系统会根据 `uniqueId` 自动处理去重和统计。

---

## 四、请求示例

### 4.1 JSON 请求示例（无画像）

```json
{
  "apiKey": "YOUR_API_KEY",
  "timestamp": 1710000000,
  "phone": "13800000000",
  "name": "张三",
  "source": "微信广告",
  "remark": "通过H5落地页留资",
  "tags": "高意向,电商",
  "siteTags": "新客,女装",
  "sign": "根据签名规则生成的MD5字符串"
}
```

### 4.2 JSON 请求示例（带微信号与画像）

```json
{
  "apiKey": "YOUR_API_KEY",
  "timestamp": 1710000000,
  "wechatId": "wxid_abcdefg123",
  "phone": "13800000001",
  "name": "李四",
  "source": "小程序落地页",
  "remark": "点击【立即咨询】按钮",
  "tags": "中意向,直播",
  "siteTags": "复购,高客单",
  "portrait": {
    "type": 1,
    "source": 0,
    "sourceData": {
      "age": 28,
      "gender": "female",
      "city": "上海",
      "pageUrl": "https://example.com/product/123",
      "productId": "P12345"
    },
    "remark": "画像-点击行为",
    "uniqueId": "site_13800000001_1710000000_001"
  },
  "sign": "根据签名规则生成的MD5字符串"
}
```

### 4.3 JSON 请求示例（多种画像类型）

#### 4.3.1 浏览行为画像

```json
{
  "apiKey": "YOUR_API_KEY",
  "timestamp": 1710000000,
  "phone": "13800000002",
  "name": "王五",
  "source": "百度推广",
  "portrait": {
    "type": 0,
    "source": 0,
    "sourceData": {
      "pageUrl": "https://example.com/product/456",
      "productName": "商品名称",
      "category": "女装",
      "stayTime": 120,
      "device": "mobile"
    },
    "remark": "商品浏览",
    "uniqueId": "site_13800000002_1710000000_001"
  },
  "sign": "根据签名规则生成的MD5字符串"
}
```


```

---

## 五、响应说明

### 5.1 成功响应

**1）新增线索成功**

```json
{
  "code": 200,
  "message": "新增成功",
  "data": "13800000000"
}
```

**2）线索已存在**

```json
{
  "code": 200,
  "message": "已存在",
  "data": "13800000000"
}
```

> `data` 字段返回本次线索的主标识 `wechatId` 或 `phone`。

### 5.2 常见错误响应

```json
{ "code": 400, "message": "apiKey不能为空", "data": null }
{ "code": 400, "message": "sign不能为空", "data": null }
{ "code": 400, "message": "timestamp不能为空", "data": null }
{ "code": 400, "message": "请求已过期", "data": null }

{ "code": 401, "message": "无效的apiKey", "data": null }
{ "code": 401, "message": "签名验证失败", "data": null }

{ "code": 500, "message": "系统错误: 具体错误信息", "data": null }
```

---


## 六、常见问题（FAQ）

### Q1: 如果同一个用户多次上报相同的行为，会如何处理？

**A**: 如果使用相同的 `uniqueId`，系统会在半小时内合并统计，`count` 字段会累加。如果使用不同的 `uniqueId`，会创建多条记录。

### Q2: portrait 字段是否必须传递？

**A**: 不是必须的。`portrait` 字段是可选的，只有在需要记录用户画像数据时才传递。

### Q3: sourceData 中可以存储哪些类型的数据？

**A**: `sourceData` 是一个 JSON 对象，可以存储任意键值对。支持字符串、数字、布尔值等基本类型，嵌套对象会被序列化为 JSON 字符串。

### Q4: uniqueId 的作用是什么？

**A**: `uniqueId` 用于防止重复记录。相同 `uniqueId` 的画像数据在半小时内会被合并统计，避免重复数据。

### Q5: 画像数据如何与用户关联？

**A**: 系统会根据请求中的 `wechatId` 或 `phone` 自动匹配 `traffic_pool` 表中的用户，并将画像数据关联到对应的 `trafficPoolId`。

---
