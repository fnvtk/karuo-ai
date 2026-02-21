import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

const FPS = 30;
const F = (frames: number) => frames;

// 粒子网格 - 无极/无限感
const ParticleGrid: React.FC<{ frame: number }> = ({ frame }) => {
  const rows = 12;
  const cols = 6;
  const particles: React.ReactNode[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const delay = (i * cols + j) * 2;
      const phase = ((frame - delay) / 60) * Math.PI * 2;
      const opacity = interpolate(
        frame,
        [delay, delay + 30, F(300)],
        [0, 0.15, 0.08],
        { extrapolateRight: 'clamp' }
      );
      const y = Math.sin(phase + i * 0.3) * 8 + Math.cos(phase * 0.7 + j) * 6;
      const x = Math.cos(phase * 0.5 + j * 0.4) * 10;
      particles.push(
        <div
          key={`${i}-${j}`}
          style={{
            position: 'absolute',
            left: `${(j / (cols - 1)) * 100}%`,
            top: `${(i / (rows - 1)) * 100}%`,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'rgba(150, 200, 255, 0.9)',
            opacity,
            transform: `translate(${x}px, ${y}px)`,
          }}
        />
      );
    }
  }
  return <>{particles}</>;
};

// 极限环 - 收敛/发散
const LimitRings: React.FC<{ frame: number }> = ({ frame }) => {
  const ringScale = interpolate(frame, [F(30), F(120), F(210)], [0.3, 1, 0.85], { easing: Easing.inOut(Easing.cubic) });
  const ringOpacity = interpolate(frame, [0, F(45), F(240)], [0, 0.35, 0.2], { extrapolateRight: 'clamp' });
  const rot = (frame / 120) * 360;
  return (
    <>
      {[1, 0.7, 0.45].map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 280 * r * ringScale,
            height: 280 * r * ringScale,
            borderRadius: '50%',
            border: `1px solid rgba(100, 180, 255, ${ringOpacity * (1 - i * 0.2)})`,
            transform: `rotate(${rot + i * 60}deg)`,
            opacity: ringOpacity,
          }}
        />
      ))}
    </>
  );
};

// 流动线条 - 极限延伸
const FlowLines: React.FC<{ frame: number }> = ({ frame }) => {
  const progress = interpolate(frame, [F(90), F(200)], [0, 1], { easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const opacity = interpolate(frame, [F(60 + i * 8), F(150 + i * 8)], [0, 0.12], { extrapolateRight: 'clamp' });
        const len = 200 + progress * 300;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 1,
              height: len,
              background: `linear-gradient(to bottom, transparent, rgba(120, 200, 255, ${opacity}))`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              transformOrigin: 'center center',
            }}
          />
        );
      })}
    </div>
  );
};

// 主标题
const MainTitle: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [F(40), F(80)], [0, 1], { easing: Easing.out(Easing.back({ overshoot: 0.8 })) });
  const scale = interpolate(frame, [F(40), F(90)], [0.6, 1], { easing: Easing.out(Easing.cubic) });
  const glow = interpolate(frame, [F(100), F(180)], [0.3, 0.7]);
  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        fontSize: 80,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '0.15em',
        textShadow: `0 0 ${40 + glow * 30}px rgba(100, 200, 255, 0.5)`,
        zIndex: 5,
      }}
    >
      卡若AI
    </div>
  );
};

// 副标题
const SubTitle: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [F(100), F(140)], [0, 1], { easing: Easing.out(Easing.cubic) });
  const y = interpolate(frame, [F(100), F(130)], [30, 0], { easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontSize: 28,
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: '0.25em',
        marginTop: 20,
        zIndex: 5,
      }}
    >
      你的个人数字管家
    </div>
  );
};

// 标签行
const Taglines: React.FC<{ frame: number }> = ({ frame }) => {
  const tags = ['智能', '高效', '可信'];
  return (
    <div style={{ display: 'flex', gap: 32, marginTop: 36, zIndex: 5 }}>
      {tags.map((t, i) => {
        const opacity = interpolate(frame, [F(150 + i * 15), F(180 + i * 15)], [0, 0.85]);
        const scale = interpolate(frame, [F(150 + i * 15), F(175 + i * 15)], [0.8, 1]);
        return (
          <span
            key={t}
            style={{
              opacity,
              transform: `scale(${scale})`,
              fontSize: 20,
              color: 'rgba(200, 230, 255, 0.9)',
              letterSpacing: '0.2em',
            }}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
};

// 中心光点 - 极限凝聚
const CenterGlow: React.FC<{ frame: number }> = ({ frame }) => {
  const scale = interpolate(frame, [F(120), F(200)], [0.5, 1.2], { easing: Easing.inOut(Easing.cubic) });
  const opacity = interpolate(frame, [F(100), F(180), F(280)], [0, 0.4, 0.15]);
  return (
    <div
      style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%)',
        transform: `scale(${scale})`,
        opacity,
      }}
    />
  );
};

// 底部装饰条
const BottomBar: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [F(240), F(270)], [0, 0.7]);
  const width = interpolate(frame, [F(240), F(270)], [0, 1], { easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: `translateX(-50%) scaleX(${width})`,
        opacity,
        fontSize: 16,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.3em',
      }}
    >
      — 智能 · 高效 · 可信 —
    </div>
  );
};

// 渐变背景 - 随时间流动
const AnimatedBg: React.FC<{ frame: number }> = ({ frame }) => {
  const shift = (frame / 300) * 20;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(${135 + shift}deg, #0a0a1a 0%, #12122e 25%, #0f1a2e 50%, #0d1525 75%, #080818 100%)`,
      }}
    />
  );
};

export const Video10sRich: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, "PingFang SC", sans-serif',
        overflow: 'hidden',
      }}
    >
      <AnimatedBg frame={frame} />
      <FlowLines frame={frame} />
      <ParticleGrid frame={frame} />
      <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LimitRings frame={frame} />
      </div>
      <CenterGlow frame={frame} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <MainTitle frame={frame} />
        <SubTitle frame={frame} />
        <Taglines frame={frame} />
      </div>
      <BottomBar frame={frame} />
    </div>
  );
};
