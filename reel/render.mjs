// Renders reel/index.html into an MP4.
//   node render.mjs                         full render -> velorci-reel.mp4
//   node render.mjs --stills 1,8.2,27.9     PNG stills of single moments (for review)
//   node render.mjs --lang ar               Arabic cut -> velorci-reel-ar.mp4
// Options: --fps 30 --sub 3 (samples per frame, motion blur) --workers 4 --out file.mp4 --from 0 --to 30
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let pw;
try { pw = await import('playwright'); } catch {
  pw = await import(pathToFileURL(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')).href);
}
const { chromium } = pw;

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const fps = +arg('fps', 30), sub = +arg('sub', 5), workers = +arg('workers', Math.max(1, Math.min(4, cpus().length)));
const shutter = 0.5; // 180-degree shutter
const lang = arg('lang', 'en'); // --lang ar renders the Arabic cut
const out = path.resolve(here, arg('out', lang === 'en' ? 'velorci-reel.mp4' : `velorci-reel-${lang}.mp4`));
const audio = path.resolve(here, arg('audio', 'soundtrack.wav'));
const url = pathToFileURL(path.join(here, 'index.html')).href + (lang === 'en' ? '' : `?lang=${lang}`);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}

const launch = () => chromium.launch({ args: ['--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars'] });
const browser = await launch();

if (process.argv.includes('--stills')) {
  const dir = path.resolve(arg('dir', path.join(tmpdir(), 'velorci-stills')));
  mkdirSync(dir, { recursive: true });
  const page = await openPage(browser);
  for (const t of arg('stills').split(',').map(Number)) {
    await page.evaluate(x => window.seek(x), t);
    await page.screenshot({ path: path.join(dir, `still_${t.toFixed(2)}.png`) });
  }
  console.log('stills ->', dir);
  await browser.close();
  process.exit(0);
}

const dur = 30, from = +arg('from', 0), to = +arg('to', dur);
const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
const frames = path.join(tmpdir(), 'velorci-frames');
const encodeOnly = process.argv.includes('--encode-only'); // re-encode frames kept from the last capture
if (!encodeOnly) { rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true }); }
const samples = [];
for (let i = f0; i < f1; i++) for (let k = 0; k < sub; k++) samples.push((i - f0) * sub + k);
const timeOf = j => { const i = Math.floor(j / sub) + f0, k = j % sub; return Math.min(dur - 1e-4, i / fps + (sub > 1 ? k * (shutter / fps) / sub : 0)); };

const t0 = Date.now(); let done = 0;
if (!encodeOnly) await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const b = w ? await launch() : browser; // one browser per worker so compositing runs in parallel
  const page = await openPage(b);
  for (let j = w; j < samples.length; j += workers) {
    await page.evaluate(x => window.seek(x), timeOf(j));
    await page.screenshot({ path: path.join(frames, String(j).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 95 });
    if (++done % 90 === 0) process.stdout.write(`\r${done}/${samples.length} samples  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (w) await b.close();
}));
await browser.close();
if (!encodeOnly) console.log(`\ncaptured in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

const vf = [
  sub > 1 ? `tmix=frames=${sub}` : null,
  sub > 1 ? `select='eq(mod(n\\,${sub})\\,${sub - 1})'` : null,
  `setpts=N/${fps}/TB`,
  'scale=in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p',
  'noise=c0s=3:c0f=t',
].filter(Boolean).join(',');
const ffArgs = ['-y', '-framerate', String(fps * sub), '-i', path.join(frames, '%06d.jpg')];
const withAudio = existsSync(audio) && from === 0 && to === dur;
if (withAudio) ffArgs.push('-i', audio);
ffArgs.push('-vf', vf, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-maxrate', '11M', '-bufsize', '22M', '-tune', 'grain', '-profile:v', 'high', '-level', '4.2',
  '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv');
if (withAudio) ffArgs.push('-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest');
ffArgs.push('-movflags', '+faststart', out);
await new Promise((res, rej) => { const p = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'inherit', 'inherit'] }); p.on('exit', c => (c ? rej(new Error('ffmpeg ' + c)) : res())); });
console.log('wrote', out, '(frames kept in', frames + ')');
