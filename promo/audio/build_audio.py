"""Builds the audio for the velorci 30s ad.

    python build_audio.py                  -> out/music.wav, out/sfx.wav, out/mix_music.wav
    python build_audio.py --vo vo.wav      -> also out/mix_vo.wav (music ducked under a recorded VO)
    python build_audio.py --guide-vo       -> synthesises a scratch guide VO with Piper first (timing only)

The music is synthesised here (no samples, no licences): 150 BPM, A minor, one bar = 1.6 s,
so every feature cut in index.html (4.0 + 1.6n) and the logo hit (26.4 s) land on a downbeat.
"""
import argparse
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 30.0
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
rng = np.random.default_rng(7)

BEAT = 0.4                 # 150 BPM
BAR = 4 * BEAT
GRID0 = 0.8                # first downbeat; bars start at 0.8 + 1.6k
LOGO = 26.4
SCENES = [4.0, 10.4, 16.8, 24.8]
FEATURES = [4.0 + 1.6 * i for i in range(13)]


def bar_start(k):
    return GRID0 + BAR * k


# ---------------------------------------------------------------- helpers
def buf():
    return np.zeros((2, N))


def place(dst, x, t, gain=1.0, pan=0.0):
    """Mix mono or stereo x into dst at time t with equal-power pan."""
    i = int(round(t * SR))
    if i >= N:
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.vstack([x * l * 1.414, x * r * 1.414])
    j = min(N, i + x.shape[1])
    s = max(0, -i)
    dst[:, max(i, 0):j] += gain * x[:, s:j - i]


def tvec(d):
    return np.arange(int(d * SR)) / SR


def env_adsr(d, a=0.005, dcy=0.1, s=0.7, r=0.1):
    n = int(d * SR)
    e = np.full(n, float(s))
    na, nd, nr = int(a * SR), int(dcy * SR), int(r * SR)
    na = max(1, min(na, n))
    e[:na] = np.linspace(0, 1, na)
    nd = min(nd, n - na)
    e[na:na + nd] = np.linspace(1, s, nd)
    if nr > 0 and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(f, d, detune=0.0):
    t = tvec(d)
    out = np.zeros_like(t)
    ff = f * (1 + detune)
    nh = max(1, int(14000 / ff))
    ph = rng.uniform(0, 2 * np.pi)
    for h in range(1, min(nh, 60) + 1):
        out += np.sin(2 * np.pi * ff * h * t + ph * h) / h
    return out * 0.6


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def sweep_lp(x, f0, f1, block=256):
    """Time-varying low-pass (exponential cutoff sweep), state carried between blocks."""
    y = np.zeros_like(x)
    zi = None
    nb = int(np.ceil(x.shape[-1] / block))
    for b in range(nb):
        fc = f0 * (f1 / f0) ** (b / max(1, nb - 1))
        sos = signal.butter(2, min(fc, SR / 2 - 200) / (SR / 2), 'low', output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2)) if x.ndim == 1 else np.zeros((sos.shape[0], x.shape[0], 2))
        seg = x[..., b * block:(b + 1) * block]
        out, zi = signal.sosfilt(sos, seg, axis=-1, zi=zi)
        y[..., b * block:(b + 1) * block] = out
    return y


def reverb_ir(d=2.2, decay=3.2):
    t = tvec(d)
    ir = np.vstack([rng.standard_normal(len(t)), rng.standard_normal(len(t))]) * np.exp(-decay * t)
    ir = lp(ir, 6000)
    ir[:, :int(0.012 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) * 0.35


def reverb(x, ir):
    if x.ndim == 1:
        x = np.vstack([x, x])
    return np.vstack([signal.fftconvolve(x[0], ir[0])[:N], signal.fftconvolve(x[1], ir[1])[:N]])


# ---------------------------------------------------------------- instruments
def kick(d=0.45):
    t = tvec(d)
    f = 45 + 110 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.22)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.004) * 0.25
    return np.tanh(1.6 * (body + click))


def clap(d=0.3):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    e = np.zeros_like(t)
    for o in (0.0, 0.011, 0.022):
        m = t >= o
        e[m] += np.exp(-(t[m] - o) / (0.012 if o < 0.02 else 0.11))
    return bp(n * e, 900, 4500) * 1.2


def hat(d=0.06, open_=False):
    t = tvec(0.25 if open_ else d)
    x = hp(rng.standard_normal(len(t)), 7500, 4)
    return x * np.exp(-t / (0.09 if open_ else 0.018))


def snare(d=0.2):
    t = tvec(d)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    nz = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t / 0.08)
    return tone * 0.5 + nz


def pluck(f, d=0.28, bright=2600):
    t = tvec(d)
    x = saw(f, d) + 0.4 * saw(f, d, 0.004)
    x = sweep_lp(x, bright, 400)
    return x * np.exp(-t / 0.11)


def bell(f, d=1.2):
    t = tvec(d)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.15) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.06)
    return x * np.exp(-t / 0.35) * env_adsr(d, 0.002, 0.01, 1, 0.05)


def pad_chord(freqs, d, fc=1600):
    out = np.zeros((2, int(d * SR)))
    for f in freqs:
        for k, dt in enumerate((-0.006, 0.0, 0.007)):
            v = saw(f, d, dt)
            pan = (-0.6, 0.0, 0.6)[k]
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            out[0] += v * l
            out[1] += v * r
    out = lp(out, fc)
    return out * env_adsr(d, 0.18, 0.3, 0.85, 0.35) / (len(freqs) * 2.2)


def bass_note(f, d):
    t = tvec(d)
    x = saw(f, d) * 0.7 + np.sin(2 * np.pi * f * t) * 0.9
    x = lp(x, 520)
    return np.tanh(1.4 * x) * env_adsr(d, 0.004, 0.06, 0.8, 0.03)


def noise_riser(d, f0=400, f1=9000):
    x = rng.standard_normal(int(d * SR))
    x = sweep_lp(x, f0, f1)
    return x * np.linspace(0, 1, len(x)) ** 2


def whoosh(d=0.7):
    """Band sweep that peaks in the middle (the moment of the cut)."""
    n = int(d * SR)
    x = rng.standard_normal(n)
    up = sweep_lp(x[: n // 2], 300, 7000)
    dn = sweep_lp(x[n // 2:], 7000, 400)
    y = np.concatenate([up, dn])
    e = np.concatenate([np.linspace(0, 1, n // 2) ** 2, np.linspace(1, 0, n - n // 2) ** 1.5])
    return hp(y, 150) * e


def impact(d=3.0):
    t = tvec(d)
    f = 30 + 40 * np.exp(-t / 0.25)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    nz = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.5) * 0.5
    return np.tanh(1.3 * (sub + nz))


def tick():
    t = tvec(0.05)
    return (np.sin(2 * np.pi * 2100 * t) * 0.6 + hp(rng.standard_normal(len(t)), 4000) * 0.4) * np.exp(-t / 0.008)


def pop(f=1300):
    t = tvec(0.12)
    fr = f * (1 + 0.6 * np.exp(-t / 0.01))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.035)


# ---------------------------------------------------------------- arrangement
CH = {   # chord tones (pad), arp tones, bass root
    'Am': ([220.0, 261.63, 329.63, 493.88], [440.0, 523.25, 659.25, 880.0], 55.0),
    'F':  ([174.61, 220.0, 261.63, 392.0], [349.23, 440.0, 523.25, 698.46], 43.65),
    'C':  ([261.63, 329.63, 392.0, 587.33], [523.25, 659.25, 783.99, 1046.5], 65.41),
    'G':  ([196.0, 246.94, 293.66, 440.0], [392.0, 493.88, 587.33, 783.99], 49.0),
}
PROG = ['Am', 'F', 'C', 'G']


def chord_for_bar(k):
    if k == 15:
        return 'G'
    if k >= 16:
        return 'Am'
    return PROG[(k - 2) % 4]


def build_music():
    drums, bass, pad, arp, fx = buf(), buf(), buf(), buf(), buf()
    kicks = []

    # 0.0 opening hit + pre-roll chord
    place(fx, impact(1.6) * 0.55, 0.0)
    place(drums, kick(), 0.0, 0.9)
    kicks.append(0.0)
    place(pad, pad_chord(CH['Am'][0], 0.8, 1200), 0.0, 0.9)
    # notification pings (scene 1)
    for i, f in enumerate([880.0, 1046.5, 1318.5, 1760.0]):
        place(arp, bell(f), 0.4 + 0.4 * i, 0.22, pan=(-0.3 if i % 2 else 0.3))

    for k in range(0, 17):
        t0 = bar_start(k)
        name = chord_for_bar(k)
        pv, av, root = CH[name]
        section = 'intro' if k < 2 else 'build' if k == 15 else 'logo' if k >= 16 else 'main' if k < 10 else 'peak'

        if section == 'logo':
            break

        # pads
        fc = {'intro': 900, 'main': 1700, 'peak': 2600, 'build': 2000}[section]
        place(pad, pad_chord(pv, BAR + 0.15, fc), t0, 1.0)

        for b in range(4):
            tb = t0 + b * BEAT
            # kick: four on the floor; filtered feel in intro; drops out for the last half of the build
            if not (section == 'build' and b >= 2):
                g = 0.55 if section == 'intro' else 0.9
                place(drums, kick(), tb, g)
                kicks.append(tb)
            # clap on 2 & 4
            if section in ('main', 'peak') and b in (1, 3):
                place(drums, clap(), tb, 0.32, pan=0.05)
            # hats
            if section != 'intro' or k == 1:
                place(drums, hat(open_=True), tb + BEAT / 2, 0.10 if section != 'peak' else 0.12, pan=-0.25)
            if section == 'peak':
                for s16 in (0.25, 0.75):
                    place(drums, hat(), tb + s16 * BEAT, 0.07, pan=0.3)
            # bass: off-beat 8ths
            if section in ('main', 'peak', 'build'):
                place(bass, bass_note(root, BEAT / 2 * 0.9), tb + BEAT / 2, 0.42)
            elif section == 'intro' and k == 1:
                place(bass, bass_note(root, BEAT / 2 * 0.9), tb + BEAT / 2, 0.25)

        # arp: 16ths over chord tones
        if section in ('main', 'peak', 'build'):
            pat = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2]
            for i, p in enumerate(pat):
                f = av[p] * (2 if section == 'peak' and i % 4 == 0 else 1)
                bright = 2200 if section == 'main' else 3600
                place(arp, pluck(f, 0.22, bright), t0 + i * BEAT / 4, 0.10, pan=(0.35 if i % 2 else -0.35))

        # build-ups into scene changes
        if k == 1:                                          # into the 4.0 drop
            for i in range(8):
                place(drums, snare(), t0 + 0.8 + i * 0.1, 0.12 + 0.03 * i)
            place(fx, noise_riser(1.6, 300, 9000) * 0.18, t0)
        if section == 'build':
            for i in range(16):
                place(drums, snare(), t0 + i * BEAT / 4, 0.08 + 0.016 * i)
            place(fx, noise_riser(BAR, 300, 12000) * 0.22, t0)
            # pitch riser
            t = tvec(BAR)
            f = 220 * 2 ** (t / BAR * 2)
            place(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / BAR) ** 2 * 0.08, t0)

    # 2.4: dashboard lands
    place(fx, impact(1.0) * 0.25, 2.4)

    # logo hit (26.4) and tail to 30.0
    place(fx, impact(3.6) * 0.9, LOGO)
    place(drums, kick(0.8), LOGO, 1.0)
    kicks.append(LOGO)
    crash = hp(rng.standard_normal(int(2.5 * SR)), 3000) * np.exp(-tvec(2.5) / 0.7)
    place(fx, crash * 0.18, LOGO)
    final = CH['Am'][0] + [659.25]
    place(pad, pad_chord(final, DUR - LOGO, 2400) * np.linspace(1, 0.0, int((DUR - LOGO) * SR)) ** 0.6, LOGO, 1.5)
    for i, f in enumerate([880.0, 1318.5, 1760.0, 1318.5]):
        place(arp, bell(f, 1.6), LOGO + 0.4 * i, 0.16 - 0.02 * i, pan=(0.3 if i % 2 else -0.3))

    # sidechain duck for bass + pad from the kicks
    t = np.arange(N) / SR
    duck = np.ones(N)
    for tk in kicks:
        i = int(tk * SR)
        n = int(0.32 * SR)
        j = min(N, i + n)
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.65 * np.exp(-np.arange(j - i) / SR / 0.09))
    bass *= duck
    pad *= 0.5 + 0.5 * duck

    ir = reverb_ir()
    wet = reverb(pad * 0.5 + arp * 0.8 + fx * 0.15, ir)
    mix = drums + bass + pad + arp + fx + wet * 0.6
    mix = hp(mix, 28)
    return mix


def build_sfx():
    sfx = buf()
    for T in SCENES:                                      # light sweep on every scene cut
        place(sfx, whoosh(0.7) * 0.32, T - 0.35, pan=0.0)
    for T in FEATURES:                                    # soft tick on feature changes
        if T not in SCENES:
            place(sfx, tick() * 0.22, T)
    # UI moments that have a visual pop in index.html
    F = dict(zip(['f%d' % i for i in range(1, 14)], FEATURES))
    events = [(F['f1'] + 0.55, 1500), (F['f1'] + 1.08, 1900), (F['f2'] + 0.35, 1200), (F['f2'] + 1.0, 1600),
              (F['f3'] + 0.55, 1900), (F['f4'] + 0.85, 1500), (F['f5'] + 0.95, 1300), (F['f6'] + 0.65, 1100),
              (F['f6'] + 1.15, 1100), (F['f7'] + 0.97, 1600), (F['f8'] + 0.2, 1700), (F['f9'] + 0.95, 1900),
              (F['f10'] + 0.78, 1300), (F['f11'] + 1.0, 2000), (F['f12'] + 0.42, 1200), (F['f12'] + 0.74, 1300),
              (F['f12'] + 1.06, 1400), (F['f13'] + 1.0, 1600)]
    for t, f in events:
        place(sfx, pop(f) * 0.16, t, pan=float(rng.uniform(-0.3, 0.3)))
    for i in range(4):                                     # scene 1 notification pops
        place(sfx, pop(1400 + 150 * i) * 0.2, 0.4 + 0.4 * i)
    return sfx


# ---------------------------------------------------------------- voice-over
# Line-up for the voice actor (seconds). Each phrase starts with its feature on screen.
VO_CUES = [
    (0.12, 1.25, 'تَبِي تْكَبِّرْ تِجَارْتَكْ؟'),
    (1.45, 2.45, 'مَعَ فِيلُورْسِي، عِنْدَكْ الأَدَوَاتْ اللِّي تِحْتَاجْهَا بْمَكَانْ وَاحِدْ!'),
    (4.05, 1.5, 'اِسْتَرْجِعْ السَّلَّاتْ المَتْرُوكَة،'),
    (5.65, 1.5, 'قَدِّمْ بِطَاقَاتْ إِهْدَاءْ،'),
    (7.25, 1.5, 'نَبِّهْ عُمَلَاءَكْ عِنْدَ رُجُوعْ المُنْتَجَاتْ،'),
    (8.85, 1.5, 'وَأَنْشِئْ بَاقَاتْ وَعُرُوضْ مُمَيَّزَة!'),
    (10.45, 1.5, 'حَسِّنْ ظُهُورْ مَتْجَرَكْ فِي جُوجِلْ،'),
    (12.05, 1.5, 'صَمِّمْهْ عَلَى ذُوقَكْ،'),
    (13.65, 1.5, 'طَوِّرْهْ بِالذَّكَاءِ الاِصْطِنَاعِي،'),
    (15.25, 1.5, 'وَابْنِ ثِقَةْ عُمَلَاءَكْ بِالتَّقْيِيمَاتْ!'),
    (16.85, 1.5, 'كَافِئْ عُمَلَاءَكْ،'),
    (18.45, 1.5, 'أَعِدْ اِسْتِهْدَافْ المُهْتَمِّينْ،'),
    (20.05, 1.5, 'وَارْبُطْ مَتْجَرَكْ بِبَوَّابَاتِ الدَّفْعْ'),
    (21.65, 1.5, 'وَالعُمْلَاتْ'),
    (23.25, 2.0, 'وَأَدَوَاتِ التَّسْوِيقْ وَالتَّوَاصُلِ الاِجْتِمَاعِي!'),
    (26.45, 0.85, 'فِيلُورْسِي...'),
    (27.4, 1.5, 'كُلّْ أَدَوَاتْ تِجَارْتَكْ، بْمَنَصَّة وَحْدَة.'),
    (28.95, 0.95, 'اِكْتَشِفْهَا اليُومْ!'),
]


def read_wav(path):
    sr, x = wavfile.read(path)
    scale = float(np.iinfo(x.dtype).max) + 1 if x.dtype.kind == 'i' else 1.0
    x = x.astype(np.float64) / scale
    if x.ndim == 2:
        x = x.mean(axis=1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    return x


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - 200): idx[-1] + 400] if len(idx) else x


def piper_say(text, length_scale, piper, model):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        path = f.name
    subprocess.run([piper, '--model', model, '--length_scale', f'{length_scale:.3f}', '--sentence_silence', '0',
                    '--output_file', path], input=text.encode(), check=True, capture_output=True)
    x = trim(read_wav(path))
    os.unlink(path)
    return x


def atempo(x, speed):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        wavfile.write(a, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-filter:a', f'atempo={speed:.4f}', b], check=True)
        return read_wav(b)


def guide_vo(piper, model):
    vo = np.zeros(N)
    report = []
    for t, maxd, text in VO_CUES:
        x = piper_say(text, 0.95, piper, model)
        d = len(x) / SR
        if d > maxd:
            ls = max(0.55, 0.95 * maxd / d)
            x = piper_say(text, ls, piper, model)
            d = len(x) / SR
        speed = 1.0
        if d > maxd:                                   # still long: time-stretch (pitch kept) with ffmpeg atempo
            speed = d / maxd
            x = atempo(x, speed)
            d = len(x) / SR
        i = int(t * SR)
        j = min(N, i + len(x))
        vo[i:j] += x[: j - i]
        report.append((t, d, maxd, speed))
    vo = hp(vo, 90)
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.9
    return vo, report


# ---------------------------------------------------------------- mix
def duck_curve(vo, depth_db=-9.0):
    env = np.abs(vo)
    win = int(0.05 * SR)
    env = np.convolve(env, np.ones(win) / win, mode='same')
    on = (env > 0.01).astype(float)
    # attack 40 ms, release 250 ms smoothing of the gate
    sm = np.zeros_like(on)
    a, r = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.25 * SR))
    acc = 0.0
    for i in range(0, len(on), 64):          # block-wise one-pole for speed
        target = on[i:i + 64].max()
        coef = a if target > acc else r
        acc = target + (acc - target) * coef ** 64
        sm[i:i + 64] = acc
    g = 10 ** (depth_db / 20)
    return 1 - (1 - g) * sm


def norm(x, peak=0.89):
    return x / (np.abs(x).max() + 1e-9) * peak


def write(path, x):
    x = np.clip(x, -1, 1)
    wavfile.write(path, SR, (x.T * 32767).astype(np.int16))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--vo', help='recorded VO wav, already aligned to the 30 s picture')
    ap.add_argument('--guide-vo', action='store_true', help='synthesise a scratch guide VO with Piper')
    ap.add_argument('--piper', default=os.environ.get('PIPER_BIN', 'piper'))
    ap.add_argument('--piper-model', default=os.environ.get('PIPER_MODEL', ''))
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    music = norm(build_music(), 0.8)
    sfx = build_sfx()
    write(os.path.join(OUT, 'music.wav'), music)
    write(os.path.join(OUT, 'sfx.wav'), norm(sfx, 0.8))
    write(os.path.join(OUT, 'mix_music.wav'), norm(music + sfx * 0.9, 0.89))
    print('wrote music.wav, sfx.wav, mix_music.wav')

    vo = None
    if a.vo:
        vo = read_wav(a.vo)[:N]
        vo = np.pad(vo, (0, N - len(vo)))
    elif a.guide_vo:
        vo, rep = guide_vo(a.piper, a.piper_model)
        write(os.path.join(OUT, 'vo_guide.wav'), np.vstack([vo, vo]))
        for t, d, m, sp in rep:
            print(f'  vo @ {t:5.2f}s  {d:4.2f}s (slot {m:.2f}s)  stretch x{sp:.2f}')
    if vo is not None:
        g = duck_curve(vo)
        bed = (music + sfx * 0.9) * g
        mix = bed * 0.75 + np.vstack([vo, vo]) * 0.95
        write(os.path.join(OUT, 'mix_vo.wav'), norm(mix, 0.89))
        print('wrote mix_vo.wav')


if __name__ == '__main__':
    sys.exit(main())
