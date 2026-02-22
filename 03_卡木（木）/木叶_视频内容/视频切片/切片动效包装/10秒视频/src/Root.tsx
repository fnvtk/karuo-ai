import React from 'react';
import { Composition } from 'remotion';
import { Video10s } from './Video10s';
import { Video10sRich } from './Video10sRich';

const FPS = 30;
const DURATION_SEC = 10;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Video10s"
      component={Video10s}
      durationInFrames={FPS * DURATION_SEC}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
    <Composition
      id="Video10sRich"
      component={Video10sRich}
      durationInFrames={FPS * DURATION_SEC}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  </>
);
