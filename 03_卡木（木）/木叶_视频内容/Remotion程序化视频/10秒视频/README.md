# 10 秒视频 · 程序化模板

> 来源：木叶 Remotion程序化视频 | 卡若AI 品牌短片

## 版本

|  compositions   | 说明                 |
|:----------------|:---------------------|
| `Video10s`      | 简洁版：渐变 + 标题 + 副标题 |
| `Video10sRich`  | 内容丰富版：粒子网格 + 极限环 + 流动线条 + 多段文字 + 中心光点 |

## 规格

竖屏 1080×1920，10 秒，30fps。

## 使用

```bash
# 预览
npm run dev

# 渲染简洁版
npx remotion render src/index.ts Video10s /path/to/output.mp4

# 渲染内容丰富版
npx remotion render src/index.ts Video10sRich /path/to/output.mp4
```

## 输出

默认输出到：`/Users/karuo/Documents/卡若Ai的文件夹/导出/程序化视频/`
