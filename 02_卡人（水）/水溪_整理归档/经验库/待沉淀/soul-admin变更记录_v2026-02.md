# Soul 管理后台 (soul-admin) 变更记录 v2026-02

> 更新时间：2026-02-21  
> 适用站点：souladmin.quwanzhi.com  
> 部署路径：`/www/wwwroot/自营/soul-admin/dist/`

---

## 一、变更概览

| 模块 | 变更项 | 说明 |
|:---|:---|:---|
| 侧边栏 | 交易中心 → 推广中心 | 菜单及页面标题统一改为「推广中心」 |
| 内容管理 | 顶部 5 按钮移除 | 移除：初始化数据库、同步到数据库、导入、导出、同步飞书 |
| 内容管理 | 仅保留 API 接口 | 仅保留「API 接口」按钮，打开 API 文档面板 |
| 内容管理 | 删除按钮 | 删除按钮改为悬停才显示（与读取/编辑一致） |
| 内容管理 | 免费/付费 | 可点击切换免费 ↔ 付费 |
| 内容管理 | 小节加号 | 每小节旁增加「+」按钮，可在此小节下新建章节 |

---

## 二、部署说明

### 2.1 正确部署路径

nginx 实际指向：

```nginx
root /www/wwwroot/自营/soul-admin/dist;
```

**重要**：需将 `soul-admin/dist` 部署到上述目录，而非 `/www/wwwroot/souladmin.quwanzhi.com/`。

### 2.2 部署步骤

```bash
# 1. 本地打包
cd /Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验/soul-admin/dist
tar -czf /tmp/souladmin.tar.gz index.html assets/

# 2. 上传并解压到正确路径
scp -P 22022 /tmp/souladmin.tar.gz root@43.139.27.93:/tmp/
ssh -p 22022 root@43.139.27.93 'cd /www/wwwroot/自营/soul-admin/dist && tar -xzf /tmp/souladmin.tar.gz && chown -R www:www . && rm /tmp/souladmin.tar.gz'
```

### 2.3 缓存处理

- `index.html` 内引用 `index-CbOmKBRd.js?v=版本号`，每次发布建议递增版本号
- 建议在 `index.html` 中调整：`?v=3` 或更高

---

## 三、技术说明

### 3.1 修改文件

- `index.html`：内联注入脚本（按钮改造、删除 hover、免费切换、加号新建）
- `assets/index-CbOmKBRd.js`：侧边栏「交易中心」→「推广中心」

### 3.2 注入脚本触发条件

- 路径包含 `content`（如 `/content`）
- 页面上存在「初始化数据库」按钮（内容管理页加载完成）

### 3.3 免费/付费切换

- 调用 `POST /api/db/book`，传入 `{ id, isFree, price }`
- 需后端支持按 id 更新 isFree/price

---

## 四、问题排查

| 现象 | 可能原因 | 处理方式 |
|:---|:---|:---|
| 界面未变化 | 部署到错误目录 | 确认部署到 `/www/wwwroot/自营/soul-admin/dist/` |
| 界面未变化 | 浏览器/CDN 缓存 | 清除缓存或使用无痕模式，或增加 `?v=` 版本号 |
| 内容管理注入不生效 | 路由为 hash 模式 | 检查 `location.pathname` 是否包含 `content`，必要时改用 `location.hash` |
| 免费切换失败 | 后端未实现更新 | 检查 soul-api 是否支持 `POST /api/db/book` 的更新逻辑 |
