import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../lib/anim";
import type { TimingLine } from "../lib/timing";

/**
 * Big, bold, word-chunked captions timed to the narration.
 * Chunks of up to `maxWords` words are spread across each line proportionally to their length.
 */

type Chunk = { words: string[]; start: number; end: number };

const chunkLine = (line: TimingLine, maxWords: number, maxChars: number): Chunk[] => {
  const words = line.text.split(/\s+/).filter(Boolean);
  const groups: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    const next = [...cur, w];
    const tooLong = next.join(" ").length > maxChars;
    if (cur.length > 0 && (next.length > maxWords || tooLong)) {
      groups.push(cur);
      cur = [w];
    } else {
      cur = next;
    }
    // break after punctuation so phrases read naturally
    if (/[,.?!]$/.test(w)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);

  const weight = (g: string[]) => g.join(" ").length + 4;
  const total = groups.reduce((a, g) => a + weight(g), 0);
  let t = line.start;
  return groups.map((g) => {
    const d = (weight(g) / total) * line.duration;
    const c = { words: g, start: t, end: t + d };
    t += d;
    return c;
  });
};

const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

export const Captions: React.FC<{
  lines: TimingLine[];
  highlight: string[];
  y?: number;
  maxWords?: number;
  maxChars?: number;
}> = ({ lines, highlight, y = 1250, maxWords = 3, maxChars = 18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = React.useMemo(() => lines.flatMap((l) => chunkLine(l, maxWords, maxChars)), [lines, maxWords, maxChars]);

  // Keep the last chunk on screen through short pauses between lines.
  let active: Chunk | undefined;
  for (const c of chunks) {
    if (t >= c.start && t < c.end + 0.25) active = c;
  }
  if (!active) return null;

  const startFrame = Math.round(active.start * fps);
  const p = pop(frame, fps, startFrame, 260);
  const hl = new Set(highlight.map(clean));

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: y,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${0.7 + 0.3 * p}) translateY(${(1 - p) * 30}px)`,
      }}
    >
      <div
        style={{
          fontFamily: "Fredoka, sans-serif",
          fontWeight: 700,
          fontSize: 92,
          background: "rgba(17,19,26,0.55)",
          borderRadius: 34,
          padding: "8px 34px 18px",
          lineHeight: 1.08,
          textAlign: "center",
          color: "white",
          WebkitTextStroke: "20px #11131a",
          paintOrder: "stroke fill",
          textShadow: "0 10px 0 rgba(0,0,0,0.35)",
          letterSpacing: 1,
        }}
      >
        {active.words.map((w, i) => (
          <span key={i} style={{ color: hl.has(clean(w)) ? "#ffd23f" : "white" }}>
            {w}
            {i < active!.words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
