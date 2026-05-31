# Uma Team Trials Builder

A static web app that helps you build optimal **Team Trials** teams in *Uma Musume: Pretty Derby*
from the characters on your account.

Live: `https://dualchimerra.github.io/uma_ttbuilder/`

## What it does

Team Trials scoring rewards **guaranteed-activation skills** (golds are worth far more than
normal skills) and **diverse running styles** within a team (duplicating a style throws away
~4 000 points of positioning bonuses). So for each of the five race categories
(**Sprint, Mile, Medium, Long, Dirt**) the app picks **3 horses with 3 distinct running styles**
that maximise the relevant guaranteed-skill score.

- Mark which character cards you **own**, their **stars** (★) and **potential level** (1–5).
- Optionally count **event skills**, and **lock** cards out globally or per race category.
- The builder assigns each horse the running style (aptitude ≥ your threshold) where its
  skills score best, then explains **why** each horse was picked — every matched skill with its
  origin (inherit / potential / event), tier (gold / normal) and the score math.

All state is saved in your browser (`localStorage`); there is no backend.

### How a horse is scored

For a given race category and an assigned running style, the app counts the card's
guaranteed-activation skills that are **relevant** to that style/category, weighting
**gold ≫ normal** and discounting skills the source list marks as lower priority (the
"bracketed" ones). The character's unique skill adds value that scales with its stars.
The skill lists live in [`src/scoring/guaranteedSkills.ts`](src/scoring/guaranteedSkills.ts);
the matcher and weights are in [`src/scoring/classify.ts`](src/scoring/classify.ts); the
team-assignment search is in [`src/scoring/optimizer.ts`](src/scoring/optimizer.ts).

## Tech

React + TypeScript + Vite + Tailwind v4, Zustand for state. Deployed to GitHub Pages via Actions.

```bash
npm install
npm run dev      # local dev (http://localhost:5173/uma_ttbuilder/)
npm run build    # production build into dist/
```

## Data

The dataset (`public/data/dataset.json` + `skills.json`) is generated from gametora's English
(global) game data plus the community `master.mdb` (for potential unlock ranks). It is committed,
so the app and CI need no network at build time.

To refresh it after a game update:

```bash
bash scripts/fetch_raw.sh    # re-downloads raw data + rebuilds public/data
# or, if you already have data/raw/*:
python3 scripts/build_dataset.py
```

- `aptitude` order: `[turf, dirt, short, mile, medium, long, front, pace, late, end]`
- skill `rarity`: 1 = normal (white), 2 = gold, 3/4/5 = unique, 6 = evolution
- potential `rank`: 0 = inherit (innate), 1–5 = awakening/talent level

Game data and images © Cygames. This is an unofficial fan tool, not affiliated with Cygames.
Images are loaded from gametora.com.
