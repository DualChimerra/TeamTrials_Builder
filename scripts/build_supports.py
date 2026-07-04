"""
Build public/data/supports.json — a support_id -> {name, rarity, type} map,
fetched from gametora (same source as the rest of the dataset). Used by the
Rankings tab to name the support cards top-100 players train with.

Run: scripts/.venv/bin/python scripts/build_supports.py
"""

import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(__file__))
OUT = os.path.join(ROOT, "public/data/supports.json")
UA = "Mozilla/5.0 (compatible; uma-ttbuilder/1.0)"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return json.load(urllib.request.urlopen(req))


def main():
    man = fetch("https://gametora.com/data/manifests/umamusume.json")
    h = man["support-cards"]
    cards = fetch(f"https://gametora.com/data/umamusume/support-cards.{h}.json")
    out = {}
    for c in cards:
        sid = c.get("support_id")
        if sid is None:
            continue
        char = c.get("char_name") or ""
        title = c.get("title_en") or ""
        hints = c.get("hints") or {}
        out[str(sid)] = {
            "name": char,
            "title": title,
            "rarity": c.get("rarity"),  # 1 R, 2 SR, 3 SSR
            "type": c.get("type"),
            "urlName": c.get("url_name"),
            # Skills this support can grant, split by how (used by the Skills tab
            # popover): hint_skills = taught via training hints ("random"),
            # event_skills = from the support's story events ("event").
            "hintSkills": hints.get("hint_skills") or [],
            "eventSkills": c.get("event_skills") or [],
            # EN/global release date (falsy = not yet on global).
            "releaseEn": c.get("release_en"),
        }
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
    print(f"wrote {len(out)} support cards -> {OUT}")
    # show a couple we know appear in the captured data
    for sid in ("30010", "30036", "30086"):
        print(f"  {sid}: {out.get(sid)}")


if __name__ == "__main__":
    main()
