import { useMemo, useState } from 'react'
import type { Card, Category, Grade, Style } from '../types'
import { CATEGORIES, CATEGORY_LABEL, STYLE_LABEL, STYLES } from '../types'
import { useRoster, defaultOwnedState } from '../state/store'
import { Avatar } from './Avatar'
import { AptitudeGrid, Checkbox, GradeBadge, Segmented } from './ui'

const CAT_SHORT: Record<Category, string> = {
  sprint: 'Spr',
  mile: 'Mile',
  medium: 'Med',
  long: 'Long',
  dirt: 'Dirt',
}
const STYLE_ABBR: Record<Style, string> = { front: 'F', pace: 'P', late: 'L', end: 'E' }
const GRADE_CYCLE: Grade[] = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S']

function CardTile({ card }: { card: Card }) {
  const st = useRoster((s) => s.owned[card.cardId]) ?? defaultOwnedState()
  const setOwned = useRoster((s) => s.setOwned)
  const setStars = useRoster((s) => s.setStars)
  const setPotential = useRoster((s) => s.setPotential)
  const toggleLockGlobal = useRoster((s) => s.toggleLockGlobal)
  const toggleLockCategory = useRoster((s) => s.toggleLockCategory)
  const setAptStyle = useRoster((s) => s.setAptStyle)
  const [showLocks, setShowLocks] = useState(false)

  const cycleApt = (style: Style) => {
    const base = card.apt[style]
    const cur = st.aptStyle?.[style] ?? base
    const next = GRADE_CYCLE[(GRADE_CYCLE.indexOf(cur) + 1) % GRADE_CYCLE.length]
    setAptStyle(card.cardId, style, next === base ? null : next)
  }
  const hasAptOverride = !!st.aptStyle && Object.keys(st.aptStyle).length > 0

  return (
    <div
      className={`rounded-xl border bg-surface p-2.5 transition-colors ${
        st.owned ? 'border-border' : 'border-border-soft opacity-60 hover:opacity-100'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* avatar with full-aptitude hover popover */}
        <div className="group/apt relative">
          <Avatar card={card} size={48} />
          <div className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-60 rounded-xl border border-border bg-surface-2 p-2.5 shadow-xl group-hover/apt:block">
            <AptitudeGrid card={card} aptStyle={st.aptStyle} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight text-text" title={card.name}>
            {card.name}
          </div>
          {card.title && (
            <div className="truncate text-[11px] text-faint" title={card.title}>
              {card.title}
            </div>
          )}
        </div>
        <button
          onClick={() => setOwned(card.cardId, !st.owned)}
          className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
            st.owned
              ? 'border-brand/50 bg-brand/15 text-brand'
              : 'border-border bg-surface-2 text-muted hover:text-text'
          }`}
        >
          {st.owned ? 'Owned' : 'Add'}
        </button>
      </div>

      {st.owned && (
        <div className="mt-2.5 space-y-1.5 border-t border-border-soft pt-2.5">
          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[10px] uppercase tracking-wide text-faint">Stars</span>
            <Segmented
              value={st.stars}
              onChange={(v) => setStars(card.cardId, v)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[10px] uppercase tracking-wide text-faint">Pot.</span>
            <Segmented
              value={st.potential}
              onChange={(v) => setPotential(card.cardId, v)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-9 shrink-0 text-[10px] uppercase leading-tight tracking-wide text-faint">Style apt</span>
            <div className="flex flex-wrap gap-1">
              {STYLES.map((style) => {
                const overr = st.aptStyle?.[style] != null
                return (
                  <button
                    key={style}
                    onClick={() => cycleApt(style)}
                    title={`${STYLE_LABEL[style]} aptitude — click to change`}
                    className={`rounded ${overr ? 'ring-1 ring-brand' : ''}`}
                  >
                    <GradeBadge grade={st.aptStyle?.[style] ?? card.apt[style]} label={STYLE_ABBR[style]} />
                  </button>
                )
              })}
            </div>
            {hasAptOverride && (
              <button
                onClick={() => STYLES.forEach((s) => setAptStyle(card.cardId, s, null))}
                title="Reset style aptitudes"
                className="text-[12px] text-faint hover:text-text"
              >
                ↺
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={() => toggleLockGlobal(card.cardId)}
              className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                st.lockedGlobal
                  ? 'border-bad/50 bg-bad/15 text-bad'
                  : 'border-border bg-surface-2 text-muted hover:text-text'
              }`}
              title="Exclude from all teams"
            >
              {st.lockedGlobal ? 'Excluded' : 'Lock all'}
            </button>
            <button
              onClick={() => setShowLocks((v) => !v)}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted hover:text-text"
            >
              Per-race{st.lockedCategories.length > 0 ? ` (${st.lockedCategories.length})` : ''}
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
                    className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface/60 p-2.5 backdrop-blur">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search horse…"
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[13px] text-text outline-none placeholder:text-faint focus:border-brand"
        />
        <Checkbox checked={ownedOnly} onChange={setOwnedOnly} label="Owned only" />
        <Checkbox checked={enOnly} onChange={setEnOnly} label="Global (EN) only" />
        <div className="ml-auto flex items-center gap-2 text-[11px]">
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

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
