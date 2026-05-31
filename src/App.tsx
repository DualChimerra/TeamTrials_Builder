import { useState } from 'react'
import type { Grade } from './types'
import { useGameData } from './data/useGameData'
import { useRoster } from './state/store'
import { Roster } from './components/Roster'
import { Teams } from './components/Teams'
import { Segmented, Toggle } from './components/ui'

type Tab = 'teams' | 'roster'

function Header() {
  const settings = useRoster((s) => s.settings)
  const updateSettings = useRoster((s) => s.updateSettings)
  const reset = useRoster((s) => s.reset)
  const [openSettings, setOpenSettings] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-[13px] font-black text-white">
            TT
          </div>
          <div>
            <h1 className="text-[15px] font-bold leading-tight text-text">Uma Team Trials Builder</h1>
            <p className="text-[11px] text-faint">Optimal teams from your roster · guaranteed-skill scoring</p>
          </div>
        </div>

        <div className="relative ml-auto">
          <button
            onClick={() => setOpenSettings((v) => !v)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-muted hover:text-text"
          >
            ⚙ Settings
          </button>
          {openSettings && (
            <div className="animate-fade-in absolute right-0 mt-2 w-64 space-y-2.5 rounded-xl border border-border bg-surface p-3 shadow-xl">
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
              <div className="space-y-1 border-t border-border-soft pt-2.5">
                <div className="text-[11px] uppercase tracking-wide text-faint">Minimum aptitude</div>
                <Segmented
                  value={settings.minAptitude}
                  onChange={(v: Grade) => updateSettings({ minAptitude: v })}
                  options={(['A', 'B', 'C', 'D', 'E', 'G'] as Grade[]).map((g) => ({
                    value: g,
                    label: g,
                  }))}
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
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const { data, error, loading } = useGameData()
  const [tab, setTab] = useState<Tab>('teams')

  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-0.5">
          {(['teams', 'roster'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                tab === t ? 'bg-brand text-white' : 'text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="py-20 text-center text-muted">Loading game data…</div>}
        {error && (
          <div className="rounded-2xl border border-bad/40 bg-bad/10 p-6 text-center text-bad">
            Failed to load data: {error}
          </div>
        )}
        {data && (
          <div className="animate-fade-in">
            {tab === 'teams' ? (
              <Teams cards={data.cards} skills={data.skills} />
            ) : (
              <Roster cards={data.cards} />
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-faint">
        Data from gametora.com · Not affiliated with Cygames. Dataset v{data?.version ?? '…'}
      </footer>
    </div>
  )
}
