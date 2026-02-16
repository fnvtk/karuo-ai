# BBT/存客宝 Gitea：拉取 GitHub 说明与检查清单

> **目的**：确保 open.quwanzhi.com (Gitea) 上有「拉取 GitHub」的完整方案，所有文档/仓库与 GitHub 一致并可实时同步；Token/密码从卡若AI 统一获取。  
> **维护**：金仓

---

## 一、拉取 GitHub 的文件在哪里（BBT/存客宝侧）

| 文件 | 路径 | 说明 |
|:-----|:-----|:-----|
| **同步脚本** | `脚本/sync_github_to_gitea.sh` | 用 GitHub Token 拉取 fnvtk 下全部仓库并推送到 Gitea |
| **凭证** | `脚本/sync_tokens.env` | GitHub TOKEN、Gitea 账号密码（与卡若AI 账号索引一致，勿提交） |

以上两个文件在 **卡若AI** 项目内路径为：  
`01_卡资（金）/金仓_存储备份/群晖NAS管理/脚本/`  
若要在 BBT/NAS 上执行，把该目录下的 `sync_github_to_gitea.sh` 与 `sync_tokens.env` 拷到同一目录即可。

---

## 二、Token 与密码（卡若AI 统一来源）

- **GitHub Token**：卡若AI → `运营中枢/工作台/00_账号与API索引.md` → 一、云服务与 API → GitHub → Token。  
  已写入 `脚本/sync_tokens.env` 的 `GITHUB_TOKEN`。
- **Gitea 账号/密码**：同上 账号索引 → Gitea（CKB NAS）→ 账号 `fnvtk`、密码 `Zhiqun1984`。  
  已写入 `sync_tokens.env` 的 `GITEA_USER`、`GITEA_TOKEN`。

**无需再问**：脚本执行时自动读取同目录 `sync_tokens.env`，无需命令行传参。

---

## 三、如何执行（确保所有文档都在 Git 上并拉取到 Gitea）

在**能同时访问 GitHub 与 open.quwanzhi.com** 的机器上（本机或 NAS）：

```bash
cd "脚本所在目录"
bash sync_github_to_gitea.sh
```

- 无参数：同步 **GitHub 上 fnvtk 的全部仓库** 到 Gitea，保证所有文档/仓库在 Gitea 上都有。
- 只同步某一仓：`bash sync_github_to_gitea.sh --repo 仓库名`（如 `ycat`、`karuo-ai`）。

---

## 四、实时同步

- **定时**：在 NAS 或本机加 cron，例如每 30 分钟执行一次 `sync_github_to_gitea.sh`（详见 `参考资料/GitHub全仓同步到CKB_NAS_Gitea_方案与双向说明.md`）。
- **钩子**：GitHub Webhook 指向接收端，push 时触发同步；与脚本无冲突（脚本内已加锁）。见 `参考资料/GitHub与Gitea同步_脚本与钩子规则.md`。

---

## 五、检查清单（GitHub 文件是否都有、是否实时同步）

### 5.1 GitHub 上 fnvtk 的仓库（当前列表，供对照）

以下为通过 GitHub API + Token 拉取的列表，**同步脚本会把它们全部拉到 Gitea**：

| 序号 | 仓库名 | 说明 |
|:-----|:------|:-----|
| 1 | cunkebao_doc | |
| 2 | cunkebao_v2 | |
| 3 | cunkebao_v3 | |
| 4 | dev-test | |
| 5 | feishudown | |
| 6 | fragment-time | |
| 7 | karuo-ai | |
| 8 | karuo-deploy | |
| 9 | Lkdie | |
| 10 | lytiao | |
| 11 | mbti-personality-test | |
| 12 | mybooks | |
| 13 | Trinity | |
| 14 | WMS | |
| 15 | YAR2.014 | |
| 16 | YARnet | |
| 17 | ycat | |
| 18 | is | |

（若 API 返回更多，脚本会一并同步；上表为最近一次检查结果。）

### 5.2 Gitea 上应对应出现

- 打开 **http://open.quwanzhi.com:3000/fnvtk**，应能看到与上表同名的仓库。
- 若缺少某仓：在该机执行一次 `bash sync_github_to_gitea.sh` 或 `bash sync_github_to_gitea.sh --repo 仓库名`。

### 5.3 是否实时同步

- **已配置 cron 或 Webhook**：是，按设定间隔或 push 触发同步。
- **未配置**：仅在手动执行脚本时同步；要实时需按第四节配置定时或钩子。

### 5.4 凭证是否由卡若AI 解决

- **是**：`sync_tokens.env` 内容来自 `运营中枢/工作台/00_账号与API索引.md`，脚本自动加载，无需再问 Token/密码。

### 5.5 最近一次检查结果

| 检查项 | 结果 |
|:-------|:-----|
| GitHub Token（API 拉取仓库列表） | ✅ 有效，fnvtk 下仓库已列出 |
| Gitea 账号/密码（API 访问） | ✅ 有效，open.quwanzhi.com:3000 可访问 |
| Gitea 上 fnvtk/ycat | ✅ 已存在（API 200） |
| 本机执行同步脚本 | ⚠️ 受网络影响时 GitHub clone 可能超时；在 NAS 或网络畅通时执行全量同步即可 |

---

## 六、相关文档

| 文档 | 说明 |
|:-----|:-----|
| `参考资料/GitHub全仓同步到CKB_NAS_Gitea_方案与双向说明.md` | 全量同步与一键部署 |
| `参考资料/GitHub与Gitea同步_脚本与钩子规则.md` | 脚本与钩子关系、实时同步与锁规则 |

---

*检查清单更新：与当前 GitHub API 列表一致即可。*
