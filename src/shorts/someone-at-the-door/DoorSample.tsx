import React, { useLayoutEffect } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import "@fontsource/fredoka/700.css";
import { Apartment, DOOR } from "./Apartment";
import { Arm, mixPose, type HandPose } from "./Hands";
import { Phone, phoneGrip } from "./Phone";

/**
 * Five-second motion sample (150 frames): walk to the door, the right hand reaches and closes on
 * the handle, the phone rings, the hand freezes and the left hand lifts the phone into view.
 * Everything is a pure function of the frame number.
 */

export const SAMPLE = { contact: 56, ring: 68, phoneUpFrom: 76, phoneUpTo: 108, frames: 150 };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const euler = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "YXZ"));

export const sampleState = (f: number) => {
  // --- body: two steps toward the door, then stop
  const walk = smooth(f / 50);
  const stepPhase = Math.min(f, 50) / 25; // one step every 25 frames
  const bob = Math.abs(Math.sin(stepPhase * Math.PI)) * 0.022 * (1 - smooth((f - 44) / 10));
  const sway = Math.sin(stepPhase * Math.PI) * 0.012 * (1 - smooth((f - 44) / 10));
  const startle = f >= SAMPLE.ring ? Math.exp(-(f - SAMPLE.ring) / 5) * 0.012 : 0;
  const breath = Math.sin(f / 17) * 0.003;
  const eye = v(0.12 + sway, 1.6 + bob + breath + startle, 1.42 - 0.9 * walk);

  // --- eyes: on the handle, then down to the phone as it comes up (the handle stays in view)
  const toPhone = smooth((f - SAMPLE.phoneUpFrom - 4) / 26);
  const look = v(0.27, 1.08, 0).lerp(v(0.16, 1.02, 0.02), toPhone);

  // --- right hand: swings up from the side, closes on the lever, freezes when the phone rings
  const rest: HandPose = {
    wrist: v(eye.x + 0.24, eye.y - 0.56, eye.z - 0.12),
    rotation: euler(-0.5, 0.15, -0.3),
    fingers: [0.35, 0.3, 0.2],
    thumb: [0.2, 0.2],
  };
  const hover: HandPose = {
    wrist: v(DOOR.handle.x + 0.005, DOOR.handle.y + 0.075, DOOR.handle.z + 0.12),
    rotation: euler(-0.32, 0.05, -0.06),
    fingers: [0.2, 0.15, 0.1],
    thumb: [0.05, 0.1],
    spread: 0.09,
  };
  const grip: HandPose = {
    wrist: v(DOOR.handle.x + 0.004, DOOR.handle.y + 0.03, DOOR.handle.z + 0.07),
    rotation: euler(-0.1, 0.03, -0.04),
    fingers: [1.15, 1.0, 0.55],
    thumb: [0.95, 0.5],
    spread: 0.03,
  };
  const reach = smooth((f - 14) / (SAMPLE.contact - 22));
  const close = smooth((f - (SAMPLE.contact - 9)) / 9);
  const right = mixPose(mixPose(rest, hover, reach), grip, close);
  if (f >= SAMPLE.ring) {
    // a small flinch, then perfectly still
    const flinch = Math.exp(-(f - SAMPLE.ring) / 4) * Math.sin((f - SAMPLE.ring) * 1.3);
    right.fingers = (right.fingers as [number, number, number][]).map((c) => [c[0] - 0.05 * flinch, c[1] - 0.04 * flinch, c[2]] as [number, number, number]);
  }

  // --- phone and left hand: up from the hip into view, buzzing while it rings
  const lift = smooth((f - SAMPLE.phoneUpFrom) / (SAMPLE.phoneUpTo - SAMPLE.phoneUpFrom));
  const ringing = f >= SAMPLE.ring;
  const buzz = ringing ? Math.sin(f * 2.6) * 0.0016 * (0.4 + 0.6 * Math.abs(Math.sin((f - SAMPLE.ring) / 30 * Math.PI))) : 0;
  const low = v(eye.x - 0.2, eye.y - 0.62, eye.z - 0.1);
  const high = v(eye.x - 0.06, eye.y - 0.235, eye.z - 0.27);
  const phonePos = low.lerp(high, lift).add(v(buzz, 0, 0));
  const phoneRot = euler(-0.95, 0.5, 0.35).slerp(euler(-0.52, 0.2, 0.05 + buzz * 6), lift);
  const leftPose = phoneGrip(phonePos, phoneRot);

  return {
    eye,
    look,
    right,
    leftPose,
    phonePos,
    phoneRot,
    ringing,
    pulse: ringing ? ((f - SAMPLE.ring) % 24) / 24 : 0,
    shoulderR: v(eye.x + 0.2, eye.y - 0.2, eye.z + 0.04),
    shoulderL: v(eye.x - 0.2, eye.y - 0.2, eye.z + 0.04),
  };
};

const Camera: React.FC<{ eye: THREE.Vector3; look: THREE.Vector3; fov?: number }> = ({ eye, look, fov = 76 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(eye);
    cam.fov = fov;
    cam.near = 0.03;
    cam.far = 30;
    cam.lookAt(look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, [camera, eye, look, fov]);
  return null;
};

export const DoorSample: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = sampleState(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: "#16110f" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 76, position: [0, 1.6, 1.4] }} gl={{ antialias: true }}>
        <Camera eye={s.eye} look={s.look} />
        <Apartment frame={frame} />
        <Arm shoulder={s.shoulderR} pose={s.right} />
        <Arm shoulder={s.shoulderL} pose={s.leftPose} left />
        <Phone position={s.phonePos} rotation={s.phoneRot} screen={s.ringing ? { kind: "call", pulse: s.pulse } : { kind: "message", text: "I'm outside." }} />
      </ThreeCanvas>

      {/* sound: room tone, two footsteps, a soft touch on the handle, then the ring and buzz */}
      <Html5Audio src={staticFile("sfx/room.wav")} volume={0.1} />
      {[6, 31].map((at) => (
        <Sequence key={at} from={at} durationInFrames={10} layout="none">
          <Html5Audio src={staticFile("sfx/footstep.wav")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={SAMPLE.contact} durationInFrames={6} layout="none">
        <Html5Audio src={staticFile("sfx/click.wav")} volume={0.12} />
      </Sequence>
      <Sequence from={SAMPLE.ring} layout="none">
        <Html5Audio src={staticFile("sfx/ringtone.wav")} volume={0.5} loop />
      </Sequence>
      {[0, 30, 60].map((d) => (
        <Sequence key={d} from={SAMPLE.ring + d} durationInFrames={15} layout="none">
          <Html5Audio src={staticFile("sfx/buzz.wav")} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
