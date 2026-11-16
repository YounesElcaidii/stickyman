import type { Timing } from "../../lib/timing";

/**
 * All motion in the McFlurry-spoon Short as pure functions of the frame number, so any frame can
 * be rendered on its own (Remotion renders frames out of order, in several browser tabs).
 * World units are roughly centimetres; the cup stands on the counter at y = 0.
 */

export const SOCKET_TOP_Y = 18; // world height of the spoon's square opening when it stands in the cup
export const SEATED_TIP_Y = SOCKET_TOP_Y - 3.2; // shaft tip when fully inserted
export const APART_TIP_Y = SOCKET_TOP_Y + 2.4;
export const SPIN_MAX = 0.26; // radians per frame at full speed (~1.2 turns a second)

export type Marks = {
  cutToSide: number; // shot 1 -> shot 2
  approachFrom: number;
  snapAt: number; // the shaft seats in the socket (click)
  spinStart: number;
  craneStart: number;
  craneEnd: number;
  spinStop: number; // deceleration begins
  pullStart: number;
  cutToHero: number; // -> final close-up
  end: number;
};

const frameOf = (timing: Timing, fps: number, needle: string, fallback: number) => {
  const c = timing.captions.find((x) => x.text.toLowerCase().includes(needle));
  return c ? Math.round(c.start * fps) : fallback;
};

/** Shot boundaries, derived from where the narrator actually says each line. */
export const marksFrom = (timing: Timing, fps: number, durationInFrames: number): Marks => {
  const line = (id: string) => {
    const l = timing.lines.find((x) => x.id === id)!;
    return { start: Math.round(l.start * fps), end: Math.round((l.start + l.duration) * fps) };
  };
  const snapped = line("snapped");
  const spun = line("spun");
  const same = line("same");
  const cutToSide = snapped.start - 6;
  const snapAt = frameOf(timing, fps, "snapped", snapped.start + 12) + 3;
  return {
    cutToSide,
    approachFrom: cutToSide + 3,
    snapAt,
    spinStart: spun.start + 2,
    craneStart: spun.start + 10,
    craneEnd: spun.start + 48,
    spinStop: same.start + 2,
    pullStart: same.start + 18,
    cutToHero: frameOf(timing, fps, "and you got", same.start + 60) - 3,
    end: durationInFrames,
  };
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Angular speed of the mixer (radians per frame). */
export const spinSpeed = (frame: number, m: Marks) =>
  SPIN_MAX * smooth((frame - m.spinStart) / 18) * (1 - smooth((frame - m.spinStop) / 14));

/** Total angle turned so far: shaft and spoon share it, so they always rotate together. */
export const spinAngle = (frame: number, m: Marks) => {
  let a = 0;
  for (let k = m.spinStart; k <= Math.min(frame, m.spinStop + 14); k++) a += spinSpeed(k, m);
  return a;
};

/** 0 before mixing, 1 when the toppings are fully stirred in. */
export const mixProgress = (frame: number, m: Marks) => {
  const total = spinAngle(m.spinStop + 14, m);
  return total > 0 ? clamp01(spinAngle(frame, m) / total) : 0;
};

/** World position of the mixer shaft's tip. */
export const shaftTip = (frame: number, m: Marks) => {
  if (frame < m.snapAt) {
    const p = clamp01((frame - m.approachFrom) / Math.max(1, m.snapAt - m.approachFrom));
    const lineUp = smooth(p / 0.55); // drift over the opening...
    const slide = clamp01((p - 0.55) / 0.45); // ...then straight in
    return {
      x: mix(0.9, 0, lineUp),
      y: mix(mix(APART_TIP_Y, SOCKET_TOP_Y + 0.5, lineUp), SEATED_TIP_Y, slide * slide),
    };
  }
  if (frame < m.pullStart) {
    const settle = Math.max(0, 1 - (frame - m.snapAt) / 6);
    return { x: 0, y: SEATED_TIP_Y + 0.06 * settle * Math.cos((frame - m.snapAt) * 1.9) };
  }
  const out = smooth((frame - m.pullStart) / 24);
  return { x: 0, y: mix(SEATED_TIP_Y, SOCKET_TOP_Y + 9, out) };
};

/** How deep the shaft sits inside the socket (0 = not inserted). */
export const insertedDepth = (frame: number, m: Marks) => {
  const tip = shaftTip(frame, m);
  return Math.abs(tip.x) < 0.05 ? Math.max(0, SOCKET_TOP_Y - tip.y) : 0;
};

export type Shot = "hole" | "connect" | "mix" | "hero";
export const shotAt = (frame: number, m: Marks): Shot =>
  frame < m.cutToSide ? "hole" : frame < m.spinStart ? "connect" : frame < m.cutToHero ? "mix" : "hero";

export type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number };
const camMix = (a: Cam, b: Cam, t: number): Cam => ({
  pos: [mix(a.pos[0], b.pos[0], t), mix(a.pos[1], b.pos[1], t), mix(a.pos[2], b.pos[2], t)],
  look: [mix(a.look[0], b.look[0], t), mix(a.look[1], b.look[1], t), mix(a.look[2], b.look[2], t)],
  fov: mix(a.fov, b.fov, t),
});

const SIDE: Cam = { pos: [10.5, 19.6, 13.5], look: [0, 17.2, 0], fov: 30 };
const INTO_CUP: Cam = { pos: [11.5, 22.5, 15.5], look: [0, 8.6, 0], fov: 32 };
const PULL_OUT: Cam = { pos: [14.5, 21.5, 22.5], look: [0, 15.2, 0], fov: 34 };

/** Camera for every frame: position, look-at target and field of view. */
export const cameraAt = (frame: number, m: Marks): Cam => {
  const shot = shotAt(frame, m);
  if (shot === "hole") {
    const t = frame / Math.max(1, m.cutToSide);
    return { pos: [0, 30, mix(15.5, 12.4, smooth(t))], look: [0, 30, 0], fov: 26 };
  }
  if (shot === "connect") {
    const t = (frame - m.cutToSide) / Math.max(1, m.spinStart - m.cutToSide);
    return { ...SIDE, pos: [SIDE.pos[0] - 1.2 * t, SIDE.pos[1], SIDE.pos[2] + 0.4 * t] };
  }
  if (shot === "mix") {
    const side: Cam = { ...SIDE, pos: [SIDE.pos[0] - 1.2, SIDE.pos[1], SIDE.pos[2] + 0.4] };
    const down = smooth((frame - m.craneStart) / Math.max(1, m.craneEnd - m.craneStart));
    // slow orbit and push-in while it mixes
    const drift = clamp01((frame - m.craneEnd) / Math.max(1, m.spinStop - m.craneEnd));
    const a = drift * 0.5;
    const orbit: Cam = {
      pos: [
        (INTO_CUP.pos[0] * Math.cos(a) - INTO_CUP.pos[2] * Math.sin(a)) * (1 - 0.1 * drift),
        INTO_CUP.pos[1] - 1.0 * drift,
        (INTO_CUP.pos[0] * Math.sin(a) + INTO_CUP.pos[2] * Math.cos(a)) * (1 - 0.1 * drift),
      ],
      look: INTO_CUP.look,
      fov: INTO_CUP.fov,
    };
    const mixing = camMix(side, orbit, down);
    const up = smooth((frame - m.spinStop - 2) / 18);
    return camMix(mixing, PULL_OUT, up);
  }
  const t = clamp01((frame - m.cutToHero) / Math.max(1, m.end - m.cutToHero));
  // looking down at the finished dessert, the spoon's square opening nearest the camera
  return { pos: [mix(4.6, 3.2, t), mix(27.6, 26.6, t), mix(22.4, 20.6, t)], look: [0, 12.5, 2.5], fov: 33 };
};

/** Where the spoon is: standing in the cup, floating for the opening close-up, or lying by the dessert. */
export type SpoonPose = { pos: [number, number, number]; rot: [number, number, number] };
export const spoonPose = (frame: number, m: Marks): SpoonPose => {
  const shot = shotAt(frame, m);
  if (shot === "hole") {
    // opening faces the camera; a slow turn shows the depth of the socket
    const t = frame / Math.max(1, m.cutToSide);
    return { pos: [0, 30, 0], rot: [Math.PI / 2 - 0.1 - 0.12 * t, 0, mix(-0.1, 0.34, smooth(t))] };
  }
  if (shot === "hero") {
    // served: the spoon leans in the dessert, tipped toward the camera
    const lean = 0.34;
    return { pos: [0, 3.5 + 15.6 * Math.cos(lean), 15.6 * Math.sin(lean)], rot: [lean, 0.45, 0] };
  }
  return { pos: [0, SOCKET_TOP_Y, 0], rot: [0, spinAngle(frame, m), 0] };
};
