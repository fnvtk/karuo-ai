---
name: 全栈测试
description: 卡若AI 全栈测试（火炬）— 项目功能完成后的系统化验收。覆盖前端渲染/后端API/数据库完整性/脚本运行/发布引擎五个维度。每次开发完一个功能都必须调用本 SKILL 进行测试、修复、记录。
triggers: 全栈测试、功能测试、回归测试、深度测试、端到端测试、E2E测试、API测试、发布测试、测试验收、测试报告
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-11"
---

# 全栈测试（火炬）

> 主责：项目功能开发后的**系统化测试验收**。每完成一个功能/迭代/修复，都调用本 SKILL 做全面测试，发现问题直接修复，修复后再测试，直到全部通过。

---

## 一、触发时机（强制）

以下场景**必须调用**本 SKILL：
1. 开发完一个新功能后
2. 修复 Bug 后
3. 迭代版本上线前
4. 用户反馈"功能不可用"时
5. 长时间未测试的项目重启时

---

## 二、测试五维度

### 2.1 前端渲染测试

**目标**：确保所有页面可访问、所有按钮可点击、所有交互有响应。

**执行步骤**：
1. 打开项目首页，检查 HTTP 状态和 HTML 大小
2. 检查浏览器控制台零 JS 错误（`Vue is not defined` 等致命错误）
3. 逐个导航项点击，验证每个页面渲染完整
4. 对每个页面的**核心交互元素**逐一点击操作：
   - 按钮：点击后是否有响应（loading 状态 / toast / 跳转）
   - 表单：输入后是否可提交
   - 复选框/下拉：操作后是否更新关联状态
   - 弹窗：是否可打开和关闭
5. 截图记录每个页面最终状态

**修复原则**：
- CDN 加载失败 → 切换可靠 CDN（jsdelivr > unpkg > cdnjs）
- 模板语法未编译 → 检查 Vue/React 挂载错误
- 按钮点击无响应 → 检查事件绑定、disabled 状态、ARIA role
- 样式错位 → 检查 CSS 加载顺序和媒体查询

---

### 2.2 后端 API 回归测试

**目标**：每个 API 端点真实调用，验证 HTTP 状态码和响应格式。

**执行步骤**：
1. 列出项目所有 API 端点（搜索 `@app.get|post|put|delete`）
2. 按认证流程获取 token
3. 逐个端点发送真实请求，记录：
   - HTTP 状态码（期望 200/201）
   - 响应体结构（字段是否完整）
   - 边界情况（空参数、不存在的 ID、未认证）
4. 统计通过率，未通过的立即定位原因

**标准请求模板**（curl）：
```bash
# 认证
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"xxx"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# GET 端点
curl -s "$BASE/api/endpoint?token=$TOKEN" | python3 -m json.tool

# POST 端点
curl -s -X POST "$BASE/api/endpoint?token=$TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"key":"value"}' | python3 -m json.tool
```

**修复原则**：
- 500 错误 → 查看服务端日志定位异常
- 导入错误 → 检查依赖版本兼容性（如 `playwright_stealth` API 变化）
- 数据格式错误 → 检查 Pydantic model 字段定义
- 认证失败 → 检查 token 过期时间和密钥配置

---

### 2.3 数据库完整性测试

**目标**：确保数据一致、无孤儿记录、关键字段非空。

**执行步骤**：
1. 列出所有表和记录数
2. 检查外键关联完整性（孤儿记录）：
   ```sql
   SELECT COUNT(*) FROM child WHERE parent_id NOT IN (SELECT id FROM parent);
   ```
3. 检查关键字段非空（如 video 的 file_path、account 的 platform）
4. 检查文件引用完整性（file_path 指向的文件是否存在）
5. 检查数据合理性（status 字段值域、时间字段合理性）
6. 清理发现的坏数据（删除孤儿、补填缺失字段）

**修复原则**：
- 孤儿记录 → DELETE 或 CASCADE
- 文件不存在的引用 → 标记为 failed 或删除
- 缺失字段 → 补填（如 ffprobe 提取 duration）
- 永远无法完成的 pending 任务 → 标记为 failed + 原因

---

### 2.4 脚本/服务运行测试

**目标**：确保后台服务、定时任务、心跳机制正常运行。

**执行步骤**：
1. 检查服务进程是否存活（`curl /api/health`）
2. 检查心跳/调度器是否在运行（日志中搜索心跳关键词）
3. 检查后台任务执行情况（pending 任务是否被正常捡起）
4. 检查日志中是否有未处理的异常
5. 检查环境变量是否正确加载（`.env` 文件）
6. 检查依赖包版本兼容性

**修复原则**：
- 服务未启动 → 检查端口占用、依赖缺失
- 心跳未执行 → 检查 lifespan 中的 asyncio.create_task
- 环境变量未生效 → 检查 dotenv 加载顺序
- 包版本不兼容 → 更新 requirements.txt 并安装

---

### 2.5 发布引擎/业务流程端到端测试

**目标**：模拟真实用户操作全流程，验证从输入到最终输出的完整链路。

**执行步骤**：
1. 模拟用户完整操作流程：
   - 登录 → 上传素材 → 创建任务 → 执行 → 查看结果
2. 检查每个环节的数据传递是否正确
3. 检查异步任务（BackgroundTasks）是否正确执行
4. 检查第三方集成（Playwright 浏览器自动化、AI 调用）
5. 检查错误恢复机制（失败后重试）

**修复原则**：
- Playwright 启动失败 → 检查 stealth 库 API、浏览器安装
- 上传文件丢失 → 检查 UPLOAD_DIR 配置和权限
- 异步任务卡住 → 心跳调度器自动捡起 stale 任务
- AI 调用失败 → 检查 KARUO_AI_ROOT 配置和脚本路径

---

## 三、测试报告格式

每次测试完成后，输出标准报告：

```
============================================
  [项目名] 全栈测试报告 — YYYY-MM-DD HH:MM
============================================

【前端渲染】 X/Y 页面通过
  ✅ 页面A: 正常
  ❌ 页面B: JS错误 — [错误信息]
  → 修复: [修复措施]

【后端API】 X/Y 端点通过
  ✅ GET /api/xxx: 200 OK
  ❌ POST /api/yyy: 500 — [错误信息]
  → 修复: [修复措施]

【数据库】 X 项检查
  ✅ 外键完整性: 0 孤儿
  ⚠️ 视频 duration 为空: 3 条 → 已补填
  → 修复: [修复措施]

【服务运行】
  ✅ 服务存活: HTTP 200
  ✅ 心跳调度: 运行中
  ⚠️ 环境变量: KARUO_AI_ROOT 未配置
  → 修复: [修复措施]

【端到端】
  ✅ 上传→分发→记录: 完整流程通过
  ❌ 视频号发布: headless 找不到上传按钮
  → 修复: [修复措施]

【修复记录】
  1. [BUG] xxx → [修复方式] → [验证结果]
  2. [优化] xxx → [提升方式] → [验证结果]

总结: X/Y 通过, Z 个问题已修复, W 个待处理
============================================
```

---

## 四、与其他 SKILL 联动

| 场景 | 联动 SKILL |
|:-----|:-----------|
| 功能开发后测试 | 全栈开发 → **全栈测试** → 复盘 |
| 前端样式问题 | **全栈测试** → 前端开发（神射手标准） |
| 数据库问题 | **全栈测试** → 全栈开发（数据库修复） |
| 发布引擎问题 | **全栈测试** → 多平台分发（SKILL） |
| AI 能力问题 | **全栈测试** → 视频切片/混剪（SKILL） |

---

## 五、自动化脚本参考

项目根目录可放置 `test_fullstack.sh`，一键执行全量测试：

```bash
#!/bin/bash
# 全栈测试脚本模板
BASE="http://localhost:8001"
echo "=== 1. Health Check ==="
curl -s $BASE/api/health | python3 -m json.tool

echo "=== 2. Login ==="
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
echo "TOKEN=${TOKEN:0:16}..."

echo "=== 3. API Endpoints ==="
for EP in /api/stats /api/accounts /api/videos /api/distributions /api/ai/status /api/platforms; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE${EP}?token=$TOKEN")
  echo "  $EP → $CODE"
done

echo "=== 4. Database Check ==="
python3 -c "
import sqlite3,os
conn=sqlite3.connect('wantui.db')
c=conn.cursor()
for t in ['users','platform_accounts','videos','distributions']:
    c.execute(f'SELECT COUNT(*) FROM {t}')
    print(f'  {t}: {c.fetchone()[0]}')
conn.close()
"

echo "=== Done ==="
```

---

## 六、技术栈参考（GitHub 最佳实践）

| 工具 | 用途 |
|:-----|:-----|
| **pytest** | Python 单元/集成测试框架 |
| **pytest-playwright** | Playwright 浏览器自动化测试 |
| **httpx** / **requests** | API 端点测试 |
| **sqlite3** / **SQLAlchemy** | 数据库直接检查 |
| **ffprobe** | 视频文件元数据验证 |
| **allure-pytest** | 测试报告生成 |
| **GitHub Actions** | CI/CD 自动化测试 |

---

## 七、经验库（持续沉淀）

> 每次测试发现的问题和解决方案记录在此，供后续参考。

### 7.1 万推 v2（2026-03-11）

| 问题 | 原因 | 修复 |
|:-----|:-----|:-----|
| Vue is not defined | unpkg CDN 被墙 | 切换 cdn.jsdelivr.net |
| stealth_async 不存在 | playwright_stealth 新版 API | 改用 `Stealth().use_async(async_playwright())` |
| 复选框点击无响应 | `@click.stop` 阻止冒泡但无自身 handler | 添加 `@click.stop="toggle(…)"` |
| video duration 为空 | 上传时未提取 | 添加 ffprobe 提取 |
| 18 条孤儿分发 | video_id=NULL | 清理 + 防御性检查 |
| pending 任务卡住 | 心跳只处理排期任务 | 增加 stale 任务自动捡起（>90s） |
| B站发布超时 | Playwright 等待元素 30s | headless 模式下平台加载慢，需优化等待策略 |
| 视频号找不到上传按钮 | headless DOM 不完整 | 需非 headless 或 API 方式 |
