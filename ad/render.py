import sys, os, subprocess
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
FPS, DUR = 30, 10.0
N = int(FPS * DUR)
OW, OH = 1080, 1920
W, H = 1620, 2880  # scene canvas (9:16)
rng = np.random.default_rng(7)

# ---------- product cut-out ----------
src = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32) / 255.0
L = src @ np.array([0.299, 0.587, 0.114], np.float32)
alpha = np.clip((0.82 - L) / 0.22, 0, 1)
ys, xs = np.where(L < 0.75)
# drop the light floor-reflection strip under the base: cut each column below its last dark pixel
dark = L < 0.42
rows = np.arange(L.shape[0])[:, None]
last = np.where(dark.any(0), (dark * rows).max(0), -1)
alpha = alpha * np.clip((last[None, :] + 2 - rows) / 3.0, 0, 1)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
pad = 6
y0, x0 = max(y0 - pad, 0), max(x0 - pad, 0)
y1, x1 = min(y1 + pad, src.shape[0]), min(x1 + pad, src.shape[1])
src, alpha = src[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
a_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
# de-fringe: pull edge colours toward the fabric colour so no white halo remains
fab = np.median(src[alpha > 0.98], axis=0)
edge = (alpha > 0.02) & (alpha < 0.98)
src[edge] = src[edge] * alpha[edge][:, None] + fab * (1 - alpha[edge][:, None])

CW = 1420
s = CW / src.shape[1]
CH = int(round(src.shape[0] * s))
chair = np.asarray(Image.fromarray((src * 255).astype(np.uint8)).resize((CW, CH), Image.LANCZOS)).astype(np.float32) / 255
calpha = np.asarray(a_img.resize((CW, CH), Image.LANCZOS)).astype(np.float32) / 255
CX0 = (W - CW) // 2
BASE = 2080
CY0 = BASE - CH

# ---------- luxury room background ----------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
FLOOR = 1760
t = np.clip(yy / FLOOR, 0, 1)[..., None]
wall = np.array([0.075, 0.058, 0.046]) * (1 - t) + np.array([0.20, 0.155, 0.118]) * t
# fluted wall panels
flute = 1 + 0.06 * np.cos(xx / 46.0 * np.pi * 2)[..., None] * (0.6 + 0.4 * t)
wall = wall * flute
# warm lamp glow behind product
g = np.exp(-(((xx - W * 0.5) / 720) ** 2 + ((yy - 1250) / 900) ** 2))[..., None]
wall = wall + g * np.array([0.34, 0.21, 0.11])
# soft window light from upper left
d = (xx * 0.8 + yy * 0.6)
win = (np.clip(np.sin(d / 120.0), 0, 1) ** 6) * np.exp(-((xx - 250) / 600) ** 2 - ((yy - 700) / 800) ** 2)
wall = wall + win[..., None] * np.array([0.10, 0.08, 0.06])
# floor: warm oak planks
ft = np.clip((yy - FLOOR) / (H - FLOOR), 0, 1)[..., None]
plank_noise = rng.normal(0, 1, (H, 1)).astype(np.float32)
plank_noise = np.asarray(Image.fromarray(((plank_noise * 40 + 128).clip(0, 255)).astype(np.uint8).repeat(W, 1)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255 - 0.5
floor = np.array([0.30, 0.205, 0.135]) * (1 - ft) + np.array([0.11, 0.075, 0.05]) * ft
seams = 1 - 0.18 * (np.abs(((xx + 0.35 * (yy - FLOOR)) % 260) - 130) < 2)[..., None]
floor = floor * (1 + plank_noise[..., None] * 0.25) * seams
floor = floor + np.exp(-(((xx - W * 0.5) / 650) ** 2 + ((yy - 2050) / 420) ** 2))[..., None] * np.array([0.22, 0.14, 0.08])
bg = np.where(yy[..., None] < FLOOR, wall, floor)
# skirting line
bg[FLOOR - 6:FLOOR + 2] *= 0.55
bg = np.clip(bg, 0, 1)
bg_img = Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))  # shallow DOF
bg = np.asarray(bg_img).astype(np.float32) / 255
# contact + ambient shadow under the chair
sh = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(sh)
dr.ellipse([CX0 + 40, BASE - 70, CX0 + CW - 40, BASE + 60], fill=235)
sh = np.asarray(sh.filter(ImageFilter.GaussianBlur(28))).astype(np.float32) / 255
sh2 = Image.new("L", (W, H), 0)
ImageDraw.Draw(sh2).ellipse([CX0 - 80, BASE - 140, CX0 + CW + 80, BASE + 170], fill=150)
sh2 = np.asarray(sh2.filter(ImageFilter.GaussianBlur(70))).astype(np.float32) / 255
bg = bg * (1 - 0.85 * sh[..., None]) * (1 - 0.45 * sh2[..., None])
# vignette
v = 1 - 0.55 * (((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.55) / (H * 0.62)) ** 2)
bg = np.clip(bg * np.clip(v, 0.25, 1)[..., None], 0, 1).astype(np.float32)
del yy, xx, wall, floor

cyy, cxx = np.mgrid[0:CH, 0:CW].astype(np.float32)

def bilinear(img, sx, sy):
    sx = np.clip(sx, 0, img.shape[1] - 1.001); sy = np.clip(sy, 0, img.shape[0] - 1.001)
    x0 = sx.astype(np.int32); y0 = sy.astype(np.int32)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

RGBA = np.dstack([chair, calpha])
SEAT_TOP = 0.36 * CH  # top surface of the seat cushion (source proportion)

def deform(k):
    """Seat cushion gently sinks (k=0..1) and the pouf bulges slightly — memory-foam feel."""
    if k <= 1e-4:
        return RGBA
    depth = 34 * k
    gx = np.exp(-((cxx - CW / 2) / (CW * 0.30)) ** 2)
    # vertical falloff: max at seat top, zero at the base & top of backrest
    fy = np.clip((cyy - SEAT_TOP * 0.55) / (SEAT_TOP * 0.45), 0, 1) * np.clip((CH - cyy) / (CH - SEAT_TOP), 0, 1)
    dy = depth * gx * fy
    bulge = 1 + 0.012 * k * np.clip((cyy - SEAT_TOP) / (CH - SEAT_TOP), 0, 1)
    sx = CW / 2 + (cxx - CW / 2) / bulge
    return bilinear(RGBA, sx, cyy - dy)

def ease(u):
    u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)

def frame_scene(tsec, sweep_pos, sink):
    layer = deform(sink)
    rgb, a = layer[..., :3], layer[..., 3:4]
    # fabric sheen sweep (diagonal soft band)
    if sweep_pos is not None:
        band = np.exp(-(((cxx * 0.7 + cyy * 0.7) / (CW * 0.7 + CH * 0.7) - sweep_pos) / 0.07) ** 2)[..., None]
        rgb = rgb * (1 + 0.32 * band) + band * np.array([0.015, 0.011, 0.007])
    # warm key from right / rim
    rim = np.clip((cxx - CW * 0.55) / (CW * 0.45), 0, 1)[..., None] * 0.05
    rgb = rgb * (1 + rim * np.array([1.0, 0.8, 0.6]))
    sc = bg.copy()
    reg = sc[CY0:CY0 + CH, CX0:CX0 + CW]
    sc[CY0:CY0 + CH, CX0:CX0 + CW] = reg * (1 - a) + np.clip(rgb, 0, 1) * a
    return sc

# camera: (centre x, centre y, zoom) in scene coords; source proportion -> scene
def P(px, py):
    return CX0 + px * CW, CY0 + py * CH

def shot(i, u):
    if i == 0:  # wide establishing push-in
        cx, cy = W / 2, 1500 - 60 * u
        return cx, cy, 1.0 + 0.14 * ease(u)
    if i == 1:  # piping / seam detail, lateral slide
        cx, cy = P(0.22 + 0.16 * ease(u), 0.47)
        return cx, cy, 2.75 + 0.15 * u
    if i == 2:  # backrest folds, slow tilt down
        cx, cy = P(0.50, 0.20 + 0.10 * ease(u))
        return cx, cy, 2.45 - 0.2 * u
    cx, cy = W / 2, P(0, 0.52)[1] - 20 * u  # hero: pull back
    return cx, cy, 1.55 - 0.42 * ease(u)

CUTS = [0.0, 3.0, 5.3, 7.3, 10.0]
XF = 0.35

def render_cam(sc, cam, tsec):
    cx, cy, z = cam
    cx += 3 * np.sin(tsec * 1.3); cy += 2.5 * np.sin(tsec * 0.9 + 1)  # subtle handheld float
    vw, vh = W / z, H / z
    box = (cx - vw / 2, cy - vh / 2, cx + vw / 2, cy + vh / 2)
    img = Image.fromarray((np.clip(sc, 0, 1) * 255).astype(np.uint8))
    return np.asarray(img.transform((OW, OH), Image.EXTENT, box, Image.BICUBIC)).astype(np.float32) / 255

def grade(f, tsec):
    f = f * np.array([1.03, 1.0, 0.95]) + np.array([0.012, 0.008, 0.004])  # warm lift
    f = f + rng.normal(0, 0.012, (OH // 2, OW // 2, 1)).repeat(2, 0).repeat(2, 1)  # film grain
    if tsec < 0.5: f = f * ease(tsec / 0.5)
    if tsec > DUR - 0.45: f = f * ease((DUR - tsec) / 0.45)
    return np.clip(f, 0, 1)

def sink_amount(tsec):
    if tsec < 7.6: return 0.0
    if tsec < 8.7: return ease((tsec - 7.6) / 1.1)
    return 1.0 - 0.35 * ease((tsec - 8.7) / 1.1)

ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                       "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                       "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
for n in range(N):
    tsec = n / FPS
    sweep = None
    if 0.4 < tsec < 2.9: sweep = -0.15 + 1.3 * ease((tsec - 0.4) / 2.5)
    elif 3.0 < tsec < 5.4: sweep = 0.1 + 0.8 * ease((tsec - 3.0) / 2.4)
    elif 8.6 < tsec < 10: sweep = -0.15 + 1.3 * ease((tsec - 8.6) / 1.4)
    sc = frame_scene(tsec, sweep, sink_amount(tsec))
    i = max(k for k in range(4) if tsec >= CUTS[k])
    u = (tsec - CUTS[i]) / (CUTS[i + 1] - CUTS[i])
    f = render_cam(sc, shot(i, u), tsec)
    if i < 3 and tsec > CUTS[i + 1] - XF:  # cross-dissolve into next shot
        w = ease((tsec - (CUTS[i + 1] - XF)) / XF)
        u2 = (tsec - CUTS[i + 1]) / (CUTS[i + 2] - CUTS[i + 1])
        f = f * (1 - w) + render_cam(sc, shot(i + 1, u2), tsec) * w
    ff.stdin.write((grade(f, tsec) * 255).astype(np.uint8).tobytes())
    if n % 30 == 0: print("frame", n, flush=True)
ff.stdin.close(); ff.wait()
