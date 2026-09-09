import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption = { value: string; label: string }

const MAX_MENU_HEIGHT = 232
const MIN_MENU_HEIGHT = 84

interface MenuPlacement {
  left: number
  width: number
  /** Viewport y of the menu's top edge when opening down; `bottom` is set instead when opening up. */
  top?: number
  bottom?: number
  maxHeight: number
  opensUp: boolean
}

function place(trigger: HTMLButtonElement, optionCount: number): MenuPlacement {
  const rect = trigger.getBoundingClientRect()
  const menuHeight = Math.min(MAX_MENU_HEIGHT, optionCount * 42 + 12)
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const spaceAbove = rect.top - 8
  const opensUp = spaceBelow < Math.min(menuHeight, 120) && spaceAbove > spaceBelow
  if (opensUp) {
    return {
      left: rect.left,
      width: rect.width,
      bottom: window.innerHeight - rect.top + 6,
      maxHeight: Math.max(MIN_MENU_HEIGHT, Math.min(MAX_MENU_HEIGHT, spaceAbove)),
      opensUp,
    }
  }
  return {
    left: rect.left,
    width: rect.width,
    top: Math.min(rect.bottom + 6, window.innerHeight - MIN_MENU_HEIGHT - 8),
    maxHeight: Math.max(MIN_MENU_HEIGHT, Math.min(MAX_MENU_HEIGHT, spaceBelow)),
    opensUp,
  }
}

/** Select whose option list floats above everything (portaled, fixed) so no
 * scroll container can clip it. Opens downward when the viewport has room. */
export function SelectMenu({ label, value, options, onChange }: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<MenuPlacement | null>(null)
  const selected = options.find((option) => option.value === value) ?? options[0]

  const close = () => { setOpen(false); trigger.current?.focus() }

  useEffect(() => {
    if (!open) return
    const reposition = () => trigger.current && setPlacement(place(trigger.current, options.length))
    // A scrolling ancestor would drag the fixed menu away from its trigger.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', reposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options.length])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault(); event.stopPropagation(); close()
  }
  const toggle = () => {
    if (!open && trigger.current) setPlacement(place(trigger.current, options.length))
    setOpen((current) => !current)
  }
  const onBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (open && event.relatedTarget instanceof Node && menu.current?.contains(event.relatedTarget)) return
    setOpen(false)
  }

  return <div className="form-field" onKeyDown={onKeyDown} onBlur={onBlur}>
    <label className="form-label" htmlFor={id}>{label}</label>
    <div className="select-menu">
      <button ref={trigger} id={id} type="button" aria-haspopup="listbox" aria-expanded={open}
        onClick={toggle} className="form-control select-menu__trigger">
        <span className="truncate">{selected?.label}</span>
        <ChevronDown size={18} className={open ? 'rotate-180' : ''} />
      </button>
      {open && placement ? createPortal(
        <div ref={menu} role="listbox" aria-labelledby={id} tabIndex={-1} onKeyDown={onKeyDown}
          style={{
            position: 'fixed',
            left: placement.left,
            width: placement.width,
            ...(placement.opensUp ? { bottom: placement.bottom } : { top: placement.top }),
            maxHeight: placement.maxHeight,
          }}
          className="select-menu__options select-menu__floating is-open">
          {options.map((option) => <button key={option.value} type="button" role="option"
            aria-selected={option.value === value} onClick={() => { onChange(option.value); close() }}
            className="select-menu__option">
            <span className="truncate">{option.label}</span>
            {option.value === value ? <Check size={17} /> : null}
          </button>)}
        </div>,
        document.body,
      ) : null}
    </div>
  </div>
}
