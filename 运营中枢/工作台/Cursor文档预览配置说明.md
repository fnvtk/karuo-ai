# Cursor 文档预览配置说明

> 更新：2026-03-06。**点 .md 只出现一个界面**，且该界面为 **Markdown Preview Enhanced 插件的预览**（增强预览、非代码）；不用本机原有预览、不出现两个面板。

---

## 已做配置（User 设置）

在 **Cursor User settings**（`~/Library/Application Support/Cursor/User/settings.json`）中：

**① .md 默认用插件的 Enhanced 预览打开，且只显示一个界面：**

```json
"workbench.editorAssociations": {
  "*.md": "markdown-preview-enhanced"
}
```

效果：点击 .md 后**直接只打开一个界面**，即 **Markdown Preview Enhanced 插件的预览**（增强页面），不是代码编辑页，也不是左右两个面板。

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

**若仍打开为内置预览**：在左侧资源管理器对任意 .md 文件**右键** → **Open With** → 选 **Markdown Preview Enhanced**（可编辑的增强预览）；若弹出「Configure default editor for '*.md'」则选它，即可强制去掉内置、以后都用 Enhanced。
