# Cursor 文档预览配置说明

> 更新：2026-03-06。**默认不使用内置 Markdown 预览**，.md 以源码打开；需要预览时使用 **Markdown Preview Enhanced** 插件。

---

## 已做配置（User 设置）

在 **Cursor User settings**（`~/Library/Application Support/Cursor/User/settings.json`）中：

```json
"workbench.editorAssociations": {
  "*.md": "default"
}
```

**效果**：单击打开 .md 文件时**以源码编辑器打开**，不占用内置 Markdown 预览。

---

## 预览时默认用插件（不用内置）

需要预览时，使用 **Markdown Preview Enhanced**，不用 Cursor 内置的「Preview」：

- **快捷键**（已在 `keybindings.json` 中绑定）：
  - **⌘⇧V**：打开插件预览（主预览）
  - **⌘K V**：在侧边打开插件预览（编辑+预览同屏）
- **命令面板**（⇧⌘P）→ 输入 `Markdown Preview Enhanced` → 选「Open Preview」或「Open Preview to the Side」。

**避免出现两个预览**：已在 `keybindings.json` 中解除内置 Markdown 预览的 ⌘⇧V / ⌘K V 绑定，并改为只打开 Markdown Preview Enhanced。请**不要点击标签栏上的「Preview」按钮**（该按钮仍会打开内置预览，导致出现两个预览）；需要预览时请用 **⌘⇧V** 或 **⌘K V**，或通过命令面板选择「Markdown Preview Enhanced: Open Preview」。

---

## 相关设置（已有）

- `markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited`: true（插件侧边自动预览可选）
- 内置 `markdown.preview.*` 仅影响内置预览，不影响插件。

上述配置保证：**默认用插件预览、不用内置 md 预览**。

---

## 若仍出现「两个预览」

- 多半是点击了标签栏上的 **「Preview」**，会多出一个内置预览。
- 处理：关掉多出来的那个预览标签，以后只用 **⌘⇧V** 或 **⌘K V** 打开预览（只会打开 PIVIE）。
- 点击 .md 时：若开启了 `markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited`，会得到「左侧编辑 + 右侧 PIVIE」一个预览；不要再去点标签栏的 Preview。
