import { useState } from 'react'
import type { Card } from '../types'
import { charThumb } from '../data/load'

export function Avatar({ card, size = 56, className = '' }: { card: Card; size?: number; className?: string }) {
  const [err, setErr] = useState(false)
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 ${className}`}
      style={{ width: size, height: size }}
    >
      {err ? (
        <div className="flex h-full w-full items-center justify-center text-faint" style={{ fontSize: size * 0.4 }}>
          {card.name.charAt(0)}
        </div>
      ) : (
        <img
          src={charThumb(card)}
          alt={card.name}
          loading="lazy"
          onError={() => setErr(true)}
          className="h-full w-full object-cover object-top"
        />
      )}
    </div>
  )
}
