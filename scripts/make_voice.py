#!/usr/bin/env python3
"""Generate narration audio + timing for a Short, using free offline text-to-speech.

Usage:
    python3 scripts/make_voice.py airplane-window [--engine auto|piper|espeak]

Reads   src/shorts/<short>/narration.json
Writes  public/shorts/<short>/voice/<line-id>.wav
        public/shorts/<short>/timing.json   (read by the Remotion composition)

Engines
  piper   Neural voice (https://github.com/OHF-Voice/piper1-gpl). Free, runs on CPU,
          no API key. The voice model is downloaded once from Hugging Face into .voices/.
  espeak  Robotic fallback (espeak-ng). Only used when Piper is unavailable.

The script automatically nudges the speaking speed so the whole Short lands
between minSeconds and maxSeconds from narration.json.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE_DIR = ROOT / ".voices"


def log(msg: str) -> None:
    print(f"[voice] {msg}", flush=True)


def wav_seconds(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / float(w.getframerate())


def ensure_piper_voice(voice: str) -> Path | None:
    onnx = VOICE_DIR / f"{voice}.onnx"
    if onnx.exists() and (VOICE_DIR / f"{voice}.onnx.json").exists():
        return onnx
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    log(f"Downloading Piper voice {voice} ...")
    r = subprocess.run(
        [sys.executable, "-m", "piper.download_voices", "--download-dir", str(VOICE_DIR), voice]
    )
    if r.returncode != 0 or not onnx.exists():
        log("Could not download the Piper voice.")
        return None
    return onnx


def piper_available() -> bool:
    try:
        import piper  # noqa: F401
    except ImportError:
        return False
    return True


def synth_piper(onnx: Path, text: str, out: Path, length_scale: float) -> None:
    subprocess.run(
        [
            sys.executable, "-m", "piper",
            "-m", str(onnx),
            "-f", str(out),
            "--length-scale", f"{length_scale:.3f}",
            "--sentence-silence", "0.1",
        ],
        input=text.encode("utf-8"),
        check=True,
        stdout=subprocess.DEVNULL,
    )


def synth_espeak(text: str, out: Path, length_scale: float) -> None:
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe:
        raise RuntimeError("Neither Piper nor espeak-ng is available")
    words_per_minute = int(165 / length_scale)
    subprocess.run([exe, "-v", "en-us", "-s", str(words_per_minute), "-w", str(out), text], check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("short", help="folder name in src/shorts, e.g. airplane-window")
    ap.add_argument("--engine", default=os.environ.get("TTS_ENGINE", "auto"),
                    choices=["auto", "piper", "espeak"])
    args = ap.parse_args()

    cfg_path = ROOT / "src" / "shorts" / args.short / "narration.json"
    cfg = json.loads(cfg_path.read_text())
    out_dir = ROOT / "public" / "shorts" / args.short
    voice_out = out_dir / "voice"
    voice_out.mkdir(parents=True, exist_ok=True)

    engine = args.engine
    onnx = None
    if engine in ("auto", "piper"):
        onnx = ensure_piper_voice(cfg["voice"]) if piper_available() else None
        if onnx is None:
            if engine == "piper":
                log("Piper was required but is not available.")
                return 1
            print("::warning::Piper voice unavailable, falling back to espeak-ng (robotic voice)")
            engine = "espeak"
        else:
            engine = "piper"
    log(f"Engine: {engine}")

    gap = float(cfg.get("gapSeconds", 0.25))
    lead = float(cfg.get("leadInSeconds", 0.3))
    tail = float(cfg.get("tailSeconds", 1.5))
    lo, hi = float(cfg["minSeconds"]), float(cfg["maxSeconds"])
    target = (lo + hi) / 2
    scale = float(cfg.get("lengthScale", 1.0))

    durations: list[float] = []
    total = 0.0
    for attempt in range(4):
        durations = []
        for line in cfg["lines"]:
            wav = voice_out / f"{line['id']}.wav"
            if engine == "piper":
                synth_piper(onnx, line["text"], wav, scale)
            else:
                synth_espeak(line["text"], wav, scale)
            durations.append(wav_seconds(wav))
        total = lead + sum(durations) + gap * (len(durations) - 1) + tail
        log(f"Attempt {attempt + 1}: speed scale {scale:.3f} -> {total:.2f}s")
        if lo + 0.5 <= total <= hi - 0.5:
            break
        speech = sum(durations)
        fixed = total - speech
        new_scale = scale * (target - fixed) / speech
        scale = max(0.75, min(1.3, new_scale))

    if not (lo <= total <= hi):
        log(f"Total length {total:.2f}s is outside {lo}-{hi}s. Edit the narration text.")
        return 1

    t = lead
    lines = []
    for line, d in zip(cfg["lines"], durations):
        lines.append({
            "id": line["id"],
            "text": line["text"],
            "file": f"shorts/{args.short}/voice/{line['id']}.wav",
            "start": round(t, 3),
            "duration": round(d, 3),
        })
        t += d + gap
    timing = {
        "engine": engine,
        "voice": cfg["voice"] if engine == "piper" else "espeak-ng en-us",
        "lengthScale": round(scale, 3),
        "totalSeconds": round(total, 3),
        "lines": lines,
    }
    (out_dir / "timing.json").write_text(json.dumps(timing, indent=2) + "\n")
    log(f"Wrote {out_dir / 'timing.json'} ({total:.2f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
