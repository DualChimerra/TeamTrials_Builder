import type { Card, Category, Grade, OwnedState, Skill, Style } from '../types'
import { CATEGORY_DISTANCE, CATEGORY_LABEL, STYLE_LABEL, STYLES, CATEGORIES } from '../types'
import { evalCard, type CardEval, type MatchOptions } from './classify'

const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
function gradeRank(g: Grade): number {
  const i = GRADE_ORDER.indexOf(g)
  return i === -1 ? 99 : i
}
const MIN_APT = gradeRank('D')

export interface BuildOptions extends MatchOptions {
  minAptitude?: Grade // default D
  requireSurface?: boolean // default true
}

export interface Slot {
  card: Card
  style: Style
  eval: CardEval
}
export interface Team {
  category: Category
  slots: Slot[]
  total: number
  complete: boolean // 3 distinct styles filled
}

// Candidate (card, style) eval for a category, after eligibility.
export interface Candidate {
  card: Card
  style: Style
  eval: CardEval
}

function aptEligible(card: Card, style: Style, category: Category, opts: BuildOptions): boolean {
  const minRank = opts.minAptitude ? gradeRank(opts.minAptitude) : MIN_APT
  const reqSurface = opts.requireSurface ?? true
  if (gradeRank(card.apt[style]) > minRank) return false
  const dist = CATEGORY_DISTANCE[category]
  if (dist) {
    if (gradeRank(card.apt[dist]) > minRank) return false
    if (reqSurface && gradeRank(card.apt.turf) > minRank) return false
  } else {
    // dirt category -> require dirt surface
    if (reqSurface && gradeRank(card.apt.dirt) > minRank) return false
  }
  return true
}

function isLocked(state: OwnedState, category: Category): boolean {
  return state.lockedGlobal || state.lockedCategories.includes(category)
}

export function candidatesFor(
  category: Category,
  cards: Card[],
  skills: Record<string, Skill>,
  owned: Record<number, OwnedState>,
  opts: BuildOptions,
): Candidate[] {
  const out: Candidate[] = []
  const catLabel = CATEGORY_LABEL[category]
  for (const card of cards) {
    const st = owned[card.cardId]
    if (!st || !st.owned || isLocked(st, category)) continue
    // potential gating is per-card (the awakening level the player has reached)
    const cardOpts: BuildOptions = { ...opts, potentialLevel: st.potential }
    for (const style of STYLES) {
      if (!aptEligible(card, style, category, opts)) continue
      const ev = evalCard(card, style, category, st.stars, skills, cardOpts, STYLE_LABEL[style], catLabel)
      out.push({ card, style, eval: ev })
    }
  }
  return out
}

const STYLE_TRIPLES: Style[][] = (() => {
  const t: Style[][] = []
  for (let i = 0; i < STYLES.length; i++)
    for (let j = i + 1; j < STYLES.length; j++)
      for (let k = j + 1; k < STYLES.length; k++) t.push([STYLES[i], STYLES[j], STYLES[k]])
  return t
})()

const TOP_K = 20

export function buildTeam(
  category: Category,
  cands: Candidate[],
  opts?: { excludeCardIds?: Set<number> },
): Team {
  const exclude = opts?.excludeCardIds
  // best candidate per (style) list, sorted desc, capped
  const byStyle = new Map<Style, Candidate[]>()
  for (const s of STYLES) byStyle.set(s, [])
  for (const c of cands) {
    if (exclude?.has(c.card.cardId)) continue
    byStyle.get(c.style)!.push(c)
  }
  for (const s of STYLES) {
    const list = byStyle.get(s)!
    list.sort((a, b) => b.eval.score - a.eval.score)
    byStyle.set(s, list.slice(0, TOP_K))
  }

  let best: Slot[] = []
  let bestTotal = -1

  for (const [s1, s2, s3] of STYLE_TRIPLES) {
    const L1 = byStyle.get(s1)!
    const L2 = byStyle.get(s2)!
    const L3 = byStyle.get(s3)!
    if (L1.length === 0 && L2.length === 0 && L3.length === 0) continue
    for (const c1 of L1) {
      for (const c2 of L2) {
        if (c2.card.cardId === c1.card.cardId) continue
        for (const c3 of L3) {
          if (c3.card.cardId === c1.card.cardId || c3.card.cardId === c2.card.cardId) continue
          const total = c1.eval.score + c2.eval.score + c3.eval.score
          if (total > bestTotal) {
            bestTotal = total
            best = [
              { card: c1.card, style: s1, eval: c1.eval },
              { card: c2.card, style: s2, eval: c2.eval },
              { card: c3.card, style: s3, eval: c3.eval },
            ]
          }
        }
      }
    }
  }

  // Fallback: couldn't form 3 distinct styles/cards — assemble best-effort distinct picks.
  if (best.length < 3) {
    const used = new Set<number>()
    const usedStyles = new Set<Style>()
    const slots: Slot[] = []
    const flat = [...cands]
      .filter((c) => !exclude?.has(c.card.cardId))
      .sort((a, b) => b.eval.score - a.eval.score)
    for (const c of flat) {
      if (slots.length >= 3) break
      if (used.has(c.card.cardId) || usedStyles.has(c.style)) continue
      used.add(c.card.cardId)
      usedStyles.add(c.style)
      slots.push({ card: c.card, style: c.style, eval: c.eval })
    }
    return {
      category,
      slots,
      total: slots.reduce((s, x) => s + x.eval.score, 0),
      complete: slots.length === 3,
    }
  }

  // order slots by score desc (ace first)
  best.sort((a, b) => b.eval.score - a.eval.score)
  return { category, slots: best, total: bestTotal, complete: true }
}

export function buildAllTeams(
  cards: Card[],
  skills: Record<string, Skill>,
  owned: Record<number, OwnedState>,
  opts: BuildOptions,
): Record<Category, { team: Team; candidates: Candidate[] }> {
  const result = {} as Record<Category, { team: Team; candidates: Candidate[] }>
  for (const category of CATEGORIES) {
    const candidates = candidatesFor(category, cards, skills, owned, opts)
    const team = buildTeam(category, candidates)
    result[category] = { team, candidates }
  }
  return result
}
