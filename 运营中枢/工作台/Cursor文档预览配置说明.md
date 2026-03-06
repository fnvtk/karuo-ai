# Cursor 文档预览配置说明

> 更新：2026-03-06。

**界面格式约定（务必区分）：**
- **正确（必须出现）**：**第二张图** = Markdown Preview Enhanced 的界面（有「已做配置」等标题、代码块排版、清晰分段），即 Enhanced 的 Preview。
- **错误（不要出现）**：**第一张图** = 内置只读预览（标签带 Preview + Markdown、简单渲染、不可编辑），必须关掉。

点 .md 只出现**一个**界面，且必须是 **Enhanced** 的 Preview（第二张图格式），不用内置预览。

---

## 已做配置（User + Workspace 两层）

**① User 层**（`~/Library/Application Support/Cursor/User/settings.json`）与 **Workspace 层**（如 `个人.code-workspace`、`卡若Ai.code-workspace` 的 `settings`）均已配置：

```json
"workbench.editorAssociations": {
  "*.md": "markdown-preview-enhanced",
  "*.markdown": "markdown-preview-enhanced"
}
```

效果：点击 .md 后**只打开一个界面**，且必须是 **第二张图那种**（Markdown Preview Enhanced：有「已做配置」、代码块等排版），不是第一张图的内置只读预览。

**② 不自动再开侧边预览，避免出现两个界面：**

```json
"markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited": false
```

效果：不会在已有预览旁再自动打开一个侧边预览，保证**只显示一个**。

---

## 需要改源码时

当前点 .md 默认是**插件的 Enhanced 预览（单界面）**。若要编辑源码：

- **右键该 .md 标签** →「Reopen Editor With...」→ 选 **「Text Editor」**，即可切到源码编辑。

---

## 相关设置（已有）

- `workbench.editorAssociations`：`"*.md": "markdown-preview-enhanced"` → 点 .md **只出一个界面**，且是**插件的增强预览**。
- `markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited`: **false** → 不再自动开侧边，**确定只显示一个**。

上述配置保证：**点一下只出现一个界面，是默认的插件 Enhanced 预览，不是代码页，没有两个。**

---

## 最终确认：普通预览已关掉，只用 Enhanced PREVIEW

- **打开 .md**：`workbench.editorAssociations: "*.md": "markdown-preview-enhanced"` → 一定是 **Enhanced** 的 Preview，不是普通/内置预览。
- **快捷键**：`keybindings.json` 已解除内置 `markdown.showPreview` / `markdown.showPreviewToSide`，⌘⇧V、⌘K V 只触发 **markdown-preview-enhanced**，普通预览不会通过快捷键打开。
- **不要点标签栏「Preview」**：该按钮会调出内置预览；只用 Enhanced 时通过点 .md（已关联）或命令面板「Markdown Preview Enhanced: Open Preview」即可。
- **自动侧边**：`automaticallyShowPreviewOfMarkdownBeingEdited: false`，不会多出一个界面。

当前设置无误；打开 .md = 只出现 **Enhanced 的 Preview**，普通预览已关掉。

**若仍出现第一张图（内置预览）**：说明当前仍用内置打开。请：在左侧对 .md **右键** → **Open With** → 选 **Markdown Preview Enhanced**；若有「Configure default editor for '*.md'」则选它，确认后应变为**第二张图**的 Enhanced 界面。User 与 workspace 均已设 `markdown-preview-enhanced`，重开该 .md 或重载窗口后应固定为 Enhanced。
