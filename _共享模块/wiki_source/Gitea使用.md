# Gitea 使用说明

仓库地址：**http://open.quwanzhi.com:3000/fnvtk/karuo-ai**

---

## 工单（Issues）

- 新建工单时可选择模板：**功能建议**、**Bug 反馈**、**任务报备**、**默认工单**。
- 用于需求记录、Bug 跟踪、任务报备与协作。

## 合并请求（Merge Requests）

- 分支改动合并到 `main` 时创建合并请求。
- 会自动带出合并说明模板，可勾选变更类型、关联工单。

## 版本发布（Releases）

- 在「版本发布」页创建 Tag，可附说明与附件。
- 脚本：`_共享模块/scripts/create_gitea_release.sh`（可选，用于打 tag + 创建 Release）。

## 项目（Projects）

- 用于看板：待办 / 进行中 / 已完成等。
- 在 Gitea 页「项目」中新建项目，将工单拖入对应列即可。

## 软件包（Packages）

- 本仓库以文档与 Skill 为主，一般不使用软件包功能；若有发布物可再开包类型。

## 动态（Activity）

- 「动态」页自动展示提交、工单、合并请求等动态，无需配置。
