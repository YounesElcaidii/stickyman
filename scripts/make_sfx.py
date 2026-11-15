#!/usr/bin/env python3
"""Synthesize small, original sound effects (no downloads, no licenses needed).

Writes public/sfx/whoosh.wav, public/sfx/pop.wav, public/sfx/ding.wav
"""

import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sfx"
RATE = 44100


def write(name: str, samples: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s / peak * 0.9 * 32767)) for s in samples))


def whoosh() -> list[float]:
    rnd = random.Random(7)
    n = int(RATE * 0.35)
    out, lp = [], 0.0
    for i in range(n):
        t = i / n
        env = math.sin(math.pi * t) ** 2
        cutoff = 0.02 + 0.25 * math.sin(math.pi * t)  # sweeping low-pass
        lp += cutoff * (rnd.uniform(-1, 1) - lp)
        out.append(lp * env)
    return out


def pop() -> list[float]:
    n = int(RATE * 0.12)
    out = []
    for i in range(n):
        t = i / RATE
        f = 900 - 5000 * t
        out.append(math.sin(2 * math.pi * f * t) * math.exp(-t * 40))
    return out


def ding() -> list[float]:
    n = int(RATE * 0.6)
    out = []
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * 7)
        out.append(env * (math.sin(2 * math.pi * 1318.5 * t) + 0.5 * math.sin(2 * math.pi * 1975.5 * t)))
    return out


if __name__ == "__main__":
    write("whoosh.wav", whoosh())
    write("pop.wav", pop())
    write("ding.wav", ding())
    print(f"[sfx] wrote sound effects to {OUT}")
