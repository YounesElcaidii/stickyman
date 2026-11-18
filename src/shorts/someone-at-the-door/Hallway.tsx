import React, { useMemo } from "react";
import * as THREE from "three";
import { Arm, mixPose, type HandPose } from "./Hands";
import { Toon, boxGeo, capsuleGeo, cylGeo, sphereGeo, usePainted } from "../../three/toon";

/**
 * The building hallway on the other side of the front door (z < 0), as seen through the peephole,
 * and the stranger: an original character - Alex's hair, face and mustard jacket, but a shade too pale and smiling a little too wide.
 */

export const ALEX = {
  jacket: "#e0a526",
  jacketDark: "#b9831a",
  hair: "#3a2416",
  skin: "#f1c7a0",
  shirt: "#2f8f8a",
};
const STRANGER_SKIN = "#e6cdb6"; // Alex's face, a shade too pale

export type StrangerAct = {
  blink: number; // 0 open .. 1 closed
  tilt: number; // head tilt, radians
  reach: number; // 0 arm at the side .. 1 hand stretched toward the door
  breathe: number; // tiny chest movement
};

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const eul = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "YXZ"));

const Face: React.FC<{ blink: number }> = ({ blink }) => {
  const smile = useMemo(() => new THREE.TorusGeometry(0.058, 0.0068, 8, 28, Math.PI * 0.8), []);
  const hairCap = useMemo(() => new THREE.SphereGeometry(0.162, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), []);
  return (
    <group>
      <Toon geometry={sphereGeo(0.15)} color={STRANGER_SKIN} scale={[0.9, 1.06, 0.9]} />
      {/* ears */}
      <Toon geometry={sphereGeo(0.03)} color={STRANGER_SKIN} position={[-0.134, -0.005, 0]} scale={[0.6, 1, 0.8]} outline={0.005} />
      <Toon geometry={sphereGeo(0.03)} color={STRANGER_SKIN} position={[0.134, -0.005, 0]} scale={[0.6, 1, 0.8]} outline={0.005} />
      {/* hair: a cap pushed back off the forehead, with Alex's side-swept fringe */}
      <Toon geometry={hairCap} color={ALEX.hair} position={[0, 0.012, -0.012]} rotation={[-0.42, 0, 0]} scale={[0.93, 1.02, 0.95]} outline={0.006} />
      <Toon geometry={sphereGeo(0.095)} color={ALEX.hair} position={[0.03, 0.125, 0.085]} rotation={[0.3, 0, -0.38]} scale={[1.3, 0.48, 0.75]} outline={0.006} />
      <Toon geometry={sphereGeo(0.05)} color={ALEX.hair} position={[-0.085, 0.118, 0.07]} rotation={[0.2, 0, 0.5]} scale={[1, 0.5, 0.8]} outline={0.006} />
      {/* eyes: wide, with small pupils that never move */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.052, 0.018, 0.118]}>
          <mesh scale={[1, 1.12, 0.5]}>
            <sphereGeometry args={[0.03, 18, 14]} />
            <meshBasicMaterial color="#fbfbf6" toneMapped={false} />
          </mesh>
          <mesh scale={[1.12, 1.24, 0.42]} position={[0, 0, -0.004]}>
            <sphereGeometry args={[0.03, 18, 14]} />
            <meshBasicMaterial color="#16110f" />
          </mesh>
          <mesh position={[0, 0, 0.0135]}>
            <sphereGeometry args={[0.0105, 12, 10]} />
            <meshBasicMaterial color="#16110f" />
          </mesh>
          {/* eyelid */}
          <mesh position={[0, 0.034 * (1 - blink), 0.01]} scale={[1.18, Math.max(0.001, blink) * 1.3, 0.78]}>
            <sphereGeometry args={[0.03, 18, 14]} />
            <meshToonMaterial color="#d9bda5" />
          </mesh>
          {/* eyebrow */}
          <mesh position={[0, 0.052, 0.006]} rotation={[0, 0, -sd * 0.1]}>
            <boxGeometry args={[0.052, 0.013, 0.012]} />
            <meshBasicMaterial color={ALEX.hair} />
          </mesh>
        </group>
      ))}
      {/* nose and a smile that is a little too wide */}
      <Toon geometry={sphereGeo(0.017)} color="#d9b89c" position={[0, -0.018, 0.139]} scale={[1, 1.2, 1]} outline={0.004} />
      <mesh geometry={smile} position={[0, -0.028, 0.129]} rotation={[0.42, 0, -Math.PI / 2 - (Math.PI * 0.8) / 2]}>
        <meshBasicMaterial color="#5a1f1a" />
      </mesh>
    </group>
  );
};

const Stranger: React.FC<{ act: StrangerAct }> = ({ act }) => {
  const z = -1.28;
  const chest = 0.006 * act.breathe;
  const shoulderR = v3(0.3, 1.63 + chest, z);
  const shoulderL = v3(-0.3, 1.63 + chest, z);
  const hang = (side: number): HandPose => ({
    wrist: v3(side * 0.345, 1.09, z + 0.03),
    rotation: eul(-Math.PI / 2 + 0.08, Math.PI, side * 0.12),
    fingers: [0.32, 0.3, 0.2],
    thumb: [0.2, 0.2],
  });
  const reaching: HandPose = {
    // palm down, fingers toward the door, opening as it comes up
    wrist: v3(0.13, 1.44, z + 0.5),
    rotation: eul(-0.25, Math.PI, 0.1),
    fingers: [0.16, 0.14, 0.1],
    thumb: [0.05, 0.1],
    spread: 0.12,
    thumbYaw: 1.1,
  };
  const right = mixPose(hang(1), reaching, act.reach);
  return (
    <group>
      {/* legs and shoes */}
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <Toon geometry={capsuleGeo(0.075, 0.82)} color="#2b3550" position={[sd * 0.11, 0.5, z]} />
          <Toon geometry={boxGeo(0.17, 0.05, 0.02, 0.008)} color="#222a40" position={[sd * 0.11, 0.12, z + 0.075]} outline={0.004} />
          <Toon geometry={sphereGeo(0.09)} color="#f1e6d2" position={[sd * 0.11, 0.05, z + 0.06]} scale={[1, 0.55, 1.7]} />
          <Toon geometry={boxGeo(0.14, 0.03, 0.2, 0.012)} color="#16110f" position={[sd * 0.11, 0.015, z + 0.06]} outline={0.004} />
        </group>
      ))}
      {/* Alex's jacket: body, hem, zip, collar, pockets, chest patch */}
      <group position={[0, chest, 0]}>
        <Toon geometry={boxGeo(0.58, 0.7, 0.31, 0.11)} color={ALEX.jacket} position={[0, 1.36, z]} />
        <Toon geometry={boxGeo(0.56, 0.08, 0.32, 0.03)} color={ALEX.jacketDark} position={[0, 1.04, z]} outline={0.005} />
        <Toon geometry={boxGeo(0.03, 0.62, 0.02, 0.006)} color="#f1e6d2" position={[0, 1.38, z + 0.158]} outline={0.004} />
        <Toon geometry={boxGeo(0.045, 0.05, 0.03, 0.008)} color="#c9cdd6" position={[0, 1.64, z + 0.165]} outline={0.004} />
        <Toon geometry={boxGeo(0.17, 0.13, 0.03, 0.02)} color={ALEX.jacketDark} position={[-0.16, 1.2, z + 0.152]} rotation={[0, 0, 0.12]} outline={0.005} />
        <Toon geometry={boxGeo(0.17, 0.13, 0.03, 0.02)} color={ALEX.jacketDark} position={[0.16, 1.2, z + 0.152]} rotation={[0, 0, -0.12]} outline={0.005} />
        <Toon geometry={boxGeo(0.12, 0.085, 0.02, 0.01)} color="#f1e6d2" position={[0.16, 1.5, z + 0.156]} outline={0.004} />
        <Toon geometry={boxGeo(0.2, 0.11, 0.07, 0.03)} color={ALEX.jacketDark} position={[-0.105, 1.715, z + 0.09]} rotation={[0.2, 0, 0.5]} outline={0.005} />
        <Toon geometry={boxGeo(0.2, 0.11, 0.07, 0.03)} color={ALEX.jacketDark} position={[0.105, 1.715, z + 0.09]} rotation={[0.2, 0, -0.5]} outline={0.005} />
        <Toon geometry={cylGeo(0.075, 0.09, 0.07, 18)} color={ALEX.shirt} position={[0, 1.72, z + 0.01]} outline={0.004} />
      </group>
      <Arm shoulder={shoulderL} pose={hang(-1)} left skin={STRANGER_SKIN} sleeveColor={ALEX.jacket} cuff={ALEX.jacketDark} />
      <Arm shoulder={shoulderR} pose={right} skin={STRANGER_SKIN} sleeveColor={ALEX.jacket} cuff={ALEX.jacketDark} />
      {/* neck and head */}
      <Toon geometry={cylGeo(0.05, 0.055, 0.14, 14)} color={STRANGER_SKIN} position={[0, 1.8 + chest, z]} />
      <group position={[0.012, 1.975 + chest, z + 0.012]} rotation={[0.04, 0, act.tilt]}>
        <Face blink={act.blink} />
      </group>
    </group>
  );
};

export const Hallway: React.FC<{ frame: number; act: StrangerAct }> = ({ frame, act }) => {
  const carpet = usePainted(128, 128, (g) => {
    g.fillStyle = "#2c4a55";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#375c68";
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(i * 32 + 6, j * 32 + 6, 20, 20);
  });
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping;
  carpet.repeat.set(2, 7);
  // an old tube light: mostly on, with short uneven dips
  const dip = Math.sin(frame * 1.7) * Math.sin(frame * 0.31) > 0.72 ? 0.35 : 1;
  const light = 0.85 * dip + 0.1 * Math.sin(frame * 0.9);
  return (
    <group>
      <color attach="background" args={["#07090f"]} />
      <ambientLight intensity={0.42} color="#8fa6d8" />
      <pointLight position={[0, 2.35, -1.5]} intensity={3.2 * light} color="#dfe8ff" distance={6} decay={1.4} />
      <pointLight position={[0, 1.0, -6.2]} intensity={0.8} color="#4dff9a" distance={4} decay={1.6} />
      {/* a little warm light spilling under the door, so the face reads */}
      <pointLight position={[0.1, 1.55, -0.45]} intensity={0.75} color="#ffe2c2" distance={3} decay={1.5} />
      {/* floor, ceiling, walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3.5]}>
        <planeGeometry args={[1.9, 7.2]} />
        <meshToonMaterial map={carpet} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.5, -3.5]}>
        <planeGeometry args={[1.9, 7.2]} />
        <meshToonMaterial color="#8b93a8" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.95, 1.25, -3.5]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[7.2, 2.5]} />
          <meshToonMaterial color="#a8b0c4" />
        </mesh>
      ))}
      <mesh position={[0, 1.25, -7.1]}>
        <planeGeometry args={[1.9, 2.5]} />
        <meshToonMaterial color="#6f7890" />
      </mesh>
      {/* neighbours' doors, the ceiling light and an exit sign at the far end */}
      {[-2.6, -5.0].map((z, i) => (
        <group key={z}>
          <Toon geometry={boxGeo(0.05, 2.0, 0.86, 0.01)} color="#5c4636" position={[-0.93, 1.0, z]} />
          <Toon geometry={boxGeo(0.05, 2.0, 0.86, 0.01)} color="#5c4636" position={[0.93, 1.0, z - 1.1 + i * 0.4]} />
        </group>
      ))}
      <Toon geometry={boxGeo(0.9, 0.05, 0.16, 0.02)} color="#f4f7ff" position={[0, 2.46, -1.5]} emissive="#dfe8ff" emissiveIntensity={light} />
      <Toon geometry={boxGeo(0.4, 0.16, 0.04, 0.01)} color="#1c7a48" position={[0, 2.2, -7.05]} emissive="#4dff9a" emissiveIntensity={0.9} />
      <Stranger act={act} />
    </group>
  );
};

export const PEEPHOLE_CAMERA = { eye: new THREE.Vector3(0, 1.52, -0.06), look: new THREE.Vector3(0.02, 1.6, -3), fov: 100 };
