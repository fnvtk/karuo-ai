I. 概述
本流程文档旨在指导您如何通过 GitHub 的 Webhook 功能，实现代码提交后自动同步到宝塔面板服务器，从而完成网站内容的自动化部署。这将极大地提高您的开发效率，减少手动部署带来的重复劳动和潜在错误。
II. 前提条件
在开始配置之前，请确保您已具备以下条件：
1.  GitHub 账号：并已拥有一个托管项目代码的仓库。
2.  宝塔面板服务器：一台已安装宝塔面板的 Linux 服务器，并确保已安装 Nginx/Apache、PHP 和 Git 环境。
3.  项目代码：您的网站或应用代码已完整地托管在 GitHub 仓库中。
4.  Composer (如果项目是 PHP)：PHP 项目需要确保服务器上安装了 Composer，用于管理项目依赖。
III. 流程概览
以下是自动化部署的整个流程图：
```mermaid
graph TD
    A[提交代码到GitHub] --> B{GitHub Webhook};
    B --> C[发送Payload到宝塔面板];
    C --> D[宝塔面板接收通知];
    D --> E[触发部署脚本];
    E --> F[执行 git pull];
    F --> G[执行 composer install (可选)];
    G --> H[清理网站缓存 (可选)];
    H --> I[网站内容自动更新];
```
流程说明：
当您将代码提交（Push）到 GitHub 仓库后，GitHub 会通过预设的 Webhook 向您的宝塔面板服务器发送一个通知（Payload）。宝塔面板接收到这个通知后，会触发一个预设的部署脚本，该脚本通常会执行 git pull 拉取最新代码，并可能运行 composer install 安装依赖，以及清理网站缓存等操作。最终，您的网站内容将自动更新到最新版本。
IV. 具体配置步骤
A. GitHub 仓库配置
5.  选择或创建项目仓库：
    登录您的 GitHub 账号，选择或创建一个您需要自动部署的项目仓库。
6.  配置 Webhook：
    这是实现自动触发部署的关键。
    *   进入您的 GitHub 仓库页面，点击顶部的 Settings（设置）。
    *   在左侧导航栏中，点击 Webhooks。
    *   点击 Add webhook（添加 Webhook）。
    *   填写以下信息：
        *   Payload URL：这个 URL 需要从宝塔面板中获取。请暂时留空，我们将在后面的宝塔面板配置步骤中获取并填回。
        *   Content type：选择 `application/json`。
        *   Secret (可选，但强烈推荐)：设置一个随机且复杂的字符串作为密钥。这个密钥用于验证请求是否真的来自 GitHub，增强安全性。例如：`your_github_webhook_secret_123`。请务必牢记这个密钥，稍后宝塔面板中会用到。
        *   Which events would you like to trigger this webhook?：选择 `Just the push event.`（仅推送事件）。这意味着只有当您向仓库推送代码时，Webhook 才会触发。
        *   Active：确保此选项被勾选。
    *   点击 Add webhook 完成添加。
B. 宝塔面板服务器配置
7.  登录宝塔面板：
    使用您的账号密码登录到宝塔面板。
8.  确保服务器环境：
    确认您的服务器已安装 Nginx (或 Apache)、PHP (版本需与项目兼容，例如 PHP 7.4) 和 Git。如果 Git 未安装，您可以通过宝塔面板的"软件商店"进行安装。
9.  创建或选择网站：
    在宝塔面板中，进入 网站 菜单，创建或选择您要部署代码的网站。确保网站的根目录（运行目录）与您的项目部署路径一致。
10.  设置 Git 部署：
    宝塔面板提供了便捷的 Git 部署功能。
    *   在网站列表中，找到对应的网站，点击右侧的 设置。
    *   在网站设置窗口中，找到 Git 选项卡，点击进入。
    *   启用 Git 部署：打开 Git 部署功能。
    *   选择平台：选择 `Github`。
    *   项目地址：填写您的 GitHub 仓库的 HTTPS 地址。例如：`https://github.com/your-username/your-repo-name.git`。
    *   分支：填写您希望自动部署的分支名称，通常是 `main` 或 `master`。
    *   Token：填写您在 GitHub Webhook 配置中设置的 `Secret` 密钥。
    *   项目部署目录：宝塔会自动填写网站的根目录，请确保它是您项目代码实际要部署的路径。
    *   部署类型：选择 `拉取`。
    *   部署完成后执行的命令 (最重要)：这是自动化部署的核心。当代码拉取完成后，宝塔会执行这些命令。您可以根据您的项目类型填写相应的命令。
        *   PHP 项目示例命令（请根据您的项目实际情况调整）：
            ```bash
            # 进入项目部署目录 (宝塔会自动切换到此目录，但为了保险可以再cd一次)
            cd /www/wwwroot/your_website_directory/
            # 拉取最新代码
            git pull
            # 安装/更新 Composer 依赖 (如果您的项目使用Composer)
            composer install --no-dev --optimize-autoloader
            # 清理框架缓存 (如果使用框架，如Laravel, Symfony等)
            # 例如 Laravel:
            # php artisan cache:clear
            # php artisan view:clear
            # php artisan config:clear
            # php artisan migrate --force # 数据库迁移，请谨慎使用！
            # 刷新权限 (有时需要)
            # chown -R www:www .
            # chmod -R 755 .
            # chmod -R 777 storage bootstrap/cache # 给予某些目录写入权限
            ```
            请根据您的项目实际情况，选择并修改适合的命令。
    *   Webhook URL：在您配置完上述信息并保存后，宝塔面板会为您生成一个 `WebHook地址`。复制这个 URL。
11.  返回 GitHub 配置 Webhook：
    *   回到 GitHub 仓库的 Webhook 设置页面。
    *   编辑您之前创建的 Webhook。
    *   将刚刚从宝塔面板复制的 WebHook地址 粘贴到 Payload URL 字段中。
    *   点击 Update webhook 保存。
V. 常见问题与排查
-   Webhook 接收失败：
    *   检查 GitHub Webhook 设置中的 Payload URL 是否正确，是否与宝塔面板生成的 URL 一致。
    *   检查 Secret 密钥是否在 GitHub 和宝塔面板中设置一致。
    *   检查服务器防火墙或安全组，确保 GitHub 的请求可以到达宝塔面板的 8888 端口（或其他自定义的宝塔面板端口）。
    *   查看 GitHub Webhook 的 Recent Deliveries，检查是否有红色感叹号，并查看具体错误信息。
-   部署命令执行失败：
    *   查看宝塔面板中网站的 日志，或在 计划任务 中查看 Git 部署的日志，可以找到具体的错误信息。
    *   确认部署命令中的 PHP 版本、Composer 路径等是否正确。
    *   检查项目依赖是否已正确安装，或 composer install 命令是否正确。
    *   检查文件和目录的权限，确保 www 用户（Nginx/Apache 运行用户）对项目目录有读写权限。
-   代码未更新：
    *   检查 git pull 命令是否执行成功。
    *   如果使用了缓存，确保缓存清理命令正确执行。
VI. 注意事项
-   安全性：`Secret` 密钥非常重要，请妥善保管，不要泄露。
-   分支管理：建议只对生产环境或主分支（如 `main` 或 `production`）进行自动部署，开发分支可以手动部署或使用单独的测试环境。
-   环境区分：生产环境和开发环境应严格区分，避免将开发中的不稳定代码直接部署到生产环境。
-   备份：在进行任何部署操作之前，务必定期备份您的网站代码和数据库。 