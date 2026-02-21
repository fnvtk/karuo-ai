# Node 项目未启动 · MODULE_NOT_FOUND 修复指南

> 针对 kr宝塔 43.139.27.93 多个 Node 项目「未启动」及「启动失败 MODULE_NOT_FOUND」的处理。

---

## 一、批量启动（先执行）

在 **宝塔面板 → 终端** 执行 `references/宝塔面板终端_Node批量启动指南.md` 中的脚本，先尝试批量启动所有未运行项目。

---

## 二、MODULE_NOT_FOUND 原因

错误示例：
```
Error: Cannot find module '/www/wwwroot/自营/玩值/玩值大屏'
Error: Cannot find module '/www/wwwroot/自营/wzdj'
```

**原因**：启动命令配置错误，把**目录路径**当成了入口文件。Node 无法把目录当模块执行。

---

## 三、按项目修复（宝塔 Node 项目 → 编辑）

| 项目 | 根目录 | 建议启动命令 | 说明 |
|------|--------|--------------|------|
| **玩值大屏** | /www/wwwroot/自营/玩值/玩值大屏 | `cd /www/wwwroot/自营/玩值/玩值大屏 && node server.js` 或 `npm run start` | 先确认目录内有 server.js / package.json 的 scripts.start |
| **wzdj** | /www/wwwroot/自营/wzdj | `cd /www/wwwroot/自营/wzdj && node server.js` 或 `npm run start` | 同上 |
| **tongzhi** | /www/wwwroot/自营/玩值/tongzhi | `cd /www/wwwroot/自营/玩值/tongzhi && node server.js` 或 `npm run start` | 同上 |
| **is_phone** | /www/wwwroot/自营/kr/kr-phone | `cd /www/wwwroot/自营/kr/kr-phone && node server.js` 或 `npm run start` | 同上 |
| **ai_hair** | /www/wwwroot/客户/ai_hair | 同上 | 同上 |
| **AITOUFA** | /www/wwwroot/扩展/小工具/AITOUFA | `cd /www/wwwroot/扩展/小工具/AITOUFA && npm run start` | 参考 Skill §4.6 |
| **zhiji** | /www/wwwroot/... | 同上 | 按实际结构 |
| **ymao** | /www/wwwroot/扩展/ymao | 同上 | 同上 |
| **zhaoping** | /www/wwwroot/客户/zhaoping | 同上 | 同上 |

---

## 四、启动命令规则

1. **Next.js**：`cd 项目根目录 && npm run start` 或 `pnpm start`；若用 standalone：`node .next/standalone/server.js`
2. **Express / 普通 Node**：`cd 项目根目录 && node server.js` 或 `node index.js`
3. **禁止**：`node /www/wwwroot/xxx/项目名`（目录不能当入口）

---

## 五、修复步骤（每个失败项目）

1. 宝塔 → **网站** → **Node 项目** → 找到该项目 → **设置** 或 **编辑**
2. 找到「启动文件」或「启动命令」配置
3. 改为：`cd /项目根目录 && node server.js` 或 `npm run start`（按项目类型选）
4. **Node 版本**：与 package.json 的 engines 一致（多数 v18.20.0，wzdj/zhiji 用 v20.18.0）
5. 保存后点击 **重启**

---

## 六、先确认项目结构

在宝塔终端执行，确认各项目有入口文件：

```bash
for d in /www/wwwroot/自营/玩值/玩值大屏 /www/wwwroot/自营/wzdj /www/wwwroot/自营/玩值/tongzhi /www/wwwroot/自营/kr/kr-phone; do
  echo "=== $d ==="
  ls -la "$d/" 2>/dev/null | grep -E "server\.js|index\.js|package\.json|\.next" || echo "  (无常见入口)"
done
```

根据输出选择 `node server.js`、`node index.js` 或 `npm run start`。
