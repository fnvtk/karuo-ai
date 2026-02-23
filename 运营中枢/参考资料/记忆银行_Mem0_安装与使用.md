# Mem0 记忆银行 · 安装与使用

> 说明：未找到名为「神经病银行」的官方产品，已按「记忆银行」类工具安装 **Mem0**（AI 记忆/知识库）。若你指的是其他产品，请告知具体名称。

---

## 一、已安装内容

| 项目 | 路径/说明 |
|------|-----------|
| Mem0 | 已安装在 `卡若AI/.venv_mem0` |
| pipx | Mem0 也通过 pipx 安装（`~/.local/bin`） |
| 示例脚本 | `运营中枢/脚本/记忆银行_Mem0_使用示例.py` |

---

## 二、使用方式（免费版）

### 方式 A：OpenAI 兼容 API（需 API Key）

```bash
cd /Users/karuo/Documents/个人/卡若AI
export OPENAI_API_KEY=你的API密钥
.venv_mem0/bin/python3 -c "
from mem0 import Memory
m = Memory()
m.add('我喜欢早上喝咖啡', user_id='karuo')
print(m.search('喝什么？', user_id='karuo'))
"
```

### 方式 B：Ollama 本地（完全免费）

1. 安装并启动 Ollama：`brew install ollama` → 运行 `ollama serve`
2. 拉取嵌入模型：`ollama pull nomic-embed-text`
3. 在代码中配置 Mem0 使用 `provider: ollama`

---

## 三、Python 调用示例

```python
from mem0 import Memory

m = Memory()  # 需已设置 OPENAI_API_KEY 或配置 Ollama
m.add("卡若的微信是 28533368", user_id="karuo")
results = m.search("卡若的微信", user_id="karuo")
```

---

## 四、若你指的是其他产品

请告知具体名称，例如：
- Cubox（收藏/阅读）
- 第二大脑（2brain.cn）
- Flomo、Obsidian、Notion 等

---

*文档生成：卡若AI · 运营中枢*
