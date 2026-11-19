# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ojiroaran96-ops/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ojiroaran96-ops/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Palms Cover Studio — an offline web app that turns your photos and a caption into GTA-style cover art: multi-panel posters, bold Anton lettering with a neon Pacifico subtitle, Vice City sunset grades, and one-click PNG export in 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## Run it

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 — no network needed, no build step. Photos are read on your machine and never uploaded.

## How it works

1. Add your photos (or use the three AI-made samples) and click one to put it in the selected panel.
2. Pick a layout: four-panel grid, hero + three, full bleed, tilted snapshots, or nine-panel with a title block.
3. Pick a sunset grade (Sunset, Neon Nights, Vice Pink, Golden Hour, Heat Haze, Mono Noir).
4. Edit the title, subtitle, badge ribbon and star heat meter.
5. Click a panel to select it, drag to crop and position the photo, scroll to zoom. Undo/redo included.
6. Export one size, or all three at once.

`?shot=cover` opens a clean cover-only view (handy for a screenshot); `?shot=cover&size=portrait&layout=nine` picks the size and layout.

## Originality

All art, lettering and code are original. Fonts are Anton and Pacifico under the SIL Open Font License (texts in `app/fonts/`). Sample photos are AI-made for this entry. No Rockstar Games logo, wordmark, official artwork, character or font is used.

---

<sub>Entered on [make.fun](https://make.fun/?ref=j9je5j9q&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
