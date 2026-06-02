import { useMemo, useState } from 'react'
import type { Card, Category, Skill, Style, SupportCard, TtMeta, TtStats } from '../types'
import { CATEGORIES, CATEGORY_LABEL, STYLES } from '../types'
import { skillIcon } from '../data/load'
import { Avatar } from './Avatar'
import { StyleBadge } from './ui'

const TOP_CHARS = 8
const TOP_SKILLS = 20
const TOP_SUPPORTS = 8

const STAT_LABEL: [keyof Omit<TtStats, 'n'>, string][] = [
  ['speed', 'SPD'],
  ['stamina', 'STA'],
  ['power', 'PWR'],
  ['guts', 'GUT'],
  ['wiz', 'WIS'],
]
const SUPPORT_TYPE: Record<string, string> = {
  speed: 'SPD',
  stamina: 'STA',
  power: 'PWR',
  guts: 'GUT',
  intelligence: 'WIS',
  friend: 'Fr',
  group: 'Gr',
}
const RARITY = (r: number | null | undefined) => (r === 3 ? 'SSR' : r === 2 ? 'SR' : r === 1 ? 'R' : '')

function StatRow({ stats }: { stats: TtStats }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-1 rounded-md border border-border bg-surface-2/60 px-2 py-1.5">
      {STAT_LABEL.map(([k, label]) => (
        <div key={k} className="text-center leading-tight">
          <div className="text-[9px] uppercase tracking-wide text-faint">{label}</div>
          <div className="text-[12.5px] font-semibold tabular-nums text-text">{stats[k]}</div>
        </div>
      ))}
    </div>
  )
}

function UmaRow({ card, name, count, teams }: { card?: Card; name: string; count: number; teams: number }) {
  const pct = teams ? Math.round((100 * count) / teams) : 0
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/[0.04]">
      {card ? <Avatar card={card} size={28} className="rounded-md" /> : <div className="h-7 w-7 rounded-md bg-surface-2" />}
      <span className="min-w-0 flex-1 truncate text-[13px] text-text" title={name}>
        {name}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-faint">{pct}%</span>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-text">{count}</span>
    </div>
  )
}

function SkillRow({ skill, id, count, teams }: { skill?: Skill; id: number; count: number; teams: number }) {
  const pct = teams ? Math.round((100 * count) / teams) : 0
  const gold = (skill?.rarity ?? 0) >= 2
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/[0.04]">
      {skill ? (
        <img src={skillIcon(skill.iconid)} alt="" className="h-5 w-5 shrink-0 rounded" loading="lazy" draggable={false} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
      ) : (
        <div className="h-5 w-5 shrink-0 rounded bg-surface-2" />
      )}
      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${gold ? 'text-gold' : 'text-text'}`} title={skill?.name ?? `#${id}`}>
        {skill?.name ?? `Skill #${id}`}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-faint">{pct}%</span>
    </div>
  )
}

function SupportRow({ sc, id, count, teams }: { sc?: SupportCard; id: number; count: number; teams: number }) {
  const pct = teams ? Math.round((100 * count) / teams) : 0
  const type = sc?.type ? SUPPORT_TYPE[sc.type] ?? sc.type : ''
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/[0.04]">
      <span className="shrink-0 rounded bg-surface-2 px-1 text-[9px] font-bold uppercase text-muted">{RARITY(sc?.rarity)}</span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-text" title={sc ? `${sc.name} ${sc.title}` : `#${id}`}>
        {sc ? sc.name : `Support #${id}`}
        {type && <span className="ml-1 text-[10px] text-faint">{type}</span>}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-faint">{pct}%</span>
      <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-text">{count}</span>
    </div>
  )
}

type View = 'skills' | 'supports'

function StyleColumn({
  cat,
  style,
  meta,
  cardByChar,
  skills,
  supports,
  teams,
}: {
  cat: Category
  style: Style
  meta: TtMeta
  cardByChar: Map<number, Card>
  skills: Record<string, Skill>
  supports: Record<string, SupportCard>
  teams: number
}) {
  const [view, setView] = useState<View | null>(null)
  const cell = meta.byCatStyle[cat]?.[style]
  if (!cell || cell.chars.length === 0) return null
  const tabBtn = (v: View) =>
    `flex-1 rounded-md px-2 py-1 text-[11px] ${view === v ? 'bg-accent-soft text-text' : 'border border-border text-muted hover:text-text'}`
  return (
    <div className="rounded-[13px] border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <StyleBadge style={style} full />
        <span className="text-[10px] uppercase tracking-wide text-faint">{cell.stats?.n ?? 0} picks</span>
      </div>
      {cell.stats && <StatRow stats={cell.stats} />}
      <div className="space-y-0.5">
        {cell.chars.slice(0, TOP_CHARS).map((c) => (
          <UmaRow key={c.charId} card={cardByChar.get(c.charId)} name={cardByChar.get(c.charId)?.name ?? `Char ${c.charId}`} count={c.count} teams={teams} />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button onClick={() => setView((v) => (v === 'supports' ? null : 'supports'))} className={tabBtn('supports')}>
          Supports
        </button>
        <button onClick={() => setView((v) => (v === 'skills' ? null : 'skills'))} className={tabBtn('skills')}>
          Skills
        </button>
      </div>
      {view === 'supports' && (
        <div className="mt-1 space-y-0.5 border-t border-border pt-1">
          {cell.supports.slice(0, TOP_SUPPORTS).map((s) => (
            <SupportRow key={s.supportId} sc={supports[String(s.supportId)]} id={s.supportId} count={s.count} teams={teams} />
          ))}
        </div>
      )}
      {view === 'skills' && (
        <div className="mt-1 max-h-72 space-y-0.5 overflow-auto border-t border-border pt-1">
          {cell.skills.slice(0, TOP_SKILLS).map((s) => (
            <SkillRow key={s.skillId} skill={skills[String(s.skillId)]} id={s.skillId} count={s.count} teams={teams} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Rankings({
  cards,
  skills,
  ttMeta,
  supports,
}: {
  cards: Card[]
  skills: Record<string, Skill>
  ttMeta: TtMeta | null
  supports: Record<string, SupportCard>
}) {
  // charId -> a representative Card (for the avatar/name).
  const cardByChar = useMemo(() => {
    const m = new Map<number, Card>()
    for (const c of cards) if (!m.has(c.charId)) m.set(c.charId, c)
    if (ttMeta) {
      const byId = new Map(cards.map((c) => [c.cardId, c]))
      for (const cat of Object.values(ttMeta.byCatStyle))
        for (const cell of Object.values(cat ?? {}))
          for (const e of cell!.chars) {
            const card = e.cardId != null ? byId.get(e.cardId) : undefined
            if (card) m.set(e.charId, card)
          }
    }
    return m
  }, [cards, ttMeta])

  if (!ttMeta || ttMeta.teams === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
        No top-100 data loaded yet. Capture Team Trials rankings with the hook, run{' '}
        <code className="rounded bg-surface-2 px-1">scripts/build_tt_meta.py</code>, then reload.
      </div>
    )
  }

  const orderedStyles = (cat: Category): Style[] =>
    STYLES.filter((st) => ttMeta.byCatStyle[cat]?.[st]?.chars.length).sort((a, b) => {
      const sum = (st: Style) => ttMeta.byCatStyle[cat]?.[st]?.stats?.n ?? 0
      return sum(b) - sum(a)
    })

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-faint">
        How the top {ttMeta.teams} players build each race — average stats, most-used horses, support cards and skills per
        running style. Percentages = share of those teams.
      </p>
      {CATEGORIES.map((cat) => {
        const styles = orderedStyles(cat)
        if (styles.length === 0) return null
        return (
          <section key={cat} className="rounded-2xl border border-border bg-surface/40 p-4">
            <h2 className="mb-3 px-1 text-[15px] font-semibold text-text">{CATEGORY_LABEL[cat]}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {styles.map((st) => (
                <StyleColumn key={st} cat={cat} style={st} meta={ttMeta} cardByChar={cardByChar} skills={skills} supports={supports} teams={ttMeta.teams} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
