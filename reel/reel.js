/* Velorci — Instagram Reel (1080x1920, 30s).
   Every frame is a pure function of time: window.seek(t) poses the whole film.
   render.mjs steps through it; ?play previews it in real time. */
'use strict';
(() => {
const TL = window.TL;
const frame = document.getElementById('frame');

/* ---------------- utilities ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inQ: u => u * u,
  outQ: u => 1 - (1 - u) * (1 - u),
  inC: u => u * u * u,
  outC: u => 1 - Math.pow(1 - u, 3),
  out4: u => 1 - Math.pow(1 - u, 4),
  ioC: u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  inE: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  outE: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  io5: u => (u < .5 ? 16 * u ** 5 : 1 - Math.pow(-2 * u + 2, 5) / 2),
  outBack: u => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const MB_GAP = (.5 / 30) / 5; // seconds between motion-blur samples (180-degree shutter, 5 samples)
const wob = (t, s) => Math.sin(t * 1.3 + s) * .5 + Math.sin(t * 2.9 + s * 1.7) * .3 + Math.sin(t * 6.1 + s * .3) * .2;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function h(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
const f2 = n => n.toFixed(2);
const blurF = (b, extra = '') => (b > .25 ? `blur(${b.toFixed(1)}px) ${extra}` : extra || 'none');
let uid = 0;

/* ---------------- brand ---------------- */
const LOGO_D = ['M299 456L48 205L203 50L435 282L540 177', 'M184 186L435 437L667 205L513 51L358 206'];
const logoSVG = (w, color = '#65D4D2', cls = '') =>
  `<svg class="${cls}" width="${w}" height="${Math.round(w * 484 / 716)}" viewBox="0 0 716 484" style="display:block;overflow:visible"><g fill="none" stroke="${color}" stroke-width="56" stroke-linejoin="miter">${LOGO_D.map(d => `<path d="${d}"/>`).join('')}</g></svg>`;

const IC = {
  orders: '<path d="M5 8h14l-1.2 12H6.2L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  pos: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  crm: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.4 2.7-5.6 6-5.6s6 2.2 6 5.6"/><circle cx="17.2" cy="9" r="2.4"/><path d="M16.4 13.9c2.6.2 4.6 2.1 4.6 5"/>',
  inventory: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  accounting: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  chat: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5a8.4 8.4 0 1 1 15.5-4.4z"/>',
  marketing: '<path d="M3.5 10v4h3l7.5 4.5v-13L6.5 10z"/><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  analytics: '<path d="M4 20h16M7 16v-4M12 16V7M17 16v-7"/>',
  automation: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  ai: '<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  dcheck: '<path d="M2.5 12.5l4 4L15 8M11 16.5l1 1L21.5 8"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  trend: '<path d="M3.5 16.5l6-6 4 4 7-7"/><path d="M15 7.5h5.5V13"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  truck: '<path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
};
const icon = (n, s = 24, c = 'currentColor', w = 1.8) => {
  const sz = typeof s === 'number' ? s + 'px' : s;
  return `<svg viewBox="0 0 24 24" style="width:${sz};height:${sz};display:block;flex:none" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
};

/* ---------------- silhouettes ---------------- */
const OWNER_A = 'M215 900C205 800 200 700 208 610C212 560 222 520 246 490C280 452 340 436 392 418C378 392 372 352 378 318C390 252 440 220 494 222C530 223 558 238 572 262C590 262 620 268 650 272C720 280 790 286 842 296C870 302 890 320 888 348C884 420 850 520 812 600C800 700 796 800 790 900Z'
  + 'M818 372C760 364 690 360 624 362C606 380 596 400 590 420C640 438 690 452 736 468C768 440 796 404 818 372Z';
const CHAIR = 'M262 900L270 700C272 660 296 642 336 640L664 640C704 642 728 660 730 700L738 900Z';
const OWNER_B = 'M318 1100C312 1020 304 950 300 890C286 860 266 820 250 770C236 726 230 690 230 640C230 580 234 520 244 480C254 440 276 418 316 404C360 390 410 376 440 356C452 344 454 330 452 312C432 300 418 282 414 262C400 260 396 236 404 222C406 214 410 210 416 212C418 150 452 104 500 102C548 104 582 150 584 212C590 210 594 214 596 222C604 236 600 260 586 262C582 282 568 300 548 312C546 330 548 344 560 356C590 376 640 390 684 404C724 418 746 440 756 480C766 520 770 580 770 640C770 690 764 726 750 770C734 820 714 860 700 890C696 950 688 1020 682 1100Z'
  + 'M300 560C296 620 296 690 312 740C322 770 336 790 346 800C344 740 340 680 332 620C326 590 314 570 300 560Z'
  + 'M700 560C704 620 704 690 688 740C678 770 664 790 654 800C656 740 660 680 668 620C674 590 686 570 700 560Z';
function ownerSVG(kind, rim, rim2, o = {}) {
  const vOp = o.v ?? .22, rOp = o.r ?? .62;
  const id = 'own' + (uid++), A = kind === 'A', d = A ? OWNER_A : OWNER_B;
  return `<svg viewBox="${A ? '0 0 1000 900' : '0 0 1000 1100'}" width="100%" height="100%" style="display:block;overflow:visible">
  <defs>
   <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.top || '#0c1b1e'}"/><stop offset=".45" stop-color="#040b0d"/><stop offset="1" stop-color="#010304"/></linearGradient>
   <radialGradient id="${id}v" cx=".5" cy=".22" r=".55"><stop offset="0" stop-color="${rim2}" stop-opacity="${vOp}"/><stop offset="1" stop-color="${rim2}" stop-opacity="0"/></radialGradient>
   <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rim}" stop-opacity="${rOp}"/><stop offset=".22" stop-color="${rim}" stop-opacity="${f2(rOp * .35)}"/><stop offset=".5" stop-color="${rim}" stop-opacity="0"/></linearGradient>
   <clipPath id="${id}c"><path d="${d}" clip-rule="evenodd"/></clipPath>
   <filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
   <filter id="${id}b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>
  <path d="${d}" fill="url(#${id}g)" fill-rule="evenodd"/>
  <path d="${d}" fill="url(#${id}v)" fill-rule="evenodd"/>
  <g clip-path="url(#${id}c)"><path d="${d}" fill="none" stroke="url(#${id}r)" stroke-width="26" filter="url(#${id}b)"/><path d="${d}" fill="none" stroke="url(#${id}r)" stroke-width="2.5" filter="url(#${id}b2)" opacity=".55"/></g>
  ${A ? `<path d="${CHAIR}" fill="#060f11"/><path d="M270 700C272 660 296 642 336 640L664 640C704 642 728 660 730 700" fill="none" stroke="${rim}" stroke-opacity=".28" stroke-width="3" filter="url(#${id}b2)"/>` : ''}
  </svg>`;
}

/* ---------------- chaos "other tools" ---------------- */
const chatApp = o => `<div class="app ${o.cls || 'wa'}" style="width:${o.w}em;height:${o.h}em">
  <div class="ah"><div class="av">${icon('chat', '1.15em', '#fff', 2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div>${o.badge != null ? `<div class="bdg" ${o.count ? `data-count="${o.count}"` : ''}>${o.badge}</div>` : ''}</div>
  <div class="ab chat" style="height:${o.h - 3.6}em;justify-content:flex-end;overflow:hidden">${o.msgs.map((m, i) => `<div class="bub ${m[0]}" ${o.pops && o.pops[i] != null ? `data-pop="${o.pops[i]}"` : ''}>${m[1]}<i>${m[2] || ''}</i></div>`).join('')}</div></div>`;

const sheetApp = o => {
  const tpl = `2.2em ${o.cols.map(c => c + 'em').join(' ')}`;
  let cells = '<div class="hd"></div>' + o.head.map(x => `<div class="hd">${x}</div>`).join('');
  o.rows.forEach((r, ri) => { cells += `<div class="hd">${ri + 1}</div>` + r.map((x, ci) => `<div class="${(o.mark && o.mark[ri + ',' + ci]) || (x === '#REF!' || x === 'Unreconciled' ? 'err' : '')}">${x}</div>`).join(''); });
  return `<div class="app sheet" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="at">${o.title}</div><div class="as" style="margin-left:auto;opacity:.85">${o.sub || ''}</div></div><div class="fx">fx&nbsp;&nbsp;${o.fx || '=SUM(D2:D14)'}</div><div class="grid" style="grid-template-columns:${tpl}">${cells}</div></div>`;
};
const posApp = o => `<div class="app pos" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="av">${icon('pos', '1.1em', '#fff', 2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div></div><div>${o.rows.map(r => `<div class="tx ${r[3] || ''}"><span>${r[0]} <span class="mut">${r[1]}</span></span><span class="amt">${r[2]}</span></div>`).join('')}</div></div>`;
const invApp = o => `<div class="app inv" style="width:${o.w}em;height:${o.h}em"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h4>Invoice</h4><div style="font-size:.7em;opacity:.6">${o.no}</div></div><div class="stamp">OVERDUE</div></div><div style="margin-top:.9em">${o.lines.map(l => `<div class="ln"><span>${l[0]}</span><span>${l[1]}</span></div>`).join('')}</div><div class="ln" style="border:none;font-weight:600;font-size:.85em"><span>Total due</span><span>${o.total}</span></div><div style="font-size:.66em;color:#D64541;margin-top:.4em">${o.note}</div></div>`;
function jag(seed, base = 70) {
  const r = rng(seed); let d = '', y = base;
  for (let i = 0; i <= 20; i++) { y = clamp(y + (r() - .5) * 46, 12, 100); d += (i ? 'L' : 'M') + (i * 20) + ' ' + y.toFixed(1); }
  return d;
}
const adsApp = o => `<div class="app ads" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="av">${icon('marketing', '1.1em', '#fff', 2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div></div><div class="mets">${o.mets.map(m => `<div class="met"><span>${m[0]}</span><b>${m[1]}</b>${m[2] ? `<div class="bad">${m[2]}</div>` : ''}</div>`).join('')}</div><svg viewBox="0 0 400 110" style="width:100%;height:${o.ch || 5}em;display:block" preserveAspectRatio="none"><path d="${jag(o.seed || 3)}" fill="none" stroke="#5B7CFA" stroke-width="2.5"/><path d="${jag((o.seed || 3) + 7, 40)}" fill="none" stroke="#F0675E" stroke-width="2" stroke-dasharray="5 5"/></svg></div>`;
const mailApp = o => `<div class="app mail" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="av">${icon('mail', '1.1em', '#fff', 2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div><div class="bdg" style="background:#2F80ED">${o.badge}</div></div>${o.rows.map(r => `<div class="mr"><div class="dot"></div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>`;
const biApp = o => `<div class="app bi" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="av">${icon('analytics', '1.1em', '#10161C', 2.2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div></div>
  ${o.big ? `<div style="padding:.3em 1em 0;display:flex;align-items:flex-end;justify-content:space-between"><div><div style="font-size:.66em;opacity:.6">${o.big[0]}</div><div style="font-size:1.9em;font-weight:600;letter-spacing:-.02em">${o.big[1]}</div></div><div class="warn">${icon('alert', '1.1em', '#F5A623', 2)}${o.warn}</div></div>` : `<div style="padding:0 1em"><div class="warn">${icon('alert', '1.1em', '#F5A623', 2)}${o.warn}</div></div>`}
  <div style="display:flex;align-items:flex-end;gap:.5em;height:${o.bh || 7}em;padding:.6em 1em 1em">${o.bars.map((b, i) => `<div style="flex:1;height:${b}%;background:${i === o.bars.length - 1 ? 'repeating-linear-gradient(45deg,#E8A317 0 .3em,#4a3810 .3em .6em)' : '#E8A317'};border-radius:.25em .25em 0 0;opacity:${.5 + .5 * b / 100}"></div>`).join('')}</div></div>`;
const crmApp = o => `<div class="app crm" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="av">${icon('crm', '1.1em', '#fff', 2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div></div>${o.rows.map(r => `<div class="cr"><div class="ci">${r[0]}</div><div><div>${r[1]}</div><div class="ph">${r[2]}</div></div>${r[3] ? `<div class="tag ${r[4] || 'red'}">${r[3]}</div>` : ''}</div>`).join('')}</div>`;
const ordApp = o => `<div class="app oadm" style="width:${o.w}em;height:${o.h}em"><div class="ah"><div class="av">${icon('orders', '1.1em', '#fff', 2)}</div><div><div class="at">${o.title}</div><div class="as">${o.sub}</div></div><div class="bdg">${o.badge}</div></div>${o.rows.map(r => `<div class="orow"><span style="opacity:.55">${r[0]}</span><span>${r[1]}</span><span style="font-weight:600">${r[2]}</span><span class="pill ${r[4]}">${r[3]}</span></div>`).join('')}</div>`;

const TOAST_KIND = {
  order: ['orders', '#B8862E'], fail: ['alert', '#C9443A'], msg: ['chat', '#1E9E57'], stock: ['inventory', '#B8862E'],
  dm: ['chat', '#7E4CC0'], refund: ['pos', '#C9443A'], call: ['phone', '#C9443A'], inv: ['accounting', '#C9443A'],
  sync: ['alert', '#C9443A'], driver: ['truck', '#3B6FD8'], review: ['user', '#B8862E'], price: ['alert', '#B8862E'], mail: ['mail', '#3B6FD8'],
};
const toast = (k, a, b, fs = 22) => `<div class="toast" style="font-size:${fs}px"><div class="ti" style="background:${TOAST_KIND[k][1]}">${icon(TOAST_KIND[k][0], '1.05em', '#fff', 2.2)}</div><div><b>${a}</b><small>${b}</small></div></div>`;

const TOASTS = [
  ['order', 'New order #4821', 'Instagram · KWD 18.500'], ['msg', '3 new messages', 'WhatsApp'], ['fail', 'Payment failed', 'Card declined · #4817'],
  ['stock', 'Low stock', 'Velvet Ottoman · 2 left'], ['dm', 'New DM', 'Is this still available?'], ['refund', 'Refund requested', 'Order #4790'],
  ['call', 'Missed call', 'Customer · 2 min ago'], ['inv', 'Invoice overdue', 'INV-2291 · 14 days'], ['sync', 'Sync failed', 'Inventory not updated'],
  ['order', 'New order #4822', 'Website · KWD 64.000'], ['msg', '5 new messages', 'WhatsApp'], ['driver', 'Driver not assigned', 'Order #4815'],
  ['stock', 'Out of stock', 'Linen Sofa'], ['order', 'New order #4823', 'WhatsApp · KWD 12.750'], ['fail', 'Chargeback', 'KWD 145.000'],
  ['dm', '12 unread', 'Instagram DMs'], ['fail', 'Order cancelled', '#4809'], ['price', 'Price mismatch', 'POS vs. website'],
  ['review', 'New review · 2/5', 'Late delivery'], ['msg', 'Where is my order?', 'WhatsApp · Noura'], ['sync', 'Stock count error', 'Warehouse B'],
  ['order', 'New order #4824', 'POS · KWD 33.250'],
];
const NAMES = ['Noura A.', 'Fahad K.', 'Sara M.', 'Dana S.', 'Yousef M.', 'Mariam H.', 'Ali R.', 'Huda B.', 'Omar T.', 'Reem S.'];

/* ---------------- velorci UI ---------------- */
function smoothPath(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
function chart(vals, w, hgt, pad) {
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const pts = vals.map((v, i) => [+(i * w / (vals.length - 1)).toFixed(1), +(hgt - pad - (v - mn) / (mx - mn) * (hgt - 2 * pad)).toFixed(1)]);
  const line = smoothPath(pts);
  return { pts, line, area: `${line}L${w} ${hgt}L0 ${hgt}Z` };
}

function dashboard() {
  const id = 'dg' + (uid++), c = chart([38, 52, 46, 63, 58, 79, 96], 792, 196, 16), pk = c.pts[6];
  return `<div class="dash glass">
  <div class="dgrid"></div>
  <div class="d-top"><div class="d-brand">${logoSVG(56)}<span>velorci</span></div>
   <div class="d-right"><div class="ai-pill">${icon('ai', 22, '#65D4D2', 2)}<span class="ai-txt">AI · Live</span></div><div class="d-av">A</div></div></div>
  <div class="d-title"><div><div class="d-greet">Good evening</div><div class="d-h">Overview</div></div><div class="d-date">Today</div></div>
  <div class="d-kpis">
   <div class="kpi"><div class="k-l">Revenue</div><div class="k-v"><span data-num="12480">12,480</span><small>KWD</small></div><div class="k-d">↑ 18.4%</div></div>
   <div class="kpi"><div class="k-l">Orders</div><div class="k-v"><span data-num="312">312</span></div><div class="k-d">↑ 9.2%</div></div>
   <div class="kpi"><div class="k-l">Customers</div><div class="k-v"><span data-num="1248">1,248</span></div><div class="k-d">+64 new</div></div>
  </div>
  <div class="card d-chart"><div class="c-h">Sales <span>Last 7 days</span></div>
   <svg width="792" height="196" viewBox="0 0 792 196" style="position:absolute;left:24px;bottom:18px;overflow:visible">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#65D4D2" stop-opacity=".34"/><stop offset="1" stop-color="#65D4D2" stop-opacity="0"/></linearGradient></defs>
    ${[0, 1, 2, 3].map(i => `<line x1="0" x2="792" y1="${16 + i * 54}" y2="${16 + i * 54}" stroke="rgba(143,170,176,.12)"/>`).join('')}
    <path class="area" d="${c.area}" fill="url(#${id})"/>
    <path class="draw" d="${c.line}" fill="none" stroke="#65D4D2" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="${pk[0]}" cy="${pk[1]}" r="9" fill="#E8FFFE" stroke="#65D4D2" stroke-width="4"/>
   </svg>
   <div class="hl" style="inset:-2px;border-radius:30px"></div><div class="a-sales" style="position:absolute;left:${24 + pk[0] - 1}px;top:${290 - 18 - 196 + pk[1] - 1}px;width:2px;height:2px"></div>
  </div>
  <div class="d-row">
   <div class="card"><div class="c-h">Customers <span>Live</span></div>
    <div class="row a-cust"><div class="ini">FK</div><div><div class="nm">Fahad K.</div><div class="sb">Cart · KWD 145.000</div></div><div class="hl"></div></div>
    <div class="row"><div class="ini">NA</div><div><div class="nm">Noura A.</div><div class="sb">3 visits this week</div></div></div>
    <div class="row"><div class="ini">SM</div><div><div class="nm">Sara M.</div><div class="sb">VIP · 23 orders</div></div></div>
   </div>
   <div class="card"><div class="c-h">Inventory <span>3 sites</span></div>
    <div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><span class="nm">Lounge Chair</span><span class="sb">142</span></div><div class="bar"><i data-grow style="width:78%"></i></div></div>
    <div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><span class="nm">Linen Sofa</span><span class="sb">38</span></div><div class="bar"><i data-grow style="width:36%"></i></div></div>
    <div class="row a-inv" style="display:block"><div style="display:flex;justify-content:space-between"><span class="nm">Velvet Ottoman</span><span class="sb" style="color:#F5A623">6 left</span></div><div class="bar"><i data-grow class="low" style="width:9%"></i></div><div class="hl"></div></div>
   </div>
  </div>
  <div class="card d-wa a-wa"><div class="wa-ic">${icon('chat', 34, '#65D4D2', 2)}</div><div style="flex:1;min-width:0"><div class="nm" style="font-size:22px">Yousef M. <span class="sb" style="margin-left:8px">WhatsApp · 2 days ago</span></div><div class="sb" style="font-size:19px;margin-top:4px;color:#BFD5D8">“Can you hold the sofa until Thursday?”</div></div><div class="hl" style="inset:-2px;border-radius:30px"></div></div>
  <div class="scanline"></div><div class="sweep"></div>
 </div>`;
}

const MODS = [
  ['Orders', 'orders', 'Every channel, one queue'], ['POS', 'pos', 'Sell in-store, synced live'], ['CRM', 'crm', 'Know every customer'],
  ['Inventory', 'inventory', 'Stock that updates itself'], ['Accounting', 'accounting', 'Books that close themselves'], ['WhatsApp', 'chat', 'Conversations that convert'],
  ['Marketing', 'marketing', 'Campaigns with real ROI'], ['Analytics', 'analytics', 'Every number, in real time'], ['Automation', 'automation', 'Workflows on autopilot'],
  ['AI', 'ai', 'Your built-in analyst'],
];
const PRODS = [['Floor Pouf', '24.500', 1], ['Lounge Chair', '145.000', 2], ['Linen Sofa', '389.000', 3], ['Coffee Table', '89.000', 4], ['Velvet Ottoman', '54.750', 5], ['Oval Rug', '65.000', 6]];
const img = n => `../assets/prod-${n}.png`;

function modBody(i) {
  const D = (d, s) => `data-in="${d}" ${s ? `style="${s}"` : ''}`;
  switch (i) {
    case 0: return `<div class="stat2"><div class="st" ${D(0)}><b data-num="312">312</b><span>Orders today</span></div><div class="st" ${D(.05)}><b>KWD <span data-num="4820">4,820</span></b><span>Revenue</span></div></div>
      ${[['#4824', 'Noura A.', 'Instagram', '18.500', 'New', 's-tq'], ['#4823', 'Fahad K.', 'WhatsApp', '64.000', 'Preparing', 's-am'], ['#4822', 'Sara M.', 'Website', '145.000', 'On the way', 's-bl'], ['#4821', 'Yousef M.', 'POS', '33.250', 'Delivered', 's-gr'], ['#4820', 'Dana S.', 'Instagram', '12.750', 'Delivered', 's-gr']]
        .map((r, k) => `<div class="or" ${D(.08 + k * .04)}><div class="id">${r[0]}</div><div><div class="nm">${r[1]}</div><div style="margin-top:6px;display:flex;gap:8px"><span class="ch">${r[2]}</span><span class="stt ${r[5]}">${r[4]}</span></div></div><div class="amt">KWD ${r[3]}</div></div>`).join('')}`;
    case 1: return `<div class="prods">${PRODS.map((p, k) => `<div class="pt" ${D(k * .03)}><img src="${img(p[2])}"><div>${p[0]}<b>${p[1]}</b></div></div>`).join('')}</div>
      <div class="card" style="margin-top:20px;padding:20px 24px" ${D(.15)}><div style="display:flex;justify-content:space-between;font-size:21px;color:#8FAAB0"><span>Linen Sofa × 1</span><span>389.000</span></div><div style="display:flex;justify-content:space-between;font-size:21px;color:#8FAAB0;margin-top:6px"><span>Floor Pouf × 2</span><span>49.000</span></div><div style="display:flex;justify-content:space-between;font-size:28px;font-weight:600;margin-top:12px"><span>Total</span><span>KWD 438.000</span></div></div>
      <div class="btn" style="margin-top:18px" ${D(.2)}>Charge KWD 438.000 ${icon('arrow', 30, '#041316', 2.4)}</div>`;
    case 2: return `<div style="display:flex;align-items:center;gap:24px" ${D(0)}><div class="ini" style="width:110px;height:110px;font-size:38px">NA</div><div><div style="font-size:36px;font-weight:600;letter-spacing:-.02em">Noura Ahmad</div><div style="margin-top:10px"><span class="chip">VIP</span><span class="chip">Repeat buyer</span><span class="chip">Instagram</span></div></div></div>
      <div class="stat2" style="margin-top:24px"><div class="st" ${D(.05)}><b>KWD <span data-num="1240">1,240</span></b><span>Lifetime value</span></div><div class="st" ${D(.08)}><b data-num="23">23</b><span>Orders</span></div></div>
      ${[['orders', 'Ordered Linen Sofa', '2 days ago'], ['chat', 'Asked about delivery on WhatsApp', '3 days ago'], ['marketing', 'Opened Autumn Collection', '5 days ago']].map((r, k) => `<div class="or" ${D(.12 + k * .04)}><div class="fi" style="width:52px;height:52px;border-radius:16px;background:rgba(101,212,210,.12);display:grid;place-items:center">${icon(r[0], 26, '#65D4D2', 2)}</div><div><div class="nm" style="font-size:22px">${r[1]}</div><div class="sb" style="font-size:17px">${r[2]}</div></div></div>`).join('')}`;
    case 3: return `<div class="stat2"><div class="st" ${D(0)}><b data-num="1486">1,486</b><span>Items in stock</span></div><div class="st" ${D(.05)}><b>3</b><span>Warehouses</span></div></div>
      ${[[2, 'Lounge Chair', 142, 78], [3, 'Linen Sofa', 38, 36], [5, 'Velvet Ottoman', 6, 9], [4, 'Coffee Table', 64, 52], [6, 'Oval Rug', 91, 64]].map((r, k) => `<div class="or" ${D(.08 + k * .04)}><img src="${img(r[0])}" style="width:64px;height:64px;border-radius:16px"><div style="flex:1"><div style="display:flex;justify-content:space-between"><span class="nm" style="font-size:22px">${r[1]}</span><span class="sb" style="font-size:19px;${r[2] < 10 ? 'color:#F5A623;font-weight:600' : ''}">${r[2] < 10 ? r[2] + ' · Low' : r[2]}</span></div><div class="bar" style="height:10px"><i data-grow class="${r[2] < 10 ? 'low' : ''}" style="width:${r[3]}%"></i></div></div></div>`).join('')}`;
    case 4: return `<div class="st" style="margin-bottom:18px" ${D(0)}><span>Net profit · September</span><b style="font-size:52px">KWD <span data-num="27580">27,580</span></b><span style="color:#65D4D2;font-weight:600">↑ 22% vs. August</span></div>
      <div class="stat2"><div class="st" ${D(.04)}><b data-num="48920">48,920</b><span>Revenue</span></div><div class="st" ${D(.07)}><b data-num="21340">21,340</b><span>Expenses</span></div></div>
      <div class="card" style="height:250px;display:flex;align-items:flex-end;gap:22px;padding:28px 30px" ${D(.1)}>${[46, 58, 52, 67, 74, 92].map((v, k) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;height:100%;justify-content:flex-end"><div data-growy style="width:100%;height:${v}%;border-radius:12px;background:${k === 5 ? '#65D4D2' : 'rgba(101,212,210,.28)'};transform-origin:50% 100%"></div><span class="sb">${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][k]}</span></div>`).join('')}</div>`;
    case 5: return `${[['FK', 'Fahad K.', 'Can I change the color?', '2m', 1], ['SM', 'Sara M.', 'Thank you! Received.', '8m', 0], ['DS', 'Dana S.', 'Is the rug washable?', '15m', 1]].map((r, k) => `<div class="or" ${D(k * .04)}><div class="ini" style="width:56px;height:56px">${r[0]}</div><div style="flex:1;min-width:0"><div class="nm" style="font-size:22px">${r[1]}</div><div class="sb" style="font-size:18px">${r[2]}</div></div><div style="text-align:right"><div class="sb">${r[3]}</div>${r[4] ? '<div style="width:14px;height:14px;border-radius:50%;background:#65D4D2;margin:8px 0 0 auto"></div>' : ''}</div></div>`).join('')}
      <div class="card" style="margin-top:18px;padding:22px" ${D(.14)}><div class="bub2 in">Hi! Where is my order #4822?</div><div class="bub2 out" style="display:flex;gap:10px;align-items:flex-end;width:fit-content">Out for delivery, arriving by 6 PM. ${icon('dcheck', 24, '#0F6F7A', 2.2)}</div><span class="chip" style="margin-top:6px">${icon('ai', 20, '#65D4D2', 2)} Auto-reply sent</span></div>`;
    case 6: return `<div class="stat2"><div class="st" ${D(0)}><b>6.2×</b><span>ROAS this month</span></div><div class="st" ${D(.05)}><b>KWD <span data-num="7688">7,688</span></b><span>Attributed revenue</span></div></div>
      ${[['Autumn Collection', 'Instagram', '6.2×', 86], ['Win-back', 'WhatsApp broadcast', '4.8×', 68], ['Search', 'Google', '3.9×', 52], ['New arrivals', 'Email', '3.1×', 40]].map((r, k) => `<div class="or" style="display:block" ${D(.08 + k * .04)}><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="nm" style="font-size:23px">${r[0]}</div><div class="sb" style="font-size:17px">${r[1]}</div></div><div style="font-size:28px;font-weight:600;color:#65D4D2">${r[2]}</div></div><div class="bar" style="height:10px;margin-top:10px"><i data-grow style="width:${r[3]}%"></i></div></div>`).join('')}`;
    case 7: { const c = chart([30, 42, 38, 51, 47, 60, 56, 71, 66, 82, 78, 96], 690, 300, 20);
      return `<div class="st" ${D(0)}><span>Revenue · this month</span><b style="font-size:54px">KWD <span data-num="48920">48,920</span></b><span style="color:#65D4D2;font-weight:600">↑ 18.4%</span></div>
      <div class="card" style="margin-top:18px;height:340px;padding:20px" ${D(.06)}><svg width="690" height="300" viewBox="0 0 690 300" style="overflow:visible"><defs><linearGradient id="mg7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#65D4D2" stop-opacity=".38"/><stop offset="1" stop-color="#65D4D2" stop-opacity="0"/></linearGradient></defs><path d="${c.area}" fill="url(#mg7)"/><path class="draw" d="${c.line}" fill="none" stroke="#65D4D2" stroke-width="5" stroke-linecap="round"/></svg></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px">${[['4.8%', 'Conversion'], ['53.9', 'Avg. order'], ['41%', 'Returning']].map((m, k) => `<div class="st" style="padding:16px 18px" ${D(.1 + k * .03)}><b style="font-size:32px">${m[0]}</b><span style="font-size:17px">${m[1]}</span></div>`).join('')}</div>`; }
    case 8: return `<div class="flow"><svg width="6" height="560" style="position:absolute;left:58px;top:60px"><line x1="3" y1="0" x2="3" y2="560" stroke="rgba(101,212,210,.35)" stroke-width="3" stroke-dasharray="8 8"/></svg>
      ${[['bell', 'When', 'New order received'], ['chat', 'Then', 'Send WhatsApp confirmation'], ['inventory', 'Then', 'Update inventory'], ['truck', 'Then', 'Assign a driver'], ['user', 'After delivery', 'Ask for a review']].map((r, k) => `<div class="fn" ${D(k * .05)}><div class="fi">${icon(r[0], 28, '#65D4D2', 2)}</div><div><span class="k">${r[1]}</span>${r[2]}</div>${k === 0 ? '<div class="flowdot" style="position:absolute;left:44px;top:96px;width:18px;height:18px;border-radius:50%;background:#E8FFFE;box-shadow:0 0 18px #65D4D2"></div>' : ''}</div>`).join('')}</div>`;
    case 9: return `<div class="bub2 in" style="font-size:24px" ${D(0)}>How did we do this week?</div>
      <div class="card" style="padding:26px;border-color:rgba(101,212,210,.4)" ${D(.08)}><div style="display:flex;align-items:center;gap:12px;color:#65D4D2;font-weight:600;font-size:20px;letter-spacing:.06em">${icon('ai', 26, '#65D4D2', 2)} VELORCI AI</div>
       <div style="font-size:27px;line-height:1.45;margin-top:14px">Revenue is up <b style="color:#65D4D2">18%</b>. Linen Sofa is your top seller. Restock <b style="color:#65D4D2">40 units</b> before Thursday.</div></div>
      <div style="margin-top:22px" ${D(.16)}><span class="chip">${icon('inventory', 20, '#65D4D2', 2)} Create restock order</span><span class="chip">${icon('chat', 20, '#65D4D2', 2)} Notify top customers</span><span class="chip">${icon('analytics', 20, '#65D4D2', 2)} Weekly report</span></div>`;
  }
}
const modCard = i => `<div class="mod glass"><div class="m-h"><div class="m-ic">${icon(MODS[i][1], 50, '#65D4D2', 1.8)}</div><div><div class="m-t">${MODS[i][0]}</div><div class="m-s">${MODS[i][2]}</div></div><div class="live"><i></i>Live</div></div><div class="m-b">${modBody(i)}</div></div>`;
const tileHTML = (i, extra = '') => `<div class="tile glass" style="${extra}"><div class="ti2">${icon(MODS[i][1], 62, '#65D4D2', 1.7)}</div><div>${MODS[i][0]}</div></div>`;

/* ---------------- shared animators ---------------- */
function prep(root) {
  return {
    pops: $$('[data-pop]', root).map(e => ({ e, t: +e.dataset.pop })),
    counts: $$('[data-count]', root).map(e => { const [a, b, t0, t1] = e.dataset.count.split(','); return { e, a: +a, b: +b, t0: +t0, t1: +t1 }; }),
    ins: $$('[data-in]', root).map(e => ({ e, d: +e.dataset.in })),
    nums: $$('[data-num]', root).map(e => ({ e, v: +e.dataset.num })),
    grows: $$('[data-grow]', root),
    growy: $$('[data-growy]', root),
    draws: $$('path.draw', root).map(e => ({ e, L: 0 })),
  };
}
/* NOW = sample time, TF = start of the video frame it belongs to. Text that changes (counters, labels)
   follows TF so every motion-blur sample of a frame shows the same digits. */
let NOW = 0, TF = 0;
function runPops(A, t) {
  for (const p of A.pops) {
    if (p.t < 0) continue;
    p.e.style.display = t < p.t ? 'none' : '';
    const u = E.outBack(P(t, p.t, p.t + .3));
    p.e.style.opacity = f2(P(t, p.t, p.t + .1));
    p.e.style.transform = `scale(${f2(.6 + .4 * u)})`;
  }
  for (const c of A.counts) {
    const v = Math.round(lerp(c.a, c.b, E.inQ(P(TF, c.t0, c.t1))));
    c.e.textContent = v >= 999 ? '999+' : String(v);
  }
}
/* r = time relative to the moment the element group "arrives" */
function runBuild(A, r, span = .5) {
  for (const x of A.ins) { const u = E.outC(P(r, x.d - .22, x.d + .2)); x.e.style.opacity = f2(u); x.e.style.transform = `translateY(${f2((1 - u) * 26)}px)`; }
  const k = E.outC(P(r, -.15, span)), kF = E.outC(P(r - (NOW - TF), -.15, span));
  for (const x of A.nums) x.e.textContent = Math.round(x.v * kF).toLocaleString('en-US');
  for (const g of A.grows) g.style.transform = `scaleX(${f2(k)})`;
  for (const g of A.growy) g.style.transform = `scaleY(${f2(k)})`;
  for (const d of A.draws) { if (!d.L) d.L = d.e.getTotalLength(); d.e.style.strokeDasharray = d.L; d.e.style.strokeDashoffset = f2(d.L * (1 - E.ioC(P(r, -.2, span + .1)))); }
}

/* ---------------- scenes ---------------- */
const scenes = [];
function scene(id, a, b, fn) { const el = h(`<div class="scene" id="${id}"></div>`); frame.appendChild(el); scenes.push({ el, a, b, fn }); return el; }
const objHTML = (inner, fs) => `<div class="obj"${fs ? ` style="font-size:${fs}px"` : ''}>${inner}</div>`;
const place = (el, x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => {
  el.style.transform = `translate3d(${f2(x)}px,${f2(y)}px,${f2(z)}px) rotateY(${f2(ry)}deg) rotateX(${f2(rx)}deg) rotateZ(${f2(rz)}deg) scale(${f2(s)}) translate(-50%,-50%)`;
};
function bokehHTML(n, seed, cols, opts = {}) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) {
    const d = 40 + r() * (opts.max || 180), c = cols[Math.floor(r() * cols.length)];
    s += `<div class="bokeh" data-x="${r() * 1080}" data-y="${r() * 1920}" data-v="${(r() - .5) * 30}" style="width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;background:radial-gradient(circle,${c} 0%,transparent 70%);opacity:${(.15 + r() * .35).toFixed(2)};filter:blur(${(6 + r() * 14).toFixed(1)}px)"></div>`;
  }
  return s;
}
function runBokeh(list, t) { for (const b of list) b.e.style.transform = `translate(${f2(b.x + b.v * t)}px,${f2(b.y - b.v * .6 * t)}px)`; }
const prepBokeh = root => $$('.bokeh', root).map(e => ({ e, x: +e.dataset.x, y: +e.dataset.y, v: +e.dataset.v }));

/* ===== SCENE 1 · CHAOS (0–4s) ===== */
const S1 = {};
{
  const el = scene('s1', 0, 4.0, renderS1);
  el.innerHTML = `
  <div class="L" style="background:radial-gradient(ellipse 75% 46% at 50% 40%,#123238 0%,#081c20 45%,#020709 100%)"></div>
  <div class="L" id="s1bok">${bokehHTML(16, 11, ['#E8A317', '#C9443A', '#65D4D2', '#E8FFFE', '#3B6FD8'])}</div>
  <div class="stage" style="perspective:1300px;perspective-origin:540px 820px"><div class="world" id="s1w" style="left:540px;top:820px"></div></div>
  <div class="L" style="background:radial-gradient(ellipse 52% 20% at 50% 70%,rgba(150,205,215,.28),transparent 70%)"></div>
  <div class="L" style="background:linear-gradient(180deg,transparent 60%,rgba(160,210,220,.09) 68%,rgba(160,210,220,.03) 74%,transparent 80%)"></div>
  <div class="c2d" id="s1own" style="width:940px;height:846px;transform-origin:470px 846px">${ownerSVG('A', '#d6f3f3', '#7fb9c0')}</div>
  <div class="stage" style="perspective:1300px;perspective-origin:540px 820px"><div class="world" id="s1fw" style="left:540px;top:820px"></div></div>
  <div class="L" style="background:linear-gradient(180deg,rgba(2,8,10,.92) 0,rgba(2,8,10,.62) 250px,rgba(2,8,10,0) 720px)"></div>`;
  S1.w = $('#s1w', el); S1.fw = $('#s1fw', el); S1.own = $('#s1own', el); S1.bok = prepBokeh(el);
  const P1 = [
    { h: chatApp({ w: 19, h: 23, title: 'WhatsApp Business', sub: 'Customer chats', badge: '12', count: '12,47,0,3.9', msgs: [['in', 'Hi, is my order ready?', '9:41'], ['in', 'Do you deliver today?', '9:42'], ['out', 'Checking now…', '9:42'], ['in', 'Hello??', '9:44'], ['in', 'Price please', '9:45'], ['in', 'Still waiting…', '9:46'], ['in', 'Can I pay cash?', '9:47']], pops: [-1, -1, TL.chatPops[0], TL.chatPops[1], TL.chatPops[2], TL.chatPops[3], TL.chatPops[4]] }), x: -310, y: -250, z: -240, ry: 16 },
    { h: chatApp({ cls: 'ig', w: 18, h: 20, title: 'Instagram Direct', sub: '9 conversations', badge: '9', msgs: [['in', 'I want to order 2 pieces', '9:30'], ['in', 'Still available in grey?', '9:38'], ['out', 'Let me check', '9:39'], ['in', 'Do you ship to Salmiya?', '9:43']] }), x: 330, y: -470, z: -560, ry: -14 },
    { h: sheetApp({ w: 29, h: 17, title: 'orders_final_v3.xlsx', sub: 'Shared · 4 editors', head: ['Order', 'Customer', 'Channel', 'Total', 'Status'], cols: [3.6, 5.4, 4.4, 4, 4.6], rows: [['4821', 'Noura A.', 'Instagram', '18.500', 'Pending'], ['4820', 'Fahad K.', 'WhatsApp', '64.000', '???'], ['4819', 'Sara M.', 'Website', '#REF!', 'Paid?'], ['4818', 'Dana S.', 'POS', '12.750', 'Pending'], ['4817', 'Yousef M.', 'Instagram', '33.250', 'Failed'], ['4816', 'Mariam H.', 'WhatsApp', '#REF!', 'Pending'], ['4815', 'Ali R.', 'Website', '89.000', 'Unpaid']], mark: { '1,4': 'hi', '2,4': 'hi', '4,4': 'err', '6,4': 'err' } }), x: 60, y: -150, z: -980, ry: -4 },
    { h: posApp({ w: 19, h: 18, title: 'POS · Terminal 2', sub: 'Shift open · 6h 12m', rows: [['#10431', 'Card', 'KWD 12.500'], ['#10430', 'Cash', 'KWD 64.000'], ['#10429', 'Refund', '−KWD 4.250', 'ref'], ['#10428', 'Card', 'KWD 145.000'], ['#10427', 'Void', '−KWD 18.500', 'ref'], ['#10426', 'Card', 'KWD 33.250'], ['#10425', 'Cash', 'KWD 9.750']] }), x: -450, y: 430, z: -400, ry: 24 },
    { h: invApp({ w: 15, h: 19, no: 'INV-2291 · Due 14 days ago', lines: [['Linen Sofa', '389.000'], ['Delivery', '5.000'], ['Assembly', '15.000']], total: 'KWD 409.000', note: 'Reminder not sent' }), x: 450, y: 340, z: -300, ry: -24, rz: 3 },
    { h: adsApp({ w: 23, h: 15, title: 'Ads Manager', sub: 'Account · Store KW', mets: [['Spend', '1,240', ''], ['Results', '38', ''], ['Cost/result', '32.6', '↑ 38%']], seed: 4 }), x: -140, y: -780, z: -760, ry: 6, rx: -8 },
    { h: mailApp({ w: 21, h: 16, title: 'Support inbox', sub: 'support@', badge: '128', rows: [['Noura', 'Where is my order?'], ['Fahad', 'Wrong size delivered'], ['Sara', 'Refund request #4790'], ['Ali', 'Invoice copy please'], ['Dana', 'Delivery time?']] }), x: 430, y: -930, z: -1100, ry: -10 },
    { h: biApp({ w: 22, h: 14, title: 'Sales report', sub: 'Export · weekly', warn: 'Not synced', bars: [44, 61, 52, 78, 70, 88, 30], bh: 6.5 }), x: -520, y: -980, z: -1260, ry: 12 },
    { h: sheetApp({ w: 22, h: 13, title: 'stock_count.xlsx', sub: 'Warehouse B', head: ['SKU', 'Item', 'Count', 'System'], cols: [3.4, 6, 3.4, 3.6], rows: [['VO-01', 'Velvet Ottoman', '2', '9'], ['LS-03', 'Linen Sofa', '0', '4'], ['LC-02', 'Lounge Chair', '17', '#REF!'], ['OR-06', 'Oval Rug', '11', '11']], mark: { '0,2': 'err', '1,2': 'err' } }), x: 560, y: -300, z: -1400, ry: -10 },
    { h: chatApp({ w: 16, h: 16, title: 'WhatsApp', sub: 'Delivery group', badge: '31', msgs: [['in', 'Driver is late again', ''], ['in', 'Address unclear', ''], ['out', 'Calling now', '']] }), x: -700, y: -220, z: -1700, ry: 14 },
    { h: posApp({ w: 18, h: 13, title: 'POS · Terminal 1', sub: 'Offline', rows: [['#9921', 'Card', 'KWD 54.750'], ['#9920', 'Card', 'KWD 24.500'], ['#9919', 'Refund', '−KWD 12.750', 'ref']] }), x: 720, y: 360, z: -1600, ry: -16 },
    { h: adsApp({ w: 20, h: 13, title: 'Campaigns', sub: '3 running', mets: [['Spend', '640', ''], ['CPA', '28.4', '↑ 21%']], seed: 9 }), x: 160, y: -1320, z: -1800, ry: 0 },
  ];
  const FG = [
    { h: posApp({ w: 18, h: 16, title: 'POS · Returns', sub: '4 pending', rows: [['#10411', 'Refund', '−KWD 33.250', 'ref'], ['#10406', 'Refund', '−KWD 12.500', 'ref']] }), x: -560, y: 560, z: 330, ry: 32 },
    { h: chatApp({ w: 17, h: 15, title: 'WhatsApp Business', sub: 'New chat', badge: '4', msgs: [['in', 'Hello?', ''], ['in', 'Anyone there?', '']] }), x: 600, y: -640, z: 300, ry: -30 },
  ];
  S1.panels = [];
  const r = rng(5);
  for (const p of P1.concat(FG)) {
    const o = h(objHTML(p.h, 20));
    (FG.includes(p) ? S1.fw : S1.w).appendChild(o);
    S1.panels.push(Object.assign(p, { el: o, s: r() * 6, vx: (r() - .5) * 14, vy: (r() - .5) * 10, fg: FG.includes(p) }));
  }
  S1.toasts = TL.toasts.map((t0, i) => {
    const T = TOASTS[i % TOASTS.length];
    const o = h(objHTML(toast(T[0], T[1], T[2], 22 + Math.floor(r() * 5))));
    S1.w.appendChild(o);
    return { el: o, t0, x: (r() - .5) * 980, y: -230 + r() * 900, z: -320 + r() * 420, ry: (r() - .5) * 26, vx: (r() - .5) * 26, vy: (r() - .5) * 18, s: r() * 6 };
  });
  S1.anims = prep(el);
}
function renderS1(t) {
  const u = t / 4;
  const camZ = 430 * (.55 * u + .45 * u * u);
  const A = 2 + 9 * u * u;
  const cam = `translate3d(${f2(A * wob(t * 2.2, 1))}px,${f2(A * wob(t * 2.2, 2))}px,${f2(camZ)}px) rotateZ(${f2(.35 * u * wob(t * 1.7, 3))}deg)`;
  S1.w.style.transform = cam; S1.fw.style.transform = cam;
  for (const p of S1.panels) {
    place(p.el, p.x + p.vx * t, p.y + p.vy * t + Math.sin(t * .9 + p.s) * 6, p.z, p.ry + Math.sin(t * .6 + p.s) * 1.5, p.rx || 0, p.rz || 0);
    const ze = p.z + camZ, b = p.fg ? 10 + ze / 60 : Math.min(9, Math.abs(ze + 120) / 150);
    p.el.style.filter = blurF(b, p.fg ? 'brightness(.7)' : '');
  }
  for (const q of S1.toasts) {
    const vis = t >= q.t0; q.el.style.display = vis ? '' : 'none'; if (!vis) continue;
    const k = E.outBack(P(t, q.t0, q.t0 + .3)), dt = t - q.t0;
    place(q.el, q.x + q.vx * dt, q.y + q.vy * dt + Math.sin(t * 1.4 + q.s) * 4, q.z, q.ry, 0, 0, .7 + .3 * k);
    q.el.style.opacity = f2(P(t, q.t0, q.t0 + .08));
    const b = Math.min(6, Math.abs(q.z + camZ + 120) / 160); q.el.style.filter = blurF(b);
  }
  const os = 1 + .13 * E.ioC(u);
  S1.own.style.transform = `translate(70px,${f2(1078 + 6 * Math.sin(t * 1.1))}px) scale(${f2(os)})`;
  S1.own.style.filter = 'blur(1.6px)';
  runBokeh(S1.bok, t);
  runPops(S1.anims, t);
}

/* ===== SCENE 2 · THE PROBLEM (4–7s) ===== */
const S2 = {};
{
  const el = scene('s2', 4.0, 7.0, renderS2);
  el.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 80% 60% at 50% 55%,#0b1d21,#020608 80%)"></div><div class="L" id="s2bok">${bokehHTML(14, 23, ['#E8A317', '#C9443A', '#E8FFFE', '#3B6FD8'], { max: 220 })}</div>
   <div class="stage" style="perspective:1400px;perspective-origin:540px 1000px"><div class="world" id="s2w" style="left:540px;top:1000px"></div></div>
   <div class="L" style="background:linear-gradient(180deg,rgba(2,7,9,.94) 0,rgba(2,7,9,.72) 300px,rgba(2,7,9,0) 760px)"></div>`;
  S2.w = $('#s2w', el); S2.bok = prepBokeh(el);
  const shade = dir => `<div class="shade" style="background:linear-gradient(${dir},rgba(0,0,0,0) 35%,rgba(0,0,0,.55))"></div>`;
  const ordRows = [['#4821', 'Noura A.', '18.500', 'Pending', 'p-amb'], ['#4820', 'Fahad K.', '64.000', 'Unpaid', 'p-red'], ['#4819', 'Sara M.', '145.000', 'Pending', 'p-amb'], ['#4818', 'Dana S.', '12.750', 'Unfulfilled', 'p-gry'], ['#4817', 'Yousef M.', '33.250', 'Failed', 'p-red'], ['#4816', 'Mariam H.', '54.750', 'Pending', 'p-amb'], ['#4815', 'Ali R.', '89.000', 'Unpaid', 'p-red'], ['#4814', 'Huda B.', '24.500', 'Pending', 'p-amb'], ['#4813', 'Omar T.', '65.000', 'Cancelled', 'p-red'], ['#4812', 'Reem S.', '145.000', 'Pending', 'p-amb'], ['#4811', 'Khaled N.', '18.500', 'Unpaid', 'p-red']];
  const ledger = [['01/09', 'Sales', '4,820.000', '', '4,820.000'], ['02/09', 'Inventory', '', '1,240.500', '3,579.500'], ['03/09', 'Rent', '', '950.000', '2,629.500'], ['04/09', 'Sales', '3,112.250', '', '5,741.750'], ['05/09', 'Refunds', '', '212.000', '#REF!'], ['06/09', 'Shipping', '', '184.750', '#REF!'], ['07/09', 'Sales', '2,980.000', '', '#REF!'], ['08/09', 'Ads', '', '640.000', '#REF!'], ['09/09', '???', '1,050.000', '', 'Unreconciled'], ['10/09', 'Sales', '3,440.500', '', '#REF!'], ['11/09', 'Salaries', '', '2,100.000', '#REF!'], ['12/09', 'POS diff.', '', '64.250', 'Unreconciled'], ['13/09', 'Sales', '2,718.000', '', '#REF!'], ['14/09', 'Refunds', '', '145.000', '#REF!']];
  S2.shots = [
    { t0: 4.0, t1: 4.6, fs: 36, h: ordApp({ w: 24, h: 30, title: 'Orders', sub: 'Store admin · updated 2h ago', badge: '23 pending', rows: ordRows }) + shade('90deg'), a: [120, 130, 120, -24, 6, 0], b: [20, 100, 240, -16, 5, 0] },
    { t0: 4.6, t1: 5.2, fs: 36, h: crmApp({ w: 24, h: 30, title: 'Contacts', sub: 'CRM · 2,384 records', rows: [['NA', 'Noura A.', '+965 •••• 0142', 'Duplicate'], ['NA', 'Noura Ahmad', '+965 •••• 0142', 'Duplicate'], ['FK', 'Fahad K.', 'No phone', 'Incomplete', 'amb'], ['SM', 'Sara M.', '+965 •••• 7781'], ['DS', 'Dana S.', '+965 •••• 3390', 'Unsubscribed', 'gry'], ['YM', 'Yousef M.', '+965 •••• 1208'], ['MH', 'Mariam H.', 'No email', 'Incomplete', 'amb'], ['AR', 'Ali R.', '+965 •••• 5521', 'Duplicate'], ['AR', 'Ali Rashed', '+965 •••• 5521', 'Duplicate'], ['HB', 'Huda B.', '+965 •••• 9034']] }) + shade('270deg'), a: [-120, 130, 120, 24, 4, 0], b: [-20, 100, 240, 16, 4, 0] },
    { t0: 5.2, t1: 5.8, fs: 36, h: biApp({ w: 24, h: 24, title: 'Sales report', sub: 'BI export · weekly', big: ['Revenue (estimated)', 'KWD 41,2··'], warn: 'Last synced 3 days ago', bars: [42, 58, 51, 73, 66, 88, 35], bh: 13 }) + shade('180deg'), a: [0, 220, 60, -6, 20, 0], b: [0, 120, 210, -4, 12, 0] },
    { t0: 5.8, t1: 6.3, fs: 32, h: sheetApp({ w: 27, h: 30, title: 'ledger_2025_FINAL(2).xlsx', sub: 'Accounting', fx: '=SUM(D2:D19)-#REF!', head: ['Date', 'Account', 'Debit', 'Credit', 'Balance'], cols: [3.6, 5.4, 5.6, 5.6, 6.6], rows: ledger, mark: { '8,1': 'hi', '11,1': 'hi' } }) + shade('270deg'), a: [110, 120, 140, 20, 4, -2], b: [20, 90, 270, 14, 3, -1] },
  ];
  for (const s of S2.shots) { s.el = h(objHTML(s.h, s.fs)); S2.w.appendChild(s.el); }
  S2.stoast = [[4.25, 'order', 'New order #4825', 'Instagram · unpaid', 300, -150], [4.85, 'sync', 'Duplicate contact', 'Noura A. · 3 records', -300, -120], [5.45, 'sync', 'Sync failed', 'Sales data · 3 days', 290, 40], [6.0, 'inv', 'Invoice overdue', 'INV-2291 · KWD 409.000', -280, -60]]
    .map(a => { const o = h(objHTML(toast(a[1], a[2], a[3], 28))); S2.w.appendChild(o); return { el: o, t0: a[0], x: a[4], y: a[5] }; });
  // WhatsApp burst
  S2.chat = h(objHTML(chatApp({ w: 21, h: 27, title: 'WhatsApp Business', sub: '214 chats waiting', badge: '48', count: '48,999,6.3,6.95', msgs: [['in', 'Where is my order?', '10:02'], ['in', 'Hello??', '10:02'], ['in', 'Do you have it in grey?', '10:03'], ['in', 'Price?', '10:03'], ['in', 'I sent the payment', '10:04'], ['in', 'When will it arrive?', '10:04'], ['in', 'Please call me', '10:05']] }), 30));
  S2.w.appendChild(S2.chat);
  const MSG = ['Where is my order?', 'Do you have it in grey?', 'Price?', 'Hello??', 'Can I return this?', 'Is delivery free?', 'I sent the payment', 'When will it arrive?', 'Wrong item received', 'Any discount?', 'Still waiting…', 'Is this available?', 'Please call me'];
  const NM = ['Noura', 'Fahad', 'Sara', 'Dana', 'Yousef', 'Mariam', 'Ali', 'Huda', 'Omar', 'Reem', 'Khaled', 'Lulwa', 'Nasser'];
  const r = rng(77);
  S2.burst = TL.burst.map((t0, i) => {
    const o = h(objHTML(toast('msg', NM[i % 13], MSG[(i * 5) % 13], 34))); S2.w.appendChild(o);
    const a = (i / TL.burst.length) * Math.PI * 2 * 3.0 + r() * .6;
    return { el: o, t0, a, d: 520 + r() * 520, z: 120 + r() * 560, rz: (r() - .5) * 24 };
  });
  S2.anims = prep(el);
}
function renderS2(t) {
  runBokeh(S2.bok, t);
  runPops(S2.anims, t);
  let cam = '';
  for (const s of S2.shots) {
    const on = t >= s.t0 && t < s.t1; s.el.style.display = on ? '' : 'none'; if (!on) continue;
    const u = E.ioC(P(t, s.t0, s.t1)), A = s.a, B = s.b, punch = 1 + .06 * (1 - E.outC(P(t, s.t0, s.t0 + .16)));
    place(s.el, lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u), lerp(A[3], B[3], u), lerp(A[4], B[4], u), lerp(A[5], B[5], u), punch);
  }
  for (const q of S2.stoast) {
    const on = t >= q.t0 && t < q.t0 + .5; q.el.style.display = on ? '' : 'none'; if (!on) continue;
    const k = E.outBack(P(t, q.t0, q.t0 + .25)); place(q.el, q.x, q.y + (1 - k) * 30, 420, 0, 0, 0, .8 + .2 * k); q.el.style.opacity = f2(P(t, q.t0, q.t0 + .06));
  }
  const bOn = t >= 6.3; S2.chat.style.display = bOn ? '' : 'none';
  if (bOn) {
    const sh = 6 + 22 * P(t, 6.3, 6.95);
    cam = `translate3d(${f2(sh * wob(t * 9, 1))}px,${f2(sh * wob(t * 9, 4))}px,0) rotateZ(${f2(.8 * wob(t * 7, 2))}deg)`;
    place(S2.chat, 0, 60, -320 + 120 * P(t, 6.3, 7.0), 0, 0, 0, 1 + .06 * (1 - E.outC(P(t, 6.3, 6.45))));
  }
  for (const q of S2.burst) {
    const on = bOn && t >= q.t0; q.el.style.display = on ? '' : 'none'; if (!on) continue;
    const k = E.outC(P(t, q.t0, q.t0 + .7));
    place(q.el, Math.cos(q.a) * (60 + q.d * k), 60 + Math.sin(q.a) * (60 + q.d * k) * 1.25, -260 + q.z * k + 200 * k, 0, 0, q.rz * k, .7 + .5 * k);
    q.el.style.opacity = f2(P(t, q.t0, q.t0 + .05));
    q.el.style.filter = blurF(Math.min(14, q.d * 3 * (1 - P(t, q.t0, q.t0 + .7)) ** 2 / .7 * MB_GAP * .55));
  }
  S2.w.style.transform = cam;
}

/* ===== SCENE 2f + 3a · WIDE, FREEZE, PULL-IN (7–10s) ===== */
const S3 = {};
{
  const el = scene('s3', 7.0, 10.02, renderS3);
  el.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 80% 55% at 50% 55%,#0b2025,#020608 80%)"></div><div class="L" id="s3bok">${bokehHTML(12, 31, ['#E8A317', '#C9443A', '#E8FFFE'], { max: 200 })}</div>
   <div class="stage" id="s3st" style="perspective:1400px;perspective-origin:540px 1090px"><div class="world" id="s3w" style="left:540px;top:1090px"></div></div>
   <div class="c2d" id="s3ring" style="left:540px;top:1090px;width:400px;height:400px;margin:-200px 0 0 -200px;border-radius:50%;border:2px solid rgba(101,212,210,.8);box-shadow:0 0 40px rgba(101,212,210,.5),inset 0 0 40px rgba(101,212,210,.3);opacity:0;transform-origin:50% 50%"></div>
   <div class="c2d" id="s3core" style="left:540px;top:1090px;width:600px;height:600px;margin:-300px 0 0 -300px;border-radius:50%;background:radial-gradient(circle,#ffffff 0%,#E8FFFE 6%,#65D4D2 16%,rgba(101,212,210,.35) 34%,rgba(15,111,122,.12) 52%,transparent 70%);opacity:0;transform-origin:50% 50%"></div>
   <div class="L" style="background:linear-gradient(180deg,rgba(2,7,9,.9) 0,rgba(2,7,9,.62) 280px,rgba(2,7,9,0) 700px)"></div>`;
  S3.st = $('#s3st', el); S3.w = $('#s3w', el); S3.core = $('#s3core', el); S3.ring = $('#s3ring', el); S3.bok = prepBokeh(el);
  const lab = (s, html) => `<div style="position:relative"><div style="position:absolute;left:0;right:0;top:-46px;text-align:center;font-size:22px;font-weight:600;letter-spacing:.24em;color:rgba(232,255,254,.78)">${s}</div>${html}</div>`;
  const isl = [
    ['WHATSAPP', chatApp({ w: 16, h: 13, title: 'WhatsApp', sub: '214 waiting', badge: '99+', msgs: [['in', 'Where is my order?', ''], ['in', 'Hello??', ''], ['in', 'Price?', '']] }), 0, -330, -320],
    ['CUSTOMERS', crmApp({ w: 16, h: 12, title: 'Contacts', sub: '2,384 records', rows: [['NA', 'Noura A.', 'Duplicate', 'Dup.'], ['FK', 'Fahad K.', 'No phone'], ['SM', 'Sara M.', '+965 •••• 7781']] }), 340, -70, -220],
    ['ACCOUNTING', sheetApp({ w: 17, h: 11, title: 'ledger_FINAL(2).xlsx', head: ['Date', 'Debit', 'Balance'], cols: [3.4, 4.6, 4.6], rows: [['04/09', '3,112.250', '5,741.750'], ['05/09', '', '#REF!'], ['06/09', '', '#REF!'], ['07/09', '2,980.000', '#REF!']] }), 215, 330, -140],
    ['SALES', biApp({ w: 16, h: 11, title: 'Sales report', sub: 'Weekly export', warn: 'Not synced', bars: [44, 61, 52, 78, 70, 88, 30], bh: 5.4 }), -215, 330, -200],
    ['ORDERS', ordApp({ w: 17, h: 12, title: 'Orders', sub: 'Store admin', badge: '23', rows: [['#4821', 'Noura A.', '18.500', 'Pending', 'p-amb'], ['#4820', 'Fahad K.', '64.000', 'Unpaid', 'p-red'], ['#4819', 'Sara M.', '145.000', 'Pending', 'p-amb']] }), -340, -70, -180],
  ];
  const r = rng(9);
  S3.items = [];
  for (const [n, html, x, y, z] of isl) { const o = h(objHTML(lab(n, html), 17)); S3.w.appendChild(o); S3.items.push({ el: o, x, y, z, ry: (r() - .5) * 16, isl: true }); }
  // broken links between systems
  const pts = isl.map(i => [i[2], i[3]]);
  let svg = `<svg width="1400" height="1400" viewBox="-700 -700 1400 1400" style="display:block;overflow:visible">`;
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [4, 2]].forEach(([a, b], k) => {
    const [x1, y1] = pts[a], [x2, y2] = pts[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2, g = .1;
    svg += `<g class="lk" data-k="${k}"><path d="M${x1} ${y1}L${lerp(x1, x2, .5 - g)} ${lerp(y1, y2, .5 - g)}M${lerp(x1, x2, .5 + g)} ${lerp(y1, y2, .5 + g)}L${x2} ${y2}" stroke="rgba(240,103,94,.55)" stroke-width="3" stroke-dasharray="10 12" fill="none"/><circle cx="${mx}" cy="${my}" r="17" fill="#1a0c0c" stroke="rgba(240,103,94,.8)" stroke-width="2.5"/><path d="M${mx - 6} ${my - 6}l12 12M${mx + 6} ${my - 6}l-12 12" stroke="#F0675E" stroke-width="3" stroke-linecap="round"/></g>`;
  });
  svg += '</svg>';
  S3.links = h(objHTML(svg)); S3.w.appendChild(S3.links); S3.lks = $$('.lk', S3.links);
  S3.errs = [['sync', 'Sync failed', 'Orders → Accounting', -150, 150, -60], ['price', 'Data mismatch', 'Sales vs. Customers', 210, 160, -40], ['fail', 'Not connected', 'WhatsApp → Orders', -210, -250, -60]]
    .map(a => { const o = h(objHTML(toast(a[0], a[1], a[2], 20))); S3.w.appendChild(o); return { el: o, x: a[3], y: a[4], z: a[5] }; });
  for (const e of S3.errs) S3.items.push({ el: e.el, x: e.x, y: e.y, z: e.z, ry: 0, err: true });
  // scattered fragments
  for (let i = 0; i < 18; i++) {
    const T = TOASTS[(i * 7) % TOASTS.length], a = r() * Math.PI * 2, d = 560 + r() * 520;
    const o = h(objHTML(toast(T[0], T[1], T[2], 22))); S3.w.appendChild(o);
    S3.items.push({ el: o, x: Math.cos(a) * d * .8, y: Math.sin(a) * d * 1.05, z: -1100 + r() * 1150, ry: (r() - .5) * 30, frag: true });
  }
  const minis = [invApp({ w: 13, h: 16, no: 'INV-2291', lines: [['Linen Sofa', '389.000'], ['Delivery', '5.000']], total: 'KWD 409.000', note: '14 days overdue' }), adsApp({ w: 17, h: 12, title: 'Ads Manager', sub: 'Store KW', mets: [['Spend', '1,240'], ['CPA', '32.6', '↑ 38%']], seed: 5 }), posApp({ w: 15, h: 11, title: 'POS · Terminal 2', sub: 'Shift open', rows: [['#10431', 'Card', 'KWD 12.500'], ['#10429', 'Refund', '−KWD 4.250', 'ref']] }), mailApp({ w: 16, h: 11, title: 'Support inbox', sub: 'support@', badge: '128', rows: [['Noura', 'Where is my order?'], ['Fahad', 'Wrong size']] })];
  [[-470, -620, -700], [470, -560, -900], [-480, 640, -800], [470, 700, -650]].forEach((p, i) => { const o = h(objHTML(minis[i], 16)); S3.w.appendChild(o); S3.items.push({ el: o, x: p[0], y: p[1], z: p[2], ry: (r() - .5) * 20, frag: true }); });
  for (const it of S3.items) { it.s = r() * 6; it.d = r(); it.spin = (r() > .5 ? 1 : -1) * (60 + r() * 60); it.tint = h('<div style="position:absolute;inset:-2px;border-radius:18px;background:radial-gradient(circle,#E8FFFE,#65D4D2 60%);opacity:0;mix-blend-mode:normal;pointer-events:none"></div>'); it.el.appendChild(it.tint); }
}
function renderS3(t) {
  runBokeh(S3.bok, Math.min(t, 8));
  const tf = Math.min(t, TL.freeze), drift = E.inQ(P(tf, 7.0, 8.0));
  const frz = P(t, 8.0, 8.06), back = P(t, 8.6, 9.3);
  S3.st.style.filter = t >= 8.0 ? `saturate(${f2(lerp(1, .12, frz) + .88 * back)}) brightness(${f2(lerp(1, .8, frz) + .2 * back)}) contrast(1.05)` : 'none';
  const shake = t < 8 ? 3 + 5 * drift : 0;
  const camZ = -140 + 140 * E.outQ(P(tf, 7.0, 8.0)) + 40 * P(t, 8.0, 8.6) + 160 * E.inC(P(t, 8.6, 9.95));
  S3.w.style.transform = `translate3d(${f2(shake * wob(tf * 4, 1))}px,${f2(shake * wob(tf * 4, 2))}px,${f2(camZ)}px) rotateY(${f2(-5 + 8 * P(tf, 7, 8))}deg) rotateZ(${f2(4 * E.inC(P(t, 8.6, 9.95)))}deg)`;
  const lkOn = t < 8.75;
  S3.links.style.display = lkOn ? '' : 'none';
  if (lkOn) {
    place(S3.links, 0, 0, -330, 0, 0, 0, 1 + .1 * drift);
    S3.links.style.opacity = f2(1 - P(t, 8.6, 8.75));
    const fi = Math.floor(tf * 30);
    S3.lks.forEach((g, k) => { g.style.opacity = f2(P(t, 7.05 + k * .06, 7.2 + k * .06) * (hash(fi * 13 + k) > .18 ? 1 : .25)); });
  }
  for (const it of S3.items) {
    const sp = 1 + (it.isl ? .12 : it.frag ? .2 : .1) * drift;
    let x = it.x * sp + (t < 8 ? 6 * Math.sin(tf * 2.3 + it.s) : 0), y = it.y * sp + (t < 8 ? 6 * Math.cos(tf * 2.1 + it.s) : 0), z = it.z, rz = it.frag ? 4 * Math.sin(tf + it.s) : 0, s = 1, op = 1;
    if (it.err) op = P(t, 7.25, 7.4) * (hash(Math.floor(tf * 30) * 7 + it.s) > .15 ? 1 : .3);
    const st = TL.pull[0] + .35 * it.d, en = TL.pull[1] - .1 * (1 - it.d);
    const u = E.inC(P(t, st, en));
    if (u > 0) {
      const ang = u * it.spin * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), k = 1 - u;
      const nx = (x * ca - y * sa) * k, ny = (x * sa + y * ca) * k; x = nx; y = ny;
      z = lerp(z, -40, u); s = lerp(1, .06, E.inQ(u)); rz += u * it.spin * .4;
      op *= 1 - P(u, .82, 1);
    }
    place(it.el, x, y, z, it.ry * (1 - u), 0, rz, s);
    it.el.style.opacity = f2(op);
    it.tint.style.opacity = f2(.85 * E.inQ(P(u, .05, .7)));
    const ze = z + camZ, b = (it.frag ? Math.min(7, Math.abs(ze + 150) / 140) : 0) + 9 * u * u;
    it.el.style.filter = blurF(b);
  }
  const r1 = P(t, 8.0, 8.9);
  S3.ring.style.opacity = f2(t >= 8 ? .75 * (1 - r1) : 0);
  S3.ring.style.transform = `scale(${f2(.15 + 3.2 * E.outC(r1))})`;
  const cs = t < 8.25 ? 0 : t < 8.6 ? .18 * E.outBack(P(t, 8.25, 8.6)) : lerp(.18, .62, E.inQ(P(t, 8.6, 9.85))) + 2.4 * E.inE(P(t, 9.75, 10.0));
  S3.core.style.opacity = f2(t < 8.25 ? 0 : clamp(.4 + .6 * P(t, 8.25, 8.5) + .15 * Math.sin(t * 40) * P(t, 9.2, 9.9)));
  S3.core.style.transform = `scale(${f2(cs * (1 + .04 * Math.sin(t * 9)))})`;
}

/* ===== SCENE 3b · MEET VELORCI (10–12s) ===== */
const S3b = {};
function particlesHTML(n, seed, area) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) { const d = 2 + r() * 5; s += `<div class="particle" data-x="${area[0] + r() * area[2]}" data-y="${area[1] + r() * area[3]}" data-v="${10 + r() * 40}" data-p="${r() * 6}" style="width:${d}px;height:${d}px;opacity:${(.15 + r() * .5).toFixed(2)};filter:blur(${(r() * 1.5).toFixed(1)}px)"></div>`; }
  return s;
}
const prepParticles = root => $$('.particle', root).map(e => ({ e, x: +e.dataset.x, y: +e.dataset.y, v: +e.dataset.v, p: +e.dataset.p }));
function runParticles(list, t) { for (const q of list) q.e.style.transform = `translate(${f2(q.x + 14 * Math.sin(t * .7 + q.p))}px,${f2(q.y - q.v * t)}px)`; }
{
  const el = scene('s3b', 9.95, 12.02, renderS3b);
  el.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 85% 55% at 50% 36%,#16494f 0%,#0a2a2f 38%,#041316 70%,#02080a 100%)"></div>
   <div class="c2d" id="s3bglow" style="left:540px;top:400px;width:900px;height:900px;margin:-450px 0 0 -450px;border-radius:50%;background:radial-gradient(circle,rgba(101,212,210,.55) 0%,rgba(101,212,210,.16) 30%,transparent 65%);transform-origin:50% 50%"></div>
   <div class="L" id="s3bp">${particlesHTML(46, 3, [0, 300, 1080, 1800])}</div>
   <div class="stage" style="perspective:1500px;perspective-origin:540px 700px"><div class="world" id="s3bw" style="left:540px;top:1290px"></div></div>
   <div class="c2d" id="s3blogo" style="left:540px;top:395px;transform-origin:0 0">${logoSVG(210)}</div>`;
  S3b.glow = $('#s3bglow', el); S3b.logo = $('#s3blogo', el); S3b.w = $('#s3bw', el); S3b.pp = prepParticles(el);
  S3b.dash = h(objHTML(dashboard())); S3b.w.appendChild(S3b.dash);
  S3b.sweep = $('.sweep', S3b.dash); S3b.A = prep(S3b.dash);
}
function renderS3b(t) {
  runParticles(S3b.pp, t - 10);
  const li = E.outE(P(t, 10.0, 10.55)), lo = E.inC(P(t, 11.45, 11.85));
  S3b.logo.style.opacity = f2(li * (1 - lo));
  S3b.logo.style.transform = `scale(${f2(lerp(1.4, 1, li) * (1 - .2 * lo))}) translate(-105px,-71px)`;
  S3b.logo.style.filter = `blur(${f2((1 - li) * 14 + lo * 8)}px) drop-shadow(0 0 ${f2(18 + 40 * (1 - li))}px rgba(101,212,210,.75))`;
  S3b.glow.style.opacity = f2((.45 + .55 * (1 - E.outC(P(t, 10.0, 10.9)))) * (1 - lo));
  S3b.glow.style.transform = `scale(${f2(.8 + .4 * li)})`;
  const di = E.outE(P(t, 10.02, 10.95)), dx = E.inC(P(t, 11.45, 12.0));
  place(S3b.dash, 0, lerp(520, 0, di) - 520 * dx, lerp(-200, 0, di) + 520 * dx, 0, lerp(50, 30, di) - 30 * dx, 0, 1);
  S3b.dash.style.opacity = f2(P(t, 10.02, 10.3));
  runBuild(S3b.A, t - 10.25, .8);
  const sw = P(t, 10.5, 11.3);
  S3b.sweep.style.opacity = f2(sw > 0 && sw < 1 ? 1 : 0);
  S3b.sweep.style.transform = `translateX(${f2(lerp(-100, 100, E.ioC(sw)))}%)`;
}

/* ===== SCENE 4 · THE PLATFORM (12–20s) ===== */
const S4 = {}, D4 = 40, R4 = 1220;
{
  const bg = scene('s4bg', 11.95, 20.05, () => {});
  bg.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 90% 60% at 50% 52%,#0f3d43 0%,#08262a 40%,#031012 75%,#020809 100%)"></div><div class="L" style="background:radial-gradient(ellipse 60% 16% at 50% 88%,rgba(101,212,210,.12),transparent 70%)"></div>`;
  const el = scene('s4', 11.95, 17.45, renderS4);
  el.innerHTML = `<div class="stage" id="s4st" style="perspective:1500px;perspective-origin:540px 1080px"><div class="world" id="s4w" style="left:540px;top:1080px"><div class="world" id="s4ring"></div></div></div>`;
  S4.st = $('#s4st', el); S4.w = $('#s4w', el); S4.ring = $('#s4ring', el);
  el.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute">${MODS.map((m, i) => `<filter id="mb4_${i}" x="-15%" y="-5%" width="130%" height="110%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`).join('')}</svg>`);
  S4.cards = MODS.map((m, i) => {
    const o = h(objHTML(modCard(i))); S4.ring.appendChild(o);
    o.style.webkitBoxReflect = 'below 26px linear-gradient(transparent 70%, rgba(255,255,255,.16))';
    return { el: o, i, A: prep(o), flowdot: $('.flowdot', o), blur: $(`#mb4_${i} feGaussianBlur`, el) };
  });
}
function curAngle(t) {
  if (t <= TL.modules[0]) return 0;
  const k = Math.min(9, Math.floor((t - TL.modules[0]) / .5));
  if (k >= 9) return 9 * D4;
  const fr = P(t - TL.modules[0] - .5 * k, .16, .5);
  return D4 * (k + E.ioC(fr));
}
function renderS4(t) {
  const cur = curAngle(t);
  // screen speed of the centred card (px/s) -> blur that bridges the gap between motion-blur samples
  const omega = Math.abs(curAngle(t + .002) - curAngle(t - .002)) / .004 * Math.PI / 180;
  const mbx = Math.min(36, omega * R4 * MB_GAP * .55);
  const out = E.inC(P(t, 16.95, 17.25));
  S4.w.style.transform = `translateZ(${f2(-R4 - 900 * out)}px) rotateY(${f2(-cur)}deg)`;
  S4.st.style.opacity = f2(1 - P(t, 17.05, 17.25));
  S4.st.style.filter = out > .01 ? `blur(${f2(out * 10)}px)` : 'none';
  const intro = 1 - E.outC(P(t, 12.0, 12.35));
  for (const c of S4.cards) {
    const d = (c.i * D4 - cur) / D4, ad = Math.abs(d);
    const on = ad < 2.2; c.el.style.display = on ? '' : 'none'; if (!on) continue;
    c.el.style.transform = `rotateY(${f2(c.i * D4)}deg) translateZ(${R4}px) scale(${f2(1 + .08 * intro)}) translate(-50%,-50%)`;
    const dof = Math.min(9, ad * 8), br = `brightness(${f2(1 - Math.min(.62, ad * .6))})`;
    if (mbx > .4) { c.blur.setAttribute('stdDeviation', `${f2(mbx + dof)} ${f2(dof * .6)}`); c.el.style.filter = `url(#mb4_${c.i}) ${br}`; }
    else c.el.style.filter = `blur(${f2(dof)}px) ${br}`;
    runBuild(c.A, t - TL.modules[c.i] + .15, .45);
    if (c.flowdot) c.flowdot.style.transform = `translateY(${f2(((t * 1.6) % 1) * 400)}px)`;
  }
}

const S4n = {};
{
  const el = scene('s4n', 16.95, 20.05, renderS4n);
  el.innerHTML = `<div class="L" id="s4nc" style="transform-origin:540px 1060px">
    <svg id="s4nsvg" width="1080" height="1920" style="position:absolute;left:0;top:0;overflow:visible"><circle id="s4nring" cx="540" cy="1060" r="375" fill="none" stroke="rgba(101,212,210,.28)" stroke-width="2"/></svg>
    <div class="c2d" id="s4ncore" style="transform-origin:120px 120px"><div class="core">${logoSVG(132)}</div></div>
   </div>`;
  S4n.c = $('#s4nc', el); S4n.svg = $('#s4nsvg', el); S4n.ringC = $('#s4nring', el); S4n.core = $('#s4ncore', el);
  S4n.tiles = MODS.map((m, i) => { const o = h(`<div class="c2d" style="transform-origin:85px 85px">${tileHTML(i, 'box-shadow:inset 0 2px 0 rgba(232,255,254,.1),0 24px 60px rgba(0,0,0,.5),0 0 40px rgba(101,212,210,.12)')}</div>`); S4n.c.appendChild(o); return o; });
  S4n.spokes = MODS.map(() => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p.setAttribute('stroke', 'rgba(101,212,210,.55)'); p.setAttribute('stroke-width', '2.5'); S4n.svg.appendChild(p); return p; });
  S4n.pulses = MODS.map(() => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); p.setAttribute('r', '7'); p.setAttribute('fill', '#E8FFFE'); p.setAttribute('style', 'filter:drop-shadow(0 0 8px #65D4D2)'); S4n.svg.appendChild(p); return p; });
}
function renderS4n(t) {
  const cx = 540, cy = 1060, R = 375, ph = -90 + 5 * (t - 17);
  const push = E.inE(P(t, TL.corePush[0], TL.corePush[1]));
  S4n.c.style.transform = `scale(${f2((.94 + .08 * E.ioC(P(t, 17, 19.6))) * (1 + 6 * push))})`;
  const ci = E.outBack(P(t, 17.0, 17.45));
  S4n.core.style.transform = `translate(${cx - 120}px,${cy - 120}px) scale(${f2(ci * (1 + .03 * Math.sin(t * 4)))})`;
  S4n.core.style.opacity = f2(P(t, 17.0, 17.15));
  const rl = 2 * Math.PI * R, ru = E.ioC(P(t, 17.7, 18.5));
  S4n.ringC.style.strokeDasharray = `${f2(rl * ru)} ${f2(rl)}`;
  S4n.ringC.style.transform = `rotate(${f2(ph)}deg)`; S4n.ringC.style.transformOrigin = '540px 1060px';
  const fadeT = 1 - P(t, 19.6, 19.85);
  MODS.forEach((m, i) => {
    const a = (ph + 36 * i) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const s0 = TL.network + .14 + .035 * i, pu0 = P(t, s0, s0 + .6), ui = E.outC(pu0);
    const rr = lerp(R * 1.7, R, ui), x = cx + ca * rr, y = cy + sa * rr, spd = 3 * (1 - pu0) ** 2 / .6 * .7 * R;
    const tl = S4n.tiles[i];
    tl.style.transform = `translate(${f2(x - 85)}px,${f2(y - 85)}px) scale(${f2(lerp(1.5, 1, ui))})`;
    tl.style.opacity = f2(P(t, s0, s0 + .12) * fadeT);
    tl.style.filter = blurF(Math.min(14, spd * MB_GAP * .55));
    const x1 = cx + ca * 128, y1 = cy + sa * 128, x2 = cx + ca * (R - 96), y2 = cy + sa * (R - 96), L = R - 224;
    const sp = S4n.spokes[i]; sp.setAttribute('x1', f2(x1)); sp.setAttribute('y1', f2(y1)); sp.setAttribute('x2', f2(x2)); sp.setAttribute('y2', f2(y2));
    const du = E.ioC(P(t, TL.lines[0] + .05 * i, TL.lines[0] + .45 + .05 * i));
    sp.style.strokeDasharray = `${f2(L * du)} ${L}`; sp.style.opacity = f2(fadeT);
    const pt0 = 18.05 + .09 * i, pu = S4n.pulses[i];
    if (t > pt0) {
      const q = ((t - pt0) / .85) % 1, dir = i % 2 ? q : 1 - q;
      pu.setAttribute('cx', f2(lerp(x1, x2, dir))); pu.setAttribute('cy', f2(lerp(y1, y2, dir)));
      pu.style.opacity = f2(Math.sin(Math.PI * q) * fadeT);
    } else pu.style.opacity = 0;
  });
}

/* ===== SCENE 5 · AI INTELLIGENCE (20–24s) ===== */
const S5 = {};
{
  const el = scene('s5', 19.95, 24.02, renderS5);
  el.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 85% 60% at 50% 52%,#0e3a40 0%,#071f23 45%,#02090b 100%)"></div>
   <div class="L" style="opacity:.5;background-image:linear-gradient(rgba(101,212,210,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(101,212,210,.05) 1px,transparent 1px);background-size:60px 60px;-webkit-mask-image:radial-gradient(ellipse 70% 50% at 50% 55%,#000,transparent)"></div>
   <div class="stage" style="perspective:1800px;perspective-origin:540px 1110px"><div class="world" id="s5w" style="left:540px;top:1110px"></div></div>
   <svg id="s5svg" width="1080" height="1920" style="position:absolute;left:0;top:0"></svg>
   <div class="L" id="s5chips"></div>
   <div class="L" style="background:linear-gradient(180deg,rgba(2,9,11,.88) 0,rgba(2,9,11,.5) 260px,rgba(2,9,11,0) 560px)"></div>`;
  S5.w = $('#s5w', el); S5.svg = $('#s5svg', el); S5.chipsL = $('#s5chips', el);
  S5.dash = h(objHTML(dashboard())); S5.w.appendChild(S5.dash);
  S5.A = prep(S5.dash); S5.scan = $('.scanline', S5.dash); S5.grid = $('.dgrid', S5.dash); S5.ai = $('.ai-txt', S5.dash);
  const sigs = [
    ['a-sales', 'L', 'trend', '#65D4D2', 'Sales opportunity detected'],
    ['a-cust', 'R', 'user', '#3ad07a', 'Customer ready to buy'],
    ['a-inv', 'L', 'inventory', '#F5A623', 'Low stock detected'],
    ['a-wa', 'R', 'chat', '#65D4D2', 'Follow-up recommended'],
  ];
  S5.sigs = sigs.map((s, k) => {
    const chip = h(`<div class="sig"><div class="si" style="background:${s[3]}22;border:1.5px solid ${s[3]}88;color:${s[3]}">${icon(s[2], 34, s[3], 2)}</div><div><div class="sk">AI INSIGHT</div><div class="st2">${s[4]}</div></div></div>`);
    S5.chipsL.appendChild(chip);
    const ping = h('<div class="ping"></div>'), pr = h('<div class="pring"></div>');
    S5.chipsL.appendChild(pr); S5.chipsL.appendChild(ping);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ln.setAttribute('fill', 'none'); ln.setAttribute('stroke', s[3]); ln.setAttribute('stroke-width', '2.5'); ln.setAttribute('stroke-linecap', 'round');
    S5.svg.appendChild(ln);
    const anchor = $('.' + s[0], S5.dash);
    return { k, side: s[1], chip, ping, pr, ln, anchor, hl: $('.hl', anchor) || $('.hl', anchor.parentElement), t0: TL.signals[k] };
  });
}
function renderS5(t) {
  const intro = E.outE(P(t, 20.0, 20.55)), outro = E.inC(P(t, 23.6, 24.0));
  const s = lerp(1.55, .8, intro) + .035 * P(t, 20.5, 23.6) + .45 * outro;
  place(S5.dash, -20, 0, 0, -4 + 2.5 * P(t, 20, 24), 3, 0, s);
  S5.dash.style.opacity = f2(P(t, 19.95, 20.12));
  runBuild(S5.A, t - 20.1, .7);
  const sc = P(t, TL.scan[0], TL.scan[1]);
  S5.scan.style.opacity = f2(sc > 0 && sc < 1 ? 1 : 0);
  S5.scan.style.transform = `translateY(${f2(lerp(-260, 1210, E.ioC(sc)))}px)`;
  S5.grid.style.opacity = f2(.9 * P(t, TL.scan[0], TL.scan[0] + .25) * (1 - .6 * P(t, TL.scan[1] - .1, TL.scan[1] + .4)));
  S5.ai.textContent = TF < TL.scan[0] ? 'AI · Live' : TF < TL.scan[1] ? 'Analyzing…' : (TF < TL.signals[3] ? 'AI · Insights' : '4 insights');
  const fade = 1 - P(t, 23.55, 23.85);
  for (const g of S5.sigs) {
    const on = t >= g.t0 - .1;
    g.chip.style.display = g.ping.style.display = g.pr.style.display = on ? '' : 'none';
    g.ln.style.display = on ? '' : 'none';
    g.hl.style.opacity = f2(P(t, g.t0 - .05, g.t0 + .15) * fade);
    if (!on) continue;
    const r = g.anchor.getBoundingClientRect(), fr = frame.getBoundingClientRect(), sc2 = fr.width / 1080;
    const ar = { l: (r.left - fr.left) / sc2, r: (r.right - fr.left) / sc2, t: (r.top - fr.top) / sc2, b: (r.bottom - fr.top) / sc2 };
    let ax, ay = (ar.t + ar.b) / 2;
    if (g.anchor.classList.contains('a-sales')) ax = ar.l;
    else if (g.anchor.classList.contains('a-wa')) ax = ar.l + 6;
    else ax = g.side === 'L' ? ar.l + 6 : ar.r - 6;
    if (!g.w) { g.w = g.chip.offsetWidth; g.h = g.chip.offsetHeight; }
    const u = E.outE(P(t, g.t0, g.t0 + .5)), cy = ay - g.h / 2 + (g.k === 0 ? -150 : g.k === 3 ? 96 : 0);
    const cx = g.side === 'L' ? 48 - 40 * (1 - u) : 1032 - g.w + 40 * (1 - u);
    g.chip.style.transform = `translate(${f2(cx)}px,${f2(cy)}px) scale(${f2(.92 + .08 * u)})`;
    g.chip.style.opacity = f2(P(t, g.t0, g.t0 + .18) * fade);
    g.chip.style.filter = blurF((1 - u) * 8);
    g.ping.style.transform = `translate(${f2(ax)}px,${f2(ay)}px) scale(${f2(E.outBack(P(t, g.t0 - .1, g.t0 + .15)))})`;
    g.ping.style.opacity = f2(fade);
    const q = ((t - g.t0) / .9) % 1;
    g.pr.style.transform = `translate(${f2(ax)}px,${f2(ay)}px) scale(${f2(1 + 3 * q)})`;
    g.pr.style.opacity = f2((1 - q) * .8 * fade * (t > g.t0 ? 1 : 0));
    const ex = g.side === 'L' ? cx + g.w : cx, ey = cy + g.h / 2;
    const d = `M${f2(ex)} ${f2(ey)}L${f2((ex + ax) / 2)} ${f2(ey)}L${f2((ex + ax) / 2)} ${f2(ay)}L${f2(ax)} ${f2(ay)}`;
    g.ln.setAttribute('d', d);
    const L = Math.abs(ax - ex) + Math.abs(ay - ey) + 1;
    g.ln.style.strokeDasharray = `${f2(L * E.ioC(P(t, g.t0 + .05, g.t0 + .4)))} ${f2(L + 10)}`;
    g.ln.style.opacity = f2(.85 * fade);
  }
}

/* ===== SCENE 6 · HERO (24–27.5s) + END CARD (27.5–30s) ===== */
const S6 = {};
{
  const el = scene('s6', 23.95, 27.62, renderS6);
  el.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 80% 50% at 50% 44%,#0f3a40 0%,#082427 40%,#030d0f 75%,#010506 100%)"></div>
   <div class="L" style="background:radial-gradient(ellipse 70% 14% at 50% 70%,rgba(101,212,210,.14),transparent 70%)"></div>
   <div class="L" id="s6p">${particlesHTML(30, 8, [0, 200, 1080, 1700])}</div>
   <div class="L" id="s6g" style="transform-origin:540px 880px">
     <svg width="1080" height="1920" style="position:absolute;left:0;top:0;z-index:10"><path id="s6back" fill="none" stroke="rgba(101,212,210,.22)" stroke-width="2"/></svg>
     <div class="c2d" id="s6halo" style="z-index:20;left:540px;top:880px;width:1100px;height:1100px;margin:-550px 0 0 -550px;border-radius:50%;background:radial-gradient(circle,rgba(101,212,210,.22),transparent 62%)"></div>
     <div class="c2d" id="s6dash" style="z-index:50"></div>
     <svg width="1080" height="1920" style="position:absolute;left:0;top:0;z-index:80"><path id="s6front" fill="none" stroke="rgba(101,212,210,.45)" stroke-width="2.5"/></svg>
   </div>
   <div class="L" style="background:radial-gradient(ellipse 34% 16% at 38% 70%,rgba(101,212,210,.13),transparent 70%)"></div>
   <div class="c2d" id="s6own" style="width:820px;height:902px;transform-origin:410px 902px">${ownerSVG('B', '#BFF3F2', '#65D4D2', { v: .05, r: .5, top: '#071214' })}</div>
   <div class="L" style="background:linear-gradient(180deg,rgba(1,5,6,.85) 0,rgba(1,5,6,.4) 280px,rgba(1,5,6,0) 520px)"></div>
   <div class="L" id="s6dim" style="background:#010405;opacity:0"></div>`;
  S6.g = $('#s6g', el); S6.own = $('#s6own', el); S6.dashW = $('#s6dash', el); S6.back = $('#s6back', el); S6.front = $('#s6front', el); S6.dim = $('#s6dim', el); S6.pp = prepParticles(el);
  S6.dashW.innerHTML = dashboard();
  S6.dashW.style.transform = 'translate(540px,880px) scale(.56) translate(-460px,-605px)';
  S6.A = prep(S6.dashW);
  S6.tiles = MODS.map((m, i) => { const o = h(`<div class="c2d" style="transform-origin:85px 85px">${tileHTML(i, 'box-shadow:inset 0 2px 0 rgba(232,255,254,.1),0 20px 50px rgba(0,0,0,.55)')}</div>`); S6.g.appendChild(o); return o; });
  S6.dots = [0, 1, 2].map(() => { const d = h('<div class="c2d" style="width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#E8FFFE;box-shadow:0 0 14px #65D4D2"></div>'); S6.g.appendChild(d); return d; });
}
const ELL = { cx: 540, cy: 1185, rx: 470, ry: 118, tilt: -5 * Math.PI / 180 };
function ellPt(a) {
  const x = ELL.rx * Math.cos(a), y = ELL.ry * Math.sin(a), ct = Math.cos(ELL.tilt), st = Math.sin(ELL.tilt);
  return [ELL.cx + x * ct - y * st, ELL.cy + x * st + y * ct];
}
function arcPath(a0, a1) { let d = ''; for (let k = 0; k <= 60; k++) { const p = ellPt(lerp(a0, a1, k / 60)); d += (k ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1]); } return d; }
function renderS6(t) {
  const u = P(t, 24.0, 26.7), k = E.out4(u);
  runParticles(S6.pp, t - 24);
  const dimK = E.inQ(P(t, 27.1, 27.5));
  S6.g.style.transform = `translateY(${f2(lerp(80, 0, k))}px) scale(${f2(lerp(1.95, 1, k) * (1 + .05 * dimK))})`;
  S6.back.setAttribute('d', arcPath(Math.PI, 2 * Math.PI)); S6.front.setAttribute('d', arcPath(0, Math.PI));
  runBuild(S6.A, t - 23.6, .6);
  const rot = .55 * (t - 24);
  MODS.forEach((m, i) => {
    const a = rot + i * Math.PI * 2 / 10, p = ellPt(a), front = Math.sin(a) > 0, depth = (Math.sin(a) + 1) / 2;
    const tl = S6.tiles[i], sc = .46 + .26 * depth;
    tl.style.zIndex = front ? 90 : 10;
    tl.style.transform = `translate(${f2(p[0] - 85)}px,${f2(p[1] - 85)}px) scale(${f2(sc)})`;
    tl.style.opacity = f2(P(t, 24.5 + .06 * i, 24.9 + .06 * i) * (.45 + .55 * depth));
    tl.style.filter = front ? 'none' : `blur(${f2(1.6 * (1 - depth))}px)`;
  });
  S6.dots.forEach((d, j) => { const a = -rot * 1.6 + j * 2.1, p = ellPt(a); d.style.zIndex = Math.sin(a) > 0 ? 85 : 12; d.style.transform = `translate(${f2(p[0])}px,${f2(p[1])}px)`; d.style.opacity = f2(P(t, 25, 25.4) * (.5 + .5 * (Math.sin(a) + 1) / 2)); });
  const os = lerp(1.75, 1, k), oy = lerp(520, 0, k);
  const br = 1 + .005 * Math.sin((t - 24) * 2.1);
  S6.own.style.transform = `translate(-14px,${f2(1040 + oy)}px) scale(${f2(os)},${f2(os * br)})`;
  S6.own.style.filter = `blur(${f2(lerp(7, 1.4, k))}px)`;
  S6.own.style.opacity = f2(P(t, 24.0, 24.3));
  S6.dim.style.opacity = f2(dimK);
}

const S7 = {};
{
  const el = scene('s7', 27.38, 30.01, renderS7);
  el.innerHTML = `<div class="L" style="background:radial-gradient(ellipse 85% 52% at 50% 42%,#15474d 0%,#0a2a2f 36%,#041316 70%,#02080a 100%)"></div>
   <div class="L" style="opacity:.035;background:url(../assets/pattern-dark.png) center/540px repeat"></div>
   <div class="L" id="s7frame" style="inset:56px;border:1.5px solid rgba(101,212,210,.26)"></div>
   <div class="L" id="s7p">${particlesHTML(40, 21, [0, 200, 1080, 1800])}</div>
   <div class="c2d" id="s7bloom" style="left:540px;top:760px;width:1200px;height:1200px;margin:-600px 0 0 -600px;border-radius:50%;background:radial-gradient(circle,rgba(232,255,254,.65) 0%,rgba(101,212,210,.4) 14%,rgba(101,212,210,.1) 36%,transparent 62%);transform-origin:50% 50%"></div>
   <div class="c2d" id="s7wave" style="left:540px;top:760px;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;border:3px solid rgba(232,255,254,.85);box-shadow:0 0 40px rgba(101,212,210,.7);transform-origin:50% 50%"></div>
   <div class="L" id="s7card" style="transform-origin:540px 960px">
     <div class="c2d" id="s7logo" style="left:540px;top:760px">${logoSVG(380, '#65D4D2')}</div>
     <div class="c2d wordmark" id="s7wm" style="left:0;width:1080px;top:948px;text-align:center;font-size:140px;line-height:1">velorci</div>
     <div class="c2d" id="s7tag" style="left:0;width:1080px;top:1112px;text-align:center;font-size:27px;font-weight:500;letter-spacing:.38em;color:#65D4D2;padding-left:.38em">BUSINESS OPERATING PLATFORM</div>
     <div class="c2d" id="s7cta" style="left:0;width:1080px;top:1262px;text-align:center"><div class="cta">Discover Velorci ${icon('arrow', 34, '#041316', 2.4)}<div class="shine"></div></div></div>
     <div class="c2d" id="s7url" style="left:0;width:1080px;top:1402px;text-align:center;font-size:24px;color:#8FAAB0;letter-spacing:.06em">velorci.com</div>
   </div>`;
  S7.logo = $('#s7logo', el); S7.paths = $$('path', S7.logo).map(p => ({ p, L: 0 }));
  S7.wm = $('#s7wm', el); S7.tag = $('#s7tag', el); S7.cta = $('#s7cta', el); S7.url = $('#s7url', el); S7.shine = $('.shine', el);
  S7.bloom = $('#s7bloom', el); S7.wave = $('#s7wave', el); S7.card = $('#s7card', el); S7.fr = $('#s7frame', el); S7.pp = prepParticles(el);
  S7.el = el;
}
function renderS7(t) {
  const T0 = TL.impact;
  S7.el.style.opacity = f2(P(t, 27.38, 27.5));
  runParticles(S7.pp, t - 27.5);
  const d = E.outC(P(t, T0 - .05, T0 + .6));
  for (const q of S7.paths) { if (!q.L) q.L = q.p.getTotalLength(); q.p.style.strokeDasharray = q.L; q.p.style.strokeDashoffset = f2(q.L * (1 - d)); }
  S7.logo.style.transform = `scale(${f2(lerp(1.12, 1, E.outC(P(t, T0, T0 + 1.2))))}) translate(-190px,-128px)`;
  S7.logo.style.filter = `drop-shadow(0 0 ${f2(14 + 46 * (1 - P(t, T0, T0 + 1.4)))}px rgba(101,212,210,${f2(.55 + .3 * (1 - P(t, T0, T0 + 1.4)))}))`;
  S7.bloom.style.opacity = f2(t < T0 ? 0 : .35 + .65 * (1 - E.outC(P(t, T0, T0 + 1.3))));
  S7.bloom.style.transform = `scale(${f2(.7 + .5 * E.outC(P(t, T0, T0 + 1.3)))})`;
  const w = P(t, T0, T0 + .9);
  S7.wave.style.opacity = f2(t < T0 ? 0 : .8 * (1 - w));
  S7.wave.style.transform = `scale(${f2(.4 + 3.6 * E.outC(w))})`;
  const wu = E.outE(P(t, 27.85, 28.45));
  S7.wm.style.opacity = f2(wu); S7.wm.style.letterSpacing = `${f2(lerp(.06, -.035, wu))}em`;
  S7.wm.style.transform = `translateY(${f2((1 - wu) * 34)}px)`; S7.wm.style.filter = blurF((1 - wu) * 12);
  const tu = E.outC(P(t, 28.05, 28.55));
  S7.tag.style.opacity = f2(tu); S7.tag.style.transform = `translateY(${f2((1 - tu) * 20)}px)`;
  const cu = P(t, TL.cta, TL.cta + .45);
  S7.cta.style.opacity = f2(P(t, TL.cta, TL.cta + .15)); S7.cta.style.transform = `translateY(${f2((1 - E.outC(cu)) * 26)}px) scale(${f2(.9 + .1 * E.outBack(cu))})`;
  S7.shine.style.transform = `translateX(${f2(lerp(-220, 620, E.ioC(P(t, 29.0, 29.6))))}px) skewX(-18deg)`;
  S7.url.style.opacity = f2(.9 * P(t, 28.65, 29.0));
  S7.fr.style.opacity = f2(E.outC(P(t, 27.9, 28.7)));
  S7.card.style.transform = `scale(${f2(1 + .03 * P(t, T0, 30))})`;
}

/* ---------------- captions ---------------- */
const capLayer = h('<div id="caps"></div>');
const caps = [];
function cap(o) {
  const el = h(`<div class="cap${o.cls ? ' ' + o.cls : ''}" style="top:${o.y}px;font-size:${o.size}px;font-weight:${o.weight || 600}"></div>`);
  const words = [];
  o.lines.forEach(ln => {
    const line = h('<div></div>');
    ln.split(' ').forEach((w, i, arr) => {
      const acc = w.startsWith('*');
      const s = h(`<span class="w${acc ? ' acc' : ''}">${w.replace(/\*/g, '')}</span>`);
      line.appendChild(s); if (i < arr.length - 1) line.appendChild(document.createTextNode(' '));
      words.push(s);
    });
    el.appendChild(line);
  });
  capLayer.appendChild(el);
  caps.push(Object.assign({ el, words, stagger: .07 }, o));
}
cap({ lines: ['Your business', 'shouldn’t feel like this.'], tin: .45, tout: 3.78, y: 430, size: 76 });
cap({ lines: ['Too many tools.'], tin: 4.15, tout: 7.86, y: 372, size: 82, weight: 700, dim: 6.45 });
cap({ lines: ['Too much data.'], tin: 5.3, tout: 7.86, y: 470, size: 82, weight: 700, dim: 6.45 });
cap({ lines: ['Zero *control.*'], tin: 6.45, tout: 7.86, y: 568, size: 82, weight: 700, stagger: .1 });
cap({ lines: ['Meet *Velorci.*'], tin: 10.35, tout: 11.7, y: 600, size: 108, weight: 600, stagger: .12 });
cap({ lines: ['One platform.'], tin: 12.12, tout: 14.36, y: 430, size: 84 });
cap({ lines: ['Every operation.'], tin: 14.5, tout: 16.88, y: 430, size: 84 });
cap({ lines: ['*Connected.*'], tin: 17.3, tout: 19.62, y: 470, size: 96 });
cap({ lines: ['Your business', 'doesn’t just run.'], tin: 20.25, tout: 22.3, y: 420, size: 78 });
cap({ lines: ['It gets *smarter.*'], tin: 22.42, tout: 23.86, y: 440, size: 96, weight: 700, stagger: .1 });
cap({ lines: ['RUN YOUR BUSINESS.'], tin: 25.2, tout: 27.32, y: 300, size: 80, weight: 700, cls: 'caps', stagger: .09 });
cap({ lines: ['*FROM* *ONE* *PLACE.*'], tin: 25.62, tout: 27.32, y: 398, size: 80, weight: 700, cls: 'caps', stagger: .09 });
function renderCaps(t) {
  for (const c of caps) {
    const vis = t >= c.tin - .01 && t < c.tout + .01;
    c.el.style.display = vis ? 'block' : 'none'; if (!vis) continue;
    const out = E.inC(P(t, c.tout - .3, c.tout)), dim = c.dim ? 1 - .5 * E.outC(P(t, c.dim, c.dim + .3)) : 1;
    c.words.forEach((w, i) => {
      const s0 = c.tin + i * c.stagger, u = E.outC(P(t, s0, s0 + .55));
      w.style.opacity = f2(u * (1 - out) * dim);
      w.style.transform = `translateY(${f2((1 - u) * 36 - out * 18)}px)`;
      const b = (1 - u) * 14 + out * 12;
      w.style.filter = w.classList.contains('acc') ? `${b > .25 ? `blur(${f2(b)}px) ` : ''}drop-shadow(0 4px 24px rgba(0,0,0,.5))` : blurF(b);
    });
  }
}

/* ---------------- overlays ---------------- */
const flash = h('<div id="flash"></div>');
frame.appendChild(capLayer); frame.appendChild(flash); frame.appendChild(h('<div id="vig"></div>')); frame.appendChild(h('<div id="letter"></div>'));
function renderOverlays(t) {
  let f = 0;
  for (const [ft, pk, att, dec] of TL.flashes) {
    if (t >= ft - att && t < ft) f = Math.max(f, pk * E.inQ(P(t, ft - att, ft)));
    else if (t >= ft) f = Math.max(f, pk * (1 - E.outC(P(t, ft, ft + dec))));
  }
  flash.style.opacity = f2(f);
}

/* ---------------- driver ---------------- */
window.seek = t => {
  NOW = t; TF = Math.floor(t * TL.fps + 1e-4) / TL.fps;
  for (const s of scenes) { const on = t >= s.a && t < s.b; s.el.style.display = on ? 'block' : 'none'; }
  for (const s of scenes) if (t >= s.a && t < s.b) s.fn(t);
  renderCaps(t); renderOverlays(t);
};
window.ready = Promise.all([...[300, 400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)), ...$$('img').map(i => (i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))])
  .then(() => document.fonts.ready).then(() => { window.seek(0); return true; });

const q = new URLSearchParams(location.search);
function fit() { const s = Math.min(innerWidth / 1080, innerHeight / 1920); frame.style.transform = `scale(${s})`; frame.style.left = ((innerWidth - 1080 * s) / 2) + 'px'; }
if (q.has('play') || q.has('t')) { fit(); addEventListener('resize', fit); }
window.ready.then(() => {
  if (q.has('t')) window.seek(+q.get('t'));
  if (q.has('play')) {
    const audio = new Audio('soundtrack.wav');
    let t0 = null;
    const go = () => { audio.currentTime = 0; audio.play().catch(() => {}); t0 = performance.now(); requestAnimationFrame(tick); };
    const tick = now => { const t = ((now - t0) / 1000) % TL.duration; window.seek(t); requestAnimationFrame(tick); };
    document.body.addEventListener('click', go, { once: true });
    window.seek(0);
  }
});
})();
