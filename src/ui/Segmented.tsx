export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** Pill switch. `activeClass` carries the mode color so work and breaks can differ. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  activeClass = 'bg-text text-on-accent',
  className = '',
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  activeClass?: string
  className?: string
}) {
  const selected = Math.max(0, options.findIndex((option) => option.value === value))
  return (
    <div
      role="tablist"
      className={`segmented relative grid rounded-[14px] bg-card p-1 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        '--segment-index': selected,
        '--segment-count': options.length,
      } as CSSProperties}
    >
      <span aria-hidden="true" className={`segmented-indicator ${activeClass}`} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-[1] min-w-0 whitespace-normal rounded-[10px] px-2 py-2 text-xs font-medium sm:px-4 sm:text-sm ${
            o.value === value ? 'text-on-accent' : 'text-text-2 hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
import type { CSSProperties } from 'react'
