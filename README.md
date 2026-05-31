<div align="center">

![Uma Team Trials Builder](docs/banner.svg)

# Uma Team Trials Builder

**Build optimal [Team Trials](https://gametora.com/umamusume/team-trials-pvp-scoring) teams in _Uma Musume: Pretty Derby_ from the characters on your account.**

[![Deploy](https://github.com/DualChimerra/uma_ttbuilder/actions/workflows/deploy.yml/badge.svg)](https://github.com/DualChimerra/uma_ttbuilder/actions/workflows/deploy.yml)
[![Refresh data](https://github.com/DualChimerra/uma_ttbuilder/actions/workflows/update-data.yml/badge.svg)](https://github.com/DualChimerra/uma_ttbuilder/actions/workflows/update-data.yml)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)

### 🐎 **[Open the app →](https://dualchimerra.github.io/uma_ttbuilder/)**

</div>

---

## Why this exists

Team Trials scoring is unusual. Two things dominate a team's score:

- **Guaranteed-activation skills.** Skills that always fire bank reliable points every race, and
  **gold skills are worth ~2.4× a normal skill**. A horse stuffed with relevant guaranteed skills
  out-scores a flashier one whose skills rarely trigger.
- **Distinct running styles.** Two horses on the same style fight each other for positioning
  bonuses — duplicating a style throws away **~4 000 points**. So a good team runs **three
  different styles**.

This tool encodes those rules. You tell it what you own; it tells you the best teams and **why**.

## Features

| | |
|---|---|
| 🗂️ **Roster tracking** | Mark owned cards, **stars (★)**, **potential level (1–5)**, with search & filters. Saved in your browser. |
| 🏇 **5 teams** | Suggests 3 horses for each race category: **Sprint / Mile / Medium / Long / Dirt**. |
| 🎯 **Smart assignment** | Picks **3 distinct running styles** per team and assigns each horse the style (aptitude ≥ your threshold) where its skills score best. |
| 🥇 **Skill-tier scoring** | Golds ≫ normals; lower-priority ("bracketed") skills discounted; unique value scales with stars. |
| 🔁 **Unique-across-teams toggle** | Keep every horse to one team (real Team Trials rules), or allow reuse. |
| 🔒 **Locks** | Exclude a horse globally or per race category. |
| 🧪 **Event-skill toggle** | Count training-event skills or ignore them. |
| 💡 **"Why this horse?"** | Every pick explains its matched skills (origin · tier · reason) and the full score math. |

## How a horse is scored

```mermaid
flowchart LR
  A[Card skills<br/>inherit · potential · event · unique] --> B{Guaranteed<br/>activation?}
  B -- no --> X[ignored]
  B -- yes --> C{Relevant to assigned<br/>style + race category?}
  C -- no --> X
  C -- yes --> D[Weighted score<br/>gold ≫ normal · brackets ↓]
  D --> E[+ unique value scaled by ★]
  E --> F[Team = best 3 cards<br/>with 3 distinct styles]
```

- **Guaranteed lists** (general / per-style / per-distance / Trick) — [`src/scoring/guaranteedSkills.ts`](src/scoring/guaranteedSkills.ts)
- **Matcher & weights** (normalises `◎/○` badges, drops `×` debuffs, matches official `name_en`) — [`src/scoring/classify.ts`](src/scoring/classify.ts)
- **Team-assignment search** (per category, optional uniqueness across teams) — [`src/scoring/optimizer.ts`](src/scoring/optimizer.ts)

## Tech

React + TypeScript + Vite + Tailwind v4, Zustand state, fully static (no backend), deployed to
GitHub Pages via Actions.

```bash
npm install
npm run dev      # http://localhost:5173/uma_ttbuilder/
npm run build    # production build → dist/
```

## Data & auto-updates

The dataset ([`public/data/dataset.json`](public/data) + `skills.json`) is generated from
**gametora's English (global) game data** plus the community **`master.mdb`** (for potential
unlock ranks), and committed so the app needs no network at build time.

A scheduled GitHub Action ([`update-data.yml`](.github/workflows/update-data.yml)) re-pulls the
data **weekly**, so **new global horses and skills appear automatically** — gametora tags each
card with its global release date, and the Roster's *Global (EN) only* filter picks them up.

Refresh manually any time:

```bash
bash scripts/fetch_raw.sh     # re-download raw data + rebuild public/data
# or rebuild from existing data/raw:
python3 scripts/build_dataset.py
```

<details>
<summary>Data field reference</summary>

- `aptitude` order: `[turf, dirt, short, mile, medium, long, front, pace, late, end]`
- skill `rarity`: `1` normal (white) · `2` gold · `3/4/5` unique · `6` evolution
- potential `rank`: `0` inherit (innate) · `1–5` awakening / talent level

</details>

## Disclaimer

Unofficial fan tool. *Uma Musume: Pretty Derby*, all game data, and images are © Cygames.
Not affiliated with or endorsed by Cygames. Character art and skill icons are loaded from
[gametora.com](https://gametora.com/umamusume).
