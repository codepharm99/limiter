import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { BlockGrid } from '../../src/panel/main/BlockGrid'

const COLOR = '#B08968'

describe('BlockGrid', () => {
  const { container } = render(
    <BlockGrid
      color={COLOR}
      cells={[
        { state: 'done', fill: 1 },
        { state: 'partial', fill: 0.5 },
        { state: 'today', fill: 0 },
        { state: 'over', fill: 1 },
        { state: 'over', fill: 0.5 },
      ]}
    />,
  )
  const cells = Array.from(container.firstElementChild!.children) as HTMLElement[]

  it('renders one cell per entry', () => {
    expect(cells).toHaveLength(5)
  })

  it('fills a done cell with the direction color and no extra edge', () => {
    expect(cells[0].style.backgroundColor).toBe('rgb(176, 137, 104)')
    expect(cells[0].style.boxShadow).toBe('')
  })

  it('fills the left part of a partial cell', () => {
    const fill = cells[1].firstElementChild as HTMLElement
    expect(fill.style.width).toBe('50%')
    expect(fill.style.backgroundColor).toBe('rgb(176, 137, 104)')
  })

  it('outlines a today cell with a dashed 1px border in the direction color', () => {
    expect(cells[2].style.border).toContain('1px')
    expect(cells[2].style.border).toContain('dashed')
  })

  it('fills a fully spent over cell with the danger color', () => {
    expect(cells[3].style.backgroundColor).toBe('var(--danger)')
  })

  it('outlines and half-fills a partial over cell in danger', () => {
    expect(cells[4].style.border).toContain('1px')
    const fill = cells[4].firstElementChild as HTMLElement
    expect(fill.style.width).toBe('50%')
    expect(fill.style.backgroundColor).toBe('var(--danger)')
  })
})
