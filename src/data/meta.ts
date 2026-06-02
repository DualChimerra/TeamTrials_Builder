import type { Category, Style, TtMeta } from '../types'

// cardId -> rank (0 = most popular) within each (category, style) cell.
export type MetaIndex = Partial<Record<Category, Partial<Record<Style, Map<number, number>>>>>

export function buildMetaIndex(meta: TtMeta | null): MetaIndex {
  const idx: MetaIndex = {}
  if (!meta) return idx
  for (const cat of Object.keys(meta.byCatStyle) as Category[]) {
    const styles = meta.byCatStyle[cat] ?? {}
    const sm: Partial<Record<Style, Map<number, number>>> = {}
    for (const style of Object.keys(styles) as Style[]) {
      const m = new Map<number, number>()
      styles[style]!.chars.forEach((c, i) => m.set(c.cardId, i))
      sm[style] = m
    }
    idx[cat] = sm
  }
  return idx
}

// Popularity rank of a specific card for a (category, style) slot, or undefined.
export function popRank(idx: MetaIndex, cat: Category, style: Style, cardId: number): number | undefined {
  return idx[cat]?.[style]?.get(cardId)
}
