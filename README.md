# Neon Palms Cover Studio

Turn any photo into GTA-style cover art, offline in your browser. Pick a
layout, drop in your photos, crop and position each panel, write a caption,
and export a PNG in 1080×1080, 1080×1350 or 1920×1080 — all three in one
click.

## Run it

Serve `app/` with any static file server and open `index.html`:

```sh
python3 -m http.server 8080 --directory app
```

Then open http://localhost:8080. No network request is made: every font,
sample photo and script is a file under `app/`, and your photos never leave
your machine.

## What it does

- Five cover layouts: four-panel grid, hero-and-three, full-bleed, tilted
  snapshots, and a nine-panel grid with a title block.
- Five sunset/neon grades applied as gradient maps, plus grain, vignette,
  a halftone title block and a white poster frame.
- Bold Anton display lettering with a sunset gradient, a neon Pacifico
  script subtitle, a badge ribbon and a five-star heat meter.
- Per-panel crop and position: drag to pan, scroll to zoom, rotate, flip,
  or fill every panel with one photo.
- Undo/redo, and one-click export of all three post sizes.

## Credits

- Fonts Anton and Pacifico, under the SIL Open Font License (see
  `app/fonts/OFL.txt`).
- Sample photos were made with an image model for this app; no real person
  is shown. Nothing here uses Rockstar Games artwork, logos or fonts.

## Hand-in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into the output directory and writes `dossier.json` with `buildDossier`
from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
