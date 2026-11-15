import { staticFile } from "remotion";

export type TimingLine = {
  id: string;
  text: string;
  file: string;
  start: number; // seconds
  duration: number; // seconds
};

export type Timing = {
  engine: string;
  voice: string;
  totalSeconds: number;
  lines: TimingLine[];
};

/** Loads public/shorts/<short>/timing.json written by scripts/make_voice.py */
export const loadTiming = async (short: string): Promise<Timing> => {
  const res = await fetch(staticFile(`shorts/${short}/timing.json`));
  if (!res.ok) {
    throw new Error(`Missing timing for "${short}". Run: npm run voice -- ${short}`);
  }
  return (await res.json()) as Timing;
};

/** Frame range of each narration line's scene: from its start to the next line's start. */
export const sceneRanges = (timing: Timing, fps: number, totalFrames: number) =>
  timing.lines.map((line, i) => {
    const from = i === 0 ? 0 : Math.round(line.start * fps);
    const next = timing.lines[i + 1];
    const to = next ? Math.round(next.start * fps) : totalFrames;
    return {
      id: line.id,
      from,
      duration: to - from,
      speechFrom: Math.round(line.start * fps) - from,
      speechFrames: Math.round(line.duration * fps),
    };
  });
