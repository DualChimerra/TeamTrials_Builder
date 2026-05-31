#!/usr/bin/env python3
"""Build the app dataset from raw gametora JSON + master.mdb need_rank.

Inputs (data/raw/):
  skills.raw.json          gametora skills list
  characters.raw.json      gametora characters list
  character-cards.raw.json gametora character-cards list
  need_rank.json           {cardRank:{cardId:{skillId:rank}}, cardStyle:{cardId:rs}}

Outputs (public/data/):
  skills.json    {id: {id,name,rarity,iconid,desc}}
  dataset.json   {version, cards:[...]}

Refresh raw inputs: see scripts/fetch_raw.sh
"""
import json, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "public", "data")
os.makedirs(OUT, exist_ok=True)


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)


def norm(x):
    return (x or "").strip()


# aptitude array order from gametora character-cards
APT_KEYS = ["turf", "dirt", "short", "mile", "medium", "long",
            "front", "pace", "late", "end"]
# master.mdb running_style int -> style key
RS_MAP = {1: "front", 2: "pace", 3: "late", 4: "end"}


def main():
    raw_skills = load("skills.raw.json")
    raw_chars = load("characters.raw.json")
    raw_cards = load("character-cards.raw.json")
    nr = load("need_rank.json")
    card_rank = nr.get("cardRank", {})
    card_style = nr.get("cardStyle", {})

    # ---- skills dict ----
    skills = {}
    for s in raw_skills:
        sid = s.get("id")
        if sid is None:
            continue
        name = norm(s.get("name_en")) or norm(s.get("enname"))
        skills[str(sid)] = {
            "id": sid,
            "name": name,
            "rarity": s.get("rarity"),
            "iconid": s.get("iconid"),
            "desc": norm(s.get("desc_en")) or norm(s.get("endesc")),
        }

    char_name = {c.get("char_id"): norm(c.get("en_name")) for c in raw_chars}

    # ---- cards ----
    cards = []
    for c in raw_cards:
        cid = c.get("card_id")
        chid = c.get("char_id")
        apt_arr = c.get("aptitude") or []
        if len(apt_arr) < 10:
            apt_arr = (apt_arr + ["G"] * 10)[:10]
        apt = {APT_KEYS[i]: apt_arr[i] for i in range(10)}

        # potential = awakening skills available in global (skills_awakening_en),
        # gated by need_rank (0=innate, 1-5=talent level). Fallback rank = idx+2.
        aw_en = c.get("skills_awakening_en") or c.get("skills_awakening") or []
        ranks = card_rank.get(str(cid), {})
        potential = []
        for idx, sid in enumerate(aw_en):
            r = ranks.get(str(sid))
            if r is None:
                r = min(idx + 2, 5)
            potential.append({"id": sid, "rank": r})
        potential.sort(key=lambda p: (p["rank"], p["id"]))

        rs = card_style.get(str(cid))
        default_style = RS_MAP.get(rs)

        cards.append({
            "cardId": cid,
            "charId": chid,
            "name": norm(c.get("name_en")) or char_name.get(chid, "?"),
            "title": norm(c.get("title_en_gl")) or norm(c.get("title")),
            "rarity": c.get("rarity"),
            "img": "{}_{}".format(str(cid)[:4], cid),
            "urlName": c.get("url_name"),
            "apt": apt,
            "defaultStyle": default_style,
            "unique": c.get("skills_unique") or [],
            "innate": c.get("skills_innate") or [],
            "potential": potential,
            "event": c.get("skills_event") or [],
            "obtained": c.get("obtained"),
            "releaseEn": c.get("release_en"),
        })

    cards.sort(key=lambda c: (c["name"], c["cardId"]))

    with open(os.path.join(OUT, "skills.json"), "w", encoding="utf-8") as f:
        json.dump(skills, f, ensure_ascii=False, separators=(",", ":"))
    dataset = {
        "version": datetime.date.today().isoformat(),
        "cardCount": len(cards),
        "cards": cards,
    }
    with open(os.path.join(OUT, "dataset.json"), "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, separators=(",", ":"))

    # quick sanity
    en_released = sum(1 for c in cards if c.get("releaseEn"))
    print("skills:", len(skills))
    print("cards:", len(cards), "| with EN release date:", en_released)
    sw = next((c for c in cards if c["cardId"] == 100101), None)
    if sw:
        print("sample Special Week potential:", sw["potential"])


if __name__ == "__main__":
    main()
