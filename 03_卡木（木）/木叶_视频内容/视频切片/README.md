# 木叶 · 视频切片（目录索引）

> **本目录根路径**（卡若AI 内）：`03_卡木（木）/木叶_视频内容/视频切片/`  
> **技能注册**：`SKILL_REGISTRY.md` 木组 **M01、M01i～M01o**。  
> **Soul 派对成片默认规则**：命令顺序与验收以 **`Soul派对成片工作流_从零到片尾.md`** 为准（重剪、从零、SEO 尾帧均按此文）。

---

## 一、从哪读起（按角色）

| 你要做什么 | 先打开 |
|------------|--------|
| **整场命令顺序**（下载→转录→切片→成片→SEO） | `Soul派对成片工作流_从零到片尾.md` |
| **剪映 ↔ 程序化三类不丢**（字幕 / 封面 / 特效） | `Soul成片三件套_剪映对照_总览_SKILL.md`（**M01k**） |
| **追问 / 自检 / 防跳步**（Agent 与人工） | `参考资料/成片流程_追问与自检.md` |
| **只盯字幕 / 封面 / 特效 / 片尾** | `Soul成片字幕_SKILL.md`（**M01l**）、`Soul成片封面_SKILL.md`（**M01m**）、`Soul成片特效_SKILL.md`（**M01n**）、`Soul成片片尾_SKILL.md`（**M01o**） |
| **抖音竖屏默认规范** | `Soul竖屏切片_SKILL.md` |
| **横屏 16:9 全幅** | `Soul横屏全幅高光_SKILL.md` |
| **先判竖屏还是横屏** | `Soul剪辑取向分析_SKILL.md` |
| **通用切片 + 动效包装 + 命令合集** | `SKILL.md` |

---

## 二、目录结构（整理说明）

```
视频切片/
├── README.md                          ← 本索引
├── SKILL.md                           ← M01 总入口
├── Soul派对成片工作流_从零到片尾.md    ← 命令级全流程
├── Soul竖屏切片_SKILL.md
├── Soul横屏全幅高光_SKILL.md
├── Soul剪辑取向分析_SKILL.md
├── Soul成片三件套_剪映对照_总览_SKILL.md   ← M01k
├── Soul成片字幕_SKILL.md                   ← M01l
├── Soul成片封面_SKILL.md                   ← M01m
├── Soul成片特效_SKILL.md                   ← M01n
├── Soul成片片尾_SKILL.md                   ← M01o
├── 脚本/                    ← Python 主链路（勿提交 venv）
├── 参考资料/                ← 提示词、剪映逆向、追问自检、GitHub 吸收等
├── 场次稿/                  ← 单场纪要、示例 highlights、辅助 shell
├── 切片动效包装/            ← Remotion 等模板（内含 node_modules，勿入库）
├── 贴片库/                  ← emoji 等（若存在）
├── 远志_一个月每日视频任务清单.md  ← 运营清单（非 Skill）
└── README_输出已迁移.md
```

**本地大目录**（`.gitignore` 已忽略）：`脚本/venv_osxphotos/`、`切片动效包装/**/node_modules/`。

---

## 三、流程阶段 ↔ 文件夹（速查）

| 阶段 | 产物目录（典型） | 说明 |
|------|------------------|------|
| 塑形 | `场次_output/裁剪检查/` | `analyze_feishu_ui_crop.py` |
| 转录 | `transcript.srt`、`audio.wav` | MLX Whisper |
| 高光 | `highlights.json` | 先清单后切片 |
| 切片 | `切片/` 或 `clips/` | `batch_clip.py` |
| 成片 | `成片/` | `soul_enhance.py` |
| 可选 | 成片内 SEO 段 | `append_seo_keyword_tail.py` |

---

## 四、相关注册表编号

- **M01** `SKILL.md`
- **M01i** 横屏全幅 · **M01j** 剪辑取向分析  
- **M01k** 三件套总览 · **M01l** 字幕 · **M01m** 封面 · **M01n** 特效 · **M01o** 片尾（CTA + SEO）  

*文档版本：2026-04-01（默认真源：Soul派对成片工作流）*
