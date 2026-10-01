# Velorci: Instagram Reel

A 30-second 9:16 (1080×1920, 30 fps) ad for Velorci. The output is `velorci-reel.mp4` (H.264 with AAC audio, -14 LUFS).

The picture is real-time HTML/CSS/SVG that's posed one frame at a time. The soundtrack is synthesized in code. Both read the same cue sheet, so every cut, ping and hit lands on its frame. There's no stock footage, sampled audio or third-party logo.

| Time | Scene | On-screen text |
|---|---|---|
| 0–4 s | Chaos: an owner at his desk, buried in WhatsApp, Instagram, POS, sheets, invoices and alerts | Your business shouldn't feel like this. |
| 4–8 s | The problem: rapid cuts across disconnected tools, a WhatsApp flood, broken links | Too many tools. Too much data. Zero control. |
| 8–12 s | Freeze. Every screen is pulled into one core, and the Velorci interface appears | Meet Velorci. |
| 12–20 s | The platform: 10 modules on a 3D carousel, then one connected network | One platform. / Every operation. / Connected. |
| 20–24 s | AI: a scan finds 4 insights | Your business doesn't just run. / It gets smarter. |
| 24–30 s | Hero pull-back, then the logo lockup and CTA | RUN YOUR BUSINESS. FROM ONE PLACE. / velorci, Business Operating Platform / Discover Velorci |

## Files

- `timeline.js`: cue sheet shared by picture and sound (cuts, pings, beat, impacts).
- `index.html`, `reel.js`: the film. `window.seek(t)` poses any moment.
- `audio.py`: soundtrack synth (drums, bass, pads, arps, UI sounds, impacts, reverb, loudness).
- `render.mjs`: captures frames in headless Chromium and encodes with ffmpeg. Each frame blends 3 samples, which gives a 180° shutter's motion blur.
- `fonts/`: Poppins (SIL OFL). The brand mark and product images come from `../assets`.

## Rebuild

```bash
pip install numpy scipy pyloudnorm   # audio
npm i -g playwright                  # or a local install; needs Chromium
python3 audio.py                     # -> soundtrack.wav
node render.mjs                      # -> velorci-reel.mp4 (about 10 min on 4 cores)
node render.mjs --stills 3,10.4,27.9 # PNG stills for quick review
```

To preview in a browser, serve this folder and open `index.html?play` (click to start) or `index.html?t=12.5` for a single moment.

## Notes

- The owner is a backlit silhouette, not a filmed actor. If you shoot or generate live-action plates, they slot in at `#s1own` (seated, stressed, 0–4 s) and `#s6own` (standing, relaxed, 24–27.5 s).
- Key text stays between y≈280 and y≈1600 and clear of the right edge, so Instagram's UI doesn't cover it.
- Copy, names, prices (KWD) and product names are all set in `reel.js`.
