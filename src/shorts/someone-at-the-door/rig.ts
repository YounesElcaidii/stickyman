import * as THREE from "three";
import type { Timing } from "../../lib/timing";
import { DOOR } from "./Apartment";
import { mixPose, type HandPose } from "./Hands";

/**
 * Every position in "Someone Is Outside Your Door" as a pure function of the frame number.
 * Shot boundaries come from where the narrator actually says each line.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const q = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "YXZ"));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

type Span = { s: number; e: number };
export type Marks = {
  line: Record<string, Span>;
  knocks: number[];
  standAt: number;
  walkFrom: number;
  contact: number; // the hand closes on the handle
  ring: number; // the phone starts ringing
  liftFrom: number; // ...and after a pause the phone comes up
  answered: number;
  peepIn: number; // cut to the peephole view
  peepOut: number; // cut back inside
  buzz: number;
  handleTurns: number; // the handle starts to move by itself
  choiceAt: number;
  end: number;
};

export const marksFrom = (timing: Timing, fps: number, durationInFrames: number): Marks => {
  const line: Record<string, Span> = {};
  for (const l of timing.lines) line[l.id] = { s: Math.round(l.start * fps), e: Math.round((l.start + l.duration) * fps) };
  const k = line.text.e + 9;
  const ring = line.walk.e + 12;
  return {
    line,
    knocks: [k, k + 10, k + 20],
    standAt: line.knocks.e - 4,
    walkFrom: line.knocks.e + 8,
    contact: line.walk.e + 2,
    ring,
    liftFrom: ring + 17,
    answered: line.call.s - 3,
    peepIn: line.peephole.e + 2,
    peepOut: line.still.e + 9,
    buzz: line.still.e + 11, // the buzz lands in the pause, before the narrator speaks again
    handleTurns: line.locked.e + 16,
    choiceAt: line.choice.s,
    end: durationInFrames,
  };
};

type Key<T> = { f: number; v: T; cut?: boolean };
/** Smooth interpolation through keyframes; a key marked `cut` jumps instead of blending. */
const track = <T>(keys: Key<T>[], f: number, blend: (a: T, b: T, t: number) => T): T => {
  if (f <= keys[0].f) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f < b.f) return b.cut ? a.v : blend(a.v, b.v, smooth((f - a.f) / Math.max(1, b.f - a.f)));
  }
  return keys[keys.length - 1].v;
};
const vmix = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);

const SEAT = v(0.35, 1.2, 3.75);
const AT_DOOR = v(0.12, 1.6, 0.52);

// --- hand poses ----------------------------------------------------------------------------------
const H = DOOR.handle;
const handRest = (eye: THREE.Vector3): HandPose => ({
  wrist: v(eye.x + 0.25, eye.y - 0.6, eye.z - 0.1),
  rotation: q(-0.45, 0.1, -1.2), // hanging at the side, thumb forward
  fingers: [0.4, 0.35, 0.25],
  thumb: [0.2, 0.2],
});
const handRising = (eye: THREE.Vector3): HandPose => ({
  wrist: v(H.x + 0.05, H.y + 0.16, eye.z - 0.3),
  rotation: q(-0.55, 0.1, -0.55), // the wrist rolls palm-down as the arm comes up
  fingers: [0.18, 0.14, 0.1],
  thumb: [0.05, 0.1],
  spread: 0.1,
  thumbYaw: 1.05,
});
const handOver: HandPose = {
  wrist: v(H.x + 0.008, H.y + 0.085, H.z + 0.115),
  rotation: q(-0.42, 0.04, -0.1),
  fingers: [0.25, 0.2, 0.12],
  thumb: [0.1, 0.1],
  spread: 0.08,
  thumbYaw: 1.05,
};
const handGrip: HandPose = {
  // palm on top of the lever, four fingers wrapped over and under it, thumb tucked underneath
  wrist: v(H.x + 0.004, H.y + 0.034, H.z + 0.078),
  rotation: q(-0.16, 0.03, -0.05),
  fingers: [
    [1.2, 1.2, 0.8],
    [1.25, 1.22, 0.85],
    [1.25, 1.22, 0.85],
    [1.2, 1.25, 0.9],
  ],
  thumb: [1.15, 0.7],
  spread: 0.02,
  thumbYaw: 0.55,
};
const handRecoil: HandPose = {
  wrist: v(H.x + 0.03, H.y + 0.11, H.z + 0.21),
  rotation: q(-0.75, 0.1, -0.25),
  fingers: [0.3, 0.45, 0.3],
  thumb: [0.1, 0.25],
  spread: 0.12,
  thumbYaw: 1.1,
};
const handHover: HandPose = {
  wrist: v(H.x + 0.012, H.y + 0.075, H.z + 0.13),
  rotation: q(-0.4, 0.05, -0.1),
  fingers: [0.55, 0.5, 0.3],
  thumb: [0.4, 0.3],
  spread: 0.06,
  thumbYaw: 0.9,
};
const handGuard = (eye: THREE.Vector3): HandPose => ({
  // pulled back toward the chest in a loose fist
  wrist: v(eye.x + 0.21, eye.y - 0.5, eye.z - 0.2),
  rotation: q(-0.7, 0.2, -0.95),
  fingers: [1.15, 1.05, 0.65],
  thumb: [0.75, 0.5],
});
const handOnDoor: HandPose = {
  // palm flat on the door beside the peephole, fingers up
  wrist: v(0.115, 1.41, 0.048),
  rotation: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(v(1, 0, 0), v(0, 0, 1), v(0, -1, 0))).multiply(q(0.06, 0, 0.12)),
  fingers: [0.08, 0.06, 0.05],
  thumb: [0.0, 0.1],
  spread: 0.14,
  thumbYaw: 1.2,
};

// --- phone positions, relative to the eyes ----------------------------------------------------------
type PhonePose = { offset: THREE.Vector3; rot: THREE.Quaternion };
const P_READ: PhonePose = { offset: v(0.0, -0.09, -0.2), rot: q(-0.36, 0, 0) };
const P_LOWERED: PhonePose = { offset: v(-0.075, -0.215, -0.25), rot: q(-0.75, 0.2, 0.1) };
const P_SIDE: PhonePose = { offset: v(-0.2, -0.62, -0.1), rot: q(-0.95, 0.5, 0.35) };
const P_CALL: PhonePose = { offset: v(-0.035, -0.15, -0.2), rot: q(-0.6, 0.12, 0.03) };
const P_ASIDE: PhonePose = { offset: v(-0.105, -0.3, -0.23), rot: q(-0.85, 0.3, 0.1) };
const P_MESSAGE: PhonePose = { offset: v(-0.01, -0.135, -0.19), rot: q(-0.58, 0.03, 0.0) };
const pmix = (a: PhonePose, b: PhonePose, t: number): PhonePose => ({ offset: a.offset.clone().lerp(b.offset, t), rot: a.rot.clone().slerp(b.rot, t) });

export type Screen = "text" | "ringing" | "call" | "locked";

export const stateAt = (f: number, m: Marks) => {
  const L = m.line;
  const inPeephole = f >= m.peepIn && f < m.peepOut;

  // --- where you are
  const eyeKeys: Key<THREE.Vector3>[] = [
    { f: m.standAt, v: SEAT },
    { f: m.walkFrom + 4, v: v(0.33, 1.6, 3.4) },
    { f: m.contact - 8, v: AT_DOOR },
    { f: L.hallway.s, v: AT_DOOR },
    { f: L.openup.e, v: v(0.1, 1.6, 0.6) },
    { f: L.peephole.s, v: v(0.08, 1.6, 0.58) },
    { f: L.peephole.e - 3, v: v(0.0, 1.535, 0.27) },
    { f: m.peepOut - 1, v: v(0.0, 1.53, 0.25) },
    { f: m.peepOut, v: v(0.12, 1.6, 0.56), cut: true },
    { f: m.end, v: v(0.13, 1.59, 0.5) },
  ];
  const eye = track(eyeKeys, f, vmix);
  const walking = clamp01((f - m.walkFrom) / 8) * (1 - smooth((f - (m.contact - 16)) / 10));
  const step = (f - m.walkFrom) / 13;
  eye.y += Math.abs(Math.sin(step * Math.PI)) * 0.024 * walking + Math.sin(f / 19) * 0.003;
  eye.x += Math.sin(step * Math.PI) * 0.014 * walking;
  if (f >= m.ring) eye.y += Math.exp(-(f - m.ring) / 5) * 0.012; // a start when the phone rings
  if (f >= L.openup.s && f < m.peepIn) eye.z += Math.exp(-(f - L.openup.s) / 9) * 0.02; // lean back from the voice

  // --- the phone and the hand that holds it
  const phoneKeys: Key<PhonePose>[] = [
    { f: m.knocks[0] - 3, v: P_READ },
    { f: m.knocks[0] + 8, v: P_LOWERED },
    { f: m.standAt, v: P_LOWERED },
    { f: m.walkFrom + 10, v: P_SIDE },
    { f: m.liftFrom, v: P_SIDE },
    { f: m.liftFrom + 20, v: P_CALL },
    { f: L.call.e + 4, v: P_CALL },
    { f: L.freezes.s + 12, v: P_ASIDE },
    { f: L.peephole.s, v: P_ASIDE },
    { f: L.peephole.s + 14, v: P_SIDE },
    { f: m.peepOut - 1, v: P_SIDE },
    { f: m.peepOut, v: P_ASIDE, cut: true },
    { f: m.buzz + 16, v: P_MESSAGE },
    { f: L.locked.e + 8, v: P_MESSAGE },
    { f: m.handleTurns + 10, v: P_ASIDE },
  ];
  const pp = track(phoneKeys, f, pmix);
  const ringing = f >= m.ring && f < m.answered;
  const buzzing = ringing || (f >= m.buzz && f < m.buzz + 14);
  const shake = buzzing ? Math.sin(f * 2.6) * 0.0016 : 0;
  const phonePos = eye.clone().add(pp.offset).add(v(shake, 0, 0));
  const phoneRot = pp.rot.clone().multiply(q(0, 0, shake * 5));

  // --- where you look
  const handle = v(0.27, 1.08, 0);
  const lookKeys: Key<THREE.Vector3>[] = [
    { f: m.knocks[0] - 2, v: v(0.35, 1.12, 3.52) }, // down at the phone
    { f: m.knocks[0] + 7, v: v(0.08, 1.3, 0) }, // up at the door
    { f: m.walkFrom, v: v(0.1, 1.25, 0) },
    { f: m.contact - 22, v: handle },
    { f: m.liftFrom + 2, v: handle },
    { f: m.liftFrom + 24, v: v(0.15, 1.03, 0.02) }, // phone and handle together
    { f: L.call.e, v: v(0.15, 1.03, 0.02) },
    { f: L.freezes.s + 10, v: v(0.25, 1.06, 0) }, // back to the hand
    { f: L.hallway.s + 4, v: v(0.25, 1.06, 0) },
    { f: L.openup.s, v: v(0.03, 1.44, 0) }, // slowly up the door
    { f: L.peephole.s, v: v(0.02, 1.48, 0) },
    { f: L.peephole.e - 3, v: v(0.0, 1.52, 0) },
    { f: m.peepOut - 1, v: v(0.0, 1.52, 0) },
    { f: m.peepOut, v: v(0.14, 1.2, 0.1), cut: true },
    { f: m.buzz + 18, v: v(0.11, 1.15, 0.12) }, // the new message
    { f: L.locked.e + 6, v: v(0.11, 1.15, 0.12) },
    { f: m.handleTurns + 12, v: v(0.26, 1.07, 0) }, // ...and back to the handle
    { f: m.end, v: v(0.27, 1.05, 0) },
  ];
  const look = track(lookKeys, f, vmix);

  // --- the free hand
  const rest = handRest(eye);
  const guard = handGuard(eye);
  const handKeys: Key<HandPose>[] = [
    { f: m.contact - 34, v: rest },
    { f: m.contact - 20, v: handRising(eye) },
    { f: m.contact - 9, v: handOver },
    { f: m.contact, v: handGrip },
    { f: m.ring, v: handGrip },
    { f: m.ring + 5, v: handRecoil }, // recoil from the ring
    { f: L.call.s, v: handRecoil },
    { f: L.call.e, v: handHover }, // reaching again...
    { f: L.openup.s, v: handHover }, // ...and frozen in mid-air
    { f: L.openup.s + 10, v: handRecoil },
    { f: L.peephole.s, v: handRecoil },
    { f: L.peephole.e - 6, v: handOnDoor },
    { f: m.peepOut - 1, v: handOnDoor },
    { f: m.peepOut, v: guard, cut: true },
    { f: m.end, v: guard },
  ];
  const right = track(handKeys, f, mixPose);
  // a flinch when the phone rings, and a shiver when the hand freezes
  const flinch = f >= m.ring ? Math.exp(-(f - m.ring) / 4) * Math.sin((f - m.ring) * 1.4) * 0.006 : 0;
  const shiver = f >= L.freezes.s && f < L.freezes.s + 14 ? Math.sin(f * 2.9) * 0.0022 * (1 - (f - L.freezes.s) / 14) : 0;
  right.wrist.add(v(shiver, flinch, flinch));

  // --- the door
  const knock = Math.max(0, ...m.knocks.map((k) => (f >= k ? 1 - (f - k) / 7 : 0)));
  const voice = f >= L.openup.s && f < L.openup.e ? 0.3 + 0.2 * Math.sin(f * 1.3) : 0;
  const gripPress = 0.05 * smooth((f - (m.contact - 4)) / 6) * (1 - smooth((f - m.ring) / 4));
  const creep = 0.42 * smooth((f - m.handleTurns) / 60);

  const screen: Screen = f < m.ring ? "text" : f < m.answered ? "ringing" : f < m.buzz ? "call" : "locked";
  return {
    inPeephole,
    eye,
    look,
    right,
    phonePos,
    phoneRot,
    screen,
    pulse: ringing ? ((f - m.ring) % 24) / 24 : 0,
    callConnected: f >= m.answered && f < L.call.e + 10,
    knock: Math.max(knock, voice),
    knockY: voice > 0 ? 1.45 : 1.25,
    handleTurn: gripPress + creep,
    shoulderR: v(eye.x + 0.2, eye.y - 0.2, eye.z + 0.04),
    shoulderL: v(eye.x - 0.2, eye.y - 0.2, eye.z + 0.04),
    choice: clamp01((f - m.choiceAt) / 10),
  };
};
