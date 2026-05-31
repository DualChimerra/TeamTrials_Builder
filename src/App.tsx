import { useEffect, useMemo, useState } from 'react'
import type { Grade } from './types'
import { useGameData } from './data/useGameData'
import { useRoster } from './state/store'
import { Roster } from './components/Roster'
import { Teams } from './components/Teams'
import { Segmented, Toggle } from './components/ui'

type Tab = 'teams' | 'roster'

const GITHUB_URL = 'https://github.com/DualChimerra'
const KOFI_URL = 'https://ko-fi.com/dualchimerra'

const I = {
  trophy: 'M6 3h12v2a4 4 0 0 1-3 3.87V11a3 3 0 0 0 6 0M6 5V3m0 2a4 4 0 0 0 3 3.87M9 21h6m-3-3v3m0-3a3 3 0 0 1-3-3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  github:
    'M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.86c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9l-.01 2.81c0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z',
  heart: 'M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3 1.5 3 1.5S10 6 12 6s3.5 1 3.5 1.5S16 6 18 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21Z',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.46-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.54H9.8L9.4 5.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.46 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.46 2.4-1c.5.4 1.1.74 1.7 1l.4 2.54h4.4l.4-2.54c.6-.26 1.2-.6 1.7-1l2.4 1 2-3.46-2-1.5c.07-.33.1-.66.1-1Z',
}
function Icon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
function GithubMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={I.github} />
    </svg>
  )
}

function Sidebar({ tab, setTab, ownedCount }: { tab: Tab; setTab: (t: Tab) => void; ownedCount: number }) {
  const nav = (key: Tab, label: string, icon: string, count: number) => {
    const active = tab === key
    return (
      <button
        key={key}
        onClick={() => setTab(key)}
        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
          active ? 'bg-accent-soft text-text' : 'text-muted hover:bg-white/[0.04] hover:text-text'
        }`}
      >
        <Icon d={icon} className="h-[18px] w-[18px]" />
        <span className="flex-1 text-left">{label}</span>
        <span className="text-[11px] text-faint">{count}</span>
      </button>
    )
  }
  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-[232px] flex-col border-r border-border bg-sidebar px-3 py-4">
      <div className="flex items-center gap-2.5 px-1.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7e88e0] to-[#5a63c9] text-[13px] font-bold text-white">
          TT
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-text">Team Trials</div>
          <div className="text-[11px] text-faint">Builder</div>
        </div>
      </div>

      <div className="mt-6 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">Workspace</div>
      <nav className="mt-2 space-y-1">
        {nav('teams', 'Teams', I.trophy, 5)}
        {nav('roster', 'Roster', I.grid, ownedCount)}
      </nav>

      <div className="flex-1" />

      <div className="space-y-1 border-t border-border pt-3">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:text-text"
        >
          <GithubMark className="h-[18px] w-[18px]" /> Source
        </a>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:text-text"
        >
          <Icon d={I.heart} className="h-[18px] w-[18px]" /> Support on Ko-fi
        </a>
      </div>
    </aside>
  )
}

function SettingsMenu() {
  const settings = useRoster((s) => s.settings)
  const updateSettings = useRoster((s) => s.updateSettings)
  const reset = useRoster((s) => s.reset)
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-muted hover:text-text"
      >
        <Icon d={I.gear} /> Settings
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute right-0 z-30 mt-2 w-64 space-y-2.5 rounded-xl border border-border bg-surface-2 p-3 text-left shadow-xl">
            <Toggle
              checked={settings.uniqueAcrossTeams}
              onChange={(v) => updateSettings({ uniqueAcrossTeams: v })}
              label="Unique horses across teams"
            />
            <Toggle
              checked={settings.includeEvent}
              onChange={(v) => updateSettings({ includeEvent: v })}
              label="Count event skills"
            />
            <Toggle
              checked={settings.requireSurface}
              onChange={(v) => updateSettings({ requireSurface: v })}
              label="Require surface aptitude"
            />
            <div className="space-y-1 border-t border-border pt-2.5">
              <div className="text-[11px] uppercase tracking-wide text-faint">Minimum aptitude</div>
              <Segmented
                value={settings.minAptitude}
                onChange={(v: Grade) => updateSettings({ minAptitude: v })}
                options={(['A', 'B', 'C', 'D', 'E', 'G'] as Grade[]).map((g) => ({ value: g, label: g }))}
              />
            </div>
            <button
              onClick={() => {
                if (confirm('Reset your whole roster?')) reset()
              }}
              className="w-full rounded-lg border border-bad/40 bg-bad/10 px-3 py-1.5 text-[13px] text-bad hover:bg-bad/20"
            >
              Reset roster
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const { data, error, loading } = useGameData()
  const [tab, setTab] = useState<Tab>('teams')
  const owned = useRoster((s) => s.owned)
  const theme = useRoster((s) => s.settings.theme)
  const updateSettings = useRoster((s) => s.updateSettings)
  const ownedCount = useMemo(() => Object.values(owned).filter((o) => o.owned).length, [owned])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const title = tab === 'teams' ? 'Suggested teams' : 'Roster'
  const subtitle =
    tab === 'teams'
      ? 'Three distinct styles per race · scored on guaranteed skills'
      : 'Mark the horses on your account, their stars and potential.'

  return (
    <div className="min-h-full">
      <Sidebar tab={tab} setTab={setTab} ownedCount={ownedCount} />

      <div className="ml-[232px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/85 px-7 py-4 backdrop-blur">
          <div>
            <h1 className="text-[18px] font-semibold text-text">{title}</h1>
            <p className="text-[12px] text-faint">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
              className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-border bg-surface text-muted hover:text-text"
              title="Toggle theme"
            >
              <Icon d={theme === 'dark' ? I.sun : I.moon} />
            </button>
            <SettingsMenu />
          </div>
        </div>

        <main className="px-7 py-6">
          {loading && <div className="py-20 text-center text-muted">Loading game data…</div>}
          {error && (
            <div className="rounded-xl border border-bad/40 bg-bad/10 p-6 text-center text-bad">
              Failed to load data: {error}
            </div>
          )}
          {data && (
            <div className="animate-fade-in">
              {tab === 'teams' ? <Teams cards={data.cards} skills={data.skills} /> : <Roster cards={data.cards} />}
            </div>
          )}
          <footer className="mt-10 text-[11px] text-faint">
            <a href="https://github.com/DualChimerra/TeamTrials_Builder" target="_blank" rel="noreferrer" className="hover:text-muted">
              Source on GitHub
            </a>{' '}
            · Data from gametora.com · Not affiliated with Cygames · Dataset v{data?.version ?? '…'}
          </footer>
        </main>
      </div>
    </div>
  )
}
