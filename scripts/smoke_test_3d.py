#!/usr/bin/env python3
"""Short 3D test, run BEFORE the full render of a Short that uses WebGL (Three.js).

It renders a handful of half-size stills from the Short's test composition and fails if
  - any still is black, blank or nearly uniform (a WebGL failure on the runner), or
  - the mixer shaft does not actually end up inside the spoon's square socket.

The connection is measured from pixels, not assumed: two extra stills are rendered in a flat
"debug" colouring (spoon handle green, shaft magenta drawn on top). Before the connection the
magenta must end above the green; after it, the magenta must reach well down inside the green
and stay within its width.

Usage: python3 scripts/smoke_test_3d.py mcflurry-spoon
Stills are kept in out/3d-test/. Shorts without a "smokeTest" block in narration.json are skipped.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "3d-test"
SCALE = 0.5
failures: list[str] = []


def ok(msg: str) -> None:
    print(f"  PASS  {msg}", flush=True)


def bad(msg: str) -> None:
    print(f"::error::{msg}", flush=True)
    print(f"  FAIL  {msg}", flush=True)
    failures.append(msg)


def still(composition: str, frame: int, name: str, gl: str, debug: bool) -> np.ndarray | None:
    target = OUT / f"{name}.png"
    cmd = ["npx", "remotion", "still", composition, str(target), f"--frame={frame}", f"--scale={SCALE}", "--log=error"]
    if gl:
        cmd.append(f"--gl={gl}")
    if debug:
        cmd.append('--props={"debug":true}')
    if os.environ.get("REMOTION_BROWSER"):
        cmd.append(f"--browser-executable={os.environ['REMOTION_BROWSER']}")
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0 or not target.exists():
        bad(f"{name}: could not render frame {frame}: {(r.stderr or r.stdout).strip()[-500:]}")
        return None
    info = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(target)],
        capture_output=True, text=True, check=True,
    ).stdout.strip().split(",")
    w, h = int(info[0]), int(info[1])
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(target), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(h, w, 3).astype(np.int16)


def bbox(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(mask)
    if len(ys) < 40:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def main() -> int:
    short = sys.argv[1]
    cfg = json.loads((ROOT / "src" / "shorts" / short / "narration.json").read_text())
    test = cfg.get("smokeTest")
    if not test:
        print(f"[3d-test] {short} has no 3D test - skipped")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    comp, gl = test["composition"], cfg.get("gl", "")
    print(f"[3d-test] {comp} with WebGL renderer '{gl or 'default'}'", flush=True)

    # 1) Real materials: every key picture must contain an actual image.
    for name, frame in test["pictures"].items():
        img = still(comp, frame, name, gl, debug=False)
        if img is None:
            continue
        luma = img @ np.array([0.299, 0.587, 0.114])
        mean, spread = float(luma.mean()), float(luma.std())
        dark = float((luma < 12).mean())
        if dark > 0.6 or spread < 14 or mean < 25 or mean > 240:
            bad(f"{name} (frame {frame}) looks black or blank: brightness {mean:.0f}, contrast {spread:.0f}, {dark * 100:.0f}% black")
        else:
            ok(f"{name} (frame {frame}) rendered through WebGL: brightness {mean:.0f}, contrast {spread:.0f}")

    # 2) Flat colours: measure whether the shaft is inside the socket.
    def measure(frame: int, name: str):
        img = still(comp, frame, name, gl, debug=True)
        if img is None:
            return None
        r, g, b = img[..., 0], img[..., 1], img[..., 2]
        green = bbox((g > 170) & (r < 100) & (b < 100))
        magenta = bbox((r > 170) & (b > 170) & (g < 100))
        return green, magenta

    apart = measure(test["apartFrame"], "debug-apart")
    joined = measure(test["connectedFrame"], "debug-connected")
    if apart and joined:
        (g0, m0), (g1, m1) = apart, joined
        if not g0 or not m0 or not g1 or not m1:
            bad(f"debug stills do not show both parts (spoon {g0}/{g1}, shaft {m0}/{m1})")
        else:
            lip = g1[2] - g1[0]  # on-screen width of the socket's rim
            gap = g0[1] - m0[3]
            depth = m1[3] - g1[1]
            inside = m1[0] >= g1[0] - 2 and m1[2] <= g1[2] + 2
            if gap > 0:
                ok(f"before the connection the shaft tip is {gap}px above the socket (frame {test['apartFrame']})")
            else:
                bad(f"before the connection the shaft already overlaps the socket by {-gap}px")
            if depth >= 0.5 * lip and inside:
                ok(f"shaft and socket connect: the shaft sits {depth}px deep inside the socket (rim is {lip}px wide) and within its walls (frame {test['connectedFrame']})")
            else:
                bad(f"shaft is not seated in the socket: depth {depth}px, rim {lip}px, inside walls: {inside}")

    print("\n3D TEST PASSED" if not failures else f"\n3D TEST FAILED ({len(failures)}): " + "; ".join(failures), flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
