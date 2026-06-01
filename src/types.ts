// ---- Running styles & race categories ----
export type Style = 'front' | 'pace' | 'late' | 'end'
export type Category = 'sprint' | 'mile' | 'medium' | 'long' | 'dirt'
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const STYLES: Style[] = ['front', 'pace', 'late', 'end']
export const CATEGORIES: Category[] = ['sprint', 'mile', 'medium', 'long', 'dirt']

export const STYLE_LABEL: Record<Style, string> = {
  front: 'Front Runner',
  pace: 'Pace Chaser',
  late: 'Late Surger',
  end: 'End Closer',
}
export const CATEGORY_LABEL: Record<Category, string> = {
  sprint: 'Sprint',
  mile: 'Mile',
  medium: 'Medium',
  long: 'Long',
  dirt: 'Dirt',
}

// The distance aptitude each category checks (dirt also requires dirt surface).
export const CATEGORY_DISTANCE: Record<Category, 'short' | 'mile' | 'medium' | 'long' | null> = {
  sprint: 'short',
  mile: 'mile',
  medium: 'medium',
  long: 'long',
  dirt: null, // dirt races span distances; we only require the dirt surface aptitude
}

// ---- Raw dataset (public/data) ----
export interface Skill {
  id: number
  name: string
  rarity: number // 1 normal, 2 gold, 3/4/5 unique, 6 evolution
  iconid: number
  desc: string
}

export interface PotentialSkill {
  id: number
  rank: number // 0 innate (never here), 1-5 talent/awakening level
}

export interface Card {
  cardId: number
  charId: number
  name: string
  title: string
  rarity: number // base ★
  img: string // for thumb url: chara_stand_{img}.png
  urlName: string
  apt: Record<'turf' | 'dirt' | 'short' | 'mile' | 'medium' | 'long' | Style, Grade>
  defaultStyle: Style | null
  unique: number[]
  innate: number[]
  potential: PotentialSkill[]
  event: number[]
  obtained: string | null
  releaseEn: string | null
}

export interface Dataset {
  version: string
  cardCount: number
  cards: Card[]
}

// ---- Per-card account state (persisted) ----
export interface OwnedState {
  owned: boolean
  stars: number // 1-5 (rarity the user actually has)
  potential: number // 1-5 awakening level reached
  lockedGlobal: boolean
  lockedCategories: Category[]
  // Manual style-aptitude overrides (e.g. raised in-game). Only set styles override the base.
  aptStyle?: Partial<Record<Style, Grade>>
}
