import React from "react";
import { rand } from "../../lib/anim";

/** Airplane window artwork as seen from the seat. All SVG in 1080x1920 space. */

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

/** Passenger's-eye close-up of one window in its wall panel. */
export const WindowPOV: React.FC<{ frame: number; fog?: number; wing?: boolean }> = ({ frame, fog = 0, wing = true }) => (
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
    <CabinWindow id="pov" frame={frame} cx={540} cy={820} w={600} h={860} shade={0.1} fog={fog} wing={wing} />
  </g>
);

/** Hole position for WindowPOV (useful for highlights). */
export const POV_HOLE = { x: 540, y: 820 - 430 + 860 * 0.84 };
