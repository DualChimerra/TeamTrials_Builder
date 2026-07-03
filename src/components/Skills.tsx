import { useMemo, useState } from 'react'
import type { Card, Category, Skill, Style } from '../types'
import { CATEGORIES, CATEGORY_LABEL, STYLES, STYLE_LABEL } from '../types'
import { charIcon, skillIcon } from '../data/load'
import { allGuaranteedEntries, normalizeName } from '../scoring/classify'
import type { GuaranteedEntry, Scope } from '../scoring/guaranteedSkills'

// One display group of guaranteed skills, keyed by scope.
type GroupKey =
  | 'general'
  | `style:${Style}`
  | `dist:${Category}`
  | 'trickFront'
  | 'trickBack'

function groupOf(scope: Scope): { key: GroupKey; label: string; order: number } {
  switch (scope.kind) {
    case 'general':
      return { key: 'general', label: 'Always active', order: 0 }
    case 'style':
      return { key: `style:${scope.style}`, label: STYLE_LABEL[scope.style], order: 1 }
    case 'trickFront':
      return { key: 'trickFront', label: 'Trick · front group', order: 2 }
    case 'trickBack':
      return { key: 'trickBack', label: 'Trick · rear group', order: 2 }
    case 'dist':
      return { key: `dist:${scope.category}`, label: CATEGORY_LABEL[scope.category], order: 3 }
  }
}

// Tier/bracket sort weight: gold-solid, gold-bracket, normal-solid, normal-bracket.
function tierRank(e: GuaranteedEntry): number {
  return (e.tier === 'gold' ? 0 : 2) + (e.bracket ? 1 : 0)
}

// Does an entry's own scope belong to any of the selected running styles?
// (Trick groups map to their side; general/distance scopes are not style-specific.)
function matchesStyle(scope: Scope, sel: Set<Style>): boolean {
  switch (scope.kind) {
    case 'style':
      return sel.has(scope.style)
    case 'trickFront':
      return sel.has('front') || sel.has('pace')
    case 'trickBack':
      return sel.has('late') || sel.has('end')
    default:
      return false
  }
}

// Does an entry's own scope belong to any of the selected race categories?
function matchesDist(scope: Scope, sel: Set<Category>): boolean {
  return scope.kind === 'dist' && sel.has(scope.category)
}

// Cards that grant a skill, split by how the skill is obtained.
interface SkillCards {
  random: Card[] // innate + potential (training / hints)
  event: Card[] // event-choice rewards
}

// Sort cards: higher ★ first, then by name.
function byCard(a: Card, b: Card): number {
  return b.rarity - a.rarity || a.name.localeCompare(b.name)
}

function CardRow({ cards }: { cards: Card[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {cards.map((c) => (
        <div
          key={c.cardId}
          className="flex items-center gap-1 rounded bg-surface-2 py-0.5 pl-0.5 pr-1.5"
          title={`${c.name} — ${c.title}`}
        >
          <img
            src={charIcon(c)}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full"
            loading="lazy"
            draggable={false}
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
          <span className="max-w-[92px] truncate text-[10px] text-muted">{c.name}</span>
        </div>
      ))}
    </div>
  )
}

function CardsPopover({ cards }: { cards?: SkillCards }) {
  const random = cards?.random ?? []
  const event = cards?.event ?? []
  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-72 max-w-[min(20rem,80vw)] rounded-lg border border-border bg-surface p-2.5 shadow-xl">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
        Cards granting this skill
      </div>
      {random.length === 0 && event.length === 0 ? (
        <div className="text-[11px] text-faint">No cards provide this skill.</div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
          {random.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded bg-brand/15 px-1 text-[9px] font-bold uppercase text-brand">Random</span>
                <span className="text-[10px] text-faint">{random.length}</span>
              </div>
              <CardRow cards={random} />
            </div>
          )}
          {event.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded bg-gold/15 px-1 text-[9px] font-bold uppercase text-gold">Event</span>
                <span className="text-[10px] text-faint">{event.length}</span>
              </div>
              <CardRow cards={event} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SkillCard({ entry, skill, cards }: { entry: GuaranteedEntry; skill?: Skill; cards?: SkillCards }) {
  const gold = entry.tier === 'gold'
  const [open, setOpen] = useState(false)
  const hasCards = !!cards && (cards.random.length > 0 || cards.event.length > 0)
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        tabIndex={hasCards ? 0 : -1}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`flex items-start gap-2.5 rounded-lg border border-border bg-surface p-2.5 outline-none transition-colors ${
          hasCards ? 'cursor-help hover:border-brand/50 focus:border-brand/50' : ''
        }`}
      >
        {skill ? (
          <img
            src={skillIcon(skill.iconid)}
            alt=""
            className="mt-0.5 h-7 w-7 shrink-0 rounded"
            loading="lazy"
            draggable={false}
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
        ) : (
          <div className="mt-0.5 h-7 w-7 shrink-0 rounded bg-surface-2" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`min-w-0 truncate text-[13px] font-semibold ${gold ? 'text-gold' : 'text-text'}`} title={entry.name}>
              {entry.name}
            </span>
            <span
              className={`shrink-0 rounded px-1 text-[9px] font-bold uppercase ${
                gold ? 'bg-gold/15 text-gold' : 'bg-surface-2 text-muted'
              }`}
            >
              {gold ? 'Gold' : 'White'}
            </span>
            {entry.bracket && (
              <span
                className="shrink-0 rounded bg-surface-2 px-1 text-[9px] font-medium text-faint"
                title="Activates most races but not strictly every race — lower priority"
              >
                Situational
              </span>
            )}
            {hasCards && (
              <span
                className="ml-auto shrink-0 rounded bg-surface-2 px-1 text-[9px] font-medium text-faint"
                title="Number of cards that grant this skill — hover to see them"
              >
                {cards!.random.length + cards!.event.length} cards
              </span>
            )}
          </div>
          {skill?.desc && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-faint" title={skill.desc}>
              {skill.desc}
            </p>
          )}
        </div>
      </div>
      {open && hasCards && <CardsPopover cards={cards} />}
    </div>
  )
}

// A small multi-select chip group used for the filter bar.
function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { value: T; label: string }[]
  selected: Set<T>
  onToggle: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const on = selected.has(o.value)
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                on ? 'border-brand/50 bg-brand/15 text-brand' : 'border-border bg-surface-2 text-muted hover:text-text'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Tier = 'gold' | 'white'
type Freq = 'always' | 'situational'

export function Skills({ skills, cards }: { skills: Record<string, Skill>; cards: Card[] }) {
  const [q, setQ] = useState('')
  const [styleSel, setStyleSel] = useState<Set<Style>>(new Set())
  const [distSel, setDistSel] = useState<Set<Category>>(new Set())
  const [tierSel, setTierSel] = useState<Set<Tier>>(new Set())
  const [freqSel, setFreqSel] = useState<Set<Freq>>(new Set())

  const toggle = <T,>(set: (u: (s: Set<T>) => Set<T>) => void, v: T) =>
    set((prev) => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })

  // Match each guaranteed entry to a real skill record (for icon + description),
  // preferring the rarity that matches its tier (gold = 2, normal = 1).
  const byName = useMemo(() => {
    const map = new Map<string, Skill>()
    for (const s of Object.values(skills)) {
      const key = normalizeName(s.name)
      const prev = map.get(key)
      // keep the lowest-rarity scored version (1 white / 2 gold), skip uniques
      if (!prev || (s.rarity >= 1 && s.rarity < prev.rarity)) map.set(key, s)
    }
    return map
  }, [skills])

  // Reverse index: normalized skill name -> cards that grant it, split by how it
  // is obtained (innate/potential = "random", event = "event").
  const cardsByName = useMemo(() => {
    const idName = new Map<number, string>()
    for (const s of Object.values(skills)) idName.set(s.id, normalizeName(s.name))
    const map = new Map<string, SkillCards>()
    const bucket = (nm: string) => {
      let e = map.get(nm)
      if (!e) {
        e = { random: [], event: [] }
        map.set(nm, e)
      }
      return e
    }
    for (const card of cards) {
      const rSeen = new Set<string>()
      const eSeen = new Set<string>()
      const addRandom = (id: number) => {
        const nm = idName.get(id)
        if (!nm || rSeen.has(nm)) return
        rSeen.add(nm)
        bucket(nm).random.push(card)
      }
      for (const id of card.innate) addRandom(id)
      for (const p of card.potential) addRandom(p.id)
      for (const id of card.event) {
        const nm = idName.get(id)
        if (!nm || eSeen.has(nm)) continue
        eSeen.add(nm)
        bucket(nm).event.push(card)
      }
    }
    for (const e of map.values()) {
      e.random.sort(byCard)
      e.event.sort(byCard)
    }
    return map
  }, [skills, cards])

  const entries = useMemo(() => allGuaranteedEntries(), [])

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const buckets = new Map<GroupKey, { label: string; order: number; items: { entry: GuaranteedEntry; skill?: Skill; cards?: SkillCards }[] }>()
    for (const entry of entries) {
      if (query && !entry.name.toLowerCase().includes(query)) continue
      if (tierSel.size && !tierSel.has(entry.tier === 'gold' ? 'gold' : 'white')) continue
      if (freqSel.size && !freqSel.has(entry.bracket ? 'situational' : 'always')) continue
      // Style/distance chips narrow to their groups (OR across selected chips).
      // "Always active" general skills apply everywhere, so they stay visible.
      if (styleSel.size || distSel.size) {
        const keep =
          entry.scope.kind === 'general' ||
          matchesStyle(entry.scope, styleSel) ||
          matchesDist(entry.scope, distSel)
        if (!keep) continue
      }
      const g = groupOf(entry.scope)
      let b = buckets.get(g.key)
      if (!b) {
        b = { label: g.label, order: g.order, items: [] }
        buckets.set(g.key, b)
      }
      b.items.push({ entry, skill: byName.get(normalizeName(entry.name)), cards: cardsByName.get(normalizeName(entry.name)) })
    }
    for (const b of buckets.values()) {
      b.items.sort((a, z) => tierRank(a.entry) - tierRank(z.entry) || a.entry.name.localeCompare(z.entry.name))
    }
    return Array.from(buckets.entries())
      .map(([key, b]) => ({ key, ...b }))
      .sort((a, z) => a.order - z.order || a.label.localeCompare(z.label))
  }, [entries, byName, cardsByName, q, styleSel, distSel, tierSel, freqSel])

  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])
  const anyFilter = q.trim() || styleSel.size || distSel.size || tierSel.size || freqSel.size

  return (
    <div className="space-y-4">
      <div className="space-y-2.5 rounded-xl border border-border bg-surface/60 p-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search skill…"
            className="min-w-[180px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[13px] text-text outline-none placeholder:text-faint focus:border-brand"
          />
          {anyFilter ? (
            <button
              onClick={() => {
                setQ('')
                setStyleSel(new Set())
                setDistSel(new Set())
                setTierSel(new Set())
                setFreqSel(new Set())
              }}
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] font-medium text-muted hover:text-text"
            >
              Clear
            </button>
          ) : null}
          <span className="ml-auto text-[11px] text-faint">{total} skills</span>
        </div>
        <div className="flex flex-col gap-2 border-t border-border/60 pt-2.5 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
          <ChipGroup
            label="Style"
            options={STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))}
            selected={styleSel}
            onToggle={(v) => toggle(setStyleSel, v)}
          />
          <ChipGroup
            label="Distance"
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            selected={distSel}
            onToggle={(v) => toggle(setDistSel, v)}
          />
          <ChipGroup
            label="Tier"
            options={[
              { value: 'gold', label: 'Gold' },
              { value: 'white', label: 'White' },
            ]}
            selected={tierSel}
            onToggle={(v) => toggle(setTierSel, v)}
          />
          <ChipGroup
            label="Frequency"
            options={[
              { value: 'always', label: 'Guaranteed' },
              { value: 'situational', label: 'Situational' },
            ]}
            selected={freqSel}
            onToggle={(v) => toggle(setFreqSel, v)}
          />
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
            <span className="text-[11px] text-faint">{g.items.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map(({ entry, skill, cards }) => (
              <SkillCard key={`${g.key}:${entry.name}`} entry={entry} skill={skill} cards={cards} />
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className="py-16 text-center text-faint">No skills match your filters.</div>}
    </div>
  )
}
