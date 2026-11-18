#!/usr/bin/env python3
"""Voice auditions for a Short, made with a free neural voice model that runs on the CPU.

Reads the "auditions" block of the Short's narration.json. Each audition names a voice and a
delivery: the text is spoken sentence by sentence, each at its own speed, with its own pause after
it, so pace and pauses really differ between auditions (the model has no "emotion" control).

Engine: Kokoro-82M v1.0 through kokoro-onnx.
  - model weights: Apache License 2.0   (https://github.com/hexgrad/kokoro)
  - kokoro-onnx runner: MIT License     (https://github.com/thewh1teagle/kokoro-onnx)
  - runs on CPU with onnxruntime; no account, key or subscription

Writes out/auditions/<file>.wav for each audition and out/auditions/README.md, which lists the
model, voice name, delivery settings and what a speech-to-text pass understood.

Usage: python3 scripts/voice_auditions.py someone-at-the-door [--no-asr]
"""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from speechlib import RATE, db, read_wav, rms, soft_limit, transcribe, word_recall, write_wav  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / ".voices" / "kokoro"
OUT = ROOT / "out" / "auditions"
RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
MODEL_NAME = "Kokoro-82M v1.0 (ONNX)"

# Light effects: enough to place the voice, not enough to blur the words.
EFFECTS = {
    "phone": "highpass=f=260,lowpass=f=3600,acompressor=threshold=0.2:ratio=2:makeup=1.3",
    "door": "highpass=f=90,lowpass=f=2600,aecho=0.8:0.4:28:0.14",
}


def kokoro():
    from kokoro_onnx import Kokoro

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, least in (("kokoro-v1.0.onnx", 300_000_000), ("voices-v1.0.bin", 20_000_000)):
        target = MODEL_DIR / name
        if not target.exists() or target.stat().st_size < least:
            print(f"[auditions] downloading {name} ...", flush=True)
            urllib.request.urlretrieve(RELEASE + name, target)
    return Kokoro(str(MODEL_DIR / "kokoro-v1.0.onnx"), str(MODEL_DIR / "voices-v1.0.bin"))


def resample(samples: np.ndarray, rate: int) -> np.ndarray:
    if rate == RATE:
        return samples.astype(np.float32)
    n = int(round(len(samples) * RATE / rate))
    return np.interp(np.linspace(0, len(samples) - 1, n), np.arange(len(samples)), samples).astype(np.float32)


def speak(engine, item: dict) -> np.ndarray:
    """Speak an audition: each segment at its own speed, followed by its own pause."""
    parts = []
    for seg in item["segments"]:
        samples, rate = engine.create(seg["text"], voice=item["voice"], speed=float(seg.get("speed", 1.0)), lang="en-us")
        parts.append(resample(samples, rate))
        parts.append(np.zeros(int(float(seg.get("pauseAfter", 0.3)) * RATE), dtype=np.float32))
    audio = np.concatenate(parts[:-1])
    level = 10 ** (float(item.get("levelDb", -18.0)) / 20)
    return soft_limit(audio * level / max(1e-6, rms(audio)))


def with_effect(samples: np.ndarray, effect: str | None) -> np.ndarray:
    if not effect:
        return samples
    src, dst = OUT / "fx-in.wav", OUT / "fx-out.wav"
    write_wav(src, samples)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", EFFECTS[effect], "-ar", str(RATE), "-ac", "1", str(dst)], check=True)
    out, _ = read_wav(dst)
    src.unlink()
    dst.unlink()
    return soft_limit(out * rms(samples) / max(1e-6, rms(out)))


def main() -> int:
    short = sys.argv[1]
    asr = "--no-asr" not in sys.argv
    items = json.loads((ROOT / "src" / "shorts" / short / "narration.json").read_text())["auditions"]
    OUT.mkdir(parents=True, exist_ok=True)
    engine = kokoro()
    rows = [
        "# Voice auditions\n",
        f"Model: **{MODEL_NAME}** - weights Apache License 2.0, kokoro-onnx runner MIT. Runs on CPU, no paid service.\n",
        "| File | Voice | Delivery | Effect | Length | Speech-to-text understood |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for item in items:
        text = " ".join(s["text"] for s in item["segments"])
        dry = speak(engine, item)
        target = OUT / item["file"]
        write_wav(target, with_effect(dry, item.get("effect")))
        seconds = len(dry) / RATE
        heard = "(not checked)"
        if asr:
            try:
                said = transcribe(target)
                recall, missed = word_recall(text, said)
                heard = f"{recall * 100:.0f}% - \"{said}\""
            except Exception as e:  # informative only
                heard = f"(speech-to-text failed: {type(e).__name__}: {e})"
        speeds = "/".join(f"{float(s.get('speed', 1.0)):.2f}" for s in item["segments"])
        pauses = "/".join(f"{float(s.get('pauseAfter', 0.3)):.2f}" for s in item["segments"][:-1]) or "-"
        print(f"[auditions] {item['file']}: {MODEL_NAME}, voice {item['voice']}, {item['label']}, {seconds:.2f}s, "
              f"level {db(rms(dry)):.1f} dBFS, effect {item.get('effect') or 'none'}; heard: {heard}", flush=True)
        rows.append(f"| `{item['file']}` | `{item['voice']}` | {item['label']} (speeds {speeds}; pauses {pauses} s) | "
                    f"{item.get('effect') or 'none'} | {seconds:.1f} s | {heard} |")
    (OUT / "README.md").write_text("\n".join(rows) + "\n")
    print(f"[auditions] written to {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
