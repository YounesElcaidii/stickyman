import React from "react";
import { rand } from "../../lib/anim";

/** Artwork for the cheese-allergy Short. All SVG in 1080x1920 space. */

export const INK = "#1f2430";
const FONT = "Fredoka, sans-serif";

export const Pill: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  bg?: string;
  fg?: string;
  scale?: number;
  opacity?: number;
}> = ({ x, y, text, size = 52, bg = "white", fg = INK, scale = 1, opacity = 1 }) => {
  const w = text.length * size * 0.62 + size * 1.3;
  const h = size * 1.7;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.32} fill={bg} stroke={INK} strokeWidth={7} />
      <text x={0} y={size * 0.35} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={size} fill={fg}>
        {text}
      </text>
    </g>
  );
};

/** A small piece of cheese. Origin is the centre of the piece. */
export const CheesePiece: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cx={14} cy={150} rx={190} ry={30} fill="#000" opacity={0.16} />
    {/* left, front and top faces */}
    <path d="M -140 -30 L -110 60 L -110 160 L -140 70 Z" fill="#dd9c2c" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M -110 60 L 150 10 L 150 110 L -110 160 Z" fill="#f4b73c" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M -140 -30 L 120 -80 L 150 10 L -110 60 Z" fill="#ffd966" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    {/* holes */}
    <ellipse cx={-30} cy={92} rx={26} ry={20} fill="#d18f22" transform="rotate(-10 -30 92)" />
    <ellipse cx={70} cy={66} rx={17} ry={13} fill="#d18f22" transform="rotate(-10 70 66)" />
    <ellipse cx={104} cy={104} rx={10} ry={8} fill="#d18f22" />
    <ellipse cx={-10} cy={-16} rx={30} ry={13} fill="#eebf45" transform="rotate(-11 -10 -16)" />
    <ellipse cx={74} cy={-40} rx={16} ry={7} fill="#eebf45" transform="rotate(-11 74 -40)" />
    {/* highlight */}
    <path d="M -118 -22 L 100 -64" stroke="white" strokeWidth={6} strokeLinecap="round" opacity={0.55} />
  </g>
);

export const CheeseScene: React.FC<{ zoom: number }> = ({ zoom }) => (
  <g>
    <defs>
      <radialGradient id="ch-bg" cx="0.5" cy="0.4" r="0.8">
        <stop offset="0" stopColor="#fdf6e6" />
        <stop offset="1" stopColor="#ead9b8" />
      </radialGradient>
      <linearGradient id="ch-table" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c9a57a" />
        <stop offset="1" stopColor="#a98258" />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#ch-bg)" />
    <g transform={`translate(540 800) scale(${zoom}) translate(-540 -800)`}>
      <rect x={-400} y={900} width={1880} height={1400} fill="url(#ch-table)" />
      <rect x={-400} y={900} width={1880} height={12} fill="#8d6a45" />
      {/* plate */}
      <ellipse cx={540} cy={930} rx={330} ry={70} fill="#f7f7f5" stroke={INK} strokeWidth={7} />
      <ellipse cx={540} cy={924} rx={230} ry={44} fill="#ecebe6" />
      <CheesePiece x={530} y={790} scale={0.9} />
      <circle cx={690} cy={930} r={9} fill="#f4b73c" stroke={INK} strokeWidth={4} />
      <circle cx={404} cy={940} r={6} fill="#f4b73c" stroke={INK} strokeWidth={4} />
    </g>
  </g>
);

/** A calm, empty school hallway: lockers, noticeboard, clock. No people. */
export const Hallway: React.FC<{ frame: number }> = ({ frame }) => {
  const lockers = Array.from({ length: 7 });
  const lw = 150;
  const top = 640;
  const bottom = 1210;
  return (
    <g>
      <defs>
        <linearGradient id="hw-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe7ee" />
          <stop offset="1" stopColor="#c9d5e0" />
        </linearGradient>
        <linearGradient id="hw-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9a98f" />
          <stop offset="1" stopColor="#8f8069" />
        </linearGradient>
      </defs>
      <rect width={1080} height={bottom} fill="url(#hw-wall)" />
      {/* ceiling lights */}
      {[200, 540, 880].map((x) => (
        <g key={x}>
          <rect x={x - 110} y={0} width={220} height={26} rx={8} fill="#fffbe6" stroke="#aab4bf" strokeWidth={4} />
          <path d={`M ${x - 110} 26 L ${x - 190} 420 L ${x + 190} 420 L ${x + 110} 26 Z`} fill="#fff" opacity={0.1} />
        </g>
      ))}
      {/* noticeboard and clock */}
      <rect x={90} y={478} width={330} height={128} rx={8} fill="#b98a55" stroke={INK} strokeWidth={6} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={110 + i * 76} y={494 + (i % 2) * 10} width={60} height={72} fill={["#fff", "#fdf3b5", "#d9ecff", "#fff"][i]} stroke="#7d6a52" strokeWidth={3} />
      ))}
      <circle cx={760} cy={545} r={54} fill="white" stroke={INK} strokeWidth={7} />
      <line x1={760} y1={545} x2={760} y2={511} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <line x1={760} y1={545} x2={786} y2={556} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      {/* lockers */}
      {lockers.map((_, i) => {
        const x = 15 + i * lw;
        const fill = i % 2 === 0 ? "#5f86b3" : "#6b93bf";
        return (
          <g key={i}>
            <rect x={x} y={top} width={lw} height={bottom - top} fill={fill} stroke={INK} strokeWidth={6} />
            {[0, 1, 2].map((v) => (
              <rect key={v} x={x + 36} y={top + 34 + v * 20} width={lw - 72} height={8} rx={4} fill="#2f4c6e" />
            ))}
            <rect x={x + lw - 34} y={top + 250} width={12} height={46} rx={5} fill="#dfe7ee" stroke={INK} strokeWidth={3} />
            <rect x={x + 44} y={top + 130} width={lw - 88} height={34} rx={4} fill="#eef3f8" opacity={0.85} />
          </g>
        );
      })}
      <rect x={0} y={top - 16} width={1080} height={16} fill="#4a6a90" stroke={INK} strokeWidth={5} />
      {/* floor */}
      <rect x={0} y={bottom} width={1080} height={1920 - bottom} fill="url(#hw-floor)" />
      <rect x={0} y={bottom} width={1080} height={12} fill="#6d6150" />
      {[-2, -1, 0, 1, 2, 3].map((i) => (
        <line key={i} x1={540 + i * 150 - 75} y1={bottom + 12} x2={540 + i * 620 - 310} y2={1920} stroke="#7f725d" strokeWidth={4} opacity={0.6} />
      ))}
      {/* soft light shimmer on the floor */}
      <ellipse cx={540} cy={1330} rx={300 + Math.sin(frame / 30) * 10} ry={40} fill="white" opacity={0.12} />
    </g>
  );
};

// --- Anaphylaxis graphic -------------------------------------------------------------------------

/** Milk protein meets the immune system, which over-reacts and releases chemicals. */
export const ImmuneGraphic: React.FC<{ frame: number; approach: number; react: number }> = ({ frame, approach, react }) => {
  const cell = { x: 590, y: 560 };
  const ax = 170 + approach * 200;
  const receptors = Array.from({ length: 8 });
  const dots = Array.from({ length: 22 });
  return (
    <g>
      {/* released chemicals */}
      {dots.map((_, i) => {
        const angle = rand(i + 3) * Math.PI * 2;
        const phase = ((frame / 46 + rand(i + 40)) % 1) * react;
        const r = 120 + phase * 190;
        return (
          <circle
            key={i}
            cx={cell.x + Math.cos(angle) * r}
            cy={cell.y + Math.sin(angle) * r * 0.78}
            r={9}
            fill="#ff6b5e"
            opacity={react * (1 - phase) * 0.95}
          />
        );
      })}
      {/* immune cell */}
      <g transform={`translate(${cell.x} ${cell.y}) scale(${1 + react * 0.06 * Math.sin(frame / 3)})`}>
        {receptors.map((_, i) => {
          const a = (i / receptors.length) * 360 + 12;
          return (
            <g key={i} transform={`rotate(${a}) translate(0 -112)`}>
              <path d="M 0 0 L 0 -26 M 0 -26 L -13 -44 M 0 -26 L 13 -44" stroke={react > 0.5 ? "#ff6b5e" : "#9ad1ff"} strokeWidth={8} strokeLinecap="round" fill="none" />
            </g>
          );
        })}
        <circle r={112} fill="#cfe9ff" stroke={INK} strokeWidth={8} />
        <circle cx={-14} cy={10} r={46} fill="#8fc4f2" stroke={INK} strokeWidth={6} />
        <circle cx={-44} cy={-50} r={16} fill="white" opacity={0.7} />
      </g>
      {/* milk protein */}
      <path d={`M ${ax + 62} ${cell.y} L ${cell.x - 190} ${cell.y}`} stroke="white" strokeWidth={8} strokeLinecap="round" strokeDasharray="4 22" opacity={0.8 * (1 - approach)} />
      <g transform={`translate(${ax} ${cell.y})`}>
        <circle r={46} fill="#ffd966" stroke={INK} strokeWidth={8} />
        <circle cx={-12} cy={-8} r={9} fill="#eebf45" />
        <circle cx={14} cy={12} r={7} fill="#eebf45" />
      </g>
      <text x={ax} y={cell.y + 104} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={36} fill="white">
        MILK
      </text>
      <text x={ax} y={cell.y + 144} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={36} fill="white">
        PROTEIN
      </text>
      <text x={cell.x} y={cell.y + 222} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={38} fill="white">
        {react > 0.5 ? "IMMUNE SYSTEM OVERREACTS" : "IMMUNE SYSTEM"}
      </text>
    </g>
  );
};

const LungsIcon: React.FC<{ breathe: number }> = ({ breathe }) => (
  <g transform={`scale(${1 + breathe * 0.05})`}>
    <path d="M 0 -62 L 0 -8 M 0 -8 L -22 14 M 0 -8 L 22 14" stroke={INK} strokeWidth={10} strokeLinecap="round" fill="none" />
    <path d="M -16 -6 C -66 -10 -78 40 -72 66 C -66 82 -30 74 -18 58 Z" fill="#ff9aa8" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M 16 -6 C 66 -10 78 40 72 66 C 66 82 30 74 18 58 Z" fill="#ff9aa8" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
  </g>
);

const PressureIcon: React.FC<{ drop: number }> = ({ drop }) => {
  const angle = 40 - drop * 100; // needle falls from high to low
  return (
    <g>
      <path d="M -70 30 A 70 70 0 0 1 70 30" fill="white" stroke={INK} strokeWidth={8} />
      <path d="M -70 30 A 70 70 0 0 1 -35 -30.6" fill="none" stroke="#ff6b5e" strokeWidth={14} />
      <path d="M 35 -30.6 A 70 70 0 0 1 70 30" fill="none" stroke="#3ddc84" strokeWidth={14} />
      <line x1={-70} y1={30} x2={70} y2={30} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <g transform={`translate(0 30) rotate(${angle})`}>
        <line x1={0} y1={0} x2={0} y2={-56} stroke={INK} strokeWidth={9} strokeLinecap="round" />
      </g>
      <circle cx={0} cy={30} r={11} fill={INK} />
      <path d="M 96 -34 L 96 26 M 76 6 L 96 30 L 116 6" stroke="#ff6b5e" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={drop} />
    </g>
  );
};

export const EffectCard: React.FC<{
  x: number;
  y: number;
  kind: "breathing" | "pressure";
  active: number; // 0 dim .. 1 highlighted
  frame: number;
}> = ({ x, y, kind, active, frame }) => {
  const w = 570;
  const h = 175;
  const lines = kind === "breathing" ? ["BREATHING"] : ["BLOOD", "PRESSURE"];
  return (
    <g transform={`translate(${x} ${y})`} opacity={0.3 + 0.7 * active}>
      <rect width={w} height={h} rx={34} fill="#1d2b4f" stroke={active > 0.5 ? "#ffd23f" : "#3b4d7a"} strokeWidth={active > 0.5 ? 9 : 6} />
      <g transform={`translate(112 ${h / 2 - (kind === "breathing" ? 2 : 8)})`}>
        {kind === "breathing" ? <LungsIcon breathe={active * Math.sin(frame / 9)} /> : <PressureIcon drop={active} />}
      </g>
      {lines.map((l, i) => (
        <text
          key={l}
          x={250}
          y={h / 2 + 18 + (i - (lines.length - 1) / 2) * 56}
          fontFamily={FONT}
          fontWeight={700}
          fontSize={52}
          fill="white"
        >
          {l}
        </text>
      ))}
    </g>
  );
};
