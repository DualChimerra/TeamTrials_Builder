import { useMemo, useState } from 'react'
import type { Card, Category, Skill, Style } from '../types'
import { CATEGORIES, CATEGORY_LABEL } from '../types'
import { useRoster } from '../state/store'
import { buildAllTeams, type Candidate, type Slot } from '../scoring/optimizer'
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
    <div className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
      <img
        src={skillIcon(m.iconid)}
        alt=""
        className="h-5 w-5 shrink-0 rounded"
        loading="lazy"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] text-text" title={m.name}>
        {m.name}
      </span>
      <span className="text-[10px] text-faint">{ORIGIN_LABEL[m.origin]}</span>
      <span className="hidden text-[10px] text-faint sm:inline">· {m.reason}</span>
      <TierTag tier={m.tier} bracket={m.bracket} />
    </div>
  )
}

function categoryDistGrade(card: Card, category: Category) {
  switch (category) {
    case 'sprint':
      return card.apt.short
    case 'mile':
      return card.apt.mile
    case 'medium':
      return card.apt.medium
    case 'long':
      return card.apt.long
    default:
      return card.apt.dirt
  }
}

function WhyPanel({ slot, category }: { slot: Slot; category: Category }) {
  const ev = slot.eval
  return (
    <div className="mt-2.5 space-y-2.5 border-t border-border-soft pt-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-faint">Assigned aptitudes:</span>
        <GradeBadge grade={slot.card.apt[slot.style]} label="Style" />
        <GradeBadge grade={categoryDistGrade(slot.card, category)} label={category === 'dirt' ? 'Dist' : 'Dist'} />
        <GradeBadge grade={category === 'dirt' ? slot.card.apt.dirt : slot.card.apt.turf} label={category === 'dirt' ? 'Dirt' : 'Turf'} />
      </div>

      {ev.uniqueSkills.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold text-unique">Unique · not scored</div>
          {ev.uniqueSkills.map((u) => (
            <div key={u.id} className="flex items-center gap-2 px-1.5 py-0.5 opacity-80">
              <img src={skillIcon(u.iconid)} alt="" className="h-5 w-5 rounded" loading="lazy" />
              <span className="flex-1 text-[13px] text-text">{u.name}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-1 text-[11px] font-semibold text-muted">
          Matched guaranteed skills ({ev.matched.length})
        </div>
        {ev.matched.length === 0 ? (
          <div className="px-1.5 text-[11px] text-faint">
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

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
        <span>
          <b className="text-gold">{ev.goldCount}</b> gold
          {ev.goldBracketCount > 0 && ` (+${ev.goldBracketCount} low)`}
        </span>
        <span>
          <b className="text-normal">{ev.normalCount}</b> normal
          {ev.normalBracketCount > 0 && ` (+${ev.normalBracketCount} low)`}
        </span>
        <span>
          score <b className="text-brand">{ev.score}</b>
        </span>
      </div>
    </div>
  )
}

function ChangeDropdown({
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
      {/* click-away */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-64 overflow-auto rounded-xl border border-border bg-surface-2 p-1 shadow-xl">
        {overridden && (
          <button
            onClick={() => {
              onPick(null)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-brand hover:bg-white/5"
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
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5 ${
              c.card.cardId === currentId ? 'bg-brand/10' : ''
            }`}
          >
            <Avatar card={c.card} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] text-text">{c.card.name}</div>
              <div className="truncate text-[10px] text-faint">{c.card.title}</div>
            </div>
            <span className="shrink-0 text-[11px] text-faint">
              <span className="text-gold">{c.eval.goldCount}g</span>/<span className="text-normal">{c.eval.normalCount}n</span>
            </span>
            <span className="shrink-0 text-[12px] font-bold text-brand">{c.eval.score}</span>
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
  const [changeOpen, setChangeOpen] = useState(false)
  const ev = slot.eval

  const alternatives = useMemo(() => {
    const exclude = new Set(teammateIds)
    return candidates
      .filter((c) => c.style === slot.style && !exclude.has(c.card.cardId))
      .sort((a, b) => b.eval.score - a.eval.score)
      .slice(0, 12)
  }, [candidates, slot.style, teammateIds])

  return (
    <div className="rounded-xl border border-border bg-surface p-2.5">
      <div className="flex items-center gap-2.5">
        <Avatar card={slot.card} size={48} />
        <button onClick={() => setWhyOpen((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            {idx === 0 && (
              <span className="rounded bg-brand/20 px-1 text-[10px] font-bold uppercase text-brand">Ace</span>
            )}
            {overridden && (
              <span className="rounded bg-white/10 px-1 text-[10px] font-bold uppercase text-muted" title="Manually chosen">
                Pinned
              </span>
            )}
            <span className="truncate text-[13px] font-semibold text-text" title={slot.card.name}>
              {slot.card.name}
            </span>
          </div>
          {slot.card.title && <div className="truncate text-[11px] text-faint">{slot.card.title}</div>}
          <div className="mt-1 flex items-center gap-2">
            <StyleBadge style={slot.style} full />
            <span className="text-[11px] text-faint">
              <span className="text-gold">{ev.goldCount}g</span> / <span className="text-normal">{ev.normalCount}n</span>
            </span>
          </div>
        </button>
        <div className="relative shrink-0 text-right">
          <div className="text-base font-bold text-brand">{ev.score}</div>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <button
              onClick={() => setWhyOpen((v) => !v)}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-text"
            >
              {whyOpen ? 'hide' : 'why'}
            </button>
            <button
              onClick={() => setChangeOpen((v) => !v)}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-text"
            >
              change ▾
            </button>
          </div>
          {changeOpen && (
            <ChangeDropdown
              alternatives={alternatives}
              currentId={slot.card.cardId}
              overridden={overridden}
              onPick={onPick}
              onClose={() => setChangeOpen(false)}
            />
          )}
        </div>
      </div>

      {!whyOpen && ev.matched.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ev.matched.slice(0, 6).map((m) => (
            <span
              key={m.skillId}
              title={`${m.name} — ${m.reason}`}
              className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${
                m.tier === 'gold' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border bg-surface-2 text-muted'
              }`}
            >
              <img src={skillIcon(m.iconid)} alt="" className="h-3.5 w-3.5 rounded-sm" loading="lazy" />
              {m.name}
            </span>
          ))}
          {ev.matched.length > 6 && <span className="px-1 text-[11px] text-faint">+{ev.matched.length - 6}</span>}
        </div>
      )}

      {whyOpen && <WhyPanel slot={slot} category={category} />}
    </div>
  )
}

// Apply manual overrides to an auto-built team: replace the card on a style slot
// with the user's pick (recomputed eval comes straight from the candidate list).
function applyOverrides(
  autoSlots: Slot[],
  candidates: Candidate[],
  ov: Partial<Record<Style, number>> | undefined,
): Slot[] {
  if (!ov) return autoSlots
  return autoSlots.map((slot) => {
    const pick = ov[slot.style]
    if (pick == null || pick === slot.card.cardId) return slot
    const cand = candidates.find((c) => c.style === slot.style && c.card.cardId === pick)
    return cand ? { card: cand.card, style: slot.style, eval: cand.eval } : slot
  })
}

function TeamSection({
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
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-text">{CATEGORY_LABEL[category]}</h2>
        <span className="text-[12px] font-semibold text-brand">{total}</span>
        {!complete && (
          <span className="text-[11px] text-bad">· can't fill 3 distinct styles (relax aptitude / add horses)</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
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
              className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 p-6 text-[13px] text-faint"
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
        potentialLevel: 5, // overridden per-card inside the optimizer
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
      <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted">
        Mark the horses you own in the <b className="text-text">Roster</b> tab, then come back to see suggested teams.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {CATEGORIES.map((category) => (
        <TeamSection
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
