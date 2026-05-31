import type { Card, Dataset, Skill } from '../types'

const base = import.meta.env.BASE_URL

export interface GameData {
  cards: Card[]
  skills: Record<string, Skill>
  version: string
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
    return { cards: ds.cards, skills, version: ds.version }
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
