import { Easing, interpolate, spring } from "remotion";

export const FPS = 30;

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 -> 1 between frames a and b (clamped, eased). */
export const ramp = (frame: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [a, b], [0, 1], { ...clampOpts, easing: ease });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bouncy pop-in (0 -> 1, overshoots slightly). */
export const pop = (frame: number, fps: number, delay = 0, stiffness = 180) =>
  spring({ frame: frame - delay, fps, config: { damping: 11, stiffness, mass: 0.6 } });

/** Smooth spring without overshoot. */
export const settle = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 200 } });

/** Deterministic pseudo random in [0,1). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Small camera shake offset that decays after `start`. */
export const shake = (frame: number, start: number, strength = 12, length = 10) => {
  const t = frame - start;
  if (t < 0 || t > length) return { x: 0, y: 0 };
  const k = 1 - t / length;
  return { x: Math.sin(t * 2.7) * strength * k, y: Math.cos(t * 3.3) * strength * k };
};

export { clampOpts };
