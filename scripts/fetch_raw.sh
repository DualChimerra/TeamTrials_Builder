#!/usr/bin/env bash
# Refresh the raw game data used to build the app dataset.
# Pulls the latest EN-localised JSON from gametora's data layer and the
# need_rank table from the community master.mdb, then rebuilds public/data/.
#
# Usage:  bash scripts/fetch_raw.sh
# Requires: curl, python3 (with sqlite3 stdlib)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/data/raw"
UA="Mozilla/5.0 (compatible; uma-ttbuilder/1.0)"
mkdir -p "$RAW"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> Fetching gametora manifest"
curl -fsSL -A "$UA" "https://gametora.com/data/manifests/umamusume.json" -o "$TMP/manifest.json"

fetch_key() {
  local key="$1" out="$2"
  local hash
  hash="$(python3 -c "import json,sys;print(json.load(open('$TMP/manifest.json'))['$key'])")"
  echo "    $key ($hash)"
  curl -fsSL -A "$UA" "https://gametora.com/data/umamusume/$key.$hash.json" -o "$RAW/$out"
}

echo "==> Fetching gametora data files"
fetch_key skills skills.raw.json
fetch_key characters characters.raw.json
fetch_key character-cards character-cards.raw.json

echo "==> Fetching master.mdb (need_rank source)"
curl -fsSL "https://github.com/SimpleSandman/UmaMusumeMasterMDB/raw/master/master.mdb" -o "$TMP/master.mdb"

echo "==> Extracting need_rank / running_style"
python3 - "$TMP/master.mdb" "$RAW/need_rank.json" <<'PY'
import sqlite3, json, sys
db, out = sys.argv[1], sys.argv[2]
con = sqlite3.connect(db); cur = con.cursor()
rank = {}
for ass_id, sid, nr in cur.execute("SELECT available_skill_set_id, skill_id, need_rank FROM available_skill_set"):
    rank.setdefault(ass_id, {})[sid] = nr
res = {"cardRank": {}, "cardStyle": {}}
for cid, ass, rs in cur.execute("SELECT id, available_skill_set_id, running_style FROM card_data"):
    res["cardStyle"][str(cid)] = rs
    rk = rank.get(ass, {})
    if rk:
        res["cardRank"][str(cid)] = {str(k): v for k, v in rk.items()}
json.dump(res, open(out, "w"))
print("    cards with rank:", len(res["cardRank"]))
PY

echo "==> Rebuilding dataset"
python3 "$ROOT/scripts/build_dataset.py"
echo "==> Done. Review the diff in public/data/ and data/raw/."
