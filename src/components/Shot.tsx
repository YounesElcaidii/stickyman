import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";

/**
 * A quick-cut shot: punch-in zoom on entry, optional whoosh, optional slow camera drift.
 * Children are rendered with frame 0 at the start of the shot.
 */
export const Shot: React.FC<{
  from: number;
  duration: number;
  whoosh?: boolean;
  drift?: number; // extra zoom over the shot, e.g. 0.06
  origin?: string; // transform origin for drift/punch
  children: React.ReactNode;
}> = ({ from, duration, whoosh = true, drift = 0.04, origin = "50% 40%", children }) => (
  <Sequence from={from} durationInFrames={Math.max(1, duration)} layout="none">
    {whoosh && from > 0 && (
      <Sequence from={0} durationInFrames={12} layout="none">
        <Html5Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
      </Sequence>
    )}
    <ShotCamera duration={duration} drift={drift} origin={origin}>
      {children}
    </ShotCamera>
  </Sequence>
);

const ShotCamera: React.FC<{ duration: number; drift: number; origin: string; children: React.ReactNode }> = ({
  duration,
  drift,
  origin,
  children,
}) => {
  const f = useCurrentFrame();
  const punch = interpolate(f, [0, 7], [1.09, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const slow = interpolate(f, [0, Math.max(1, duration)], [0, drift], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ transform: `scale(${punch + slow})`, transformOrigin: origin, overflow: "hidden" }}>
      {children}
    </AbsoluteFill>
  );
};

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
