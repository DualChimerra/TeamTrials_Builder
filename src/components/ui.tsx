import type { Grade, Style } from '../types'
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
      className={`inline-flex min-w-[2.1rem] items-center justify-center gap-0.5 rounded-md border px-1 py-0.5 text-xs font-semibold ${
        GRADE_COLOR[grade] ?? GRADE_COLOR.G
      }`}
      title={label}
    >
      {label && <span className="text-[10px] font-normal opacity-70">{label}</span>}
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
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STYLE_COLOR[style]}`}
    >
      {full ? STYLE_LABEL[style] : STYLE_LABEL[style].split(' ')[0]}
    </span>
  )
}

export function Stars({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`text-gold ${className}`} aria-label={`${n} stars`}>
      {'★'.repeat(n)}
      <span className="text-faint">{'★'.repeat(Math.max(0, 5 - n))}</span>
    </span>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`rounded-md font-medium transition-colors ${pad} ${
            value === o.value ? 'bg-brand text-white shadow' : 'text-muted hover:text-text'
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
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-muted hover:text-text"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-surface-2 border border-border'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  )
}
