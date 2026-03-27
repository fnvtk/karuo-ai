# 开发五角色与飞书里程碑（间名 · 五方演岗）

> **真源**：本文件；**勿**在业务项目仓库的 `.cursor/skills/` 下复制正文 Skill。任意仓库开发时由 Agent **按路径读取**本 Skill 执行。  
> **注册**：`SKILL_REGISTRY.md` → **F01e**  
> **触发词**：开发五角色、五方演岗、飞书里程碑、完整功能推送、项目里程碑卡片、里程碑通报（飞书）

## 一、目的

用 **五个开发角色** 分工协作（由 Cursor / 卡路 AI 按本 Skill 扮演与自检），在 **任意项目** 交付 **可验收的完整功能** 时，可选地将进度以 **飞书消息卡片（标签式字段）** 推送到 **该项目绑定的唯一群 Webhook**。

## 二、五角色定义（抽象、全项目复用）

| 代号 | 角色 | 核心职责 |
|:---|:---|:---|
| R1 | **产品官** | 需求边界、验收标准、优先级；控制范围蔓延 |
| R2 | **架构师** | API 契约、数据模型、多端/多栈一致性 |
| R3 | **前端** | 页面与交互、样式、埋点与前端联调 |
| R4 | **后端** | 接口、后台、迁移脚本、权限与数据 |
| R5 | **质控与发布** | 自测/回归；**仅**在确认「完整功能」闭环后 **才允许触发飞书推送** |

协作顺序：R1 验收口径 → R2 定契约 → R3/R4 并行 → R5 确认后推送。

## 三、飞书推送规则（强制）

1. **按项目绑定**：每个项目使用 **独立** 环境变量存 Webhook（示例：`FEISHU_WEBHOOK_MBTI`、`FEISHU_WEBHOOK_SOUL`），**禁止**串项目、串群。  
2. **推送频率**：仅在 **一个完整功能** 完成且 **可交付验收** 时发 **一条**；**禁止**每次小改动、每次对话结束都推。  
3. **阶段 100%**：用户明确约定阶段/版本收尾时，可再发一条 **阶段完成** 总览（与单功能推送不重复刷屏）。  
4. **消息形态**：自定义机器人 `msg_type: interactive`、飞书卡片 **schema 2.0**（见 [自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)）；正文用 **【标签】** 分行展示五角色摘要。  
5. **安全**：Webhook **只放环境变量或私密配置**，**不要**提交到 Git。若群机器人启用了 **自定义关键词**，须保证卡片 `text` 类字段命中关键词；可用 `--keyword-line` 与群设置对齐。  
6. **脚本真源**：与本 Skill 同目录的 `feishu_milestone_notify.py`。

### 调用示例

```bash
# 通用：指定读取哪个环境变量里的 URL
export FEISHU_WEBHOOK_MILESTONE='https://open.feishu.cn/open-apis/bot/v2/hook/……'
python3 "/Users/karuo/Documents/个人/卡若AI/04_卡火（火）/火炬_全栈消息/开发五角色与飞书里程碑/feishu_milestone_notify.py" \
  --webhook-env FEISHU_WEBHOOK_MILESTONE \
  --product "某某项目" \
  --feature "功能一句话" \
  --repo "/path/to/repo" \
  --body $'- 改动点\n- 自测说明'

# MBTI 王（环境变量名可与群约定）
export FEISHU_WEBHOOK_MBTI='……'
python3 ".../feishu_milestone_notify.py" \
  --webhook-env FEISHU_WEBHOOK_MBTI \
  --product "MBTI王" \
  --keyword-line "MBTI王 项目更新" \
  --feature "……" --body "……"
```

干跑：`--dry-run`（只打印 JSON）。

## 四、Agent 自检清单（推送前）

- [ ] 是否 **完整功能** 可独立验收？  
- [ ] R3/R4 已联调、R5 已核对主路径？  
- [ ] 对应项目的 Webhook 环境变量已配置？  
- [ ] 关键词校验（若启用）已通过？  
- [ ] 非重复推送（同一功能无新增验收点则不再推）？

## 五、与业务仓库的关系

- **业务仓库**（如 mbti王）可保留 **薄封装脚本**（转发到本目录 `feishu_milestone_notify.py`），或直接在文档中写 **卡若AI 脚本的绝对路径**。  
- **禁止**在业务仓库 `.cursor/skills/` 再放本 Skill 正文；更新 Skill **只改卡若AI 本文件**。

## 六、全局规则说明

卡若 AI 全局规则中的「飞书群禁发」与 **用户显式授权某一项目、某一 Webhook 做里程碑通报** 并存时，以 **用户对该群、该环境变量的明确授权** 为准；且须遵守本节「按项目绑定、低频、完整功能」约束。
