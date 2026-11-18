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


def click() -> list[float]:
    """One crisp mechanical click: a sharp tick followed by a short, damped knock."""
    rnd = random.Random(3)
    n = int(RATE * 0.09)
    out = []
    for i in range(n):
        t = i / RATE
        tick = rnd.uniform(-1, 1) * math.exp(-t * 900)
        knock = math.sin(2 * math.pi * 1900 * t) * math.exp(-t * 160) * 0.7
        body = math.sin(2 * math.pi * 420 * t) * math.exp(-t * 90) * 0.5
        out.append(tick + knock + body)
    return out


def whir() -> list[float]:
    """Soft mixer motor: a low hum with a little air noise, steady enough to sit under a voice."""
    rnd = random.Random(11)
    n = int(RATE * 12)
    out, lp = [], 0.0
    for i in range(n):
        t = i / RATE
        wobble = 1 + 0.015 * math.sin(2 * math.pi * 5.5 * t)
        hum = sum(math.sin(2 * math.pi * 92 * h * wobble * t) / (h ** 1.3) for h in (1, 2, 3, 4, 6))
        lp += 0.12 * (rnd.uniform(-1, 1) - lp)
        out.append(hum * 0.5 + lp * 1.4)
    return out


def knock() -> list[float]:
    """One knuckle knock on a wooden door."""
    rnd = random.Random(5)
    n = int(RATE * 0.22)
    out = []
    for i in range(n):
        t = i / RATE
        thud = math.sin(2 * math.pi * 150 * t) * math.exp(-t * 34)
        wood = math.sin(2 * math.pi * 410 * t) * math.exp(-t * 60) * 0.6
        rap = rnd.uniform(-1, 1) * math.exp(-t * 500) * 0.5
        out.append(thud + wood + rap)
    return out


def footstep() -> list[float]:
    """A soft step on a wooden floor."""
    rnd = random.Random(8)
    n = int(RATE * 0.2)
    out, lp = [], 0.0
    for i in range(n):
        t = i / RATE
        lp += 0.18 * (rnd.uniform(-1, 1) - lp)
        out.append(math.sin(2 * math.pi * 82 * t) * math.exp(-t * 30) + lp * math.exp(-t * 45) * 1.6)
    return out


def ringtone() -> list[float]:
    """Original phone ring: two short marimba-like notes, twice, then a rest (2 s, loops)."""
    n = int(RATE * 2.0)
    out = [0.0] * n
    for start, freq in ((0.0, 880.0), (0.16, 1174.7), (0.5, 880.0), (0.66, 1174.7)):
        for i in range(int(RATE * 0.3)):
            t = i / RATE
            k = int(start * RATE) + i
            if k < n:
                out[k] += math.exp(-t * 16) * (math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(2 * math.pi * freq * 3 * t))
    return out


def buzz() -> list[float]:
    """Phone vibration: a short low rattle."""
    n = int(RATE * 0.45)
    out = []
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / 0.02) * min(1.0, (0.45 - t) / 0.05)
        out.append(env * (math.sin(2 * math.pi * 165 * t) * (0.6 + 0.4 * math.sin(2 * math.pi * 27 * t))))
    return out


def room() -> list[float]:
    """Quiet night-time room tone (loops)."""
    rnd = random.Random(21)
    n = int(RATE * 8)
    out, lp, lp2 = [], 0.0, 0.0
    for i in range(n):
        t = i / RATE
        lp += 0.02 * (rnd.uniform(-1, 1) - lp)
        lp2 += 0.2 * (lp - lp2)
        out.append(lp2 * 3 + 0.12 * math.sin(2 * math.pi * 58 * t) * (0.8 + 0.2 * math.sin(2 * math.pi * 0.25 * t)))
    return out


if __name__ == "__main__":
    write("knock.wav", knock())
    write("footstep.wav", footstep())
    write("ringtone.wav", ringtone())
    write("buzz.wav", buzz())
    write("room.wav", room())
    write("click.wav", click())
    write("whir.wav", whir())
    write("whoosh.wav", whoosh())
    write("pop.wav", pop())
    write("ding.wav", ding())
    print(f"[sfx] wrote sound effects to {OUT}")
