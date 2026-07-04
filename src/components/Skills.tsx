import { useMemo, useState, type ReactNode } from 'react'
import type { Card, Category, Skill, Style, SupportCard } from '../types'
import { CATEGORIES, CATEGORY_LABEL, STYLES, STYLE_LABEL } from '../types'
import { charThumb, skillIcon, supportIcon } from '../data/load'
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

// A support card carrying its own id (supports.json is keyed by id).
type SupportEntry = SupportCard & { id: number }

// Everything that can grant a skill, split by card kind (support card vs
// character) and by how it is obtained (random = training/hints, event = story
// events). Only global-released cards are collected.
interface SkillSources {
  supRandom: SupportEntry[] // support cards: taught via training hints
  supEvent: SupportEntry[] // support cards: from the card's story events
  charRandom: Card[] // characters: innate + potential (training)
  charEvent: Card[] // characters: event-choice rewards
}

function sourceCount(s?: SkillSources): number {
  return s ? s.supRandom.length + s.supEvent.length + s.charRandom.length + s.charEvent.length : 0
}

// Sort: higher ★ first, then by name.
function byCard(a: Card, b: Card): number {
  return b.rarity - a.rarity || a.name.localeCompare(b.name)
}
function bySupport(a: SupportEntry, b: SupportEntry): number {
  return (b.rarity ?? 0) - (a.rarity ?? 0) || a.name.localeCompare(b.name)
}

function CardChip({ card }: { card: Card }) {
  const [err, setErr] = useState(false)
  return (
    <div
      className="flex items-center gap-1.5 rounded-md bg-bg px-1.5 py-1"
      title={`${card.name} — ${card.title}`}
    >
      {err ? (
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] text-faint">
          {card.name.charAt(0)}
        </div>
      ) : (
        <img
          src={charThumb(card)}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full object-cover object-top"
          loading="lazy"
          draggable={false}
          onError={() => setErr(true)}
        />
      )}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[11px] font-medium text-text">{card.name}</div>
        {card.title && <div className="truncate text-[9px] text-faint">{card.title}</div>}
      </div>
    </div>
  )
}

function SupportChip({ sup }: { sup: SupportEntry }) {
  const [err, setErr] = useState(false)
  return (
    <div
      className="flex items-center gap-1.5 rounded-md bg-bg px-1.5 py-1"
      title={`${sup.name} — ${sup.title}`}
    >
      {err ? (
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 text-[10px] text-faint">
          {sup.name.charAt(0)}
        </div>
      ) : (
        <img
          src={supportIcon(sup.id)}
          alt=""
          className="h-6 w-6 shrink-0 rounded-md object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setErr(true)}
        />
      )}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[11px] font-medium text-text">{sup.name}</div>
        {sup.title && <div className="truncate text-[9px] text-faint">{sup.title}</div>}
      </div>
    </div>
  )
}

// A "Random" / "Event" labelled sub-list within a popover section.
function SrcGroup({ kind, n, children }: { kind: 'random' | 'event'; n: number; children: ReactNode }) {
  const isEvent = kind === 'event'
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`rounded px-1 text-[9px] font-bold uppercase ${
            isEvent ? 'bg-gold/15 text-gold' : 'bg-brand/15 text-brand'
          }`}
        >
          {isEvent ? 'Event' : 'Random'}
        </span>
        <span className="text-[10px] text-faint">{n}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function CardsPopover({ src }: { src?: SkillSources }) {
  const s = src ?? { supRandom: [], supEvent: [], charRandom: [], charEvent: [] }
  const hasSup = s.supRandom.length + s.supEvent.length > 0
  const hasChar = s.charRandom.length + s.charEvent.length > 0
  return (
    <div className="absolute left-0 top-full z-50 w-80 max-w-[min(22rem,88vw)] rounded-lg border border-border-strong bg-surface-2 p-2.5 shadow-2xl">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
        Where to get this skill
      </div>
      {!hasSup && !hasChar ? (
        <div className="text-[11px] text-faint">No global card provides this skill.</div>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto pr-0.5">
          {hasSup && (
            <section>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Support cards
              </div>
              <div className="space-y-2">
                {s.supRandom.length > 0 && (
                  <SrcGroup kind="random" n={s.supRandom.length}>
                    {s.supRandom.map((x) => (
                      <SupportChip key={x.id} sup={x} />
                    ))}
                  </SrcGroup>
                )}
                {s.supEvent.length > 0 && (
                  <SrcGroup kind="event" n={s.supEvent.length}>
                    {s.supEvent.map((x) => (
                      <SupportChip key={x.id} sup={x} />
                    ))}
                  </SrcGroup>
                )}
              </div>
            </section>
          )}
          {hasChar && (
            <section>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Characters
              </div>
              <div className="space-y-2">
                {s.charRandom.length > 0 && (
                  <SrcGroup kind="random" n={s.charRandom.length}>
                    {s.charRandom.map((c) => (
                      <CardChip key={c.cardId} card={c} />
                    ))}
                  </SrcGroup>
                )}
                {s.charEvent.length > 0 && (
                  <SrcGroup kind="event" n={s.charEvent.length}>
                    {s.charEvent.map((c) => (
                      <CardChip key={c.cardId} card={c} />
                    ))}
                  </SrcGroup>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function SkillCard({ entry, skill, src }: { entry: GuaranteedEntry; skill?: Skill; src?: SkillSources }) {
  const gold = entry.tier === 'gold'
  const [open, setOpen] = useState(false)
  const count = sourceCount(src)
  const hasCards = count > 0
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
                title="Number of global cards that grant this skill — hover to see them"
              >
                {count} cards
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
      {open && hasCards && <CardsPopover src={src} />}
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

export function Skills({
  skills,
  cards,
  supports,
}: {
  skills: Record<string, Skill>
  cards: Card[]
  supports: Record<string, SupportCard>
}) {
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

  // Reverse index: normalized skill name -> every global card that grants it,
  // split by card kind (support / character) and how it is obtained (training
  // hints or innate/potential = "random", story events = "event"). Cards not yet
  // released on global are skipped so the list matches what players can obtain.
  const sourcesByName = useMemo(() => {
    const idName = new Map<number, string>()
    for (const s of Object.values(skills)) idName.set(s.id, normalizeName(s.name))
    const map = new Map<string, SkillSources>()
    const bucket = (nm: string) => {
      let e = map.get(nm)
      if (!e) {
        e = { supRandom: [], supEvent: [], charRandom: [], charEvent: [] }
        map.set(nm, e)
      }
      return e
    }
    // Support cards (global only): hint_skills = random, event_skills = event.
    for (const [idStr, sc] of Object.entries(supports)) {
      if (!sc.releaseEn) continue
      const sup: SupportEntry = { ...sc, id: Number(idStr) }
      const rSeen = new Set<string>()
      const eSeen = new Set<string>()
      for (const id of sc.hintSkills ?? []) {
        const nm = idName.get(id)
        if (!nm || rSeen.has(nm)) continue
        rSeen.add(nm)
        bucket(nm).supRandom.push(sup)
      }
      for (const id of sc.eventSkills ?? []) {
        const nm = idName.get(id)
        if (!nm || eSeen.has(nm)) continue
        eSeen.add(nm)
        bucket(nm).supEvent.push(sup)
      }
    }
    // Characters (global only): innate + potential = random, event = event.
    for (const card of cards) {
      if (!card.releaseEn) continue
      const rSeen = new Set<string>()
      const eSeen = new Set<string>()
      const addRandom = (id: number) => {
        const nm = idName.get(id)
        if (!nm || rSeen.has(nm)) return
        rSeen.add(nm)
        bucket(nm).charRandom.push(card)
      }
      for (const id of card.innate) addRandom(id)
      for (const p of card.potential) addRandom(p.id)
      for (const id of card.event) {
        const nm = idName.get(id)
        if (!nm || eSeen.has(nm)) continue
        eSeen.add(nm)
        bucket(nm).charEvent.push(card)
      }
    }
    for (const e of map.values()) {
      e.supRandom.sort(bySupport)
      e.supEvent.sort(bySupport)
      e.charRandom.sort(byCard)
      e.charEvent.sort(byCard)
    }
    return map
  }, [skills, cards, supports])

  const entries = useMemo(() => allGuaranteedEntries(), [])

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const buckets = new Map<GroupKey, { label: string; order: number; items: { entry: GuaranteedEntry; skill?: Skill; src?: SkillSources }[] }>()
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
      b.items.push({ entry, skill: byName.get(normalizeName(entry.name)), src: sourcesByName.get(normalizeName(entry.name)) })
    }
    for (const b of buckets.values()) {
      b.items.sort((a, z) => tierRank(a.entry) - tierRank(z.entry) || a.entry.name.localeCompare(z.entry.name))
    }
    return Array.from(buckets.entries())
      .map(([key, b]) => ({ key, ...b }))
      .sort((a, z) => a.order - z.order || a.label.localeCompare(z.label))
  }, [entries, byName, sourcesByName, q, styleSel, distSel, tierSel, freqSel])

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
            {g.items.map(({ entry, skill, src }) => (
              <SkillCard key={`${g.key}:${entry.name}`} entry={entry} skill={skill} src={src} />
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className="py-16 text-center text-faint">No skills match your filters.</div>}
    </div>
  )
}
