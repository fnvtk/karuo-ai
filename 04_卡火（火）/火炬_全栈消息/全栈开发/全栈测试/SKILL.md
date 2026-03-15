---
name: 全栈测试
description: 卡若AI 全栈测试（火炬）— 通用全站深度测试框架。适用于任何 Web 项目的系统化验收：逐页逐按钮逐功能，前端/后端/数据库三方通透检查，发现即修，截图存档，安全审计，经验沉淀。
triggers: 全栈测试、功能测试、回归测试、深度测试、端到端测试、E2E测试、API测试、发布测试、测试验收、测试报告、测试员、网站测试
owner: 火炬
group: 火
version: "2.1"
updated: "2026-03-15"
---

# 全栈测试 v2.0（火炬 · 通用版）

> **定位**：任何 Web 项目的**终极测试框架**。不是简单跑一遍，而是以「百分测试员」标准——逐页、逐按钮、逐功能、逐像素地检查前端/后端/数据库三方一致性，发现问题即修、修完再验、验完截图、截图归档、经验沉淀。
>
> **适用范围**：卡若AI 官网、存客宝、玩值电竞、万推、及任何卡若AI 管理的 Web 项目。

---

## 一、触发时机（强制）

以下场景**必须调用**本 SKILL：
1. 开发完一个新功能后
2. 修复 Bug 后需要回归验证
3. 迭代版本上线前
4. 用户反馈「功能不可用」时
5. 长时间未测试的项目重启时
6. 用户说「帮我测一下」「检查一下网站」「全站测试」时

---

## 二、测试总原则

1. **逐页逐按钮**：不跳过任何页面、任何按钮、任何链接、任何可编辑区域
2. **三方通透**：每个操作同时验证前端渲染 + 后端 API 响应 + 数据库落库
3. **发现即修**：测试中发现问题不记录跳过，**当场修复**，修完重新验证
4. **方向一致**：所有功能必须与项目整体方向一致，重复/废弃功能直接清理
5. **截图存档**：每个页面、每个子功能的最终状态截图，存入项目对应目录
6. **经验沉淀**：测试中遇到的问题和解决方案写入经验库，分类归档

---

## 三、执行流程（十步法）

### Step 0：环境准备

```
1. 确认服务运行状态（端口、进程、日志）
2. 确认数据库连接正常（MongoDB / MySQL / SQLite / Postgres）
3. 确认环境变量配置完整（.env / .env.local）
4. 记录项目基本信息：
   - 项目名、框架、端口号
   - 数据库类型与连接信息
   - 页面总数、API 端点总数
```

**快速健康检查**：
```bash
# 通用健康检查（替换 PORT 和 HEALTH_PATH）
curl -s -o /dev/null -w "HTTP %{http_code} | %{time_total}s" http://localhost:$PORT/$HEALTH_PATH
```

---

### Step 1：全站页面地图

在测试前，先**穷举项目所有页面和路由**。

**方法**（按项目框架选择）：
- **Next.js**：扫描 `src/app/` 下所有 `page.tsx`，提取路由
- **Vue/Nuxt**：扫描 `src/pages/` 或 `src/views/`
- **Python (FastAPI/Flask)**：搜索 `@app.get|post` 或 `@router`
- **通用**：读项目的路由配置文件 + 导航组件

**输出**：一份按模块分组的页面清单，每个页面标注：
- 路径（如 `/console/skills`）
- 页面类型（列表页 / 详情页 / 表单页 / 配置页）
- 预期数据来源（哪个 API、哪张表）

---

### Step 2：逐页深度检查（核心）

**对每个页面按以下清单逐项检查：**

#### 2.1 页面加载
- [ ] HTTP 状态码 200
- [ ] 页面标题正确
- [ ] 关键内容渲染完成（不是骨架屏/loading 卡死）
- [ ] 无 JS 控制台错误
- [ ] 数据量与数据库一致（如"共 73 项"对应 DB 中 73 条记录）

#### 2.2 每个按钮
对页面上**每一个按钮**执行：
- [ ] 点击后有响应（loading / toast / 弹窗 / 跳转 / 数据变化）
- [ ] 按钮文案准确描述功能（不误导）
- [ ] 按钮有对应的后端 API 且 API 正常响应
- [ ] 破坏性按钮（删除/清空）有确认弹窗
- [ ] 操作成功/失败都有用户反馈（不静默失败）

#### 2.3 每个链接/导航
- [ ] 所有链接指向正确页面（不 404、不循环重定向）
- [ ] 导航高亮与当前页面一致
- [ ] 面包屑/返回按钮正常

#### 2.4 每个表单/输入
- [ ] 输入框有 placeholder 或 label
- [ ] 必填项有标识
- [ ] 提交后数据正确写入数据库
- [ ] 编辑后数据正确更新
- [ ] 空表单提交有校验提示

#### 2.5 每个列表/表格
- [ ] 数据正确加载（条数、内容与 DB 一致）
- [ ] 搜索/筛选正常工作
- [ ] 分页正常（上一页/下一页/总数）
- [ ] 排序正常（如按时间倒序）
- [ ] 空状态有友好提示（非空白页面）

#### 2.6 UI/UX 检查
- [ ] 布局无挤压、无溢出、无重叠
- [ ] 文字不截断（长文本有 truncate + tooltip）
- [ ] 按钮有明确的功能描述（而非「提交」「确定」等模糊词）
- [ ] 解释性内容用小问号/tooltip，不占主界面空间
- [ ] 响应式（手机端不破版，如需要的话）
- [ ] Loading 状态有骨架屏或 spinner（不是空白）
- [ ] 颜色对比度足够（文字可读）
- [ ] 间距统一（padding/margin 一致）

---

### Step 3：后端 API 回归测试

**对每个 API 端点执行：**

1. **列出所有 API**：
   - Next.js：扫描 `src/app/api/` 下所有 `route.ts`
   - FastAPI：搜索 `@app.get|post|put|delete|patch`
   - Express：搜索 `router.get|post|put|delete`

2. **逐个调用验证**：
   - GET 端点：返回 200 + 正确数据结构
   - POST 端点：创建成功 + 数据库有新记录
   - PUT/PATCH 端点：更新成功 + 数据库记录变化
   - DELETE 端点：删除成功 + 数据库记录消失
   - 认证端点：无 token 返回 401/403

3. **边界测试**：
   - 空参数请求
   - 不存在的 ID
   - 超长字符串
   - 重复提交

4. **错误处理检查**：
   - 每个 API 调用都有 try/catch
   - 错误响应有明确的错误信息
   - 不暴露内部错误细节给前端

5. **API 响应字段差异防御**（2026-03-15 沉淀）：
   - 不同端点的数据字段名可能不同（`data`/`results`/`orders`/`records`）
   - 测试脚本解析前先 `print(list(response.keys()))` 确认结构
   - 聚合统计端点的总数必须与列表端点的实际条数交叉验证

---

### Step 3.5：小程序/移动端代码审查（2026-03-15 新增）

> 适用于项目包含微信小程序或移动端的情况。

1. **页面全量扫描**：
   - 读 `app.json` 获取所有注册页面
   - 逐页检查 `.js` / `.wxml` / `.wxss`

2. **API 路径合规**：
   - 小程序只调 `/api/miniprogram/*`
   - 管理端只调 `/api/admin/*` + `/api/db/*`
   - 发现混调即为 Bug

3. **废弃 API 检查**：
   ```bash
   grep -rn "getUserProfile\|createCanvasContext" miniprogram/
   ```

4. **模块语法统一**：
   ```bash
   grep -rn "export default" miniprogram/utils/
   ```
   小程序默认不支持 ES Module，`export default` 会运行报错。

5. **硬编码搜索**：
   ```bash
   grep -rn "apiBase\|appId\|mchId" miniprogram/
   ```

6. **死代码/测试残留**：
   ```bash
   grep -rn "mock\|Mock\|测试模式\|test mode" miniprogram/pages/
   grep -rc "console.log" miniprogram/pages/ | grep -v ":0$"
   ```

7. **核心流程审查**：逐条走通 登录→阅读→购买→VIP→分销→提现→匹配

---

### Step 4：数据库一致性检查

1. **数据量核对**：每个集合/表的记录数与前端显示一致
2. **唯一性检查**：关键字段（如 id）无重复
3. **完整性检查**：必填字段无空值
4. **关联性检查**：外键/引用字段指向有效记录
5. **索引检查**：高频查询字段有索引
6. **数据合理性**：状态字段值在预期范围内

**MongoDB 通用检查脚本**：
```javascript
// 检查每个集合的数量和重复
const db = require('mongodb').MongoClient.connect(MONGO_URI);
for (const col of collections) {
  const total = await db.collection(col).countDocuments();
  const distinct = await db.collection(col).distinct('id');
  console.log(`${col}: ${total} total, ${distinct.length} unique`);
  if (total !== distinct.length) console.error(`⚠️ ${col} has duplicates!`);
}
```

---

### Step 5：安全隐患排查

**必查清单**：
- [ ] 登录/认证机制是否正常工作
- [ ] 敏感页面是否有权限保护（middleware/guard）
- [ ] API Key / 密码是否硬编码在源码中（应在 .env）
- [ ] API Key 展示是否做脱敏（首 8 末 4）
- [ ] 重定向参数是否有校验（防开放重定向）
- [ ] 文件上传是否限制类型和大小
- [ ] SQL/NoSQL 注入防护
- [ ] XSS 防护（用户输入是否转义）
- [ ] CORS 配置是否合理
- [ ] Cookie 安全属性（httpOnly、sameSite、secure）
- [ ] 错误信息不泄露内部细节（堆栈、路径、密钥）

---

### Step 6：重复/废弃功能清理

- 检查是否有功能重复的页面或组件
- 检查导航中是否有失效链接
- 检查是否有未使用的 API 端点
- 检查是否有未使用的组件/函数（死代码）
- 清理发现的重复/废弃内容

---

### Step 7：全站截图存档

**截图范围**：
- 每个页面的默认状态
- 每个页面的核心交互状态（如展开详情、打开弹窗）
- 每个页面的空状态
- 登录页
- 错误页（404 等）

**存储路径**：`/Users/karuo/Documents/卡若Ai的文件夹/图片/网站测试截图/[项目名]/`

---

### Step 8：参考学习（可选）

当发现功能有优化空间时：
1. 搜索 GitHub 上同类优秀项目的实现方式
2. 参考 OpenCloud、Vercel Dashboard、Supabase Studio 等成熟后台的 UI/UX
3. 学习核心代码并适配到自己的项目
4. 记录参考来源和学习要点

---

### Step 9：经验沉淀

**每次测试完成后必须执行**：

1. **写经验文档**：`02_卡人（水）/水溪_整理归档/经验库/待沉淀/[项目名]_测试经验_YYYYMMDD.md`
   - 分类：P0 严重 / P1 重要 / P2 优化
   - 每个问题：现象 → 根因 → 修复方式
   - 通用经验提炼（不绑定特定项目）

2. **更新本 SKILL 经验库**（本文件末尾 §八）

3. **发飞书复盘总结**

---

### Step 10：输出测试报告

```
============================================
  [项目名] 全栈测试报告 — YYYY-MM-DD HH:MM
============================================

【测试范围】
  页面总数: X | API 端点: Y | 数据库集合/表: Z

【前端渲染】 X/Y 页面通过
  ✅ 页面A: 正常（N 个按钮全部可用）
  ❌ 页面B: [问题] → [修复] → [验证通过]

【后端 API】 X/Y 端点通过
  ✅ GET /api/xxx: 200 OK
  ❌ POST /api/yyy: [问题] → [修复]

【数据库】 X 项检查
  ✅ 唯一性: 全部通过
  ⚠️ [问题] → [修复]

【安全审计】
  ✅ 认证机制: 正常
  ⚠️ [问题] → [修复]

【UI/UX】
  ✅ 布局: 无挤压
  ⚠️ [问题] → [修复]

【修复记录】
  1. [BUG] xxx → [修复方式] → ✅ 验证通过
  2. [优化] xxx → [提升方式] → ✅ 验证通过

【截图归档】 X 张截图已存入 [路径]

总结: X/Y 通过, Z 个问题已修复, W 个待处理
============================================
```

---

## 四、修复原则（通用）

### 4.1 前端问题
| 现象 | 修复方向 |
|:-----|:---------|
| 页面白屏/404 | 检查路由配置、文件路径 |
| 按钮无响应 | 检查事件绑定、disabled 状态、API 是否缺失 |
| 数据不加载 | 检查 fetch 调用、API 返回格式、useEffect 依赖 |
| 布局挤压/溢出 | 检查 flex/grid 配置、overflow、min-width |
| 文案误导 | 按钮文案改为准确描述功能 |
| 静默失败 | 添加 try/catch + 用户反馈（toast/alert） |
| 删除无确认 | 添加 confirm() 弹窗 |

### 4.2 后端问题
| 现象 | 修复方向 |
|:-----|:---------|
| 500 错误 | 查服务端日志、检查异常处理 |
| API 缺失 | 补充对应的 route handler |
| 数据格式错误 | 检查 schema/model 定义 |
| 认证失败 | 检查 token/cookie/middleware |
| 并发问题 | 加锁/唯一索引/幂等处理 |

### 4.3 数据库问题
| 现象 | 修复方向 |
|:-----|:---------|
| 数据重复 | 唯一索引 + replaceOne upsert（不要 deleteMany+insertMany） |
| 孤儿记录 | 清理 + 加级联删除 |
| 字段缺失 | 补填默认值 |
| 索引缺失 | createIndex 加速查询 |

### 4.4 安全问题
| 现象 | 修复方向 |
|:-----|:---------|
| 密钥硬编码 | 迁移到 .env 环境变量 |
| API Key 明文展示 | 脱敏显示（首 8 末 4） |
| 开放重定向 | 校验 redirect 参数只允许内部相对路径 |
| 登录页不可达 | middleware 白名单放行 |
| 无权限保护 | 添加 middleware/guard |

---

## 五、技术栈参考

| 工具 | 用途 |
|:-----|:-----|
| **浏览器自动化（MCP browser）** | 逐页点击、截图、DOM 检查 |
| **curl / httpx** | API 端点测试 |
| **MongoDB shell / mongosh** | 数据库直查 |
| **pytest / jest** | 单元/集成测试 |
| **Lighthouse** | 性能与可访问性 |
| **OWASP ZAP** | 安全扫描 |

---

## 六、与其他 SKILL 联动

| 场景 | 联动 SKILL |
|:-----|:-----------|
| 功能开发后测试 | 全栈开发 → **全栈测试** → 复盘 |
| 前端样式问题 | **全栈测试** → 前端开发（F01a） |
| 数据库问题 | **全栈测试** → 数据库管理（G13） |
| 安全问题 | **全栈测试** → 金盾（数据安全） |
| 部署后验证 | 服务器管理（G07） → **全栈测试** |

---

## 七、自动化脚本模板

### 7.1 通用健康检查
```bash
#!/bin/bash
BASE="http://localhost:${1:-3000}"
echo "=== Health Check: $BASE ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE")
echo "Root: HTTP $STATUS"

echo "=== API Endpoints ==="
for EP in $(grep -r "export.*async.*function.*GET\|POST\|PUT\|DELETE" src/app/api/ -l 2>/dev/null | sed 's|src/app||;s|/route.ts||;s|/route.js||'); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${EP}")
  echo "  $EP → $CODE"
done
```

### 7.2 MongoDB 数据检查
```javascript
const { MongoClient } = require('mongodb');
async function check() {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db(process.env.MONGO_DB);
  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    const total = await db.collection(name).countDocuments();
    const ids = await db.collection(name).distinct('id');
    const status = total === ids.length ? '✅' : '⚠️ DUPLICATES';
    console.log(`${status} ${name}: ${total} docs, ${ids.length} unique ids`);
  }
  client.close();
}
check();
```

---

## 八、经验库（持续沉淀）

> 每次测试发现的通用问题和解决方案记录在此，供所有项目参考。

### 8.1 卡若AI 官网（2026-03-13 ~ 2026-03-14）

| 问题 | 根因 | 修复 | 通用教训 |
|:-----|:-----|:-----|:---------|
| 技能数据翻倍（146 vs 73） | storage-mongo.ts 用 deleteMany+insertMany 竞态 | 唯一索引 + replaceOne upsert | **MongoDB 并发写必须唯一索引 + 幂等 upsert** |
| 登录页不可达 | middleware 未白名单放行 /login | 显式放行 LOGIN_PATH | **middleware 拦截时必须白名单放行认证页** |
| 开放重定向漏洞 | login 的 next 参数未校验 | 限制只允许 / 开头且非 // 的路径 | **重定向参数必须校验** |
| 心跳页崩溃 | exec.actions 可能 undefined | 全部加 ?? [] | **数组属性永远加空值防御** |
| API Key 明文展示 | 前端直接显示完整 key | 脱敏首 8 末 4 | **敏感信息只做脱敏展示** |
| 删除无确认 | 直接调 DELETE API | 加 confirm() | **破坏性操作必须确认弹窗** |
| API 静默失败 | fetch 无 try/catch 和 res.ok 检查 | 统一加错误处理 | **每个 fetch 都要 try/catch + res.ok** |
| 基因胶囊删除 API 缺失 | route.ts 没有 DELETE handler | 补 handler | **前端有操作按钮，后端必须有对应 API** |
| 导航入口丢失 | ConsoleShell navGroups 遗漏 | 补回导航项 | **改导航结构后必须全量验证** |
| CTA 链接错误 | 营销页链接指向不存在的路由 | 修正链接 | **所有 Link/href 必须指向有效路由** |

### 8.2 Soul 创业派对（2026-03-15）

| 问题 | 根因 | 修复方向 | 通用教训 |
|:-----|:-----|:---------|:---------|
| OSS accessKeySecret 明文返回前端 | AdminSettingsGet 未脱敏 ossConfig | 后端返回时隐藏 Secret | **密钥类配置返回前端必须脱敏，只返回 `****`** |
| 管理端无登录守卫 | 前端路由无 token 检查 | 添加路由守卫 | **SPA 管理端必须有全局路由守卫，未登录跳 /login** |
| payment.js API 路径全部错误 | 用了不存在的 `apiBase`，路径不符规范 | 删除或重构 | **工具文件须定期扫描是否仍在被引用，无引用即删** |
| 小程序跳转路径不存在 | `pages/catalog/catalog` 不在 app.json | 改为正确路径 | **跳转路径必须与 app.json pages 注册一致** |
| wx.getUserProfile() 已废弃 | 2022年后不可用 | 改用 chooseAvatar | **定期检查微信基础库废弃 API，及时迁移** |
| ES Module/CommonJS 混用 | export default 与 module.exports 混用 | 统一模块语法 | **小程序项目模块导入方式必须统一（除非确认构建工具支持）** |
| 匹配 API 失败时伪装成功 | catch 中 setData `joinSuccess:true` | 移除伪装逻辑 | **API 失败绝不伪装成功，必须真实反馈给用户** |
| 生产环境残留测试模式 | match.js 中「测试模式购买」 | 删除测试代码 | **上线前必须搜索清理 mock/test/debug 代码** |
| admin/chapters 分页被忽略 | handler 未读取 page/pageSize 参数 | 添加分页支持 | **列表 API 必须支持 page+pageSize 参数** |
| admin/users 返回管理员而非用户 | 端点逻辑错误 | 区分管理员与普通用户 API | **API 命名必须准确反映返回数据** |
| 热度 Top20 有 8 条零点击 | reading_progress 数据不完整 | 检查阅读追踪上报 | **热度算法依赖的数据源（阅读/付费）须验证完整性** |
| 免费章节数不一致 | stats 查 `is_free=true` 与实际数不符 | 核查查询条件 | **聚合统计必须与列表接口交叉验证** |
| baseUrl/appId/mchId 硬编码 | 前端代码直接写死 | 移至配置文件或 API | **环境相关配置不硬编码，走 .env 或后端 config API** |
| console.log 调试日志未清理 | 开发完未清理 | 上线前 grep 清理 | **上线检查清单加一项：grep -r "console.log" 并清理** |

**Soul 项目测试方法论沉淀（通用可复用）**：

1. **三端隔离验证法**（适用于小程序+管理端+API 架构）：
   - 小程序只调 `/api/miniprogram/*`，管理端只调 `/api/admin/*` + `/api/db/*`
   - 发现混调即为 Bug

2. **API 响应结构解析要注意字段名差异**：
   - 同一项目不同端点可能用 `data`/`results`/`orders`/`records` 等不同字段
   - 测试脚本解析前先 `print(list(d.keys()))` 确认结构

3. **OSS 上传测试四步法**：
   - ① 配置写入验证 → ② 上传接口调用 → ③ 返回 URL 可访问性 → ④ bucket ACL/签名策略验证
   - 阿里云新账号默认「禁止公共访问」，需用签名 URL 或控制台关闭限制

4. **小程序代码审查重点项**：
   - 废弃 API 检查（wx.getUserProfile / wx.createCanvasContext）
   - 模块语法统一（ES Module vs CommonJS）
   - 未使用工具文件检查（特别是 utils/ 下的公共模块）
   - 硬编码搜索（grep `hardcode` 关键：URL/appId/mchId/微信号/日期）
   - mock/test 代码残留检查

5. **安全检查必做项**（本次新增）：
   - `/api/admin/settings` 返回的配置中密钥是否脱敏
   - 前端路由守卫是否生效（直接访问后台路径）
   - Token 存储方式（小程序 setStorageSync 可接受）
   - 支付参数来源（必须从后端获取，不可前端生成）

### 8.3 万推 v2（2026-03-11）

| 问题 | 根因 | 修复 | 通用教训 |
|:-----|:-----|:-----|:---------|
| Vue is not defined | unpkg CDN 被墙 | 切换 cdn.jsdelivr.net | **CDN 选择优先级：jsdelivr > unpkg > cdnjs** |
| stealth_async 不存在 | playwright_stealth API 变化 | 改用新 API | **第三方库更新后检查 API 兼容性** |
| 复选框点击无响应 | @click.stop 无自身 handler | 添加 handler | **事件修饰符不替代事件处理** |
| 18 条孤儿分发 | video_id=NULL | 清理 + 防御 | **外键字段加 NOT NULL 约束** |
| pending 任务卡住 | 心跳只处理排期任务 | 增加 stale 任务自动捡起 | **后台任务需要超时兜底机制** |
