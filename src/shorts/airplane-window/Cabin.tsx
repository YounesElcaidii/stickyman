import React from "react";
import { rand } from "../../lib/anim";

/** Airplane cabin artwork: sky, windows, overhead bins, seats. All SVG in 1080x1920 space. */

export const Clouds: React.FC<{ frame: number; x: number; y: number; w: number; h: number; speed?: number; seed?: number }> = ({
  frame,
  x,
  y,
  w,
  h,
  speed = 3,
  seed = 1,
}) => (
  <g>
    {Array.from({ length: 6 }).map((_, i) => {
      const r = rand(seed * 10 + i);
      const cw = (0.35 + r * 0.4) * w;
      const span = w + cw * 2;
      const cx = x - cw + ((rand(seed + i * 3) * span + frame * speed * (0.6 + r)) % span);
      const cy = y + (0.15 + rand(i + seed * 7) * 0.75) * h;
      return (
        <g key={i} opacity={0.9}>
          <ellipse cx={cx} cy={cy} rx={cw * 0.5} ry={cw * 0.16} fill="white" />
          <ellipse cx={cx - cw * 0.15} cy={cy - cw * 0.1} rx={cw * 0.22} ry={cw * 0.16} fill="white" />
          <ellipse cx={cx + cw * 0.12} cy={cy - cw * 0.13} rx={cw * 0.26} ry={cw * 0.2} fill="white" />
        </g>
      );
    })}
  </g>
);

const windowPath = (x: number, y: number, w: number, h: number) => {
  const r = w * 0.46;
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
};

export const CabinWindow: React.FC<{
  id: string;
  frame: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  shade?: number; // 0 = fully open, 1 = closed
  hole?: boolean;
  fog?: number; // 0..1
  wing?: boolean;
}> = ({ id, frame, cx, cy, w, h, shade = 0.12, hole = true, fog = 0, wing = false }) => {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const bezel = w * 0.16;
  const glass = windowPath(x, y, w, h);
  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={glass} />
        </clipPath>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d8bfd" />
          <stop offset="0.7" stopColor="#8fc6ff" />
          <stop offset="1" stopColor="#d9eeff" />
        </linearGradient>
      </defs>
      {/* plastic bezel */}
      <path d={windowPath(x - bezel, y - bezel, w + bezel * 2, h + bezel * 2)} fill="#f4f1ea" stroke="#c9c3b6" strokeWidth={w * 0.02} />
      <path d={windowPath(x - bezel * 0.45, y - bezel * 0.45, w + bezel * 0.9, h + bezel * 0.9)} fill="#dcd6ca" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-sky)`} />
        <Clouds frame={frame} x={x} y={y + h * 0.35} w={w} h={h * 0.6} speed={w / 160} seed={3} />
        {wing && (
          <path
            d={`M ${x - w * 0.1} ${y + h * 0.98} L ${x + w * 0.75} ${y + h * 0.78} L ${x + w * 0.82} ${y + h * 0.82} L ${x + w * 0.1} ${y + h * 1.1} Z`}
            fill="#e8edf3"
            stroke="#9aa6b5"
            strokeWidth={w * 0.012}
          />
        )}
        {/* glass reflection */}
        <path d={`M ${x + w * 0.15} ${y + h * 0.15} L ${x + w * 0.35} ${y + h * 0.1} L ${x + w * 0.12} ${y + h * 0.55} Z`} fill="white" opacity={0.18} />
        {fog > 0 && (
          <g opacity={fog}>
            <rect x={x} y={y} width={w} height={h} fill="#eef3f7" opacity={0.85} />
            {Array.from({ length: 40 }).map((_, i) => (
              <circle
                key={i}
                cx={x + rand(i + 1) * w}
                cy={y + rand(i + 50) * h}
                r={(2 + rand(i + 99) * 5) * (w / 300)}
                fill="white"
                stroke="#c7d3dd"
                strokeWidth={1}
              />
            ))}
          </g>
        )}
        {/* window shade */}
        <rect x={x} y={y - 4} width={w} height={h * shade + 4} fill="#f7f5f0" stroke="#d0cabd" strokeWidth={w * 0.01} />
        <rect x={x + w * 0.38} y={y + h * shade - h * 0.035} width={w * 0.24} height={h * 0.025} rx={4} fill="#bdb6a8" />
      </g>
      {hole && (
        <g>
          <circle cx={cx} cy={y + h * 0.84} r={Math.max(3, w * 0.018)} fill="#2b3340" />
          <circle cx={cx - w * 0.004} cy={y + h * 0.84 - w * 0.004} r={Math.max(1, w * 0.006)} fill="#7b8697" />
        </g>
      )}
    </g>
  );
};

/** Overhead bins + passenger service unit along the top of the frame. */
const Overhead: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    <rect x={0} y={0} width={1080} height={120} fill="#f2efe8" />
    <path d="M0 120 H1080 V360 Q1080 430 1000 440 H0 Z" fill="#e7e2d6" />
    <path d="M0 140 H1060 V350 Q1060 410 990 418 H0 Z" fill="#f6f3ec" stroke="#d6cfc0" strokeWidth={4} />
    {[60, 420, 780].map((x) => (
      <g key={x}>
        <rect x={x} y={160} width={330} height={230} rx={22} fill="none" stroke="#ddd5c5" strokeWidth={4} />
        <rect x={x + 125} y={355} width={80} height={20} rx={10} fill="#b8b0a1" />
      </g>
    ))}
    {/* passenger service unit */}
    <rect x={0} y={440} width={1080} height={70} fill="#d9d3c6" />
    <rect x={0} y={505} width={1080} height={8} fill="#c4bdae" />
    {[180, 260, 640, 720].map((x, i) => (
      <g key={x}>
        <circle cx={x} cy={475} r={18} fill="#efe9dc" stroke="#a9a192" strokeWidth={4} />
        {i === 2 && <circle cx={x} cy={475} r={10} fill="#fff6c9" />}
      </g>
    ))}
    {/* seatbelt sign */}
    <rect x={420} y={455} width={120} height={42} rx={10} fill="#2d3340" />
    <circle cx={454} cy={476} r={10} fill={frame % 60 < 50 ? "#ffd23f" : "#8a7a3a"} />
    <rect x={472} y={466} width={50} height={20} rx={6} fill="none" stroke="#ffd23f" strokeWidth={4} />
    {/* air vents */}
    <circle cx={860} cy={475} r={14} fill="#bfb8aa" />
    <circle cx={900} cy={475} r={14} fill="#bfb8aa" />
  </g>
);

export const SeatBack: React.FC<{ x: number; y: number; h?: number; color?: string; tray?: boolean }> = ({
  x,
  y,
  h = 620,
  color = "#2f5597",
  tray = false,
}) => (
  <g>
    <path d={`M ${x} ${y + h} L ${x + 14} ${y + 60} Q ${x + 20} ${y} ${x + 80} ${y} Q ${x + 130} ${y} ${x + 128} ${y + 70} L ${x + 120} ${y + h} Z`} fill={color} stroke="#1c2f57" strokeWidth={6} />
    <path d={`M ${x + 20} ${y + 30} Q ${x + 30} ${y + 6} ${x + 80} ${y + 6} Q ${x + 118} ${y + 8} ${x + 120} ${y + 40} L ${x + 120} ${y + 150} L ${x + 18} ${y + 150} Z`} fill="#eef1f6" opacity={0.95} />
    {tray && <rect x={x - 6} y={y + 240} width={30} height={170} rx={8} fill="#c9ccd3" stroke="#8f94a0" strokeWidth={4} />}
  </g>
);

/** Wide cabin interior. `passenger` is drawn between the seat and its armrest. */
export const CabinWide: React.FC<{ frame: number; passenger?: React.ReactNode; windowCx?: number }> = ({
  frame,
  passenger,
  windowCx = 700,
}) => (
  <g>
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3efe6" />
        <stop offset="1" stopColor="#ddd6c7" />
      </linearGradient>
      <pattern id="carpet" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="#3d4a66" />
        <circle cx="15" cy="15" r="5" fill="#4f5d7d" />
        <circle cx="45" cy="45" r="5" fill="#33405a" />
      </pattern>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#wall)" />
    {/* sidewall panel seams */}
    {[60, 380, 1020].map((x) => (
      <line key={x} x1={x} y1={520} x2={x} y2={1360} stroke="#d2cabb" strokeWidth={4} />
    ))}
    <rect x={0} y={1180} width={1080} height={60} fill="#cfc7b6" />
    <CabinWindow id="cw-left" frame={frame} cx={windowCx - 520} cy={770} w={230} h={330} />
    <CabinWindow id="cw-main" frame={frame} cx={windowCx} cy={770} w={230} h={330} />
    <Overhead frame={frame} />
    {/* floor */}
    <rect x={0} y={1380} width={1080} height={540} fill="url(#carpet)" />
    <rect x={0} y={1372} width={1080} height={14} fill="#2a3346" />
    {/* row behind (left edge) */}
    <SeatBack x={-70} y={760} h={620} color="#2a4c8a" />
    {/* passenger seat */}
    <g>
      <path d="M 330 1240 L 352 780 Q 360 720 420 722 Q 478 724 476 790 L 470 1240 Z" fill="#2f5597" stroke="#1c2f57" strokeWidth={6} />
      <path d="M 358 800 Q 366 740 420 740 Q 466 742 466 800 L 466 880 L 356 880 Z" fill="#eef1f6" />
      <rect x={340} y={1170} width={380} height={80} rx={30} fill="#2f5597" stroke="#1c2f57" strokeWidth={6} />
      <rect x={380} y={1250} width={24} height={130} fill="#5d6577" />
      <rect x={640} y={1250} width={24} height={130} fill="#5d6577" />
      <rect x={370} y={1360} width={320} height={16} rx={6} fill="#5d6577" />
    </g>
    {passenger}
    {/* armrest (in front of passenger) */}
    <rect x={410} y={1080} width={230} height={34} rx={17} fill="#3a3f4c" />
    <rect x={430} y={1112} width={22} height={70} fill="#3a3f4c" />
    {/* row in front (right edge) */}
    <SeatBack x={890} y={760} h={620} tray />
  </g>
);

/** Passenger's-eye close-up of one window in its wall panel. */
export const WindowPOV: React.FC<{ frame: number; fog?: number }> = ({ frame, fog = 0 }) => (
  <g>
    <defs>
      <radialGradient id="pov-wall" cx="0.5" cy="0.4" r="0.8">
        <stop offset="0" stopColor="#f6f2ea" />
        <stop offset="1" stopColor="#d4ccbc" />
      </radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#pov-wall)" />
    <path d="M -20 300 Q 540 220 1100 300" fill="none" stroke="#d8d0c1" strokeWidth={6} />
    <path d="M -20 1500 Q 540 1580 1100 1500" fill="none" stroke="#d8d0c1" strokeWidth={6} />
    <CabinWindow id="pov" frame={frame} cx={540} cy={820} w={600} h={860} shade={0.1} fog={fog} wing />
  </g>
);

/** Hole position for WindowPOV (useful for highlights). */
export const POV_HOLE = { x: 540, y: 820 - 430 + 860 * 0.84 };
