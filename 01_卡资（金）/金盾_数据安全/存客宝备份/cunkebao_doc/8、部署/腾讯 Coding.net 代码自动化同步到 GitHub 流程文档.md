# 腾讯 Coding.net 代码自动化同步到 GitHub 流程文档

## I. 概述

本流程文档详细介绍了如何配置 GitHub Actions，实现将腾讯 Coding.net 上的代码自动同步到 GitHub 仓库。通过这种方式，你可以将 Coding.net 作为主要开发仓库，而 GitHub 作为对外展示、持续集成（CI/CD）或备份的镜像仓库，实现代码的双向或单向流动（在此为单向从 Coding 到 GitHub）。

**核心理念：** 利用 GitHub Actions 的定时触发或手动触发能力，通过 Git 命令从 Coding.net 拉取最新代码，然后强制推送到 GitHub 仓库。

## II. 前提条件

在开始配置之前，请确保你已具备以下条件：

1.  **腾讯 Coding.net 账号**：并已拥有一个托管项目代码的仓库（例如：`g-xtcy5189/cunkebao/cunkebao_v3`）。
2.  **GitHub 账号**：并已拥有一个用于接收同步代码的仓库（例如：`fnvtk/cunkebao_v3`）。
3.  **GitHub Actions Secrets**：在你的 GitHub 仓库中，需要配置用于访问 Coding.net 的用户名和个人访问令牌（Personal Access Token），以及 GitHub Actions 自身用于推送的权限。

## III. 整体同步流程概览

以下是整个自动化同步流程的高层概览图：

```graph TD
    A[Coding.net Push] --> B(GitHub Actions);
    B -- 拉取Coding --> C[工作区];
    C -- 强制推送 --> D(GitHub Sync);
```

## IV. 各环节详细流程与配置

### A. 阶段一：腾讯 Coding.net 仓库准备

这是你的代码源头，确保你的代码已正确托管在此。

1.  **确认 Coding.net 仓库地址：**
    *   登录 Coding.net，找到你的项目仓库（例如：`g-xtcy5189/cunkebao/cunkebao_v3`）。
    *   复制其 **HTTPS** 克隆地址。格式应类似：`https://e.coding.net/g-xtcy5189/cunkebao/cunkebao_v3.git`。
2.  **生成个人访问令牌 (Personal Access Token, PAT)：**
    *   在 Coding.net 页面右上角，点击你的头像，选择 `个人设置` 或 `账户设置`。
    *   在左侧导航栏中，寻找 `访问令牌`、`个人访问令牌` 或 `API 令牌`。
    *   点击 `新建令牌`。
    *   **令牌名称**：输入一个易于识别的名称，例如 `GitHub-Actions-Sync-Token`。
    *   **权限选择**：**非常重要！** 确保勾选 `代码仓库 (Repository)` -> `读取` 权限。如果你需要工作流未来还能对 Coding.net 执行其他操作，可以根据需求添加更多权限。
    *   **有效期**：根据你的安全策略设置，可以设置为"永不失效"以确保自动化任务长期运行，或设置一个较长的有效期。
    *   **生成并复制令牌：** 生成后，系统会显示令牌字符串。**这个字符串只会显示一次，务必立即复制并妥善保存。** 这个就是你的 `CODING_TOKEN`。

### B. 阶段二：GitHub 仓库配置

这是你的代码同步目的地。

1.  **确认 GitHub 仓库地址：**
    *   登录 GitHub，找到你的目标仓库（例如：`fnvtk/cunkebao_v3`）。
    *   复制其 **HTTPS** 克隆地址。格式应类似：`https://github.com/fnvtk/cunkebao_v3.git`。
2.  **配置 GitHub Secrets：**
    为了让 GitHub Actions 安全地访问 Coding.net 仓库并推送到 GitHub 仓库，你需要配置两个秘密。
    *   在 GitHub 仓库页面，点击 `Settings`（设置）。
    *   在左侧导航栏中，点击 `Secrets and variables` -> `Actions`。
    *   点击 `New repository secret`（新建仓库秘密）。
    *   **创建 `CODING_USERNAME`：**
        *   `Name`：`CODING_USERNAME`
        *   `Value`：你的 Coding.net 登录用户名。
        *   点击 `Add secret`。
    *   **创建/更新 `CODING_TOKEN`：**
        *   `Name`：`CODING_TOKEN`
        *   `Value`：你在 Coding.net 生成并复制的个人访问令牌。
        *   点击 `Add secret`。
    *   **注意 `GITHUB_TOKEN`：** GitHub Actions 会自动为每次运行提供一个名为 `GITHUB_TOKEN` 的临时令牌。这个令牌通常有读取权限，但我们需要为它赋予写入权限，以便它能推送到仓库。这将在工作流配置中完成。

### C. 阶段三：GitHub Actions 工作流配置

这是实现同步的核心逻辑。

1.  **创建工作流文件：**
    *   在你的 GitHub 仓库中，导航到 `.github/workflows/` 目录。
    *   创建一个新文件，例如 `sync-from-coding.yml`。
    *   将以下 YAML 代码粘贴到文件中，并确保完整覆盖所有内容。

    ```yaml
    # .github/workflows/sync-from-coding.yml
    name: Sync from Coding # 工作流名称，显示在 GitHub Actions 页面

    on:
      schedule:
        - cron: '0 */2 * * *'   # 定时触发：每2小时执行一次 (UTC 时间，请根据需要调整)
      workflow_dispatch:        # 允许手动触发：可以在 GitHub Actions 页面点击"Run workflow"

    jobs:
      sync: # 定义一个名为 'sync' 的 Job
        runs-on: ubuntu-latest # 在最新的 Ubuntu 虚拟机上运行
        permissions:
          contents: write # 赋予此工作流写入仓库内容的权限，这是 Git Push 成功的关键

        steps:
          - name: 检出 GitHub 仓库
            uses: actions/checkout@v4 # 使用 actions/checkout action 检出当前 GitHub 仓库的代码，以便在其基础上操作

          - name: 拉取 Coding 代码并同步
            run: |
              # 克隆 Coding 仓库到一个临时目录 'coding-repo'
              # 使用 GitHub Secrets (CODING_USERNAME, CODING_TOKEN) 进行认证
              git clone https://${{ secrets.CODING_USERNAME }}:${{ secrets.CODING_TOKEN }}@e.coding.net/g-xtcy5189/cunkebao/cunkebao_v3.git coding-repo
              
              # 拷贝 'coding-repo' 目录中的所有内容到当前工作目录（GitHub 仓库的工作区）
              # rsync -av: 归档模式，保留文件属性；-a 递归复制所有内容；-v 显示详细输出。
              # --exclude='.git': 排除临时克隆仓库中的 .git 目录，避免覆盖 GitHub 仓库自身的 .git 目录
              rsync -av --exclude='.git' coding-repo/ .

              # 清理临时目录，保持工作区整洁
              rm -rf coding-repo

          - name: 配置 Git 用户
            run: |
              # 配置 Git 提交时使用的用户信息，这些信息会显示在 GitHub 的提交记录中
              git config --global user.name "zhiqun@qq.com"
              git config --global user.email "zhiqun@qq.com"

          - name: 提交并推送到 GitHub
            run: |
              # 添加所有更改到 Git 暂存区。`.` 表示当前目录下的所有文件
              git add .
              # 提交更改。如果工作区没有文件变化，`|| echo "No changes to commit"` 会防止此步骤失败并输出提示
              git commit -m "Sync from Coding at $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
              # 执行 Git 推送命令：
              # --force-with-lease: 这是一个更安全的强制推送选项。它会强制更新远程分支，覆盖远程的最新提交，但会先检查远程分支是否在你上次拉取或克隆后被其他人更新过。如果被其他人更新了，它会拒绝推送，从而避免覆盖意外的并行更改。
              # https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/fnvtk/cunkebao_v3.git: 这是显式地使用 GitHub Actions 提供的 `GITHUB_TOKEN` 进行认证推送。`GITHUB_TOKEN` 是由 GitHub 自动生成和管理的临时令牌，在 `permissions: contents: write` 配置下具有写入权限。
              # HEAD:develop: 表示将当前分支的 HEAD（最新提交）推送到远程的 `develop` 分支。
              git push --force-with-lease https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/fnvtk/cunkebao_v3.git HEAD:develop
    ```
2.  **提交工作流文件：**
    *   在 GitHub 网页界面编辑并粘贴完代码后，填写提交信息（例如："Add workflow for syncing code from Coding.net to GitHub"）。
    *   点击 `Commit changes` 按钮。

## V. 验证同步

完成以上所有配置后，每次当你的 GitHub Actions 工作流运行成功时，GitHub 仓库的 `develop` 分支的代码都将与你 Coding.net 仓库的最新代码保持一致。

**验证方法：**

1.  **查看 GitHub Actions 运行状态：**
    *   在 GitHub 仓库页面，点击 `Actions` 选项卡。
    *   找到 `Sync from Coding` 工作流，查看其运行历史和状态。绿色的勾表示成功。
2.  **查看工作流日志：**
    *   点击成功的运行，展开各个步骤，特别是 `拉取 Coding 代码并同步` 和 `提交并推送到 GitHub` 步骤，查看详细日志输出，确保没有错误。
3.  **在 Coding.net 进行测试修改：**
    *   在你的 Coding.net 仓库中，对一个现有文件（例如 `Cunkebao` 目录下的某个文件）进行一个微小的、可识别的修改（例如，添加一行注释 `// Test sync from Coding`）。
    *   提交并推送到 Coding.net 仓库。
    *   等待 GitHub Actions 工作流自动运行（根据你设置的 `cron` 时间），或手动触发。
    *   工作流成功后，回到 GitHub 仓库，查看该文件的内容和最近修改日期，确认它已同步更新。

---

## VI. 可能遇到的问题与解决方案

以下是你在此同步过程中可能遇到的一些常见问题及其解决方案：

### 问题 A：`Process completed with exit code 128` (一般性 Git 错误)

**描述：** 这是一个通用的 Git 命令失败错误码，具体原因需要查看详细日志。

**解决方案：**
*   **查看 GitHub Actions 详细日志：** 在 GitHub Actions 运行页面，展开报错步骤，仔细查看 `Run` 步骤下的输出，Git 通常会给出具体的错误信息。
*   **常见原因：**
    *   **网络问题：** 瞬时的网络连接问题可能导致克隆失败。
    *   **Git LFS 问题：** 如果你的仓库使用了 Git LFS，但 GitHub Actions 环境中未正确配置，可能会导致此错误。

### 问题 B：`fatal: unable to access 'e.coding.net/...': URL rejected: Port number was not a decimal number between 0 and 65535`

**描述：** Git 在解析 Coding.net 仓库的 URL 时，认为其中包含了无效的端口号。这通常发生在认证信息（用户名或个人访问令牌）中包含冒号 `:` 字符时。

**解决方案：**
1.  **检查 `CODING_USERNAME` 和 `CODING_TOKEN` 的值：**
    *   **登录 GitHub**，进入你的 `fnvtk/cunkebao_v3` 仓库的 `Settings` -> `Secrets and variables` -> `Actions`。
    *   确认 `CODING_USERNAME` 的值不包含任何冒号 `:`。
    *   **重新在 Coding.net 上生成一个新的个人访问令牌。** 在生成时，确保新生成的令牌字符串中不包含冒号 `:`（虽然这种情况不常见，但以防万一）。
    *   将新生成的令牌值更新到 GitHub 的 `CODING_TOKEN` Secret 中。
2.  **确认 Coding.net 仓库的 HTTPS 地址：** 确保 `git clone` 命令中的 Coding.net 仓库 HTTPS 地址完全正确，没有多余的字符或拼写错误。

### 问题 C：`remote: Permission to fnvtk/cunkebao_v3.git denied to github-actions[bot].` 或 `fatal: unable to access 'https://github.com/...': The requested URL returned error: 403`

**描述：** GitHub Actions 机器人（`github-actions[bot]`）没有权限推送到你的 GitHub 仓库。

**解决方案：**
1.  **检查工作流的 `permissions` 配置：**
    *   确保 `sync-from-coding.yml` 文件中 `jobs.sync` 下有 `permissions: contents: write` 这一行。这是赋予工作流写入权限的关键。
2.  **检查 GitHub 仓库的分支保护规则：**
    *   登录 GitHub，进入你的 `fnvtk/cunkebao_v3` 仓库的 `Settings` -> `Branches`。
    *   检查 `develop` 分支（或你推送的目标分支）的保护规则。
    *   暂时禁用或调整那些可能阻止机器人直接推送的规则，例如：
        *   `Require pull request reviews before merging` (合并前需要拉取请求审查)
        *   `Require signed commits` (需要提交签名)
        *   `Restrict who can push to matching branches` (限制谁可以推送到匹配的分支)
    *   测试成功后，再根据你的安全需求重新配置。

### 问题 D：`! [rejected] HEAD -> develop (fetch first)` 或 `Updates were rejected because the remote contains work that you do not have locally.`

**描述：** 这是非快进式推送错误。你的 GitHub Actions 工作流尝试推送时，发现远程 `develop` 分支有新的提交，而你本地工作区没有这些提交，导致推送被拒绝。

**解决方案：**
1.  **确保 `git push` 命令中包含 `--force-with-lease`：**
    *   检查 `sync-from-coding.yml` 文件中 `提交并推送到 GitHub` 步骤的 `git push` 命令是否为：
        ```yaml
        git push --force-with-lease https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/fnvtk/cunkebao_v3.git HEAD:develop
        ```
    *   `--force-with-lease` 选项会强制覆盖远程分支，确保 Coding.net 的代码是主版本。
2.  **确保显式使用 `GITHUB_TOKEN`：** 上述命令中包含了 `https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/...`，这确保了认证方式的正确性。

### 问题 E：工作流成功，但 GitHub 仓库文件显示旧日期或未更新

**描述：** GitHub Actions 工作流显示成功，但 GitHub 仓库中的某些文件日期没有更新，或者看起来内容没有变化。

**解决方案：**
1.  **Git 只关心"内容"变化：**
    *   Git 的提交是基于文件内容的哈希值。如果一个文件的内容没有发生实际的字符级变化（例如，仅仅是打开文件然后保存，或者只修改了文件的元数据，但内容没有改变），Git 就会认为它没有变化，不会为它生成新的提交。
    *   GitHub 上的文件列表日期通常反映的是该文件内容最后一次发生实际变化的提交日期。
2.  **验证方法：**
    *   **在 Coding.net 上对一个"未更新"的文件进行一个微小但可见的修改（例如，添加一行注释或一个字符）。**
    *   **提交并推送到 Coding.net 仓库。**
    *   **手动触发或等待 GitHub Actions 工作流运行。**
    *   工作流成功后，再次查看 GitHub 仓库中的该文件，其日期和内容应该已经更新。如果更新了，则说明同步流程是正常的，只是之前的文件内容确实没有变化。

---

希望这份详尽的文档能帮助你彻底解决腾讯 Coding.net 到 GitHub 的代码同步问题，卡若！ 