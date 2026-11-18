import React from "react";
import * as THREE from "three";
import { Toon, boxGeo, usePainted } from "../../three/toon";
import type { HandPose } from "./Hands";

/** The phone. Local space: screen faces +Z, top of the phone is +Y. */

export type PhoneScreen =
  | { kind: "message"; texts: string[] }
  | { kind: "call"; pulse: number; connected?: boolean }
  | { kind: "off" };

const W = 540;
const H = 1110;
const FONT = "700 68px Fredoka, Arial, sans-serif";

const avatar = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  // Alex: a little stick figure in his mustard jacket
  g.fillStyle = "#3b4a6b";
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.clip();
  g.fillStyle = "#e0a526";
  g.beginPath();
  g.ellipse(x, y + r * 0.95, r * 0.78, r * 0.62, 0, 0, 7);
  g.fill();
  g.fillStyle = "#b9831a";
  g.fillRect(x - 4, y + r * 0.4, 8, r);
  g.fillStyle = "#fff1dc";
  g.strokeStyle = "#16110f";
  g.lineWidth = r * 0.07;
  g.beginPath();
  g.arc(x, y - r * 0.12, r * 0.42, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = "#16110f";
  g.beginPath();
  g.arc(x - r * 0.14, y - r * 0.16, r * 0.05, 0, 7);
  g.arc(x + r * 0.14, y - r * 0.16, r * 0.05, 0, 7);
  g.fill();
  g.beginPath();
  g.arc(x, y - r * 0.04, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.restore();
};

const paint = (screen: PhoneScreen) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#0e1220";
  g.fillRect(0, 0, W, H);
  if (screen.kind === "off") return;
  g.textAlign = "center";
  if (screen.kind === "call") {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1d2c52");
    bg.addColorStop(1, "#0e1220");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = `rgba(120,220,150,${0.55 * (1 - screen.pulse)})`;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(W / 2, 330, 150 + 70 * screen.pulse, 0, 7);
    g.stroke();
    avatar(g, W / 2, 330, 140);
    g.fillStyle = "#ffffff";
    g.font = "700 104px Fredoka, Arial, sans-serif";
    g.fillText("Alex", W / 2, 610);
    g.fillStyle = "#9fb0d6";
    g.font = "600 44px Fredoka, Arial, sans-serif";
    g.fillText(screen.connected ? "on speaker · 00:03" : "incoming call…", W / 2, 680);
    for (const [x, c] of (screen.connected ? [[270, "#e5484d"]] : [[150, "#e5484d"], [390, "#2fbf71"]]) as [number, string][]) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, 920, 74, 0, 7);
      g.fill();
      g.fillStyle = "#ffffff";
      g.fillRect(x - 34, 908, 68, 24);
    }
    return;
  }
  // message thread
  g.fillStyle = "#182039";
  g.fillRect(0, 0, W, 170);
  avatar(g, 86, 92, 50);
  g.textAlign = "left";
  g.fillStyle = "#ffffff";
  g.font = "700 72px Fredoka, Arial, sans-serif";
  g.fillText("Alex", 160, 116);
  g.font = FONT;
  let y = 215;
  screen.texts.forEach((text, n) => {
    const lines: string[] = [];
    let cur = "";
    for (const w of text.split(" ")) {
      const next = cur ? `${cur} ${w}` : w;
      if (g.measureText(next).width > 425 && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    lines.push(cur);
    const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 64;
    const bh = lines.length * 90 + 50;
    const newest = n === screen.texts.length - 1;
    g.fillStyle = newest ? "#ffffff" : "#c9d0e0";
    g.beginPath();
    g.roundRect(36, y, bw, bh, 44);
    g.fill();
    g.fillStyle = "#11131a";
    lines.forEach((l, i) => g.fillText(l, 68, y + 92 + i * 90));
    y += bh + 34;
  });
  g.fillStyle = "#7f8db0";
  g.font = "600 36px Fredoka, Arial, sans-serif";
  g.fillText("now", 52, y + 22);
};

export const Phone: React.FC<{ position: THREE.Vector3; rotation: THREE.Quaternion; screen: PhoneScreen }> = ({ position, rotation, screen }) => {
  const key =
    screen.kind === "message" ? screen.texts.join("|") : screen.kind === "call" ? `call${Math.round(screen.pulse * 12)}${screen.connected ? "c" : ""}` : "off";
  const tex = usePainted(W, H, paint(screen), [key]);
  return (
    <group position={position} quaternion={rotation}>
      <Toon geometry={boxGeo(0.074, 0.152, 0.009, 0.004)} color="#22252e" outline={0.004} />
      <mesh position={[0, 0, 0.0048]}>
        <planeGeometry args={[0.067, 0.138]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* the screen lights the hand and face a little */}
      {screen.kind !== "off" && <pointLight position={[0, 0.02, 0.22]} intensity={0.05} color="#bcd0ff" distance={0.9} decay={2} />}
    </group>
  );
};

/** The left hand's pose for holding the phone from below: fingers behind it, thumb on the front. */
export const phoneGrip = (position: THREE.Vector3, rotation: THREE.Quaternion): HandPose => {
  // hand axes expressed in phone space: X_h = -X_p, Y_h = -Z_p, Z_h = -Y_p (fingers point up the back)
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0));
  const local = new THREE.Quaternion().setFromRotationMatrix(basis);
  const wrist = new THREE.Vector3(0.004, -0.112, -0.0215).applyQuaternion(rotation).add(position);
  return {
    wrist,
    rotation: rotation.clone().multiply(local),
    fingers: [0.1, 0.06, 0.04],
    thumb: [0.55, 0.35],
    thumbYaw: 0.12,
    spread: 0.03,
  };
};
