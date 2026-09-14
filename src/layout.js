import { site, meta, pages, navOrder, ui } from "./content.js";

/* --- helpers ------------------------------------------------------------ */

/** Escape text destined for HTML body/attribute content. */
export function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Pick a language out of a { ar, en } pair. Plain strings pass through, so
 * content that is the same in both languages can be written once.
 */
export function t(value, lang) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value[lang] ?? value.en ?? "";
}

/** Escaped pick — the common case. */
export function tx(value, lang) {
  return esc(t(value, lang));
}

/* --- icons -------------------------------------------------------------- */

const ICON_ATTRS =
  'width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"';

export const icons = {
  check: `<svg ${ICON_ATTRS}><path d="M3 8.5 6.2 11.7 13 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrow: `<svg ${ICON_ATTRS}><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  up: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" focusable="false"><path d="M5 8V2M2.5 4.5 5 2l2.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

/* --- document shell ----------------------------------------------------- */

/**
 * Root-relative URL for a page in a language.
 * Kept absolute-from-root so the same markup works at any depth.
 */
export function url(pageId, lang) {
  return pages[pageId].path[lang];
}

/** Depth-aware asset path: en/* pages sit one directory deeper. */
export function asset(path, lang) {
  return lang === "en" ? `../${path}` : path;
}

function head(pageId, lang) {
  const m = meta[lang];
  const page = pages[pageId];
  const other = lang === "ar" ? "en" : "ar";
  const canonical = site.domain + page.path[lang];
  const altHref = site.domain + page.path[other];
  const title = tx(page.title, lang);
  const description = tx(page.description, lang);
  const ogImage = `${site.domain}/assets/og.jpg`;

  const fontFamilies =
    lang === "ar"
      ? "family=Cairo:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800"
      : "family=Poppins:wght@400;500;600;700;800;900";

  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "velorci",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site.domain,
    description: t(pages.home.description, lang),
    inLanguage: lang,
    offers: {
      "@type": "Offer",
      price: "200",
      priceCurrency: "KWD",
    },
  });

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${other}" href="${altHref}">
<link rel="alternate" hreflang="x-default" href="${site.domain}${pages[pageId].path.ar}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(m.siteName)}">
<meta property="og:locale" content="${esc(m.ogLocale)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#041316">
<link rel="icon" href="${asset("assets/logo-turq.png", lang)}" type="image/png">
<link rel="apple-touch-icon" href="${asset("assets/logo-turq.png", lang)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontFamilies}&display=swap">
<link rel="stylesheet" href="${asset("styles.css", lang)}">
<script type="application/ld+json">${orgSchema}</script>`;
}

function header(pageId, lang) {
  const m = meta[lang];
  const other = lang === "ar" ? "en" : "ar";

  const navLinks = navOrder
    .map((id) => {
      const current = id === pageId ? ' aria-current="page"' : "";
      return `<a class="nav__link" href="${url(id, lang)}"${current}>${tx(
        pages[id].nav,
        lang
      )}</a>`;
    })
    .join("\n          ");

  return `<header class="header" id="site-header">
    <div class="wrap header__inner">
      <a class="brand" href="${url("home", lang)}">
        <img src="${asset("assets/logo-turq.png", lang)}" alt="" width="26" height="26">
        <span>velorci</span>
      </a>

      <button class="burger" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="${tx(
        m.menuLabel,
        lang
      )}" data-menu-toggle>
        <span></span>
      </button>

      <nav class="nav" id="site-nav" aria-label="${tx(m.menuLabel, lang)}">
          ${navLinks}
      </nav>

      <div class="header__actions">
        <a class="lang-switch" href="${url(pageId, other)}" hreflang="${other}" title="${esc(
    m.switchTitle
  )}" lang="${other}">${esc(m.switchLabel)}</a>
        <a class="btn btn--ghost btn--sm" href="${site.dashboard}" target="_blank" rel="noopener">${tx(
    ui.login,
    lang
  )}</a>
        <a class="btn btn--primary btn--sm" href="${url("contact", lang)}">${tx(
    ui.cta,
    lang
  )}</a>
      </div>
    </div>
  </header>`;
}

function footer(lang) {
  const navLinks = navOrder
    .map((id) => `<li><a href="${url(id, lang)}">${tx(pages[id].nav, lang)}</a></li>`)
    .join("\n            ");

  return `<footer class="footer">
    <div class="wrap">
      <div class="footer__grid">
        <div>
          <a class="brand" href="${url("home", lang)}">
            <img src="${asset("assets/logo-turq.png", lang)}" alt="" width="22" height="22">
            <span>velorci</span>
          </a>
          <p class="footer__tagline">${tx(ui.footerTagline, lang)}</p>
        </div>

        <nav aria-labelledby="footer-nav-title">
          <h2 id="footer-nav-title">${tx(ui.footerNavTitle, lang)}</h2>
          <ul>
            ${navLinks}
          </ul>
        </nav>

        <div>
          <h2 id="footer-contact-title">${tx(ui.footerContactTitle, lang)}</h2>
          <ul aria-labelledby="footer-contact-title">
            <li><a href="mailto:${site.email}">${site.email}</a></li>
            <li><a href="${site.whatsappHref}" target="_blank" rel="noopener"><bdi>${
    site.whatsapp
  }</bdi></a></li>
            <li><a href="${site.dashboard}" target="_blank" rel="noopener">${tx(
    ui.login,
    lang
  )}</a></li>
          </ul>
        </div>
      </div>

      <div class="footer__bottom">${tx(ui.rights, lang)}</div>
    </div>
  </footer>`;
}

/**
 * Wrap page body markup in the full document.
 * `body` is already-rendered HTML for the <main> contents.
 */
export function document_(pageId, lang, body) {
  const m = meta[lang];
  return `<!doctype html>
<html lang="${m.lang}" dir="${m.dir}">
<head>
${head(pageId, lang)}
</head>
<body>
  <a class="skip-link" href="#main">${tx(m.skipToContent, lang)}</a>
${header(pageId, lang)}

  <main id="main">
${body}
  </main>

${footer(lang)}

  <script src="${asset("site.js", lang)}" defer></script>
</body>
</html>
`;
}
