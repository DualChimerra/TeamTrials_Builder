import { useState } from 'react'
import type { Grade } from './types'
import { useGameData } from './data/useGameData'
import { useRoster } from './state/store'
import { Roster } from './components/Roster'
import { Teams } from './components/Teams'
import { Segmented, Toggle } from './components/ui'

type Tab = 'teams' | 'roster'

const GITHUB_URL = 'https://github.com/DualChimerra'
const KOFI_URL = 'https://ko-fi.com/dualchimerra'

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function Settings() {
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
        ⚙ Settings
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute left-1/2 z-30 mt-2 w-64 -translate-x-1/2 space-y-2.5 rounded-xl border border-border bg-surface p-3 text-left shadow-xl">
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

  return (
    <div className="min-h-full">
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <header className="pt-9 pb-6 text-center">
          <h1 className="bg-gradient-to-r from-white to-brand-2/80 bg-clip-text text-[28px] font-extrabold tracking-tight text-transparent sm:text-4xl">
            Team Trials Builder
          </h1>
          <p className="mt-1.5 text-[14px] text-muted">Helps to build your team to achieve max points!</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-muted hover:text-text"
            >
              <GithubIcon /> GitHub
            </a>
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#ff5e5b]/40 bg-[#ff5e5b]/10 px-2.5 py-1.5 text-[13px] font-medium text-[#ff8785] hover:bg-[#ff5e5b]/20"
            >
              ☕ Support on Ko-fi
            </a>
            <Settings />
          </div>
        </header>

        <div className="mb-4 flex justify-center">
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {(['teams', 'roster'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                  tab === t ? 'bg-brand text-white' : 'text-muted hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

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
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-[11px] text-faint">
        <a href="https://github.com/DualChimerra/TeamTrials_Builder" target="_blank" rel="noreferrer" className="hover:text-muted">
          Source on GitHub
        </a>{' '}
        · Data from gametora.com · Not affiliated with Cygames · Dataset v{data?.version ?? '…'}
      </footer>
    </div>
  )
}
