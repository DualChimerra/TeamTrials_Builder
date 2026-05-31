import type { Card, Grade, Style } from '../types'
import { STYLE_LABEL } from '../types'

const GRADE_COLOR: Record<string, string> = {
  S: 'text-[#ffd34d] bg-[#ffd34d]/15 border-[#ffd34d]/30',
  A: 'text-[#ff8a5c] bg-[#ff8a5c]/15 border-[#ff8a5c]/30',
  B: 'text-[#f472b6] bg-[#f472b6]/15 border-[#f472b6]/30',
  C: 'text-[#34d399] bg-[#34d399]/15 border-[#34d399]/30',
  D: 'text-[#6ea8fe] bg-[#6ea8fe]/15 border-[#6ea8fe]/30',
  E: 'text-faint bg-white/5 border-border',
  F: 'text-faint bg-white/5 border-border',
  G: 'text-faint bg-white/5 border-border',
}

export function GradeBadge({ grade, label }: { grade: Grade; label?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
        GRADE_COLOR[grade] ?? GRADE_COLOR.G
      }`}
      title={label}
    >
      {label && <span className="text-[10px] font-normal text-muted">{label}</span>}
      {grade}
    </span>
  )
}

export const STYLE_COLOR: Record<Style, string> = {
  front: 'text-[#ff6b6b] bg-[#ff6b6b]/12 border-[#ff6b6b]/35',
  pace: 'text-[#6ea8fe] bg-[#6ea8fe]/12 border-[#6ea8fe]/35',
  late: 'text-[#34d399] bg-[#34d399]/12 border-[#34d399]/35',
  end: 'text-[#c084fc] bg-[#c084fc]/12 border-[#c084fc]/35',
}

export function StyleBadge({ style, full }: { style: Style; full?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${STYLE_COLOR[style]}`}
    >
      {full ? STYLE_LABEL[style] : STYLE_LABEL[style].split(' ')[0]}
    </span>
  )
}

// Full aptitude breakdown (surface / distance / style) for hover popovers.
export function AptitudeGrid({ card }: { card: Card }) {
  const sections: [string, [string, Grade][]][] = [
    [
      'Surface',
      [
        ['Turf', card.apt.turf],
        ['Dirt', card.apt.dirt],
      ],
    ],
    [
      'Distance',
      [
        ['Sprint', card.apt.short],
        ['Mile', card.apt.mile],
        ['Medium', card.apt.medium],
        ['Long', card.apt.long],
      ],
    ],
    [
      'Style',
      [
        ['Front', card.apt.front],
        ['Pace', card.apt.pace],
        ['Late', card.apt.late],
        ['End', card.apt.end],
      ],
    ],
  ]
  return (
    <div className="space-y-1.5">
      {sections.map(([title, items]) => (
        <div key={title} className="flex items-center gap-1.5">
          <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-faint">{title}</span>
          <div className="flex flex-wrap gap-1">
            {items.map(([label, grade]) => (
              <GradeBadge key={label} grade={grade} label={label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
            value === o.value ? 'bg-brand text-white' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-text"
    >
      <span
        className={`relative inline-block h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-1/2 left-0.5 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[14px]' : 'translate-x-0'
          }`}
        />
      </span>
      <span>{label}</span>
    </button>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-text"
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded-[5px] border transition-colors ${
          checked ? 'border-brand bg-brand' : 'border-border bg-white/5'
        }`}
      >
        <svg viewBox="0 0 12 12" className={`h-3 w-3 ${checked ? 'opacity-100' : 'opacity-0'}`} fill="none">
          <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  )
}
