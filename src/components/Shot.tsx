import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";

/** Plays a short sound effect at a frame offset inside the current sequence. */
export const Sfx: React.FC<{ at: number; name: "pop" | "ding" | "whoosh"; volume?: number }> = ({ at, name, volume = 0.4 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={20} layout="none">
    <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** Full-frame SVG canvas in video coordinates (1080 x 1920). */
export const Canvas: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg }) => (
  <AbsoluteFill style={{ background: bg }}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {children}
    </svg>
  </AbsoluteFill>
);
