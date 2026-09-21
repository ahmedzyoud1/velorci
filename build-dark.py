#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a dark-mode preview of the site into /dark/, from the same source.

Nothing about the light site changes. This reads src/site.html, maps every
colour in it to a dark counterpart drawn from the same logo, and writes the
result through the ordinary page builder into

    /dark/ar/index.html   /dark/ar/about.html   ...
    /dark/en/index.html   /dark/en/about.html   ...

The preview pages carry <meta name="robots" content="noindex"> and are left
out of sitemap.xml, so they are browsable but not indexed.

The palette is the light one turned over, taken from the logo's own dark
lockup: the ground is the lockup's ground, the brand is the mark itself.

    #0A1214  page            (the lockup's ground, a shade deeper)
    #0E1719  band            (the lockup's ground)
    #111B1D  card
    #65D4D2  brand           (the mark — buttons, accents, marks)
    #6FD8D6  accent text
    #E8F4F3  text
    #06191B  text on brand

Colours are mapped in one pass, by the property each one serves: the same
ink at 3%% behind a card and at 76%% in a paragraph are different jobs and
get different answers. Status, WhatsApp and Meta colours keep their meaning.

    python3 build-dark.py
"""

import importlib.util
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src" / "site.html"
OUT = ROOT / "dark"

_spec = importlib.util.spec_from_file_location("build_pages", ROOT / "build-pages.py")
bp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bp)

# ── the palette ─────────────────────────────────────────────────────────────
PAGE, BAND, CARD, RAISED = "#0A1214", "#0E1719", "#111B1D", "#162224"
BRAND, ACCENT, BRAND_HI = "#65D4D2", "#6FD8D6", "#8FE3E1"
TEXT, ON_BRAND = "#E8F4F3", "#06191B"
TEXT_RGB, BRAND_RGB, ON_BRAND_RGB = "232,244,243", "101,212,210", "6,25,27"


def a(x, lo=0.0, hi=1.0):
    return f"{max(lo, min(hi, x)):g}"


# ── how each solid colour answers, by the job it is doing ───────────────────
SOLID = {
    "#0E1719": {"background": PAGE, "*": TEXT},                       # ink
    "#1C5F64": {"border": f"rgba({BRAND_RGB},.3)", "*": ACCENT},      # accent
    "#023A3F": {"border": f"rgba({BRAND_RGB},.4)", "*": BRAND},       # brand
    "#FFFFFF": {"background": CARD, "stroke": ON_BRAND, "fill": CARD,
                "border": RAISED, "box-shadow": PAGE, "*": ON_BRAND},  # paper
    "#F5FAFA": {"*": BAND},
    "#EBF7F7": {"*": "#13292B"},
    "#2E7E82": {"*": "#4FBFBE"},
    "#012A2E": {"*": BRAND_HI},                                        # pressed
    "#08333A": {"*": "#17383C"},

    # the light illustration surfaces become dark ones
    "#EFF5F4": {"*": RAISED}, "#F1F9F8": {"*": RAISED}, "#DFEDEC": {"*": "#1B2A2C"},
    "#E4F0EE": {"*": "#1B2A2C"}, "#DFF3F1": {"*": "#17302F"}, "#DCEAE8": {"*": "#1B2A2C"},
    "#9CCFD0": {"*": "#3E8C8C"},

    # illustration greys, lifted just enough to read on a dark card
    "#5E7173": {"*": "#8A9A9B"}, "#93A5A6": {"*": "#8A9A9B"}, "#A3B4B5": {"*": "#94A4A5"},
    "#AEB9BC": {"*": "#9AA6A9"}, "#8E9BA0": {"*": "#8A979C"}, "#97A4A8": {"*": "#909DA1"},
    "#A9B0AC": {"*": "#98A099"}, "#B4BBB7": {"*": "#9FA6A2"},

    # status: what was dark-on-pale becomes light-on-deep, and the pale
    # chip grounds become deep tinted ones
    "#127A3F": {"*": "#4ADE80"}, "#12764A": {"*": "#4ADE80"}, "#14804B": {"*": "#4ADE80"},
    "#17A05C": {"*": "#45D983"}, "#3AD07A": {"*": "#48DD88"},
    "#8A5A0B": {"*": "#FBBF24"}, "#A76A12": {"*": "#FBBF24"}, "#8A6410": {"*": "#FBBF24"},
    "#E8A317": {"*": "#F5C242"}, "#F5A623": {"*": "#F5C242"}, "#F0A825": {"*": "#F5C242"},
    "#EFCB6A": {"*": "#C79B2E"}, "#FDF0CE": {"*": "#33290F"}, "#FFF3E2": {"*": "#332711"},
    "#C2532E": {"*": "#FB8C69"}, "#A62F22": {"*": "#FB7A6A"}, "#E4572E": {"*": "#F4795A"},
    "#F0673E": {"*": "#F4795A"}, "#E8833A": {"*": "#F0964F"}, "#DC2626": {"*": "#F26A6A"},
    "#F0A9A9": {"*": "#7A3B3B"}, "#F2A2A2": {"*": "#7A3B3B"}, "#FDEAE4": {"*": "#3A211B"},

    # accents that are not the brand's
    "#8B5CF6": {"*": "#A78BFA"}, "#7C3AED": {"*": "#9A78F5"}, "#2563EB": {"*": "#5B8DF6"},

    # colours that belong to someone else and must not move
    "#25D366": {"*": "#25D366"}, "#0064E0": {"*": "#0064E0"}, "#0082FB": {"*": "#0082FB"},
}

ROLES = ("background", "border", "box-shadow", "stroke", "fill", "color")


def role(prop: str) -> str:
    """Boil a property or attribute name down to the job it does."""
    p = prop.lower()
    if p.startswith("box-shadow"):
        return "box-shadow"
    if "background" in p or p in ("bg", "iconbg", "ctabg", "pill", "rankbg",
                                 "submitbtnbg", "chipbg"):
        return "background"
    if "border" in p or p == "outline":
        return "border"
    if p in ("stroke", "stop-color"):
        return "stroke"
    if p == "fill":
        return "fill"
    return "color"


def prop_at(s: str, i: int) -> str:
    """The property or attribute the colour at i belongs to.

    The closest name that is immediately followed by ':' or '="'. Requiring the
    quote keeps a comparison inside a ternary (s.rank===1?"#FFFFFF":...) from
    being read as a property, and skipping names preceded by a dot keeps the
    object out of it, so a value written as a ternary still answers to the key
    it is assigned to.
    """
    names = re.findall(r'(?<![.\w-])([-A-Za-z_][-A-Za-z0-9_]*)\s*(?::|=")', s[max(0, i - 220):i])
    return names[-1] if names else "color"


def luminance(hex_colour: str) -> float:
    r, g, b = (int(hex_colour[k:k + 2], 16) / 255 for k in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)


def bright_ground(s: str, i: int) -> bool:
    """True when this colour is text sitting on a background that stays light
    once mapped — a WhatsApp green button, an amber badge, a brand chip. There
    the text has to go dark, not light."""
    lt = s.rfind('style="', 0, i)
    gt = s.find('"', lt + 7) if lt >= 0 else -1
    block = (s[lt:gt] if 0 <= lt and gt > i
             else s[s.rfind("\n", 0, i) + 1:s.find("\n", i) if s.find("\n", i) > 0 else len(s)])
    m = re.search(r'background(?:-color)?\s*:\s*([^;"}]+)', block)
    if not m:
        return False
    h = re.search(r"#[0-9a-fA-F]{6}", m.group(1))
    if not h:
        return False
    table = SOLID.get(h.group(0).upper())
    mapped = (table.get("background") or table["*"]) if table else h.group(0)
    return luminance(mapped) > .42


def in_section_tag(s: str, i: int) -> bool:
    """True when the colour sits in a <section ...> tag: a page band, not a card."""
    lt = s.rfind("<", 0, i)
    if lt < 0 or s.find(">", lt, i) != -1:
        return False
    return s[lt:lt + 8].lower() == "<section"


def darken(s: str) -> str:
    def swap(m):
        i, txt = m.start(), m.group(0)
        r = role(prop_at(s, i))

        if txt.startswith("#"):
            table = SOLID.get(txt.upper())
            if not table:
                return txt
            if txt.upper() == "#0E1719" and r in ("color", "fill", "stroke") and bright_ground(s, i):
                return ON_BRAND
            out = table.get(r, table["*"])
            if txt.upper() == "#FFFFFF" and r == "background" and in_section_tag(s, i):
                out = PAGE
            return out

        base, alpha = m.group(1), float(m.group(2))
        if base == "14,23,25":                      # the ink
            if r == "box-shadow":
                return f"rgba(0,0,0,{a(alpha * 5, hi=.55)})"
            if r == "background":
                return f"rgba({TEXT_RGB},{a(alpha * 1.6, hi=.1)})"
            if r == "border":
                return f"rgba({TEXT_RGB},{a(alpha * 1.3, hi=.26)})"
            if bright_ground(s, i):
                return f"rgba({ON_BRAND_RGB},{a(alpha)})"
            return f"rgba({TEXT_RGB},{a(alpha + .04, hi=.95)})"
        if base == "2,58,63":                       # the brand's tints
            if r == "box-shadow":
                return f"rgba({BRAND_RGB},{a(alpha * .8, hi=.3)})"
            if r == "background":
                return f"rgba({BRAND_RGB},{a(alpha * .55, hi=.22) if alpha else '0'})"
            if r == "border":
                return f"rgba({BRAND_RGB},{a(alpha * .72, hi=.36)})"
            return f"rgba({BRAND_RGB},{a(alpha)})"
        if base == "255,255,255":                   # paper overlays
            if r == "background":
                return (f"rgba({TEXT_RGB},.05)" if alpha >= .3
                        else f"rgba({ON_BRAND_RGB},{a(alpha + .04)})")
            return f"rgba({ON_BRAND_RGB},{a(alpha - .04)})"
        return m.group(0)                            # leave the rest alone

    out = re.sub(r"#[0-9a-fA-F]{6}\b|rgba?\((\d+,\d+,\d+),\s*([0-9.]+)\)", swap, s)

    # the page itself, and the two assets that come in a dark cut
    out = out.replace("body{margin:0;background:" + CARD, "body{margin:0;background:" + PAGE)
    out = out.replace("assets/logo-ink.png", "assets/logo-turq.png")
    out = out.replace("assets/pattern-light.png", "assets/pattern-dark.png")
    out = re.sub(r"assets/prod-(\d)\.png", r"assets/prod-\1-dark.png", out)
    return out


PREVIEW_HEAD = '<meta name="robots" content="noindex, nofollow">\n'


def main() -> int:
    if not SRC.exists():
        print(f"error: {SRC} not found", file=sys.stderr)
        return 1
    base = darken(SRC.read_text(encoding="utf-8"))

    if OUT.exists():
        shutil.rmtree(OUT)
    count = 0
    for lang in bp.LANGS:
        d = OUT / lang
        d.mkdir(parents=True)
        for key, out_name, meta in bp.PAGES:
            title, desc = meta[lang]
            html = bp.render(base, key, out_name, lang, title, desc)
            # a preview is not the site: drop what points search engines at it,
            # and reach the shared assets from one level further down
            html = re.sub(r'<link rel="canonical"[^>]*>\n?', "", html)
            html = re.sub(r'<link rel="alternate"[^>]*>\n?', "", html)
            html = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", html, flags=re.S)
            html = html.replace("</head>", PREVIEW_HEAD + "</head>", 1)
            html = html.replace('"../assets/', '"../../assets/').replace("(../assets/", "(../../assets/")
            html = html.replace('src="../support.js"', 'src="../../support.js"')
            (d / out_name).write_text(html, encoding="utf-8")
            count += 1
        print(f"  dark/{lang}/ — {len(bp.PAGES)} pages")
    print(f"wrote {count} files — preview only, noindex, not in the sitemap")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
