import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, Grade, OwnedState, Style } from '../types'

// Manual per-slot override keyed by the slot's auto-assigned running style.
//  - card:  a chosen cardId, or 'empty' to leave the slot blank (undefined = auto)
//  - style: run the slot's horse in a different style (undefined = the slot's style)
export interface SlotOverride {
  card?: number | 'empty'
  style?: Style
}
export type Overrides = Partial<Record<Category, Partial<Record<Style, SlotOverride>>>>

export interface Settings {
  includeEvent: boolean
  minAptitude: Grade
  requireSurface: boolean
  uniqueAcrossTeams: boolean
  theme: 'dark' | 'light'
}

interface RosterState {
  owned: Record<number, OwnedState>
  settings: Settings
  overrides: Overrides
  // actions
  setOwned: (cardId: number, owned: boolean) => void
  setStars: (cardId: number, stars: number) => void
  setPotential: (cardId: number, potential: number) => void
  toggleLockGlobal: (cardId: number) => void
  toggleLockCategory: (cardId: number, category: Category) => void
  bulkOwn: (cardIds: number[], owned: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  setSlotOverride: (category: Category, slotStyle: Style, patch: SlotOverride | null) => void
  setAptStyle: (cardId: number, style: Style, grade: Grade | null) => void
  reset: () => void
}

export const defaultOwnedState = (): OwnedState => ({
  owned: false,
  stars: 3,
  potential: 5,
  lockedGlobal: false,
  lockedCategories: [],
})

function ensure(owned: Record<number, OwnedState>, id: number): OwnedState {
  return owned[id] ?? defaultOwnedState()
}

export const useRoster = create<RosterState>()(
  persist(
    (set) => ({
      owned: {},
      overrides: {},
      settings: { includeEvent: false, minAptitude: 'D', requireSurface: true, uniqueAcrossTeams: true, theme: 'dark' },

      setOwned: (cardId, owned) =>
        set((s) => ({ owned: { ...s.owned, [cardId]: { ...ensure(s.owned, cardId), owned } } })),

      setStars: (cardId, stars) =>
        set((s) => ({
          owned: { ...s.owned, [cardId]: { ...ensure(s.owned, cardId), stars } },
        })),

      setPotential: (cardId, potential) =>
        set((s) => ({
          owned: { ...s.owned, [cardId]: { ...ensure(s.owned, cardId), potential } },
        })),

      toggleLockGlobal: (cardId) =>
        set((s) => {
          const cur = ensure(s.owned, cardId)
          return { owned: { ...s.owned, [cardId]: { ...cur, lockedGlobal: !cur.lockedGlobal } } }
        }),

      toggleLockCategory: (cardId, category) =>
        set((s) => {
          const cur = ensure(s.owned, cardId)
          const has = cur.lockedCategories.includes(category)
          const lockedCategories = has
            ? cur.lockedCategories.filter((c) => c !== category)
            : [...cur.lockedCategories, category]
          return { owned: { ...s.owned, [cardId]: { ...cur, lockedCategories } } }
        }),

      bulkOwn: (cardIds, owned) =>
        set((s) => {
          const next = { ...s.owned }
          for (const id of cardIds) next[id] = { ...ensure(s.owned, id), owned }
          return { owned: next }
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setSlotOverride: (category, slotStyle, patch) =>
        set((s) => {
          const cat = { ...(s.overrides[category] ?? {}) }
          if (patch === null) delete cat[slotStyle]
          else cat[slotStyle] = { ...(cat[slotStyle] ?? {}), ...patch }
          return { overrides: { ...s.overrides, [category]: cat } }
        }),

      setAptStyle: (cardId, style, grade) =>
        set((s) => {
          const cur = ensure(s.owned, cardId)
          const aptStyle = { ...(cur.aptStyle ?? {}) }
          if (grade == null) delete aptStyle[style]
          else aptStyle[style] = grade
          return { owned: { ...s.owned, [cardId]: { ...cur, aptStyle } } }
        }),

      reset: () => set({ owned: {}, overrides: {} }),
    }),
    {
      name: 'uma-tt-builder-v1',
      // Deep-merge persisted state so new settings get their defaults for existing users.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RosterState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
      },
    },
  ),
)
