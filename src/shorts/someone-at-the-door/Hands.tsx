import React from "react";
import * as THREE from "three";
import { Toon, between, boxGeo, capsuleGeo, cylGeo, sphereGeo } from "../../three/toon";

/**
 * First-person arms. A hand is posed by its wrist (position + rotation); the elbow is solved
 * from the shoulder so forearm, elbow and wrist always stay connected.
 *
 * Hand space (right hand): wrist at the origin, fingers point along -Z, the palm faces -Y,
 * the thumb is on the -X side. The left hand is the mirror image.
 */

export const SKIN = "#f7dfbe";
const SKIN_DEFAULT = SKIN; // the mascot's cream colour
export const SLEEVE = "#f0704a"; // the mascot's shirt
const SLEEVE_DEFAULT = SLEEVE;
const OUTLINE = 0.0042;

export type FingerCurl = [number, number, number]; // radians at knuckle, middle joint, tip joint
export type HandPose = {
  wrist: THREE.Vector3;
  rotation: THREE.Quaternion;
  fingers: FingerCurl | FingerCurl[]; // one curl for all four fingers, or one each (index..little)
  thumb: [number, number]; // [swing toward the palm, bend]
  spread?: number;
  thumbYaw?: number; // how far the thumb points away from the fingers (default 0.95 rad)
};

const FINGERS = [
  { x: -0.031, len: 0.072 },
  { x: -0.0105, len: 0.08 },
  { x: 0.0105, len: 0.075 },
  { x: 0.031, len: 0.061 },
];
const SEG = [0.45, 0.31, 0.24];
const R = 0.0098;

const Finger: React.FC<{ x: number; len: number; curl: FingerCurl; fan: number; skin: string }> = ({ x, len, curl, fan, skin }) => {
  const SKIN = skin;
  const seg = (i: number, child?: React.ReactNode) => {
    const l = len * SEG[i];
    return (
      <group rotation={[-curl[i], 0, 0]}>
        <Toon geometry={capsuleGeo(R * (1 - i * 0.08), l)} color={SKIN} outline={OUTLINE} position={[0, 0, -l / 2]} rotation={[Math.PI / 2, 0, 0]} />
        <group position={[0, 0, -l]}>{child}</group>
      </group>
    );
  };
  return (
    <group position={[x, 0, -0.096]} rotation={[0, -fan, 0]}>
      {seg(0, seg(1, seg(2)))}
    </group>
  );
};

export const Hand: React.FC<{ pose: HandPose; left?: boolean; skin?: string }> = ({ pose, left = false, skin = SKIN_DEFAULT }) => {
  const SKIN = skin;
  const curls = (Array.isArray(pose.fingers[0]) ? pose.fingers : [pose.fingers, pose.fingers, pose.fingers, pose.fingers]) as FingerCurl[];
  const spread = pose.spread ?? 0.05;
  return (
    <group position={pose.wrist} quaternion={pose.rotation}>
      <group scale={[left ? -1 : 1, 1, 1]}>
        <Toon geometry={boxGeo(0.088, 0.03, 0.098, 0.013)} color={SKIN} outline={OUTLINE} position={[0, 0, -0.05]} />
        {FINGERS.map((f, i) => (
          <Finger key={i} x={f.x} len={f.len} curl={curls[i]} fan={(i - 1.5) * spread} skin={skin} />
        ))}
        {/* thumb */}
        <group position={[-0.04, -0.004, -0.028]} rotation={[0, pose.thumbYaw ?? 0.95, 0]}>
          <group rotation={[-pose.thumb[0], 0, 0]}>
            <Toon geometry={capsuleGeo(0.0115, 0.036)} color={SKIN} outline={OUTLINE} position={[0, 0, -0.018]} rotation={[Math.PI / 2, 0, 0]} />
            <group position={[0, 0, -0.04]} rotation={[-pose.thumb[1], -pose.thumb[1] * 0.6, 0]}>
              <Toon geometry={capsuleGeo(0.0105, 0.026)} color={SKIN} outline={OUTLINE} position={[0, 0, -0.013]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
          </group>
        </group>
        <Toon geometry={sphereGeo(0.027)} color={SKIN} outline={OUTLINE} position={[0, 0, 0.004]} scale={[1.25, 0.72, 1]} />
      </group>
    </group>
  );
};

const L_UPPER = 0.3;
const L_FORE = 0.27;

/** Two-bone IK: where the elbow sits between a shoulder and a wrist. */
export const solveElbow = (shoulder: THREE.Vector3, wrist: THREE.Vector3, left: boolean) => {
  const to = wrist.clone().sub(shoulder);
  const d = Math.min(to.length(), L_UPPER + L_FORE - 0.002);
  const dir = to.normalize();
  const a = (L_UPPER * L_UPPER - L_FORE * L_FORE + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L_UPPER * L_UPPER - a * a));
  const pole = new THREE.Vector3(left ? -0.5 : 0.5, -1, 0.35);
  const perp = pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return shoulder.clone().add(dir.multiplyScalar(a)).add(perp.multiplyScalar(h));
};

/** Sleeve, forearm and hand for one arm. */
export const Arm: React.FC<{ shoulder: THREE.Vector3; pose: HandPose; left?: boolean; skin?: string; sleeveColor?: string; cuff?: string }> = ({
  shoulder,
  pose,
  left = false,
  skin = SKIN_DEFAULT,
  sleeveColor = SLEEVE_DEFAULT,
  cuff = "#d95a36",
}) => {
  const SKIN = skin;
  const SLEEVE = sleeveColor;
  const elbow = solveElbow(shoulder, pose.wrist, left);
  // the forearm ends a little behind the wrist joint, along the hand's own back direction
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(pose.rotation);
  const wristEnd = pose.wrist.clone().add(back.multiplyScalar(0.012));
  const upper = between(shoulder, elbow);
  const fore = between(elbow, wristEnd);
  const cuffAt = elbow.clone().lerp(wristEnd, 0.8);
  const sleeve = between(elbow, cuffAt);
  return (
    <group>
      <Toon geometry={cylGeo(0.048, 0.056, 1, 18)} color={SLEEVE} outline={OUTLINE} position={upper.position} quaternion={upper.quaternion} scale={[1, upper.length, 1]} />
      <Toon geometry={sphereGeo(0.05)} color={SLEEVE} outline={OUTLINE} position={[elbow.x, elbow.y, elbow.z]} />
      <Toon geometry={cylGeo(0.029, 0.036, 1, 18)} color={SKIN} outline={OUTLINE} position={fore.position} quaternion={fore.quaternion} scale={[1, fore.length, 1]} />
      <Toon geometry={cylGeo(0.04, 0.048, 1, 18)} color={SLEEVE} outline={OUTLINE} position={sleeve.position} quaternion={sleeve.quaternion} scale={[1, sleeve.length, 1]} />
      <Toon geometry={cylGeo(0.043, 0.043, 0.022, 18)} color={cuff} outline={OUTLINE} position={[cuffAt.x, cuffAt.y, cuffAt.z]} quaternion={sleeve.quaternion} />
      <Hand pose={pose} left={left} skin={skin} />
    </group>
  );
};

/** Blend two hand poses (wrist position, rotation and every joint). */
export const mixPose = (a: HandPose, b: HandPose, t: number): HandPose => {
  const fa = (Array.isArray(a.fingers[0]) ? a.fingers : [a.fingers, a.fingers, a.fingers, a.fingers]) as FingerCurl[];
  const fb = (Array.isArray(b.fingers[0]) ? b.fingers : [b.fingers, b.fingers, b.fingers, b.fingers]) as FingerCurl[];
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    wrist: a.wrist.clone().lerp(b.wrist, t),
    rotation: a.rotation.clone().slerp(b.rotation, t),
    fingers: fa.map((f, i) => [m(f[0], fb[i][0]), m(f[1], fb[i][1]), m(f[2], fb[i][2])] as FingerCurl),
    thumb: [m(a.thumb[0], b.thumb[0]), m(a.thumb[1], b.thumb[1])],
    spread: m(a.spread ?? 0.05, b.spread ?? 0.05),
    thumbYaw: m(a.thumbYaw ?? 0.95, b.thumbYaw ?? 0.95),
  };
};
