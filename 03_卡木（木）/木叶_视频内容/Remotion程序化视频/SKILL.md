---
name: Remotion程序化视频
description: 用 React 程序化生成视频，支持数据驱动、批量、模板化视频与动效。基于 remotion-dev/remotion。
group: 木
triggers: Remotion、程序化视频、React视频、批量生成视频、数据驱动视频、动效模板
owner: 木叶
version: "1.0"
updated: "2026-02-17"
---

# Remotion 程序化视频

## 能做什么（Capabilities）

- **用 React 写视频**：用 CSS/Canvas/SVG/WebGL 定义每一帧
- **数据驱动**：变量、API、算法驱动画面变化
- **批量生成**：同一模板批量产出（邀请函、封面、通知等）
- **动效包装**：片头、转场、图形动画
- **与切片协同**：切片产出 + Remotion 包装/合成

## 怎么用（Usage）

触发词：**Remotion**、**程序化视频**、**React视频**、**批量生成视频**、**数据驱动视频**、**动效模板**

## 核心概念速查

| 术语 | 含义 |
|:---|:---|
| **Composition** | 视频场景，定义宽高、时长、fps |
| **useCurrentFrame()** | 当前帧号，驱动逐帧动画 |
| **interpolate()** | 帧间数值插值 |
| **Remotion Studio** | 本地预览界面 |
| **Remotion Player** | 浏览器嵌入播放器 |

## 一键开始

```bash
npx create-video@latest
```

选模板后：

```bash
npm run dev    # 启动 Remotion Studio 预览
npx remotion render   # CLI 渲染
```

## 主要包（npm）

| 包名 | 用途 |
|:---|:---|
| `remotion` | 核心 API |
| `@remotion/player` | 浏览器播放 |
| `@remotion/renderer` | Node 渲染 |
| `@remotion/lambda` | AWS Lambda 云端渲染 |
| `@remotion/three` | 3D 视频 |
| `@remotion/lottie` | Lottie 动画 |
| `@remotion/captions` | 字幕 |
| `@remotion/tailwind` | TailwindCSS |

## 常用模板

| 模板 | 用途 |
|:---|:---|
| Hello World | 入门 |
| Audiogram | 音频波形可视化 |
| TikTok | 竖屏短视频 |
| Three | 3D |
| Prompt to Video / Motion | AI 文本→视频/动效 |
| TTS Azure / Google | 语音合成 |
| Music Visualization | 音乐可视化 |

## 渲染方式

| 方式 | 命令/说明 |
|:---|:---|
| 本地 CLI | `npx remotion render` |
| Node 程序 | 使用 `@remotion/renderer` |
| AWS Lambda | 大规模并发 |
| GitHub Actions | CI 内渲染 |
| Vercel | 有专门模板 |

输出：MP4、图片序列、音频、单帧图。

## 相关文件

- 参考资料：`参考资料/Remotion速查.md`
- 官方文档：https://www.remotion.dev/docs
- API：https://www.remotion.dev/api
- 仓库：https://github.com/remotion-dev/remotion
- 许可：特殊许可，商用可能需公司授权

## 依赖（Dependencies）

- Node 16+ 或 Bun 1.0.3+
- React
- 前置技能：可与「视频切片」配合使用（切片 → Remotion 包装）
