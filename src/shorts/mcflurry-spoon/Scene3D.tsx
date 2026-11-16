import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { rand } from "../../lib/anim";
import { cameraAt, mixProgress, shaftTip, shotAt, spinAngle, spinSpeed, spoonPose, SPIN_MAX, type Marks } from "./rig";

/** Original 3D assets for the McFlurry-spoon Short: spoon, mixer shaft, cup of soft serve, counter. */

// --- dimensions (cm-ish) -----------------------------------------------------------------------
const OUTER = 1.7; // handle outer width
const INNER = 1.3; // square socket width
const SHAFT = 1.14; // square mixer shaft width (fits the socket)
const HANDLE_LEN = 12;
const CUP_H = 9;
const CUP_TOP_R = 4.2;
const CUP_BOT_R = 3.0;
const SERVE_R = 3.85;

const squareRing = (outer: number, inner: number) => {
  const s = new THREE.Shape();
  const o = outer / 2;
  s.moveTo(-o, -o);
  s.lineTo(o, -o);
  s.lineTo(o, o);
  s.lineTo(-o, o);
  s.closePath();
  const h = new THREE.Path();
  const i = inner / 2;
  h.moveTo(-i, -i);
  h.lineTo(-i, i);
  h.lineTo(i, i);
  h.lineTo(i, -i);
  h.closePath();
  s.holes.push(h);
  return s;
};

/** Square tube running from y = 0 down to y = -length. */
const tubeGeometry = (outer: number, inner: number, length: number) => {
  const g = new THREE.ExtrudeGeometry(squareRing(outer, inner), { depth: length, bevelEnabled: false });
  g.rotateX(Math.PI / 2); // extrusion axis -> -Y
  return g;
};

const Environment: React.FC<{ debug: boolean }> = ({ debug }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    if (debug) return;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, debug]);
  return null;
};

const CameraRig: React.FC<{ frame: number; marks: Marks }> = ({ frame, marks }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const c = cameraAt(frame, marks);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.fov = c.fov;
    cam.near = 0.5;
    cam.far = 400;
    cam.lookAt(...c.look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, [camera, frame, marks]);
  return null;
};

/** Softly blurred kitchen backdrop, painted once into a canvas (no image files). */
const useBackdrop = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d")!;
    const sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, "#7d98a3");
    sky.addColorStop(0.42, "#56727e");
    sky.addColorStop(0.56, "#3d5661");
    sky.addColorStop(1, "#33464f");
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 30; i++) {
      const x = rand(i + 1) * 1024;
      const y = 60 + rand(i + 60) * 230;
      const r = 26 + rand(i + 120) * 60;
      const blob = g.createRadialGradient(x, y, 0, x, y, r);
      const tint = ["255,226,170", "255,190,120", "190,232,240", "255,246,224"][i % 4];
      blob.addColorStop(0, `rgba(${tint},0.24)`);
      blob.addColorStop(1, `rgba(${tint},0)`);
      g.fillStyle = blob;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, []);

// --- spoon ---------------------------------------------------------------------------------------

const Spoon: React.FC<{ debug: boolean }> = ({ debug }) => {
  const handle = useMemo(() => tubeGeometry(OUTER, INNER, HANDLE_LEN), []);
  const lip = useMemo(() => tubeGeometry(OUTER + 0.42, INNER, 0.5), []);
  const bowl = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    g.rotateX(-Math.PI / 2); // open side faces +Z
    g.scale(1.45, 2.3, 0.62);
    return g;
  }, []);
  const neck = useMemo(() => {
    const g = new THREE.CylinderGeometry(OUTER / Math.SQRT2, 0.62, 1.9, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(1, 1, 0.8);
    return g;
  }, []);
  if (debug) {
    const flat = <meshBasicMaterial color="#00ff00" side={THREE.DoubleSide} toneMapped={false} />;
    return (
      <group>
        <mesh geometry={handle}>{flat}</mesh>
        <mesh geometry={lip}>{flat}</mesh>
      </group>
    );
  }
  const plastic = (
    <meshPhysicalMaterial
      color="#eaf2fb"
      roughness={0.18}
      clearcoat={0.7}
      clearcoatRoughness={0.25}
      transparent
      opacity={0.6}
      side={THREE.DoubleSide}
    />
  );
  return (
    <group>
      {/* dark interior so the square socket reads as a hole even on a small screen */}
      <mesh position={[0, -3.6, 0]}>
        <boxGeometry args={[INNER - 0.02, 7.2, INNER - 0.02]} />
        <meshStandardMaterial color="#55657a" roughness={0.6} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={handle} castShadow>
        {plastic}
      </mesh>
      <mesh geometry={lip} castShadow>
        {plastic}
      </mesh>
      {/* bright rim around the opening protects the square silhouette */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[squareRing(OUTER + 0.42, INNER)]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      {/* clip tab on the side of the handle */}
      <mesh position={[-(OUTER / 2 + 0.2), -1.6, 0]} castShadow>
        <boxGeometry args={[0.4, 1.3, 0.9]} />
        {plastic}
      </mesh>
      <mesh geometry={neck} position={[0, -HANDLE_LEN - 0.95, 0]} castShadow>
        {plastic}
      </mesh>
      <mesh geometry={bowl} position={[0, -HANDLE_LEN - 3.6, -0.2]} castShadow>
        {plastic}
      </mesh>
    </group>
  );
};

// --- mixer ---------------------------------------------------------------------------------------

const Mixer: React.FC<{ debug: boolean }> = ({ debug }) => {
  const tip = useMemo(() => {
    const g = new THREE.CylinderGeometry(SHAFT / Math.SQRT2, (SHAFT - 0.34) / Math.SQRT2, 0.5, 4, 1);
    g.rotateY(Math.PI / 4);
    return g;
  }, []);
  if (debug) {
    return (
      <mesh position={[0, 4.5, 0]} renderOrder={10}>
        <boxGeometry args={[SHAFT, 9, SHAFT]} />
        <meshBasicMaterial color="#ff00ff" depthTest={false} toneMapped={false} />
      </mesh>
    );
  }
  const steel = <meshStandardMaterial color="#eef1f5" metalness={0.9} roughness={0.32} envMapIntensity={2.6} />;
  return (
    <group>
      <mesh geometry={tip} position={[0, 0.25, 0]} castShadow>
        {steel}
      </mesh>
      <mesh position={[0, 4.75, 0]} castShadow>
        <boxGeometry args={[SHAFT, 8.5, SHAFT]} />
        {steel}
      </mesh>
      <mesh position={[0, 9.4, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.25, 1.2, 40]} />
        {steel}
      </mesh>
      <mesh position={[0, 10.9, 0]} castShadow>
        <cylinderGeometry args={[2.3, 2.3, 1.8, 48]} />
        <meshStandardMaterial color="#2b3038" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 15.8, -1]} castShadow>
        <boxGeometry args={[9, 8, 8]} />
        <meshStandardMaterial color="#e9edf1" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
};

// --- cup of soft serve ---------------------------------------------------------------------------

/** Height of the soft-serve surface at polar position (r, theta). */
const serveHeight = (r: number, theta: number, angle: number, m: number, spinning: number) => {
  const k = r / SERVE_R;
  const dome = 8.0 + (1.25 - 0.5 * m) * (1 - k * k);
  const wound = theta - angle * 0.55 * (1 - 0.6 * k); // the middle turns further than the rim
  const ridges = (0.3 - 0.14 * m) * Math.sin(3 * wound + 2.4 * r) * Math.sin(Math.PI * Math.min(1, k * 1.15));
  const vortex = -0.75 * spinning * Math.exp(-((r / 1.7) ** 2));
  return dome + ridges + vortex;
};

const RINGS = 34;
const SEGS = 96;

const SoftServe: React.FC<{ angle: number; m: number; spinning: number }> = ({ angle, m, spinning }) => {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array((RINGS + 1) * (SEGS + 1) * 3);
    const idx: number[] = [];
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SEGS; j++) {
        const a = i * (SEGS + 1) + j;
        const b = a + SEGS + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }, []);
  useLayoutEffect(() => {
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i <= RINGS; i++) {
      const r = (i / RINGS) * SERVE_R;
      for (let j = 0; j <= SEGS; j++) {
        const t = (j / SEGS) * Math.PI * 2;
        pos.setXYZ(i * (SEGS + 1) + j, r * Math.cos(t), serveHeight(r, t, angle, m, spinning), -r * Math.sin(t));
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }, [geometry, angle, m, spinning]);
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color="#fffaf0" roughness={0.5} />
    </mesh>
  );
};

const PIECES = 44;
const FLECKS = 150;

const Toppings: React.FC<{ angle: number; m: number; spinning: number }> = ({ angle, m, spinning }) => {
  const chunk = useMemo(() => new THREE.DodecahedronGeometry(0.34, 0), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1b14", roughness: 0.85 }), []);
  const brown = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3d281c", roughness: 0.85 }), []);
  const eased = m * m * (3 - 2 * m);
  const place = (r: number, theta0: number, lift: number) => {
    const k = r / SERVE_R;
    const theta = theta0 + angle * 0.55 * (1 - 0.6 * k);
    return [r * Math.cos(theta), serveHeight(r, theta, angle, m, spinning) + lift, -r * Math.sin(theta)] as const;
  };
  return (
    <group>
      {Array.from({ length: PIECES }).map((_, i) => {
        const r0 = 1.25 + rand(i + 1) * 1.3;
        const r1 = 1.2 + Math.sqrt(rand(i + 31)) * 2.45;
        const r = r0 + (r1 - r0) * eased;
        const [x, y, z] = place(r, rand(i + 71) * Math.PI * 2, 0.16 - 0.14 * eased);
        const s = 0.7 + rand(i + 101) * 0.9;
        return (
          <mesh
            key={i}
            geometry={chunk}
            material={i % 3 === 0 ? brown : dark}
            position={[x, y, z]}
            rotation={[rand(i + 5) * 6 + angle * 0.3, rand(i + 9) * 6, rand(i + 13) * 6 + angle * 0.2]}
            scale={[s, s * 0.7, s * 0.9]}
            castShadow
          />
        );
      })}
      {/* fine crumbs appear as the toppings get stirred through */}
      {Array.from({ length: FLECKS }).map((_, i) => {
        const shown = Math.max(0, Math.min(1, (m - rand(i + 300) * 0.8) / 0.2));
        if (shown <= 0) return null;
        const r = 1.15 + Math.sqrt(rand(i + 400)) * 2.6;
        const [x, y, z] = place(r, rand(i + 500) * Math.PI * 2, 0.02);
        const s = (0.16 + rand(i + 600) * 0.2) * shown;
        return <mesh key={`f${i}`} geometry={chunk} material={dark} position={[x, y, z]} scale={[s, s * 0.5, s]} />;
      })}
    </group>
  );
};

const Cup: React.FC = () => {
  const wall = useMemo(() => {
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(CUP_BOT_R, 0),
      new THREE.Vector2(CUP_TOP_R, CUP_H),
      new THREE.Vector2(CUP_TOP_R + 0.16, CUP_H + 0.1),
      new THREE.Vector2(CUP_TOP_R - 0.12, CUP_H),
      new THREE.Vector2(CUP_BOT_R - 0.1, 0.25),
      new THREE.Vector2(0, 0.25),
    ];
    return new THREE.LatheGeometry(pts, 72);
  }, []);
  const band = useMemo(() => {
    const y0 = 3.0;
    const y1 = 5.6;
    const rAt = (y: number) => CUP_BOT_R + ((CUP_TOP_R - CUP_BOT_R) * y) / CUP_H + 0.02;
    return new THREE.LatheGeometry([new THREE.Vector2(rAt(y0), y0), new THREE.Vector2(rAt(y1), y1)], 72);
  }, []);
  return (
    <group>
      <mesh geometry={wall} castShadow receiveShadow>
        <meshStandardMaterial color="#fbfbf8" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={band}>
        <meshStandardMaterial color="#2aa6a1" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// --- the whole scene -----------------------------------------------------------------------------

export const Scene3D: React.FC<{ frame: number; marks: Marks; debug?: boolean }> = ({ frame, marks, debug = false }) => {
  const backdrop = useBackdrop();
  const shot = shotAt(frame, marks);
  const angle = spinAngle(frame, marks);
  const m = mixProgress(frame, marks);
  const spinning = spinSpeed(frame, marks) / SPIN_MAX;
  const pose = spoonPose(frame, marks);
  const tip = shaftTip(frame, marks);
  const cam = cameraAt(frame, marks);
  const cupPos: [number, number, number] = [0, 0, 0];
  const showCup = shot !== "hole" && !debug;
  const showMixer = shot === "connect" || shot === "mix";

  return (
    <>
      <CameraRig frame={frame} marks={marks} />
      <Environment debug={debug} />
      {debug ? (
        <color attach="background" args={["#000000"]} />
      ) : (
        <>
          <fog attach="fog" args={["#4a636e", 60, 170]} />
          <mesh>
            <sphereGeometry args={[180, 48, 24]} />
            <meshBasicMaterial map={backdrop} side={THREE.BackSide} fog={false} />
          </mesh>
          <hemisphereLight args={["#eaf3f7", "#8a6a4a", 0.28]} />
          <directionalLight
            position={[12, 26, 12]}
            intensity={2.7}
            color="#fff1dc"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={30}
            shadow-camera-bottom={-12}
            shadow-camera-near={1}
            shadow-camera-far={80}
            shadow-bias={-0.0004}
            shadow-radius={6}
          />
          <directionalLight position={[-14, 12, -10]} intensity={0.9} color="#cfe6ff" />
          {/* a little light from the camera so the inside of the socket shows its depth */}
          <pointLight position={cam.pos} intensity={shot === "hole" ? 38 : 0} distance={40} decay={2} />
          {/* counter */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[600, 600]} />
            <meshStandardMaterial color="#b4875c" roughness={0.5} metalness={0.02} />
          </mesh>
        </>
      )}

      {showCup && (
        <group position={cupPos}>
          <Cup />
          <SoftServe angle={angle} m={m} spinning={shot === "mix" ? spinning : 0} />
          <Toppings angle={angle} m={m} spinning={shot === "mix" ? spinning : 0} />
        </group>
      )}

      <group position={pose.pos} rotation={pose.rot}>
        <Spoon debug={debug} />
      </group>

      {showMixer && (
        <group position={[tip.x, tip.y, 0]} rotation={[0, angle, 0]}>
          <Mixer debug={debug} />
        </group>
      )}
    </>
  );
};
