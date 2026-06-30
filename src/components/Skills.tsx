import { useMemo, useState } from 'react'
import type { Category, Skill, Style } from '../types'
import { CATEGORY_LABEL, STYLE_LABEL } from '../types'
import { skillIcon } from '../data/load'
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

function SkillCard({ entry, skill }: { entry: GuaranteedEntry; skill?: Skill }) {
  const gold = entry.tier === 'gold'
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface p-2.5">
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
        </div>
        {skill?.desc && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-faint" title={skill.desc}>
            {skill.desc}
          </p>
        )}
      </div>
    </div>
  )
}

export function Skills({ skills }: { skills: Record<string, Skill> }) {
  const [q, setQ] = useState('')
  const [goldOnly, setGoldOnly] = useState(false)

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

  const entries = useMemo(() => allGuaranteedEntries(), [])

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const buckets = new Map<GroupKey, { label: string; order: number; items: { entry: GuaranteedEntry; skill?: Skill }[] }>()
    for (const entry of entries) {
      if (goldOnly && entry.tier !== 'gold') continue
      if (query && !entry.name.toLowerCase().includes(query)) continue
      const g = groupOf(entry.scope)
      let b = buckets.get(g.key)
      if (!b) {
        b = { label: g.label, order: g.order, items: [] }
        buckets.set(g.key, b)
      }
      b.items.push({ entry, skill: byName.get(normalizeName(entry.name)) })
    }
    for (const b of buckets.values()) {
      b.items.sort((a, z) => tierRank(a.entry) - tierRank(z.entry) || a.entry.name.localeCompare(z.entry.name))
    }
    return Array.from(buckets.entries())
      .map(([key, b]) => ({ key, ...b }))
      .sort((a, z) => a.order - z.order || a.label.localeCompare(z.label))
  }, [entries, byName, q, goldOnly])

  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface/60 p-2.5 backdrop-blur">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search skill…"
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[13px] text-text outline-none placeholder:text-faint focus:border-brand"
        />
        <button
          onClick={() => setGoldOnly((v) => !v)}
          className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
            goldOnly ? 'border-gold/50 bg-gold/15 text-gold' : 'border-border bg-surface-2 text-muted hover:text-text'
          }`}
        >
          Gold only
        </button>
        <span className="ml-auto text-[11px] text-faint">{total} skills</span>
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
            <span className="text-[11px] text-faint">{g.items.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map(({ entry, skill }) => (
              <SkillCard key={`${g.key}:${entry.name}`} entry={entry} skill={skill} />
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className="py-16 text-center text-faint">No skills match your filters.</div>}
    </div>
  )
}
