import { useMemo, useState } from 'react'
import type { Card, Category, Skill } from '../types'
import { CATEGORIES, CATEGORY_LABEL } from '../types'
import { useRoster } from '../state/store'
import { buildAllTeams, type Slot } from '../scoring/optimizer'
import type { MatchedSkill } from '../scoring/classify'
import { skillIcon } from '../data/load'
import { Avatar } from './Avatar'
import { GradeBadge, StyleBadge } from './ui'

function TierTag({ tier, bracket }: { tier: 'gold' | 'normal'; bracket: boolean }) {
  const cls = tier === 'gold' ? 'text-gold border-gold/40 bg-gold/10' : 'text-normal border-normal/40 bg-normal/10'
  return (
    <span className={`rounded border px-1 text-[10px] font-bold uppercase ${cls}`}>
      {tier}
      {bracket ? ' ·low' : ''}
    </span>
  )
}

const ORIGIN_LABEL: Record<string, string> = {
  inherit: 'Inherit',
  potential: 'Potential',
  event: 'Event',
  unique: 'Unique',
}

function SkillRow({ m }: { m: MatchedSkill }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
      <img
        src={skillIcon(m.iconid)}
        alt=""
        className="h-6 w-6 shrink-0 rounded"
        loading="lazy"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-text" title={m.name}>
        {m.name}
      </span>
      <span className="text-[10px] text-faint">{ORIGIN_LABEL[m.origin]}</span>
      <span className="text-[10px] text-faint">· {m.reason}</span>
      <TierTag tier={m.tier} bracket={m.bracket} />
    </div>
  )
}

function WhyPanel({ slot, category }: { slot: Slot; category: Category }) {
  const ev = slot.eval
  return (
    <div className="mt-3 space-y-3 border-t border-border-soft pt-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-faint">Assigned aptitudes:</span>
        <GradeBadge grade={slot.card.apt[slot.style]} label="Style" />
        {category !== 'dirt' ? (
          <>
            <GradeBadge
              grade={
                category === 'sprint'
                  ? slot.card.apt.short
                  : category === 'mile'
                    ? slot.card.apt.mile
                    : category === 'medium'
                      ? slot.card.apt.medium
                      : slot.card.apt.long
              }
              label="Dist"
            />
            <GradeBadge grade={slot.card.apt.turf} label="Turf" />
          </>
        ) : (
          <GradeBadge grade={slot.card.apt.dirt} label="Dirt" />
        )}
      </div>

      {ev.uniqueSkills.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-unique">Unique</div>
          {ev.uniqueSkills.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1">
              <img src={skillIcon(u.iconid)} alt="" className="h-6 w-6 rounded" loading="lazy" />
              <span className="flex-1 text-sm text-text">{u.name}</span>
              <span className="text-[10px] text-faint">+{ev.uniqueValue} value</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-1 text-xs font-semibold text-muted">
          Matched guaranteed skills ({ev.matched.length})
        </div>
        {ev.matched.length === 0 ? (
          <div className="px-2 text-xs text-faint">
            No guaranteed-activation skills relevant to this style/race.
          </div>
        ) : (
          <div className="space-y-0.5">
            {ev.matched.map((m) => (
              <SkillRow key={m.skillId} m={m} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
        <span>
          <b className="text-gold">{ev.goldCount}</b> gold
          {ev.goldBracketCount > 0 && ` (+${ev.goldBracketCount} low)`}
        </span>
        <span>
          <b className="text-normal">{ev.normalCount}</b> normal
          {ev.normalBracketCount > 0 && ` (+${ev.normalBracketCount} low)`}
        </span>
        <span>
          skill score <b className="text-text">{ev.skillScore}</b> + unique{' '}
          <b className="text-text">{ev.uniqueValue}</b> ={' '}
          <b className="text-brand">{ev.score}</b>
        </span>
      </div>
    </div>
  )
}

function SlotCard({ slot, category, idx }: { slot: Slot; category: Category; idx: number }) {
  const [open, setOpen] = useState(false)
  const ev = slot.eval
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <Avatar card={slot.card} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {idx === 0 && (
              <span className="rounded bg-brand/20 px-1.5 text-[10px] font-bold uppercase text-brand">
                Ace
              </span>
            )}
            <span className="truncate font-semibold text-text" title={slot.card.name}>
              {slot.card.name}
            </span>
          </div>
          {slot.card.title && <div className="truncate text-xs text-faint">{slot.card.title}</div>}
          <div className="mt-1 flex items-center gap-2">
            <StyleBadge style={slot.style} full />
            <span className="text-xs text-faint">
              <span className="text-gold">{ev.goldCount}g</span> /{' '}
              <span className="text-normal">{ev.normalCount}n</span>
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-brand">{ev.score}</div>
          <div className="text-[10px] text-faint">{open ? 'hide' : 'why?'}</div>
        </div>
      </button>

      {/* compact chip preview */}
      {!open && ev.matched.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ev.matched.slice(0, 6).map((m) => (
            <span
              key={m.skillId}
              title={`${m.name} — ${m.reason}`}
              className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${
                m.tier === 'gold'
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-border bg-surface-2 text-muted'
              }`}
            >
              <img src={skillIcon(m.iconid)} alt="" className="h-3.5 w-3.5 rounded-sm" loading="lazy" />
              {m.name}
            </span>
          ))}
          {ev.matched.length > 6 && (
            <span className="px-1 text-[11px] text-faint">+{ev.matched.length - 6}</span>
          )}
        </div>
      )}

      {open && <WhyPanel slot={slot} category={category} />}
    </div>
  )
}

export function Teams({ cards, skills }: { cards: Card[]; skills: Record<string, Skill> }) {
  const owned = useRoster((s) => s.owned)
  const settings = useRoster((s) => s.settings)
  const [active, setActive] = useState<Category>('sprint')

  const built = useMemo(
    () =>
      buildAllTeams(cards, skills, owned, {
        potentialLevel: 5, // overridden per-card inside the optimizer
        includeEvent: settings.includeEvent,
        minAptitude: settings.minAptitude,
        requireSurface: settings.requireSurface,
        uniqueAcrossTeams: settings.uniqueAcrossTeams,
      }),
    [cards, skills, owned, settings],
  )

  const ownedCount = useMemo(() => Object.values(owned).filter((o) => o.owned).length, [owned])
  const { team } = built[active]

  if (ownedCount === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
        Mark the horses you own in the <b className="text-text">Roster</b> tab, then come back to see
        suggested teams.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const t = built[c].team
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                active === c
                  ? 'border-brand bg-brand/15 text-text'
                  : 'border-border bg-surface text-muted hover:text-text'
              }`}
            >
              {CATEGORY_LABEL[c]}
              <span className={`text-xs ${t.complete ? 'text-brand' : 'text-bad'}`}>{t.total}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface/60 px-4 py-2">
        <div className="text-sm text-muted">
          {CATEGORY_LABEL[active]} team total{' '}
          <b className="text-brand">{team.total}</b>
        </div>
        {!team.complete && (
          <div className="text-xs text-bad">
            Could not fill 3 distinct running styles — add more eligible horses or relax aptitude.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {team.slots.map((slot, i) => (
          <SlotCard key={slot.card.cardId} slot={slot} category={active} idx={i} />
        ))}
        {team.slots.length < 3 &&
          Array.from({ length: 3 - team.slots.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-sm text-faint"
            >
              No eligible horse
            </div>
          ))}
      </div>
    </div>
  )
}
