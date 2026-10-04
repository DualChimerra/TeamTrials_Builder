// Parsers for account dumps produced by umadump (https://github.com/jalbarrang/umadump
// and its forks) and the older API-capture tools it replaced.
//
// Supported shapes:
//  - card_data.json            → [{ card_id, rarity, talent_level, ... }]  (owned characters)
//  - API capture               → { data: { card_list: [...] } } / { card_list: [...] }
//  - trained_chara_data.json / legacy umadump data.json (veteran list)
//                              → [{ trained_chara_id, card_id, ... }]  (only proves ownership)

export interface DumpCard {
  cardId: number
  stars?: number // 1-5 (in-game rarity the card has been raised to)
  potential?: number // 1-5 (talent_level / awakening)
}

export interface ParsedDump {
  kind: 'cards' | 'veterans'
  cards: DumpCard[]
}

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

function clampLevel(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.min(5, Math.round(n)) : undefined
}

function findArray(root: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(root)) return root
  if (!isObj(root)) return null
  for (const k of keys) if (Array.isArray(root[k])) return root[k] as unknown[]
  if (isObj(root.data)) return findArray(root.data, keys)
  return null
}

// Returns null when the JSON isn't a recognised umadump file.
export function parseUmadump(json: unknown): ParsedDump | null {
  // Owned character cards: card_data.json or a captured card_list.
  const cardRows = findArray(json, ['card_data', 'card_list'])
  if (cardRows) {
    const rows = cardRows.filter(isObj)
    if (rows.length && rows.every((r) => typeof r.card_id === 'number')) {
      const veteran = rows.some((r) => 'trained_chara_id' in r)
      if (veteran) return { kind: 'veterans', cards: dedupe(rows.map((r) => ({ cardId: r.card_id as number }))) }
      return {
        kind: 'cards',
        cards: dedupe(
          rows.map((r) => ({
            cardId: r.card_id as number,
            stars: clampLevel(r.rarity),
            potential: clampLevel(r.talent_level),
          })),
        ),
      }
    }
  }

  // Veteran list: trained_chara_data.json, or wrapped as { trained_chara_data | trained_chara }.
  const vetRows = findArray(json, ['trained_chara_data', 'trained_chara'])
  if (vetRows) {
    const rows = vetRows.filter(isObj)
    if (rows.length && rows.every((r) => typeof r.card_id === 'number')) {
      return { kind: 'veterans', cards: dedupe(rows.map((r) => ({ cardId: r.card_id as number }))) }
    }
  }
  return null
}

// Keep one entry per card, preferring the highest stars / potential seen.
function dedupe(cards: DumpCard[]): DumpCard[] {
  const by = new Map<number, DumpCard>()
  for (const c of cards) {
    const prev = by.get(c.cardId)
    if (!prev) by.set(c.cardId, c)
    else
      by.set(c.cardId, {
        cardId: c.cardId,
        stars: Math.max(prev.stars ?? 0, c.stars ?? 0) || undefined,
        potential: Math.max(prev.potential ?? 0, c.potential ?? 0) || undefined,
      })
  }
  return [...by.values()]
}
