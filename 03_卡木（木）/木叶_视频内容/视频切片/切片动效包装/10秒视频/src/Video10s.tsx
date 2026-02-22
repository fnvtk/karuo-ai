import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export const Video10s: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // 0-1.5s: 标题淡入
  const titleOpacity = interpolate(
    frame,
    [0, 30, 45],
    [0, 1, 1],
    { easing: Easing.out(Easing.cubic) }
  );
  const titleScale = interpolate(
    frame,
    [0, 45],
    [0.8, 1],
    { easing: Easing.out(Easing.back({ overshoot: 1.2 })) }
  );

  // 2-4s: 副标题滑入
  const subOpacity = interpolate(
    frame,
    [60, 90],
    [0, 1],
    { easing: Easing.out(Easing.cubic) }
  );
  const subY = interpolate(
    frame,
    [60, 90],
    [40, 0],
    { easing: Easing.out(Easing.cubic) }
  );

  // 6-8s: 装饰元素
  const accentOpacity = interpolate(
    frame,
    [180, 210],
    [0, 0.6],
    { easing: Easing.out(Easing.cubic) }
  );
  const accentScale = interpolate(
    frame,
    [180, 240],
    [0.5, 1],
    { easing: Easing.out(Easing.elastic(1)) }
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 主标题 */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          fontSize: 72,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.1em',
          marginBottom: 24,
          textShadow: '0 0 40px rgba(100, 200, 255, 0.4)',
        }}
      >
        卡若AI
      </div>

      {/* 副标题 */}
      <div
        style={{
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          fontSize: 28,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.2em',
        }}
      >
        你的个人数字管家
      </div>

      {/* 6-8s 装饰圆 */}
      <div
        style={{
          position: 'absolute',
          bottom: 160,
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '3px solid rgba(100, 200, 255, 0.5)',
          opacity: accentOpacity,
          transform: `scale(${accentScale})`,
        }}
      />

      {/* 底部品牌条 8-10s */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          opacity: interpolate(frame, [240, 270], [0, 1], { easing: Easing.out(Easing.cubic) }),
          fontSize: 18,
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        — 智能 · 高效 · 可信 —
      </div>
    </div>
  );
};
