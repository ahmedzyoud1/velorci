#!/usr/bin/env node
/**
 * velorci static site builder — zero dependencies.
 *
 *   node build.mjs
 *
 * Reads src/ and writes the generated site to the repository root so Vercel
 * (or any static host) can serve it with no build step configured.
 */

import { mkdir, writeFile, copyFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { site, pages, navOrder } from "./src/content.js";
import { document_ } from "./src/layout.js";
import { renderers } from "./src/pages.js";

const root = dirname(fileURLToPath(import.meta.url));
const LANGS = ["ar", "en"];

async function emit(relPath, contents) {
  const full = join(root, relPath);
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
    await copyFile(join(root, "src", name), join(root, name));
    written.push(name);
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

/* --- host config -------------------------------------------------------- */

async function buildVercelConfig() {
  const config = {
    $schema: "https://openapi.vercel.sh/vercel.json",
    cleanUrls: true,
    trailingSlash: false,
    headers: [
      {
        source: "/assets/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ],
  };

  return [await emit("vercel.json", JSON.stringify(config, null, 2) + "\n")];
}

/* --- run ---------------------------------------------------------------- */

const written = [
  ...(await buildPages()),
  ...(await copyStatic()),
  ...(await buildSitemap()),
  ...(await buildVercelConfig()),
];

const assets = await readdir(join(root, "assets")).catch(() => []);

console.log(`built ${written.length} files:`);
for (const f of written) console.log(`  ${f}`);
console.log(`(${assets.length} files in assets/ served as-is)`);
