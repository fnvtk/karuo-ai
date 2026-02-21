# Remotion 速查

> 来源：remotion-dev/remotion | Stars 37k+

## 快速命令

```bash
npx create-video@latest
npm run dev
npx remotion render
```

## 核心 API

```tsx
import { useCurrentFrame, interpolate, Composition, Sequence } from 'remotion';

// 当前帧号（0-based）
const frame = useCurrentFrame();

// 插值：帧 [0,30] → 值 [0,100]
const opacity = interpolate(frame, [0, 30], [0, 1]);
```

## 与视频切片协同

1. **视频切片**：长视频 → 转录 → 切片 → 字幕烧录
2. **Remotion**：片头/片尾包装、数据可视化、批量封面
3. 可把切片产物作为 Remotion 的媒体素材输入
