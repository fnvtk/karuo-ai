# wzdj 启动失败 MODULE_NOT_FOUND 修复经验

> 来源：卡若AI 服务器管理 | 2026-03-03

## 现象

- 宝塔 Node 项目 **wzdj** 启动失败，弹窗报错：`Error: Cannot find module '/www/wwwroot/self/wzdj'`（MODULE_NOT_FOUND）
- 站点 https://wzdj.quwanzhi.com 无法打开（超时或 502）

## 根因

- 宝塔里 wzdj 的**项目路径**配置为 `/www/wwwroot/self/wzdj`，而实际项目部署在 **`/www/wwwroot/wzdj`**（无 self 子目录）。
- 启动命令错误时，Node 会把「路径」当作模块入口加载，导致 MODULE_NOT_FOUND。

## 处理

1. **仅修正路径并重启**（推荐）  
   执行：`01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_TAT_wzdj_修正路径并重启.py`  
   - 在 kr宝塔 上把 site.db 中 wzdj 的 `path` 改为 `/www/wwwroot/wzdj`，`project_script` 改为 `cd /www/wwwroot/wzdj && (pnpm start 2>/dev/null || npm run start)`，并调用宝塔 API 重启 wzdj。

2. **若仍无法访问**：在 kr宝塔 上确认 `/www/wwwroot/wzdj` 下有 `package.json`、已执行过 `pnpm build`，再执行一次「拉取构建并重启」：  
   `scripts/腾讯云_TAT_wzdj_拉取构建并重启.py`

3. **批量修复时兜底**：`腾讯云_TAT_kr宝塔_强制停启Node.py` 与 `腾讯云_TAT_kr宝塔_运行堵塞与Node深度修复.py` 的 PATH_FALLBACK 已加入 `"wzdj": ["/www/wwwroot/wzdj"]`，路径错误时会被自动纠正。

## 可复用

- 同类问题：宝塔 Node 项目报 MODULE_NOT_FOUND 且错误里是「路径」→ 先查 site.db 里该项目 path 是否指向真实项目目录，再改 path + project_script（`cd 正确路径 && (pnpm start || npm run start)`）并重启。
