#!/usr/bin/env node
/**
 * velorci static site builder — zero dependencies.
 *
 *   node build.mjs
 *
 * Reads src/ and writes the finished site into public/, which is the output
 * directory Vercel serves (see vercel.json). Nothing else in the repository
 * is published.
 */

import { mkdir, writeFile, copyFile, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { site, pages, navOrder } from "./src/content.js";
import { document_ } from "./src/layout.js";
import { renderers } from "./src/pages.js";

const root = dirname(fileURLToPath(import.meta.url));
const OUT = join(root, "public");
const LANGS = ["ar", "en"];

async function emit(relPath, contents) {
  const full = join(OUT, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents, "utf8");
  return relPath;
}

/* --- pages -------------------------------------------------------------- */

async function buildPages() {
  const written = [];
  for (const lang of LANGS) {
    for (const id of navOrder) {
      const body = renderers[id](lang);
      const html = document_(id, lang, body);
      written.push(await emit(pages[id].file[lang], html));
    }
  }
  return written;
}

/* --- static passthrough ------------------------------------------------- */

async function copyStatic() {
  const written = [];

  for (const name of ["styles.css", "site.js"]) {
    await mkdir(OUT, { recursive: true });
    await copyFile(join(root, "src", name), join(OUT, name));
    written.push(name);
  }

  // assets/ is authored by hand and copied verbatim into the output.
  const assets = await readdir(join(root, "assets")).catch(() => []);
  await mkdir(join(OUT, "assets"), { recursive: true });
  for (const name of assets) {
    await copyFile(join(root, "assets", name), join(OUT, "assets", name));
    written.push(`assets/${name}`);
  }

  return written;
}

/* --- sitemap & robots --------------------------------------------------- */

async function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);

  const urls = LANGS.flatMap((lang) =>
    navOrder.map((id) => {
      const loc = site.domain + pages[id].path[lang];
      const alts = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l}" href="${
            site.domain + pages[id].path[l]
          }"/>`
      ).join("\n");
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${id === "home" ? "1.0" : "0.8"}</priority>
${alts}
  </url>`;
    })
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${site.domain}/sitemap.xml
`;

  return [
    await emit("sitemap.xml", xml),
    await emit("robots.txt", robots),
  ];
}

/* --- run ---------------------------------------------------------------- */

// Start from an empty output directory so a renamed or deleted page can never
// linger in a deploy.
await rm(OUT, { recursive: true, force: true });

const written = [
  ...(await buildPages()),
  ...(await copyStatic()),
  ...(await buildSitemap()),
];

console.log(`built ${written.length} files into public/:`);
for (const f of written) console.log(`  ${f}`);
