"""Builds the audio for the velorci ad from a timing file (the same one render.mjs uses).

    python build_audio.py                         -> out/<name>.music.wav / .sfx.wav / .mix_music.wav   (timing.json)
    python build_audio.py --edge-vo               -> also synthesises the Gulf voice-over (Microsoft neural TTS)
                                                     and writes out/<name>.vo.wav and .mix_vo.wav
    python build_audio.py --vo voice.wav          -> mixes a recorded voice-over instead (aligned to 0 s)
    python build_audio.py --vo-lines vo/          -> one wav per phrase (intro.wav, f1.wav … logo.wav), each placed
                                                     on its cue and sped up if it overruns its slot
    python build_audio.py --timing timing-30s.json  the fast 30 s cut

The music is synthesised here (no samples, no licences), A minor, at the timing file's BPM. Bars start at
grid0 + n*bar, and the timing files are laid out so every feature cut and the logo hit land on a downbeat.
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
rng = np.random.default_rng(7)

# set by configure()
DUR = N = BEAT = BAR = GRID0 = LOGO = K = 0.0
SCENES, FEATURES, T = [], [], {}


def configure(t):
    """Derive every time position from the timing file (mirrors index.html)."""
    global DUR, N, BEAT, BAR, GRID0, LOGO, K, SCENES, FEATURES, T
    T = t
    DUR = float(t['total'])
    N = int(SR * DUR)
    BEAT = 60.0 / t['bpm']
    BAR = 4 * BEAT
    GRID0 = float(t.get('grid0', 0.0))
    slot, intro = float(t['slot']), float(t['intro'])
    K = slot / 1.6
    FEATURES = [intro + slot * i for i in range(13)]
    SCENES = [intro, intro + 4 * slot, intro + 8 * slot, intro + 13 * slot]
    LOGO = SCENES[3] + float(t['grid'])


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


def section_at(t0):
    s2, s3, s4, s5 = SCENES
    if t0 < s2 - 1e-6:
        return 'intro'
    if t0 < s4 - 1e-6:
        return 'main'
    if t0 < s5 - 1e-6:
        return 'peak'
    if t0 < LOGO - 1e-6:
        return 'build'
    return 'logo'


def chord_at(t0, section):
    if section == 'build':
        return 'G'
    if section == 'logo':
        return 'Am'
    return PROG[int(round((t0 - SCENES[0]) / BAR)) % 4]      # Am lands on the first feature


def notif_times():
    s1 = T.get('s1', {})
    return [s1.get('notif0', .4) + i * s1.get('notifStep', .4) for i in range(4)]


def build_music():
    drums, bass, pad, arp, fx = buf(), buf(), buf(), buf(), buf()
    kicks = []

    # 0.0 opening hit (+ a pre-roll chord when the grid starts later)
    place(fx, impact(1.6) * 0.55, 0.0)
    place(drums, kick(), 0.0, 0.9)
    kicks.append(0.0)
    if GRID0 > 0:
        place(pad, pad_chord(CH['Am'][0], GRID0, 1200), 0.0, 0.9)
    for i, (t, f) in enumerate(zip(notif_times(), [880.0, 1046.5, 1318.5, 1760.0])):   # scene-1 notification pings
        place(arp, bell(f), t, 0.22, pan=(-0.3 if i % 2 else 0.3))

    k = 0
    while bar_start(k) < LOGO - 1e-6:
        t0 = bar_start(k)
        section = section_at(t0)
        pv, av, root = CH[chord_at(t0, section)]
        last_intro_bar = section == 'intro' and abs(t0 + BAR - SCENES[0]) < 1e-6

        fc = {'intro': 900, 'main': 1700, 'peak': 2600, 'build': 2000}[section]
        place(pad, pad_chord(pv, BAR + 0.15, fc), t0, 1.0)

        for b in range(4):
            tb = t0 + b * BEAT
            if not (section == 'build' and b >= 2):          # kick drops out for the end of the build
                place(drums, kick(), tb, 0.55 if section == 'intro' else 0.9)
                kicks.append(tb)
            if section in ('main', 'peak') and b in (1, 3):
                place(drums, clap(), tb, 0.32, pan=0.05)
            if section != 'intro' or last_intro_bar:
                place(drums, hat(open_=True), tb + BEAT / 2, 0.10 if section != 'peak' else 0.12, pan=-0.25)
            if section == 'peak':
                for s16 in (0.25, 0.75):
                    place(drums, hat(), tb + s16 * BEAT, 0.07, pan=0.3)
            if section in ('main', 'peak', 'build'):
                place(bass, bass_note(root, BEAT / 2 * 0.9), tb + BEAT / 2, 0.42)
            elif last_intro_bar:
                place(bass, bass_note(root, BEAT / 2 * 0.9), tb + BEAT / 2, 0.25)

        if section in ('main', 'peak', 'build'):
            pat = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2]
            for i, p in enumerate(pat):
                f = av[p] * (2 if section == 'peak' and i % 4 == 0 else 1)
                place(arp, pluck(f, 0.22, 2200 if section == 'main' else 3600), t0 + i * BEAT / 4, 0.10,
                      pan=(0.35 if i % 2 else -0.35))

        if last_intro_bar:                                   # roll + riser into the first feature
            for i in range(8):
                place(drums, snare(), t0 + BAR / 2 + i * BAR / 16, 0.12 + 0.03 * i)
            place(fx, noise_riser(BAR, 300, 9000) * 0.18, t0)
        if section == 'build':
            for i in range(16):
                place(drums, snare(), t0 + i * BEAT / 4, 0.08 + 0.016 * i)
            place(fx, noise_riser(BAR, 300, 12000) * 0.22, t0)
            t = tvec(BAR)
            f = 220 * 2 ** (t / BAR * 2)
            place(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / BAR) ** 2 * 0.08, t0)
        k += 1

    place(fx, impact(1.0) * 0.25, T.get('s1', {}).get('dash', 2.3) + .1)      # dashboard lands

    # logo hit and tail
    tail = DUR - LOGO
    place(fx, impact(min(3.6, tail)) * 0.9, LOGO)
    place(drums, kick(0.8), LOGO, 1.0)
    kicks.append(LOGO)
    crash = hp(rng.standard_normal(int(2.5 * SR)), 3000) * np.exp(-tvec(2.5) / 0.7)
    place(fx, crash * 0.18, LOGO)
    final = CH['Am'][0] + [659.25]
    place(pad, pad_chord(final, tail, 2400) * np.linspace(1, 0.0, int(tail * SR)) ** 0.6, LOGO, 1.5)
    for i, f in enumerate([880.0, 1318.5, 1760.0, 1318.5]):
        place(arp, bell(f, 1.6), LOGO + 2 * BEAT * i, 0.16 - 0.02 * i, pan=(0.3 if i % 2 else -0.3))
    if tail > 4.5:                                           # long end card: a soft pulse under the voice-over
        tb = LOGO + 2 * BAR
        while tb < DUR - BAR:
            place(drums, kick(0.5), tb, 0.35)
            kicks.append(tb)
            tb += BAR

    duck = np.ones(N)                                         # sidechain from the kicks
    for tk in kicks:
        i = int(tk * SR)
        j = min(N, i + int(0.32 * SR))
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.65 * np.exp(-np.arange(j - i) / SR / 0.09))
    bass *= duck
    pad *= 0.5 + 0.5 * duck

    ir = reverb_ir()
    wet = reverb(pad * 0.5 + arp * 0.8 + fx * 0.15, ir)
    mix = drums + bass + pad + arp + fx + wet * 0.6
    return hp(mix, 28)


# UI moments that have a visual pop in index.html (offsets are for a 1.6 s slot, scaled by K)
EVENTS = [('f1', 0.55, 1500), ('f1', 1.08, 1900), ('f2', 0.35, 1200), ('f2', 1.0, 1600), ('f3', 0.55, 1900),
          ('f4', 0.85, 1500), ('f5', 0.95, 1300), ('f6', 0.9, 1100), ('f7', 0.97, 1600), ('f8', 0.75, 1700),
          ('f9', 0.95, 1900), ('f10', 0.78, 1300), ('f11', 1.0, 2000), ('f12', 0.3, 1200), ('f12', 0.62, 1300),
          ('f12', 0.9, 1400), ('f13', 1.0, 1600)]


def build_sfx():
    sfx = buf()
    for t in SCENES:
        place(sfx, whoosh(0.7) * 0.32, t - 0.35)
    for t in FEATURES:
        if all(abs(t - s) > 1e-6 for s in SCENES):
            place(sfx, tick() * 0.22, t)
    for fid, off, f in EVENTS:
        place(sfx, pop(f) * 0.16, FEATURES[int(fid[1:]) - 1] + K * off, pan=float(rng.uniform(-0.3, 0.3)))
    for i, t in enumerate(notif_times()):
        place(sfx, pop(1400 + 150 * i) * 0.2, t)
    return sfx


# ---------------------------------------------------------------- voice-over
# The script (Kuwaiti/Gulf wording), one phrase per beat of the picture. 'at' is the feature/scene the phrase starts with.
VO_SCRIPT = [
    ('intro', 'تبي تكبّر تجارتك؟ ويّا فيلورسي، كل الأدوات اللي تحتاجها صارت بمكان واحد!'),
    ('f1', 'رجّع اللي تركوا سلّتهم،'),
    ('f2', 'ضيف بطاقة إهداء ويّا الطلب،'),
    ('f3', 'بلّغ زباينك أول ما يتوفّر المنتج،'),
    ('f4', 'وسوّي باقات وخصومات على الكمية!'),
    ('f5', 'ضبّط ظهور متجرك في قوقل،'),
    ('f6', 'صمّمه على كيفك،'),
    ('f7', 'وطوّره بالذكاء الاصطناعي،'),
    ('f8', 'وخلّ التقييمات تكسب لك الثقة!'),
    ('f9', 'دلّع زباينك بنقاط الولاء،'),
    ('f10', 'وصّل إعلانك للي زاروك،'),
    ('f11', 'واربط متجرك ببوابات الدفع،'),
    ('f12', 'واعرض أسعارك بعملات وايد،'),
    ('f13', 'وأدوات التسويق والسوشال ميديا بعد!'),
    ('logo', 'فيلورسي… كل أدوات تجارتك بمنصّة وحدة. اكتشفها الحين!'),
]


def vo_slots():
    """(start, max length, text, rate) for every phrase."""
    v = T.get('vo', {})
    out = []
    for at, text in VO_SCRIPT:
        if at == 'intro':
            out.append((0.10, SCENES[0] - 0.30, text, v.get('introRate', '+10%')))
        elif at == 'logo':
            out.append((LOGO + 0.05, DUR - LOGO - 0.45, text, v.get('endRate', '+0%')))
        else:
            t0 = FEATURES[int(at[1:]) - 1]
            out.append((t0 + 0.15, float(T['slot']) - 0.3, text, v.get('rate', '+0%')))
    return out


def edge_say(text, voice, rate):
    """Microsoft neural TTS (the Edge read-aloud voices) -> trimmed mono float array at SR."""
    import ssl
    import edge_tts
    import edge_tts.communicate as C
    ca = os.environ.get('SSL_CERT_FILE')
    if ca:                                   # use the environment's CA bundle (e.g. behind a TLS proxy)
        C._SSL_CTX = ssl.create_default_context(cafile=ca)
    with tempfile.TemporaryDirectory() as d:
        mp3, wav = os.path.join(d, 'a.mp3'), os.path.join(d, 'a.wav')
        asyncio.run(edge_tts.Communicate(text, voice, rate=rate, proxy=os.environ.get('HTTPS_PROXY')).save(mp3))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', str(SR), wav], check=True)
        return trim(read_wav(wav))


def rate_up(rate, factor):
    return f'{int(rate.strip("%+")) + int(np.ceil((factor - 1) * 100)) + 2:+d}%'


def place_lines(say):
    """Lays every phrase on the timeline at its slot; say(at, text, rate, maxd) -> mono array at SR."""
    vo = np.zeros(N)
    for (t0, maxd, text, rate), (at, _) in zip(vo_slots(), VO_SCRIPT):
        x = say(at, text, rate, maxd)
        if len(x) / SR > maxd:                               # too long for its slot: speed it up to fit
            x = atempo(x, len(x) / SR / maxd)
        i = int(t0 * SR)
        j = min(N, i + len(x))
        vo[i:j] += x[: j - i]
        print(f'  vo @ {t0:6.2f}s  {len(x) / SR:4.2f}s / {maxd:4.2f}s  {text}')
    vo = hp(vo, 80)
    return vo / (np.abs(vo).max() + 1e-9) * 0.9


def edge_vo():
    voice = T.get('vo', {}).get('voice', 'ar-KW-FahedNeural')

    def say(at, text, rate, maxd):
        x = edge_say(text, voice, rate)
        if len(x) / SR > maxd:                               # re-read a little faster before stretching
            x = edge_say(text, voice, rate_up(rate, len(x) / SR / maxd))
        return x
    return place_lines(say)


def lines_vo(d):
    """One recorded or synthesised file per phrase: <dir>/<intro|f1..f13|logo>.wav (any rate, mono or stereo)."""
    return place_lines(lambda at, text, rate, maxd: trim(read_wav(os.path.join(d, f'{at}.wav'))))


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


def atempo(x, speed):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        wavfile.write(a, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-filter:a', f'atempo={speed:.4f}', b], check=True)
        return read_wav(b)



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
    ap.add_argument('--timing', default=os.path.join(HERE, '..', 'timing.json'))
    ap.add_argument('--vo', help='recorded VO wav, already aligned to the picture (starts at 0 s)')
    ap.add_argument('--edge-vo', action='store_true', help='synthesise the VO with Microsoft neural TTS')
    ap.add_argument('--vo-lines', help='folder with one wav per phrase (intro.wav, f1.wav … f13.wav, logo.wav)')
    a = ap.parse_args()
    with open(a.timing, encoding='utf-8') as f:
        configure(json.load(f))
    name = T.get('name', 'velorci-ad')
    os.makedirs(OUT, exist_ok=True)
    o = lambda s: os.path.join(OUT, f'{name}.{s}.wav')

    music = norm(build_music(), 0.8)
    sfx = build_sfx()
    write(o('music'), music)
    write(o('sfx'), norm(sfx, 0.8))
    write(o('mix_music'), norm(music + sfx * 0.9, 0.89))
    print(f'wrote {name}.music / .sfx / .mix_music  ({DUR:.1f} s)')

    vo = None
    if a.vo:
        vo = read_wav(a.vo)[:N]
        vo = np.pad(vo, (0, N - len(vo)))
    elif a.edge_vo or a.vo_lines:
        vo = lines_vo(a.vo_lines) if a.vo_lines else edge_vo()
        write(o('vo'), np.vstack([vo, vo]))
    if vo is not None:
        bed = (music + sfx * 0.9) * duck_curve(vo)
        write(o('mix_vo'), norm(bed * 0.75 + np.vstack([vo, vo]) * 0.95, 0.89))
        print(f'wrote {name}.mix_vo')


if __name__ == '__main__':
    sys.exit(main())
