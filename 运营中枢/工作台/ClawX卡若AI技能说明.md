# ClawX 中直接使用卡若AI 技能

> 已在 ClawX 中安装「卡若AI」技能，对话里可直接按触发词调用卡若AI 的策略与执行流程。

---

## 一、已完成的配置

| 项 | 值 |
|:---|:---|
| **技能名称** | karuo-ai（在 ClawX「技能」里显示为可启用的一项） |
| **技能路径** | `~/.openclaw/skills/karuo-ai/SKILL.md` |
| **配置** | 已在 `~/.openclaw/openclaw.json` 的 `skills.entries` 中启用 `karuo-ai` |

---

## 二、在 ClawX 里怎么用

1. 打开 **ClawX → 技能**，在「已安装」列表中找到 **karuo-ai**（或 卡若AI 相关描述），确保开关为**开启**。
2. 在**新对话**中直接说需求，例如：
   - 「写今日飞书日志」
   - 「推送到 Gitea」
   - 「帮我做卡猫复盘」
   - 「下载飞书妙记」
   - 「查一下 MCP 有没有 xxx」
   - 「存到记忆：xxx」
3. 模型会先匹配卡若AI 的 **SKILL_REGISTRY**，再按触发词找到对应 SKILL 并执行（读 `卡若AI/SKILL_REGISTRY.md` → 取 SKILL 路径 → 读对应 SKILL.md 执行）。

---

## 三、使配置生效

- 若刚新增或修改 `~/.openclaw/skills/karuo-ai/SKILL.md`：在 ClawX **设置 → 网关** 点 **重启**，或退出 ClawX 再打开。
- 技能列表刷新：在 **技能** 页点 **刷新**，确认 **karuo-ai** 已出现且已开启。

---

## 四、技能内容与维护

- 卡若AI 技能的具体说明、触发词与执行流程在：`~/.openclaw/skills/karuo-ai/SKILL.md`。
- 触发词与 SKILL 路径以卡若AI 仓库内 **SKILL_REGISTRY.md** 为准；维护时只需更新仓库内注册表与各 SKILL.md，无需改 ClawX 内置技能描述（除非要改「匹配哪些词」的说明）。

---

*配置日期：2026-03-06。*
