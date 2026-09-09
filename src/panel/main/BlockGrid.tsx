import type { CSSProperties } from 'react'
import type { CellState } from '../../domain/limiter'

export interface Cell {
  state: CellState
  fill: number
}

const sizes = {
  md: { cell: 'h-4 w-4', track: '16px' },
  sm: { cell: 'h-2.5 w-2.5', track: '10px' },
} as const

/** One cell = one block of the week: spent, planned for today, still free or over budget.
    All outlines share the direction's color and the same 1px weight — "today" is dashed
    so the plan reads without breaking the row's rhythm. */
function cellStyle(state: CellState, color: string, fill: number): CSSProperties {
  switch (state) {
    case 'done':
      return { backgroundColor: color }
    case 'over':
      return fill >= 1
        ? { backgroundColor: 'var(--danger)' }
        : { border: '1px solid var(--danger)' }
    case 'today':
      return { border: `1px dashed ${color}` }
    case 'partial':
    case 'left':
      return { border: `1px solid ${color}` }
  }
}

export function BlockGrid({
  cells,
  color,
  size = 'md',
}: {
  cells: Cell[]
  color: string
  size?: 'md' | 'sm'
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${sizes[size].track})`, maxWidth: '100%' }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          data-state={c.state}
          className={`relative aspect-square overflow-hidden rounded-[3px] ${sizes[size].cell}`}
          style={cellStyle(c.state, color, c.fill)}
        >
          {c.state === 'partial' || (c.state === 'over' && c.fill > 0 && c.fill < 1) ? (
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${c.fill * 100}%`,
                backgroundColor: c.state === 'over' ? 'var(--danger)' : color,
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}
