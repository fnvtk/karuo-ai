# Cursor 文档预览配置说明

> 更新：2026-03-06。**去掉本机原有 Markdown 预览**，**只用 Markdown Preview Enhanced 插件的预览模式与显示风格**；不搞错、不敷衍。

---

## 已做配置（User 设置）

在 **Cursor User settings**（`~/Library/Application Support/Cursor/User/settings.json`）中：

**① 去掉本机内置预览，不把 .md 关联到内置预览：**

```json
"workbench.editorAssociations": {
  "*.md": "default"
}
```

效果：.md 不再用本机「Markdown 原来的那个」预览；点开 .md 先以源码编辑器打开。

**② 只用插件的预览模式，并自动打开插件预览（显示格式=插件风格）：**

```json
"markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited": true,
"markdown-preview-enhanced.openPreviewToTheSide": true
```

效果：打开 .md 后，**Markdown Preview Enhanced 插件**会自动在侧边打开预览，**你看到的预览界面和格式就是插件的（Enhanced）风格**，不是本机原有的那个预览。

---

## 预览时一律用插件（不用本机原有）

- **显示的格式**：必须是 **Markdown Preview Enhanced 插件** 的预览样式，不是 Cursor 内置的 Markdown 预览。
- **如何打开插件预览**：
  - **⌘⇧V**：打开插件预览（主预览）
  - **⌘K V**：在侧边打开插件预览（编辑+预览同屏）
  - **命令面板**（⇧⌘P）→ 输入 `Markdown Preview Enhanced` → 选「Open Preview」或「Open Preview to the Side」。
- **不要点标签栏的「Preview」**：那个会打开本机原有预览，会搞混；只用上面快捷键或命令面板，确保是插件的预览。

已在 `keybindings.json` 中解除本机预览的 ⌘⇧V / ⌘K V 绑定，并改为只打开 Markdown Preview Enhanced，保证按快捷键时**一定是插件的预览模式与风格**。

---

## 相关设置（已有）

- `workbench.editorAssociations`：`"*.md": "default"` → 本机原有预览**已去掉**，不用于 .md。
- `markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited`: **true** → 打开 .md 后自动用**插件**在侧边出预览，**显示格式=插件风格**。
- 内置 `markdown.preview.*` 仅影响本机预览，**不影响插件**；当前配置下预览界面一律是插件的。

**上述配置保证：本机原有增强预览去掉，只用 Markdown Preview Enhanced 插件的预览模式与显示格式；不搞错。**

---

## 若仍出现本机预览或两个预览

- 不要点击标签栏上的「Preview」，否则会打开本机原有预览。
- 关掉多出来的本机预览标签，以后只用 **⌘⇧V** 或 **⌘K V**（或命令面板「Markdown Preview Enhanced: Open Preview」），确保看到的是**插件的**预览界面与风格。
