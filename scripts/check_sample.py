#!/usr/bin/env python3
"""Check a short motion sample: full size, expected length, a real picture, and audible sound.

Usage: python3 scripts/check_sample.py out/door-motion-sample.mp4 5
Frames are saved to out/sample-frames/.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from speechlib import RATE, db, decode_audio, media_info, rms  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
failures: list[str] = []


def expect(cond: bool, good: str, bad: str) -> None:
    if cond:
        print(f"  PASS  {good}", flush=True)
    else:
        print(f"::error::{bad}\n  FAIL  {bad}", flush=True)
        failures.append(bad)


def main() -> int:
    video, seconds = Path(sys.argv[1]), float(sys.argv[2])
    info = media_info(video)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    duration = float(info["format"]["duration"])
    expect(v["codec_name"] == "h264" and (v["width"], v["height"]) == (1080, 1920) and v["r_frame_rate"] == "30/1",
           f"H.264, {v['width']} x {v['height']}, 30 fps", f"unexpected video: {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']}")
    expect(abs(duration - seconds) < 0.15, f"duration {duration:.2f}s", f"duration {duration:.2f}s, expected {seconds:.0f}s")
    expect(a is not None and a["codec_name"] == "aac", "AAC audio track", "no AAC audio track")
    if a is not None:
        mix = decode_audio(video)
        peak = float(np.max(np.abs(mix)))
        expect(db(rms(mix)) > -45 and peak < 0.98, f"sound is audible and not clipping (level {db(rms(mix)):.1f} dBFS, peak {db(peak):.1f} dBFS)",
               f"sound is silent or clipping (level {db(rms(mix)):.1f} dBFS, peak {db(peak):.1f} dBFS)")
    frames = ROOT / "out" / "sample-frames"
    frames.mkdir(parents=True, exist_ok=True)
    for name, t in (("1-start", 0.4), ("2-middle", seconds / 2), ("3-end", seconds - 0.3)):
        target = frames / f"{name}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "3", str(target)], check=True)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(target), "-vf", "scale=108:192", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                             capture_output=True, check=True).stdout
        luma = np.frombuffer(raw, dtype=np.uint8).astype(float)
        expect(luma.std() > 18 and 25 < luma.mean() < 235, f"frame {name} at {t:.1f}s has a full picture (contrast {luma.std():.0f})",
               f"frame {name} at {t:.1f}s looks blank (brightness {luma.mean():.0f}, contrast {luma.std():.0f})")
    print("\nSAMPLE CHECK PASSED" if not failures else f"\nSAMPLE CHECK FAILED ({len(failures)})", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
