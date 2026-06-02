import { useMemo, useState } from 'react'
import type { Card, Category, Skill, Style, SupportCard, TtBuildEntry, TtCharEntry, TtCell, TtMeta, TtStats } from '../types'
import { CATEGORIES, CATEGORY_LABEL, STYLES } from '../types'
import { skillIcon, supportIcon } from '../data/load'
import { Avatar } from './Avatar'
import { StyleBadge } from './ui'

const STAT_LABEL: [keyof Omit<TtStats, 'n'>, string][] = [
  ['speed', 'SPD'],
  ['stamina', 'STA'],
  ['power', 'PWR'],
  ['guts', 'GUT'],
  ['wiz', 'WIS'],
]
const SUPPORT_TYPE: Record<string, string> = {
  speed: 'SPD', stamina: 'STA', power: 'PWR', guts: 'GUT', intelligence: 'WIS', friend: 'Fr', group: 'Gr',
}
const RARITY = (r?: number | null) => (r === 3 ? 'SSR' : r === 2 ? 'SR' : r === 1 ? 'R' : '')
const pctOf = (count: number, teams: number) => (teams ? Math.round((100 * count) / teams) : 0)

function StatRow({ stats }: { stats: TtStats }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-md border border-border bg-surface-2/60 px-2 py-1.5">
      {STAT_LABEL.map(([k, label]) => (
        <div key={k} className="text-center leading-tight">
          <div className="text-[9px] uppercase tracking-wide text-faint">{label}</div>
          <div className="text-[12.5px] font-semibold tabular-nums text-text">{stats[k]}</div>
        </div>
      ))}
    </div>
  )
}

function SupportImg({ id, sup, size = 22 }: { id: number; sup?: SupportCard; size?: number }) {
  return (
    <img
      src={supportIcon(id)}
      alt={sup?.name ?? String(id)}
      title={sup ? `${RARITY(sup.rarity)} ${sup.name} ${sup.title}` : `#${id}`}
      width={size}
      height={size}
      className="shrink-0 rounded"
      loading="lazy"
      draggable={false}
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
  )
}

function BuildRow({ build, supports, teams }: { build: TtBuildEntry; supports: Record<string, SupportCard>; teams: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/[0.04]">
      <div className="flex flex-1 flex-wrap gap-1">
        {build.supports.map((id, i) => (
          <SupportImg key={`${id}-${i}`} id={id} sup={supports[String(id)]} />
        ))}
      </div>
      {build.bestRank != null && (
        <span className="shrink-0 rounded bg-brand/15 px-1 text-[9.5px] font-bold text-brand" title="Best top-100 rank running this deck">
          #{build.bestRank}
        </span>
      )}
      <span className="shrink-0 text-[11px] tabular-nums text-faint">{pctOf(build.count, teams)}%</span>
      <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-text">{build.count}</span>
    </div>
  )
}

function SkillRow({ skill, id, count, teams }: { skill?: Skill; id: number; count: number; teams: number }) {
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
      <span className="shrink-0 text-[11px] tabular-nums text-faint">{pctOf(count, teams)}%</span>
    </div>
  )
}

function SupportRow({ sc, id, count, teams }: { sc?: SupportCard; id: number; count: number; teams: number }) {
  const type = sc?.type ? SUPPORT_TYPE[sc.type] ?? sc.type : ''
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/[0.04]">
      <SupportImg id={id} sup={sc} size={20} />
      <span className="shrink-0 rounded bg-surface-2 px-1 text-[9px] font-bold uppercase text-muted">{RARITY(sc?.rarity)}</span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-text" title={sc ? `${sc.name} ${sc.title}` : `#${id}`}>
        {sc ? sc.name : `Support #${id}`}
        {type && <span className="ml-1 text-[10px] text-faint">{type}</span>}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-faint">{pctOf(count, teams)}%</span>
      <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-text">{count}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

// Per-card drill-down: this exact card's numbers WITHIN this race+style.
function CardDetail({ entry, card, skills, supports, teams }: {
  entry: TtCharEntry; card?: Card; skills: Record<string, Skill>; supports: Record<string, SupportCard>; teams: number
}) {
  return (
    <div className="mb-1 ml-2 rounded-lg border border-border bg-surface-2/40 p-2">
      <div className="mb-2 flex items-center gap-2">
        {card && <Avatar card={card} size={40} className="rounded-lg" />}
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold text-text">{card?.name ?? `Card ${entry.cardId}`}</div>
          <div className="truncate text-[10.5px] text-faint">{card?.title}</div>
        </div>
        <span className="ml-auto text-[11px] text-faint">{pctOf(entry.count, teams)}% · {entry.count}×</span>
      </div>
      {entry.stats && <StatRow stats={entry.stats} />}
      {entry.builds.length > 0 && (
        <Section title="Top support builds (this slot)">
          {entry.builds.slice(0, 4).map((b, i) => (
            <BuildRow key={i} build={b} supports={supports} teams={teams} />
          ))}
        </Section>
      )}
      <Section title="Top skills">
        {entry.skills.slice(0, 14).map((s) => (
          <SkillRow key={s.skillId} skill={skills[String(s.skillId)]} id={s.skillId} count={s.count} teams={teams} />
        ))}
      </Section>
      <Section title="Top support cards">
        {entry.supports.slice(0, 8).map((s) => (
          <SupportRow key={s.supportId} sc={supports[String(s.supportId)]} id={s.supportId} count={s.count} teams={teams} />
        ))}
      </Section>
    </div>
  )
}

type View = 'builds' | 'supports' | 'skills'

function StyleColumn({ style, cell, cardById, skills, supports, teams }: {
  style: Style; cell: TtCell; cardById: Map<number, Card>
  skills: Record<string, Skill>; supports: Record<string, SupportCard>; teams: number
}) {
  const [open, setOpen] = useState<number | null>(null) // expanded cardId
  const [view, setView] = useState<View | null>(null)
  if (cell.chars.length === 0) return null
  const tabBtn = (v: View) =>
    `flex-1 rounded-md px-2 py-1 text-[11px] ${view === v ? 'bg-accent-soft text-text' : 'border border-border text-muted hover:text-text'}`
  return (
    <div className="rounded-[13px] border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <StyleBadge style={style} full />
        <span className="text-[10px] uppercase tracking-wide text-faint">{cell.stats?.n ?? 0} picks</span>
      </div>
      {cell.stats && <StatRow stats={cell.stats} />}
      <div className="mt-2 space-y-0.5">
        {cell.chars.slice(0, 8).map((c) => {
          const card = cardById.get(c.cardId)
          const isOpen = open === c.cardId
          return (
            <div key={c.cardId}>
              <button
                onClick={() => setOpen(isOpen ? null : c.cardId)}
                className={`flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-white/[0.05] ${isOpen ? 'bg-accent-soft' : ''}`}
              >
                {card ? <Avatar card={card} size={30} className="rounded-md" /> : <div className="h-[30px] w-[30px] rounded-md bg-surface-2" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-text">{card?.name ?? `Card ${c.cardId}`}</div>
                  {card?.title && <div className="truncate text-[10px] text-faint">{card.title}</div>}
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-faint">{pctOf(c.count, teams)}%</span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-text">{c.count}</span>
                <span className="shrink-0 text-[10px] text-faint">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && <CardDetail entry={c} card={card} skills={skills} supports={supports} teams={teams} />}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button onClick={() => setView((v) => (v === 'builds' ? null : 'builds'))} className={tabBtn('builds')}>Builds</button>
        <button onClick={() => setView((v) => (v === 'supports' ? null : 'supports'))} className={tabBtn('supports')}>Supports</button>
        <button onClick={() => setView((v) => (v === 'skills' ? null : 'skills'))} className={tabBtn('skills')}>Skills</button>
      </div>
      {view === 'builds' && (
        <div className="mt-1 max-h-80 space-y-0.5 overflow-auto border-t border-border pt-1">
          {cell.builds.length === 0 && <div className="px-1 py-2 text-[11px] text-faint">No build data.</div>}
          {cell.builds.map((b, i) => (
            <BuildRow key={i} build={b} supports={supports} teams={teams} />
          ))}
        </div>
      )}
      {view === 'supports' && (
        <div className="mt-1 max-h-80 space-y-0.5 overflow-auto border-t border-border pt-1">
          {cell.supports.map((s) => (
            <SupportRow key={s.supportId} sc={supports[String(s.supportId)]} id={s.supportId} count={s.count} teams={teams} />
          ))}
        </div>
      )}
      {view === 'skills' && (
        <div className="mt-1 max-h-80 space-y-0.5 overflow-auto border-t border-border pt-1">
          {cell.skills.map((s) => (
            <SkillRow key={s.skillId} skill={skills[String(s.skillId)]} id={s.skillId} count={s.count} teams={teams} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Rankings({ cards, skills, ttMeta, supports }: {
  cards: Card[]; skills: Record<string, Skill>; ttMeta: TtMeta | null; supports: Record<string, SupportCard>
}) {
  const cardById = useMemo(() => {
    const m = new Map<number, Card>()
    for (const c of cards) m.set(c.cardId, c)
    return m
  }, [cards])

  if (!ttMeta || ttMeta.teams === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
        No top-100 data loaded yet. Capture Team Trials rankings, run{' '}
        <code className="rounded bg-surface-2 px-1">scripts/build_tt_meta.py</code>, then reload.
      </div>
    )
  }

  const orderedStyles = (cat: Category): Style[] =>
    STYLES.filter((st) => ttMeta.byCatStyle[cat]?.[st]?.chars.length).sort(
      (a, b) => (ttMeta.byCatStyle[cat]?.[b]?.stats?.n ?? 0) - (ttMeta.byCatStyle[cat]?.[a]?.stats?.n ?? 0),
    )

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-faint">
        What the top {ttMeta.teams} players run, per race &amp; running style — average stats, horses, support builds and skills.
        Click a horse for its own breakdown. Percentages = share of those teams.
      </p>
      {CATEGORIES.map((cat) => {
        const styles = orderedStyles(cat)
        if (styles.length === 0) return null
        return (
          <section key={cat} className="rounded-2xl border border-border bg-surface/40 p-4">
            <h2 className="mb-3 px-1 text-[15px] font-semibold text-text">{CATEGORY_LABEL[cat]}</h2>
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
              {styles.map((st) => (
                <StyleColumn key={st} style={st} cell={ttMeta.byCatStyle[cat]![st]!} cardById={cardById} skills={skills} supports={supports} teams={ttMeta.teams} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
