---
name: 小程序链接标签与跨小程序跳转
description: 富文本 #linkTag 解析、tagType 决策树、wx.navigateToMiniProgram、mpKey 与 linkedMiniprograms、app.json 白名单、内链外链与 CKB 类型分支；可复用到任意微信原生小程序 + 自建 BFF 下发配置。
triggers: 链接标签、linkTag、hash标签、小程序跳转、navigateToMiniProgram、跨小程序、打开别的小程序、mpKey、linkedMiniprograms、正文跳转、read页链接、contentParser
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-26"
---

# 小程序链接标签与跨小程序跳转

> **参考实现**：[一场soul的创业实验-永平](file:///Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平)（`miniprogram/`）。**不**写管理端全路由表、不写书籍 CMS。  
> **协同**：留资类与 **《存客宝BFF与留资队列》**（F27）互指；通用点击埋点见 **《全栈开发》§1.10**。

## 一、业务目标与非目标

**目标**：在图文/章节正文中插入「可点的 `#标签`」，点击后按类型进入：本小程序页、H5 预览、其他小程序、或转入留资流程（CKB）。

**非目标**：不替代小程序原生 `navigator` 全站路由规范；不在这里展开存客宝 HTTP 签名细节（见 G15）。

## 二、用户与系统旅程（摘要）

1. 用户打开阅读页 → 正文 HTML 经解析拆成 `text` / `mention` / `linkTag` / `image` 段。  
2. 用户点 `#某标签` → `onLinkTagTap` 读取 `dataset`（或由 `label` 反查缓存）。  
3. 按 `tagType` 分支执行：`miniprogram` / `ckb` / 内链 / 外链。  
4. 失败路径必须有 Toast，禁止静默无反馈。

## 三、前端（微信小程序）

### 3.1 解析层

| 文件 | 职责 |
|:---|:---|
| `miniprogram/utils/contentParser.js` | 正则切分 HTML；`linkTag` 段提取 `tagType`、`url`、`pagePath`、`tagId`、`appId`、`mpKey`、`label`；支持旧版 `<a href>` |
| `miniprogram/pages/read/read.wxml` | `bindtap="onLinkTagTap"`，`data-*` 与解析结果对齐 |

**纯文本自动补标签**（可选）：若 `config.linkTags` / `config.persons` 存在，可在无 HTML 标记时按词表插入 `linkTag` 段（见 `contentParser` 内 `applyInlineConfig` 逻辑）。

### 3.2 点击处理：`onLinkTagTap`

**文件**：`miniprogram/pages/read/read.js`

**决策顺序（须保持顺序，便于排错）**：

1. **补齐字段**：从 `dataset` 取 `url`、`label`、`tagType`、`pagePath`、`mpKey`。若 `tagType` 为空且 `label` 有值 → 在 `app.globalData.linkTagsConfig` 里按 `label` 查找，补全 `tagType`、`pagePath`、`url`、`mpKey`。  
2. **`tagType === 'ckb'`**：走与 `@某人` 类似的加好友/留资入口（常复用 `onMentionTap` 或统一 `soulBridge`）；**详规见 F27**。  
3. **`tagType === 'miniprogram'`**：若缺 `mpKey`，再尝试用 `label` 从 `linkTagsConfig` 补。用 `app.globalData.linkedMiniprograms` 找 `key === mpKey` 的项，取 `appId`，调用：

```javascript
wx.navigateToMiniProgram({
  appId: linked.appId,
  path: pagePath || linked.path || '',
  envVersion: 'release',
})
```

4. **本小程序内路径**：`pagePath` 非空，或 `url` 以 `/pages/` 开头 → `wx.navigateTo`；`fail` 时兜底 `wx.switchTab`（适配 tabBar 页）。  
5. **外链**：`url` 非空 → `/pages/link-preview/link-preview?url=...&title=...`（web-view）。  
6. 仍无可执行动作 → `wx.showToast({ title: '暂无跳转地址' })`。

### 3.3 全局数据契约

| 字段 | 含义 |
|:---|:---|
| `globalData.linkTagsConfig` | 后台下发的链接标签列表（含 `label`、`type`、`url`、`pagePath`、`mpKey` 等） |
| `globalData.linkedMiniprograms` | `{ key, appId, path? }[]`，与 `mpKey` 映射 |

**后端合并**：服务端可把 `link_tags` 表中 `type=miniprogram` 的行与 `linked_miniprograms` 配置合并进全量 config（永平见 `mergeDirectMiniProgramLinksFromLinkTags` 思路）。

### 3.4 `app.json` 强制项

- **`navigateToMiniProgramAppIdList`**：列出所有可能被唤醒的小程序 appId；漏配会导致 `navigateToMiniProgram` 失败。  
- 新增合作小程序时：**同时**改后台配置、合并逻辑与 **白名单数组**。

## 四、后端（BFF / 管理端配置）

- **配置存储**：常见为 `link_tags` 表 + `system_config` 或独立 JSON 字段中的 `linkedMiniprograms`。  
- **下发接口**：小程序启动或进阅读页时拉「全量 config」；需保证 **旧客户端** 在缺 `tagType` 时仍能靠 `label` 命中 `linkTagsConfig`。  
- **类型枚举建议**：`url` | `miniprogram` | `page`（内链）| `ckb`（留资）——与前端分支一致。

## 五、数据模型（示意）

**link_tags（示意）**

| 列 | 说明 |
|:---|:---|
| tag_id | 稳定 ID，可写入正文 `data-tag-id` |
| label | 展示文案，带 `#` 或不带需与解析统一 |
| type | `url` / `miniprogram` / `ckb` / 内链 |
| url / page_path | 外链或本包路径 |
| mp_key | 对应 `linkedMiniprograms[].key` |
| app_id | 可选；可直接填微信 appId 由后端 merge 进 linked 列表 |

## 六、Gotchas（≥10）

1. **白名单未配**：仅 `navigateToMiniProgram` 报失败，需在真机看 `errMsg`。  
2. **`mpKey` 不一致**：后台改 key 未同步正文历史 → Toast「未找到关联小程序配置」。  
3. **旧正文 `<a href>`**：无 `tagType`，必须依赖 `linkTagsConfig` 按 `label` 降级。  
4. **tabBar 页**：`navigateTo` 失败须 `switchTab`，路径不能带 query 的限制要知晓。  
5. **`ckb` 与 `@` 重复**：两处都调留资时，后端需 **幂等/去重**（见 F27）。  
6. **web-view 业务域名**：外链域名未在小程序后台配置则白屏。  
7. **`envVersion: 'release'`**：体验版调试需临时改为 `trial`/`develop`（勿提交忘记改回）。  
8. **同页多段 `#`**：`dataset` 必须逐段绑定，避免共用引用导致串标签。  
9. **繁体/空格 label**：与后台 `label` 严格相等匹配易失败，宜 trim + 统一繁简策略。  
10. **安全**：外链必须 HTTPS，禁止 `javascript:` 协议进入 web-view。  
11. **统计口径**：跳转次数若要进看板，需单独 `trackClick`，**不等于** §1.10 里所有 `link_click` 语义，需在登记表写清。

## 七、验收清单

- [ ] 四种 `tagType`（含降级）在真机各走通至少一条用例  
- [ ] 新合作小程序已加 `navigateToMiniProgramAppIdList`  
- [ ] 后台改 `mpKey` 后旧文行为符合产品预期（Toast 或可批量修数据）  
- [ ] `link-preview` 域名已配置  
- [ ] 与 F27 联调：CKB 类标签不误跳外链  

## 八、互指

- **F01 §1.10**：通用 `trackClick`；本节不重复埋点字段规范。  
- **F27 存客宝BFF**：`tagType==='ckb'` 与 `@mention` 留资。  
- **G15 存客宝**：开放 API、计划、设备详情。
