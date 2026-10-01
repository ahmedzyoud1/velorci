"""Synthesizes the Velorci reel soundtrack (soundtrack.wav, 48 kHz stereo).

Every cue is read from timeline.js, so the sound lands on the same frames as
the picture. Nothing is sampled: drums, synths, UI sounds, impacts and the
reverb are all generated here.   python3 audio.py
With a voice-over (voiceover.py) the score ducks under it:
    python3 audio.py --vo vo-ar.wav --out soundtrack-ar-vo.wav
Requires numpy, scipy, pyloudnorm.
"""
import argparse
import json
import os
import re

import numpy as np
import pyloudnorm as pyln
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, fftconvolve, istft, lfilter, sosfilt, stft

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--vo", help="voice-over wav (48 kHz) to mix over the score")
ap.add_argument("--out", default="soundtrack.wav")
ARGS = ap.parse_args()
TL = json.loads(re.search(r"=\s*(\{.*\})\s*;", open(os.path.join(HERE, "timeline.js")).read(), re.S).group(1))
SR = 48000
DUR = TL["duration"]
N = int(SR * DUR)
rs = np.random.default_rng(7)

# ------------------------------------------------------------------ buses
# Two bus sets: everything before the freeze (8.0 s) is cut dead, reverb tails included.
SETS = {k: {b: np.zeros((2, N)) for b in ("sfx", "ui", "drums", "music", "send_s", "send_l")} for k in ("pre", "post")}
CUR = {"set": "pre"}


def add(bus, sig, t0, gain=1.0, pan=0.0, send_s=0.0, send_l=0.0):
    """Mix a mono or stereo signal into a bus at time t0 (seconds)."""
    sig = np.asarray(sig, float)
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    i0 = int(round(t0 * SR))
    if i0 < 0:
        sig, i0 = sig[:, -i0:], 0
    n = min(sig.shape[1], N - i0)
    if n <= 0:
        return
    s = sig[:, :n] * gain
    B = SETS[CUR["set"]]
    B[bus][:, i0:i0 + n] += s
    if send_s:
        B["send_s"][:, i0:i0 + n] += s * send_s
    if send_l:
        B["send_l"][:, i0:i0 + n] += s * send_l


def T(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), "low", output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), "high", output="sos"), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], "band", output="sos"), x)


def noise(d):
    return rs.standard_normal(int(d * SR))


def phase(freq):
    """Integrate an instantaneous-frequency array into phase."""
    return 2 * np.pi * np.cumsum(freq) / SR


def additive_saw(freq, n_harm=10, bright=None):
    """Band-limited saw (additive). bright: per-sample 0..1 harmonic roll-off."""
    ph = phase(freq)
    out = np.zeros_like(ph)
    for k in range(1, n_harm + 1):
        amp = 1.0 / k
        if bright is not None:
            amp = amp * np.exp(-(k - 1) * (1.0 - bright) * 1.2)
        nyq_ok = (freq * k) < SR / 2 - 500
        out += amp * np.sin(k * ph) * nyq_ok
    return out


def adsr(n, a, d, s, r, total=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    total = n if total is None else total
    env = np.full(total, s, float)
    env[:a] = np.linspace(0, 1, a, endpoint=False) if a else env[:a]
    env[a:a + d] = np.linspace(1, s, d, endpoint=False)[: max(0, min(d, total - a))]
    if r:
        env[-r:] *= np.linspace(1, 0, r)
    return env


def spectral_sweep(x, centers, bw_oct=0.6, gains=None):
    """Time-varying band-pass via STFT mask. centers: frequency per frame."""
    f, t, Z = stft(x, SR, nperseg=1024, noverlap=768)
    c = np.interp(t, np.linspace(0, t[-1] if len(t) > 1 else 1, len(centers)), centers)
    lf = np.log2(np.maximum(f, 1))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(c)[None, :]) / bw_oct) ** 2)
    if gains is not None:
        mask *= np.interp(t, np.linspace(0, t[-1], len(gains)), gains)[None, :]
    _, y = istft(Z * mask, SR, nperseg=1024, noverlap=768)
    return y[: len(x)]


# ------------------------------------------------------------------ instruments
def kick(gain=1.0, tone=1.0):
    t = T(0.55)
    f = 44 + 120 * np.exp(-t / 0.028) + 20 * np.exp(-t / 0.2)
    body = np.sin(phase(f)) * np.exp(-t / 0.30)
    click = hp(noise(0.006), 3000) * np.linspace(1, 0, int(0.006 * SR)) * 0.35
    body[: len(click)] += click * tone
    return np.tanh(body * 1.6) * gain


def clap():
    t = T(0.35)
    n = noise(0.35)
    env = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        env += (t >= o) * np.exp(-np.maximum(t - o, 0) / 0.006)
    env += (t >= 0.03) * np.exp(-np.maximum(t - 0.03, 0) / 0.11) * 0.6
    return bp(n, 900, 4200) * env * 0.9


def hat(open_=False):
    d = 0.32 if open_ else 0.06
    t = T(d)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (3135, 4186, 5274, 6271, 7040, 8372)) / 6
    s = hp(0.6 * noise(d) + 0.4 * metal, 7000)
    return s * np.exp(-t / (0.11 if open_ else 0.018))


def crash(d=2.2):
    t = T(d)
    s = hp(noise(d), 3800) * np.exp(-t / 0.75)
    s += 0.3 * hp(noise(d), 9000) * np.exp(-t / 0.25)
    return np.vstack([s, hp(noise(d), 3800) * np.exp(-t / 0.75)]) * 0.5


def sub_drop(f0, f1, d, tau):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t / (d * 0.35))
    return np.sin(phase(f)) * np.exp(-t / tau)


def impact(big=1.0):
    d = 3.2 * big
    t = T(d)
    s = sub_drop(95, 30, d, 1.1 * big) * 1.0
    s += sub_drop(160, 55, d, 0.22) * 0.6
    burst = lp(noise(d), 2400) * np.exp(-t / 0.18) * 0.55
    s += burst
    return np.tanh(s * 1.4)


def whoosh(d, f0=300, f1=3500, peak=0.6):
    n = noise(d)
    k = np.linspace(0, 1, 200)
    centers = f0 * (f1 / f0) ** k
    env = np.where(k < peak, (k / peak) ** 2, ((1 - k) / (1 - peak)) ** 1.5)
    return spectral_sweep(n, centers, 0.5, env) * 1.6


def riser(d, f0=200, f1=5000, tone=True):
    t = T(d)
    u = t / d
    n = spectral_sweep(noise(d), f0 * (f1 / f0) ** np.linspace(0, 1, 200), 0.7, np.linspace(0, 1, 200) ** 2.2)
    s = n * 1.4
    if tone:
        f = 110 * (8 ** (u ** 1.6))
        s += 0.25 * additive_saw(f, 6) * u ** 2.5
    return s


def reverse_cymbal(d):
    c = crash(d)[0][::-1]
    return c * np.linspace(0, 1, len(c)) ** 2


def bell(m, d=1.6, bright=1.0):
    t = T(d)
    f = mtof(m)
    idx = 2.2 * bright * np.exp(-t / 0.25)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t))
    s += 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.3)
    return s * np.exp(-t / (d * 0.35)) * np.minimum(1, t / 0.002)


def pluck(m, d=0.45, bright=0.9):
    t = T(d)
    f = np.full(len(t), mtof(m))
    br = np.clip(bright * np.exp(-t / 0.09), 0, 1)
    s = additive_saw(f, 12, br)
    return s * np.exp(-t / 0.16) * np.minimum(1, t / 0.003)


def pad(notes, d, cutoff=1600, attack=0.6, release=0.8):
    t = T(d)
    s = np.zeros((2, len(t)))
    for i, m in enumerate(notes):
        for j, det in enumerate((-0.09, 0.0, 0.08)):
            f = np.full(len(t), mtof(m + det)) * (1 + 0.002 * np.sin(2 * np.pi * (0.3 + 0.1 * j) * t + i))
            v = additive_saw(f, 10)
            s[(i + j) % 2] += v * 0.6
            s[(i + j + 1) % 2] += v * 0.4
    s = np.vstack([lp(s[0], cutoff), lp(s[1], cutoff)])
    env = adsr(len(t), attack, 0.4, 0.85, release)
    return s * env / (len(notes) * 2.2)


def bass_note(m, d):
    t = T(d)
    f = np.full(len(t), mtof(m))
    s = 0.55 * np.sin(phase(f)) + 0.4 * lp(additive_saw(f * 2, 8), 900)
    return s * adsr(len(t), 0.004, 0.08, 0.8, 0.04)


# UI / notification sounds (generic, synthesized)
def ui_pop(f=900):
    t = T(0.09)
    fr = f * (1 + 0.6 * np.exp(-t / 0.012))
    return np.sin(phase(fr)) * np.exp(-t / 0.03)


def ui_ping(f1, f2=None, d=0.35):
    t = T(d)
    s = np.sin(2 * np.pi * f1 * t) * np.exp(-t / 0.09)
    if f2:
        off = int(0.07 * SR)
        t2 = np.arange(len(s) - off) / SR
        s[off:] += np.sin(2 * np.pi * f2 * t2) * np.exp(-t2 / 0.12)
    s += 0.2 * np.sin(2 * np.pi * f1 * 2.01 * t) * np.exp(-t / 0.04)
    return s * np.minimum(1, t / 0.0015)


def ui_alert():
    t = T(0.42)
    f = np.where(t < 0.12, 740, 587)
    s = lp(np.sign(np.sin(phase(f))) * 0.5 + np.sin(phase(f)), 2500)
    env = np.where(t < 0.12, np.exp(-t / 0.05), np.exp(-(t - 0.12) / 0.09))
    return s * env * 0.6


def ui_buzz():
    t = T(0.42)
    am = ((t % 0.21) < 0.15).astype(float)
    s = lp(np.sign(np.sin(2 * np.pi * 168 * t)), 600) * am
    return s * 0.5


def ui_tick():
    t = T(0.03)
    return hp(noise(0.03), 2500) * np.exp(-t / 0.004) + 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.006)


def hit(gain=1.0):
    t = T(0.9)
    s = sub_drop(110, 42, 0.9, 0.22) * 0.9
    s += bp(noise(0.9), 300, 3500) * np.exp(-t / 0.05) * 0.5
    return np.tanh(s * 1.5) * gain


# ------------------------------------------------------------------ helpers for the score
def chord_at(t):
    seq = [(10.0, "Am"), (12.0, "Am"), (14.0, "F"), (16.0, "C"), (18.0, "G"), (20.0, "Am"), (22.0, "F"), (24.0, "C"), (26.0, "G")]
    c = "Am"
    for s, n in seq:
        if t >= s - 1e-6:
            c = n
    return c


PADV = {"Am": [45, 52, 57, 60, 64, 71], "F": [41, 48, 53, 57, 60, 64], "C": [48, 55, 60, 62, 64, 67], "G": [43, 50, 55, 59, 62, 64]}
ROOT = {"Am": 33, "F": 29, "C": 36, "G": 31}
ARP = {"Am": [69, 72, 76, 79, 83], "F": [65, 69, 72, 76, 79], "C": [67, 72, 74, 76, 79], "G": [67, 71, 74, 79, 81]}
ARP_IDX = [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 4, 3, 1, 2, 4, 2]
BEAT = 60 / TL["bpm"]

# ================================================================== SCORE
# ---- 0–8 s: chaos bed ------------------------------------------------
t = T(8.0)
u = t / 8.0
room = lp(noise(8.0), 500) * 0.05
drone_f = np.full(len(t), mtof(33))
drone = 0.3 * np.sin(phase(drone_f)) + 0.35 * additive_saw(np.full(len(t), mtof(45) * 1.003), 10, np.clip(0.2 + 0.6 * u, 0, 1))
drone += (t > 4.0) * 0.28 * additive_saw(np.full(len(t), mtof(46)), 8, 0.5 * np.ones(len(t)))
drone = lp(drone, 900)
whine = (np.sin(2 * np.pi * mtof(81) * t) + np.sin(2 * np.pi * mtof(82) * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t)) * 0.03 * u ** 2
bed = (drone * (0.1 + 0.3 * u ** 1.5) + room + whine)
bed[-int(0.008 * SR):] *= np.linspace(1, 0, int(0.008 * SR))  # hard stop at the freeze
add("sfx", np.vstack([bed, np.roll(bed, 240)]), 0.0, gain=0.8)

# heartbeat pulses, accelerating
hb = 0.4
while hb < 7.9:
    add("sfx", kick(0.55, tone=0.0), hb, gain=0.5 + 0.4 * hb / 8)
    add("sfx", kick(0.4, tone=0.0), hb + 0.16, gain=0.35 + 0.3 * hb / 8)
    hb += max(0.42, 1.0 - hb * 0.08)

KIND_SOUND = {"order": "chime", "msg": "pop", "dm": "pop", "driver": "ping", "fail": "alert", "refund": "alert", "call": "buzz",
              "inv": "alert", "sync": "alert", "stock": "ping", "price": "ping", "review": "ping"}
TOAST_KINDS = ["order", "msg", "fail", "stock", "dm", "refund", "call", "inv", "sync", "order", "msg", "driver", "stock", "order",
               "fail", "dm", "fail", "price", "review", "msg", "sync", "order"]


def notify(kind, t0, gain, pan):
    s = KIND_SOUND[kind]
    if s == "chime":
        add("ui", ui_ping(1318, 1976), t0, gain * 0.5, pan, send_s=0.25)
    elif s == "pop":
        add("ui", ui_pop(820 + 300 * rs.random()), t0, gain * 0.7, pan, send_s=0.2)
        add("ui", ui_pop(1150), t0 + 0.06, gain * 0.4, pan)
    elif s == "ping":
        add("ui", ui_ping(1567 + 200 * rs.random()), t0, gain * 0.45, pan, send_s=0.25)
    elif s == "alert":
        add("ui", ui_alert(), t0, gain * 0.42, pan, send_s=0.15)
    elif s == "buzz":
        add("ui", ui_buzz(), t0, gain * 0.5, pan)


for i, t0 in enumerate(TL["toasts"]):
    notify(TOAST_KINDS[i % len(TOAST_KINDS)], t0, 0.55 + 0.45 * t0 / 4, rs.uniform(-0.7, 0.7))
for t0 in TL["chatPops"]:
    add("ui", ui_pop(760), t0, 0.45, -0.35, send_s=0.2)

# ---- 4–8 s: the problem ------------------------------------------------
for i, c in enumerate(TL["cuts"]):
    add("sfx", whoosh(0.22, 600, 5000, 0.9), c - 0.22, 0.35, (-1) ** i * 0.4)
    add("sfx", hit(1.0), c, 0.9 if i < 5 else 1.1, 0.0, send_l=0.25)
for t0, kind in zip([4.25, 4.85, 5.45, 6.0], ["order", "sync", "sync", "inv"]):
    notify(kind, t0, 0.8, rs.uniform(-0.5, 0.5))
for i, t0 in enumerate(TL["burst"]):
    add("ui", ui_pop(700 + 900 * rs.random()), t0, 0.5 + 0.02 * i, rs.uniform(-0.9, 0.9), send_s=0.15)
    if i % 3 == 0:
        add("ui", ui_ping(1400 + 600 * rs.random()), t0 + 0.01, 0.25, rs.uniform(-0.9, 0.9))
# glitch stutter on the burst
g = ui_ping(1760)[: int(0.035 * SR)]
for k in range(14):
    add("ui", g * (0.3 + 0.03 * k), 6.36 + k * 0.042, 1.0, (-1) ** k * 0.6)
# tension riser into the freeze, with accelerating ticks
add("sfx", riser(1.0, 300, 7000), 7.0, 0.55, send_l=0.2)
tk, step = 7.0, 0.16
while tk < 7.97:
    add("ui", ui_tick(), tk, 0.35 + 0.4 * (tk - 7.0), (-1) ** int(tk * 40) * 0.3)
    tk += step
    step = max(0.04, step * 0.86)

# ---- 8.0: freeze --------------------------------------------------------
CUR["set"] = "post"
fz = TL["freeze"]
tt = T(2.6)
ring = (np.sin(2 * np.pi * mtof(100) * tt) + 0.6 * np.sin(2 * np.pi * mtof(107) * tt)) * np.exp(-tt / 0.9) * 0.05
add("sfx", ring, fz, 1.0, 0.0, send_l=0.6)
add("sfx", sub_drop(70, 38, 0.8, 0.35) * 0.6, fz, 0.7)
add("sfx", lp(noise(0.25), 600) * np.exp(-T(0.25) / 0.05), fz, 0.5, send_l=0.5)
hum = np.sin(2 * np.pi * 41 * T(2.0)) * adsr(int(2.0 * SR), 0.2, 0.1, 1, 0.3) * 0.06
add("sfx", hum, fz, 1.0)

# ---- 8.6–10: everything is pulled in --------------------------------------
p0, p1 = TL["pull"]
d = TL["reveal"] - p0
suck = spectral_sweep(noise(d), 150 * (40 ** (np.linspace(0, 1, 200) ** 1.5)), 0.6, np.linspace(0, 1, 200) ** 2.6) * 1.6
tt = T(d)
suck += 0.2 * additive_saw(70 * (6 ** (tt / d) ** 2), 8) * (tt / d) ** 3
add("sfx", np.vstack([suck, np.roll(suck, 400)]), p0, 0.75, send_l=0.3)
for k in range(9):
    add("sfx", whoosh(0.35, 400, 4000, 0.85), p0 + 0.15 + k * 0.13, 0.12 + 0.03 * k, (-1) ** k * 0.7)
add("sfx", reverse_cymbal(1.2), TL["reveal"] - 1.2, 0.5)

# ---- 10.0: reveal --------------------------------------------------------
rv = TL["reveal"]
add("sfx", impact(1.0), rv, 1.0, send_l=0.35)
add("sfx", crash(3.0), rv, 0.55, send_l=0.4)
for k, m in enumerate([69, 76, 83, 88]):
    add("music", bell(m, 2.5, 0.8), rv + 0.02 + k * 0.03, 0.08, (-1) ** k * 0.4, send_l=0.7)
add("music", pad(PADV["Am"], 2.2, 1100, attack=0.35, release=0.6), rv, 0.9, send_l=0.35)
for k, m in enumerate([69, 72, 76, 83]):  # logo sting under "Meet Velorci."
    add("music", pluck(m, 0.8, 0.7), 10.35 + k * 0.09, 0.16, (-1) ** k * 0.3, send_l=0.5)

# ---- 10.5–12: build to the drop ------------------------------------------
for b in np.arange(10.5, 11.95, BEAT):
    add("drums", lp(kick(0.8), 260), b, 0.5 + 0.4 * (b - 10.5))
for k, s16 in enumerate(np.arange(11.0, 11.95, BEAT / 4)):
    add("drums", hat(), s16, 0.06 + 0.12 * k / 16, 0.25 * (-1) ** k)
add("sfx", riser(1.0, 250, 9000), 11.0, 0.45, send_l=0.2)
add("sfx", reverse_cymbal(0.9), 12.0 - 0.9, 0.45)

# ---- groove 12–27 ---------------------------------------------------------
kick_times = []


def groove(t0, t1, half=False, full=True):
    b = t0
    i = 0
    while b < t1 - 1e-6:
        beat_in_bar = i % 4
        if not half or beat_in_bar in (0, 2):
            add("drums", kick(1.0), b, 1.0)
            kick_times.append(b)
        if full and beat_in_bar in (1, 3) and not half:
            add("drums", clap(), b, 0.55, 0.0, send_s=0.35)
        if half and beat_in_bar == 2:
            add("drums", clap(), b, 0.45, 0.0, send_s=0.5)
        for k in range(4):
            hv = (0.11 if k == 2 else 0.06) * (0.7 if half else 1.0)
            add("drums", hat(open_=(k == 2 and full and not half)), b + k * BEAT / 4, hv * (1.4 if k == 2 else 1), 0.3 * (-1) ** k)
        # pumping off-beat bass
        c = chord_at(b)
        if half:
            if beat_in_bar == 0:
                add("music", bass_note(ROOT[c] + 12, BEAT * 2 - 0.02), b, 0.55)
        else:
            add("music", bass_note(ROOT[c] + 12, BEAT / 2 - 0.01), b + BEAT / 2, 0.6)
            add("music", bass_note(ROOT[c], BEAT / 2 - 0.01), b + BEAT / 2, 0.35)
        # arpeggio, 16ths
        for k in range(4):
            step = (i * 4 + k) % 16
            m = ARP[c][ARP_IDX[step]] + (12 if half else 0)
            acc = 1.0 if k == 0 else 0.7
            add("music", pluck(m, 0.4, 0.85), b + k * BEAT / 4, 0.085 * acc, 0.35 * (-1) ** step, send_s=0.15, send_l=0.12)
        b += BEAT
        i += 1


groove(12.0, 20.0)
groove(20.0, 22.0, half=True)
groove(22.0, 24.0)
groove(24.0, 27.0)
for s, e in [(12.0, 14.0), (14.0, 16.0), (16.0, 18.0), (18.0, 20.0), (20.0, 22.0), (22.0, 24.0), (24.0, 26.0), (26.0, 27.0)]:
    add("music", pad(PADV[chord_at(s)], e - s + 0.25, 1500 if s < 20 or s >= 22 else 2600, attack=0.08, release=0.25), s, 0.75, send_l=0.25)
for c0 in (12.0, 24.0):
    add("drums", crash(2.2), c0, 0.42, send_l=0.2)
add("sfx", hit(0.8), 12.0, 0.6)

# module switches: a swoosh during each camera move, a tick on arrival
for k, a in enumerate(TL["modules"]):
    if k:
        add("sfx", whoosh(0.32, 500, 6000, 0.75), a - 0.32, 0.22, 0.6 if k % 2 else -0.6)
    add("ui", ui_tick(), a, 0.3, 0.0)

# 17.0: pull back into the network; lines connect; pulses
nt = TL["network"]
add("sfx", whoosh(0.5, 4000, 300, 0.2), nt - 0.1, 0.4)
add("sfx", hit(0.7), nt, 0.45, send_l=0.3)
l0, l1 = TL["lines"]
scale_c = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86]
for k, m in enumerate(scale_c):
    add("music", bell(m + 12, 0.9, 0.6), l0 + k * (l1 - l0) / len(scale_c), 0.06, -0.8 + 1.6 * k / 11, send_l=0.4)
add("ui", ui_ping(2093, 2637), l1, 0.25, 0.0, send_l=0.4)

# 19.6–20.0: push into the core
cp0, cp1 = TL["corePush"]
add("sfx", riser(cp1 - cp0 + 0.15, 400, 9000, tone=True), cp0 - 0.15, 0.5)
add("sfx", impact(0.6), TL["ai"], 0.55, send_l=0.3)

# ---- 20–24: AI ------------------------------------------------------------
s0, s1 = TL["scan"]
dd = s1 - s0
scan = spectral_sweep(noise(dd), 400 * (12 ** np.linspace(0, 1, 200)), 0.25, np.sin(np.linspace(0, np.pi, 200)) ** 0.6) * 1.8
add("sfx", np.vstack([scan, scan[::-1] * 0.0 + np.roll(scan, 300)]), s0, 0.35, send_l=0.25)
for k in range(int(dd / 0.03)):
    add("ui", ui_pop(2200 + 1800 * rs.random()) * 0.4, s0 + k * 0.03, 0.12, rs.uniform(-0.8, 0.8))
for k, (t0, m) in enumerate(zip(TL["signals"], [76, 81, 84, 88])):
    add("music", bell(m, 1.8, 1.0), t0, 0.16, (-1) ** k * 0.35, send_l=0.45)
    add("ui", ui_tick(), t0, 0.35)
add("sfx", reverse_cymbal(0.5), 22.0 - 0.5, 0.35)
add("sfx", riser(1.0, 300, 8000), 23.0, 0.4, send_l=0.2)
add("sfx", reverse_cymbal(0.8), 24.0 - 0.8, 0.4)

# ---- 24–27: hero ------------------------------------------------------------
for k, m in enumerate([76, 74, 72, 79, 76, 74]):  # simple lead motif over C -> G
    add("music", bell(m, 1.0, 0.5), 24.0 + k * 0.5, 0.07, 0.2 * (-1) ** k, send_l=0.4)

# ---- 27–30: impact + logo ----------------------------------------------------
im = TL["impact"]
add("sfx", reverse_cymbal(0.5), im - 0.5, 0.55)
add("sfx", riser(0.5, 800, 12000, tone=False), im - 0.5, 0.35)
add("sfx", impact(1.25), im, 1.15, send_l=0.4)
add("sfx", crash(3.0), im, 0.5, send_l=0.5)
final = [36, 43, 52, 62, 67, 72, 76]  # C add9, wide voicing
add("music", pad(final, DUR - im, 2400, attack=0.05, release=1.6), im, 1.1, send_l=0.5)
for k, m in enumerate([79, 84, 88]):  # logo sting as the mark draws itself
    add("music", bell(m, 2.4, 0.9), im + 0.04 + k * 0.11, 0.13, (k - 1) * 0.4, send_l=0.7)
add("ui", ui_ping(1976, 2637), TL["cta"], 0.22, 0.0, send_l=0.4)
sh = whoosh(0.5, 3000, 12000, 0.5)
add("ui", sh, 29.0, 0.12, 0.0)

# ================================================================== MIX
# sidechain the music bus to the kick
BUS = SETS["post"]
duck = np.ones(N)
for k in kick_times:
    i0 = int(k * SR)
    n = min(int(0.32 * SR), N - i0)
    duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], 1 - 0.55 * np.exp(-np.arange(n) / SR / 0.09))
BUS["music"] *= duck


def make_ir(rt, pre=0.02, damp=6000):
    d = rt * 1.2
    tt = T(d)
    ir = np.zeros((2, len(tt)))
    for c in range(2):
        nn = rs.standard_normal(len(tt)) * np.exp(-6.9 * tt / rt)
        lo = lp(nn, damp, 1)
        ir[c] = 0.6 * lo + 0.4 * lp(nn, damp * 0.35, 1) * np.minimum(1, tt / 0.3)
    p = int(pre * SR)
    ir = np.hstack([np.zeros((2, p)), ir])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, ir):
    return np.vstack([fftconvolve(x[0], ir[0])[:N], fftconvolve(x[1], ir[1])[:N]])


IR_S, IR_L = make_ir(1.1, 0.012, 7000), make_ir(3.4, 0.03, 5000)


def render_set(B):
    wet_s = reverb(B["send_s"], IR_S) * 0.35
    wet_l = reverb(B["send_l"], IR_L) * 0.4
    echo = np.zeros_like(wet_s)  # stereo echo on the short send, for width
    dly = int(0.375 * SR)
    echo[0, dly:] = wet_s[1, :-dly] * 0.5
    echo[1, 2 * dly:] = wet_s[0, :-2 * dly] * 0.35
    return B["sfx"] * 1.0 + B["ui"] * 1.0 + B["drums"] * 0.62 + B["music"] * 0.6 + wet_s + wet_l + echo


gate = np.ones(N)
f_i = int(TL["freeze"] * SR)
gate[f_i - int(0.008 * SR):f_i] = np.linspace(1, 0, int(0.008 * SR))
gate[f_i:] = 0
mix = render_set(SETS["pre"]) * gate + render_set(SETS["post"])
mix = np.vstack([hp(mix[0], 32), hp(mix[1], 32)])

# glue compression (RMS detector)
lvl = np.sqrt(lfilter([0.002], [1, -0.998], np.mean(mix ** 2, axis=0)) + 1e-12)
thr = 0.35
gr = np.where(lvl > thr, (thr / lvl) ** (1 - 1 / 1.6), 1.0)
mix *= gr

# voice-over: duck the score ~8 dB under speech, sit the voice on top with a touch of room
if ARGS.vo:
    _, vo = wavfile.read(os.path.join(HERE, ARGS.vo) if not os.path.isabs(ARGS.vo) else ARGS.vo)
    vo = vo.astype(float) / 32767
    vo = (vo.mean(axis=1) if vo.ndim > 1 else vo)[:N]
    vo = np.pad(vo, (0, N - len(vo)))
    env = np.abs(vo)
    att = lfilter([1 - np.exp(-1 / (0.02 * SR))], [1, -np.exp(-1 / (0.02 * SR))], env)
    env = att
    env = minimum_filter1d(-env, size=int(0.12 * SR)) * -1          # hold through syllable gaps
    env = lfilter([1 - np.exp(-1 / (0.18 * SR))], [1, -np.exp(-1 / (0.18 * SR))], env)  # smooth release
    env = np.clip(env / (np.percentile(env[env > 1e-4], 90) + 1e-9), 0, 1)
    mix *= 1 - 0.6 * env
    speech = np.abs(vo) > 0.02
    k = 1.15 * np.sqrt(np.mean(mix ** 2)) / (np.sqrt(np.mean(vo[speech] ** 2)) + 1e-9)
    vo_st = np.vstack([vo, vo]) * k
    mix += vo_st + reverb(vo_st * 0.12, make_ir(0.5, 0.008, 6000))

# loudness to -14 LUFS, then a look-ahead peak limiter at -1 dBFS
meter = pyln.Meter(SR)
loud = meter.integrated_loudness(mix.T)
mix *= 10 ** ((-14.0 - loud) / 20)
ceil = 10 ** (-1.2 / 20)
need = np.minimum(1.0, ceil / (np.max(np.abs(mix), axis=0) + 1e-12))
look = int(0.004 * SR)
need = minimum_filter1d(need, size=2 * look + 1)
g = lfilter([0.02], [1, -0.98], need - 1) + 1  # smoothed gain-reduction
g = np.minimum(g, need)
mix *= g
mix = np.clip(mix, -ceil, ceil)
fade = int(0.35 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5

print("integrated loudness after limiter: %.1f LUFS" % meter.integrated_loudness(mix.T))
out = os.path.join(HERE, ARGS.out)
wavfile.write(out, SR, (mix.T * 32767).astype(np.int16))
print("wrote", out)
