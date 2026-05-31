import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, Grade, OwnedState } from '../types'

export interface Settings {
  includeEvent: boolean
  minAptitude: Grade
  requireSurface: boolean
  uniqueAcrossTeams: boolean
}

interface RosterState {
  owned: Record<number, OwnedState>
  settings: Settings
  // actions
  setOwned: (cardId: number, owned: boolean) => void
  setStars: (cardId: number, stars: number) => void
  setPotential: (cardId: number, potential: number) => void
  toggleLockGlobal: (cardId: number) => void
  toggleLockCategory: (cardId: number, category: Category) => void
  bulkOwn: (cardIds: number[], owned: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
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
      settings: { includeEvent: false, minAptitude: 'D', requireSurface: true, uniqueAcrossTeams: true },

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

      reset: () => set({ owned: {} }),
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
