# Cursor 文档预览配置说明

> 配置时间：2026-03-01。便于在 Cursor 里**直接以格式化预览打开 .md 文档**，无需每次按「Open Preview」或 ⇧⌘V。

---

## 已做配置（User 设置）

在 **Cursor User settings**（`~/Library/Application Support/Cursor/User/settings.json`）中已添加：

```json
"workbench.editorAssociations": {
  "*.md": "vscode.markdown.preview.editor"
}
```

**效果**：在资源管理器中**单击打开 .md 文件**时，会**默认用 Markdown 预览**打开，直接看到排版后的格式，无需再按「Open Preview」或 ⇧⌘V。

---

## 需要编辑 .md 时

若当前是预览视图，需要切回源码编辑：

- **右键标签页** → 「Reopen Editor With...」→ 「Text Editor」
- 或 **命令面板**（⇧⌘P）→ 输入 `Reopen Editor With` → 选「Text Editor」

---

## 可选：一侧编辑、一侧预览（免按键）

若希望**左侧编辑、右侧自动出预览**（不改变默认打开方式），可：

1. 在 Cursor 扩展市场安装 **Markdown All in One**
2. 在 `settings.json` 中增加：
   ```json
   "markdown.extension.preview.autoShowPreviewToSide": true
   ```
3. 打开 .md 后，预览会自动在右侧打开，无需再按 ⇧⌘V。

---

## 相关设置（已有）

你当前已具备的 Markdown 预览相关设置（保留不变）：

- `markdown.preview.fontSize`: 15
- `markdown.preview.lineHeight`: 1.6
- `markdown.preview.scrollPreviewWithEditor`: true（预览与编辑器同步滚动）
- `markdown.preview.doubleClickToSwitchToEditor`: true（预览中双击可切回编辑器）
