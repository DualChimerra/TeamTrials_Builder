import { useMemo, useState } from 'react'
import type { Card, Category } from '../types'
import { CATEGORIES, CATEGORY_LABEL } from '../types'
import { useRoster, defaultOwnedState } from '../state/store'
import { Avatar } from './Avatar'
import { GradeBadge, Segmented, StyleBadge } from './ui'

const CAT_SHORT: Record<Category, string> = {
  sprint: 'Spr',
  mile: 'Mile',
  medium: 'Med',
  long: 'Long',
  dirt: 'Dirt',
}

function CardTile({ card }: { card: Card }) {
  const st = useRoster((s) => s.owned[card.cardId]) ?? defaultOwnedState()
  const setOwned = useRoster((s) => s.setOwned)
  const setStars = useRoster((s) => s.setStars)
  const setPotential = useRoster((s) => s.setPotential)
  const toggleLockGlobal = useRoster((s) => s.toggleLockGlobal)
  const toggleLockCategory = useRoster((s) => s.toggleLockCategory)
  const [showLocks, setShowLocks] = useState(false)

  return (
    <div
      className={`rounded-2xl border bg-surface p-3 transition-colors ${
        st.owned ? 'border-border' : 'border-border-soft opacity-65 hover:opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar card={card} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold text-text" title={card.name}>
                {card.name}
              </div>
              {card.title && (
                <div className="truncate text-xs text-faint" title={card.title}>
                  {card.title}
                </div>
              )}
            </div>
            <button
              onClick={() => setOwned(card.cardId, !st.owned)}
              className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                st.owned
                  ? 'border-brand/50 bg-brand/15 text-brand'
                  : 'border-border bg-surface-2 text-muted hover:text-text'
              }`}
            >
              {st.owned ? 'Owned' : 'Add'}
            </button>
          </div>

          {/* aptitudes */}
          <div className="mt-2 flex flex-wrap gap-1">
            <GradeBadge grade={card.apt.turf} label="Turf" />
            <GradeBadge grade={card.apt.dirt} label="Dirt" />
            {card.defaultStyle && <StyleBadge style={card.defaultStyle} />}
          </div>
        </div>
      </div>

      {st.owned && (
        <div className="mt-3 space-y-2 border-t border-border-soft pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <span className="w-12 text-faint">Stars</span>
              <Segmented
                size="sm"
                value={st.stars}
                onChange={(v) => setStars(card.cardId, v)}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: '★'.repeat(n) || '0' }))}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <span className="w-12 text-faint">Pot.</span>
              <Segmented
                size="sm"
                value={st.potential}
                onChange={(v) => setPotential(card.cardId, v)}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
              />
            </label>
          </div>

          {/* distance aptitudes */}
          <div className="flex flex-wrap gap-1">
            <GradeBadge grade={card.apt.short} label="Spr" />
            <GradeBadge grade={card.apt.mile} label="Mile" />
            <GradeBadge grade={card.apt.medium} label="Med" />
            <GradeBadge grade={card.apt.long} label="Long" />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleLockGlobal(card.cardId)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                st.lockedGlobal
                  ? 'border-bad/50 bg-bad/15 text-bad'
                  : 'border-border bg-surface-2 text-muted hover:text-text'
              }`}
              title="Exclude from all teams"
            >
              {st.lockedGlobal ? '🔒 Excluded' : '🔓 Lock all'}
            </button>
            <button
              onClick={() => setShowLocks((v) => !v)}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-muted hover:text-text"
            >
              Per-race {st.lockedCategories.length > 0 ? `(${st.lockedCategories.length})` : ''}
            </button>
          </div>

          {showLocks && (
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => {
                const locked = st.lockedCategories.includes(c)
                return (
                  <button
                    key={c}
                    onClick={() => toggleLockCategory(card.cardId, c)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                      locked
                        ? 'border-bad/50 bg-bad/15 text-bad'
                        : 'border-border bg-surface-2 text-muted hover:text-text'
                    }`}
                    title={`${locked ? 'Allow' : 'Exclude'} for ${CATEGORY_LABEL[c]}`}
                  >
                    {CAT_SHORT[c]}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Roster({ cards }: { cards: Card[] }) {
  const owned = useRoster((s) => s.owned)
  const bulkOwn = useRoster((s) => s.bulkOwn)
  const [q, setQ] = useState('')
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [enOnly, setEnOnly] = useState(true)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return cards.filter((c) => {
      if (enOnly && !c.releaseEn) return false
      if (ownedOnly && !owned[c.cardId]?.owned) return false
      if (query && !`${c.name} ${c.title}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [cards, q, ownedOnly, enOnly, owned])

  const ownedCount = useMemo(() => Object.values(owned).filter((o) => o.owned).length, [owned])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3 backdrop-blur">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search horse…"
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none placeholder:text-faint focus:border-brand"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} />
          Owned only
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={enOnly} onChange={(e) => setEnOnly(e.target.checked)} />
          Global (EN) only
        </label>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-faint">
            {ownedCount} owned · {filtered.length} shown
          </span>
          <button
            onClick={() => bulkOwn(filtered.map((c) => c.cardId), true)}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-muted hover:text-text"
          >
            Own all shown
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <CardTile key={c.cardId} card={c} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="py-16 text-center text-faint">No horses match your filters.</div>
      )}
    </div>
  )
}
