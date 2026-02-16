# 微信朋友圈数据处理功能

本模块提供了微信朋友圈数据的获取、存储和查询功能，支持保留驼峰命名结构的原始数据。

## 数据库表结构

项目包含一个数据表：

**wechat_moments** - 存储朋友圈基本信息
- `id`: 自增主键
- `wechatAccountId`: 微信账号ID
- `wechatFriendId`: 微信好友ID
- `snsId`: 朋友圈消息ID
- `commentList`: 评论列表JSON
- `createTime`: 创建时间戳
- `likeList`: 点赞列表JSON
- `content`: 朋友圈内容
- `lat`: 纬度
- `lng`: 经度
- `location`: 位置信息
- `picSize`: 图片大小
- `resUrls`: 资源URL列表
- `userName`: 用户名
- `type`: 朋友圈类型
- `create_time`: 数据创建时间
- `update_time`: 数据更新时间

## API接口

### 1. 获取朋友圈信息

```
GET/POST /api/websocket/getMoments
```

**参数:**
- `wechatAccountId`: 微信账号ID
- `wechatFriendId`: 微信好友ID
- `count`: 获取条数，默认5条

获取指定账号和好友的朋友圈信息，并自动保存到数据库。

### 2. 保存单条朋友圈数据

```
POST /api/websocket/saveSingleMoment
```

**参数:**
- `commentList`: 评论列表
- `createTime`: 创建时间戳
- `likeList`: 点赞列表
- `momentEntity`: 朋友圈实体，包含以下字段：
  - `content`: 朋友圈内容
  - `lat`: 纬度
  - `lng`: 经度
  - `location`: 位置信息
  - `picSize`: 图片大小
  - `resUrls`: 资源URL列表
  - `urls`: 媒体URL列表
  - `userName`: 用户名
- `snsId`: 朋友圈ID
- `type`: 朋友圈类型
- `wechatAccountId`: 微信账号ID
- `wechatFriendId`: 微信好友ID

保存单条朋友圈数据到数据库，保持原有的驼峰数据结构。系统会将`momentEntity`中的字段提取并单独存储，不包括`objectType`和`createTime`字段。

### 3. 获取朋友圈数据列表

```
GET/POST /api/websocket/getMomentsList
```

**参数:**
- `wechatAccountId`: 微信账号ID (可选)
- `wechatFriendId`: 微信好友ID (可选)
- `page`: 页码，默认1
- `pageSize`: 每页条数，默认10
- `startTime`: 开始时间戳 (可选)
- `endTime`: 结束时间戳 (可选)

获取已保存的朋友圈数据列表，支持分页和条件筛选。返回的数据会自动构建`momentEntity`字段以保持API兼容性。

### 4. 获取朋友圈详情

```
GET/POST /api/websocket/getMomentDetail
```

**参数:**
- `snsId`: 朋友圈ID
- `wechatAccountId`: 微信账号ID

获取单条朋友圈的详细信息，包括评论、点赞和资源URL等。返回的数据会自动构建`momentEntity`字段以保持API兼容性。

## 使用示例

### 保存单条朋友圈数据

```php
$data = [
    'commentList' => [],
    'createTime' => 1742777232,
    'likeList' => [],
    'momentEntity' => [
        'content' => "第一位个人与Stussy联名的中国名人，不是陈冠希，不是葛民辉，而是周杰伦！",
        'lat' => 0,
        'lng' => 0,
        'location' => "",
        'picSize' => 0,
        'resUrls' => [],
        'snsId' => "-3827269039168736643",
        'urls' => ["http://wxapp.tc.qq.com/251/20304/stodownload?encfilekey=..."],
        'userName' => "wxid_afixeeh53lt012"
    ],
    'snsId' => "-3827269039168736643",
    'type' => 28,
    'wechatAccountId' => 123456, // 替换为实际的微信账号ID
    'wechatFriendId' => "wxid_example" // 替换为实际的微信好友ID
];

// 发送请求
$result = curl_post('/api/websocket/saveSingleMoment', $data);
```

### 查询朋友圈列表

```php
// 获取特定账号的朋友圈
$params = [
    'wechatAccountId' => 123456,
    'page' => 1,
    'pageSize' => 20
];

// 发送请求
$result = curl_get('/api/websocket/getMomentsList', $params);
```

## 注意事项

1. 所有JSON格式的数据在保存时都会进行编码，查询时会自动解码并还原为原始数据结构。
2. 数据库中的字段名保持驼峰命名格式，与微信API返回的数据结构保持一致。
3. 尽管数据库中将`momentEntity`的字段拆分为独立字段存储，但API接口返回时会重新构建`momentEntity`结构，以保持与原始API的兼容性。
4. `objectType`和`createTime`字段已从`momentEntity`中移除，不再单独存储。
5. 图片或视频资源URLs直接存储在朋友圈主表中，不再单独存储到资源表。 