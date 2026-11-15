#!/usr/bin/env python3
"""Delivery check for a rendered Short. Exits non-zero (and says why) unless ALL of this holds:

  - H.264 video, exactly 1080 x 1920, 30 fps  (a smaller "preview size" file fails)
  - AAC audio, 25-30 s long, and the last sentence has finished before the video ends
  - no clipping
  - every narration sentence is audible at the time it should be spoken, and what is in the
    MP4 there IS the generated narration (waveform match), clearly above any sound effects
  - speech-to-text of the MP4's audio gives back the script
  - the narration was made by the real voice, not the development placeholder

It also saves one frame per narration sentence plus the ending to out/frames/
and writes out/check-report.md.

Usage: python3 scripts/check_video.py out/airplane-window-short-v2.mp4 airplane-window [--no-asr]
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from speechlib import RATE, db, decode_audio, read_wav, rms, transcribe, whisper_word_times, word_recall, words_of  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
report: list[str] = []
failures: list[str] = []


def ok(msg: str) -> None:
    print(f"  PASS  {msg}", flush=True)
    report.append(f"- ✅ {msg}")


def bad(msg: str) -> None:
    print(f"::error::{msg}", flush=True)
    print(f"  FAIL  {msg}", flush=True)
    report.append(f"- ❌ {msg}")
    failures.append(msg)


def expect(cond: bool, msg_ok: str, msg_bad: str) -> None:
    ok(msg_ok) if cond else bad(msg_bad)


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-count_packets", "-show_streams", "-show_format", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    return json.loads(out)


def best_match(mix: np.ndarray, ref: np.ndarray, expected: int, slack: int) -> tuple[float, int]:
    """Best normalised correlation between ref and mix near sample `expected`; returns (match, start)."""
    best, best_start = -1.0, expected
    ref_n = ref - ref.mean()
    ref_e = float(np.sqrt(np.sum(ref_n**2))) + 1e-9
    coarse = list(range(max(0, expected - slack), expected + slack + 1, 4))
    for start in coarse + [None]:
        if start is None:  # refine around the best coarse position, one sample at a time
            for fine in range(max(0, best_start - 4), best_start + 5):
                seg = mix[fine: fine + len(ref)]
                if len(seg) == len(ref):
                    seg_n = seg - seg.mean()
                    c = float(np.sum(seg_n * ref_n)) / (ref_e * (float(np.sqrt(np.sum(seg_n**2))) + 1e-9))
                    if c > best:
                        best, best_start = c, fine
            break
        seg = mix[start: start + len(ref)]
        if len(seg) < len(ref):
            break
        seg_n = seg - seg.mean()
        c = float(np.sum(seg_n * ref_n)) / (ref_e * (float(np.sqrt(np.sum(seg_n**2))) + 1e-9))
        if c > best:
            best, best_start = c, start
    return best, best_start


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("short")
    ap.add_argument("--no-asr", action="store_true", help="skip speech-to-text (offline development only)")
    ap.add_argument("--allow-dev-voice", action="store_true", help="accept the espeak development voice (never for delivery)")
    args = ap.parse_args()

    video = Path(args.video)
    pub = ROOT / "public" / "shorts" / args.short
    timing = json.loads((pub / "timing.json").read_text())
    report.append(f"## Render check: `{video.name}`\n")

    if not video.exists() or video.stat().st_size < 100_000:
        bad(f"{video} is missing or empty")
        return finish()

    info = probe(video)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    duration = float(info["format"]["duration"])

    # --- container / streams --------------------------------------------------------------
    if v is None:
        bad("no video stream")
        return finish()
    expect(v["codec_name"] == "h264", "video codec is H.264", f"video codec is {v['codec_name']}, expected h264")
    size = f"{v['width']} x {v['height']}"
    expect((v["width"], v["height"]) == (1080, 1920), f"resolution is {size} (full size, not a preview)",
           f"resolution is {size}, expected 1080 x 1920 - this is a preview-size or re-encoded file")
    expect(v["r_frame_rate"] == "30/1", "frame rate is 30 fps", f"frame rate is {v['r_frame_rate']}, expected 30/1")
    frames = int(v.get("nb_read_packets", 0))
    expect(abs(frames - duration * 30) <= 3, f"{frames} video frames for {duration:.2f}s",
           f"{frames} video frames does not match {duration:.2f}s at 30 fps")
    if a is None:
        bad("no audio stream")
        return finish()
    expect(a["codec_name"] == "aac", f"audio codec is AAC ({a.get('sample_rate')} Hz, {a.get('channels')} ch)",
           f"audio codec is {a['codec_name']}, expected aac")
    lo, hi = float(timing.get("minSeconds", 25)), float(timing.get("maxSeconds", 30))
    expect(lo <= duration <= hi, f"duration is {duration:.2f}s ({lo:.0f}-{hi:.0f}s)", f"duration is {duration:.2f}s, outside {lo:.0f}-{hi:.0f}s")
    last = timing["lines"][-1]
    room = duration - (last["start"] + last["duration"])
    expect(room >= 0.8, f"last sentence ends {room:.2f}s before the video ends",
           f"only {room:.2f}s after the last sentence - it may be cut off")

    # --- narration source -----------------------------------------------------------------
    is_dev = timing.get("engine") != "piper"
    if is_dev and not args.allow_dev_voice:
        bad(f"narration engine is '{timing.get('engine')}' - a development placeholder, not the real voice")
    else:
        ok(f"narration voice: {timing.get('voice')}" + (" (DEVELOPMENT VOICE - not for delivery)" if is_dev else ""))

    # --- decoded audio --------------------------------------------------------------------
    mix = decode_audio(video)
    ref, ref_rate = read_wav(pub / "narration.wav")
    assert ref_rate == RATE
    peak = float(np.max(np.abs(mix))) if len(mix) else 0.0
    clipped = int(np.sum(np.abs(mix) >= 0.999))
    expect(peak < 0.98 and clipped == 0, f"no clipping (peak {db(peak):.1f} dBFS)",
           f"audio clips: peak {db(peak):.1f} dBFS, {clipped} clipped samples")
    expect(db(rms(mix)) > -30, f"overall loudness {db(rms(mix)):.1f} dBFS", f"audio too quiet overall ({db(rms(mix)):.1f} dBFS)")

    worst_ratio = 99.0
    for line in timing["lines"]:
        s, n = int(line["start"] * RATE), int(line["duration"] * RATE)
        ref_seg = ref[s: s + n]
        match, start = best_match(mix, ref_seg, s, 2205)  # allow +-0.1s of encoder delay
        seg = mix[start: start + n]
        if len(seg) < n:
            seg = np.concatenate([seg, np.zeros(n - len(seg), np.float32)])
        level = db(rms(seg))
        k = float(np.sum(seg * ref_seg)) / (float(np.sum(ref_seg**2)) + 1e-9)
        residual = db(rms(seg - k * ref_seg))
        ratio = db(rms(k * ref_seg)) - residual
        worst_ratio = min(worst_ratio, ratio)
        label = f"\"{line['text'][:38]}...\" at {line['start']:.2f}s"
        if level < -32:
            bad(f"silence where speech is expected: {label} is at {level:.1f} dBFS")
        elif match < 0.9:
            bad(f"the audio at {label} is not the generated narration (waveform match {match:.2f})")
        else:
            ok(f"spoken line present: {label} - level {level:.1f} dBFS, waveform match {match:.2f}, {ratio:.0f} dB above everything else")
    expect(worst_ratio >= 15, f"narration is at least {worst_ratio:.0f} dB above sound effects/background",
           f"narration is only {worst_ratio:.0f} dB above the background")

    # --- what a listener hears ----------------------------------------------------------------
    script = " ".join(l["text"] for l in timing["lines"])
    if args.no_asr:
        report.append("- ⚠️ speech-to-text check skipped (--no-asr)")
        print("  SKIP  speech-to-text check (--no-asr)", flush=True)
    else:
        try:
            wav = ROOT / "out" / "final-audio.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-map", "0:a:0", "-ac", "1", "-ar", "16000", str(wav)], check=True)
            heard = transcribe(wav)
            recall, missed = word_recall(script, heard)
            report.append(f"\nSpeech-to-text of the final MP4 heard:\n\n> {heard}\n")
            print(f"  speech-to-text heard: \"{heard}\"", flush=True)
            expect(recall >= 0.85, f"speech-to-text recognised {recall * 100:.0f}% of the script words in the MP4",
                   f"speech-to-text recognised only {recall * 100:.0f}% of the script in the MP4 (missed: {missed})")
        except Exception as e:
            bad(f"speech-to-text check could not run: {type(e).__name__}: {e}")

    # --- captions follow the voice ------------------------------------------------------------
    caps = timing["captions"]
    sync = timing.get("captionSync", "")
    expect("estimated" not in sync, f"caption timing was measured from the audio ({sync})",
           "caption timing is estimated, not measured from the generated voice")
    by_line = {l["id"]: l for l in timing["lines"]}
    ordered = all(a["start"] < b["start"] and a["end"] <= b["start"] + 0.001 for a, b in zip(caps, caps[1:]))
    inside = all(by_line[c["line"]]["start"] - 0.05 <= c["start"] <= by_line[c["line"]]["start"] + by_line[c["line"]]["duration"] for c in caps)
    longest = max(len(c["text"]) for c in caps)
    expect(ordered and inside, f"{len(caps)} captions, one at a time, each starting inside its own sentence",
           "captions overlap or start outside the sentence they belong to")
    expect(longest <= 34, f"longest caption is {longest} characters (fits two large lines)", f"a caption is {longest} characters - too long to read")
    if not args.no_asr:
        # Independent cross-check on the FINAL file: where does speech-to-text hear each caption's first word?
        try:
            spoken = " ".join(c["spoken"] for c in caps)
            heard_words = whisper_word_times(ROOT / "out" / "final-audio.wav", spoken)
            diffs, i = [], 0
            for c in caps:
                diffs.append(abs(heard_words[i][1] - c["start"]))
                i += len(words_of(c["spoken"]))
            diffs_sorted = sorted(diffs)
            median, worst = diffs_sorted[len(diffs) // 2], diffs_sorted[-1]
            expect(median <= 0.25 and worst <= 0.8,
                   f"captions match the voice in the final MP4: median offset {median:.2f}s, largest {worst:.2f}s (speech-to-text word timing)",
                   f"captions drift from the voice in the final MP4: median offset {median:.2f}s, largest {worst:.2f}s")
        except Exception as e:
            bad(f"caption sync cross-check could not run: {type(e).__name__}: {e}")

    # --- frames to look at --------------------------------------------------------------------
    frames_dir = ROOT / "out" / "frames"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True, exist_ok=True)
    shots = {f"{n + 1}-{l['id']}": l["start"] + l["duration"] * 0.8 for n, l in enumerate(timing["lines"])}
    shots[f"{len(shots) + 1}-ending"] = min(duration - 0.1, last["start"] + last["duration"] + 0.3)
    for name, t in shots.items():
        target = frames_dir / f"{name}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "3", str(target)], check=True)
        stats = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(target), "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"],
            capture_output=True, text=True,
        ).stdout
        yavg = next((float(l.split("=")[1]) for l in stats.splitlines() if "YAVG" in l), 0.0)
        ydif = next((float(l.split("=")[1]) for l in stats.splitlines() if "YMAX" in l), 0.0) - next(
            (float(l.split("=")[1]) for l in stats.splitlines() if "YMIN" in l), 0.0)
        expect(target.stat().st_size > 20_000 and ydif > 80, f"frame {name} at {t:.1f}s has a full picture (saved as frames/{target.name})",
               f"frame {name} at {t:.1f}s looks blank (brightness {yavg:.0f}, contrast {ydif:.0f})")
    return finish()


def finish() -> int:
    verdict = "**All checks passed.**" if not failures else f"**{len(failures)} check(s) FAILED - do not publish this file.**"
    report.append(f"\n{verdict}\n")
    out = ROOT / "out" / "check-report.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(report) + "\n")
    print(("\nALL CHECKS PASSED" if not failures else f"\nCHECK FAILED ({len(failures)}): " + "; ".join(failures)), flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
