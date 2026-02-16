---
name: 手机与网页流量自动操作
description: 整合「手机自动操作AUTOGLM」与「老坑爹流量」的核心能力。触发词：手机自动操作、AutoGLM、ADB控制手机、老坑爹流量、淘宝刷量、百度刷流量、网页自动浏览、流量获取自动化。包含自然语言驱动安卓操作、网页百度/淘宝刷量、设备与VPN重置等。
group: 土
triggers: 手机自动化、AutoGLM、流量操作
owner: 土渠
version: "1.0"
updated: "2026-02-16"
---

# 手机与网页流量自动操作

整合两个小工具的核心代码与流量获取形式，归属土渠（流量自动化、招商运营）。

---

## ⚠️ 合规与使用边界（必读）

- **仅用于合规场景**（如自有店铺/官网 SEO 测试、内部测试机自动化）。严禁用于非法获取信息、干扰系统或任何违法活动；违规使用责任自负。
- **平台规则会更新**，使用前请确认各平台当前政策；自动化刷量可能违反平台规则，需控制频率、模拟真实行为。

---

## 🧠 智能任务路由（自动判断使用本地/高级模型）

本 Skill 支持**智能模型自动分配**：根据任务难度自动选择本地模型或高级模型。

### 自动判断逻辑

```
用户任务 → 难度评估 → 模型选择
     │
     ├── 简单任务（≤3分）→ 🔥 本地模型（qwen2.5）
     │     例：商品选择、数据分析、步骤确认
     │
     └── 复杂任务（>3分）→ 🚀 高级模型（Claude/Opus）
           例：系统架构、多步骤编排、深度分析
```

### 本 Skill 中适合本地模型的场景

| 场景 | 模型选择 | 示例 |
|:---|:---|:---|
| 商品分析与选择 | 🔥 qwen2.5:1.5b | 「帮我选择60元以下的Cursor账号」 |
| 操作步骤确认 | 🔥 qwen2.5:0.5b | 「下一步点哪里」 |
| 截图内容识别 | 🔥 qwen2.5:1.5b | 「页面上有什么商品」 |
| 简单决策辅助 | 🔥 qwen2.5:0.5b | 「哪个更值得买」 |

### 本地模型调用示例

```bash
# 商品选择分析
echo '根据以下商品列表，帮我选择最值得购买的：
- ¥8.80 CURSOR 官网直登
- ¥4.20 Pro Trial 独享账号
- ¥39.90 直连用 无需挂梯
要求：60元以下，稳定优先。' | ollama run qwen2.5:1.5b
```

### 调用共享模块

```python
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from _共享模块.task_router import auto_route, should_use_local_model

# 自动判断
result = auto_route("帮我选择一个Cursor账号")
if result['use_local']:
    print(result['notice'])  # 显示本地模型提醒
    # 使用本地模型处理
```

---

## 何时用本 Skill / 何时用「流量自动化」

| 需求 | 用哪个 | 说明 |
|:---|:---|:---|
| 手机端自然语言操作（打开 App、搜索、浏览） | **本 Skill** | AutoGLM + ADB，需安卓设备与模型服务 |
| PC 网页百度/淘宝刷量（老坑爹原项目逻辑） | **本 Skill** | C#/IE/Windows；Mac 上请用「流量自动化」的 Selenium 方案 |
| PC 上 Selenium 脚本、设备指纹/VPN 轮换、浏览器清理 | **流量自动化** | 同目录下 `流量自动化/SKILL.md`，含 Python 实现与 macOS 命令 |
| 设备重置、VPN 切换、通用刷量脚本 | **流量自动化** | 通用脚本与快速命令在流量自动化中 |

反向引用：流量自动化 Skill 中可注明「手机端 + 老坑爹项目见：手机与网页流量自动操作」。

## 来源项目

| 项目 | 路径 | 核心能力 |
|:---|:---|:---|
| 手机自动操作AUTOGLM | `/Users/karuo/Documents/开发/4、小工具/手机自动操作AUTOGLM/Open-AutoGLM` | 自然语言驱动安卓、ADB 控制、多模态理解屏幕、50+ App |
| 老坑爹流量 | `/Users/karuo/Documents/开发/4、小工具/老坑爹流量` | 百度/淘宝网页刷量、IE 自动化、设备重置、VPN 切换 |

---

## 🔧 执行前规范（所有 Skill 通用）

### 原则：环境检查优先 → 虚拟环境隔离 → 必要时 Docker

| 步骤 | 说明 |
|:---|:---|
| **1. 环境检查优先** | 执行前先检查依赖是否已装、模拟器/设备是否已有、避免重复安装 |
| **2. 虚拟环境隔离** | Python 项目**必须用虚拟环境**（`python3 -m venv .venv`），不污染系统 |
| **3. Docker 备选** | 若依赖复杂或需完全隔离（如老坑爹的 Windows 环境），考虑 Docker 容器 |

### 一键环境检查脚本

```bash
# 运行检查脚本（推荐执行前先跑一遍）
bash /Users/karuo/Documents/个人/卡若AI/05_卡土（土）/_团队成员/土渠/手机与网页流量自动操作/scripts/check_env.sh

# 自动启动模拟器（如果有配置但未运行）
bash /Users/karuo/Documents/个人/卡若AI/05_卡土（土）/_团队成员/土渠/手机与网页流量自动操作/scripts/check_env.sh --auto-start
```

检查项包括：ADB、已连接设备、**本地模拟器配置**、Python、虚拟环境、phone_agent 模块、模型服务。

**自动启动逻辑**：
1. 检查是否有已连接设备
2. 如果无设备，检查本地是否有 AVD 模拟器配置（如 RedMi13）
3. 使用 `--auto-start` 参数时，自动启动第一个可用模拟器
4. 等待模拟器启动并连接

---

## 环境检查清单（手动核对）

| 检查项 | 说明 | 谁可协助 |
|:---|:---|:---|
| ADB 在 PATH | 终端执行 `adb version` 有输出 | 卡资 |
| 设备状态为 device | `adb devices` 显示 `device` 而非 offline/unauthorized | 卡资 |
| ADB Keyboard 已安装并启用 | 手机端设置中启用，否则自动输入可能失败 | 卡资 |
| Python 3.10+ | 建议 3.10+，3.14 已验证可用 | 卡资 |
| 虚拟环境已创建 | 项目目录下有 `.venv`，用 `source .venv/bin/activate` 激活 | 卡资/土渠 |
| 模型服务可访问 | 若用 vLLM，`curl <base_url>/models` 可列出模型 | 卡资 |
| 老坑爹在 Mac 上 | 老坑爹为 C#/IE/Windows，Mac 上做网页刷量用「流量自动化」Selenium | 卡火/土渠 |

大批量或敏感操作前，建议先做数据备份（可调用卡资的容灾备份能力）。

---

## 虚拟环境快速创建（首次使用）

```bash
# 进入项目目录
cd /Users/karuo/Documents/开发/4、小工具/手机自动操作AUTOGLM/Open-AutoGLM

# 创建虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
pip install -e .

# 验证安装
python main.py --list-apps
```

> **已完成**：当前环境已创建虚拟环境并安装依赖，可直接使用。

---

## 一、手机自动操作（Open-AutoGLM）

### 1.1 能力概述

- **自然语言驱动**：用中文/英文描述任务，Agent 解析意图、识别界面、规划动作并执行。
- **屏幕感知**：多模态模型理解截图（文本/图标/布局），映射为点击/输入/滑动等。
- **ADB 控制**：USB 或 WiFi 远程调试安卓设备（Android 7.0+）。
- **支持应用**：微信、淘宝、美团、小红书、抖音、百度地图、Chrome 等 50+ 款。

### 1.2 核心代码与用法

**Python API：**

```python
from phone_agent import PhoneAgent
from phone_agent.model import ModelConfig

model_config = ModelConfig(
    base_url="http://localhost:8000/v1",
    model_name="autoglm-phone-9b",
)
agent = PhoneAgent(model_config=model_config)
result = agent.run("打开淘宝搜索无线耳机")
print(result)
```

**命令行：**

```bash
# 交互模式
python main.py --base-url http://localhost:8000/v1 --model "autoglm-phone-9b"

# 单条指令
python main.py --base-url http://localhost:8000/v1 "打开美团搜索附近的火锅店"
python main.py --base-url http://localhost:8000/v1 "打开小红书并搜索厦门餐厅"

# 远程设备
python main.py --device-id 192.168.1.100:5555 --base-url http://localhost:8000/v1 "打开抖音刷视频"
```

**可用操作**：`Launch` 启动应用、`Tap` 点击、`Type` 输入、`Swipe` 滑动、`Back`/`Home`、`Long Press`、`Take_over` 人工接管（登录/验证码）。

### 1.3 环境与路径

- **项目根目录**：`/Users/karuo/Documents/开发/4、小工具/手机自动操作AUTOGLM/Open-AutoGLM`
- **依赖**：Python 3.10+、ADB、ADB Keyboard（设备端）、vLLM 部署 AutoGLM-Phone-9B
- **详细文档**：同上路径下 `开发文档/手机自动操作使用文档.md`、`README.md`

---

## 二、老坑爹流量（网页刷量 + 设备/VPN）

### 2.1 能力概述

- **流量获取形式**：百度搜索刷量、淘宝搜索/商品浏览刷量。
- **自动化形式**：IE 浏览器控制（IEHelper）、关键词输入、点击链接、翻页浏览。
- **配套能力**：设备重置（ReComputer）、VPN 切换（ReVpn），用于换环境防封。

### 2.2 核心逻辑（C# 原项目）

**启动流程（StartProcess）：**

```csharp
// 按配置启动淘宝/百度流量
if (Setting.TaobaoFlow && flag)
    Website.ProcessWebsite("淘宝").Start("http://s.taobao.com/search?&style=grid");
if (Setting.BaiduFlow && flag)
    Website.ProcessWebsite("百度").Start("https://www.baidu.com/");
```

**百度刷量（Baidu.cs）：** 打开 IE → 输入关键词（baidu.txt）→ 点击搜索 → 翻页并点击目标链接（如 lkdie.com）。

**淘宝刷量（Taobao.cs）：** IEHelper 控制「淘宝搜索」窗口，搜索关键词、定位商品、进入商品页模拟浏览。

**设备/VPN：** `ReComputer` 重置电脑（如 MAC/IE 版本）、`ReVpn` 切换 VPN 连接。

### 2.3 与现有「流量自动化」Skill 的关系

- **流量自动化**（同目录下）：已包含「设备指纹重置、VPN 切换、网页自动浏览（Selenium）、浏览器指纹清理」的 **Python 实现** 与快速命令，偏向通用脚本与 macOS。
- **本 Skill**：侧重 **两个具体项目** 的定位与核心代码——手机端用 AutoGLM+ADB，网页端用老坑爹的 IE 自动化 + 百度/淘宝刷量形式；实现细节仍可参考「流量自动化」里的 Python 示例（百度搜索、淘宝浏览、VPN、清理等）。

---

## 三、流量获取形式汇总

| 形式 | 载体 | 实现方式 |
|:---|:---|:---|
| 手机 App 流量 | 安卓设备 | AutoGLM + ADB，自然语言任务（打开微信/淘宝/美团/小红书等并搜索、浏览） |
| 百度搜索刷量 | PC 网页 | 老坑爹：IE + 关键词 + 翻页点击；或 流量自动化：Selenium + 百度搜索 + 点击目标站 |
| 淘宝搜索/商品浏览 | PC 网页 | 老坑爹：IE + 淘宝搜索 + 商品列表/详情；或 流量自动化：Selenium + 淘宝搜索 + 模拟浏览 |
| 设备/VPN 轮换 | PC | 老坑爹：ReComputer、ReVpn；或 流量自动化：reset_mac、VPN 连接/断开、清理浏览器数据 |

---

## 四、快速参考

### 示例指令（可直接复制后改关键词）

| 场景 | 指令示例 |
|:---|:---|
| 手机-淘宝 | `python main.py --base-url http://localhost:8000/v1 "打开淘宝搜索无线耳机"` |
| 手机-美团 | `python main.py --base-url http://localhost:8000/v1 "打开美团搜索附近的火锅店"` |
| 手机-小红书 | `python main.py --base-url http://localhost:8000/v1 "打开小红书并搜索厦门餐厅"` |
| 手机-抖音 | `python main.py --base-url http://localhost:8000/v1 "打开抖音刷视频"` |
| 手机-微信 | `python main.py --base-url http://localhost:8000/v1 "打开微信"` |

### 手机自动操作（本地开发路径）

```bash
cd /Users/karuo/Documents/开发/4、小工具/手机自动操作AUTOGLM/Open-AutoGLM
python main.py --list-apps
adb connect <设备IP>:5555
python main.py --base-url http://localhost:8000/v1 "打开淘宝搜索无线耳机"
```

### 老坑爹流量（原项目路径）

- 解决方案：`/Users/karuo/Documents/开发/4、小工具/老坑爹流量/老坑爹流量.sln`
- 核心入口：`lkd.flow/StartProcess.cs`、`Website/baidu.cs`、`Website/taobao.cs`、`Reset/ReComputer.cs`、`Reset/ReVpn.cs`

### 与土渠的配合

- **土渠** 负责：流量自动化、招商运营；口头禅「流量来了！」。
- 需要 **手机端自动获流** 或 **网页刷量/设备轮换** 时，优先查阅本 Skill 与同目录下「流量自动化」SKILL.md。

---

## 五、注意事项

| 风险 | 说明 |
|:---|:---|
| 合规 | 仅用于合规场景；严禁非法获取信息、干扰系统或违法活动。 |
| 平台规则 | 自动化刷量可能违反平台规则，需控制频率、模拟真实行为。 |
| 敏感操作 | 手机端登录/支付/验证码建议使用 Take_over 人工接管。 |

---

> **归属**：土渠（卡土-土） | **中文名**：手机与网页流量自动操作
