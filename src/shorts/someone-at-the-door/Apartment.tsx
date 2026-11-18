import React from "react";
import * as THREE from "three";
import { rand } from "../../lib/anim";
import { Toon, boxGeo, cylGeo, sphereGeo, usePainted } from "../../three/toon";

/**
 * One coherent apartment, in metres. You stand in the entry looking at the front door.
 *   - front wall with the DOOR at z = 0 (the building HALLWAY is behind it, at z < 0)
 *   - WINDOW on the left wall (x = -2.1), night outside
 *   - living area behind you (z > 2.5): sofa and lamp
 *   - console table with a lamp to the left of the door
 */

export const DOOR = {
  width: 0.92,
  height: 2.06,
  handle: new THREE.Vector3(0.3, 1.02, 0.07), // middle of the lever, where a hand grips
  peephole: new THREE.Vector3(0, 1.52, 0.026),
};
const WALL_H = 2.6;
const X0 = -2.1;
const X1 = 2.1;
const Z1 = 5.2;

const woodPaint = (base: string, line: string) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  g.strokeStyle = line;
  for (let i = 0; i < 26; i++) {
    g.globalAlpha = 0.18 + rand(i) * 0.25;
    g.lineWidth = 1 + rand(i + 9) * 2.5;
    g.beginPath();
    const x = rand(i + 20) * 256;
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 5 * (rand(i + 3) - 0.5), 170, x + 7 * (rand(i + 5) - 0.5), 340, x + 4 * (rand(i + 7) - 0.5), 512);
    g.stroke();
  }
  g.globalAlpha = 1;
};

export const Door: React.FC<{ handleTurn?: number }> = ({ handleTurn = 0 }) => {
  const wood = usePainted(256, 512, woodPaint("#3f8a86", "#245a58"));
  const { width: w, height: h } = DOOR;
  return (
    <group>
      {/* frame */}
      <Toon geometry={boxGeo(0.1, h + 0.1, 0.14, 0.012)} color="#f1e6d2" position={[-w / 2 - 0.05, (h + 0.1) / 2, 0]} />
      <Toon geometry={boxGeo(0.1, h + 0.1, 0.14, 0.012)} color="#f1e6d2" position={[w / 2 + 0.05, (h + 0.1) / 2, 0]} />
      <Toon geometry={boxGeo(w + 0.2, 0.1, 0.14, 0.012)} color="#f1e6d2" position={[0, h + 0.05, 0]} />
      {/* door leaf with two raised panels */}
      <Toon geometry={boxGeo(w, h, 0.05, 0.008)} color="#ffffff" map={wood} position={[0, h / 2, -0.01]} />
      <Toon geometry={boxGeo(w - 0.26, 0.78, 0.02, 0.008)} color="#eaf6f2" map={wood} position={[0, 1.46, 0.02]} outline={0.005} />
      <Toon geometry={boxGeo(w - 0.26, 0.62, 0.02, 0.008)} color="#eaf6f2" map={wood} position={[0, 0.5, 0.02]} outline={0.005} />
      {/* peephole */}
      <Toon geometry={cylGeo(0.022, 0.022, 0.012, 24)} color="#c9a24a" position={[DOOR.peephole.x, DOOR.peephole.y, 0.036]} rotation={[Math.PI / 2, 0, 0]} outline={0.004} />
      <Toon geometry={cylGeo(0.011, 0.011, 0.014, 20)} color="#1b1a22" position={[DOOR.peephole.x, DOOR.peephole.y, 0.038]} rotation={[Math.PI / 2, 0, 0]} outline={0} />
      {/* deadbolt */}
      <Toon geometry={cylGeo(0.035, 0.035, 0.014, 24)} color="#c9a24a" position={[0.34, 1.22, 0.022]} rotation={[Math.PI / 2, 0, 0]} outline={0.004} />
      <Toon geometry={boxGeo(0.014, 0.05, 0.02, 0.004)} color="#a8842f" position={[0.34, 1.22, 0.04]} outline={0.003} />
      {/* lever handle: rose on the door, neck out to the lever, lever toward the middle of the door */}
      <Toon geometry={cylGeo(0.034, 0.034, 0.012, 24)} color="#c9a24a" position={[0.37, 1.02, 0.022]} rotation={[Math.PI / 2, 0, 0]} outline={0.004} />
      <group position={[0.37, 1.02, 0.02]} rotation={[0, 0, handleTurn]}>
        <Toon geometry={cylGeo(0.011, 0.011, 0.055, 16)} color="#c9a24a" position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} outline={0.004} />
        <Toon geometry={boxGeo(0.15, 0.022, 0.02, 0.008)} color="#d9b35a" position={[-0.062, 0, 0.05]} outline={0.004} />
      </group>
    </group>
  );
};

export const Apartment: React.FC<{ frame: number; lampFlicker?: number }> = ({ frame, lampFlicker = 0 }) => {
  const wall = usePainted(256, 256, (g) => {
    g.fillStyle = "#d9b98c";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#cfad7f";
    for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 5, 256);
  });
  wall.wrapS = wall.wrapT = THREE.RepeatWrapping;
  wall.repeat.set(5, 3);
  const floor = usePainted(512, 512, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ["#8c5a36", "#7f5130", "#96633c", "#855633"][i % 4];
      g.fillRect(i * 64, 0, 64, 512);
      g.fillStyle = "#5a361d";
      g.fillRect(i * 64, 0, 3, 512);
      g.fillRect(i * 64, ((i * 197) % 400) + 40, 64, 3);
    }
  });
  floor.wrapS = floor.wrapT = THREE.RepeatWrapping;
  floor.repeat.set(3, 4);
  const rug = usePainted(256, 256, (g) => {
    g.fillStyle = "#7b2f3a";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#e8c98a";
    g.lineWidth = 10;
    g.strokeRect(18, 18, 220, 220);
    g.lineWidth = 4;
    g.strokeRect(40, 40, 176, 176);
  });
  const night = usePainted(256, 256, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#101a3a");
    sky.addColorStop(1, "#2a3f6e");
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#f6f1d0";
    g.beginPath();
    g.arc(180, 62, 22, 0, 7);
    g.fill();
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(255,220,150,${0.5 + rand(i) * 0.5})`;
      g.fillRect(20 + ((i * 37) % 220), 150 + ((i * 53) % 90), 8, 10);
    }
  });
  const flick = 1 - lampFlicker * (0.35 + 0.35 * Math.sin(frame * 2.1) * Math.sin(frame * 0.7));
  const wallX = X1 - X0;
  const side = DOOR.width / 2 + 0.1;

  return (
    <group>
      {/* lighting: a warm lamp by the door, a ceiling light behind you, cool night from the window */}
      <ambientLight intensity={0.5} color="#ffd9b0" />
      <pointLight position={[-1.25, 1.35, 0.5]} intensity={2.6 * flick} color="#ffb05a" distance={7} decay={1.6} />
      <directionalLight
        position={[-1.4, 2.5, 2.6]}
        intensity={1.9}
        color="#ffe2b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2.2}
        shadow-camera-right={2.2}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-1.6}
        shadow-camera-near={0.2}
        shadow-camera-far={9}
        shadow-bias={-0.0006}
        shadow-normalBias={0.01}
      />
      <pointLight position={[X0 + 0.5, 1.6, 2.0]} intensity={0.9} color="#7d9cff" distance={5} decay={1.5} />

      {/* floor, rug, ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, Z1 / 2]} receiveShadow>
        <planeGeometry args={[wallX, Z1 + 0.2]} />
        <meshToonMaterial map={floor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0.004, 0.95]} receiveShadow>
        <planeGeometry args={[1.3, 1.5]} />
        <meshToonMaterial map={rug} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, Z1 / 2]}>
        <planeGeometry args={[wallX, Z1 + 0.2]} />
        <meshToonMaterial color="#e9d8bd" />
      </mesh>

      {/* front wall around the door */}
      {[
        { x: (X0 - side) / 2, w: -side - X0 },
        { x: (X1 + side) / 2, w: X1 - side },
      ].map((p, i) => (
        <mesh key={i} position={[p.x, WALL_H / 2, -0.04]} receiveShadow>
          <boxGeometry args={[p.w, WALL_H, 0.08]} />
          <meshToonMaterial map={wall} />
        </mesh>
      ))}
      <mesh position={[0, (WALL_H + DOOR.height + 0.1) / 2, -0.04]} receiveShadow>
        <boxGeometry args={[side * 2, WALL_H - DOOR.height - 0.1, 0.08]} />
        <meshToonMaterial color="#d9b98c" />
      </mesh>
      <Toon geometry={boxGeo(wallX, 0.12, 0.03, 0.006)} color="#f1e6d2" position={[0, 0.06, 0.012]} outline={0.004} />

      {/* side walls and back wall */}
      <mesh position={[X0, WALL_H / 2, Z1 / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[Z1 + 0.2, WALL_H]} />
        <meshToonMaterial map={wall} />
      </mesh>
      <mesh position={[X1, WALL_H / 2, Z1 / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[Z1 + 0.2, WALL_H]} />
        <meshToonMaterial map={wall} />
      </mesh>
      <mesh position={[0, WALL_H / 2, Z1]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[wallX, WALL_H]} />
        <meshToonMaterial map={wall} />
      </mesh>

      <Door />

      {/* window on the left wall, with curtains */}
      <group position={[X0 + 0.02, 1.5, 1.9]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.1, 1.2]} />
          <meshBasicMaterial map={night} />
        </mesh>
        <Toon geometry={boxGeo(1.24, 0.07, 0.08, 0.01)} color="#f1e6d2" position={[0, 0.63, 0.02]} />
        <Toon geometry={boxGeo(1.24, 0.07, 0.1, 0.01)} color="#f1e6d2" position={[0, -0.63, 0.03]} />
        <Toon geometry={boxGeo(0.04, 1.2, 0.05, 0.008)} color="#f1e6d2" position={[0, 0, 0.02]} />
        <Toon geometry={boxGeo(0.3, 1.5, 0.06, 0.02)} color="#b5533c" position={[-0.72, -0.08, 0.06]} />
        <Toon geometry={boxGeo(0.3, 1.5, 0.06, 0.02)} color="#b5533c" position={[0.72, -0.08, 0.06]} />
      </group>

      {/* console table and lamp, left of the door */}
      <group position={[-1.3, 0, 0.3]}>
        <Toon geometry={boxGeo(0.9, 0.05, 0.36, 0.012)} color="#6b3f24" position={[0, 0.8, 0]} />
        {[-0.4, 0.4].map((x) => (
          <Toon key={x} geometry={boxGeo(0.05, 0.8, 0.05, 0.01)} color="#5a341d" position={[x, 0.4, 0.12]} />
        ))}
        <Toon geometry={cylGeo(0.07, 0.09, 0.05, 20)} color="#3d4a66" position={[0.05, 0.85, 0]} />
        <Toon geometry={cylGeo(0.014, 0.014, 0.3, 12)} color="#3d4a66" position={[0.05, 1.02, 0]} />
        <Toon geometry={cylGeo(0.1, 0.17, 0.24, 24)} color="#ffe0a3" position={[0.05, 1.28, 0]} emissive="#ffb347" emissiveIntensity={0.9 * flick} />
        <Toon geometry={boxGeo(0.16, 0.02, 0.12, 0.006)} color="#2f7a78" position={[-0.25, 0.84, 0.02]} rotation={[0, 0.3, 0]} />
        <Toon geometry={cylGeo(0.035, 0.03, 0.02, 16)} color="#c9a24a" position={[-0.28, 0.835, -0.08]} />
      </group>

      {/* coat hooks and a framed picture, right of the door */}
      <Toon geometry={boxGeo(0.6, 0.07, 0.03, 0.01)} color="#6b3f24" position={[1.35, 1.72, 0.02]} />
      {[1.15, 1.35, 1.55].map((x) => (
        <Toon key={x} geometry={cylGeo(0.012, 0.012, 0.07, 10)} color="#c9a24a" position={[x, 1.7, 0.06]} rotation={[Math.PI / 2, 0, 0]} outline={0.004} />
      ))}
      <Toon geometry={boxGeo(0.34, 0.44, 0.03, 0.008)} color="#f1e6d2" position={[-1.3, 1.85, 0.02]} />
      <Toon geometry={boxGeo(0.26, 0.36, 0.03, 0.004)} color="#5d86a8" position={[-1.3, 1.85, 0.026]} outline={0} />
      {/* shoes by the door */}
      <Toon geometry={sphereGeo(0.07)} color="#2f3a52" position={[0.95, 0.05, 0.3]} scale={[1, 0.6, 1.9]} />
      <Toon geometry={sphereGeo(0.07)} color="#2f3a52" position={[1.13, 0.05, 0.33]} scale={[1, 0.6, 1.9]} />

      {/* living area behind you */}
      <group position={[0.3, 0, 4.4]}>
        <Toon geometry={boxGeo(1.9, 0.42, 0.85, 0.08)} color="#4f6f8f" position={[0, 0.28, 0]} />
        <Toon geometry={boxGeo(1.9, 0.6, 0.24, 0.08)} color="#46627f" position={[0, 0.66, 0.34]} />
        <Toon geometry={boxGeo(0.22, 0.56, 0.85, 0.07)} color="#46627f" position={[-0.92, 0.42, 0]} />
        <Toon geometry={boxGeo(0.22, 0.56, 0.85, 0.07)} color="#46627f" position={[0.92, 0.42, 0]} />
        <Toon geometry={boxGeo(0.42, 0.4, 0.14, 0.06)} color="#e6b34f" position={[-0.5, 0.66, 0.1]} rotation={[0.2, 0.2, 0.1]} />
      </group>
    </group>
  );
};
