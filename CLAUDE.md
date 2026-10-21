# velorci website

## Publishing
- Push finished changes straight to `main` without asking — the site deploys from it.

## Editing the site
- `src/site.html` is the single source (light palette). Never edit the generated pages directly.
- After any change, rebuild and commit the generated files with it:
  `python3 build-pages.py && python3 build-standalone.py`
- Dark theme is produced by `theme_dark.py`; an asset that needs a dark cut gets a `-dark` twin and a mapping there.
