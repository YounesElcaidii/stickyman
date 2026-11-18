import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Cel-shading kit: banded lighting (MeshToonMaterial with a stepped ramp) plus dark cartoon
 * outlines drawn as an "inverted hull" (a back-face copy of the mesh pushed out along its normals).
 */

let ramp: THREE.DataTexture | null = null;
export const toonRamp = () => {
  if (!ramp) {
    const steps = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
    ramp = new THREE.DataTexture(steps, 4, 1, THREE.RGBAFormat);
    ramp.minFilter = THREE.NearestFilter;
    ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
};

const outlineCache = new Map<string, THREE.Material>();
export const outlineMaterial = (thickness: number, color = "#16110f") => {
  const key = `${thickness}:${color}`;
  let m = outlineCache.get(key);
  if (!m) {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n  transformed += normalize(normal) * ${thickness.toFixed(5)};`,
      );
    };
    mat.customProgramCacheKey = () => key;
    m = mat;
    outlineCache.set(key, m);
  }
  return m;
};

type ToonProps = {
  geometry: THREE.BufferGeometry;
  color?: string;
  map?: THREE.Texture | null;
  outline?: number; // outline thickness in metres, 0 = none
  position?: [number, number, number];
  quaternion?: THREE.Quaternion;
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
};

/** One cel-shaded mesh with its outline. */
export const Toon: React.FC<ToonProps> = ({
  geometry,
  color = "#ffffff",
  map = null,
  outline = 0.008,
  position,
  quaternion,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
  emissive = "#000000",
  emissiveIntensity = 0,
}) => (
  <group position={position} quaternion={quaternion} rotation={rotation} scale={scale}>
    <mesh geometry={geometry} castShadow={castShadow} receiveShadow={receiveShadow}>
      <meshToonMaterial color={color} map={map} gradientMap={toonRamp()} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
    {outline > 0 && <mesh geometry={geometry} material={outlineMaterial(outline)} />}
  </group>
);

const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g as T;
};

/** Box with slightly rounded edges (smooth normals, so the outline hull stays closed). */
export const boxGeo = (w: number, h: number, d: number, r = Math.min(w, h, d) * 0.18) =>
  cached(`b:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
export const cylGeo = (rTop: number, rBottom: number, h: number, seg = 20) =>
  cached(`c:${rTop}:${rBottom}:${h}:${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg));
export const capsuleGeo = (r: number, len: number) => cached(`k:${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14));
export const sphereGeo = (r: number) => cached(`s:${r}`, () => new THREE.SphereGeometry(r, 24, 16));

const UP = new THREE.Vector3(0, 1, 0);
/** Position + rotation that lays a Y-axis shape (cylinder, capsule) from point a to point b. */
export const between = (a: THREE.Vector3, b: THREE.Vector3) => {
  const dir = b.clone().sub(a);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return { position: [mid.x, mid.y, mid.z] as [number, number, number], quaternion, length };
};

/** Canvas-painted texture (no image files). */
export const usePainted = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, deps: unknown[] = []) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    paint(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
