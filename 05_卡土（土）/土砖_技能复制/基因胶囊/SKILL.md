---
name: 基因胶囊
description: 将验证过的 Skill 打包为可遗传的能力单元（基因胶囊），支持 pack/unpack/list。触发词：基因胶囊、打包技能、解包胶囊、继承能力。
group: 土
triggers: 基因胶囊、打包技能、解包胶囊、继承能力、胶囊列表、查胶囊、pack-all、全量导出
owner: 土砖
version: "1.0"
updated: "2026-02-22"
---

# 基因胶囊

> **归属**：土砖（技能复制）  
> **理念**：将 Skill + 环境指纹 + 审计记录打包成可遗传能力单元，支持本地复用与未来跨 Agent 流通。

---

## 一、概念

**基因胶囊** = 策略（SKILL） + 环境指纹 + 审计记录 + 资产 ID（SHA-256）

- 一个 Skill 学会 → 打包成胶囊 → 可被其他 Agent 或本机继承
- 规范见：`运营中枢/参考资料/基因胶囊规范.md`

---

## 二、使用方法

### 2.1 打包（Skill → 基因胶囊）

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py pack "技能工厂"
# 或指定路径
python3 .../gene_capsule.py pack "05_卡土（土）/土砖_技能复制/技能工厂/SKILL.md"
```

- 输出结构：每个技能独立目录 `导出/基因胶囊/技能名_hash/`
- 目录内包含：
  - `技能名_hash.json`：胶囊 JSON
  - `基因胶囊功能流程图.md`：流程图
  - `说明文档.md`：本技能说明与解包用法

### 2.2 解包（基因胶囊 → Skill）

```bash
# 按技能目录/文件名（unpack 会搜索子目录）
python3 .../gene_capsule.py unpack 技能工厂_d6dc55cd/技能工厂_d6dc55cd.json
# 或完整路径
python3 .../gene_capsule.py unpack "卡若Ai的文件夹/导出/基因胶囊/技能工厂_d6dc55cd/技能工厂_d6dc55cd.json"
# 指定输出目录
python3 .../gene_capsule.py unpack ... -o 02_卡人（水）/水溪_整理归档/
```

- 默认按胶囊内 `manifest.skill_path` 写回
- 可选 `-o` 指定目录，则写入该目录下的 `SKILL.md`

### 2.3 全量导出（所有 Skill → 基因胶囊）

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py" pack-all
```

将 SKILL_REGISTRY 中**所有技能**批量打包为基因胶囊，并更新导出说明文档。

### 2.4 列表

```bash
python3 .../gene_capsule.py list
```

输出本地所有胶囊：名称、capsule_id、创建时间。

---

## 三、与技能工厂的联动

| 场景 | 操作 |
|:---|:---|
| **创建 Skill 前** | `list` 查看本地胶囊，有匹配则 `unpack` 继承 |
| **创建 Skill 后** | `pack` 将新 Skill 打包，供后续复用或未来上传 |

---

## 四、导出时产出

每次 **pack** 或 **pack-all** 会为每个技能生成独立目录：

```
导出/基因胶囊/
├── README_基因胶囊导出说明.md      ← 主清单（含全量胶囊、总流程图）
├── 技能工厂_d6dc55cd/
│   ├── 技能工厂_d6dc55cd.json     ← 胶囊
│   ├── 基因胶囊功能流程图.md      ← 流程图
│   └── 说明文档.md                ← 本技能说明与解包用法
├── 视频切片_4f6c42af/
│   ├── ...
```

| 产出 | 说明 |
|:---|:---|
| 胶囊 JSON | 含完整 SKILL 内容、manifest、环境指纹 |
| 基因胶囊功能流程图.md | 基因胶囊完整流程图（Mermaid） |
| 说明文档.md | 技能概览、解包命令、引用 |

## 五、相关文件

| 文件 | 说明 |
|:---|:---|
| `运营中枢/参考资料/基因胶囊规范.md` | 概念与格式规范 |
| `运营中枢/参考资料/基因胶囊功能流程图.md` | 流程图（仓库内常驻） |
| `脚本/gene_capsule.py` | pack/unpack/list 主脚本 |
| `capsule_index.json` | 继承胶囊索引（解包时更新） |
| `卡若Ai的文件夹/导出/基因胶囊/` | 导出目录 |

---

## 六、依赖

- Python 3.9+
- 可选：PyYAML（用于精确解析 frontmatter，无则用简单解析）
