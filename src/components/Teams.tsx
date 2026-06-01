import { useCallback, useMemo, useState } from 'react'
import type { Card, Category, Grade, Skill, Style } from '../types'
import { CATEGORIES, CATEGORY_LABEL, STYLE_LABEL, STYLES } from '../types'
import { useRoster, defaultOwnedState, type SlotOverride } from '../state/store'
import { buildAllTeams, effectiveApt, type Candidate } from '../scoring/optimizer'
import { evalCard, type CardEval, type MatchedSkill } from '../scoring/classify'
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
const ORIGIN_LABEL: Record<string, string> = { inherit: 'Inherit', potential: 'Potential', event: 'Event' }
const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
const gradeRank = (g: Grade) => GRADE_ORDER.indexOf(g)

type EvalFor = (card: Card, style: Style) => CardEval
type AptOf = (card: Card, style: Style) => Grade

// A resolved slot: either a horse, or an intentionally empty slot.
interface DisplaySlot {
  style: Style
  card?: Card
  eval?: CardEval
  empty?: boolean
  overridden?: boolean
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
      <img src={skillIcon(m.iconid)} alt="" className="h-4 w-4 rounded" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
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
      <span className={`rounded border px-1 text-[10px] font-bold uppercase ${m.tier === 'gold' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border bg-surface-2 text-muted'}`}>
        {m.tier}
        {m.bracket ? ' ·low' : ''}
      </span>
    </div>
  )
}

function distGrade(card: Card, category: Category) {
  return category === 'sprint' ? card.apt.short : category === 'mile' ? card.apt.mile : category === 'medium' ? card.apt.medium : category === 'long' ? card.apt.long : card.apt.dirt
}

function WhyPanel({ slot, category, aptOf }: { slot: DisplaySlot; category: Category; aptOf: AptOf }) {
  const ev = slot.eval!
  const card = slot.card!
  return (
    <div className="mt-3 space-y-2.5 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-faint">Assigned aptitudes:</span>
        <GradeBadge grade={aptOf(card, slot.style)} label="Style" />
        <GradeBadge grade={distGrade(card, category)} label="Dist" />
        <GradeBadge grade={category === 'dirt' ? card.apt.dirt : card.apt.turf} label={category === 'dirt' ? 'Dirt' : 'Turf'} />
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

// Dropdown listing alternative horses for a style (incl. off-main-style ones, marked with grade).
function SwapDropdown({ alternatives, currentId, overridden, onPick, onClose }: { alternatives: { c: Candidate; grade: Grade }[]; currentId?: number; overridden: boolean; onPick: (cardId: number | null) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-full z-30 mt-1.5 max-h-80 w-72 overflow-auto rounded-xl border border-border bg-surface-2 p-1 shadow-xl">
        {overridden && (
          <button onClick={() => { onPick(null); onClose() }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-brand hover:bg-white/[0.05]">
            ↺ Auto (best pick)
          </button>
        )}
        {alternatives.length === 0 && <div className="px-2 py-3 text-center text-[11px] text-faint">No other eligible horse for this style.</div>}
        {alternatives.map(({ c, grade }) => (
          <button
            key={c.card.cardId}
            onClick={() => { onPick(c.card.cardId); onClose() }}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.05] ${c.card.cardId === currentId ? 'bg-accent-soft' : ''}`}
          >
            <Avatar card={c.card} size={26} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] text-text">{c.card.name}</div>
              <div className="truncate text-[10px] text-faint">{c.card.title}</div>
            </div>
            <span title={`${STYLE_LABEL[c.style]} aptitude`} className={gradeRank(grade) <= 2 ? 'text-good' : 'text-faint'}>
              <GradeBadge grade={grade} />
            </span>
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

// Inline running-style switcher: pick a style for THIS horse; skills recompute for the new style.
function StyleSwitcher({ card, current, aptOf, minRank, onPick, onClose }: { card: Card; current: Style; aptOf: AptOf; minRank: number; onPick: (style: Style) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-border bg-surface-2 p-1 shadow-xl">
        {STYLES.map((style) => {
          const grade = aptOf(card, style)
          const below = gradeRank(grade) > minRank
          return (
            <button
              key={style}
              onClick={() => { onPick(style); onClose() }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-white/[0.05] ${style === current ? 'bg-accent-soft' : ''}`}
            >
              <span className="flex items-center gap-1.5" style={{ color: `var(--st-${style})` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--st-${style})` }} />
                {STYLE_LABEL[style]}
              </span>
              <span className={below ? 'text-bad' : 'text-faint'} title={below ? 'Below minimum aptitude' : undefined}>
                <GradeBadge grade={grade} />
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function SlotCard({ slot, category, idx, alternatives, minRank, aptOf, onSet }: { slot: DisplaySlot; category: Category; idx: number; alternatives: { c: Candidate; grade: Grade }[]; minRank: number; aptOf: AptOf; onSet: (patch: SlotOverride | null) => void }) {
  const [whyOpen, setWhyOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const card = slot.card!
  const ev = slot.eval!
  const miniBtn = 'rounded-md border border-border px-2 py-0.5 text-[11px] text-faint hover:text-text'

  return (
    <div className="relative rounded-[13px] border border-border bg-surface p-3.5">
      <button onClick={() => onSet({ card: 'empty' })} title="Leave this slot empty" className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded text-faint hover:bg-white/10 hover:text-text">
        ✕
      </button>
      <div className="flex items-start gap-3">
        <Avatar card={card} size={46} className="rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 pr-6">
            {idx === 0 && <span className="shrink-0 rounded border border-brand/50 px-1 text-[10px] font-bold uppercase text-brand">Ace</span>}
            {slot.overridden && <span className="shrink-0 rounded bg-white/10 px-1 text-[10px] font-bold uppercase text-muted" title="Manually set">Pinned</span>}
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text" title={card.name}>
              {card.name}
            </span>
            <span className="shrink-0 text-[19px] font-semibold leading-none text-text">{ev.score}</span>
          </div>
          {card.title && <div className="truncate text-[11.5px] text-faint">{card.title}</div>}
          <div className="mt-2 flex items-center gap-2.5">
            <div className="relative">
              <button onClick={() => setStyleOpen((v) => !v)} title="Change running style" className="-ml-0.5">
                <StyleBadge style={slot.style} full />
              </button>
              {styleOpen && (
                <StyleSwitcher card={card} current={slot.style} aptOf={aptOf} minRank={minRank} onPick={(style) => onSet({ style })} onClose={() => setStyleOpen(false)} />
              )}
            </div>
            <span className="text-[11.5px]">
              <span className="text-gold">{ev.goldCount}g</span> <span className="text-faint">{ev.normalCount}n</span>
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setWhyOpen((v) => !v)} className={miniBtn}>Why</button>
              <div className="relative">
                <button onClick={() => setSwapOpen((v) => !v)} className={miniBtn}>Swap</button>
                {swapOpen && (
                  <SwapDropdown alternatives={alternatives} currentId={card.cardId} overridden={!!slot.overridden} onPick={(id) => onSet(id == null ? null : { card: id })} onClose={() => setSwapOpen(false)} />
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

      {whyOpen && <WhyPanel slot={slot} category={category} aptOf={aptOf} />}
    </div>
  )
}

function EmptySlot({ style, alternatives, onSet }: { style: Style; alternatives: { c: Candidate; grade: Grade }[]; onSet: (patch: SlotOverride | null) => void }) {
  const [swapOpen, setSwapOpen] = useState(false)
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[13px] border border-dashed border-border bg-surface/40 p-6">
      <StyleBadge style={style} full />
      <div className="text-[12px] text-faint">Empty slot</div>
      <div className="relative flex items-center gap-1.5">
        <button onClick={() => setSwapOpen((v) => !v)} className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted hover:text-text">Add horse</button>
        <button onClick={() => onSet(null)} className="rounded-md border border-border px-2 py-0.5 text-[11px] text-brand hover:text-text">Auto</button>
        {swapOpen && (
          <SwapDropdown alternatives={alternatives} overridden={false} onPick={(id) => id != null && onSet({ card: id })} onClose={() => setSwapOpen(false)} />
        )}
      </div>
    </div>
  )
}

function TeamPanel({ category, autoSlots, candidates, ov, evalFor, aptOf, minRank, onSet }: {
  category: Category
  autoSlots: { card: Card; style: Style }[]
  candidates: Candidate[]
  ov: Partial<Record<Style, SlotOverride>> | undefined
  evalFor: EvalFor
  aptOf: AptOf
  minRank: number
  onSet: (slotStyle: Style, patch: SlotOverride | null) => void
}) {
  const cardById = useMemo(() => {
    const m = new Map<number, Card>()
    for (const c of candidates) m.set(c.card.cardId, c.card)
    return m
  }, [candidates])

  // Resolve each auto slot through its override (card / style / empty).
  const slots: DisplaySlot[] = autoSlots.map((auto) => {
    const o = ov?.[auto.style]
    const style = o?.style ?? auto.style
    if (o?.card === 'empty') return { style, empty: true, overridden: true }
    const card = typeof o?.card === 'number' ? cardById.get(o.card) ?? auto.card : auto.card
    return { style, card, eval: evalFor(card, style), overridden: !!o }
  })

  const total = slots.reduce((s, x) => s + (x.eval?.score ?? 0), 0)
  const dupStyle = new Set(slots.filter((s) => !s.empty).map((s) => s.style)).size < slots.filter((s) => !s.empty).length
  const usedIds = slots.filter((s) => s.card).map((s) => s.card!.cardId)

  const altsFor = (style: Style, currentId?: number) =>
    candidates
      .filter((c) => c.style === style && c.card.cardId !== currentId && !usedIds.includes(c.card.cardId))
      .map((c) => ({ c, grade: aptOf(c.card, style) }))
      .sort((a, b) => b.c.eval.score - a.c.eval.score)
      .slice(0, 16)

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold text-text">{CATEGORY_LABEL[category]}</h2>
          <span className="text-[11px] text-faint">{CATEGORY_METERS[category]}</span>
          {dupStyle && <span className="text-[11px] text-bad">· duplicate running styles</span>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[18px] font-semibold text-text">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-faint">pts</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {slots.map((slot, i) =>
          slot.empty ? (
            <EmptySlot key={`${slot.style}-empty`} style={slot.style} alternatives={altsFor(slot.style)} onSet={(p) => onSet(autoSlots[i].style, p)} />
          ) : (
            <SlotCard
              key={`${autoSlots[i].style}-${slot.card!.cardId}`}
              slot={slot}
              category={category}
              idx={i}
              alternatives={altsFor(slot.style, slot.card!.cardId)}
              minRank={minRank}
              aptOf={aptOf}
              onSet={(p) => onSet(autoSlots[i].style, p)}
            />
          ),
        )}
        {autoSlots.length < 3 &&
          Array.from({ length: 3 - autoSlots.length }).map((_, i) => (
            <div key={`none-${i}`} className="flex items-center justify-center rounded-[13px] border border-dashed border-border bg-surface/40 p-6 text-[13px] text-faint">
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
  const setSlotOverride = useRoster((s) => s.setSlotOverride)

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

  const aptOf = useCallback<AptOf>((card, style) => effectiveApt(card, style, owned[card.cardId]), [owned])
  const minRank = gradeRank(settings.minAptitude)

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
          autoSlots={built[category].team.slots.map((s) => ({ card: s.card, style: s.style }))}
          candidates={built[category].candidates}
          ov={overrides[category]}
          evalFor={(card, style) => {
            // evalFor needs the category for reason labels; rebind here.
            const st = owned[card.cardId] ?? defaultOwnedState()
            return evalCard(card, style, category, skills, { potentialLevel: st.potential, includeEvent: settings.includeEvent }, STYLE_LABEL[style], CATEGORY_LABEL[category])
          }}
          aptOf={aptOf}
          minRank={minRank}
          onSet={(slotStyle, patch) => setSlotOverride(category, slotStyle, patch)}
        />
      ))}
    </div>
  )
}
