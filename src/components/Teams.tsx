import { useMemo, useState } from 'react'
import type { Card, Category, Skill, Style } from '../types'
import { CATEGORIES, CATEGORY_LABEL } from '../types'
import { useRoster } from '../state/store'
import { buildAllTeams, type Candidate, type Slot } from '../scoring/optimizer'
import type { MatchedSkill } from '../scoring/classify'
import { skillIcon } from '../data/load'
import { Avatar } from './Avatar'
import { GradeBadge, StyleBadge } from './ui'

const CATEGORY_METERS: Record<Category, string> = {
  sprint: '1200m',
  mile: '1600m',
  medium: '2000m',
  long: '3000m',
  dirt: '1800m',
}

const ORIGIN_LABEL: Record<string, string> = {
  inherit: 'Inherit',
  potential: 'Potential',
  event: 'Event',
}

function SkillChip({ m }: { m: MatchedSkill }) {
  const gold = m.tier === 'gold'
  return (
    <span
      title={`${m.name} — ${m.reason}${m.bracket ? ' (lower priority)' : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-md border py-0.5 pl-1 pr-2 text-[11.5px] ${
        gold ? 'border-gold/25 bg-gold/[0.12] text-gold' : 'border-border bg-surface-2 text-muted'
      }`}
    >
      <img
        src={skillIcon(m.iconid)}
        alt=""
        className="h-4 w-4 rounded"
        loading="lazy"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      {m.name}
    </span>
  )
}

function SkillRow({ m }: { m: MatchedSkill }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/[0.04]">
      <img src={skillIcon(m.iconid)} alt="" className="h-5 w-5 shrink-0 rounded" loading="lazy" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-text" title={m.name}>
        {m.name}
      </span>
      <span className="text-[10px] text-faint">{ORIGIN_LABEL[m.origin]}</span>
      <span className="hidden text-[10px] text-faint sm:inline">· {m.reason}</span>
      <span
        className={`rounded border px-1 text-[10px] font-bold uppercase ${
          m.tier === 'gold' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border bg-surface-2 text-muted'
        }`}
      >
        {m.tier}
        {m.bracket ? ' ·low' : ''}
      </span>
    </div>
  )
}

function distGrade(card: Card, category: Category) {
  return category === 'sprint'
    ? card.apt.short
    : category === 'mile'
      ? card.apt.mile
      : category === 'medium'
        ? card.apt.medium
        : category === 'long'
          ? card.apt.long
          : card.apt.dirt
}

function WhyPanel({ slot, category }: { slot: Slot; category: Category }) {
  const ev = slot.eval
  return (
    <div className="mt-3 space-y-2.5 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-faint">Assigned aptitudes:</span>
        <GradeBadge grade={slot.card.apt[slot.style]} label="Style" />
        <GradeBadge grade={distGrade(slot.card, category)} label="Dist" />
        <GradeBadge grade={category === 'dirt' ? slot.card.apt.dirt : slot.card.apt.turf} label={category === 'dirt' ? 'Dirt' : 'Turf'} />
      </div>
      <div>
        <div className="mb-1 text-[11px] font-semibold text-muted">Matched guaranteed skills ({ev.matched.length})</div>
        {ev.matched.length === 0 ? (
          <div className="px-1.5 text-[11px] text-faint">No guaranteed-activation skills relevant to this style/race.</div>
        ) : (
          <div className="space-y-0.5">
            {ev.matched.map((m) => (
              <SkillRow key={m.skillId} m={m} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
        <span>
          <b className="text-gold">{ev.goldCount}</b> gold{ev.goldBracketCount > 0 && ` (+${ev.goldBracketCount} low)`}
        </span>
        <span>
          <b className="text-text">{ev.normalCount}</b> normal{ev.normalBracketCount > 0 && ` (+${ev.normalBracketCount} low)`}
        </span>
        <span>
          score <b className="text-brand">{ev.score}</b>
        </span>
      </div>
    </div>
  )
}

function SwapDropdown({
  alternatives,
  currentId,
  overridden,
  onPick,
  onClose,
}: {
  alternatives: Candidate[]
  currentId: number
  overridden: boolean
  onPick: (cardId: number | null) => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-full z-30 mt-1.5 max-h-72 w-64 overflow-auto rounded-xl border border-border bg-surface-2 p-1 shadow-xl">
        {overridden && (
          <button
            onClick={() => {
              onPick(null)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-brand hover:bg-white/[0.05]"
          >
            ↺ Auto (best pick)
          </button>
        )}
        {alternatives.length === 0 && (
          <div className="px-2 py-3 text-center text-[11px] text-faint">No other eligible horse for this style.</div>
        )}
        {alternatives.map((c) => (
          <button
            key={c.card.cardId}
            onClick={() => {
              onPick(c.card.cardId)
              onClose()
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.05] ${
              c.card.cardId === currentId ? 'bg-accent-soft' : ''
            }`}
          >
            <Avatar card={c.card} size={26} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] text-text">{c.card.name}</div>
              <div className="truncate text-[10px] text-faint">{c.card.title}</div>
            </div>
            <span className="shrink-0 text-[11px]">
              <span className="text-gold">{c.eval.goldCount}g</span> <span className="text-faint">{c.eval.normalCount}n</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-text">{c.eval.score}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function SlotCard({
  slot,
  category,
  idx,
  candidates,
  teammateIds,
  overridden,
  onPick,
}: {
  slot: Slot
  category: Category
  idx: number
  candidates: Candidate[]
  teammateIds: number[]
  overridden: boolean
  onPick: (cardId: number | null) => void
}) {
  const [whyOpen, setWhyOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const ev = slot.eval

  const alternatives = useMemo(() => {
    const exclude = new Set(teammateIds)
    return candidates
      .filter((c) => c.style === slot.style && !exclude.has(c.card.cardId))
      .sort((a, b) => b.eval.score - a.eval.score)
      .slice(0, 12)
  }, [candidates, slot.style, teammateIds])

  const miniBtn = 'rounded-md border border-border px-2 py-0.5 text-[11px] text-faint hover:text-text'

  return (
    <div className="rounded-[13px] border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <Avatar card={slot.card} size={46} className="rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {idx === 0 && (
              <span className="shrink-0 rounded border border-brand/50 px-1 text-[10px] font-bold uppercase text-brand">Ace</span>
            )}
            {overridden && (
              <span className="shrink-0 rounded bg-white/10 px-1 text-[10px] font-bold uppercase text-muted" title="Manually chosen">
                Pinned
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text" title={slot.card.name}>
              {slot.card.name}
            </span>
            <span className="shrink-0 text-[19px] font-semibold leading-none text-text">{ev.score}</span>
          </div>
          {slot.card.title && <div className="truncate text-[11.5px] text-faint">{slot.card.title}</div>}
          <div className="mt-2 flex items-center gap-2.5">
            <StyleBadge style={slot.style} full />
            <span className="text-[11.5px]">
              <span className="text-gold">{ev.goldCount}g</span> <span className="text-faint">{ev.normalCount}n</span>
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setWhyOpen((v) => !v)} className={miniBtn}>
                Why
              </button>
              <div className="relative">
                <button onClick={() => setSwapOpen((v) => !v)} className={miniBtn}>
                  Swap
                </button>
                {swapOpen && (
                  <SwapDropdown
                    alternatives={alternatives}
                    currentId={slot.card.cardId}
                    overridden={overridden}
                    onPick={onPick}
                    onClose={() => setSwapOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {ev.matched.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {ev.matched.map((m) => (
            <SkillChip key={m.skillId} m={m} />
          ))}
        </div>
      )}

      {whyOpen && <WhyPanel slot={slot} category={category} />}
    </div>
  )
}

function applyOverrides(autoSlots: Slot[], candidates: Candidate[], ov: Partial<Record<Style, number>> | undefined): Slot[] {
  if (!ov) return autoSlots
  return autoSlots.map((slot) => {
    const pick = ov[slot.style]
    if (pick == null || pick === slot.card.cardId) return slot
    const cand = candidates.find((c) => c.style === slot.style && c.card.cardId === pick)
    return cand ? { card: cand.card, style: slot.style, eval: cand.eval } : slot
  })
}

function TeamPanel({
  category,
  autoSlots,
  candidates,
  ov,
  onPick,
}: {
  category: Category
  autoSlots: Slot[]
  candidates: Candidate[]
  ov: Partial<Record<Style, number>> | undefined
  onPick: (style: Style, cardId: number | null) => void
}) {
  const slots = applyOverrides(autoSlots, candidates, ov)
  const total = slots.reduce((s, x) => s + x.eval.score, 0)
  const complete = slots.length === 3
  const teamIds = slots.map((s) => s.card.cardId)

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold text-text">{CATEGORY_LABEL[category]}</h2>
          <span className="text-[11px] text-faint">{CATEGORY_METERS[category]}</span>
          {!complete && <span className="text-[11px] text-bad">· can't fill 3 distinct styles</span>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[18px] font-semibold text-text">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-faint">pts</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {slots.map((slot, i) => (
          <SlotCard
            key={`${slot.style}-${slot.card.cardId}`}
            slot={slot}
            category={category}
            idx={i}
            candidates={candidates}
            teammateIds={teamIds.filter((id) => id !== slot.card.cardId)}
            overridden={ov?.[slot.style] != null}
            onPick={(cardId) => onPick(slot.style, cardId)}
          />
        ))}
        {slots.length < 3 &&
          Array.from({ length: 3 - slots.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center rounded-[13px] border border-dashed border-border bg-surface/40 p-6 text-[13px] text-faint"
            >
              No eligible horse
            </div>
          ))}
      </div>
    </section>
  )
}

export function Teams({ cards, skills }: { cards: Card[]; skills: Record<string, Skill> }) {
  const owned = useRoster((s) => s.owned)
  const settings = useRoster((s) => s.settings)
  const overrides = useRoster((s) => s.overrides)
  const setOverride = useRoster((s) => s.setOverride)

  const built = useMemo(
    () =>
      buildAllTeams(cards, skills, owned, {
        potentialLevel: 5,
        includeEvent: settings.includeEvent,
        minAptitude: settings.minAptitude,
        requireSurface: settings.requireSurface,
        uniqueAcrossTeams: settings.uniqueAcrossTeams,
      }),
    [cards, skills, owned, settings],
  )

  const ownedCount = useMemo(() => Object.values(owned).filter((o) => o.owned).length, [owned])

  if (ownedCount === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
        Mark the horses you own in the <b className="text-text">Roster</b> tab, then come back to see suggested teams.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {CATEGORIES.map((category) => (
        <TeamPanel
          key={category}
          category={category}
          autoSlots={built[category].team.slots}
          candidates={built[category].candidates}
          ov={overrides[category]}
          onPick={(style, cardId) => setOverride(category, style, cardId)}
        />
      ))}
    </div>
  )
}
