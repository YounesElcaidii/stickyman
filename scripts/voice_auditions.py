#!/usr/bin/env python3
"""Audition free Piper voices for a Short, and record each voice's license.

For every candidate in the Short's narration.json ("auditions"), this downloads the voice and its
model card, speaks the narrator line, and speaks the phone line through a telephone filter.

Writes out/auditions/
    narrator-<voice>.wav        the narrator line
    phone-<voice>.wav           the caller's line with a subtle telephone filter
    <voice>.license.txt         the voice's model card, as published with the voice
    README.md                   one row per voice: license lines from its card, or the exact error

A voice that cannot be downloaded or fails to speak is listed with its error; it never stops the run.

Usage: python3 scripts/voice_auditions.py someone-at-the-door
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICES = ROOT / ".voices"
OUT = ROOT / "out" / "auditions"
PHONE_FILTER = "highpass=f=320,lowpass=f=3300,acompressor=threshold=0.1:ratio=3:makeup=2,volume=0.9"


def card_url(voice: str) -> str:
    lang, name, quality = voice.split("-")
    return f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang[:2]}/{lang}/{name}/{quality}/MODEL_CARD"


def main() -> int:
    short = sys.argv[1]
    cfg = json.loads((ROOT / "src" / "shorts" / short / "narration.json").read_text())["auditions"]
    OUT.mkdir(parents=True, exist_ok=True)
    VOICES.mkdir(exist_ok=True)
    rows = ["# Voice auditions\n", "| Voice | License lines from its model card | Result |", "| --- | --- | --- |"]
    for voice in cfg["voices"]:
        print(f"\n=== {voice}", flush=True)
        try:
            card = urllib.request.urlopen(card_url(voice), timeout=30).read().decode("utf-8", "replace")
        except Exception as e:
            card = ""
            print(f"model card not available: {e}", flush=True)
        (OUT / f"{voice}.license.txt").write_text(f"Voice: {voice}\nSource: {card_url(voice)}\n\n{card}\n")
        print(card.strip(), flush=True)
        keep = [l.strip() for l in card.splitlines() if re.search(r"licen|dataset|url|http|commercial|public domain|cc[ -]?by|attribution", l, re.I)]
        license_lines = "<br>".join(keep[:8]).replace("|", "/") or "(no model card)"

        onnx = VOICES / f"{voice}.onnx"
        if not onnx.exists():
            r = subprocess.run([sys.executable, "-m", "piper.download_voices", "--download-dir", str(VOICES), voice], capture_output=True, text=True)
            if r.returncode != 0 or not onnx.exists():
                err = (r.stderr or r.stdout).strip().splitlines()[-1:] or ["download failed"]
                print(f"DOWNLOAD FAILED: {err[0]}", flush=True)
                rows.append(f"| {voice} | {license_lines} | download failed: {err[0][:120]} |")
                continue
        result = []
        for kind, text in (("narrator", cfg["narratorText"]), ("phone", cfg["alexText"])):
            raw = OUT / f"raw-{kind}-{voice}.wav"
            r = subprocess.run([sys.executable, "-m", "piper", "-m", str(onnx), "-f", str(raw), "--length-scale", "1.05"],
                               input=text, capture_output=True, text=True)
            if r.returncode != 0 or not raw.exists():
                result.append(f"{kind}: failed ({(r.stderr or '').strip()[-100:]})")
                continue
            target = OUT / f"{kind}-{voice}.wav"
            af = "loudnorm=I=-18:TP=-2" + ("," + PHONE_FILTER if kind == "phone" else "")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", af, "-ar", "22050", str(target)], check=True)
            raw.unlink()
            result.append(f"{kind}: ok")
        print("; ".join(result), flush=True)
        rows.append(f"| {voice} | {license_lines} | {'; '.join(result)} |")
    (OUT / "README.md").write_text("\n".join(rows) + "\n")
    print(f"\nauditions written to {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
