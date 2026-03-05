# ClawX 卡若AI V0 参数说明

> 已按卡若AI《00_账号与API索引》《v0_API对接说明》将 V0 参数写入 `~/.openclaw/openclaw.json`，ClawX 设置里「自定义」提供商会显示并可用。

---

## 一、已填入 ClawX（自定义 / custom-custom21）的参数

| 设置项 | 值 | 说明 |
|:---|:---|:---|
| **名称** | 卡若AI V0 (云端) | 在设置里显示的提供商名称 |
| **基础 URL** | `https://api.v0.dev/v1` | 卡若AI 统一 V0 地址 |
| **API Key** | `v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2` | 来自《00_账号与API索引》v0.dev |
| **模型 ID（默认/推荐）** | `v0-1.5-md` | 卡若AI 推荐，平衡速度与质量 |
| **同 Provider 回退** | `v0-1.5-lg`、`v0-1.0-md` | 大模型与兼容旧版 |
| **跨 Provider 回退** | 本地 Ollama qwen2.5:3b | 已在 agents.defaults.model.fallbacks 中配置 |

---

## 二、V0 模型列表（在 ClawX 可选）

| 模型 ID | 显示名 | 说明 |
|:---|:---|:---|
| v0-1.5-md | v0-1.5-md (推荐) | 中模型，推荐默认 |
| v0-1.5-lg | v0-1.5-lg (大模型) | 大模型，效果更好 |
| v0-1.0-md | v0-1.0-md (兼容) | 旧版中模型 |

---

## 三、在 ClawX 设置里核对

1. 打开 **设置 → AI 模型提供商**。
2. 找到 **自定义**（或「卡若AI V0 (云端）」）：应显示 **已配置**，基础 URL 为 `https://api.v0.dev/v1`，模型 ID 为上述之一。
3. **同 Provider 回退模型 ID**：可填 `v0-1.5-lg`、`v0-1.0-md`（每行一个），先走当前 provider 再走跨 Provider。
4. **跨 Provider 回退**：可勾选 **Ollama qwen2.5:3b**，V0 不可用时自动走本地。

---

## 四、使配置生效

- 若刚改过 `~/.openclaw/openclaw.json`：在 ClawX **设置 → 网关** 点 **重启**，或退出 ClawX 再打开。
- 新对话可选模型里应出现「卡若AI V0 (推荐)」「卡若AI V0 大模型」「卡若AI V0 (兼容)」。

---

---

## 五、V0 接口检测与排查

**检测命令（卡若AI 目录下）：**
```bash
bash 运营中枢/工作台/scripts/test_v0_api.sh
# 或指定模型： bash 运营中枢/工作台/scripts/test_v0_api.sh v0-1.0-md
```

**若返回 HTTP 500 / `{"success":false,"error":"Unknown error"}`：**
1. 打开 https://v0.app/chat/settings/keys 检查 API Key 是否有效，必要时重新生成并更新到《00_账号与API索引》与 ClawX 自定义提供商。
2. 确认账号已开通 Premium/Team 且开通了 Model API（按量计费）。
3. **ClawX 默认模型为本地 Ollama（qwen2.5:3b）**，不依赖 V0 即可正常使用；V0 仅作云端备选，接口异常时选本地模型即可保证可用。

---

*参数来源：卡若AI 运营中枢/工作台/00_账号与API索引.md、参考资料/v0_API对接说明.md。*
