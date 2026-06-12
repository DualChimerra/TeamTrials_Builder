#!/usr/bin/env python3
"""Auto-classify "guaranteed activation" skills from gametora condition data.

Reads data/raw/skills.raw.json and emits public/data/guaranteed_auto.json:
a list of {name, tier, bracket, scope} entries in the same shape as the
curated list in src/scoring/guaranteedSkills.ts. The app merges the two at
load time, with the curated list taking precedence per skill name — so this
file only ever *adds* newly released skills, it never overrides a curated
tier/bracket/scope decision.

A skill qualifies when at least one of its activation alternatives uses only
deterministic race-state variables, i.e. conditions that are satisfied every
race given the assigned running style / race category:

  - random segment triggers (phase_random, corner_random, straight_random,
    is_finalcorner_random, ...) — the game always finds a point to fire them;
  - build-time parameters (running_style, distance_type, ground_type) — these
    become the entry's scope;
  - positional conditions automatically satisfied by the assigned style
    (order_rate<=50 for front/pace, >50 for late/end, overtaking for the
    back styles, distance_diff_rate for end closers).

"Soft" conditions (slopes, slipstream/near-lane, being blocked, narrow
order bands, holding 1st place, hp thresholds) still qualify but are marked
bracket=true (lower priority), mirroring the curated [bracket] convention.

Run standalone or via build_dataset.py / fetch_raw.sh.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "public", "data")

# gametora ints -> app scope keys
STYLE_BY_INT = {1: "front", 2: "pace", 3: "late", 4: "end"}
DIST_BY_INT = {1: "sprint", 2: "mile", 3: "medium", 4: "long"}

# Variables that are deterministically satisfied in every race.
DETERMINISTIC = {
    "always",
    "phase", "phase_random", "phase_laterhalf_random", "phase_firsthalf_random",
    "phase_firstquarter_random", "phase_laterhalf", "phase_firsthalf",
    "corner", "corner_random", "all_corner_random", "straight_random",
    "is_finalcorner", "is_finalcorner_random", "is_finalcorner_laterhalf",
    "is_lastspurt", "is_last_straight", "is_last_straight_onetime",
    "accumulatetime", "remain_distance", "distance_rate",
}
# Variables that fix the entry's scope.
SCOPE_VARS = {"running_style", "distance_type", "ground_type"}
# Positional variables — guaranteed only via the assigned running style.
POSITIONAL = {
    "order_rate", "order", "distance_diff_rate", "is_overtake",
    "change_order_onetime", "is_behind_in", "bashin_diff_behind", "is_move_lane",
}
# Conditions that fire most races but not strictly always -> bracket=true.
SOFT = {
    "slope", "up_slope_random", "down_slope_random",
    "infront_near_lane_time", "behind_near_lane_time",
    "blocked_side_continuetime", "hp_per",
}
KNOWN = DETERMINISTIC | SCOPE_VARS | POSITIONAL | SOFT

COND_RE = re.compile(r"([a-z_0-9]+)(==|!=|>=|<=|>|<)(-?\d+)")

# Positional conditions that point at the front vs the back of the pack.
FRONT_HALF = {"front", "pace"}
BACK_HALF = {"late", "end"}


def parse_alt(alt):
    """'a==1&b<=50' -> list of (var, op, int)."""
    out = []
    for token in alt.split("&"):
        token = token.strip()
        if not token:
            continue
        m = COND_RE.fullmatch(token)
        if not m:
            return None  # unparseable -> disqualify this alternative
        out.append((m.group(1), m.group(2), int(m.group(3))))
    return out


def classify_alt(conds):
    """Classify one '&'-joined alternative.

    Returns (scope_dict, bracket) or None when not guaranteed.
    """
    vars_used = {v for v, _, _ in conds}
    if not vars_used <= KNOWN:
        return None

    style = None
    dist = None
    dirt = False
    for v, op, val in conds:
        if v == "running_style" and op == "==" and val in STYLE_BY_INT:
            style = STYLE_BY_INT[val]
        elif v == "distance_type" and op == "==" and val in DIST_BY_INT:
            dist = DIST_BY_INT[val]
        elif v == "ground_type" and op == "==" and val == 2:
            dirt = True
        elif v in SCOPE_VARS:
            # ground_type==1 (turf) is implied by every non-dirt TT race; any
            # other scope-var comparison we don't understand -> disqualify.
            if not (v == "ground_type" and op == "==" and val == 1):
                return None
    if dirt and dist:
        return None  # dirt+distance combo doesn't map onto the TT categories
    if dirt:
        dist = "dirt"

    bracket = bool(vars_used & SOFT)

    # Positional analysis: which half of the pack does the condition demand?
    leans_front = False
    leans_back = False
    bounds = {"lo": False, "hi": False}  # order_rate band detection
    for v, op, val in conds:
        if v == "order_rate":
            if op in ("<=", "<"):
                bounds["hi"] = True
                (leans_front, leans_back) = (True, leans_back) if val <= 60 else (leans_front, leans_back)
            elif op in (">=", ">"):
                bounds["lo"] = True
                if val >= 40:
                    leans_back = True
        elif v == "order":
            if op == "==" and val == 1:
                leans_front, bracket = True, True  # holding 1st -> front, soft
            elif op in ("<=", "<"):
                leans_front = True
            elif op in (">=", ">"):
                leans_back, bracket = True, True  # "not in the lead" -> soft
        elif v == "bashin_diff_behind":
            leans_front, bracket = True, True  # lead-by-margin -> front, soft
        elif v in ("is_overtake", "is_behind_in"):
            leans_back = True
        elif v == "change_order_onetime":
            if (op in ("<", "<=") and val <= 0) or (op == "==" and val < 0):
                leans_back = True  # passing others
            else:
                bracket = True  # being passed / holding -> soft
        elif v == "distance_diff_rate":
            leans_back = True

    if bounds["lo"] and bounds["hi"]:
        bracket = True  # narrow mid-pack band -> soft

    # Resolve scope.
    if style is not None:
        # Positional lean inconsistent with the style -> soft.
        if (leans_front and style in BACK_HALF) or (leans_back and style in FRONT_HALF and not leans_front):
            bracket = True
        scope = {"kind": "style", "style": style}
    elif dist is not None:
        # Dist-scoped entries apply to all styles; an order_rate-style
        # condition then only holds for half of them -> soft. Overtake-style
        # conditions are kept non-bracket, matching the curated list.
        if bounds["lo"] or bounds["hi"] or any(v == "order" for v, _, _ in conds):
            bracket = True
        scope = {"kind": "dist", "category": dist}
    elif leans_front and not leans_back:
        scope = {"kind": "trickFront"}
    elif leans_back and not leans_front:
        scope = {"kind": "trickBack"}
    elif leans_front and leans_back:
        return None
    else:
        scope = {"kind": "general"}
    return scope, bracket


def classify_skill(s):
    """Returns an entry dict or None."""
    rarity = s.get("rarity")
    if rarity not in (1, 2):
        return None  # uniques / evolutions / inherited versions are not scored
    name = (s.get("name_en") or "").strip()
    if not name or name.endswith("×"):
        return None
    # name_en presence = official global name exists (sourced from the EN
    # client), our best release indicator. loc.en is only present when the EN
    # data *differs* from JP, so it can't be used as a release flag. A few
    # not-yet-released skills slipping through is harmless: no owned card
    # grants their skill ids, so they never affect scoring.
    iconid = s.get("iconid") or 0
    if iconid % 10 == 4:
        return None  # demerit icon variant (e.g. Gatekept, Running Idle)
    groups = ((s.get("loc") or {}).get("en") or {}).get("condition_groups") or s.get("condition_groups") or []
    if not groups:
        return None
    # Green stat passives (icon 1xxxx) don't proc in-race and are not scored —
    # except the style/distance-scoped ones (Savvy, Race Enthusiast), which
    # the curated list treats as guaranteed normals.
    if iconid < 20000:
        cond_text = "&".join((g.get("condition") or "") for g in groups)
        if not re.search(r"running_style|distance_type|ground_type", cond_text):
            return None
    # Skip self-debuffs: every effect negative AND aimed at self. Negative
    # effects with a target (Intimidate, Tether, ...) debuff opponents and
    # are perfectly good skills for us.
    effs = [e for g in groups for e in (g.get("effects") or [])]
    if effs and all(e.get("value", 0) < 0 and e.get("target", "-") == "-" for e in effs):
        return None

    # A skill qualifies if EVERY condition group qualifies via at least one
    # of its '@'-alternatives (all groups fire together as one skill).
    results = []
    for g in groups:
        cond = g.get("condition") or ""
        pre = g.get("precondition") or ""
        if not cond.strip():
            return None  # event/campaign bonus pseudo-skills have no condition
        best = None
        for alt in cond.split("@"):
            full = (pre + "&" + alt) if pre else alt
            conds = parse_alt(full)
            if conds is None:
                continue
            r = classify_alt(conds)
            if r is None:
                continue
            # prefer a non-bracket alternative
            if best is None or (best[1] and not r[1]):
                best = r
        if best is None:
            return None
        results.append(best)

    scope, bracket = results[0]
    for sc, br in results[1:]:
        bracket = bracket or br
        if sc != scope:
            scope = {"kind": "general"} if sc["kind"] != scope.get("kind") else scope
    return {
        "name": name,
        "tier": "gold" if rarity == 2 else "normal",
        "bracket": bracket,
        "scope": scope,
    }


BADGE_RE = re.compile(r"[\s　]*[◎○×∅]+\s*$")


def build(raw_skills):
    entries = {}
    for s in raw_skills:
        e = classify_skill(s)
        if e is None:
            continue
        key = BADGE_RE.sub("", e["name"]).strip().lower()
        prev = entries.get(key)
        # ◎/○ variants share a base name — keep the first (they classify alike)
        if prev is None:
            entries[key] = e
    out = sorted(entries.values(), key=lambda e: (e["tier"] != "gold", e["bracket"], e["name"]))
    return out


def main():
    with open(os.path.join(RAW, "skills.raw.json"), encoding="utf-8") as f:
        raw_skills = json.load(f)
    out = build(raw_skills)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "guaranteed_auto.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    golds = sum(1 for e in out if e["tier"] == "gold")
    print(f"guaranteed_auto: {len(out)} skills ({golds} gold), -> {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()
