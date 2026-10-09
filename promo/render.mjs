// Renders promo/index.html frame by frame (1080x1920 @ 30fps) and pipes the frames into ffmpeg.
//
//   node promo/render.mjs                         -> promo/out/video.mp4 (silent)
//   node promo/render.mjs --stills 0.5,4.6,27     -> promo/out/still-<t>.jpg only
//
// Real screenshots: promo/screens/<name>.(png|jpg|webp) puts that screenshot in a phone frame (names: shop, dash, f1..f12).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// playwright is usually installed globally; CommonJS resolution honours NODE_PATH
const { chromium } = createRequire(import.meta.url)('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
mkdirSync(out, { recursive: true });

const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

// every image directly in screens/ is a real app screenshot, keyed by its base name (f2, dash, shop…)
const real = {};
const shotsDir = join(here, 'screens');
if (existsSync(shotsDir)) {
  for (const f of readdirSync(shotsDir)) {
    const m = f.match(/^(.+)\.(png|jpe?g|webp)$/i);
    if (m) real[m[1]] = `screens/${f}`;
  }
}
if (Object.keys(real).length) console.log('real screenshots:', real);

const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.addInitScript(r => { window.RENDER_MODE = true; window.REAL_SCREENS = r; }, real);
await page.goto(pathToFileURL(join(here, 'index.html')).href);
await page.evaluate(() => window.ready);
const total = await page.evaluate(() => window.TOTAL);

async function shot(t) {
  await page.evaluate(t => window.seek(t), t);
  return page.screenshot({ type: 'jpeg', quality: 95 });
}

if (stillsArg) {
  const fs = await import('node:fs/promises');
  for (const t of stillsArg.split(',').map(Number)) {
    // play up to t in frame steps so every tween initialises in order, exactly like the full render
    const buf = await shot(t);
    await fs.writeFile(join(out, `still-${t.toFixed(2)}.jpg`), buf);
  }
  await browser.close();
  process.exit(0);
}

const frames = Math.round(total * FPS);
const target = join(out, 'video.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', target], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const buf = await shot(i / FPS);
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 60 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
await browser.close();
console.log('wrote', target);
