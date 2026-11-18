import React from "react";
import * as THREE from "three";
import { Toon, boxGeo, capsuleGeo, cylGeo, sphereGeo, usePainted } from "../../three/toon";

/**
 * The building hallway on the other side of the front door (z < 0), as seen through the peephole,
 * and the stranger: an original character - too tall, too still, wearing Alex's mustard jacket.
 */

const JACKET = "#e0a526";

const Stranger: React.FC = () => (
  <group position={[0.04, 0, -1.75]}>
    {/* legs */}
    <Toon geometry={capsuleGeo(0.07, 0.86)} color="#1f2430" position={[-0.11, 0.5, 0]} />
    <Toon geometry={capsuleGeo(0.07, 0.86)} color="#1f2430" position={[0.11, 0.5, 0]} />
    <Toon geometry={sphereGeo(0.09)} color="#15171d" position={[-0.11, 0.05, 0.06]} scale={[1, 0.55, 1.7]} />
    <Toon geometry={sphereGeo(0.09)} color="#15171d" position={[0.11, 0.05, 0.06]} scale={[1, 0.55, 1.7]} />
    {/* the jacket */}
    <Toon geometry={boxGeo(0.56, 0.7, 0.3, 0.11)} color={JACKET} position={[0, 1.36, 0]} />
    <Toon geometry={boxGeo(0.05, 0.66, 0.02, 0.008)} color="#b9831a" position={[0, 1.36, 0.155]} outline={0.004} />
    <Toon geometry={boxGeo(0.34, 0.1, 0.2, 0.04)} color="#b9831a" position={[0, 1.72, 0.02]} />
    <Toon geometry={boxGeo(0.12, 0.09, 0.02, 0.01)} color="#f1e6d2" position={[0.15, 1.5, 0.155]} outline={0.004} />
    {/* arms that hang a little too long */}
    {[-1, 1].map((s) => (
      <group key={s}>
        <Toon geometry={capsuleGeo(0.065, 0.84)} color={JACKET} position={[s * 0.34, 1.2, 0]} rotation={[0, 0, s * 0.05]} />
        <Toon geometry={sphereGeo(0.062)} color="#cfd3e6" position={[s * 0.365, 0.66, 0.01]} scale={[0.9, 1.5, 0.8]} />
      </group>
    ))}
    {/* neck and head: smooth, pale, tilted, with small wide-set eyes and no mouth */}
    <Toon geometry={cylGeo(0.045, 0.05, 0.16, 14)} color="#cfd3e6" position={[0, 1.82, 0]} />
    <group position={[0.03, 2.0, 0.01]} rotation={[0.05, 0, -0.26]}>
      <Toon geometry={sphereGeo(0.15)} color="#dfe2f0" scale={[0.88, 1.08, 0.9]} />
      <mesh position={[-0.066, 0.02, 0.127]}>
        <sphereGeometry args={[0.016, 12, 10]} />
        <meshBasicMaterial color="#0c0c12" />
      </mesh>
      <mesh position={[0.066, 0.02, 0.127]}>
        <sphereGeometry args={[0.016, 12, 10]} />
        <meshBasicMaterial color="#0c0c12" />
      </mesh>
    </group>
  </group>
);

export const Hallway: React.FC<{ frame: number }> = ({ frame }) => {
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
      <Stranger />
    </group>
  );
};

export const PEEPHOLE_CAMERA = { eye: new THREE.Vector3(0, 1.52, -0.06), look: new THREE.Vector3(0.02, 1.5, -3), fov: 104 };
