import React, { useLayoutEffect } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Hallway, PEEPHOLE_CAMERA, type StrangerAct } from "./Hallway";

/**
 * Five-second preview of the stranger through the peephole: perfectly still at first, then a slow
 * blink, a slow head tilt, and a hand reaching down toward the door handle. Pure function of the frame.
 */
export const STRANGER_PREVIEW_FRAMES = 150;

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** The stranger's performance, `f` frames after the peephole shot begins; the hand moves at `reachFrom`. */
export const strangerActAt = (f: number, reachFrom = 100): StrangerAct => {
  const blinkAt = 24;
  const blink = f < blinkAt ? 0 : f < blinkAt + 4 ? (f - blinkAt) / 4 : f < blinkAt + 7 ? 1 : Math.max(0, 1 - (f - blinkAt - 7) / 6);
  return {
    blink,
    tilt: -0.03 - 0.2 * smooth((f - 34) / 70), // slow
    reach: smooth((f - reachFrom) / 42),
    breathe: Math.sin(f / 14),
  };
};

const Camera: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(PEEPHOLE_CAMERA.eye);
    cam.fov = PEEPHOLE_CAMERA.fov;
    cam.near = 0.03;
    cam.far = 30;
    cam.lookAt(PEEPHOLE_CAMERA.look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, [camera]);
  return null;
};

export const PeepholeMask: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle 470px at 50% 50%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 76%, rgba(0,0,0,0.55) 90%, #050506 97%, #050506 100%)",
    }}
  >
    <div style={{ position: "absolute", left: 540 - 474, top: 960 - 474, width: 948, height: 948, borderRadius: "50%", border: "14px solid #1c1a1d", boxSizing: "border-box" }} />
  </AbsoluteFill>
);

export const StrangerPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#050506" }}>
      <AbsoluteFill style={{ transform: "translateY(-110px)" }}>
        <ThreeCanvas width={width} height={height} shadows camera={{ fov: 104, position: [0, 1.5, 0] }} gl={{ antialias: true }}>
          <Camera />
          <Hallway frame={frame} act={strangerActAt(frame)} />
        </ThreeCanvas>
        <PeepholeMask />
      </AbsoluteFill>
      <Html5Audio src={staticFile("sfx/room.wav")} volume={0.12} />
      <Html5Audio src={staticFile("sfx/heartbeat.wav")} loop volume={0.16} />
    </AbsoluteFill>
  );
};
