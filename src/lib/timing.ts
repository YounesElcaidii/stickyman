import { staticFile } from "remotion";

export type TimingLine = {
  id: string;
  text: string;
  start: number; // seconds
  duration: number; // seconds
};

export type Caption = { text: string; start: number; end: number; line?: string; spoken?: string };

export type Timing = {
  engine: string;
  voice: string;
  totalSeconds: number;
  audio: string; // narration track, relative to public/
  lines: TimingLine[];
  captions: Caption[];
};

/** Loads public/shorts/<short>/timing.json written by scripts/make_voice.py */
export const loadTiming = async (short: string): Promise<Timing> => {
  const res = await fetch(staticFile(`shorts/${short}/timing.json`));
  if (!res.ok) {
    throw new Error(`Missing timing for "${short}". Run: npm run voice -- ${short}`);
  }
  return (await res.json()) as Timing;
};

/** Start/end frame of every narration line, keyed by line id. */
export const lineFrames = (timing: Timing, fps: number) =>
  Object.fromEntries(
    timing.lines.map((l) => [
      l.id,
      { start: Math.round(l.start * fps), end: Math.round((l.start + l.duration) * fps) },
    ]),
  ) as Record<string, { start: number; end: number }>;
