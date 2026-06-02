import type { Card, Dataset, Skill, SupportCard, TtMeta } from '../types'

const base = import.meta.env.BASE_URL

export interface GameData {
  cards: Card[]
  skills: Record<string, Skill>
  version: string
  ttMeta: TtMeta | null
  supports: Record<string, SupportCard>
}

let cache: Promise<GameData> | null = null

export function loadGameData(): Promise<GameData> {
  if (cache) return cache
  cache = (async () => {
    const [dsRes, skRes] = await Promise.all([
      fetch(`${base}data/dataset.json`),
      fetch(`${base}data/skills.json`),
    ])
    if (!dsRes.ok) throw new Error(`dataset.json ${dsRes.status}`)
    if (!skRes.ok) throw new Error(`skills.json ${skRes.status}`)
    const ds: Dataset = await dsRes.json()
    const skills: Record<string, Skill> = await skRes.json()
    // Top-100 meta + support names are optional — the app works without them.
    let ttMeta: TtMeta | null = null
    let supports: Record<string, SupportCard> = {}
    try {
      const r = await fetch(`${base}data/tt_meta.json`)
      if (r.ok) ttMeta = await r.json()
    } catch {
      ttMeta = null
    }
    try {
      const r = await fetch(`${base}data/supports.json`)
      if (r.ok) supports = await r.json()
    } catch {
      supports = {}
    }
    return { cards: ds.cards, skills, version: ds.version, ttMeta, supports }
  })()
  return cache
}

// Image URL helpers (gametora hosting).
export const charThumb = (card: Card) =>
  `https://gametora.com/images/umamusume/characters/thumb/chara_stand_${card.img}.png`
export const charIcon = (card: Card) =>
  `https://gametora.com/images/umamusume/characters/icons/chr_icon_${card.cardId}.png`
export const skillIcon = (iconid: number) =>
  `https://media.gametora.com/umamusume/skills/icon/${iconid}.png`
export const supportIcon = (supportId: number) =>
  `https://gametora.com/images/umamusume/supports/support_card_s_${supportId}.png`
