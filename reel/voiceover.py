"""Arabic voice-over for the reel: Modern Standard Arabic copy, read by a Kuwaiti voice.

Each line is synthesized separately (Microsoft neural TTS via edge-tts), trimmed,
and placed on its cue so it lands with the matching caption.
    python3 voiceover.py            -> vo-ar.wav (+ timing table)
Then mix it under the score:  python3 audio.py --vo vo-ar.wav --out soundtrack-ar-vo.wav
Requires edge-tts, numpy, scipy and ffmpeg.
"""
import asyncio
import os
import ssl
import subprocess
import sys

import certifi
import edge_tts
import edge_tts.communicate as _comm
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 30.0
VOICE = os.environ.get("VO_VOICE", "ar-KW-FahedNeural")  # ar-KW-NouraNeural for a female read
RATE, PITCH = "+4%", "-3Hz"

# (cue in seconds, line[, rate]). MSA wording kept light so it sits naturally in a Gulf read.
LINES = [
    (0.80, "عملك يستحق أفضل من هذا."),
    (4.10, "أدوات كثيرة."),
    (5.30, "بيانات مبعثرة."),
    (6.62, "ولا سيطرة."),
    (10.35, "تعرّف على فيلورسي."),
    (12.15, "منصة واحدة،"),
    (14.45, "لكل عملياتك، من الطلبات إلى الذكاء الاصطناعي.", "+14%"),
    (17.95, "وكل شيء متّصل."),
    (20.25, "أعمالك لا تسير فحسب،"),
    (22.40, "بل تزداد ذكاءً."),
    (25.20, "أدِر أعمالك من مكان واحد."),
    (27.62, "فيلورسي."),
    (28.42, "اكتشفها اليوم."),
]

# edge-tts pins certifi's bundle; trust the system/proxy bundle instead when one is configured.
_comm._SSL_CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or certifi.where())
CACHE = os.path.join(HERE, ".vo-cache")


async def synth(i, text, rate):
    mp3 = os.path.join(CACHE, f"{VOICE}_{rate}_{PITCH}_{i:02d}.mp3")
    marker = mp3 + ".txt"
    if not (os.path.exists(mp3) and os.path.exists(marker) and open(marker, encoding="utf-8").read() == text):
        await edge_tts.Communicate(text, VOICE, rate=rate, pitch=PITCH).save(mp3)
        open(marker, "w", encoding="utf-8").write(text)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(float)


def trim(x, thr_db=-45):
    env = np.convolve(np.abs(x), np.ones(240) / 240, "same")
    on = np.where(env > 10 ** (thr_db / 20))[0]
    if not len(on):
        return x
    a, b = max(0, on[0] - int(0.02 * SR)), min(len(x), on[-1] + int(0.06 * SR))
    return x[a:b]


def polish(x):
    """Broadcast-style chain: high-pass, gentle presence lift, smooth compression."""
    x = sosfilt(butter(2, 90 / (SR / 2), "high", output="sos"), x)
    pres = sosfilt(butter(2, [2500 / (SR / 2), 6000 / (SR / 2)], "band", output="sos"), x)
    x = x + 0.35 * pres
    env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, "same") + 1e-12)
    thr = 0.12
    g = np.where(env > thr, (thr / env) ** (1 - 1 / 3.0), 1.0)
    return x * g


async def main():
    os.makedirs(CACHE, exist_ok=True)
    track = np.zeros(int(SR * DUR))
    clips = [trim(await synth(i, ln[1], ln[2] if len(ln) > 2 else RATE)) for i, ln in enumerate(LINES)]
    print(f"voice: {VOICE}  rate {RATE}  pitch {PITCH}")
    ok = True
    for i, ((t0, text, *_), c) in enumerate(zip(LINES, clips)):
        end = t0 + len(c) / SR
        nxt = LINES[i + 1][0] if i + 1 < len(LINES) else DUR - 0.15
        flag = "" if end <= nxt else f"  <-- overlaps next cue by {end - nxt:.2f}s"
        ok &= not flag
        print(f"{t0:6.2f} -> {end:6.2f}  {text}{flag}")
        i0 = int(t0 * SR)
        n = min(len(c), len(track) - i0)
        track[i0:i0 + n] += c[:n]
    track = polish(track)
    track *= 0.89 / (np.max(np.abs(track)) + 1e-9)
    out = os.path.join(HERE, "vo-ar.wav")
    wavfile.write(out, SR, (track * 32767).astype(np.int16))
    print("wrote", out)
    if not ok:
        sys.exit("a line runs into the next cue: shorten it or raise RATE")


asyncio.run(main())
