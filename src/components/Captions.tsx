import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../lib/anim";
import type { Caption } from "../lib/timing";

/**
 * One short, readable phrase at a time, timed to the generated voice.
 *
 * The caption band sits inside the area YouTube Shorts leaves clear:
 * above the bottom ~420px (title, channel, progress bar) and left of the right ~190px (buttons).
 */
export const CAPTION_BAND = { left: 60, right: 190, top: 1255, height: 230 };

const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

export const Captions: React.FC<{ captions: Caption[]; highlight?: string[] }> = ({ captions, highlight = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const active = captions.find((c) => t >= c.start && t < c.end);
  if (!active) return null;

  const p = pop(frame, fps, Math.round(active.start * fps), 300);
  const hl = new Set(highlight.map(clean));

  return (
    <div
      style={{
        position: "absolute",
        left: CAPTION_BAND.left,
        right: CAPTION_BAND.right,
        top: CAPTION_BAND.top,
        height: CAPTION_BAND.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${0.85 + 0.15 * p})`,
          opacity: Math.min(1, p * 2),
          background: "rgba(13,15,22,0.88)",
          borderRadius: 36,
          padding: "20px 38px 26px",
          maxWidth: "100%",
          fontFamily: "Fredoka, sans-serif",
          fontWeight: 700,
          fontSize: 76,
          lineHeight: 1.12,
          textAlign: "center",
          textWrap: "balance",
          color: "white",
          letterSpacing: 0.5,
        }}
      >
        {active.text.split(" ").map((w, i) => (
          <span key={i} style={{ color: hl.has(clean(w)) ? "#ffd23f" : "white" }}>
            {i > 0 ? " " : ""}
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};
